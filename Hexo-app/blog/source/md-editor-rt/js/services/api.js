/**
 * api.js
 * 统一封装所有后端 HTTP 请求，对外隐藏 URL 构建细节。
 * 提供统一错误处理和可选重试机制。
 */

/** 获取后端根地址 */
export const getBaseUrl = () => window.BACKEND_URL || `http://${window.location.hostname}:3001`;

/**
 * 基础请求封装（带超时和错误解析）
 * @param {string} url
 * @param {RequestInit} [options]
 * @param {number} [timeoutMs=15000]
 */
async function request(url, options = {}, timeoutMs = 15000) {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal, ...options });
        if (!response.ok) {
            // 尝试读取后端的错误消息
            let errMsg = `HTTP ${response.status}`;
            try {
                const errData = await response.json();
                errMsg = errData.message || errMsg;
            } catch (_) { /* 忽略 JSON 解析失败 */ }
            throw new Error(errMsg);
        }
        return response;
    } finally {
        clearTimeout(timerId);
    }
}

export const API = {
    /** 获取远端 Markdown 文件内容 */
    async getMarkdownFile(directory, filename) {
        const url = `${getBaseUrl()}/get_md?directory=${encodeURIComponent(directory)}&filename=${encodeURIComponent(filename)}`;
        const response = await request(url);
        return response.json();
    },

    /** 保存 Markdown 文件 */
    async saveMarkdownFile(payload) {
        const response = await request(`${getBaseUrl()}/save_md`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return response.json();
    },

    /** 获取目录树 */
    async getDirectoryTree(directory) {
        const url = `${getBaseUrl()}/directory-tree?directory=${encodeURIComponent(directory)}`;
        const response = await request(url);
        return response.json();
    },

    /** 检查文件是否存在 */
    async checkFile(filename) {
        const response = await request(`${getBaseUrl()}/api/check-file`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename })
        });
        return response.json();
    },

    /** 创建文件夹（FormData） */
    async createFolder(folderName, folderPath) {
        const form = new FormData();
        form.append('folderName', folderName);
        form.append('folderPath', folderPath);
        const response = await request(`${getBaseUrl()}/create_folder`, { method: 'POST', body: form });
        return response.json();
    },

    /** 移动图片/视频文件 */
    async moveImage(fileName, folderName, newFolderName, originalDir) {
        const form = new FormData();
        form.append('fileName', fileName);
        form.append('folderName', folderName);
        form.append('new_folderName', newFolderName);
        form.append('original_dir', originalDir);
        const response = await request(`${getBaseUrl()}/move_image`, { method: 'POST', body: form });
        return response.json();
    },

    /** 手动触发 Hexo clean + generate */
    async cleanHexo() {
        const response = await request(`${getBaseUrl()}/clean_hexo`, { method: 'POST' });
        return response.json();
    },

    /**
     * 页面卸载时静默触发 clean_hexo（Beacon 优先，降级到 keepalive fetch）
     */
    cleanHexoBeacon() {
        const target = `${getBaseUrl()}/clean_hexo`;
        const data = JSON.stringify({ action: 'clean_hexo' });
        try {
            if (!navigator.sendBeacon(target, data)) {
                fetch(target, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: data,
                    keepalive: true
                }).catch(err => console.error('[API] Beacon 降级 fetch 失败:', err));
            }
        } catch (e) {
            console.error('[API] Beacon API 错误:', e);
        }
    },

    /** 打包并下载 MD 文件 + 媒体文件夹 */
    async downloadTarball(payload) {
        const response = await request(`${getBaseUrl()}/tgz_download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }, 60000); // 打包可能较慢，超时放宽到 60s
        return response.blob();
    },

    /** 获取后端文件列表 */
    async listFiles() {
        const response = await request(`${getBaseUrl()}/api/list-files`);
        return response.json();
    }
};

// 向下兼容（供未模块化的旧代码调用）
window.API = API;
