import express from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import User from '../models/User.js';
import Server from '../models/Server.js';
import { errors } from '../middleware/errorHandler.js';

const router = express.Router();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${req.user._id}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Get user profile by ID or username
router.get('/:identifier', optionalAuthenticate, async (req, res, next) => {
    try {
        const { identifier } = req.params;
        
        // Check if identifier is ObjectId or username
        let user;
        if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
            user = await User.findById(identifier);
        } else {
            user = await User.findOne({ username: identifier });
        }
        
        if (!user) {
            throw errors.notFound('User not found');
        }
        
        // Get user's public data
        const publicData = {
            id: user._id,
            username: user.username,
            avatar: user.avatar,
            bio: user.bio,
            role: user.role,
            isPremium: user.isPremium,
            createdAt: user.createdAt,
            lastActive: user.lastActive,
            stats: user.stats,
            profileCount: user.profiles.length
        };
        
        // If viewing own profile or admin, include more data
        if (req.user && (req.user._id.toString() === user._id.toString() || req.user.role === 'admin')) {
            publicData.email = user.email;
            publicData.emailVerified = user.emailVerified;
            publicData.profiles = user.profiles;
            publicData.launcherSettings = user.launcherSettings;
            publicData.friends = user.friends;
            publicData.friendRequests = user.friendRequests;
        }
        
        res.json({
            success: true,
            data: {
                user: publicData
            }
        });
        
    } catch (error) {
        next(error);
    }
});

// Update user profile
router.put('/profile', authenticate, [
    body('bio').optional().trim().isLength({ max: 500 }),
    body('launcherSettings').optional().isObject()
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        
        const user = await User.findById(req.user._id);
        
        // Update allowed fields
        if (req.body.bio !== undefined) {
            user.bio = req.body.bio;
        }
        
        if (req.body.launcherSettings) {
            Object.assign(user.launcherSettings, req.body.launcherSettings);
        }
        
        await user.save();
        
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user
            }
        });
        
    } catch (error) {
        next(error);
    }
});

// Upload avatar
router.post('/avatar', authenticate, upload.single('avatar'), async (req, res, next) => {
    try {
        if (!req.file) {
            throw errors.badRequest('No file uploaded');
        }
        
        const user = await User.findById(req.user._id);
        
        // Delete old avatar if exists
        if (user.avatar) {
            const oldAvatarPath = path.join(process.cwd(), user.avatar);
            try {
                await fs.unlink(oldAvatarPath);
            } catch (error) {
                console.log('Failed to delete old avatar:', error.message);
            }
        }
        
        // Update avatar path
        user.avatar = `/uploads/avatars/${req.file.filename}`;
        await user.save();
        
        res.json({
            success: true,
            message: 'Avatar uploaded successfully',
            data: {
                avatar: user.avatar
            }
        });
        
    } catch (error) {
        // Delete uploaded file on error
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (e) {}
        }
        next(error);
    }
});

// Get user's servers
router.get('/:userId/servers', async (req, res, next) => {
    try {
        const servers = await Server.find({ owner: req.params.userId })
            .select('name address port version type status players votes createdAt')
            .sort('-createdAt');
        
        res.json({
            success: true,
            data: {
                servers,
                count: servers.length
            }
        });
        
    } catch (error) {
        next(error);
    }
});

// Get user's friends
router.get('/:userId/friends', authenticate, async (req, res, next) => {
    try {
        // Only allow viewing own friends or admin
        if (req.user._id.toString() !== req.params.userId && req.user.role !== 'admin') {
            throw errors.forbidden('You can only view your own friends');
        }
        
        const user = await User.findById(req.params.userId)
            .populate('friends', 'username avatar bio lastActive');
        
        if (!user) {
            throw errors.notFound('User not found');
        }
        
        res.json({
            success: true,
            data: {
                friends: user.friends,
                count: user.friends.length
            }
        });
        
    } catch (error) {
        next(error);
    }
});

