/**
 * 简化版缓存管理UI
 * 专门为MD编辑器设计的轻量级缓存管理界面
 */

// 等待页面加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 延迟初始化，确保编辑器已加载
    setTimeout(initSimpleCacheUI, 2000);
});

function initSimpleCacheUI() {
    // 检查缓存管理器是否存在
    if (!window.cacheManager) {
        console.warn('缓存管理器未加载，跳过UI初始化');
        return;
    }

    // 创建缓存管理按钮
    createCacheButton();
    
    // 创建缓存管理面板
    createCachePanel();
    
    console.log('简化版缓存UI已初始化');
}

function createCacheButton() {
    // 创建右下角状态指示器
    const statusIndicator = document.createElement('div');
    statusIndicator.id = 'cache-status-indicator';
    statusIndicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(44, 40, 39, 0.9);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 25px;
        padding: 8px 16px;
        color: white;
        font-size: 12px;
        font-family: Arial, sans-serif;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        transition: all 0.3s ease;
        cursor: pointer;
        user-select: none;
    `;

    // 创建状态图标
    const statusIcon = document.createElement('span');
    statusIcon.id = 'cache-status-icon';
    statusIcon.innerHTML = '🟢';
    statusIcon.style.fontSize = '10px';

    // 创建状态文本
    const statusText = document.createElement('span');
    statusText.id = 'cache-status-text';
    statusText.textContent = '缓存正常';

    // 创建快速操作按钮（默认隐藏）
    const quickActions = document.createElement('div');
    quickActions.id = 'quick-actions';
    quickActions.style.cssText = `
        display: none;
        margin-left: 8px;
        gap: 4px;
    `;

    const refreshBtn = document.createElement('button');
    refreshBtn.innerHTML = '🔄';
    refreshBtn.title = '刷新缓存';
    refreshBtn.style.cssText = `
        background: none;
        border: none;
        color: #4CAF50;
        cursor: pointer;
        padding: 2px 4px;
        border-radius: 4px;
        font-size: 12px;
        transition: background 0.2s ease;
    `;

    const settingsBtn = document.createElement('button');
    settingsBtn.innerHTML = '⚙️';
    settingsBtn.title = '缓存设置';
    settingsBtn.style.cssText = `
        background: none;
        border: none;
        color: #2196F3;
        cursor: pointer;
        padding: 2px 4px;
        border-radius: 4px;
        font-size: 12px;
        transition: background 0.2s ease;
    `;

    // 悬停效果
    statusIndicator.addEventListener('mouseenter', () => {
        statusIndicator.style.background = 'rgba(44, 40, 39, 0.95)';
        statusIndicator.style.transform = 'translateY(-2px)';
        quickActions.style.display = 'flex';
    });

    statusIndicator.addEventListener('mouseleave', () => {
        statusIndicator.style.background = 'rgba(44, 40, 39, 0.9)';
        statusIndicator.style.transform = 'translateY(0)';
        quickActions.style.display = 'none';
    });

    // 按钮悬停效果
    refreshBtn.addEventListener('mouseenter', () => {
        refreshBtn.style.background = 'rgba(76, 175, 80, 0.2)';
    });
    refreshBtn.addEventListener('mouseleave', () => {
        refreshBtn.style.background = 'none';
    });

    settingsBtn.addEventListener('mouseenter', () => {
        settingsBtn.style.background = 'rgba(33, 150, 243, 0.2)';
    });
    settingsBtn.addEventListener('mouseleave', () => {
        settingsBtn.style.background = 'none';
    });

    // 绑定事件
    refreshBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        quickRefreshCache();
    });

    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showCachePanel();
    });

    statusIndicator.addEventListener('click', showCachePanel);

    // 组装元素
    quickActions.appendChild(refreshBtn);
    quickActions.appendChild(settingsBtn);
    statusIndicator.appendChild(statusIcon);
    statusIndicator.appendChild(statusText);
    statusIndicator.appendChild(quickActions);
    document.body.appendChild(statusIndicator);

    // 定期更新状态
    updateStatusIndicator();
    setInterval(updateStatusIndicator, 30000); // 每30秒更新一次
}

function updateStatusIndicator() {
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

function createCachePanel() {
    const panel = document.createElement('div');
    panel.id = 'simple-cache-panel';
    panel.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 500px;
        max-width: 90vw;
        max-height: 80vh;
        background: #2c2827;
        border: 2px solid #667eea;
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.6);
        z-index: 10000;
        display: none;
        color: white;
        font-family: Arial, sans-serif;
    `;

    panel.innerHTML = `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px; border-radius: 10px 10px 0 0;">
            <h2 style="margin: 0; font-size: 16px; display: flex; align-items: center; justify-content: space-between;">
                🗂️ 缓存状态
                <button id="close-simple-panel" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">&times;</button>
            </h2>
        </div>
        
        <div style="padding: 20px;">
            <div id="cache-status-info" style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 6px; margin-bottom: 15px; text-align: center;">
                <p style="margin: 0; font-size: 14px;">📊 <span id="status-text">自动管理中</span></p>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #ccc;">缓存: <span id="cache-file-count">0</span> 个 | 服务器: <span id="server-file-count">0</span> 个</p>
            </div>
            
            <div style="display: flex; gap: 8px; margin-bottom: 15px;">
                <button id="refresh-cache-btn" style="flex: 1; background: #4CAF50; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-size: 13px;">
                    🔄 刷新
                </button>
                <button id="clear-all-btn" style="flex: 1; background: #FF9800; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-size: 13px;">
                    🗑️ 清空
                </button>
            </div>
            
            <div style="background: rgba(76, 175, 80, 0.1); padding: 12px; border-radius: 6px; border-left: 3px solid #4CAF50;">
                <p style="margin: 0; font-size: 12px; color: #4CAF50; font-weight: 600;">✨ 智能缓存管理</p>
                <p style="margin: 5px 0 0 0; font-size: 11px; line-height: 1.4; color: #ccc;">
                    系统已自动处理文件缓存冲突，通常无需手动操作。如遇问题可点击刷新按钮。
                </p>
            </div>
        </div>
    `;

    document.body.appendChild(panel);

    // 绑定面板内的事件
    document.getElementById('close-simple-panel').addEventListener('click', hideCachePanel);
    document.getElementById('refresh-cache-btn').addEventListener('click', refreshCacheStatus);
    document.getElementById('clear-all-btn').addEventListener('click', clearAllCache);

    // 点击面板外部关闭
    panel.addEventListener('click', (e) => {
        if (e.target === panel) {
            hideCachePanel();
        }
    });

    // ESC键关闭
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && panel.style.display !== 'none') {
            hideCachePanel();
        }
    });
}

