/**
 * 文件管理模块
 * 处理文件上传、读取、保存、目录获取等操作
 * 所有网络请求通过 API 服务层完成
 */

import { API, getBaseUrl } from '../services/api.js';

export class FileManager {
    constructor(config) {
        this.config = config;
        this.state = {
            currentFilename: 'cache',
            destination: '',
            canceledFolders: new Set(JSON.parse(localStorage.getItem('canceledFolders') || '[]'))
        };
        // 防止并发重复请求同一目录
        this._ongoingFetches = new Map();
    }

    // ─────────────────────────────────────────────
    // 工具方法
    // ─────────────────────────────────────────────

    /**
     * 生成 Markdown 图片/视频链接
     */
    generateMarkdownImage(altText, imagePath) {
        let fullImagePath;
        if (imagePath.includes('/')) {
            fullImagePath = `./${imagePath}`;
        } else {
            const folder = window.appState ? window.appState.getCurrentMediaFolder() : 'IMG';
            fullImagePath = imagePath.startsWith(folder)
                ? `./${folder}/${imagePath.substring(folder.length)}`
                : `./${folder}/${imagePath}`;
        }

        const cleanAlt = altText.replace(/[[\]()]/g, '');
        const ext = imagePath.toLowerCase().split('.').pop();
        const videoExts = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv'];

        return videoExts.includes(ext)
            ? `<video src="${fullImagePath}" controls="controls" width="500" height="300"></video>`
            : `![${cleanAlt}](${fullImagePath})`;
    }

    /**
     * transformMarkdownContent - 后端已处理路径，前端直接透传
     */
    transformMarkdownContent(content) {
        return content;
    }

    /**
     * 标准化目录路径（去除多余的 './' 前缀）
     */
    normalizeDirectoryPath(p) {
        if (!p) return '.';
        let n = p.replace(/\\/g, '/');
        if (n.startsWith('./') && n.length > 2) n = n.slice(2);
        else if (n === './') n = '.';
        return n || '.';
    }

    // ─────────────────────────────────────────────
    // 上传
    // ─────────────────────────────────────────────

