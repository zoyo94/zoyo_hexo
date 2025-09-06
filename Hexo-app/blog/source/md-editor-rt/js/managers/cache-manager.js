/**
 * 缓存管理器 - 解决文件上传缓存问题
 */
class CacheManager {
    constructor() {
        this.uploadCache = new Map();
        this.serverFileList = new Set();
        this.cacheKey = 'md_editor_file_cache';
        this.loadCacheFromStorage();
    }

    /**
     * 从本地存储加载缓存
     */
    loadCacheFromStorage() {
        try {
            const cached = localStorage.getItem(this.cacheKey);
            if (cached) {
                const data = JSON.parse(cached);
                this.uploadCache = new Map(data.uploadCache || []);
                this.serverFileList = new Set(data.serverFileList || []);
            }
        } catch (error) {
            console.warn('加载缓存失败:', error);
            this.clearCache();
        }
    }

    /**
     * 保存缓存到本地存储
     */
    saveCacheToStorage() {
        try {
            const data = {
                uploadCache: Array.from(this.uploadCache.entries()),
                serverFileList: Array.from(this.serverFileList),
                timestamp: Date.now()
            };
            localStorage.setItem(this.cacheKey, JSON.stringify(data));
        } catch (error) {
            console.warn('保存缓存失败:', error);
        }
    }

    /**
     * 生成文件唯一标识
     */
    generateFileHash(file) {
        return `${file.name}_${file.size}_${file.lastModified}`;
    }

    /**
     * 获取后端服务器地址
     */
    // 直接使用全局的 window.BACKEND_URL
    getBackendUrl() {
        return window.BACKEND_URL;
    }

    /**
     * 检查服务器文件是否存在
     */
    async checkServerFileExists(filename) {
        try {
            const backendUrl = this.getBackendUrl();
            const response = await fetch(`${backendUrl}/api/check-file`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
                body: JSON.stringify({ filename })
            });

            if (response.ok) {
                const result = await response.json();
                return result.exists;
            }
            return false;
        } catch (error) {
            console.warn('检查服务器文件失败:', error);
            return false;
        }
    }

    /**
     * 同步服务器文件列表
     */
    async syncServerFileList() {
        try {
            const backendUrl = this.getBackendUrl();
            const response = await fetch(`${backendUrl}/api/list-files`, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });

            if (response.ok) {
                const result = await response.json();
                this.serverFileList = new Set(result.files || []);
                this.saveCacheToStorage();
                return true;
            }
        } catch (error) {
            console.warn('同步服务器文件列表失败:', error);
        }
        return false;
    }

    /**
     * 检查文件是否可以上传
     */
    async canUploadFile(file) {
        const fileHash = this.generateFileHash(file);
        const filename = file.name;

        // 首先检查本地缓存
        if (this.uploadCache.has(fileHash)) {
            const cachedInfo = this.uploadCache.get(fileHash);
            
            // 检查缓存是否过期（5分钟）
            if (Date.now() - cachedInfo.timestamp < 5 * 60 * 1000) {
                // 验证服务器文件是否真实存在
                const serverExists = await this.checkServerFileExists(filename);
                if (serverExists) {
                    return {
                        canUpload: false,
                        reason: 'file_exists',
                        message: '文件已存在于服务器上'
                    };
                } else {
                    // 服务器文件不存在，清除缓存
                    this.removeFromCache(fileHash, filename);
                }
            } else {
                // 缓存过期，清除
                this.removeFromCache(fileHash, filename);
            }
        }

        // 检查服务器文件列表
        if (this.serverFileList.has(filename)) {
            const serverExists = await this.checkServerFileExists(filename);
            if (serverExists) {
                return {
                    canUpload: false,
                    reason: 'file_exists',
                    message: '文件已存在于服务器上'
                };
            } else {
                // 服务器文件不存在，从列表中移除
                this.serverFileList.delete(filename);
                this.saveCacheToStorage();
            }
        }

        return {
            canUpload: true,
            reason: 'ok',
            message: '可以上传'
        };
    }

    /**
     * 添加文件到缓存
     */
    addToCache(file, uploadResult) {
        const fileHash = this.generateFileHash(file);
        const filename = file.name;

        this.uploadCache.set(fileHash, {
            filename,
            uploadResult,
            timestamp: Date.now()
        });

        this.serverFileList.add(filename);
        this.saveCacheToStorage();
    }

    /**
     * 从缓存中移除文件
     */
    removeFromCache(fileHash, filename) {
        this.uploadCache.delete(fileHash);
        if (filename) {
            this.serverFileList.delete(filename);
        }
        this.saveCacheToStorage();
    }

    /**
     * 清除所有缓存
     */
    clearCache() {
        this.uploadCache.clear();
        this.serverFileList.clear();
        localStorage.removeItem(this.cacheKey);
    }

    /**
     * 清除过期缓存
     */
    clearExpiredCache() {
        const now = Date.now();
        const expireTime = 30 * 60 * 1000; // 30分钟

        for (const [hash, info] of this.uploadCache.entries()) {
            if (now - info.timestamp > expireTime) {
                this.uploadCache.delete(hash);
                this.serverFileList.delete(info.filename);
            }
        }
        this.saveCacheToStorage();
    }

    /**
     * 强制刷新文件状态
     */
    async forceRefreshFileStatus(filename) {
        // 从缓存中移除相关记录
        for (const [hash, info] of this.uploadCache.entries()) {
            if (info.filename === filename) {
                this.uploadCache.delete(hash);
                break;
            }
        }
        this.serverFileList.delete(filename);

        // 重新检查服务器状态
        const exists = await this.checkServerFileExists(filename);
        if (exists) {
            this.serverFileList.add(filename);
        }
        
        this.saveCacheToStorage();
        return !exists;
    }

    /**
     * 获取缓存数量
     */
    getCacheCount() {
        return this.uploadCache.size + this.serverFileList.size;
    }

    /**
     * 获取缓存统计信息
     */
    getCacheStats() {
        return {
            uploadCacheCount: this.uploadCache.size,
            serverFileCount: this.serverFileList.size,
            totalCount: this.uploadCache.size + this.serverFileList.size
        };
    }
}

window.CacheManager = CacheManager;