import { Router } from 'express';
import { supabase } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Middleware to verify Admin role
const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access forbidden. Administrator privileges required.' });
  }
};

// Apply auth + role check to all admin routes
router.use(requireAuth);
router.use(requireAdmin);

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, names, phone_number, country, interaction_preference, role, is_premium, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(users);
  } catch (error) {
    console.error('Admin fetch users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle premium status
router.put('/users/:id/premium', async (req, res) => {
  try {
    const userId = req.params.id;
    const { is_premium } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .update({ is_premium })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    res.json(user);
  } catch (error) {
    console.error('Admin update premium status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle role status
router.put('/users/:id/role', async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    res.json(user);
  } catch (error) {
    console.error('Admin update role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user account
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all profiles pending admin approval
router.get('/pending-profiles', async (req, res) => {
  try {
    const { data: pending, error } = await supabase
      .from('profiles')
      .select(`
        user_id,
        pending_gender,
        pending_height,
        pending_skin_tone,
        pending_eye_color,
        pending_body_shape,
        pending_images,
        pending_about_me,
        approval_status,
        user:users!user_id(names, email)
      `)
      .eq('approval_status', 'pending');

    if (error) throw error;
    res.json(pending);
  } catch (error) {
    console.error('Admin fetch pending profiles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve profile changes
router.post('/profiles/:userId/approve', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        gender: profile.pending_gender,
        height: profile.pending_height,
        skin_tone: profile.pending_skin_tone,
        eye_color: profile.pending_eye_color,
        body_shape: profile.pending_body_shape,
        images: profile.pending_images,
        about_me: profile.pending_about_me,
        pending_gender: null,
        pending_height: null,
        pending_skin_tone: null,
        pending_eye_color: null,
        pending_body_shape: null,
        pending_images: null,
        pending_about_me: null,
        approval_status: 'approved'
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) throw updateError;
    res.json(updatedProfile);
  } catch (error) {
    console.error('Admin approve profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject profile changes
router.post('/profiles/:userId/reject', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update({
        pending_gender: null,
        pending_height: null,
        pending_skin_tone: null,
        pending_eye_color: null,
        pending_body_shape: null,
        pending_images: null,
        pending_about_me: null,
        approval_status: 'rejected'
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    res.json(updatedProfile);
  } catch (error) {
    console.error('Admin reject profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all reviews for admin
router.get('/reviews', async (req, res) => {
  try {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        id, rating, message, status, created_at,
        user:users!user_id(names, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(reviews);
  } catch (error) {
    console.error('Admin fetch reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update review status
router.put('/reviews/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid review status' });
    }

    const { data: review, error } = await supabase
      .from('reviews')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(review);
  } catch (error) {
    console.error('Admin update review status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete review
router.delete('/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Admin delete review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
