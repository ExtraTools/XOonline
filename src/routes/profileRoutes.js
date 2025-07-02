import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, checkProfileOwnership } from '../middleware/auth.js';
import User from '../models/User.js';
import tokenService from '../services/tokenService.js';

const router = express.Router();

// Validation rules
const profileValidation = [
    body('name')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Profile name must be between 1 and 50 characters'),
    body('version')
        .trim()
        .notEmpty()
        .withMessage('Minecraft version is required'),
    body('modLoader')
        .optional()
        .isIn(['vanilla', 'forge', 'fabric', 'quilt', 'neoforge'])
        .withMessage('Invalid mod loader'),
    body('javaArgs')
        .optional()
        .isString()
        .withMessage('Java arguments must be a string'),
    body('gameDirectory')
        .optional()
        .isString()
        .withMessage('Game directory must be a string')
];

// Get all profiles for current user
router.get('/', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        res.json({
            success: true,
            data: {
                profiles: user.profiles,
                count: user.profiles.length
            }
        });
        
    } catch (error) {
        console.error('Get profiles error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profiles'
        });
    }
});

// Get specific profile
router.get('/:profileId', authenticate, checkProfileOwnership, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const profile = user.profiles.id(req.params.profileId);
        
        if (!profile) {
            return res.status(404).json({
                success: false,
                error: 'Profile not found'
            });
        }
        
        res.json({
            success: true,
            data: {
                profile
            }
        });
        
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile'
        });
    }
});

// Create new profile
router.post('/', authenticate, profileValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        
        const user = await User.findById(req.user._id);
        
        // Check profile limit (e.g., 10 profiles per user)
        if (user.profiles.length >= 10) {
            return res.status(400).json({
                success: false,
                error: 'Profile limit reached (maximum 10 profiles)'
            });
        }
        
        // Check for duplicate name
        const existingProfile = user.profiles.find(p => p.name === req.body.name);
        if (existingProfile) {
            return res.status(400).json({
                success: false,
                error: 'Profile with this name already exists'
            });
        }
        
        // Create profile
        const profileData = {
            name: req.body.name,
            version: req.body.version,
            modLoader: req.body.modLoader || 'vanilla',
            modLoaderVersion: req.body.modLoaderVersion,
            javaArgs: req.body.javaArgs || user.launcherSettings.javaArgs,
            gameDirectory: req.body.gameDirectory,
            icon: req.body.icon,
            mods: [],
            resourcePacks: [],
            shaderPacks: []
        };
        
        user.profiles.push(profileData);
        await user.save();
        
        const newProfile = user.profiles[user.profiles.length - 1];
        
        res.status(201).json({
            success: true,
            message: 'Profile created successfully',
            data: {
                profile: newProfile
            }
        });
        
    } catch (error) {
        console.error('Create profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create profile'
        });
    }
});

// Update profile
router.put('/:profileId', authenticate, checkProfileOwnership, profileValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        
        const user = await User.findById(req.user._id);
        const profile = user.profiles.id(req.params.profileId);
        
        if (!profile) {
            return res.status(404).json({
                success: false,
                error: 'Profile not found'
            });
        }
        
        // Check for duplicate name (excluding current profile)
        const duplicateName = user.profiles.find(p => 
            p.name === req.body.name && p._id.toString() !== req.params.profileId
        );
        if (duplicateName) {
            return res.status(400).json({
                success: false,
                error: 'Profile with this name already exists'
            });
        }
        
        // Update profile fields
        profile.name = req.body.name;
        profile.version = req.body.version;
        profile.modLoader = req.body.modLoader || profile.modLoader;
        profile.modLoaderVersion = req.body.modLoaderVersion || profile.modLoaderVersion;
        profile.javaArgs = req.body.javaArgs || profile.javaArgs;
        profile.gameDirectory = req.body.gameDirectory || profile.gameDirectory;
        profile.icon = req.body.icon || profile.icon;
        
        await user.save();
        
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                profile
            }
        });
        
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile'
        });
    }
});

// Delete profile
router.delete('/:profileId', authenticate, checkProfileOwnership, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        // Ensure user has at least one profile
        if (user.profiles.length <= 1) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete the last profile'
            });
        }
        
        user.profiles.pull(req.params.profileId);
        await user.save();
        
        res.json({
            success: true,
            message: 'Profile deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete profile'
        });
    }
});

// Launch profile (generate session token)
router.post('/:profileId/launch', authenticate, checkProfileOwnership, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const profile = user.profiles.id(req.params.profileId);
        
        if (!profile) {
            return res.status(404).json({
                success: false,
                error: 'Profile not found'
            });
        }
        
        // Update last played
        profile.lastPlayed = new Date();
        user.stats.lastPlayed = new Date();
        user.stats.sessionsCount += 1;
        
        await user.save();
        
        // Generate Minecraft session token
        const sessionToken = tokenService.generateMinecraftToken(user, profile);
        
        res.json({
            success: true,
            message: 'Launch session created',
            data: {
                sessionToken,
                profile: {
                    id: profile._id,
                    name: profile.name,
                    version: profile.version,
                    modLoader: profile.modLoader,
                    modLoaderVersion: profile.modLoaderVersion,
                    javaArgs: profile.javaArgs,
                    gameDirectory: profile.gameDirectory
                },
                user: {
                    uuid: user.uuid,
                    username: user.username,
                    accessToken: user.accessToken || 'offline',
                    skinUrl: user.skinUrl,
                    capeUrl: user.capeUrl
                },
                settings: user.launcherSettings
            }
        });
        
    } catch (error) {
        console.error('Launch profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to launch profile'
        });
    }
});

