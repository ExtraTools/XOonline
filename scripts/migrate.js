import sqlite3 from 'sqlite3';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Import models
import User from '../src/models/User.js';
import connectDB from '../src/config/database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Old SQLite database path
const oldDbPath = path.join(__dirname, '../server/database/dinosgames.db');

console.log('🚀 Starting migration from SQLite to MongoDB...');

async function migrate() {
    try {
        // Connect to MongoDB
        await connectDB();
        console.log('✅ Connected to MongoDB');
        
        // Connect to SQLite
        const sqliteDb = new sqlite3.Database(oldDbPath, (err) => {
            if (err) {
                console.error('❌ Error opening SQLite database:', err);
                process.exit(1);
            }
        });
        
        console.log('✅ Connected to SQLite database');
        
        // Migrate users
        await migrateUsers(sqliteDb);
        
        // Close connections
        sqliteDb.close();
        await mongoose.connection.close();
        
        console.log('✅ Migration completed successfully!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

async function migrateUsers(db) {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM users', async (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            
            console.log(`📊 Found ${rows.length} users to migrate`);
            
            let migrated = 0;
            let failed = 0;
            
            for (const row of rows) {
                try {
                    // Check if user already exists
                    const existing = await User.findOne({
                        $or: [
                            { email: row.email },
                            { username: row.username }
                        ]
                    });
                    
                    if (existing) {
                        console.log(`⏭️  Skipping existing user: ${row.username}`);
                        continue;
                    }
                    
                    // Create user data
                    const userData = {
                        username: row.username,
                        email: row.email,
                        password: row.password_hash,
                        avatar: row.avatar_url,
                        createdAt: new Date(row.created_at),
                        lastActive: row.last_login ? new Date(row.last_login) : new Date(row.created_at),
                        emailVerified: true, // Assume old users are verified
                        
                        // Convert old game stats
                        stats: {
                            totalPlayTime: 0,
                            sessionsCount: row.total_games || 0,
                            lastPlayed: row.last_login ? new Date(row.last_login) : null,
                            favoriteVersion: '1.20.4',
                            modsInstalled: 0
                        },
                        
                        // Create default profile
                        profiles: [{
                            name: 'Default',
                            version: '1.20.4',
                            modLoader: 'vanilla',
                            javaArgs: '-Xmx2G -XX:+UnlockExperimentalVMOptions -XX:+UseG1GC',
                            createdAt: new Date()
                        }],
                        
                        // Set role based on old data
                        role: row.status === 'admin' ? 'admin' : 'user'
                    };
                    
                    // Create new user
                    const user = new User(userData);
                    
                    // If password is not hashed (plain text), hash it
                    if (row.password_hash && !row.password_hash.startsWith('$2')) {
                        user.password = await bcrypt.hash(row.password_hash, 12);
                    } else {
                        user.password = row.password_hash;
                    }
                    
                    await user.save();
                    
                    console.log(`✅ Migrated user: ${user.username}`);
                    migrated++;
                    
                } catch (error) {
                    console.error(`❌ Failed to migrate user ${row.username}:`, error.message);
                    failed++;
                }
            }
            
            console.log(`\n📊 Migration summary:`);
            console.log(`   ✅ Successfully migrated: ${migrated}`);
            console.log(`   ❌ Failed: ${failed}`);
            console.log(`   ⏭️  Skipped: ${rows.length - migrated - failed}`);
            
            resolve();
        });
    });
}

// Run migration
migrate();