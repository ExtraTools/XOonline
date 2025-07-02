import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, optionalAuthenticate, authorize } from '../middleware/auth.js';
import Server from '../models/Server.js';
import { errors } from '../middleware/errorHandler.js';
import { pingMinecraftServer } from '../utils/minecraftPing.js';

const router = express.Router();

// Validation rules
const serverValidation = [
    body('name')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Server name must be between 1 and 50 characters'),
    body('address')
        .trim()
        .notEmpty()
        .withMessage('Server address is required')
        .matches(/^[a-zA-Z0-9.-]+$/)
        .withMessage('Invalid server address format'),
    body('port')
        .optional()
        .isInt({ min: 1, max: 65535 })
        .withMessage('Port must be between 1 and 65535'),
    body('version')
        .trim()
        .notEmpty()
        .withMessage('Minecraft version is required'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must be less than 500 characters')
];

// Get all servers (with filtering and pagination)
router.get('/', optionalAuthenticate, async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            version,
            type,
            modLoader,
            onlineOnly,
            featured,
            sortBy = 'players'
        } = req.query;
        
        // Build query
        const query = {};
        
        if (search) {
            query.$text = { $search: search };
        }
        if (version) {
            query.version = version;
        }
        if (type) {
            query.type = type;
        }
        if (modLoader) {
            query.modLoader = modLoader;
        }
        if (onlineOnly === 'true') {
            query['status.online'] = true;
        }
        if (featured === 'true') {
            query.isFeatured = true;
        }
        
        // Build sort
        let sort = {};
        switch (sortBy) {
            case 'players':
                sort = { 'status.players.online': -1 };
                break;
            case 'votes':
                sort = { 'votes.total': -1 };
                break;
            case 'newest':
                sort = { createdAt: -1 };
                break;
            case 'name':
                sort = { name: 1 };
                break;
            default:
                sort = { 'status.players.online': -1 };
        }
        
        // Execute query with pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const [servers, total] = await Promise.all([
            Server.find(query)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .populate('owner', 'username avatar')
                .lean(),
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

// Get server by ID
router.get('/:serverId', optionalAuthenticate, async (req, res, next) => {
    try {
        const server = await Server.findById(req.params.serverId)
            .populate('owner', 'username avatar')
            .populate('moderators', 'username avatar')
            .populate('announcements.author', 'username avatar');
        
        if (!server) {
            throw errors.notFound('Server not found');
        }
        
        // Check if user is banned
        if (req.user && server.isUserBanned(req.user._id)) {
            throw errors.forbidden('You are banned from this server');
        }
        
        res.json({
            success: true,
            data: {
                server
            }
        });
        
    } catch (error) {
        next(error);
    }
});

// Create new server
router.post('/', authenticate, serverValidation, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        
        // Check server limit per user
        const userServerCount = await Server.countDocuments({ owner: req.user._id });
        const serverLimit = req.user.isPremium ? 10 : 3;
        
        if (userServerCount >= serverLimit) {
            throw errors.forbidden(`Server limit reached (${serverLimit} servers)`);
        }
        
        // Create server
        const serverData = {
            name: req.body.name,
            address: req.body.address,
            port: req.body.port || 25565,
            description: req.body.description,
            version: req.body.version,
            modLoader: req.body.modLoader || 'vanilla',
            modLoaderVersion: req.body.modLoaderVersion,
            type: req.body.type || 'survival',
            owner: req.user._id,
            tags: req.body.tags || [],
            settings: req.body.settings || {},
            requiredMods: req.body.requiredMods || [],
            customLaunchArgs: req.body.customLaunchArgs || {}
        };
        
        const server = new Server(serverData);
        
        // Ping server to get initial status
        try {
            const pingResult = await pingMinecraftServer(server.address, server.port);
            server.status = {
                online: true,
                players: pingResult.players,
                motd: pingResult.description,
                lastChecked: new Date()
            };
        } catch (error) {
            console.log('Failed to ping server:', error.message);
        }
        
        await server.save();
        
        res.status(201).json({
            success: true,
            message: 'Server created successfully',
            data: {
                server
            }
        });
        
    } catch (error) {
        next(error);
    }
});

// Update server
router.put('/:serverId', authenticate, serverValidation, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        
        const server = await Server.findById(req.params.serverId);
        
        if (!server) {
            throw errors.notFound('Server not found');
        }
        
        // Check ownership
        if (server.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            throw errors.forbidden('You do not have permission to edit this server');
        }
        
        // Update fields
        const updateFields = [
            'name', 'address', 'port', 'description', 'version',
            'modLoader', 'modLoaderVersion', 'type', 'tags',
            'settings', 'requiredMods', 'customLaunchArgs',
            'resourcePacks', 'autoJoin', 'connectionInfo'
        ];
        
        updateFields.forEach(field => {
            if (req.body[field] !== undefined) {
                server[field] = req.body[field];
            }
        });
        
        await server.save();
        
        res.json({
            success: true,
            message: 'Server updated successfully',
            data: {
                server
            }
        });
        
    } catch (error) {
        next(error);
    }
});

// Delete server
router.delete('/:serverId', authenticate, async (req, res, next) => {
    try {
        const server = await Server.findById(req.params.serverId);
        
        if (!server) {
            throw errors.notFound('Server not found');
        }
        
        // Check ownership
        if (server.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            throw errors.forbidden('You do not have permission to delete this server');
        }
        
        await server.deleteOne();
        
        res.json({
            success: true,
            message: 'Server deleted successfully'
        });
        
    } catch (error) {
        next(error);
    }
});

