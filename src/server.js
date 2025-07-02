import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

// Load environment variables
dotenv.config();

// Import configurations and utilities
import connectDB from './config/database.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import launcherRoutes from './routes/launcherRoutes.js';
import serverRoutes from './routes/serverRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
        credentials: true,
        methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "ws:", "wss:", "https:"],
            mediaSrc: ["'self'", "blob:"],
            objectSrc: ["'none'"],
            frameSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
    origin: function(origin, callback) {
        const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3001'];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Minecraft-Token', 'X-API-Key']
}));

// Compression
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB injection protection
app.use(mongoSanitize());

// Request logging
app.use(requestLogger);

// Rate limiting
const generalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true
});

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Trust proxy
app.set('trust proxy', 1);

// Static files
app.use(express.static(join(__dirname, '../public')));
app.use('/uploads', express.static(join(__dirname, '../uploads')));
app.use('/launcher-data', express.static(join(__dirname, '../launcher-data')));

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '2.0.0'
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/launcher', launcherRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// API status
app.get('/api/status', (req, res) => {
    res.json({
        status: 'operational',
        message: 'DiLauncher API v2.0',
        timestamp: new Date().toISOString(),
        features: [
            'JWT Authentication with Refresh Tokens',
            'MongoDB Database',
            'Minecraft Profile Management',
            'Server Management',
            'Real-time Updates via WebSocket',
            'File Download System',
            'Admin Dashboard'
        ],
        endpoints: {
            auth: '/api/auth',
            profiles: '/api/profiles',
            launcher: '/api/launcher',
            servers: '/api/servers',
            users: '/api/users',
            admin: '/api/admin'
        }
    });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`🔌 New socket connection: ${socket.id}`);
    
    // Join user room if authenticated
    socket.on('authenticate', async (token) => {
        try {
            // Verify token and get user
            // const user = await verifySocketToken(token);
            // socket.userId = user._id;
            // socket.join(`user:${user._id}`);
            // socket.emit('authenticated', { userId: user._id });
        } catch (error) {
            socket.emit('authentication_error', { error: 'Invalid token' });
        }
    });
    
    // Handle launcher events
    socket.on('launcher:status', (data) => {
        if (socket.userId) {
            io.to(`user:${socket.userId}`).emit('launcher:status_update', data);
        }
    });
    
    // Handle download progress
    socket.on('download:progress', (data) => {
        if (socket.userId) {
            io.to(`user:${socket.userId}`).emit('download:progress_update', data);
        }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
});

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Error handling middleware (should be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

async function startServer() {
    try {
        // Connect to MongoDB
        await connectDB();
        
        // Start HTTP server
        httpServer.listen(PORT, HOST, () => {
            console.log(`
╔══════════════════════════════════════════╗
║         DiLauncher Server v2.0           ║
╠══════════════════════════════════════════╣
║  🚀 Server running on ${HOST}:${PORT}       ║
║  🌍 Environment: ${process.env.NODE_ENV || 'development'}           ║
║  📊 Database: MongoDB                    ║
║  🔐 Auth: JWT with Refresh Tokens        ║
║  🎮 Ready for Minecraft launches!        ║
╚══════════════════════════════════════════╝
            `);
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('💥 Unhandled Promise Rejection:', err);
    // Close server & exit process
    httpServer.close(() => {
        process.exit(1);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
    // Close server & exit process
    httpServer.close(() => {
        process.exit(1);
    });
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);
    
    // Close HTTP server
    httpServer.close(() => {
        console.log('🔴 HTTP server closed');
    });
    
    // Close database connections
    try {
        await mongoose.connection.close();
        console.log('🔴 MongoDB connection closed');
    } catch (error) {
        console.error('❌ Error closing MongoDB connection:', error);
    }
    
    // Exit process
    process.exit(0);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer();

// Export for testing
export { app, io, httpServer };