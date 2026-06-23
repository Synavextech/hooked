import { Router } from 'express';
import axios from 'axios';
import { supabase } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// PayHero config
const PAYHERO_API_URL = process.env.PAYHERO_API_URL || 'https://backend.payhero.co.ke/api/v2/payments';
const PAYHERO_CHANNEL_ID = process.env.PAYHERO_CHANNEL_ID || '';
const PAYHERO_SECRET = process.env.PAYHERO_SECRET || '';
const PAYHERO_CALLBACK_URL = process.env.PAYHERO_CALLBACK_URL || '';

// Initiate STK Push
router.post('/stk-push', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { phone_number, amount } = req.body;

    if (!phone_number || !amount) {
      return res.status(400).json({ error: 'Phone number and amount required' });
    }

    const merchant_reference = `hooked_${Date.now()}_${userId.substring(0, 8)}`;

    // Create pending payment record
    const { error: dbError } = await supabase
      .from('payments')
      .insert([{
        user_id: userId,
        merchant_reference,
        amount,
        status: 'pending'
      }]);

    if (dbError) throw dbError;

    // Call PayHero API
    // According to PayHero v2 docs: Basic auth with Channel ID and Secret
    const auth = Buffer.from(`${PAYHERO_CHANNEL_ID}:${PAYHERO_SECRET}`).toString('base64');
    
    const response = await axios.post(PAYHERO_API_URL, {
      amount,
      phone_number,
      channel_id: PAYHERO_CHANNEL_ID,
      provider: 'm-pesa',
      external_reference: merchant_reference,
      callback_url: PAYHERO_CALLBACK_URL
    }, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('STK Push error:', error);
    res.status(500).json({ error: 'Payment initiation failed' });
  }
});

// PayHero Webhook Callback
// Assuming it posts JSON with external_reference and status
router.post('/webhook', async (req, res) => {
  try {
    const { external_reference, status, checkout_request_id } = req.body;

    if (!external_reference || !status) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Update payment record
    const { data: payment, error } = await supabase
      .from('payments')
      .update({ status, checkout_request_id })
      .eq('merchant_reference', external_reference)
      .select()
      .single();

    if (error) throw error;

    if (status.toLowerCase() === 'success' || status.toLowerCase() === 'completed') {
      // Upgrade user to premium
      await supabase
        .from('users')
        .update({ is_premium: true })
        .eq('id', payment.user_id);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Card Payment Checkout (Mocked)
router.post('/card-payment', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { cardholder_name, card_number, amount } = req.body;

    if (!cardholder_name || !card_number || !amount) {
      return res.status(400).json({ error: 'Cardholder name, card number, and amount are required' });
    }

    const merchant_reference = `hooked_card_${Date.now()}_${userId.substring(0, 8)}`;

    // Create successful payment record
    const { error: dbError } = await supabase
      .from('payments')
      .insert([{
        user_id: userId,
        merchant_reference,
        amount,
        status: 'success',
        provider_reference: 'card_mock'
      }]);

    if (dbError) throw dbError;

    // Upgrade user to premium
    const { error: userError } = await supabase
      .from('users')
      .update({ is_premium: true })
      .eq('id', userId);

    if (userError) throw userError;

    res.json({ success: true, message: 'Card payment processed successfully!' });
  } catch (error) {
    console.error('Card payment error:', error);
    res.status(500).json({ error: 'Card payment processing failed' });
  }
});

// PayPal Payment Checkout (Mocked)
router.post('/paypal-payment', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { order_id, amount } = req.body;

    if (!order_id || !amount) {
      return res.status(400).json({ error: 'PayPal Order ID and amount are required' });
    }

    const merchant_reference = `hooked_paypal_${Date.now()}_${userId.substring(0, 8)}`;

    // Create successful payment record
    const { error: dbError } = await supabase
      .from('payments')
      .insert([{
        user_id: userId,
        merchant_reference,
        amount,
        status: 'success',
        provider_reference: 'paypal_mock'
      }]);

    if (dbError) throw dbError;

    // Upgrade user to premium
    const { error: userError } = await supabase
      .from('users')
      .update({ is_premium: true })
      .eq('id', userId);

    if (userError) throw userError;

    res.json({ success: true, message: 'PayPal payment processed successfully!' });
  } catch (error) {
    console.error('PayPal payment error:', error);
    res.status(500).json({ error: 'PayPal payment processing failed' });
  }
});

export default router;