// Send friend request
router.post('/friends/request', authenticate, async (req, res, next) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            throw errors.badRequest('User ID is required');
        }
        
        if (userId === req.user._id.toString()) {
            throw errors.badRequest('You cannot send friend request to yourself');
        }
        
        const [user, targetUser] = await Promise.all([
            User.findById(req.user._id),
            User.findById(userId)
        ]);
        
        if (!targetUser) {
            throw errors.notFound('User not found');
        }
        
        // Check if already friends
        if (user.friends.includes(userId)) {
            throw errors.badRequest('You are already friends with this user');
        }
        
        // Check if request already sent
        const existingRequest = targetUser.friendRequests.find(
            req => req.from.toString() === user._id.toString()
        );
        
        if (existingRequest) {
            throw errors.badRequest('Friend request already sent');
        }
        
        // Add friend request
        targetUser.friendRequests.push({
            from: user._id,
            createdAt: new Date()
        });
        
        await targetUser.save();
        
        res.json({
            success: true,
            message: 'Friend request sent successfully'
        });
        
    } catch (error) {
        next(error);
    }
});

// Accept friend request
router.post('/friends/accept/:requestId', authenticate, async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        const request = user.friendRequests.id(req.params.requestId);
        
        if (!request) {
            throw errors.notFound('Friend request not found');
        }
        
        const friendUser = await User.findById(request.from);
        if (!friendUser) {
            throw errors.notFound('Friend user not found');
        }
        
        // Add each other as friends
        user.friends.push(friendUser._id);
        friendUser.friends.push(user._id);
        
        // Remove friend request
        user.friendRequests.pull(req.params.requestId);
        
        await Promise.all([user.save(), friendUser.save()]);
        
        res.json({
            success: true,
            message: 'Friend request accepted',
            data: {
                friend: {
                    id: friendUser._id,
                    username: friendUser.username,
                    avatar: friendUser.avatar
                }
            }
        });
        
    } catch (error) {
        next(error);
    }
});

// Reject friend request
router.delete('/friends/reject/:requestId', authenticate, async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        const request = user.friendRequests.id(req.params.requestId);
        
        if (!request) {
            throw errors.notFound('Friend request not found');
        }
        
        // Remove friend request
        user.friendRequests.pull(req.params.requestId);
        await user.save();
        
        res.json({
            success: true,
            message: 'Friend request rejected'
        });
        
    } catch (error) {
        next(error);
    }
});

// Remove friend
router.delete('/friends/:friendId', authenticate, async (req, res, next) => {
    try {
        const [user, friendUser] = await Promise.all([
            User.findById(req.user._id),
            User.findById(req.params.friendId)
        ]);
        
        if (!friendUser) {
            throw errors.notFound('Friend not found');
        }
        
        // Remove from both users' friend lists
        user.friends = user.friends.filter(
            id => id.toString() !== req.params.friendId
        );
        friendUser.friends = friendUser.friends.filter(
            id => id.toString() !== req.user._id.toString()
        );
        
        await Promise.all([user.save(), friendUser.save()]);
        
        res.json({
            success: true,
            message: 'Friend removed successfully'
        });
        
    } catch (error) {
        next(error);
    }
});

// Get user statistics
router.get('/:userId/stats', async (req, res, next) => {
    try {
        const user = await User.findById(req.params.userId)
            .select('stats profiles');
        
        if (!user) {
            throw errors.notFound('User not found');
        }
        
        // Calculate additional stats
        const profileStats = user.profiles.map(p => ({
            name: p.name,
            version: p.version,
            totalPlayTime: p.totalPlayTime,
            lastPlayed: p.lastPlayed,
            modsCount: p.mods.length
        }));
        
        const totalMods = user.profiles.reduce((sum, p) => sum + p.mods.length, 0);
        
        res.json({
            success: true,
            data: {
                globalStats: user.stats,
                profileStats,
                totalProfiles: user.profiles.length,
                totalMods,
                mostPlayedProfile: profileStats.sort((a, b) => b.totalPlayTime - a.totalPlayTime)[0]
            }
        });
        
    } catch (error) {
        next(error);
    }
});

// Search users
router.get('/search', async (req, res, next) => {
    try {
        const { q, limit = 20, page = 1 } = req.query;
        
        if (!q || q.length < 2) {
            throw errors.badRequest('Search query must be at least 2 characters');
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const users = await User.find({
            username: { $regex: q, $options: 'i' }
        })
        .select('username avatar bio role isPremium')
        .skip(skip)
        .limit(parseInt(limit));
        
        res.json({
            success: true,
            data: {
                users,
                query: q
            }
        });
        
    } catch (error) {
        next(error);
    }
});

export default router;