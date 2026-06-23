import { Router } from 'express';
import { supabase } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Get list of users to discover (excluding self, existing connections, and admins)
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id, names, country, interaction_preference, role, profile_picture:profiles(images, height, body_shape, about_me, gender)
      `)
      .neq('id', userId)
      .neq('role', 'admin')
      .limit(50);

    if (error) throw error;

    // Format response to only show basic info as requested (names, country, profile picture, height, body_shape, about_me, gender)
    const formattedUsers = users.map((u: any) => {
      const profile = Array.isArray(u.profile_picture) ? u.profile_picture[0] : u.profile_picture;
      return {
        id: u.id,
        names: u.names,
        country: u.country,
        interaction_preference: u.interaction_preference,
        profile_picture: profile?.images?.[0] || null,
        height: profile?.height || 'N/A',
        body_shape: profile?.body_shape || 'N/A',
        about_me: profile?.about_me || null,
        gender: profile?.gender || 'N/A'
      };
    });

    res.json(formattedUsers);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific user profile (full visibility only if connected, requires premium caller unless inspecting self)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const myId = (req as any).user.id;
    const myRole = (req as any).user.role;
    const targetId = req.params.id;

    // Check if the caller has premium privileges
    let callerIsPremium = false;
    if (myId !== targetId && myRole !== 'admin') {
      const { data: myUser } = await supabase
        .from('users')
        .select('is_premium')
        .eq('id', myId)
        .single();
      callerIsPremium = !!myUser?.is_premium;
    }

    // Check connection status
    const { data: connection } = await supabase
      .from('connections')
      .select('status')
      .or(`and(requester_id.eq.${myId},recipient_id.eq.${targetId}),and(requester_id.eq.${targetId},recipient_id.eq.${myId})`)
      .single();

    const isConnected = connection && (connection.status === 'accepted' || connection.status === 'pending');

    // Fetch user and profile (include pending columns and approval_status)
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id, email, names, phone_number, country, interaction_preference, role, is_premium,
        profiles (gender, height, skin_tone, eye_color, body_shape, images, about_me, pending_gender, pending_height, pending_skin_tone, pending_eye_color, pending_body_shape, pending_images, pending_about_me, approval_status)
      `)
      .eq('id', targetId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userProfile = Array.isArray(user.profiles) ? user.profiles[0] : user.profiles;

    if (isConnected || myId === targetId || myRole === 'admin') {
      // Return full profile including contact details
      return res.json({
        id: user.id,
        email: user.email,
        names: user.names,
        phone_number: user.phone_number,
        country: user.country,
        interaction_preference: user.interaction_preference,
        role: user.role,
        is_premium: user.is_premium,
        profiles: userProfile,
        isConnected: true
      });
    } else {
      // Return limited profile but include physical stats and only first image
      return res.json({
        id: user.id,
        names: user.names,
        country: user.country,
        interaction_preference: user.interaction_preference,
        profiles: {
          gender: userProfile?.gender || null,
          height: userProfile?.height || null,
          skin_tone: userProfile?.skin_tone || null,
          eye_color: userProfile?.eye_color || null,
          body_shape: userProfile?.body_shape || null,
          about_me: userProfile?.about_me || null,
          images: userProfile?.images?.[0] ? [userProfile.images[0]] : []
        },
        isConnected: false
      });
    }
  } catch (error) {
    console.error('Fetch user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update own profile (updates pending columns, requires admin approval)
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { gender, height, skin_tone, eye_color, body_shape, images, about_me } = req.body;

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        pending_gender: gender,
        pending_height: height,
        pending_skin_tone: skin_tone,
        pending_eye_color: eye_color,
        pending_body_shape: body_shape,
        pending_images: images,
        pending_about_me: about_me,
        approval_status: 'pending'
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    res.json(profile);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload image to Supabase storage via backend service role client
router.post('/profile/upload', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { base64Image, fileName } = req.body;

    if (!base64Image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Decode base64 image
    const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,([\s\S]+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 image format' });
    }

    const fileType = matches[1];
    const imageBuffer = Buffer.from(matches[2].replace(/\s/g, ''), 'base64');
    const cleanFileName = `${userId}_${Date.now()}_${fileName || 'image.jpg'}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('profile_images')
      .upload(cleanFileName, imageBuffer, {
        contentType: fileType,
        upsert: true
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile_images')
      .getPublicUrl(cleanFileName);

    res.json({ publicUrl });
  } catch (error: any) {
    console.error('Upload image error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