function showCachePanel() {
    const panel = document.getElementById('simple-cache-panel');
    if (panel) {
        panel.style.display = 'block';
        updateCacheStatus();
    }
}

function hideCachePanel() {
    const panel = document.getElementById('simple-cache-panel');
    if (panel) {
        panel.style.display = 'none';
    }
}

function updateCacheStatus() {
    if (!window.cacheManager) return;

    const cacheCount = window.cacheManager.uploadCache.size;
    const serverCount = window.cacheManager.serverFileList.size;

    document.getElementById('cache-file-count').textContent = cacheCount;
    document.getElementById('server-file-count').textContent = serverCount;
    document.getElementById('status-text').textContent = cacheCount > 0 ? '有缓存数据' : '无缓存数据';
}

async function quickRefreshCache() {
    const btn = document.getElementById('quick-refresh-btn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '⏳';
    btn.style.background = '#FF9800';
    
    try {
        if (window.cacheManager) {
            window.cacheManager.clearExpiredCache();
            await window.cacheManager.syncServerFileList();
            showToast('✅ 缓存状态已刷新', 'success');
        }
    } catch (error) {
        showToast('❌ 刷新失败: ' + error.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.style.background = '#4CAF50';
    }
}

async function refreshCacheStatus() {
    const btn = document.getElementById('refresh-cache-btn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '⏳ 刷新中...';
    btn.disabled = true;
    
    try {
        if (window.cacheManager) {
            window.cacheManager.clearExpiredCache();
            await window.cacheManager.syncServerFileList();
            updateCacheStatus();
            showToast('✅ 状态刷新成功', 'success');
        }
    } catch (error) {
        showToast('❌ 刷新失败: ' + error.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function syncServerFiles() {
    const btn = document.getElementById('sync-files-btn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '⏳ 同步中...';
    btn.disabled = true;
    
    try {
        if (window.cacheManager) {
            const success = await window.cacheManager.syncServerFileList();
            if (success) {
                updateCacheStatus();
                showToast('✅ 文件同步成功', 'success');
            } else {
                showToast('❌ 文件同步失败', 'error');
            }
        }
    } catch (error) {
        showToast('❌ 同步失败: ' + error.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function clearAllCache() {
    if (!window.cacheManager) return;
    
    if (confirm('确定要清空所有缓存吗？\n这将清除所有文件的缓存记录。')) {
        window.cacheManager.clearCache();
        updateCacheStatus();
        showToast('✅ 缓存已清空', 'success');
    }
}

function showToast(message, type = 'info') {
    // 移除现有的toast
    const existingToast = document.getElementById('cache-toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'cache-toast';
    toast.textContent = message;
    
    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        warning: '#FF9800',
        info: '#2196F3'
    };
    
    toast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        z-index: 10001;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideInRight 0.3s ease;
    `;

    // 添加动画样式
    if (!document.getElementById('toast-animation-style')) {
        const style = document.createElement('style');
        style.id = 'toast-animation-style';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // 3秒后自动移除
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// 导出函数供外部调用
window.simpleCacheUI = {
    show: showCachePanel,
    hide: hideCachePanel,
    refresh: quickRefreshCache,
    toast: showToast
};