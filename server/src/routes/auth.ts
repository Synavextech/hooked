import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { supabase } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  names: z.string().min(2),
  phone_number: z.string().optional(),
  country: z.string().optional(),
  interaction_preference: z.enum(['just_chat', 'plan_meet', 'friendship', 'serious_relationship'])
});

router.post('/register', async (req, res) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const password_hash = await bcrypt.hash(validatedData.password, 10);

    const { data: insertedUser, error } = await supabase
      .from('users')
      .insert([{
        email: validatedData.email,
        password_hash,
        names: validatedData.names,
        phone_number: validatedData.phone_number,
        country: validatedData.country,
        interaction_preference: validatedData.interaction_preference
      }])
      .select('id, email, names, phone_number, country, role, interaction_preference, is_premium')
      .single();

    if (error) {
      if (error.code === '23505') { // unique violation
        return res.status(400).json({ error: 'Email already exists' });
      }
      throw error;
    }

    // Create an empty profile
    const { data: profile } = await supabase
      .from('profiles')
      .insert([{ user_id: insertedUser.id }])
      .select()
      .single();

    const user = {
      ...insertedUser,
      profiles: profile || null
    };

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    } as any);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, role, names, phone_number, country, interaction_preference, is_premium, profiles(*)')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    } as any);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const { password_hash, ...userWithoutPassword } = user;
    const userProfile = Array.isArray(userWithoutPassword.profiles) 
      ? userWithoutPassword.profiles[0] 
      : userWithoutPassword.profiles;

    res.json({ 
      user: {
        ...userWithoutPassword,
        profiles: userProfile || null
      } 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, names, phone_number, country, interaction_preference, role, is_premium, profiles(*)')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
