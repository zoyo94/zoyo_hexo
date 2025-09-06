/**
 * 简化版缓存管理UI
 * 专门为MD编辑器设计的轻量级缓存管理界面
 */

class SimpleCacheUI {
    constructor() {
        // 创建缓存管理按钮
        this.createCacheButton();
        
        // 创建缓存管理面板
        this.createCachePanel();
        
        console.log('简化版缓存UI已初始化');
    }


    createCacheButton() {
        // 创建右下角状态指示器
        const statusIndicator = document.createElement('div');
        statusIndicator.id = 'cache-status-indicator';


        // 创建状态图标
        const statusIcon = document.createElement('span');
        statusIcon.id = 'cache-status-icon';
        statusIcon.innerHTML = '🟢';


        // 创建状态文本
        const statusText = document.createElement('span');
        statusText.id = 'cache-status-text';
        statusText.textContent = '缓存正常';

        // 创建快速操作按钮（默认隐藏）
        const quickActions = document.createElement('div');
        quickActions.id = 'quick-actions';


        const refreshBtn = document.createElement('button');
        refreshBtn.innerHTML = '🔄';
        refreshBtn.title = '刷新缓存';


        const settingsBtn = document.createElement('button');
        settingsBtn.innerHTML = '⚙️';
        settingsBtn.title = '缓存设置';


        // 悬停效果
        statusIndicator.addEventListener('mouseenter', () => {
            quickActions.style.display = 'flex';
        });

        statusIndicator.addEventListener('mouseleave', () => {
            quickActions.style.display = 'none';
        });

        // 按钮悬停效果
        refreshBtn.addEventListener('mouseenter', () => {
            // Styles handled by CSS
        });
        refreshBtn.addEventListener('mouseleave', () => {
            // Styles handled by CSS
        });

        settingsBtn.addEventListener('mouseenter', () => {
            // Styles handled by CSS
        });
        settingsBtn.addEventListener('mouseleave', () => {
            // Styles handled by CSS
        });

        // 绑定事件
        refreshBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.quickRefreshCache();
        });

        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showCachePanel();
        });

        statusIndicator.addEventListener('click', () => this.showCachePanel());

        // 组装元素
        quickActions.appendChild(refreshBtn);
        quickActions.appendChild(settingsBtn);
        statusIndicator.appendChild(statusIcon);
        statusIndicator.appendChild(statusText);
        statusIndicator.appendChild(quickActions);
        document.body.appendChild(statusIndicator);

        // 定期更新状态
        this.updateStatusIndicator();
        setInterval(() => this.updateStatusIndicator(), 30000); // 每30秒更新一次
    }

    updateStatusIndicator() {
        if (!window.cacheManager) return;

        const statusIcon = document.getElementById('cache-status-icon');
        const statusText = document.getElementById('cache-status-text');
        
        if (!statusIcon || !statusText) return;

        const cacheCount = window.cacheManager.uploadCache.size;
        const serverCount = window.cacheManager.serverFileList.size;

        if (cacheCount === 0) {
            statusIcon.innerHTML = '🟢';
            statusText.textContent = '缓存清洁';
        } else if (cacheCount < 5) {
            statusIcon.innerHTML = '🟡';
            statusText.textContent = `${cacheCount}个缓存`;
        } else {
            statusIcon.innerHTML = '🟠';
            statusText.textContent = `${cacheCount}个缓存`;
        }
    }

    createCachePanel() {
        const panel = document.createElement('div');
        panel.id = 'simple-cache-panel';


        panel.innerHTML = `
            <div class="panel-header">
                <h2>
                    🗂️ 缓存状态
                    <button id="close-simple-panel" class="close-simple-panel">&times;</button>
                </h2>
            </div>
            
            <div class="panel-content">
                <div id="cache-status-info">
                    <p>📊 <span id="status-text">自动管理中</span></p>
                    <p>缓存: <span id="cache-file-count">0</span> 个 | 服务器: <span id="server-file-count">0</span> 个</p>
                </div>
                
                <div class="button-group">
                    <button id="refresh-cache-btn">
                        🔄 刷新
                    </button>
                    <button id="show-details-btn">
                        📋 查看详情
                    </button>
                    <button id="clear-all-btn">
                        🗑️ 清空
                    </button>
                </div>
                
                <div id="cache-details-section" class="cache-details-section" style="display: none;">
                    <h4>📁 缓存详情</h4>
                    <div id="cache-list" class="cache-list">
                        <p>正在加载缓存详情...</p>
                    </div>
                </div>
                
                <div class="auto-clean-settings">
                    <h4>⏰ 自动清理设置</h4>
                    <div class="setting-item">
                        <label for="auto-clean-interval">清理间隔 (分钟):</label>
                        <input type="number" id="auto-clean-interval" min="1" max="1440" value="30" />
                        <button id="save-interval-btn">保存</button>
                    </div>
                    <div class="countdown-info">
                        <span class="countdown-item">📝 当前: <strong id="current-interval">30</strong>分钟</span>
                        <span class="countdown-item">🕒 下次: <strong id="next-clean-time">计算中...</strong></span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // 绑定面板内的事件
        document.getElementById('close-simple-panel').addEventListener('click', () => this.hideCachePanel());
        document.getElementById('refresh-cache-btn').addEventListener('click', () => this.refreshCacheStatus());
        document.getElementById('show-details-btn').addEventListener('click', () => this.toggleCacheDetails());
        document.getElementById('clear-all-btn').addEventListener('click', () => this.clearAllCache());
        document.getElementById('save-interval-btn').addEventListener('click', () => this.saveAutoCleanInterval());

        // 点击面板外部关闭
        panel.addEventListener('click', (e) => {
            if (e.target === panel) {
                this.hideCachePanel();
            }
        });

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && panel.style.display !== 'none') {
                this.hideCachePanel();
            }
        });
    }

    showCachePanel() {
        const panel = document.getElementById('simple-cache-panel');
        if (panel) {
            panel.style.display = 'block';
            this.updateCacheStatus();
            this.initializeAutoCleanSettings();
        }
    }

    hideCachePanel() {
        const panel = document.getElementById('simple-cache-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    updateCacheStatus() {
        if (!window.cacheManager) return;

        const cacheCount = window.cacheManager.uploadCache.size;
        const serverCount = window.cacheManager.serverFileList.size;

        document.getElementById('cache-file-count').textContent = cacheCount;
        document.getElementById('server-file-count').textContent = serverCount;
        document.getElementById('status-text').textContent = cacheCount > 0 ? '有缓存数据' : '无缓存数据';
    }

    async quickRefreshCache() {
        const btn = document.getElementById('quick-refresh-btn');
        let originalText = '🔄';
        
        // 安全地获取原始文本
        if (btn && btn.innerHTML) {
            originalText = btn.innerHTML;
            btn.innerHTML = '⏳';
        }
        
        try {
            if (window.cacheManager) {
                window.cacheManager.clearExpiredCache();
                await window.cacheManager.syncServerFileList();
                this.updateStatusIndicator(); // 更新状态指示器
                this.showToast('✅ 缓存状态已刷新', 'success');
            } else {
                this.showToast('❌ 缓存管理器未初始化', 'error');
            }
        } catch (error) {
            console.error('Cache refresh error:', error);
            this.showToast('❌ 刷新失败: ' + error.message, 'error');
        } finally {
            // 安全地恢复按钮状态
            if (btn && btn.innerHTML !== undefined) {
                btn.innerHTML = originalText;
            }
        }
    }

    async refreshCacheStatus() {
        const btn = document.getElementById('refresh-cache-btn');
        let originalText = '🔄 刷新状态';
        
        // 安全地获取原始文本和设置状态
        if (btn && btn.innerHTML) {
            originalText = btn.innerHTML;
            btn.innerHTML = '⏳ 刷新中...';
            btn.disabled = true;
        }
        
        try {
            if (window.cacheManager) {
                window.cacheManager.clearExpiredCache();
                await window.cacheManager.syncServerFileList();
                this.updateCacheStatus();
                this.showToast('✅ 状态刷新成功', 'success');
            } else {
                this.showToast('❌ 缓存管理器未初始化', 'error');
            }
        } catch (error) {
            console.error('Cache status refresh error:', error);
            this.showToast('❌ 刷新失败: ' + error.message, 'error');
        } finally {
            // 安全地恢复按钮状态
            if (btn && btn.innerHTML !== undefined) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
    }

    async syncServerFiles() {
        const btn = document.getElementById('sync-files-btn');
        const originalText = btn.innerHTML;
        
        if (btn) {
            btn.innerHTML = '⏳ 同步中...';
            btn.disabled = true;
        }
        
        try {
            if (window.cacheManager) {
                const success = await window.cacheManager.syncServerFileList();
                if (success) {
                    this.updateCacheStatus();
                    this.showToast('✅ 文件同步成功', 'success');
                } else {
                    this.showToast('❌ 文件同步失败', 'error');
                }
            }
        } catch (error) {
            this.showToast('❌ 同步失败: ' + error.message, 'error');
        } finally {
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
    }

    clearAllCache() {
        if (!window.cacheManager) return;
        
        if (confirm('确定要清空所有缓存吗？\n这将清除所有文件的缓存记录。')) {
            window.cacheManager.clearCache();
            this.updateCacheStatus();
            this.showToast('✅ 缓存已清空', 'success');
        }
    }

    showToast(message, type = 'info') {
        // 移除现有的toast
        const existingToast = document.getElementById('cache-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.id = 'cache-toast';
        toast.textContent = message;
        toast.classList.add(type); // Add type as a class for styling
        
        document.body.appendChild(toast);

        // 3秒后自动移除
        setTimeout(() => {
            toast.classList.add('slideOutRight'); // Use CSS class for animation
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
    toggleCacheDetails() {
        const detailsSection = document.getElementById('cache-details-section');
        const btn = document.getElementById('show-details-btn');
        
        if (!detailsSection || !btn) return;

        if (detailsSection.style.display === 'none') {
            detailsSection.style.display = 'block';
            btn.innerHTML = '📋 隐藏详情';
            this.loadCacheDetails();
        } else {
            detailsSection.style.display = 'none';
            btn.innerHTML = '📋 查看详情';
        }
    }

    loadCacheDetails() {
        const cacheList = document.getElementById('cache-list');
        if (!cacheList || !window.cacheManager) return;

        try {
            const uploadCache = window.cacheManager.uploadCache;
            const serverFileList = window.cacheManager.serverFileList;
            
            let html = '';
            
            // 显示上传缓存
            if (uploadCache.size > 0) {
                html += '<div class="cache-category"><h5>📤 上传缓存 (' + uploadCache.size + ' 项)</h5><ul>';
                uploadCache.forEach((value, key) => {
                    const fileSize = value.size ? this.formatFileSize(value.size) : '未知大小';
                    const uploadTime = value.timestamp ? new Date(value.timestamp).toLocaleString() : '未知时间';
                    html += `<li class="cache-item">
                        <div class="cache-item-name">📄 ${key}</div>
                        <div class="cache-item-info">大小: ${fileSize} | 时间: ${uploadTime}</div>
                    </li>`;
                });
                html += '</ul></div>';
            }
            
            // 显示服务器文件列表缓存
            if (serverFileList.size > 0) {
                html += '<div class="cache-category"><h5>🖥️ 服务器缓存 (' + serverFileList.size + ' 项)</h5><ul>';
                serverFileList.forEach((value, key) => {
                    const cacheTime = value.timestamp ? new Date(value.timestamp).toLocaleString() : '未知时间';
                    html += `<li class="cache-item">
                        <div class="cache-item-name">📁 ${key}</div>
                        <div class="cache-item-info">缓存时间: ${cacheTime}</div>
                    </li>`;
                });
                html += '</ul></div>';
            }
            
            if (html === '') {
                html = '<p class="no-cache">🎉 当前没有缓存数据</p>';
            }
            
            cacheList.innerHTML = html;
            
        } catch (error) {
            console.error('加载缓存详情失败:', error);
            cacheList.innerHTML = '<p class="error">❌ 加载缓存详情失败</p>';
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    saveAutoCleanInterval() {
        const input = document.getElementById('auto-clean-interval');
        const btn = document.getElementById('save-interval-btn');
        
        if (!input || !btn) return;

        const interval = parseInt(input.value);
        if (isNaN(interval) || interval < 1 || interval > 1440) {
            this.showToast('❌ 请输入有效的时间间隔 (1-1440分钟)', 'error');
            return;
        }

        // 保存到本地存储
        localStorage.setItem('cacheAutoCleanInterval', interval.toString());
        
        // 更新显示
        document.getElementById('current-interval').textContent = interval;
        
        // 重新启动自动清理定时器
        this.restartAutoCleanTimer();
        
        // 更新下次清理时间显示
        this.updateNextCleanTime();
        
        this.showToast(`✅ 自动清理间隔已设置为 ${interval} 分钟`, 'success');
    }

    getAutoCleanInterval() {
        const saved = localStorage.getItem('cacheAutoCleanInterval');
        return saved ? parseInt(saved) : 30; // 默认30分钟
    }

    restartAutoCleanTimer() {
        // 清除现有定时器
        if (this.autoCleanTimer) {
            clearInterval(this.autoCleanTimer);
        }

        const interval = this.getAutoCleanInterval();
        const intervalMs = interval * 60 * 1000; // 转换为毫秒

        // 启动新的定时器
        this.autoCleanTimer = setInterval(() => {
            this.performAutoClean();
        }, intervalMs);

        // 记录启动时间
        this.lastCleanTime = Date.now();
    }

    performAutoClean() {
        if (window.cacheManager) {
            console.log('🧹 执行自动缓存清理...');
            window.cacheManager.clearExpiredCache();
            this.updateStatusIndicator();
            this.updateNextCleanTime();
            
            // 如果面板是打开的，更新详情
            const detailsSection = document.getElementById('cache-details-section');
            if (detailsSection && detailsSection.style.display !== 'none') {
                this.loadCacheDetails();
            }
        }
    }

    updateNextCleanTime() {
        const nextTimeElement = document.getElementById('next-clean-time');
        if (!nextTimeElement) return;

        const interval = this.getAutoCleanInterval();
        const intervalMs = interval * 60 * 1000;
        const lastClean = this.lastCleanTime || Date.now();
        const nextClean = new Date(lastClean + intervalMs);
        
        nextTimeElement.textContent = nextClean.toLocaleTimeString();
    }

    initializeAutoCleanSettings() {
        // 初始化设置显示
        const interval = this.getAutoCleanInterval();
        const input = document.getElementById('auto-clean-interval');
        const currentDisplay = document.getElementById('current-interval');
        
        if (input) input.value = interval;
        if (currentDisplay) currentDisplay.textContent = interval;
        
        // 启动自动清理定时器
        this.restartAutoCleanTimer();
        
        // 更新下次清理时间
        this.updateNextCleanTime();
        
        // 每分钟更新一次下次清理时间显示
        setInterval(() => this.updateNextCleanTime(), 60000);
    }
}

window.SimpleCacheUI = SimpleCacheUI;