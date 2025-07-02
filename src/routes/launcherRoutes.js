import express from 'express';
import axios from 'axios';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { authenticate, authenticateMinecraft, optionalAuthenticate } from '../middleware/auth.js';
import { errors } from '../middleware/errorHandler.js';
import tokenService from '../services/tokenService.js';

const router = express.Router();

// Cache for version manifest
let versionManifestCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 3600000; // 1 hour

// Get Minecraft versions list
router.get('/versions', optionalAuthenticate, async (req, res, next) => {
    try {
        const now = Date.now();
        
        // Check cache
        if (versionManifestCache && (now - cacheTimestamp) < CACHE_DURATION) {
            return res.json({
                success: true,
                data: versionManifestCache,
                cached: true
            });
        }
        
        // Fetch from Mojang API
        const response = await axios.get(process.env.MINECRAFT_VERSIONS_API || 'https://launchermeta.mojang.com/mc/game/version_manifest.json');
        const manifest = response.data;
        
        // Process versions
        const versions = manifest.versions.map(v => ({
            id: v.id,
            type: v.type,
            url: v.url,
            time: v.time,
            releaseTime: v.releaseTime
        }));
        
        // Categorize versions
        const categorized = {
            release: versions.filter(v => v.type === 'release'),
            snapshot: versions.filter(v => v.type === 'snapshot'),
            beta: versions.filter(v => v.type === 'old_beta'),
            alpha: versions.filter(v => v.type === 'old_alpha')
        };
        
        // Update cache
        versionManifestCache = {
            latest: manifest.latest,
            versions: categorized,
            totalVersions: versions.length
        };
        cacheTimestamp = now;
        
        res.json({
            success: true,
            data: versionManifestCache,
            cached: false
        });
        
    } catch (error) {
        next(error);
    }
});

// Get specific version details
router.get('/versions/:versionId', optionalAuthenticate, async (req, res, next) => {
    try {
        const { versionId } = req.params;
        
        // First, get the version manifest
        const manifestResponse = await axios.get(process.env.MINECRAFT_VERSIONS_API || 'https://launchermeta.mojang.com/mc/game/version_manifest.json');
        const version = manifestResponse.data.versions.find(v => v.id === versionId);
        
        if (!version) {
            throw errors.notFound('Version not found');
        }
        
        // Get version details
        const detailsResponse = await axios.get(version.url);
        const details = detailsResponse.data;
        
        res.json({
            success: true,
            data: {
                id: details.id,
                type: details.type,
                time: details.time,
                releaseTime: details.releaseTime,
                mainClass: details.mainClass,
                minimumLauncherVersion: details.minimumLauncherVersion,
                assets: details.assets,
                assetIndex: details.assetIndex,
                downloads: details.downloads,
                libraries: details.libraries.map(lib => ({
                    name: lib.name,
                    downloads: lib.downloads,
                    rules: lib.rules
                })),
                javaVersion: details.javaVersion
            }
        });
        
    } catch (error) {
        next(error);
    }
});

// Get mod loaders (Forge, Fabric, etc.)
router.get('/modloaders/:version', async (req, res, next) => {
    try {
        const { version } = req.params;
        const modLoaders = [];
        
        // Get Forge versions
        try {
            const forgeResponse = await axios.get(`https://files.minecraftforge.net/net/minecraftforge/forge/index_${version}.html`);
            // Parse Forge versions from HTML (simplified)
            modLoaders.push({
                type: 'forge',
                versions: [] // Would parse from HTML
            });
        } catch (error) {
            console.log('Forge not available for this version');
        }
        
        // Get Fabric versions
        try {
            const fabricResponse = await axios.get(`https://meta.fabricmc.net/v2/versions/loader/${version}`);
            modLoaders.push({
                type: 'fabric',
                versions: fabricResponse.data.map(v => ({
                    version: v.loader.version,
                    stable: v.loader.stable
                }))
            });
        } catch (error) {
            console.log('Fabric not available for this version');
        }
        
        res.json({
            success: true,
            data: {
                minecraftVersion: version,
                modLoaders
            }
        });
        
    } catch (error) {
        next(error);
    }
});

// Generate download token for protected files
router.post('/download-token', authenticate, async (req, res, next) => {
    try {
        const { fileType, fileId } = req.body;
        
        if (!fileType || !fileId) {
            throw errors.badRequest('File type and ID are required');
        }
        
        // Generate download token
        const token = tokenService.generateDownloadToken(req.user._id, fileId);
        
        res.json({
            success: true,
            data: {
                token,
                expiresIn: 3600 // 1 hour
            }
        });
        
    } catch (error) {
        next(error);
    }
});

// Download launcher update
router.get('/download/update/:platform', async (req, res, next) => {
    try {
        const { platform } = req.params;
        const { token } = req.query;
        
        // Verify download token if provided
        if (token) {
            try {
                tokenService.verifyDownloadToken(token);
            } catch (error) {
                throw errors.unauthorized('Invalid download token');
            }
        }
        
        // Validate platform
        const validPlatforms = ['windows', 'macos', 'linux'];
        if (!validPlatforms.includes(platform)) {
            throw errors.badRequest('Invalid platform');
        }
        
        // Get latest launcher version
        const launcherDir = path.join(process.cwd(), 'launcher-builds');
        const filename = `DiLauncher-${platform}-latest${platform === 'windows' ? '.exe' : ''}`;
        const filepath = path.join(launcherDir, filename);
        
        // Check if file exists
        try {
            await fs.access(filepath);
        } catch {
            throw errors.notFound('Launcher update not available for this platform');
        }
        
        // Set headers
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // Stream file
        const fileStream = require('fs').createReadStream(filepath);
        fileStream.pipe(res);
        
    } catch (error) {
        next(error);
    }
});

