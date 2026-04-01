/**
 * 通用工具类 - 统一处理重复的功能
 */
class CommonUtils {
    /**
     * 获取后端服务器地址 - 建议优先使用 apiService
     */
    static getBackendUrl() {
        if (window.apiService) return ''; // apiService 已处理基础路径
        
        const currentHost = window.location.hostname;
        const currentPort = window.location.port;
        
        // 如果当前是4000端口（Hexo），则后端使用3001端口
        if (currentPort === '4000') {
            return `http://${currentHost}:3001`;
        }
        
        // 如果直接访问3001端口，则使用相对路径
        if (currentPort === '3001') {
            return '';
        }
        
        // 默认使用3001端口
        return `http://${currentHost}:3001`;
    }

    /**
     * 检查文件是否存在 - 统一实现
     */
    static async checkFileExists(filePath) {
        try {
            const response = await fetch(filePath, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * 检查服务器文件是否存在 - 使用统一的 apiService
     */
    static async checkServerFileExists(filename) {
        try {
            const data = await window.apiService.checkFileExists(filename);
            return data.success && data.exists;
        } catch (error) {
            console.warn('检查服务器文件失败:', error);
            return false;
        }
    }

    /**
     * 安全化文件名，处理中文和特殊字符 - 统一实现
     */
    static sanitizeFilename(filename) {
        if (!filename) return '';
        
        const lastDotIndex = filename.lastIndexOf('.');
        const name = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
        const ext = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';
        
        // 处理文件名：替换空格和特殊字符，保留中文
        let safeName = name
            .replace(/\s+/g, '_')  // 空格替换为下划线
            .replace(/[<>:"/\\|?*]/g, '_')  // 替换Windows不允许的字符
            .replace(/[.]{2,}/g, '_')  // 连续的点替换为下划线
            .replace(/^[._-]+|[._-]+$/g, '');  // 移除开头和结尾的特殊字符
        
        if (!safeName) {
            safeName = `file_${Date.now()}`;
        }
        
        return safeName + ext;
    }

    /**
     * 生成 Markdown 图片链接 - 统一实现
     */
    static generateMarkdownImage(altText, imagePath) {
        // 对路径进行编码，但保留可读性
        const encodedPath = imagePath.split('/').map(segment => {
            // 只对特殊字符进行编码，保留中文字符
            return encodeURIComponent(segment)
                .replace(/%2E/g, '.')  // 保留点号
                .replace(/%2D/g, '-')  // 保留连字符
                .replace(/%5F/g, '_'); // 保留下划线
        }).join('/');
        
        // 清理 alt 文本，移除可能影响 Markdown 的字符
        const cleanAltText = altText.replace(/[[\]]/g, '').replace(/[()]/g, '');
        
        return `![${cleanAltText}](${encodedPath})`;
    }

    /**
     * 为上传的文件生成Markdown代码 - 统一实现
     */
    static generateMarkdownForFiles(filenames, destination) {
        const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv'];
        let markdown = '';
        
        filenames.forEach((filename) => {
            const fileExt = filename.split('.').pop().toLowerCase();
            const imagePath = destination.replace('./', '');
            
            if (VIDEO_EXTENSIONS.includes(fileExt)) {
                markdown += `\n<video src="/${imagePath}${filename}" controls="controls" width="500" height="300"></video>\n`;
            } else {
                const filenameWithoutExt = filename.split('.')[0];
                markdown += `\n![${filenameWithoutExt}](/${imagePath}${filename})\n`;
            }
        });
        
        return markdown;
    }

    /**
     * 为视频文件生成Markdown代码 - 统一实现
     */
    static generateVideoMarkdown(filenames, destination) {
        let markdown = '';
        filenames.forEach(filename => {
            markdown += `<video src="${destination}${filename}" controls="controls" width="500" height="300"></video>\n`;
        });
        return markdown;
    }

    /**
     * 为图片文件生成Markdown代码 - 统一实现
     */
    static generateImageMarkdown(filenames, destination) {
        let markdown = '';
        filenames.forEach(filename => {
            const filenameWithoutExt = filename.split('.')[0];
            markdown += `![${filenameWithoutExt}](${destination}${filename})\n`;
        });
        return markdown;
    }

    /**
     * 读取文件内容为文本 - 统一实现
     */
    static readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * 过滤已存在的文件，提示用户是否替换 - 统一实现
     */
    static async filterExistingFiles(files, destination) {
        const newFiles = [];
        for (const file of files) {
            try {
                const response = await fetch(`${destination}${file.name}`);
                if (response.ok && !confirm(`"${file.name}" already exists, replace it?`)) continue;
                newFiles.push(file);
            } catch {
                newFiles.push(file);
            }
        }
        return newFiles;
    }

    /**
     * 生成默认的文件内容 - 统一实现
     */
    static generateDefaultContent(filename) {
        // 获取当前时间格式化字符串
        const currentTime = moment ? moment().format('YYYY-MM-DD HH:mm:ss') : new Date().toISOString();
        
        // 根据文件名决定标题
        const titleName = filename === 'cache' ? filename : filename.replace('.md', '');
        
        // 返回默认的文件头部
        return `---
title: ${titleName}
date: ${currentTime}
categories:
    - [Category / 分类]
tags:
    - Tag / 标签
---`;
    }

    /**
     * 统一的错误处理 - 统一实现
     */
    static handleError(error, context = '') {
        const message = error.message || error.toString();
        console.error(`${context ? context + ': ' : ''}${message}`, error);
        
        // 根据错误类型提供更友好的提示
        let userMessage = message;
        if (message.includes('Network')) {
            userMessage = '网络连接失败，请检查网络连接';
        } else if (message.includes('timeout')) {
            userMessage = '操作超时，请重试';
        } else if (message.includes('permission')) {
            userMessage = '权限不足，请检查文件权限';
        }
        
        return userMessage;
    }

    /**
     * 统一的成功提示 - 统一实现
     */
    static showSuccess(message) {
        console.log(`✅ ${message}`);
        // 可以在这里添加更多的成功提示逻辑，比如显示通知
    }

    /**
     * 统一的加载提示 - 统一实现
     */
    static showLoading(message) {
        console.log(`⏳ ${message}`);
        // 可以在这里添加加载动画逻辑
    }

    /**
     * 延迟执行 - 工具方法
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 防抖函数 - 工具方法
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 节流函数 - 工具方法
     */
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CommonUtils;
} else {
    window.CommonUtils = CommonUtils;
}