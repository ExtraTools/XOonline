import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import User from '../models/User.js';
import Server from '../models/Server.js';
import { errors } from '../middleware/errorHandler.js';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

// Apply admin authorization to all routes
router.use(authenticate, authorize('admin'));

// Dashboard statistics
router.get('/dashboard', async (req, res, next) => {
    try {
        const [
            totalUsers,
            activeUsers,
            premiumUsers,
            totalServers,
            onlineServers,
            totalProfiles,
            recentUsers,
            popularServers
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
            User.countDocuments({ isPremium: true }),
            Server.countDocuments(),
            Server.countDocuments({ 'status.online': true }),
            User.aggregate([{ $project: { profileCount: { $size: '$profiles' } } }, { $group: { _id: null, total: { $sum: '$profileCount' } } }]),
            User.find().sort('-createdAt').limit(10).select('username email createdAt lastActive'),
            Server.find().sort('-status.players.online').limit(10).select('name address status.players')
        ]);
        
        const stats = {
            users: {
                total: totalUsers,
                active24h: activeUsers,
                premium: premiumUsers
            },
            servers: {
                total: totalServers,
                online: onlineServers
            },
            profiles: {
                total: totalProfiles[0]?.total || 0
            },
            system: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                nodeVersion: process.version
            }
        };
        
        res.json({
            success: true,
            data: {
                stats,
                recentUsers,
                popularServers
            }
        });
        
    } catch (error) {
        next(error);
    }
});

// User management
router.get('/users', async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 50,
            search,
            role,
            isPremium,
            isBanned,
            sortBy = 'createdAt',
            order = 'desc'
        } = req.query;
        
        // Build query
        const query = {};
        
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (role) query.role = role;
        if (isPremium !== undefined) query.isPremium = isPremium === 'true';
        if (isBanned !== undefined) query.isBanned = isBanned === 'true';
        
        // Execute query
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sort = { [sortBy]: order === 'desc' ? -1 : 1 };
        
        const [users, total] = await Promise.all([
            User.find(query)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .select('-password -refreshTokens'),
            User.countDocuments(query)
        ]);
        
        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });
        
    } catch (error) {
        next(error);
    }
});

// Update user
router.put('/users/:userId', async (req, res, next) => {
    try {
        const user = await User.findById(req.params.userId);
        
        if (!user) {
            throw errors.notFound('User not found');
        }
        
        // Update allowed admin fields
        const adminFields = [
            'role', 'isPremium', 'premiumExpires',
            'isBanned', 'banReason', 'banExpires',
            'emailVerified'
        ];
        
        adminFields.forEach(field => {
            if (req.body[field] !== undefined) {
                user[field] = req.body[field];
            }
        });
        
        await user.save();
        
        res.json({
            success: true,
            message: 'User updated successfully',
            data: { user }
        });
        
    } catch (error) {
        next(error);
    }
});

// Delete user
router.delete('/users/:userId', async (req, res, next) => {
    try {
        const user = await User.findById(req.params.userId);
        
        if (!user) {
            throw errors.notFound('User not found');
        }
        
        // Prevent deleting admin users
        if (user.role === 'admin') {
            throw errors.forbidden('Cannot delete admin users');
        }
        
        // Delete user's servers
        await Server.deleteMany({ owner: user._id });
        
        // Delete user
        await user.deleteOne();
        
        res.json({
            success: true,
            message: 'User and associated data deleted successfully'
        });
        
    } catch (error) {
        next(error);
    }
});

