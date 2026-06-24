"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load env
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const allowedOrigins = [
    'http://localhost:5173',
    process.env.FRONTEND_URL,
].filter(Boolean);
const corsOptions = {
    origin: (origin, callback) => {
        // In development or for same-origin requests (no origin header), allow.
        // In production, check if the origin is in the allowed list.
        if (!origin || process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
};
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: corsOptions,
});
app.set('io', io);
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const connections_1 = __importDefault(require("./routes/connections"));
const payments_1 = __importDefault(require("./routes/payments"));
const admin_1 = __importDefault(require("./routes/admin"));
const reviews_1 = __importDefault(require("./routes/reviews"));
// Middleware
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ limit: '50mb', extended: true }));
app.use((0, cookie_parser_1.default)());
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/connections', connections_1.default);
app.use('/api/payments', payments_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/reviews', reviews_1.default);
// Simple health check route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
    const clientDistPath = path_1.default.join(__dirname, '../../client/dist');
    app.use(express_1.default.static(clientDistPath));
    // Wildcard fallback for React routing (SPA) support
    app.get('*', (req, res, next) => {
        // If request is for an API route that was not matched, return 404 instead of index.html
        if (req.path.startsWith('/api/')) {
            res.status(404).json({ error: 'API endpoint not found' });
            return;
        }
        res.sendFile(path_1.default.join(clientDistPath, 'index.html'), (err) => {
            if (err) {
                next(err);
            }
        });
    });
}
// Setup Socket.io
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    socket.on('register', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`Socket ${socket.id} joined room user_${userId}`);
    });
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
