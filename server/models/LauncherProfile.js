import { query, run } from '../database/database.js';

export class LauncherProfile {
    constructor(profileData) {
        Object.assign(this, profileData);
        
        // Парсим JSON поля если они строки
        if (typeof this.settings === 'string') {
            this.settings = JSON.parse(this.settings);
        }
    }

    // Создание нового профиля
    static async create(userId, profileData) {
        const {
            name,
            description = '',
            minecraftVersion,
            modLoader = 'vanilla',
            modLoaderVersion = null,
            javaVersion = 'java17',
            memoryAllocation = 4096,
            jvmArgs = [],
            iconUrl = null,
            settings = {}
        } = profileData;

        // Настройки по умолчанию
        const defaultSettings = {
            memory: memoryAllocation,
            jvmArgs: Array.isArray(jvmArgs) ? jvmArgs : ['-XX:+UseG1GC', '-XX:+UnlockExperimentalVMOptions'],
            windowSize: { width: 854, height: 480 },
            fullscreen: false,
            autoConnect: false,
            showAdvancedTooltips: true,
            enableVsync: true,
            renderDistance: 12,
            maxFramerate: 120,
            enableShaders: false,
            resourcePacks: [],
            dataPacks: [],
            worldGenSettings: {
                generateStructures: true,
                allowCheats: false,
                worldType: 'minecraft:normal'
            },
            ...settings
        };

        try {
            const result = await run(
                `INSERT INTO launcher_profiles 
                (user_id, name, description, minecraft_version, mod_loader, mod_loader_version, 
                 java_version, memory_allocation, jvm_args, icon_url, settings)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
                [
                    userId,
                    name,
                    description,
                    minecraftVersion,
                    modLoader,
                    modLoaderVersion,
                    javaVersion,
                    memoryAllocation,
                    JSON.stringify(jvmArgs),
                    iconUrl,
                    JSON.stringify(defaultSettings)
                ]
            );

            const profile = new LauncherProfile(result.rows ? result.rows[0] : { id: result.lastID, ...profileData });
            return profile;
        } catch (error) {
            throw new Error(`Ошибка создания профиля: ${error.message}`);
        }
    }

    // Поиск профиля по ID
    static async findById(id) {
        const result = await query(
            'SELECT * FROM launcher_profiles WHERE id = $1',
            [id]
        );

        if (result.rows && result.rows.length > 0) {
            return new LauncherProfile(result.rows[0]);
        }
        return null;
    }

    // Получение всех профилей пользователя
    static async findByUserId(userId) {
        const result = await query(
            `SELECT * FROM launcher_profiles 
             WHERE user_id = $1 AND is_active = true 
             ORDER BY last_played_at DESC NULLS LAST, created_at DESC`,
            [userId]
        );

        return (result.rows || []).map(profile => new LauncherProfile(profile));
    }

    // Обновление профиля
    async update(updateData) {
        const allowedFields = [
            'name', 'description', 'minecraft_version', 'mod_loader', 
            'mod_loader_version', 'java_version', 'memory_allocation', 
            'jvm_args', 'icon_url', 'settings'
        ];

        const updates = [];
        const values = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key) && value !== undefined) {
                updates.push(`${key} = $${paramIndex}`);
                
                if (key === 'settings' || key === 'jvm_args') {
                    values.push(typeof value === 'string' ? value : JSON.stringify(value));
                } else {
                    values.push(value);
                }
                paramIndex++;
            }
        }

        if (updates.length === 0) {
            throw new Error('Нет данных для обновления');
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(this.id);

        const sql = `UPDATE launcher_profiles SET ${updates.join(', ')} WHERE id = $${paramIndex}`;

        await run(sql, values);

        // Обновляем локальные данные
        Object.assign(this, updateData);
        this.updated_at = new Date();
    }

    // Установка времени последней игры
    async updateLastPlayed() {
        await run(
            'UPDATE launcher_profiles SET last_played_at = CURRENT_TIMESTAMP WHERE id = $1',
            [this.id]
        );
        this.last_played_at = new Date();
    }

    // Добавление времени игры
    async addPlaytime(minutes) {
        const newPlaytime = (this.playtime || 0) + minutes;
        await run(
            'UPDATE launcher_profiles SET playtime = $1, last_played_at = CURRENT_TIMESTAMP WHERE id = $2',
            [newPlaytime, this.id]
        );
        this.playtime = newPlaytime;
        this.last_played_at = new Date();
    }

    // Удаление профиля (мягкое удаление)
    async delete() {
        await run(
            'UPDATE launcher_profiles SET is_active = false WHERE id = $1',
            [this.id]
        );
        this.is_active = false;
    }

    // Получение установленных модов
    async getMods() {
        const result = await query(
            `SELECT * FROM installed_mods 
             WHERE profile_id = $1 
             ORDER BY mod_name ASC`,
            [this.id]
        );

        return (result.rows || []).map(mod => ({
            ...mod,
            dependencies: typeof mod.dependencies === 'string' ? 
                JSON.parse(mod.dependencies) : mod.dependencies
        }));
    }

    // Добавление мода
    async addMod(modData) {
        const {
            modId,
            modName,
            modVersion,
            modSource = 'manual',
            fileName,
            fileSize = 0,
            downloadUrl = null,
            dependencies = []
        } = modData;

        // Проверяем, не установлен ли уже мод
        const existing = await query(
            'SELECT id FROM installed_mods WHERE profile_id = $1 AND mod_id = $2',
            [this.id, modId]
        );

        if (existing.rows && existing.rows.length > 0) {
            throw new Error(`Мод ${modName} уже установлен в этом профиле`);
        }

        const result = await run(
            `INSERT INTO installed_mods 
            (profile_id, mod_id, mod_name, mod_version, mod_source, 
             file_name, file_size, download_url, dependencies)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [
                this.id,
                modId,
                modName,
                modVersion,
                modSource,
                fileName,
                fileSize,
                downloadUrl,
                JSON.stringify(dependencies)
            ]
        );

        return result.rows ? result.rows[0] : { id: result.lastID, ...modData };
    }

    // Удаление мода
    async removeMod(modId) {
        const result = await run(
            'DELETE FROM installed_mods WHERE profile_id = $1 AND mod_id = $2',
            [this.id, modId]
        );

        return result.rowCount > 0 || result.changes > 0;
    }

    // Включение/выключение мода
    async toggleMod(modId, enabled) {
        await run(
            'UPDATE installed_mods SET is_enabled = $1 WHERE profile_id = $2 AND mod_id = $3',
            [enabled, this.id, modId]
        );
    }

    // Обновление настроек
    async updateSettings(newSettings) {
        const currentSettings = this.settings || {};
        const updatedSettings = { ...currentSettings, ...newSettings };

        await run(
            'UPDATE launcher_profiles SET settings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [JSON.stringify(updatedSettings), this.id]
        );

        this.settings = updatedSettings;
        this.updated_at = new Date();
        return updatedSettings;
    }

    // Клонирование профиля
    async clone(newName, userId = null) {
        const targetUserId = userId || this.user_id;
        
        const cloneData = {
            name: newName,
            description: `Копия профиля: ${this.name}`,
            minecraftVersion: this.minecraft_version,
            modLoader: this.mod_loader,
            modLoaderVersion: this.mod_loader_version,
            javaVersion: this.java_version,
            memoryAllocation: this.memory_allocation,
            jvmArgs: typeof this.jvm_args === 'string' ? JSON.parse(this.jvm_args) : this.jvm_args,
            iconUrl: this.icon_url,
            settings: this.settings
        };

        const newProfile = await LauncherProfile.create(targetUserId, cloneData);

        // Копируем моды
        const mods = await this.getMods();
        for (const mod of mods) {
            await newProfile.addMod({
                modId: mod.mod_id,
                modName: mod.mod_name,
                modVersion: mod.mod_version,
                modSource: mod.mod_source,
                fileName: mod.file_name,
                fileSize: mod.file_size,
                downloadUrl: mod.download_url,
                dependencies: mod.dependencies
            });
        }

        return newProfile;
    }

    // Проверка совместимости модов
    async checkModCompatibility() {
        const mods = await this.getMods();
        const incompatibleMods = [];
        const missingDependencies = [];

        for (const mod of mods.filter(m => m.is_enabled)) {
            // Проверяем зависимости
            if (mod.dependencies && mod.dependencies.length > 0) {
                for (const dep of mod.dependencies) {
                    const depMod = mods.find(m => m.mod_id === dep.modId || m.mod_name === dep.name);
                    if (!depMod || !depMod.is_enabled) {
                        missingDependencies.push({
                            mod: mod.mod_name,
                            dependency: dep.name || dep.modId
                        });
                    }
                }
            }

            // Здесь можно добавить дополнительные проверки совместимости
            // Например, проверка версий Minecraft, конфликтующих модов и т.д.
        }

        return {
            isCompatible: incompatibleMods.length === 0 && missingDependencies.length === 0,
            incompatibleMods,
            missingDependencies
        };
    }

    // Экспорт конфигурации профиля
    toExportData() {
        return {
            name: this.name,
            description: this.description,
            minecraftVersion: this.minecraft_version,
            modLoader: this.mod_loader,
            modLoaderVersion: this.mod_loader_version,
            javaVersion: this.java_version,
            memoryAllocation: this.memory_allocation,
            jvmArgs: typeof this.jvm_args === 'string' ? JSON.parse(this.jvm_args) : this.jvm_args,
            settings: this.settings,
            createdAt: this.created_at,
            lastPlayedAt: this.last_played_at,
            playtime: this.playtime
        };
    }

    // Представление профиля для API
    toJSON() {
        return {
            id: this.id,
            userId: this.user_id,
            name: this.name,
            description: this.description,
            minecraftVersion: this.minecraft_version,
            modLoader: this.mod_loader,
            modLoaderVersion: this.mod_loader_version,
            javaVersion: this.java_version,
            memoryAllocation: this.memory_allocation,
            jvmArgs: typeof this.jvm_args === 'string' ? JSON.parse(this.jvm_args) : this.jvm_args,
            iconUrl: this.icon_url,
            settings: this.settings,
            createdAt: this.created_at,
            updatedAt: this.updated_at,
            lastPlayedAt: this.last_played_at,
            playtime: this.playtime,
            isActive: this.is_active
        };
    }

    // Статистика профилей пользователя
    static async getUserStats(userId) {
        const result = await query(
            `SELECT 
                COUNT(*) as total_profiles,
                SUM(playtime) as total_playtime,
                AVG(playtime) as avg_playtime,
                MAX(last_played_at) as last_activity
             FROM launcher_profiles 
             WHERE user_id = $1 AND is_active = true`,
            [userId]
        );

        const stats = result.rows ? result.rows[0] : result;
        return {
            totalProfiles: parseInt(stats.total_profiles || 0),
            totalPlaytime: parseInt(stats.total_playtime || 0),
            avgPlaytime: Math.round(parseFloat(stats.avg_playtime || 0)),
            lastActivity: stats.last_activity
        };
    }

    // Получение популярных версий Minecraft
    static async getPopularVersions(limit = 10) {
        const result = await query(
            `SELECT minecraft_version, COUNT(*) as usage_count
             FROM launcher_profiles 
             WHERE is_active = true
             GROUP BY minecraft_version
             ORDER BY usage_count DESC
             LIMIT $1`,
            [limit]
        );

        return result.rows || [];
    }

    // Получение популярных модлоадеров
    static async getPopularModLoaders() {
        const result = await query(
            `SELECT mod_loader, COUNT(*) as usage_count
             FROM launcher_profiles 
             WHERE is_active = true AND mod_loader != 'vanilla'
             GROUP BY mod_loader
             ORDER BY usage_count DESC`,
            []
        );

        return result.rows || [];
    }
}

export default LauncherProfile;