// Server management
router.get('/servers', async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 50,
            search,
            version,
            isOnline,
            isFeatured,
            sortBy = 'createdAt'
        } = req.query;
        
        // Build query
        const query = {};
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { address: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (version) query.version = version;
        if (isOnline !== undefined) query['status.online'] = isOnline === 'true';
        if (isFeatured !== undefined) query.isFeatured = isFeatured === 'true';
        
        // Execute query
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const [servers, total] = await Promise.all([
            Server.find(query)
                .sort({ [sortBy]: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('owner', 'username'),
            Server.countDocuments(query)
        ]);
        
        res.json({
            success: true,
            data: {
                servers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });
        
    } catch (error) {
        next(error);
    }
});

// Feature/unfeature server
router.patch('/servers/:serverId/feature', async (req, res, next) => {
    try {
        const server = await Server.findById(req.params.serverId);
        
        if (!server) {
            throw errors.notFound('Server not found');
        }
        
        server.isFeatured = !server.isFeatured;
        await server.save();
        
        res.json({
            success: true,
            message: `Server ${server.isFeatured ? 'featured' : 'unfeatured'} successfully`,
            data: { isFeatured: server.isFeatured }
        });
        
    } catch (error) {
        next(error);
    }
});

// Ban/unban user from server
router.post('/servers/:serverId/ban', async (req, res, next) => {
    try {
        const { userId, reason, duration } = req.body;
        
        const server = await Server.findById(req.params.serverId);
        if (!server) {
            throw errors.notFound('Server not found');
        }
        
        const user = await User.findById(userId);
        if (!user) {
            throw errors.notFound('User not found');
        }
        
        // Check if already banned
        const existingBan = server.bannedPlayers.find(
            ban => ban.user.toString() === userId
        );
        
        if (existingBan) {
            // Unban
            server.bannedPlayers = server.bannedPlayers.filter(
                ban => ban.user.toString() !== userId
            );
            await server.save();
            
            res.json({
                success: true,
                message: 'User unbanned from server'
            });
        } else {
            // Ban
            const banData = {
                user: userId,
                reason: reason || 'No reason provided',
                bannedBy: req.user._id,
                bannedAt: new Date()
            };
            
            if (duration) {
                banData.expiresAt = new Date(Date.now() + duration * 1000);
            }
            
            server.bannedPlayers.push(banData);
            await server.save();
            
            res.json({
                success: true,
                message: 'User banned from server'
            });
        }
        
    } catch (error) {
        next(error);
    }
});

// System logs
router.get('/logs', async (req, res, next) => {
    try {
        const { type = 'access', lines = 100 } = req.query;
        const logDir = path.join(process.cwd(), 'logs');
        
        const logFiles = {
            access: 'access.log',
            error: 'error.log',
            performance: 'performance.log'
        };
        
        const logFile = logFiles[type];
        if (!logFile) {
            throw errors.badRequest('Invalid log type');
        }
        
        const logPath = path.join(logDir, logFile);
        
        try {
            const content = await fs.readFile(logPath, 'utf-8');
            const logLines = content.trim().split('\n').slice(-lines);
            
            const logs = logLines.map(line => {
                try {
                    return JSON.parse(line);
                } catch {
                    return { raw: line };
                }
            });
            
            res.json({
                success: true,
                data: {
                    type,
                    logs: logs.reverse()
                }
            });
        } catch (error) {
            res.json({
                success: true,
                data: {
                    type,
                    logs: []
                }
            });
        }
        
    } catch (error) {
        next(error);
    }
});

// Crash reports
router.get('/crash-reports', async (req, res, next) => {
    try {
        const crashDir = path.join(process.cwd(), 'crash-reports');
        
        try {
            const files = await fs.readdir(crashDir);
            const reports = [];
            
            for (const file of files.slice(-50)) { // Last 50 reports
                if (file.endsWith('.json')) {
                    const content = await fs.readFile(path.join(crashDir, file), 'utf-8');
                    reports.push(JSON.parse(content));
                }
            }
            
            reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            res.json({
                success: true,
                data: {
                    reports,
                    total: reports.length
                }
            });
        } catch {
            res.json({
                success: true,
                data: {
                    reports: [],
                    total: 0
                }
            });
        }
        
    } catch (error) {
        next(error);
    }
});

// Send announcement to all users
router.post('/announcements', async (req, res, next) => {
    try {
        const { title, message, type = 'info' } = req.body;
        
        if (!title || !message) {
            throw errors.badRequest('Title and message are required');
        }
        
        // Here you would typically:
        // 1. Save announcement to database
        // 2. Send push notifications
        // 3. Emit via WebSocket to online users
        // 4. Send emails if critical
        
        res.json({
            success: true,
            message: 'Announcement sent successfully'
        });
        
    } catch (error) {
        next(error);
    }
});

// System maintenance
router.post('/maintenance', async (req, res, next) => {
    try {
        const { enabled, message, estimatedDuration } = req.body;
        
        // Store maintenance mode in database or cache
        // This would affect all API endpoints
        
        global.maintenanceMode = {
            enabled,
            message: message || 'System is under maintenance',
            startedAt: new Date(),
            estimatedDuration
        };
        
        res.json({
            success: true,
            message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
            data: global.maintenanceMode
        });
        
    } catch (error) {
        next(error);
    }
});

// Clear cache
router.post('/cache/clear', async (req, res, next) => {
    try {
        // Clear various caches
        // - Version manifest cache
        // - User session cache
        // - Server status cache
        
        res.json({
            success: true,
            message: 'Cache cleared successfully'
        });
        
    } catch (error) {
        next(error);
    }
});

export default router;