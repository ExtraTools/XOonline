import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [20, 'Username must be less than 20 characters'],
        match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false
    },
    
    // Minecraft specific fields
    uuid: {
        type: String,
        unique: true,
        default: () => crypto.randomUUID()
    },
    skinUrl: {
        type: String,
        default: null
    },
    capeUrl: {
        type: String,
        default: null
    },
    accessToken: {
        type: String,
        select: false
    },
    clientToken: {
        type: String,
        select: false
    },
    
    // User profile
    avatar: {
        type: String,
        default: null
    },
    bio: {
        type: String,
        maxlength: [500, 'Bio must be less than 500 characters'],
        default: ''
    },
    
    // Launcher settings
    launcherSettings: {
        theme: {
            type: String,
            enum: ['dark', 'light', 'auto'],
            default: 'dark'
        },
        language: {
            type: String,
            enum: ['ru', 'en', 'uk'],
            default: 'ru'
        },
        javaPath: String,
        javaArgs: {
            type: String,
            default: '-Xmx2G -XX:+UnlockExperimentalVMOptions -XX:+UseG1GC'
        },
        gameDirectory: String,
        resolution: {
            width: { type: Number, default: 854 },
            height: { type: Number, default: 480 }
        },
        fullscreen: { type: Boolean, default: false },
        autoConnect: { type: Boolean, default: false },
        keepLauncherOpen: { type: Boolean, default: false }
    },
    
    // Game profiles
    profiles: [{
        name: {
            type: String,
            required: true
        },
        version: {
            type: String,
            required: true
        },
        modLoader: {
            type: String,
            enum: ['vanilla', 'forge', 'fabric', 'quilt', 'neoforge'],
            default: 'vanilla'
        },
        modLoaderVersion: String,
        javaArgs: String,
        gameDirectory: String,
        lastPlayed: Date,
        totalPlayTime: { type: Number, default: 0 },
        icon: String,
        mods: [{
            id: String,
            name: String,
            version: String,
            fileName: String,
            enabled: { type: Boolean, default: true }
        }],
        resourcePacks: [String],
        shaderPacks: [String],
        createdAt: { type: Date, default: Date.now }
    }],
    
    // Statistics
    stats: {
        totalPlayTime: { type: Number, default: 0 },
        sessionsCount: { type: Number, default: 0 },
        lastPlayed: Date,
        favoriteVersion: String,
        modsInstalled: { type: Number, default: 0 }
    },
    
    // Security
    refreshTokens: [{
        token: String,
        createdAt: { type: Date, default: Date.now },
        expiresAt: Date,
        userAgent: String,
        ip: String
    }],
    
    twoFactorSecret: {
        type: String,
        select: false
    },
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    
    passwordResetToken: String,
    passwordResetExpires: Date,
    
    // Account status
    role: {
        type: String,
        enum: ['user', 'premium', 'moderator', 'admin'],
        default: 'user'
    },
    
    isPremium: {
        type: Boolean,
        default: false
    },
    premiumExpires: Date,
    
    isBanned: {
        type: Boolean,
        default: false
    },
    banReason: String,
    banExpires: Date,
    
    // Activity tracking
    lastActive: {
        type: Date,
        default: Date.now
    },
    loginHistory: [{
        date: { type: Date, default: Date.now },
        ip: String,
        userAgent: String,
        success: Boolean
    }],
    
    // Social
    friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    friendRequests: [{
        from: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        createdAt: { type: Date, default: Date.now }
    }]
    
}, {
    timestamps: true
});

// Indexes
userSchema.index({ email: 1, username: 1 });
userSchema.index({ uuid: 1 });
userSchema.index({ 'refreshTokens.token': 1 });

// Virtual for profile count
userSchema.virtual('profileCount').get(function() {
    return this.profiles.length;
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    this.emailVerificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');
        
    this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    
    return verificationToken;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
        
    this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    
    return resetToken;
};

// Clean expired refresh tokens
userSchema.methods.cleanExpiredTokens = function() {
    this.refreshTokens = this.refreshTokens.filter(
        tokenObj => tokenObj.expiresAt > new Date()
    );
};

// Update last active
userSchema.methods.updateLastActive = function() {
    this.lastActive = new Date();
    return this.save();
};

// Add login history
userSchema.methods.addLoginHistory = function(ip, userAgent, success = true) {
    this.loginHistory.push({ ip, userAgent, success });
    if (this.loginHistory.length > 50) {
        this.loginHistory = this.loginHistory.slice(-50); // Keep last 50 entries
    }
};

// Get active profile
userSchema.methods.getActiveProfile = function() {
    return this.profiles.find(p => p.lastPlayed) || this.profiles[0];
};

// toJSON transformation
userSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.password;
    delete obj.refreshTokens;
    delete obj.twoFactorSecret;
    delete obj.emailVerificationToken;
    delete obj.passwordResetToken;
    delete obj.loginHistory;
    delete obj.__v;
    return obj;
};

const User = mongoose.model('User', userSchema);

export default User;