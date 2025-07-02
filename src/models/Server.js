import mongoose from 'mongoose';

const serverSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Server name is required'],
        trim: true,
        maxlength: [50, 'Server name must be less than 50 characters']
    },
    
    address: {
        type: String,
        required: [true, 'Server address is required'],
        trim: true
    },
    
    port: {
        type: Number,
        default: 25565
    },
    
    description: {
        type: String,
        maxlength: [500, 'Description must be less than 500 characters']
    },
    
    icon: {
        type: String,
        default: null
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
    
    type: {
        type: String,
        enum: ['survival', 'creative', 'adventure', 'hardcore', 'skyblock', 'minigames', 'other'],
        default: 'survival'
    },
    
    // Server status (updated periodically)
    status: {
        online: {
            type: Boolean,
            default: false
        },
        players: {
            online: { type: Number, default: 0 },
            max: { type: Number, default: 20 }
        },
        motd: String,
        lastChecked: {
            type: Date,
            default: Date.now
        }
    },
    
    // Required mods
    requiredMods: [{
        id: String,
        name: String,
        version: String,
        downloadUrl: String,
        fileSize: Number,
        sha256: String
    }],
    
    // Resource packs
    resourcePacks: [{
        name: String,
        url: String,
        sha1: String,
        required: { type: Boolean, default: false }
    }],
    
    // Server settings
    settings: {
        whitelist: {
            type: Boolean,
            default: false
        },
        difficulty: {
            type: String,
            enum: ['peaceful', 'easy', 'normal', 'hard'],
            default: 'normal'
        },
        gamemode: {
            type: String,
            enum: ['survival', 'creative', 'adventure', 'spectator'],
            default: 'survival'
        },
        pvp: {
            type: Boolean,
            default: true
        },
        maxPlayers: {
            type: Number,
            default: 20
        }
    },
    
    // Server owner
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Moderators
    moderators: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    
    // Featured/promoted
    isFeatured: {
        type: Boolean,
        default: false
    },
    
    isOfficial: {
        type: Boolean,
        default: false
    },
    
    // Statistics
    stats: {
        totalPlayers: { type: Number, default: 0 },
        uniquePlayers: { type: Number, default: 0 },
        uptime: { type: Number, default: 0 }, // percentage
        averagePlayersOnline: { type: Number, default: 0 },
        peakPlayers: {
            count: { type: Number, default: 0 },
            date: Date
        }
    },
    
    // Voting
    votes: {
        total: { type: Number, default: 0 },
        monthly: { type: Number, default: 0 },
        voters: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            date: {
                type: Date,
                default: Date.now
            }
        }]
    },
    
    // Tags for searching
    tags: [{
        type: String,
        lowercase: true,
        trim: true
    }],
    
    // Auto-join configuration
    autoJoin: {
        enabled: { type: Boolean, default: false },
        serverListPing: { type: Boolean, default: true },
        forceResourcePack: { type: Boolean, default: false },
        kickMessage: String
    },
    
    // Custom launch arguments
    customLaunchArgs: {
        jvmArgs: String,
        gameArgs: String,
        minMemory: { type: String, default: '1G' },
        maxMemory: { type: String, default: '4G' }
    },
    
    // Connection info
    connectionInfo: {
        directConnect: { type: Boolean, default: true },
        proxyHost: String,
        proxyPort: Number,
        srvRecord: String
    },
    
    // Banned players
    bannedPlayers: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: String,
        bannedAt: { type: Date, default: Date.now },
        bannedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        expiresAt: Date
    }],
    
    // Server announcements
    announcements: [{
        title: String,
        content: String,
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        createdAt: { type: Date, default: Date.now },
        pinned: { type: Boolean, default: false }
    }],
    
    // Webhook integrations
    webhooks: {
        discord: {
            enabled: { type: Boolean, default: false },
            webhookUrl: String,
            events: {
                playerJoin: { type: Boolean, default: true },
                playerLeave: { type: Boolean, default: true },
                serverStart: { type: Boolean, default: true },
                serverStop: { type: Boolean, default: true }
            }
        }
    },
    
    // RCON access (encrypted)
    rcon: {
        enabled: { type: Boolean, default: false },
        host: String,
        port: { type: Number, default: 25575 },
        password: {
            type: String,
            select: false
        }
    }
    
}, {
    timestamps: true
});

// Indexes
serverSchema.index({ name: 'text', description: 'text', tags: 1 });
serverSchema.index({ 'status.online': 1, 'status.players.online': -1 });
serverSchema.index({ owner: 1 });
serverSchema.index({ isFeatured: 1, isOfficial: 1 });

// Virtual for full address
serverSchema.virtual('fullAddress').get(function() {
    return this.port === 25565 ? this.address : `${this.address}:${this.port}`;
});

// Virtual for player percentage
serverSchema.virtual('playerPercentage').get(function() {
    if (this.status.players.max === 0) return 0;
    return Math.round((this.status.players.online / this.status.players.max) * 100);
});

// Method to check if user is banned
serverSchema.methods.isUserBanned = function(userId) {
    return this.bannedPlayers.some(ban => 
        ban.user.toString() === userId.toString() &&
        (!ban.expiresAt || ban.expiresAt > new Date())
    );
};

// Method to add vote
serverSchema.methods.addVote = function(userId) {
    const today = new Date();
    const existingVote = this.votes.voters.find(v => 
        v.user.toString() === userId.toString() &&
        v.date.toDateString() === today.toDateString()
    );
    
    if (!existingVote) {
        this.votes.voters.push({ user: userId });
        this.votes.total += 1;
        this.votes.monthly += 1;
        return true;
    }
    return false;
};

// Static method to reset monthly votes
serverSchema.statics.resetMonthlyVotes = async function() {
    await this.updateMany({}, { 'votes.monthly': 0 });
};

// toJSON transformation
serverSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.rcon;
    delete obj.__v;
    return obj;
};

const Server = mongoose.model('Server', serverSchema);

export default Server;