// Update playtime for profile
router.post('/:profileId/playtime', authenticate, checkProfileOwnership, async (req, res) => {
    try {
        const { playtime } = req.body; // playtime in seconds
        
        if (typeof playtime !== 'number' || playtime < 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid playtime value'
            });
        }
        
        const user = await User.findById(req.user._id);
        const profile = user.profiles.id(req.params.profileId);
        
        if (!profile) {
            return res.status(404).json({
                success: false,
                error: 'Profile not found'
            });
        }
        
        // Update playtime
        profile.totalPlayTime += playtime;
        user.stats.totalPlayTime += playtime;
        
        await user.save();
        
        res.json({
            success: true,
            message: 'Playtime updated',
            data: {
                profilePlaytime: profile.totalPlayTime,
                totalPlaytime: user.stats.totalPlayTime
            }
        });
        
    } catch (error) {
        console.error('Update playtime error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update playtime'
        });
    }
});

// Manage mods for profile
router.post('/:profileId/mods', authenticate, checkProfileOwnership, [
    body('mods').isArray().withMessage('Mods must be an array'),
    body('mods.*.id').notEmpty().withMessage('Mod ID is required'),
    body('mods.*.name').notEmpty().withMessage('Mod name is required'),
    body('mods.*.version').notEmpty().withMessage('Mod version is required'),
    body('mods.*.fileName').notEmpty().withMessage('Mod file name is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        
        const user = await User.findById(req.user._id);
        const profile = user.profiles.id(req.params.profileId);
        
        if (!profile) {
            return res.status(404).json({
                success: false,
                error: 'Profile not found'
            });
        }
        
        // Update mods list
        profile.mods = req.body.mods.map(mod => ({
            id: mod.id,
            name: mod.name,
            version: mod.version,
            fileName: mod.fileName,
            enabled: mod.enabled !== false // default to true
        }));
        
        // Update mod count in stats
        user.stats.modsInstalled = profile.mods.length;
        
        await user.save();
        
        res.json({
            success: true,
            message: 'Mods updated successfully',
            data: {
                mods: profile.mods
            }
        });
        
    } catch (error) {
        console.error('Update mods error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update mods'
        });
    }
});

// Toggle mod enabled/disabled
router.patch('/:profileId/mods/:modId/toggle', authenticate, checkProfileOwnership, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const profile = user.profiles.id(req.params.profileId);
        
        if (!profile) {
            return res.status(404).json({
                success: false,
                error: 'Profile not found'
            });
        }
        
        const mod = profile.mods.find(m => m.id === req.params.modId);
        if (!mod) {
            return res.status(404).json({
                success: false,
                error: 'Mod not found'
            });
        }
        
        mod.enabled = !mod.enabled;
        await user.save();
        
        res.json({
            success: true,
            message: `Mod ${mod.enabled ? 'enabled' : 'disabled'}`,
            data: {
                mod
            }
        });
        
    } catch (error) {
        console.error('Toggle mod error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to toggle mod'
        });
    }
});

// Clone profile
router.post('/:profileId/clone', authenticate, checkProfileOwnership, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const sourceProfile = user.profiles.id(req.params.profileId);
        
        if (!sourceProfile) {
            return res.status(404).json({
                success: false,
                error: 'Profile not found'
            });
        }
        
        // Check profile limit
        if (user.profiles.length >= 10) {
            return res.status(400).json({
                success: false,
                error: 'Profile limit reached (maximum 10 profiles)'
            });
        }
        
        // Create clone
        const cloneName = req.body.name || `${sourceProfile.name} (Copy)`;
        const clonedProfile = {
            name: cloneName,
            version: sourceProfile.version,
            modLoader: sourceProfile.modLoader,
            modLoaderVersion: sourceProfile.modLoaderVersion,
            javaArgs: sourceProfile.javaArgs,
            gameDirectory: sourceProfile.gameDirectory,
            icon: sourceProfile.icon,
            mods: [...sourceProfile.mods],
            resourcePacks: [...sourceProfile.resourcePacks],
            shaderPacks: [...sourceProfile.shaderPacks]
        };
        
        user.profiles.push(clonedProfile);
        await user.save();
        
        const newProfile = user.profiles[user.profiles.length - 1];
        
        res.status(201).json({
            success: true,
            message: 'Profile cloned successfully',
            data: {
                profile: newProfile
            }
        });
        
    } catch (error) {
        console.error('Clone profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clone profile'
        });
    }
});

export default router;