// Get launcher changelog
router.get('/changelog', async (req, res, next) => {
    try {
        const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
        
        try {
            const changelog = await fs.readFile(changelogPath, 'utf-8');
            
            res.json({
                success: true,
                data: {
                    changelog,
                    lastUpdated: (await fs.stat(changelogPath)).mtime
                }
            });
        } catch {
            res.json({
                success: true,
                data: {
                    changelog: '# Changelog\n\nNo changelog available.',
                    lastUpdated: new Date()
                }
            });
        }
        
    } catch (error) {
        next(error);
    }
});

// Check for launcher updates
router.get('/check-update/:currentVersion', async (req, res, next) => {
    try {
        const { currentVersion } = req.params;
        const { platform } = req.query;
        
        // Get latest version info
        const latestVersion = '2.0.0'; // In production, read from package.json or database
        
        const updateAvailable = currentVersion !== latestVersion;
        
        res.json({
            success: true,
            data: {
                currentVersion,
                latestVersion,
                updateAvailable,
                updateRequired: false, // Can force updates for critical fixes
                downloadUrl: updateAvailable ? `/api/launcher/download/update/${platform}` : null,
                changelog: updateAvailable ? 'New features and bug fixes' : null
            }
        });
        
    } catch (error) {
        next(error);
    }
});

// Get Java runtime information
router.get('/java-runtime/:minecraftVersion', async (req, res, next) => {
    try {
        const { minecraftVersion } = req.params;
        const { platform } = req.query;
        
        // Determine required Java version based on Minecraft version
        let javaVersion = 8;
        
        // Minecraft 1.17+ requires Java 16
        // Minecraft 1.18+ requires Java 17
        const versionParts = minecraftVersion.split('.');
        const majorVersion = parseInt(versionParts[1]);
        
        if (majorVersion >= 18) {
            javaVersion = 17;
        } else if (majorVersion >= 17) {
            javaVersion = 16;
        }
        
        res.json({
            success: true,
            data: {
                minecraftVersion,
                requiredJavaVersion: javaVersion,
                downloadUrls: {
                    windows: `https://adoptium.net/download/java${javaVersion}/windows`,
                    macos: `https://adoptium.net/download/java${javaVersion}/macos`,
                    linux: `https://adoptium.net/download/java${javaVersion}/linux`
                }
            }
        });
        
    } catch (error) {
        next(error);
    }
});

// Get mod information from CurseForge/Modrinth
router.get('/mods/search', authenticate, async (req, res, next) => {
    try {
        const { query, gameVersion, modLoader, source = 'modrinth' } = req.query;
        
        if (!query) {
            throw errors.badRequest('Search query is required');
        }
        
        let results = [];
        
        if (source === 'modrinth') {
            // Search Modrinth
            const params = new URLSearchParams({
                query,
                facets: JSON.stringify([
                    gameVersion && [`versions:${gameVersion}`],
                    modLoader && [`categories:${modLoader}`]
                ].filter(Boolean))
            });
            
            const response = await axios.get(`https://api.modrinth.com/v2/search?${params}`);
            
            results = response.data.hits.map(mod => ({
                id: mod.project_id,
                name: mod.title,
                description: mod.description,
                author: mod.author,
                downloads: mod.downloads,
                iconUrl: mod.icon_url,
                categories: mod.categories,
                source: 'modrinth'
            }));
        }
        
        res.json({
            success: true,
            data: {
                query,
                results,
                totalResults: results.length
            }
        });
        
    } catch (error) {
        next(error);
    }
});

// Get mod details
router.get('/mods/:source/:modId', authenticate, async (req, res, next) => {
    try {
        const { source, modId } = req.params;
        
        if (source === 'modrinth') {
            const response = await axios.get(`https://api.modrinth.com/v2/project/${modId}`);
            const mod = response.data;
            
            // Get versions
            const versionsResponse = await axios.get(`https://api.modrinth.com/v2/project/${modId}/version`);
            
            res.json({
                success: true,
                data: {
                    id: mod.id,
                    name: mod.title,
                    description: mod.description,
                    body: mod.body,
                    author: mod.team,
                    downloads: mod.downloads,
                    iconUrl: mod.icon_url,
                    categories: mod.categories,
                    versions: versionsResponse.data.map(v => ({
                        id: v.id,
                        name: v.name,
                        versionNumber: v.version_number,
                        gameVersions: v.game_versions,
                        loaders: v.loaders,
                        files: v.files
                    })),
                    source: 'modrinth'
                }
            });
        } else {
            throw errors.badRequest('Invalid mod source');
        }
        
    } catch (error) {
        next(error);
    }
});

// Report launcher crash
router.post('/crash-report', authenticateMinecraft, async (req, res, next) => {
    try {
        const { crashLog, version, profile, systemInfo } = req.body;
        
        // Save crash report
        const crashId = crypto.randomBytes(16).toString('hex');
        const crashDir = path.join(process.cwd(), 'crash-reports');
        await fs.mkdir(crashDir, { recursive: true });
        
        const crashData = {
            id: crashId,
            userId: req.user._id,
            username: req.user.username,
            timestamp: new Date(),
            launcherVersion: version,
            profile: profile,
            systemInfo: systemInfo,
            crashLog: crashLog
        };
        
        await fs.writeFile(
            path.join(crashDir, `crash-${crashId}.json`),
            JSON.stringify(crashData, null, 2)
        );
        
        res.json({
            success: true,
            data: {
                crashId,
                message: 'Crash report submitted successfully'
            }
        });
        
    } catch (error) {
        next(error);
    }
});

export default router;