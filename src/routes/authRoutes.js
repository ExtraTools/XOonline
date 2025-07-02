import express from 'express';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import User from '../models/User.js';
import tokenService from '../services/tokenService.js';
import { authenticate, loginRateLimit } from '../middleware/auth.js';

const router = express.Router();

// Validation rules
const registerValidation = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 20 })
        .withMessage('Username must be between 3 and 20 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers and underscores'),
    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

const loginValidation = [
    body('login')
        .trim()
        .notEmpty()
        .withMessage('Email or username is required'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

// Helper function to handle validation errors
const handleValidationErrors = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({
                field: err.param,
                message: err.msg
            }))
        });
    }
    return null;
};

// Register new user
router.post('/register', registerValidation, async (req, res) => {
    try {
        // Check validation errors
        const validationError = handleValidationErrors(req, res);
        if (validationError) return validationError;

        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: existingUser.email === email 
                    ? 'Email already registered' 
                    : 'Username already taken'
            });
        }

        // Create new user
        const user = new User({
            username,
            email,
            password
        });

        // Generate email verification token
        const verificationToken = user.generateEmailVerificationToken();
        await user.save();

        // Generate tokens
        const tokens = tokenService.generateTokenPair(user);
        
        // Save refresh token
        user.refreshTokens.push({
            token: tokens.refreshToken,
            expiresAt: tokens.refreshExpiresAt,
            userAgent: req.headers['user-agent'],
            ip: req.ip
        });
        
        // Clean old tokens
        user.cleanExpiredTokens();
        await user.save();

        // Send verification email (implement email service later)
        // await emailService.sendVerificationEmail(user.email, verificationToken);

        res.status(201).json({
            success: true,
            message: 'Registration successful. Please check your email to verify your account.',
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    uuid: user.uuid,
                    role: user.role,
                    emailVerified: user.emailVerified
                },
                tokens: {
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    tokenType: tokens.tokenType,
                    expiresIn: tokens.expiresIn
                }
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed. Please try again.'
        });
    }
});

// Login
router.post('/login', loginValidation, loginRateLimit, async (req, res) => {
    try {
        // Check validation errors
        const validationError = handleValidationErrors(req, res);
        if (validationError) return validationError;

        const { login, password } = req.body;

        // Find user by email or username
        const user = await User.findOne({
            $or: [{ email: login }, { username: login }]
        }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            // Log failed login attempt
            user.addLoginHistory(req.ip, req.headers['user-agent'], false);
            await user.save();
            
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Check if user is banned
        if (user.isBanned && (!user.banExpires || user.banExpires > new Date())) {
            return res.status(403).json({
                success: false,
                error: 'Account is banned',
                reason: user.banReason,
                expiresAt: user.banExpires
            });
        }

        // Generate tokens
        const tokens = tokenService.generateTokenPair(user);
        
        // Save refresh token
        user.refreshTokens.push({
            token: tokens.refreshToken,
            expiresAt: tokens.refreshExpiresAt,
            userAgent: req.headers['user-agent'],
            ip: req.ip
        });
        
        // Clean old tokens and update login history
        user.cleanExpiredTokens();
        user.addLoginHistory(req.ip, req.headers['user-agent'], true);
        user.lastActive = new Date();
        await user.save();

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    uuid: user.uuid,
                    role: user.role,
                    emailVerified: user.emailVerified,
                    isPremium: user.isPremium,
                    avatar: user.avatar,
                    stats: user.stats
                },
                tokens: {
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    tokenType: tokens.tokenType,
                    expiresIn: tokens.expiresIn
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed. Please try again.'
        });
    }
});

// Refresh token
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                error: 'Refresh token is required'
            });
        }

        // Find user with this refresh token
        const user = await User.findOne({
            'refreshTokens.token': refreshToken,
            'refreshTokens.expiresAt': { $gt: new Date() }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired refresh token'
            });
        }

        // Generate new token pair
        const tokens = tokenService.generateTokenPair(user);
        
        // Remove old refresh token and add new one
        user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
        user.refreshTokens.push({
            token: tokens.refreshToken,
            expiresAt: tokens.refreshExpiresAt,
            userAgent: req.headers['user-agent'],
            ip: req.ip
        });
        
        // Clean expired tokens
        user.cleanExpiredTokens();
        await user.save();

        res.json({
            success: true,
            data: {
                tokens: {
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    tokenType: tokens.tokenType,
                    expiresIn: tokens.expiresIn
                }
            }
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to refresh token'
        });
    }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const user = req.user;

        // Remove refresh token if provided
        if (refreshToken) {
            user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
        } else {
            // Remove all refresh tokens for this user agent
            user.refreshTokens = user.refreshTokens.filter(
                t => t.userAgent !== req.headers['user-agent']
            );
        }

        await user.save();

        res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Logout failed'
        });
    }
});

// Logout from all devices
router.post('/logout-all', authenticate, async (req, res) => {
    try {
        const user = req.user;
        user.refreshTokens = [];
        await user.save();

        res.json({
            success: true,
            message: 'Logged out from all devices successfully'
        });

    } catch (error) {
        console.error('Logout all error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to logout from all devices'
        });
    }
});

// Verify email
router.post('/verify-email/:token', async (req, res) => {
    try {
        const hashedToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const user = await User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired verification token'
            });
        }

        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        res.json({
            success: true,
            message: 'Email verified successfully'
        });

    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Email verification failed'
        });
    }
});

// Request password reset
router.post('/forgot-password', [
    body('email').isEmail().normalizeEmail()
], async (req, res) => {
    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return validationError;

        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            // Don't reveal if user exists
            return res.json({
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent.'
            });
        }

        // Generate reset token
        const resetToken = user.generatePasswordResetToken();
        await user.save();

        // Send reset email (implement email service later)
        // await emailService.sendPasswordResetEmail(user.email, resetToken);

        res.json({
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent.'
        });

    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process password reset request'
        });
    }
});

// Reset password
router.post('/reset-password/:token', [
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
], async (req, res) => {
    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return validationError;

        const hashedToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired reset token'
            });
        }

        // Update password
        user.password = req.body.password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        
        // Logout from all devices
        user.refreshTokens = [];
        
        await user.save();

        res.json({
            success: true,
            message: 'Password reset successfully. Please login with your new password.'
        });

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset password'
        });
    }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
    res.json({
        success: true,
        data: {
            user: req.user
        }
    });
});

// Update password (for logged in users)
router.put('/change-password', authenticate, [
    body('currentPassword').notEmpty(),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
], async (req, res) => {
    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return validationError;

        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id).select('+password');

        // Verify current password
        const isPasswordValid = await user.comparePassword(currentPassword);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to change password'
        });
    }
});

export default router;