// Ping server
router.post('/:serverId/ping', async (req, res, next) => {
    try {
        const server = await Server.findById(req.params.serverId);
        
        if (!server) {
            throw errors.notFound('Server not found');
        }
        
        try {
            const pingResult = await pingMinecraftServer(server.address, server.port);
            
            // Update server status
            server.status = {
                online: true,
                players: pingResult.players,
                motd: pingResult.description,
                lastChecked: new Date()
            };
            
            // Update peak players if needed
            if (pingResult.players.online > (server.stats.peakPlayers.count || 0)) {
                server.stats.peakPlayers = {
                    count: pingResult.players.online,
                    date: new Date()
                };
            }
            
            await server.save();
            
            res.json({
                success: true,
                data: {
                    online: true,
                    players: pingResult.players,
                    motd: pingResult.description,
                    latency: pingResult.latency,
                    version: pingResult.version
                }
            });
            
        } catch (error) {
            // Server is offline
            server.status.online = false;
            server.status.lastChecked = new Date();
            await server.save();
            
            res.json({
                success: true,
                data: {
                    online: false,
                    error: error.message
                }
            });
        }
        
    } catch (error) {
        next(error);
    }
});

// Vote for server
router.post('/:serverId/vote', authenticate, async (req, res, next) => {
    try {
        const server = await Server.findById(req.params.serverId);
        
        if (!server) {
            throw errors.notFound('Server not found');
        }
        
        const voteAdded = server.addVote(req.user._id);
        
        if (!voteAdded) {
            throw errors.badRequest('You have already voted for this server today');
        }
        
        await server.save();
        
        res.json({
            success: true,
            message: 'Vote recorded successfully',
            data: {
                totalVotes: server.votes.total,
                monthlyVotes: server.votes.monthly
            }
        });
        
    } catch (error) {
        next(error);
    }
});

// Add server moderator
router.post('/:serverId/moderators', authenticate, async (req, res, next) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            throw errors.badRequest('User ID is required');
        }
        
        const server = await Server.findById(req.params.serverId);
        
        if (!server) {
            throw errors.notFound('Server not found');
        }
        
        // Check ownership
        if (server.owner.toString() !== req.user._id.toString()) {
            throw errors.forbidden('Only server owner can add moderators');
        }
        
        // Check if already moderator
        if (server.moderators.includes(userId)) {
            throw errors.badRequest('User is already a moderator');
        }
        
        server.moderators.push(userId);
        await server.save();
        
        res.json({
            success: true,
            message: 'Moderator added successfully'
        });
        
    } catch (error) {
        next(error);
    }
});

// Remove server moderator
router.delete('/:serverId/moderators/:userId', authenticate, async (req, res, next) => {
    try {
        const server = await Server.findById(req.params.serverId);
        
        if (!server) {
            throw errors.notFound('Server not found');
        }
        
        // Check ownership
        if (server.owner.toString() !== req.user._id.toString()) {
            throw errors.forbidden('Only server owner can remove moderators');
        }
        
        server.moderators = server.moderators.filter(
            mod => mod.toString() !== req.params.userId
        );
        
        await server.save();
        
        res.json({
            success: true,
            message: 'Moderator removed successfully'
        });
        
    } catch (error) {
        next(error);
    }
});

// Create server announcement
router.post('/:serverId/announcements', authenticate, async (req, res, next) => {
    try {
        const { title, content, pinned } = req.body;
        
        if (!title || !content) {
            throw errors.badRequest('Title and content are required');
        }
        
        const server = await Server.findById(req.params.serverId);
        
        if (!server) {
            throw errors.notFound('Server not found');
        }
        
        // Check permission (owner or moderator)
        const isOwner = server.owner.toString() === req.user._id.toString();
        const isModerator = server.moderators.includes(req.user._id);
        
        if (!isOwner && !isModerator) {
            throw errors.forbidden('You do not have permission to create announcements');
        }
        
        server.announcements.push({
            title,
            content,
            author: req.user._id,
            pinned: pinned || false
        });
        
        await server.save();
        
        res.json({
            success: true,
            message: 'Announcement created successfully',
            data: {
                announcement: server.announcements[server.announcements.length - 1]
            }
        });
        
    } catch (error) {
        next(error);
    }
});

// Get server connection details for launcher
router.get('/:serverId/connect', authenticate, async (req, res, next) => {
    try {
        const server = await Server.findById(req.params.serverId)
            .select('+rcon.password'); // Include RCON password if user has permission
        
        if (!server) {
            throw errors.notFound('Server not found');
        }
        
        // Check if user is banned
        if (server.isUserBanned(req.user._id)) {
            throw errors.forbidden('You are banned from this server');
        }
        
        // Build connection data
        const connectionData = {
            name: server.name,
            address: server.address,
            port: server.port,
            version: server.version,
            modLoader: server.modLoader,
            modLoaderVersion: server.modLoaderVersion,
            requiredMods: server.requiredMods,
            resourcePacks: server.resourcePacks,
            customLaunchArgs: server.customLaunchArgs,
            autoJoin: server.autoJoin,
            connectionInfo: server.connectionInfo
        };
        
        // Include RCON if user is owner or moderator
        const isOwner = server.owner.toString() === req.user._id.toString();
        const isModerator = server.moderators.includes(req.user._id);
        
        if ((isOwner || isModerator) && server.rcon.enabled) {
            connectionData.rcon = {
                host: server.rcon.host || server.address,
                port: server.rcon.port,
                password: server.rcon.password
            };
        }
        
        res.json({
            success: true,
            data: connectionData
        });
        
    } catch (error) {
        next(error);
    }
});

export default router;