import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { query } from '../db';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';
const NODE_ENV = process.env.NODE_ENV || 'development';

const signupSchema = z.object({
  email: z.string().email(),
  phone_number: z.string().min(5),
  full_name: z.string().min(2),
  password: z.string().min(6),
  country: z.string().min(2),
  gender: z.string().optional(),
  height: z.union([z.string(), z.number()]).optional(),
  skin_tone: z.string().optional(),
  eye_color: z.string().optional(),
  body_shape: z.string().optional(),
  about_me: z.string().optional(),
  profile_pic: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Set JWT cookie helper
const setJwtCookie = (res: Response, userId: string) => {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// SIGN UP
router.post('/signup', async (req, res) => {
  try {
    const data = signupSchema.parse(req.body);
    
    // Check if email already exists
    const userCheck = await query('SELECT id FROM users WHERE email = $1', [data.email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    // Insert user
    const userRes = await query(
      `INSERT INTO users (email, phone_number, full_name, password_hash, country) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role, full_name, country`,
      [data.email, data.phone_number, data.full_name, passwordHash, data.country]
    );

    const newUser = userRes.rows[0];

    // Initialize public profile details if provided during registration
    if (data.gender || data.about_me || data.profile_pic || data.height || data.body_shape || data.skin_tone || data.eye_color) {
      const initialGallery = data.profile_pic ? [data.profile_pic] : [];

      // Normalize gender to match check constraint ('man', 'woman')
      let normalizedGender: string | null = null;
      if (data.gender) {
        const g = data.gender.toLowerCase();
        if (g.includes('woman') || g.includes('female')) normalizedGender = 'woman';
        else if (g.includes('man') || g.includes('male')) normalizedGender = 'man';
      }

      // Parse height to numeric
      let numericHeight: number | null = null;
      if (data.height !== undefined && data.height !== null && data.height !== '') {
        if (typeof data.height === 'number') {
          numericHeight = data.height;
        } else {
          const matchFeetInches = String(data.height).match(/^(\d+)['’](\d+)?/);
          if (matchFeetInches) {
            const feet = parseFloat(matchFeetInches[1]);
            const inches = matchFeetInches[2] ? parseFloat(matchFeetInches[2]) : 0;
            numericHeight = parseFloat((feet + inches / 12).toFixed(2));
          } else {
            const parsed = parseFloat(String(data.height).replace(/[^0-9.]/g, ''));
            numericHeight = isNaN(parsed) ? null : parsed;
          }
        }
      }

      await query(
        `UPDATE profiles SET
          gender = COALESCE($1, gender),
          height = COALESCE($2, height),
          skin_tone = COALESCE($3, skin_tone),
          eye_color = COALESCE($4, eye_color),
          body_shape = COALESCE($5, body_shape),
          about_me = COALESCE($6, about_me),
          gallery = CASE WHEN $7::text[] != '{}' THEN $7 ELSE gallery END
         WHERE id = $8`,
        [
          normalizedGender,
          numericHeight,
          data.skin_tone || null,
          data.eye_color || null,
          data.body_shape || null,
          data.about_me || null,
          initialGallery,
          newUser.id,
        ]
      );
    }
    
    // Set cookie
    setJwtCookie(res, newUser.id);

    return res.status(201).json({
      message: 'Registration successful',
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        full_name: newUser.full_name,
        country: newUser.country,
        is_premium: false,
        token_balance: 0,
        is_approved: false
      }
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    const userRes = await query(
      `SELECT u.id, u.email, u.role, u.full_name, u.country, u.password_hash, 
              p.is_premium, p.token_balance, p.is_approved
       FROM users u
       LEFT JOIN profiles p ON u.id = p.id
       WHERE u.email = $1`,
      [data.email]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const user = userRes.rows[0];

    const isMatch = await bcrypt.compare(data.password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Set cookie
    setJwtCookie(res, user.id);

    return res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        country: user.country,
        is_premium: user.is_premium,
        token_balance: user.token_balance,
        is_approved: user.is_approved
      }
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// TELEGRAM AUTHENTICATION (Mini Apps initData & Web Login Widget)
router.post('/telegram', async (req, res) => {
  try {
    const { initData, authData } = req.body;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return res.status(500).json({ error: 'Telegram authentication is currently unconfigured (missing bot token).' });
    }

    let tgUser: any = null;

    if (initData) {
      // 1. Process Telegram Mini App initData query string
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');
      if (!hash) {
        return res.status(400).json({ error: 'Missing hash signature in initData' });
      }
      urlParams.delete('hash');

      // Sort remaining parameters alphabetically
      const params = Array.from(urlParams.entries())
        .map(([key, value]) => `${key}=${value}`)
        .sort();

      const dataCheckString = params.join('\n');

      // Generate HMAC-SHA256 secret key with "WebAppData"
      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();

      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      if (calculatedHash !== hash) {
        return res.status(401).json({ error: 'Unauthorized: Invalid Telegram hash signature' });
      }

      const userString = urlParams.get('user');
      tgUser = userString ? JSON.parse(userString) : null;
    } else if (authData && typeof authData === 'object') {
      // 2. Process Telegram Web Login Widget object
      const { hash, ...dataToVerify } = authData;
      if (!hash) {
        return res.status(400).json({ error: 'Missing hash signature in authData' });
      }

      // Check auth_date freshness (allow up to 24 hours)
      if (dataToVerify.auth_date && Date.now() / 1000 - Number(dataToVerify.auth_date) > 86400) {
        return res.status(401).json({ error: 'Telegram authorization data has expired' });
      }

      const checkString = Object.keys(dataToVerify)
        .sort()
        .map((k) => `${k}=${(dataToVerify as any)[k]}`)
        .join('\n');

      // Generate SHA256 secret key using botToken for standard web widget
      const secretKey = crypto
        .createHash('sha256')
        .update(botToken)
        .digest();

      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(checkString)
        .digest('hex');

      if (calculatedHash !== hash) {
        return res.status(401).json({ error: 'Unauthorized: Invalid Telegram Widget signature' });
      }

      tgUser = authData;
    } else {
      return res.status(400).json({ error: 'Missing Telegram authentication payload (initData or authData required)' });
    }

    if (!tgUser || !tgUser.id) {
      return res.status(400).json({ error: 'Could not extract valid Telegram user from payload' });
    }

    const telegramId = String(tgUser.id);
    const telegramUsername = tgUser.username || null;
    const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || telegramUsername || `TG User ${telegramId}`;

    // Look for existing user by telegram_id
    let userRes = await query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
    let user = userRes.rows[0];

    if (!user) {
      // Fallback check: check if an account with matching auto-generated email exists
      const fallbackEmail = `tg_${telegramId}@hooked.ink`;
      const emailRes = await query('SELECT * FROM users WHERE email = $1', [fallbackEmail]);
      if (emailRes.rows.length > 0) {
        user = emailRes.rows[0];
        await query(
          'UPDATE users SET telegram_id = $1, telegram_username = $2, last_active = NOW() WHERE id = $3',
          [telegramId, telegramUsername, user.id]
        );
      } else {
        // Auto-provision new user account
        const randomPass = crypto.randomBytes(16).toString('hex');
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(randomPass, salt);

        const insertUserRes = await query(
          `INSERT INTO users (email, phone_number, full_name, password_hash, country, telegram_id, telegram_username) 
           VALUES ($1, $2, $3, $4, $5, $6, $7) 
           RETURNING id, email, role, full_name, country, telegram_id, telegram_username`,
          [
            fallbackEmail,
            `+TG_${telegramId}`,
            fullName,
            passwordHash,
            'Global',
            telegramId,
            telegramUsername,
          ]
        );
        user = insertUserRes.rows[0];

        // Provision profile
        const initialGallery = tgUser.photo_url ? [tgUser.photo_url] : [];
        await query(
          `INSERT INTO profiles (id, about_me, gallery, is_approved) 
           VALUES ($1, $2, $3, true)
           ON CONFLICT (id) DO UPDATE SET 
             gallery = CASE WHEN array_length(profiles.gallery, 1) IS NULL THEN EXCLUDED.gallery ELSE profiles.gallery END`,
          [user.id, 'Verified Telegram Member', initialGallery]
        );
      }
    } else {
      // Update last active & username if changed
      await query(
        'UPDATE users SET telegram_username = $1, last_active = NOW() WHERE id = $2',
        [telegramUsername, user.id]
      );
    }

    // Set authenticated session cookie
    setJwtCookie(res, user.id);

    // Fetch profile details for client auth context
    const profileRes = await query(
      'SELECT is_premium, token_balance, is_approved FROM profiles WHERE id = $1',
      [user.id]
    );
    const profile = profileRes.rows[0] || { is_premium: false, token_balance: 0, is_approved: true };

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        country: user.country,
        telegram_id: user.telegram_id,
        telegram_username: user.telegram_username,
        is_premium: profile.is_premium,
        token_balance: profile.token_balance,
        is_approved: profile.is_approved,
      },
    });
  } catch (err: any) {
    console.error('Telegram auth error:', err);
    return res.status(500).json({ error: 'Internal Authentication Error' });
  }
});

// LOGOUT
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ message: 'Logged out successfully' });
});

// GET ME (session verification)
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const profileRes = await query(
      'SELECT is_premium, token_balance, is_approved FROM profiles WHERE id = $1',
      [req.user.id]
    );

    const profile = profileRes.rows[0] || { is_premium: false, token_balance: 0, is_approved: false };

    return res.json({
      user: {
        ...req.user,
        is_premium: profile.is_premium,
        token_balance: profile.token_balance,
        is_approved: profile.is_approved
      }
    });
  } catch (err) {
    console.error('Fetch me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
