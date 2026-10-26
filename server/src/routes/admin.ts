import { Router, Response } from 'express';
import { query, getClient } from '../db';
import { requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { fulfillUserPackage } from './payments';

const router = Router();

// GET ALL PENDING PROFILES (Users who have submitted info but are not vetted yet)
router.get('/pending-profiles', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const pendingRes = await query(
      `SELECT p.*, u.full_name, u.email, u.country, u.phone_number 
       FROM profiles p
       JOIN users u ON p.id = u.id
       WHERE p.is_approved = false AND p.gender IS NOT NULL
       ORDER BY p.created_at ASC`
    );
    return res.json({ profiles: pendingRes.rows });
  } catch (err) {
    console.error('Pending profiles fetch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// APPROVE A PROFILE
router.post('/approve-profile/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  try {
    await query('UPDATE profiles SET is_approved = true WHERE id = $1', [id]);
    
    // Notify the user their profile has been vetted and approved
    await query(
      `INSERT INTO notifications (user_id, type, sender_id, content) 
       VALUES ($1, $2, $3, $4)`,
      [id, 'connection_accepted', req.user!.id, 'Your profile has been vetted and approved by administration. You can now connect and interact.']
    );

    return res.json({ success: true, message: 'Profile approved successfully.' });
  } catch (err) {
    console.error('Approve profile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// REJECT/DISAPPROVE A PROFILE (resets profile status/flags issues)
router.post('/reject-profile/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    await query('UPDATE profiles SET is_approved = false WHERE id = $1', [id]);
    
    // Notify user of issues
    await query(
      `INSERT INTO notifications (user_id, type, sender_id, content) 
       VALUES ($1, $2, $3, $4)`,
      [id, 'connection_accepted', req.user!.id, `Your profile was flagged/not approved by admin. Reason: ${reason || 'Incomplete details/media'}.`]
    );

    return res.json({ success: true, message: 'Profile disapproved/flagged successfully.' });
  } catch (err) {
    console.error('Disapprove profile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET ALL REVIEWS (For Admin Dashboard management)
router.get('/reviews', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const reviewsRes = await query(
      `SELECT r.*, u.full_name, u.email 
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       ORDER BY r.created_at DESC`
    );
    return res.json({ reviews: reviewsRes.rows });
  } catch (err) {
    console.error('Fetch reviews error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// APPROVE REVIEW
router.post('/approve-review/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  try {
    await query('UPDATE reviews SET is_approved = true WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Review approved for landing page.' });
  } catch (err) {
    console.error('Approve review error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE REVIEW
router.delete('/delete-review/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM reviews WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Review deleted successfully.' });
  } catch (err) {
    console.error('Delete review error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET ALL PAYMENTS (Including crypto matching requests)
router.get('/payments', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const payRes = await query(
      `SELECT p.*, u.full_name, u.email, u.country
       FROM payments p
       JOIN users u ON p.user_id = u.id
       ORDER BY p.created_at DESC
       LIMIT 100`
    );
    return res.json({ payments: payRes.rows });
  } catch (err) {
    console.error('Fetch payments error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// APPROVE AND MATCH A PAYMENT (Especially Crypto)
router.post('/approve-payment/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  let client;

  try {
    client = await getClient();
    await client.query('BEGIN');

    const checkPay = await client.query('SELECT * FROM payments WHERE id = $1 FOR UPDATE', [id]);
    if (checkPay.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Payment record not found' });
    }

    const payment = checkPay.rows[0];
    if (payment.status === 'completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Payment is already fulfilled' });
    }

    // Fulfill package (upgrades to premium or adds tokens)
    await fulfillUserPackage(client, payment.user_id, payment.package_type);

    // Update payment record
    await client.query(
      `UPDATE payments 
       SET status = 'completed', updated_at = timezone('utc'::text, now())
       WHERE id = $1`,
      [id]
    );

    // Send notification to user
    await client.query(
      `INSERT INTO notifications (user_id, type, sender_id, content)
       VALUES ($1, 'connection_accepted', $2, $3)`,
      [
        payment.user_id,
        req.user!.id,
        `Your ${payment.provider.toUpperCase()} payment for ${payment.package_type} has been verified and your account is credited!`,
      ]
    );

    await client.query('COMMIT');
    return res.json({ success: true, message: 'Payment approved and account credited successfully.' });
  } catch (err: any) {
    if (client) await client.query('ROLLBACK');
    console.error('Approve payment error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) client.release();
  }
});

// REJECT A PAYMENT (e.g. invalid tx hash)
router.post('/reject-payment/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const payRes = await query(
      `UPDATE payments 
       SET status = 'failed', metadata = metadata || $1::jsonb, updated_at = timezone('utc'::text, now())
       WHERE id = $2 RETURNING *`,
      [JSON.stringify({ rejectionReason: reason || 'Invalid transaction hash / unmatched on chain' }), id]
    );

    if (payRes.rows.length === 0) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    const payment = payRes.rows[0];

    // Notify user
    await query(
      `INSERT INTO notifications (user_id, type, sender_id, content)
       VALUES ($1, 'connection_accepted', $2, $3)`,
      [
        payment.user_id,
        req.user!.id,
        `Your payment with ID ${payment.provider_transaction_id || id} could not be verified. Reason: ${reason || 'Unmatched transaction hash.'}`,
      ]
    );

    return res.json({ success: true, message: 'Payment marked as failed/rejected.' });
  } catch (err: any) {
    console.error('Reject payment error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