    /**
     * 通用文件上传方法
     */
    async _upload(files, endpoint, { key = 'file', extraData = {} } = {}) {
        const form = new FormData();
        const arr = Array.isArray(files) ? files : [files];
        arr.forEach(f => form.append(key, f));
        Object.entries(extraData).forEach(([k, v]) => form.append(k, v));

        const response = await fetch(`${getBaseUrl()}${endpoint}`, { method: 'POST', body: form });
        if (!response.ok) throw new Error(`上传失败 HTTP ${response.status}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.message || '上传失败');
        return data;
    }

    /**
     * 上传 Markdown 文件
     */
    async handleMdFileUpload(file) {
        // 重复上传检查
        if (window.cacheManager) {
            const { canUpload, message } = await window.cacheManager.canUploadFile(file);
            if (!canUpload) throw new Error(message);
        }

        const data = await this._upload(file, '/upload', { key: 'md_file' });
        window.cacheManager?.addToCache(file, data);

        const content = await this._readLocalFile(file);
        return { success: true, filename: data.filename, originalName: data.originalName || file.name, content, data };
    }

    /**
     * 上传图片/视频
     */
    async handleImageUpload(files, destination) {
        if (window.cacheManager) {
            for (const f of files) {
                const { canUpload, message } = await window.cacheManager.canUploadFile(f);
                if (!canUpload) throw new Error(`文件 ${f.name}: ${message}`);
            }
        }

        const data = await this._upload(files, '/upimg', { key: 'image', extraData: { destination } });
        files.forEach(f => window.cacheManager?.addToCache(f, data));

        let markdown = '';
        data.imagePaths.forEach((p, i) => {
            const name = (data.originalNames?.[i] ?? data.filenames[i]).split('.')[0];
            markdown += '\n' + this.generateMarkdownImage(name, p);
        });

        return { success: true, markdown, imagePaths: data.imagePaths, filenames: data.filenames, data };
    }

    /**
     * 分类文件夹中的文件（识别主 MD 文件和子文件）
     */
    _categorizeFolderFiles(files) {
        let mdFile = null;
        const subFiles = [];
        let folderName = '';

        for (const file of files) {
            const parts = file.webkitRelativePath.split('/');
            if (parts.length >= 2 && parts[parts.length - 1].endsWith('.md')) {
                const curFolder = parts[0];
                const mdBase = parts[parts.length - 1].replace(/\.md$/, '');
                if (mdBase === curFolder || mdFile === null) {
                    if (mdFile) subFiles.push(mdFile); // 旧的降级为子文件
                    mdFile = file;
                    folderName = curFolder;
                } else {
                    subFiles.push(file);
                }
            } else {
                subFiles.push(file);
            }
        }

        // 兜底：从子文件中挑一个 MD 文件
        if (!mdFile) {
            const first = subFiles.find(f => f.name.endsWith('.md'));
            if (first) {
                subFiles.splice(subFiles.indexOf(first), 1);
                mdFile = first;
                folderName = first.webkitRelativePath.split('/')[0];
            }
        }

        return { mdFile, subFiles, folderName };
    }

    /**
     * 上传整个文件夹
     */
    async handleFolderUpload(files) {
        let folderName = '';
        try {
            const { mdFile, subFiles, folderName: detected } = this._categorizeFolderFiles(files);
            folderName = detected;
            if (!mdFile) throw new Error('文件夹中未找到 Markdown 文件');

            const mdResult = await this.handleMdFileUpload(mdFile);

            if (subFiles.length > 0) {
                const newFolder = mdResult.filename.replace(/\.md$/, '');
                const subResult = await this._upload(subFiles, '/upload-folder', {
                    key: 'files',
                    extraData: { folderName: newFolder }
                });
                const dest = (subResult.destination || '').replace(/^\.\//, '').replace(/\/$/, '');
                if (dest) folderName = dest;
            }

            return { success: true, folderName, mdFilename: mdResult.filename, mdContent: mdResult.content };
        } catch (error) {
            console.error('[FileManager] 文件夹上传失败:', error);
            return { success: false, message: error.message, folderName };
        }
    }

    // ─────────────────────────────────────────────
    // 读取 / 保存
    // ─────────────────────────────────────────────

    /**
     * 读取本地文件内容（FileReader）
     */
    _readLocalFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsText(file, 'UTF-8');
        });
    }

    /**
     * 从后端获取文件内容
     */
    async fetchFileContent(filePath) {
        try {
            const lastSlash = filePath.lastIndexOf('/');
            const directory = lastSlash !== -1 ? filePath.substring(0, lastSlash) : '.';
            const filename = lastSlash !== -1 ? filePath.substring(lastSlash + 1) : filePath;

            const result = await API.getMarkdownFile(directory, filename);
            if (result.success) return result.content;
            throw new Error(result.message || '文件内容获取失败');
        } catch (error) {
            console.error('[FileManager] fetchFileContent 失败:', error);
            window.showMessage?.(`读取文件失败: ${error.message}`, 'error');
            return '';
        }
    }

    /**
     * 保存文件内容
     */
    async saveContent(filename, content, isAuto = false, directory = '.', oldFilename = null) {
        if (isAuto && !window.state?.hasContentChanged) {
            return { success: true, message: '内容未变化，跳过自动保存' };
        }

        const hasImages = /!\[.*?\]\(.*?\)/g.test(content) || /<video[^>]*src="[^"]*"[^>]*>/g.test(content);

        try {
            const data = await API.saveMarkdownFile({ 
                destination: directory, 
                filename, 
                currentContent: content || '', 
                hasImages,
                oldFilename
            });
            if (!data.success) throw new Error(data.message || '保存失败');
            console.log(`[FileManager] ${isAuto ? '自动' : '手动'}保存成功: ${filename}`);
            return data;
        } catch (error) {
            console.error(`[FileManager] ${isAuto ? '自动' : '手动'}保存失败: ${filename}`, error);
            throw error;
        }
    }

    /**
     * 清空 cache 文件
     */
    async clearCache() {
        const result = await this.saveContent('cache', '', false, '.');
        if (result?.success) {
            console.log('[FileManager] cache 文件已清空');
            return { success: true, message: 'cache 文件已清空' };
        }
        throw new Error('清空 cache 文件失败');
    }

    // ─────────────────────────────────────────────
    // 目录 / 文件夹操作
    // ─────────────────────────────────────────────

    /**
     * 获取目录树（自动去重并发请求）
     */
    async fetchDirectoryTree(directory) {
        const norm = this.normalizeDirectoryPath(directory);

        if (this._ongoingFetches.has(norm)) {
            return this._ongoingFetches.get(norm);
        }

        const promise = (async () => {
            try {
                const raw = await API.getDirectoryTree(norm);
                const files = [];
                const folders = [];
                (raw.children || []).forEach(item => {
                    const entry = { name: item.name, path: `${norm}/${item.name}` };
                    if (item.type === 'file') files.push(entry);
                    else if (item.type === 'directory') folders.push(entry);
                });
                return { files, folders, rawData: raw };
            } finally {
                this._ongoingFetches.delete(norm);
            }
        })();

        this._ongoingFetches.set(norm, promise);
        return promise;
    }

    /**
     * 创建文件夹
     */
    async createFolder(folderName, parentPath = './') {
        const data = await API.createFolder(folderName, parentPath);
        if (!data.success) throw new Error(data.message || '文件夹创建失败');
        console.log(`[FileManager] 文件夹创建成功: ${folderName}`);
        return data;
    }

    /**
     * 移动图片/视频
     */
    async moveImage(fileName, fromFolder, toFolder, originalDir) {
        const data = await API.moveImage(fileName, fromFolder, toFolder, originalDir);
        if (!data.success) throw new Error(data.message || '图片移动失败');
        console.log(`[FileManager] 图片移动成功: ${fileName} → ${toFolder}`);
        return data;
    }

    // ─────────────────────────────────────────────
    // Getter / Setter
    // ─────────────────────────────────────────────

    getCurrentFilename() { return this.state.currentFilename; }
    setCurrentFilename(v) { this.state.currentFilename = v; }
    getDestination() { return this.state.destination; }
    setDestination(v) { this.state.destination = v; }
    getCanceledFolders() { return this.state.canceledFolders; }
    addCanceledFolder(name) {
        this.state.canceledFolders.add(name);
        localStorage.setItem('canceledFolders', JSON.stringify([...this.state.canceledFolders]));
    }
}
