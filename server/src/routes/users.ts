import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query } from '../db';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Configure Multer for local uploads
const uploadDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  },
});

// UPLOAD IMAGE (Available during onboarding and for authenticated users)
router.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  return res.json({ url: fileUrl });
});

// PUBLIC DISCOVER (For live landing page showcase & visitors without subscription)
router.get('/public-discover', async (req, res) => {
  try {
    const usersRes = await query(
      `SELECT u.id, u.full_name, u.country, p.gender, p.height, p.skin_tone, p.eye_color, 
              p.body_shape, p.gallery, p.private_gallery, p.about_me, p.birth_date, p.show_age
       FROM users u
       JOIN profiles p ON u.id = p.id
       WHERE u.role != 'admin'
       ORDER BY u.created_at DESC
       LIMIT 12`
    );

    const publicProfiles = usersRes.rows.map((row: any) => {
      const publicGallery = Array.isArray(row.gallery) && row.gallery.length > 0 ? row.gallery : [];
      const privateGallery = Array.isArray(row.private_gallery) ? row.private_gallery : [];
      const profilePic = publicGallery.length > 0 ? publicGallery[0] : (privateGallery.length > 0 ? privateGallery[0] : null);

      return {
        id: row.id,
        full_name: row.full_name,
        country: row.country,
        gender: row.gender,
        height: row.height,
        skin_tone: row.skin_tone,
        eye_color: row.eye_color,
        body_shape: row.body_shape,
        about_me: row.about_me,
        birth_date: row.birth_date,
        show_age: row.show_age,
        profile_pic: profilePic,
        gallery: publicGallery,
        private_photos_count: privateGallery.length,
        is_details_locked: true,
        is_private_photos_locked: true,
      };
    });

    return res.json({ users: publicProfiles });
  } catch (err) {
    console.error('Public discover error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET MY PROFILE
router.get('/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const profileRes = await query('SELECT * FROM profiles WHERE id = $1', [req.user.id]);
    return res.json({ profile: profileRes.rows[0] });
  } catch (err) {
    console.error('Fetch profile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// UPDATE MY PROFILE (triggers vetting status reset)
router.post('/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

  const {
    gender, height, skin_tone, eye_color, body_shape, sexuality,
    gallery, private_gallery, looking_for, drinking, smoking, workout, pets,
    communication_style, love_language, education_level, zodiac,
    birth_date, show_age, about_me
  } = req.body;

  try {
    const pubList = Array.isArray(gallery) ? gallery : [];
    const privList = Array.isArray(private_gallery) ? private_gallery : [];
    const totalPhotos = pubList.length + privList.length;

    // Validate total gallery size
    if (totalPhotos < 6) {
      return res.status(400).json({ error: 'You must upload at least 6 total photos across public and private gallery' });
    }

    await query(
      `UPDATE profiles SET
        gender = $1, height = $2, skin_tone = $3, eye_color = $4, body_shape = $5, sexuality = $6,
        gallery = $7, private_gallery = $8, looking_for = $9, drinking = $10, smoking = $11, workout = $12, pets = $13,
        communication_style = $14, love_language = $15, education_level = $16, zodiac = $17,
        birth_date = $18, show_age = $19, about_me = $20, is_approved = false
       WHERE id = $21`,
      [
        gender, height, skin_tone, eye_color, body_shape, sexuality,
        pubList, privList, looking_for, drinking, smoking, workout, pets,
        communication_style, love_language, education_level, zodiac,
        birth_date, show_age, about_me, req.user.id
      ]
    );

    return res.json({ message: 'Profile updated. Awaiting admin vetting approval.' });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DISCOVER PEOPLE
router.get('/discover', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

  try {
    // Fetch all other users and their profiles
    const usersRes = await query(
      `SELECT u.id, u.full_name, u.country, u.last_active, p.gender, p.height, p.skin_tone, p.eye_color, 
              p.body_shape, p.sexuality, p.gallery, p.private_gallery, p.looking_for, p.drinking, p.smoking, 
              p.workout, p.pets, p.communication_style, p.love_language, p.education_level, 
              p.zodiac, p.birth_date, p.show_age, p.about_me, p.is_approved
       FROM users u
       JOIN profiles p ON u.id = p.id
       WHERE u.id != $1 AND u.role != 'admin'`,
      [req.user.id]
    );

    // Fetch connection requests involving the current user to evaluate connection status
    const connRes = await query(
      `SELECT id, sender_id, receiver_id, status 
       FROM connections 
       WHERE sender_id = $1 OR receiver_id = $1`,
      [req.user.id]
    );

    // Fetch likes sent by current user
    const likesRes = await query(
      `SELECT target_id FROM likes WHERE user_id = $1`,
      [req.user.id]
    );
    const likedTargetIds = new Set(likesRes.rows.map((r: any) => r.target_id));

    const connections = connRes.rows;

    const filteredUsers = usersRes.rows.map((otherUser) => {
      // Find connection with this user
      const conn = connections.find(
        (c) =>
          (c.sender_id === req.user?.id && c.receiver_id === otherUser.id) ||
          (c.sender_id === otherUser.id && c.receiver_id === req.user?.id)
      );

      const hasConnectionRequest = !!conn;
      const isConnectionAccepted = conn?.status === 'accepted';
      const isSender = conn?.sender_id === req.user?.id;
      const isLiked = likedTargetIds.has(otherUser.id);

      const publicGallery = Array.isArray(otherUser.gallery) ? otherUser.gallery : [];
      const privateGallery = Array.isArray(otherUser.private_gallery) ? otherUser.private_gallery : [];
      const profilePic = publicGallery.length > 0 ? publicGallery[0] : (privateGallery.length > 0 ? privateGallery[0] : null);

      // Base public details (names, country, public profile pictures, about me, physical characteristics)
      // Viewable by anyone in the system (including non-subscribers and before connection requests)
      const basePublicInfo = {
        id: otherUser.id,
        full_name: otherUser.full_name,
        country: otherUser.country,
        profile_pic: profilePic,
        public_gallery: publicGallery,
        gender: otherUser.gender,
        height: otherUser.height,
        skin_tone: otherUser.skin_tone,
        eye_color: otherUser.eye_color,
        body_shape: otherUser.body_shape,
        about_me: otherUser.about_me,
        is_approved: otherUser.is_approved,
        last_active: otherUser.last_active,
        is_liked: isLiked,
      };

      // 1. Before connection request is made:
      // Users can see basic details (names, country, profile pics, about me, physical traits)
      if (!hasConnectionRequest) {
        return {
          ...basePublicInfo,
          gallery: publicGallery,
          connection_status: null,
          connection_id: null,
          is_sender: false,
          is_details_locked: true, // Requires connection request to reveal lifestyle habits
          is_private_photos_locked: true,
          private_photos_count: privateGallery.length,
        };
      }

      // 2. When a connection request is made (pending):
      // Full user profile is unlocked! Private gallery remains locked until accepted.
      if (!isConnectionAccepted) {
        return {
          ...basePublicInfo,
          gallery: publicGallery,
          sexuality: otherUser.sexuality,
          looking_for: otherUser.looking_for,
          drinking: otherUser.drinking,
          smoking: otherUser.smoking,
          workout: otherUser.workout,
          pets: otherUser.pets,
          communication_style: otherUser.communication_style,
          love_language: otherUser.love_language,
          education_level: otherUser.education_level,
          zodiac: otherUser.zodiac,
          birth_date: otherUser.birth_date,
          show_age: otherUser.show_age,
          connection_status: 'pending',
          connection_id: conn.id,
          is_sender: isSender,
          is_details_locked: false, // Lifestyle & habits revealed!
          is_private_photos_locked: true, // Private photos remain locked until accepted
          private_photos_count: privateGallery.length,
        };
      }

      // 3. When connection request is accepted ("those I have hooked with in the system"):
      // Both public and private gallery are unlocked!
      return {
        ...basePublicInfo,
        gallery: [...publicGallery, ...privateGallery],
        public_gallery: publicGallery,
        private_gallery: privateGallery,
        sexuality: otherUser.sexuality,
        looking_for: otherUser.looking_for,
        drinking: otherUser.drinking,
        smoking: otherUser.smoking,
        workout: otherUser.workout,
        pets: otherUser.pets,
        communication_style: otherUser.communication_style,
        love_language: otherUser.love_language,
        education_level: otherUser.education_level,
        zodiac: otherUser.zodiac,
        birth_date: otherUser.birth_date,
        show_age: otherUser.show_age,
        connection_status: 'accepted',
        connection_id: conn.id,
        is_sender: isSender,
        is_details_locked: false,
        is_private_photos_locked: false, // Private photos unlocked!
        private_photos_count: privateGallery.length,
      };
    });

    return res.json({ users: filteredUsers });
  } catch (err) {
    console.error('Discover error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE MY ACCOUNT AND ACCOUNT HISTORY
router.delete('/delete-account', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  try {
    // Delete from users table (cascades to profiles, connections, messages, reviews, notifications)
    await query('DELETE FROM users WHERE id = $1', [req.user.id]);
    res.clearCookie('token');
  } catch (err) {
    console.error('Delete account error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET APPROVED REVIEWS (Public for landing page)
router.get('/reviews', async (req, res) => {
  try {
    const reviewsRes = await query(
      `SELECT r.id, r.rating, r.message, r.created_at, u.full_name, u.country
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.is_approved = true
       ORDER BY r.created_at DESC
       LIMIT 10`
    );
    return res.json({ reviews: reviewsRes.rows });
  } catch (err) {
    console.error('Fetch public reviews error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// SUBMIT A REVIEW (Authenticated user)
router.post('/reviews', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const { rating, message } = req.body;

  const numRating = Number(rating);
  if (!numRating || numRating < 1 || numRating > 5) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
  }

  const cleanMessage = (message || '').trim();
  if (!cleanMessage) {
    return res.status(400).json({ error: 'Review message cannot be empty' });
  }

  try {
    const insertRes = await query(
      `INSERT INTO reviews (user_id, rating, message, is_approved)
       VALUES ($1, $2, $3, false)
       RETURNING id, rating, message, is_approved, created_at`,
      [req.user.id, numRating, cleanMessage]
    );

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully. It will appear on the landing page once approved by an admin.',
      review: insertRes.rows[0],
    });
  } catch (err) {
    console.error('Submit review error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
