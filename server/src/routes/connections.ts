import { Router, Response } from 'express';
import { query } from '../db';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// SEND CONNECTION REQUEST
router.post('/request', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const { receiver_id } = req.body;

  if (req.user.id === receiver_id) {
    return res.status(400).json({ error: 'Cannot connect to yourself' });
  }

  try {
    // Check if connection already exists
    const checkRes = await query(
      `SELECT * FROM connections 
       WHERE (sender_id = $1 AND receiver_id = $2) 
          OR (sender_id = $2 AND receiver_id = $1)`,
      [req.user.id, receiver_id]
    );

    if (checkRes.rows.length > 0) {
      return res.status(400).json({ error: 'Connection request already exists or is accepted' });
    }

    // Insert connection
    await query(
      'INSERT INTO connections (sender_id, receiver_id, status) VALUES ($1, $2, $3)',
      [req.user.id, receiver_id, 'pending']
    );

    // Create Notification
    await query(
      `INSERT INTO notifications (user_id, type, sender_id, content) 
       VALUES ($1, $2, $3, $4)`,
      [receiver_id, 'connection_request', req.user.id, `${req.user.full_name} sent you a connection request.`]
    );

    return res.json({ message: 'Connection request sent successfully' });
  } catch (err) {
    console.error('Connection request error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ACCEPT CONNECTION REQUEST
router.post('/accept', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const { connection_id } = req.body;

  try {
    // Find connection where current user is receiver
    const connRes = await query(
      'SELECT * FROM connections WHERE id = $1 AND receiver_id = $2',
      [connection_id, req.user.id]
    );

    if (connRes.rows.length === 0) {
      return res.status(404).json({ error: 'Connection request not found' });
    }

    const connection = connRes.rows[0];

    // Update connection status
    await query(
      "UPDATE connections SET status = 'accepted' WHERE id = $1",
      [connection_id]
    );

    // Create Notification for the sender
    await query(
      `INSERT INTO notifications (user_id, type, sender_id, content) 
       VALUES ($1, $2, $3, $4)`,
      [connection.sender_id, 'connection_accepted', req.user.id, `${req.user.full_name} accepted your connection request.`]
    );

    return res.json({ message: 'Connection request accepted' });
  } catch (err) {
    console.error('Accept connection error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DECLINE OR DISCONNECT
router.post('/decline', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const { connection_id } = req.body;

  try {
    const connRes = await query(
      'SELECT * FROM connections WHERE id = $1 AND (sender_id = $2 OR receiver_id = $2)',
      [connection_id, req.user.id]
    );

    if (connRes.rows.length === 0) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    await query('DELETE FROM connections WHERE id = $1', [connection_id]);

    return res.json({ message: 'Connection removed/declined' });
  } catch (err) {
    console.error('Decline connection error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// LIST CONNECTIONS AND REQUESTS
router.get('/list', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const connsRes = await query(
      `SELECT c.id, c.sender_id, c.receiver_id, c.status, c.created_at,
              u_sender.full_name AS sender_name, u_sender.country AS sender_country,
              u_receiver.full_name AS receiver_name, u_receiver.country AS receiver_country,
              p_sender.gallery AS sender_gallery, p_receiver.gallery AS receiver_gallery
       FROM connections c
       JOIN users u_sender ON c.sender_id = u_sender.id
       JOIN users u_receiver ON c.receiver_id = u_receiver.id
       JOIN profiles p_sender ON c.sender_id = p_sender.id
       JOIN profiles p_receiver ON c.receiver_id = p_receiver.id
       WHERE c.sender_id = $1 OR c.receiver_id = $1`,
      [req.user.id]
    );

    return res.json({ connections: connsRes.rows });
  } catch (err) {
    console.error('List connections error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET MESSAGES
router.get('/messages/:receiverId', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const { receiverId } = req.params;

  try {
    const msgRes = await query(
      `SELECT * FROM messages 
       WHERE (sender_id = $1 AND receiver_id = $2) 
          OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [req.user.id, receiverId]
    );
    return res.json({ messages: msgRes.rows });
  } catch (err) {
    console.error('Fetch messages error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// SEND MESSAGE (With strict 1-message pending rule)
router.post('/message', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const { receiver_id, content } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({ error: 'Message content cannot be empty' });
  }

  try {
    // Check connection status
    const connRes = await query(
      `SELECT * FROM connections 
       WHERE (sender_id = $1 AND receiver_id = $2) 
          OR (sender_id = $2 AND receiver_id = $1)`,
      [req.user.id, receiver_id]
    );

    if (connRes.rows.length === 0) {
      return res.status(400).json({ error: 'You must send a connection request before messaging.' });
    }

    const conn = connRes.rows[0];

    // If connection request is still pending
    if (conn.status === 'pending') {
      // Check if this sender already sent a message to this receiver
      const checkMsgRes = await query(
        'SELECT COUNT(*) FROM messages WHERE sender_id = $1 AND receiver_id = $2',
        [req.user.id, receiver_id]
      );
      
      const messageCount = parseInt(checkMsgRes.rows[0].count, 10);
      if (messageCount >= 1) {
        return res.status(400).json({
          error: 'You can only send one message before the connection request is accepted.'
        });
      }
    }

    // Insert message
    const insertRes = await query(
      'INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, receiver_id, content]
    );

    // Create Notification (for messages)
    await query(
      `INSERT INTO notifications (user_id, type, sender_id, content) 
       VALUES ($1, $2, $3, $4)`,
      [receiver_id, 'message', req.user.id, `${req.user.full_name} sent you a message.`]
    );

    return res.json({ message: insertRes.rows[0] });
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET NOTIFICATIONS
router.get('/notifications', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const notifRes = await query(
      `SELECT n.*, u.full_name AS sender_name 
       FROM notifications n
       JOIN users u ON n.sender_id = u.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC`,
      [req.user.id]
    );
    return res.json({ notifications: notifRes.rows });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// MARK NOTIFICATIONS AS READ
router.post('/notifications/read', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

  try {
    await query(
      'UPDATE notifications SET read = true WHERE user_id = $1',
      [req.user.id]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('Mark read error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// TOGGLE LIKE USER PROFILE
router.post('/like', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const { target_id } = req.body;

  if (!target_id) return res.status(400).json({ error: 'target_id is required' });
  if (req.user.id === target_id) return res.status(400).json({ error: 'Cannot like yourself' });

  try {
    const existing = await query(
      'SELECT id FROM likes WHERE user_id = $1 AND target_id = $2',
      [req.user.id, target_id]
    );

    if (existing.rows.length > 0) {
      // Unlike
      await query('DELETE FROM likes WHERE user_id = $1 AND target_id = $2', [req.user.id, target_id]);
      return res.json({ liked: false, message: 'Profile unliked' });
    }

    // Insert like
    await query(
      'INSERT INTO likes (user_id, target_id) VALUES ($1, $2)',
      [req.user.id, target_id]
    );

    // Create Notification
    await query(
      `INSERT INTO notifications (user_id, type, sender_id, content) 
       VALUES ($1, $2, $3, $4)`,
      [target_id, 'like', req.user.id, `${req.user.full_name} liked your profile!`]
    );

    return res.json({ liked: true, message: 'Profile liked!' });
  } catch (err) {
    console.error('Like profile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET LIKES LIST (Received likes & Sent likes)
router.get('/likes', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

  try {
    // 1. Who liked me
    const receivedRes = await query(
      `SELECT l.id AS like_id, l.created_at AS liked_at,
              u.id, u.full_name, u.country, u.last_active,
              p.gender, p.gallery, p.private_gallery, p.about_me, p.birth_date, p.show_age, p.is_approved,
              c.status AS connection_status, c.id AS connection_id
       FROM likes l
       JOIN users u ON l.user_id = u.id
       LEFT JOIN profiles p ON u.id = p.id
       LEFT JOIN connections c ON (c.sender_id = l.user_id AND c.receiver_id = $1)
                               OR (c.sender_id = $1 AND c.receiver_id = l.user_id)
       WHERE l.target_id = $1
       ORDER BY l.created_at DESC`,
      [req.user.id]
    );

    // 2. Profiles I liked
    const sentRes = await query(
      `SELECT l.id AS like_id, l.created_at AS liked_at,
              u.id, u.full_name, u.country, u.last_active,
              p.gender, p.gallery, p.private_gallery, p.about_me, p.birth_date, p.show_age, p.is_approved,
              c.status AS connection_status, c.id AS connection_id
       FROM likes l
       JOIN users u ON l.target_id = u.id
       LEFT JOIN profiles p ON u.id = p.id
       LEFT JOIN connections c ON (c.sender_id = l.target_id AND c.receiver_id = $1)
                               OR (c.sender_id = $1 AND c.receiver_id = l.target_id)
       WHERE l.user_id = $1
       ORDER BY l.created_at DESC`,
      [req.user.id]
    );

    const mapLikeRow = (row: any) => {
      const pubGallery = Array.isArray(row.gallery) ? row.gallery : [];
      const privGallery = Array.isArray(row.private_gallery) ? row.private_gallery : [];
      const profilePic = pubGallery[0] || privGallery[0] || null;

      return {
        like_id: row.like_id,
        liked_at: row.liked_at,
        id: row.id,
        full_name: row.full_name,
        country: row.country,
        gender: row.gender,
        about_me: row.about_me,
        birth_date: row.birth_date,
        show_age: row.show_age,
        is_approved: row.is_approved,
        last_active: row.last_active,
        profile_pic: profilePic,
        gallery: pubGallery,
        connection_status: row.connection_status || null,
        connection_id: row.connection_id || null,
      };
    };

    return res.json({
      received_likes: receivedRes.rows.map(mapLikeRow),
      sent_likes: sentRes.rows.map(mapLikeRow),
    });
  } catch (err) {
    console.error('Fetch likes error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
