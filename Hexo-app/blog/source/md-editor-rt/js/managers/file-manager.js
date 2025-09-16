/**
 * 文件管理模块
 * 处理文件上传、编码和特殊字符问题
 */

export class FileManager {
    constructor(config) {
        this.config = config;
        this.state = {
            currentFilename: 'cache',
            destination: '',
            canceledFolders: new Set(JSON.parse(localStorage.getItem('canceledFolders') || '[]'))
        };
        this.ongoingFetches = new Map(); // 用于存储正在进行的 fetch 请求，防止重复
    }

    /**
     * 安全化文件名，处理中文和特殊字符
     */
    sanitizeFilename(filename) {
        if (!filename) return '';
        
        const lastDotIndex = filename.lastIndexOf('.');
        const name = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
        const ext = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';
        
        // 处理文件名：替换空格和特殊字符，保留中文
        let safeName = name
            .replace(/\\s+/g, '_')  // 空格替换为下划线
            .replace(/[<>:"/\\|?*]/g, '_')  // 替换Windows不允许的字符
            .replace(/[.]{2,}/g, '_')  // 连续的点替换为下划线
            .replace(/^[._-]+|[._-]+$/g, '');  // 移除开头和结尾的特殊字符
        
        if (!safeName) {
            safeName = `file_${Date.now()}`;
        }
        
        return safeName + ext;
    }

    /**
     * 生成 Markdown 图片链接，处理特殊字符和中文路径
     */
    generateMarkdownImage(altText, imagePath) {
        // 简化路径生成：检查后端返回的路径格式
        let fullImagePath;
        if (imagePath.includes('/')) {
            // 如果路径已经包含分隔符，直接添加 ./ 前缀
            fullImagePath = `./${imagePath}`;
        } else {
            // 获取当前媒体文件夹
            const currentMediaFolder = window.appState ? window.appState.getCurrentMediaFolder() : 'IMG';
            
            // 检查imagePath是否已经包含文件夹名
            if (imagePath.startsWith(currentMediaFolder)) {
                // 如果已经包含文件夹名，需要分离出纯文件名
                const fileName = imagePath.substring(currentMediaFolder.length);
                fullImagePath = `./${currentMediaFolder}/${fileName}`;
            } else {
                // 如果是纯文件名，直接组合
                fullImagePath = `./${currentMediaFolder}/${imagePath}`;
            }
        }
        
        // 清理 alt 文本，移除可能影响 Markdown 的字符
        const cleanAltText = altText.replace(/[\\[\\]]/g, '').replace(/[()]/g, '');
        
        // 检查文件扩展名，如果是视频文件则生成视频标签
        const fileExtension = imagePath.toLowerCase().split('.').pop();
        const videoExtensions = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv'];
        
        if (videoExtensions.includes(fileExtension)) {
            // 生成视频标签，格式：<video src="./IMG/filename.MP4" controls="controls" width="500" height="300"></video>
            return `<video src="${fullImagePath}" controls="controls" width="500" height="300"></video>`;
        } else {
            // 生成图片标签
            return `![${cleanAltText}](${fullImagePath})`;
        }
    }

    /**
     * 转换 Markdown 内容中的图片和视频路径
     * @param {string} markdownContent - 原始 Markdown 内容
     * @returns {string} 转换后的 Markdown 内容
     */
    transformMarkdownContent(markdownContent) {
        // 后端现在处理所有媒体文件路径转换，前端不再需要进行此操作
        return markdownContent;
    }

    /**
     * 检查文件是否存在
     */
    async checkFileExists(filePath) {
        try {
            const response = await fetch(filePath, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }
    /**
     * 获取后端服务器地址
     */
    // 直接使用全局的 window.BACKEND_URL
    getBackendUrl() {
        return window.BACKEND_URL;
    }
    /**
     * 上传文件的通用方法
     */
    async uploadFiles(files, endpoint, options = {}) {
        const formData = new FormData();
        
        // 添加文件
        if (Array.isArray(files)) {
            files.forEach(file => formData.append(options.key || 'file', file));
        } else {
            formData.append(options.key || 'file', files);
        }        
        // 添加额外数据
        if (options.extraData) {
            Object.entries(options.extraData).forEach(([key, value]) => {
                formData.append(key, value);
            });
        }
        
        try {
            const backendUrl = this.getBackendUrl();
            const response = await fetch(`${backendUrl}${endpoint}`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || '上传失败');
            }

            return data;
        } catch (error) {
            console.error('上传失败:', error);
            throw error;
        }
    }
    /**
     * 处理 MD 文件上传
     */
    async handleMdFileUpload(file) {
        try {
            console.log('上传MD文件:', file.name);
            
            // 检查缓存管理器是否可以上传
            if (window.cacheManager) {
                const canUpload = await window.cacheManager.canUploadFile(file);
                if (!canUpload.canUpload) {
                    throw new Error(canUpload.message);
                }
            }
            
            const data = await this.uploadFiles(file, '/upload', { 
                key: 'md_file' 
            });
            
            console.log('MD文件上传成功:', data);
            
            // 添加到缓存
            if (window.cacheManager) {
                window.cacheManager.addToCache(file, data);
            }
            
            // 读取文件内容
            const content = await this.readFileContent(file);
            
            return {
                success: true,
                filename: data.filename,
                originalName: data.originalName || file.name,
                content: content,
                data: data
            };
        } catch (error) {
            console.error('MD文件上传失败:', error);
            throw error;
        }
    }
    /**
     * 处理图片和视频上传
     */
    async handleImageUpload(files, destination) {
        try {
            console.log('上传图片文件:', files.map(f => f.name));
            
            // 检查每个文件是否可以上传
            if (window.cacheManager) {
                for (const file of files) {
                    const canUpload = await window.cacheManager.canUploadFile(file);
                    if (!canUpload.canUpload) {
                        throw new Error(`文件 ${file.name}: ${canUpload.message}`);
                    }
                }
            }
            
            const data = await this.uploadFiles(files, '/upimg', {
                key: 'image',
                extraData: { destination: destination }
            });
            
            console.log('图片上传成功:', data);
            
            // 添加到缓存
            if (window.cacheManager) {
                files.forEach(file => {
                    window.cacheManager.addToCache(file, data);
                });
            }
            
            // 生成 Markdown 内容
            let markdown = '';
            data.imagePaths.forEach((path, index) => {
                const originalName = data.originalNames ? data.originalNames[index] : data.filenames[index];
                const altText = originalName.split('.')[0];
                markdown += '\n' + this.generateMarkdownImage(altText, path); // 修正此处，使用 
                
            });
            
            return {
                success: true,
                markdown: markdown,
                imagePaths: data.imagePaths,
                filenames: data.filenames,
                data: data
            };
        } catch (error) {
            console.error('图片上传失败:', error);
            throw error;
        }
    }
    /**
     * 处理文件夹上传
     */
    /**
     * 分类文件夹中的文件
     * @param {File[]} files - 文件列表
     * @returns {Object} 分类后的文件对象 { mdFile: File, subFiles: File[], folderName: string }
     */
    categorizeFolderFiles(files) {
        let mdFile = null;
        const subFiles = [];
        let folderName = '';

        for (const file of files) {
            const parts = file.webkitRelativePath.split('/');
            // 检查是否是文件夹根目录下的MD文件，且文件名与文件夹名匹配 (e.g., folder/folder.md)
            // 或者只是一个MD文件在根目录下 (e.g., folder/some.md)
            // 优先匹配与文件夹同名的MD文件
            if (parts.length >= 2 && parts[parts.length - 1].endsWith('.md')) {
                const currentFolderName = parts[0];
                const mdFilenameWithoutExt = parts[parts.length - 1].replace(/\.md$/, '');
                // 如果是与文件夹同名的MD文件，或者这是第一个找到的MD文件
                if (mdFilenameWithoutExt === currentFolderName || mdFile === null) {
                    mdFile = file;
                    folderName = currentFolderName;
                } else {
                    // 其他MD文件也作为子文件处理
                    subFiles.push(file);
                }
            } else {
                subFiles.push(file);
            }
        }
        
        // Fallback: If no specific mdFile found, but there are MD files in subFiles, pick the first one
        if (!mdFile && subFiles.length > 0) {
            const firstMdInSub = subFiles.find(f => f.name.endsWith('.md'));
            if (firstMdInSub) {
                mdFile = firstMdInSub;
                // Remove it from subFiles
                const index = subFiles.indexOf(firstMdInSub);
                if (index > -1) {
                    subFiles.splice(index, 1);
                }
                folderName = firstMdInSub.webkitRelativePath.split('/')[0];
            }
        }

        return { mdFile, subFiles, folderName };
    }

    /**
     * 处理文件夹上传
     * @param {File[]} files - 文件列表
     * @returns {Promise<Object>} 上传结果
     */
    async handleFolderUpload(files) {
        let folderName = ''; // Initialize here to ensure it's always defined

        try {
            console.log('开始处理文件夹上传，文件数量:', files.length);

            const { mdFile, subFiles, folderName: detectedFolderName } = this.categorizeFolderFiles(files);
            folderName = detectedFolderName; // Assign here

            if (!mdFile) {
                throw new Error('文件夹中未找到 Markdown 文件。');
            }

            // 1. 上传主 Markdown 文件
            console.log('上传主MD文件:', mdFile.name);
            const mdResult = await this.handleMdFileUpload(mdFile); // Use existing handleMdFileUpload

            // 2. 上传子文件到以MD文件命名的文件夹
            if (subFiles.length > 0) {
                const newFolderName = mdResult.filename.replace(/\.md$/, ''); // Use the uploaded MD filename
                console.log(`上传子文件到文件夹: ${newFolderName}, 数量: ${subFiles.length}`);
                const subFilesResult = await this.uploadFiles(subFiles, '/upload-folder', {
                    key: 'files',
                    extraData: { folderName: newFolderName }
                });
                console.log('子文件上传成功:', subFilesResult);
                // 从 subFilesResult.destination 中提取最终的文件夹名称
                let finalFolderName = subFilesResult.destination.replace(/^\.\//, '').replace(/\/$/, '');
                if (finalFolderName) {
                    folderName = finalFolderName; // 更新要返回的 folderName
                }
            }

            console.log('文件夹处理完成:', folderName);
            return {
                success: true,
                folderName: folderName, // 这将是来自 subFilesResult.destination 的名称（如果可用）
                mdFilename: mdResult.filename,
                mdContent: mdResult.content
            };
        } catch (error) {
            console.error('文件夹上传处理失败:', error);
            return { success: false, message: error.message, folderName: folderName }; // Ensure folderName is returned even on error
        }
    }
    /**
     * 检查并标准化目录路径
     * @param {string} path - 原始路径
     * @returns {string} 标准化后的路径
     */
    normalizeDirectoryPath(path) {
        if (!path) return '.';
        let normalized = path.replace(/\\/g, '/'); // 将反斜杠替换为正斜杠
       
        if (normalized.startsWith('./') && normalized.length > 2) {
            normalized = normalized.substring(2); // 移除 './' 前缀
            
        } else if (normalized === './') {
            normalized = '.'; // 将 './' 标准化为 '.'
            
        }
        if (normalized === '') {
            normalized = '.';
        }
        
        return normalized;
    }

    /**
     * 读取文件内容
     */
    async fetchFileContent(filePath) {
        try {
            let directory = '.';
            let filename = filePath;

            // 检查 filePath 是否包含路径信息
            const lastSlashIndex = filePath.lastIndexOf('/');
            if (lastSlashIndex !== -1) {
                directory = filePath.substring(0, lastSlashIndex);
                filename = filePath.substring(lastSlashIndex + 1);
            }
            const backendUrl = this.getBackendUrl();
            const response = await fetch(`${backendUrl}/get_md?directory=${encodeURIComponent(directory)}&filename=${encodeURIComponent(filename)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
                        const result = await response.json(); // Expect JSON response

            if (result.success) {
                return result.content;
            } else {
                throw new Error(result.message || '文件内容获取失败');
            }
        } catch (error) {
            console.error('Error fetching file content:', error);
            window.showMessage(`读取文件失败: ${error.message}`, 'error');
            return '';
        }
    }
    /**
     * 读取本地文件内容 (用于文件选择器)
     */
    async readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('文件读取失败'));
            reader.readAsText(file, 'UTF-8');
        });
    }
    /**
     * 保存文件内容
     */
    async saveContent(filename, content, isAuto = false, directory = '.') {
        try {
            // 如果是自动保存且内容没有变化，跳过保存
            if (isAuto && !window.state.hasContentChanged) {
                return { success: true, message: '内容未变化，跳过自动保存' };
            }
            
            // 检查原始内容是否包含图片或视频（使用原项目的检测逻辑）
            const imageMatches = content.match(/!\\[.*?\\]\\(.*?\\)/g);
            const videoMatches = content.match(/<video[^>]*src=\"[^\"]*\"[^>]*>/g);
            const hasImages = !!(imageMatches || videoMatches);
            
            
            const backendUrl = this.getBackendUrl();
            const response = await fetch(`${backendUrl}/save_md`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    destination: directory, 
                    filename: filename, 
                    currentContent: content || '', // 直接使用原始内容
                    hasImages: hasImages
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
                        const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || '保存失败');
            }
                        if (isAuto) {
                console.log(`自动保存成功: ${filename}`);
            } else {
                console.log(`文件保存成功: ${filename}`);
            }
            return data;
        } catch (error) {
            if (isAuto) {
                console.error(`自动保存失败: ${filename}`, error);
            } else {
                console.error(`文件保存失败: ${filename}`, error);
            }
            throw error;
        }
    }
    /**
     * 创建文件夹
     */
    async createFolder(folderName, parentPath = './') {
        try {
            const formData = new FormData();
            formData.append('folderName', folderName);
            formData.append('folderPath', parentPath);
            const backendUrl = this.getBackendUrl();
            const response = await fetch(`${backendUrl}/create_folder`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
                        const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || '文件夹创建失败');
            }
            console.log(`文件夹创建成功: ${folderName}`);
            return data;
        } catch (error) {
            console.error(`文件夹创建失败: ${folderName}`, error);
            throw error;
        }
    }
    /**
     * 获取目录树
     */
    async fetchDirectoryTree(directory) {
        // 标准化目录路径
        const normalizedDirectory = this.normalizeDirectoryPath(directory);

        // 如果该目录的请求正在进行中，则返回现有 Promise
        if (this.ongoingFetches.has(normalizedDirectory)) {
            return this.ongoingFetches.get(normalizedDirectory);
        }

        const fetchPromise = (async () => {
            try {
                const backendUrl = this.getBackendUrl();
                const response = await fetch(`${backendUrl}/directory-tree?directory=${encodeURIComponent(normalizedDirectory)}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                                const rawData = await response.json(); // 重命名为 rawData
                console.log(`获取目录树成功: ${normalizedDirectory}`, rawData); // 使用标准化后的路径进行日志记录
                const files = [];
                const folders = [];

                // 解析 rawData.children 数组，填充 files 和 folders
                if (Array.isArray(rawData.children)) {
                    rawData.children.forEach(item => {
                        if (item.type === 'file') {
                            files.push({ name: item.name, path: `${normalizedDirectory}/${item.name}` }); // 构建完整路径
                        } else if (item.type === 'directory') {
                            folders.push({ name: item.name, path: `${normalizedDirectory}/${item.name}` }); // 构建完整路径
                        }
                    });
                }
                // 返回包含 files 和 folders 属性的对象
                return { files, folders, rawData }; // 保留 rawData 以便调试
            } catch (error) {
                console.error(`获取目录树失败: ${normalizedDirectory}`, error);
                throw error;
            } finally {
                // 无论成功或失败，请求完成后从 ongoingFetches 中移除
                this.ongoingFetches.delete(normalizedDirectory);
            }
        })();

        // 将 Promise 存储起来
        this.ongoingFetches.set(normalizedDirectory, fetchPromise);
        return fetchPromise;
    }
    /**
     * 移动图片文件
     */
    async moveImage(fileName, fromFolder, toFolder, originalDir) {
        try {
            const formData = new FormData();
            formData.append('fileName', fileName);
            formData.append('folderName', fromFolder);
            formData.append('new_folderName', toFolder);
            formData.append('original_dir', originalDir);
            const backendUrl = this.getBackendUrl();
            const response = await fetch(`${backendUrl}/move_image`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
                        const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || '图片移动失败');
            }
            console.log(`图片移动成功: ${fileName} 从 ${fromFolder} 到 ${toFolder}`);
            return data;
        } catch (error) {
            console.error(`图片移动失败: ${fileName}`, error);
            throw error;
        }
    }
    /**
     * 导出压缩文件
     */
    async exportCompressed(directoryName, selectedFile, originalDir, markdownContent) {
        try {
            const formData = new FormData();
            formData.append('directoryName', directoryName);
            formData.append('selectedFile', selectedFile);
            formData.append('original_dir', originalDir);
            formData.append('markdownContent', markdownContent);
            const backendUrl = this.getBackendUrl();
            const response = await fetch(`${backendUrl}/tgz_download`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
                        return response;
        } catch (error) {
            console.error('导出失败:', error);
            throw error;
        }
    }
    // Getter 和 Setter 方法
    getCurrentFilename() {
        return this.state.currentFilename;
    }
    setCurrentFilename(filename) {
        this.state.currentFilename = filename;
    }
    getDestination() {
        return this.state.destination;
    }
    setDestination(destination) {
        this.state.destination = destination;
    }
    getCanceledFolders() {
        return this.state.canceledFolders;
    }
    addCanceledFolder(folderName) {
        this.state.canceledFolders.add(folderName);
        localStorage.setItem('canceledFolders', JSON.stringify([...this.state.canceledFolders]));
    }

    /**
     * 清空 cache 文件和 IMG 文件夹内容
     */
    async clearCache() {
        try {
            // 使用空内容保存cache文件，这样就清空了
            const emptyContent = '';
            const result = await this.saveContent('cache', emptyContent, false, '.');
            
            if (result && result.success) {
                console.log('cache文件已清空');
                return { success: true, message: 'cache文件已清空' };
            } else {
                throw new Error('清空cache文件失败');
            }
        } catch (error) {
            console.error(`清空缓存失败:`, error);
            throw error;
        }
    }
}