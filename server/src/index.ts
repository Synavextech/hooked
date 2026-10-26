import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

// Route Imports
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import connectionRoutes from './routes/connections';
import paymentRoutes from './routes/payments';
import adminRoutes from './routes/admin';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.PRODUCTION_url 
      : 'http://localhost:3000',
    credentials: true,
  },
});

const PORT = process.env.BACKEND_PORT || 5000;

// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Managed for PayPal SDK and external media resources
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS setup
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.PRODUCTION_url 
      : 'http://localhost:3000',
    credentials: true,
  })
);

// Rate Limiting for Auth and Payments to prevent abuse
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // Limit each IP to 60 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit payment initiations
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Payment request limit reached. Please wait before retrying.' },
});

// Raw Body Verification for Stripe Webhooks
app.use(
  express.json({
    verify: (req: any, res, buf) => {
      if (req.originalUrl.startsWith('/api/payments/stripe/webhook')) {
        req.rawBody = buf;
      }
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static uploads serving
const uploadsPath = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath));

import { query } from './db';

// API Routers with rate limiters
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/payments', paymentLimiter, paymentRoutes);
app.use('/api/admin', adminRoutes);

// In-Memory Presence Tracker (Set of active sockets per user)
const userSockets = new Map<string, Set<string>>();
const socketToUser = new Map<string, string>();

// Endpoint to fetch currently online users
app.get('/api/users/presence', (req, res) => {
  return res.json({ onlineUsers: Array.from(userSockets.keys()) });
});

// Socket.io Connection Event Handler
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // User joins room with their userId for target messaging & presence tracking
  socket.on('join', async (userId: string) => {
    if (!userId) return;
    socket.join(userId);
    socketToUser.set(socket.id, userId);

    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    try {
      await query('UPDATE users SET last_active = NOW() WHERE id = $1', [userId]);
    } catch (err) {
      console.error('Error updating last_active on join:', err);
    }

    // Broadcast user online event to all connected clients
    io.emit('user_presence', {
      userId,
      isOnline: true,
      lastActive: new Date().toISOString(),
    });

    // Send the list of currently online user IDs to the newly joined client
    socket.emit('online_users_list', Array.from(userSockets.keys()));
    console.log(`User ${userId} joined room. Total online users: ${userSockets.size}`);
  });

  // Client heartbeat to refresh active timestamp
  socket.on('heartbeat', async (userId: string) => {
    if (!userId) return;
    try {
      await query('UPDATE users SET last_active = NOW() WHERE id = $1', [userId]);
    } catch (err) {
      // silent heartbeat
    }
  });

  // Relay chat messages
  socket.on('send_message', async (data: { sender_id: string; receiver_id: string; content: string }) => {
    try {
      await query('UPDATE users SET last_active = NOW() WHERE id = $1', [data.sender_id]);
    } catch (err) {}
    io.to(data.receiver_id).emit('receive_message', data);
  });

  // Relay connection request updates
  socket.on('connection_request', (data: { sender_id: string; receiver_id: string }) => {
    io.to(data.receiver_id).emit('notification', {
      type: 'connection_request',
      message: 'You have a new connection request!',
    });
  });

  socket.on('disconnect', async () => {
    const userId = socketToUser.get(socket.id);
    if (userId) {
      socketToUser.delete(socket.id);
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          const nowIso = new Date().toISOString();
          try {
            await query('UPDATE users SET last_active = NOW() WHERE id = $1', [userId]);
          } catch (err) {
            console.error('Error updating last_active on disconnect:', err);
          }
          // Broadcast user offline event with their latest lastActive timestamp
          io.emit('user_presence', {
            userId,
            isOnline: false,
            lastActive: nowIso,
          });
        }
      }
    }
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Production Client Hosting Setup
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(process.cwd(), 'dist/client');
  app.use(express.static(clientBuildPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  // Simple check endpoint for dev
  app.get('/', (req, res) => {
    res.json({ message: 'Hooked API Server Running' });
  });
}

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
