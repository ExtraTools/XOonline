// DiLauncher API Client v2.0

class DiLauncherAPI {
    constructor() {
        this.baseURL = window.location.origin + '/api';
        this.token = localStorage.getItem('accessToken');
        this.refreshToken = localStorage.getItem('refreshToken');
        this.wsConnection = null;
    }

    // Request interceptor
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            }
        };

        // Add auth token if exists
        if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            let response = await fetch(url, config);
            
            // Handle token refresh
            if (response.status === 401) {
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    // Retry request with new token
                    config.headers.Authorization = `Bearer ${this.token}`;
                    response = await fetch(url, config);
                } else {
                    // Redirect to login
                    this.logout();
                    window.location.href = '/login';
                    return;
                }
            }

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
            
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Auth endpoints
    async register(userData) {
        const response = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });

        if (response.success) {
            this.setTokens(response.data.tokens);
            this.setUser(response.data.user);
        }

        return response;
    }

    async login(credentials) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });

        if (response.success) {
            this.setTokens(response.data.tokens);
            this.setUser(response.data.user);
            this.connectWebSocket();
        }

        return response;
    }

    async logout() {
        try {
            await this.request('/auth/logout', {
                method: 'POST',
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });
        } catch (error) {
            console.error('Logout error:', error);
        }

        this.clearTokens();
        this.clearUser();
        this.disconnectWebSocket();
    }

    async refreshAccessToken() {
        if (!this.refreshToken) return false;

        try {
            const response = await this.request('/auth/refresh', {
                method: 'POST',
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });

            if (response.success) {
                this.setTokens(response.data.tokens);
                return true;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }

        return false;
    }

    // Profile endpoints
    async getProfiles() {
        return await this.request('/profiles');
    }

    async createProfile(profileData) {
        return await this.request('/profiles', {
            method: 'POST',
            body: JSON.stringify(profileData)
        });
    }

    async updateProfile(profileId, profileData) {
        return await this.request(`/profiles/${profileId}`, {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    async deleteProfile(profileId) {
        return await this.request(`/profiles/${profileId}`, {
            method: 'DELETE'
        });
    }

    async launchProfile(profileId) {
        return await this.request(`/profiles/${profileId}/launch`, {
            method: 'POST'
        });
    }

    // Server endpoints
    async getServers(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/servers${queryString ? '?' + queryString : ''}`);
    }

    async getServer(serverId) {
        return await this.request(`/servers/${serverId}`);
    }

    async createServer(serverData) {
        return await this.request('/servers', {
            method: 'POST',
            body: JSON.stringify(serverData)
        });
    }

    async pingServer(serverId) {
        return await this.request(`/servers/${serverId}/ping`, {
            method: 'POST'
        });
    }

    async voteServer(serverId) {
        return await this.request(`/servers/${serverId}/vote`, {
            method: 'POST'
        });
    }

    // Launcher endpoints
    async getMinecraftVersions() {
        return await this.request('/launcher/versions');
    }

    async getVersionDetails(versionId) {
        return await this.request(`/launcher/versions/${versionId}`);
    }

    async getModLoaders(version) {
        return await this.request(`/launcher/modloaders/${version}`);
    }

    async searchMods(query, params = {}) {
        const queryString = new URLSearchParams({ query, ...params }).toString();
        return await this.request(`/launcher/mods/search?${queryString}`);
    }

    async checkLauncherUpdate(currentVersion) {
        const platform = this.detectPlatform();
        return await this.request(`/launcher/check-update/${currentVersion}?platform=${platform}`);
    }

    // User endpoints
    async getUser(identifier) {
        return await this.request(`/users/${identifier}`);
    }

    async updateProfile(profileData) {
        return await this.request('/users/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    async uploadAvatar(file) {
        const formData = new FormData();
        formData.append('avatar', file);

        return await this.request('/users/avatar', {
            method: 'POST',
            body: formData,
            headers: {} // Let browser set content-type for FormData
        });
    }

    async sendFriendRequest(userId) {
        return await this.request('/users/friends/request', {
            method: 'POST',
            body: JSON.stringify({ userId })
        });
    }

    async acceptFriendRequest(requestId) {
        return await this.request(`/users/friends/accept/${requestId}`, {
            method: 'POST'
        });
    }

    // WebSocket connection
    connectWebSocket() {
        if (this.wsConnection) return;

        const wsUrl = window.location.origin.replace(/^http/, 'ws');
        this.wsConnection = io(wsUrl, {
            auth: {
                token: this.token
            }
        });

        this.wsConnection.on('connect', () => {
            console.log('WebSocket connected');
            this.wsConnection.emit('authenticate', this.token);
        });

        this.wsConnection.on('launcher:status_update', (data) => {
            this.handleLauncherStatus(data);
        });

        this.wsConnection.on('download:progress_update', (data) => {
            this.handleDownloadProgress(data);
        });

        this.wsConnection.on('disconnect', () => {
            console.log('WebSocket disconnected');
        });
    }

    disconnectWebSocket() {
        if (this.wsConnection) {
            this.wsConnection.disconnect();
            this.wsConnection = null;
        }
    }

    // Event handlers
    handleLauncherStatus(data) {
        document.dispatchEvent(new CustomEvent('launcher:status', { detail: data }));
    }

    handleDownloadProgress(data) {
        document.dispatchEvent(new CustomEvent('download:progress', { detail: data }));
    }

    // Utility methods
    setTokens(tokens) {
        this.token = tokens.accessToken;
        this.refreshToken = tokens.refreshToken;
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        
        // Set auto-refresh before expiry
        const expiresIn = tokens.expiresIn * 1000; // Convert to ms
        setTimeout(() => this.refreshAccessToken(), expiresIn - 60000); // Refresh 1 min before expiry
    }

    clearTokens() {
        this.token = null;
        this.refreshToken = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    }

    setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    }

    getUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    clearUser() {
        localStorage.removeItem('user');
    }

    isAuthenticated() {
        return !!this.token && !!this.getUser();
    }

    detectPlatform() {
        const platform = navigator.platform.toLowerCase();
        if (platform.includes('win')) return 'windows';
        if (platform.includes('mac')) return 'macos';
        return 'linux';
    }
}

// Create global instance
window.api = new DiLauncherAPI();

// Auto-connect WebSocket if authenticated
if (window.api.isAuthenticated()) {
    window.api.connectWebSocket();
}

// Export for modules
export default window.api;