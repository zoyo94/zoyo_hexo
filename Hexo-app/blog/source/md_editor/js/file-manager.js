/**
 * 文件管理模块
 * 处理文件上传、编码和特殊字符问题
 */

class FileManager {
    constructor(config) {
        this.config = config;
        this.state = {
            currentFilename: 'cache',
            destination: '',
            canceledFolders: new Set(JSON.parse(localStorage.getItem('canceledFolders') || '[]'))
        };
    }

    /**
     * 安全化文件名，处理中文和特殊字符 - 使用通用工具类
     */
    sanitizeFilename(filename) {
        return CommonUtils.sanitizeFilename(filename);
    }

    /**
     * 生成 Markdown 图片链接，处理特殊字符和中文路径 - 使用通用工具类
     */
    generateMarkdownImage(altText, imagePath) {
        return CommonUtils.generateMarkdownImage(altText, imagePath);
    }

    /**
     * 检查文件是否存在 - 使用通用工具类
     */
    async checkFileExists(filePath) {
        return CommonUtils.checkFileExists(filePath);
    }

    /**
     * 获取后端服务器地址 - 已弃用，改用 apiService
     */
    getBackendUrl() {
        return window.apiService ? '' : CommonUtils.getBackendUrl();
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
            const data = await window.apiService.custom(endpoint, {
                method: 'POST',
                body: formData
            });

            // 添加一个1秒的延迟，以确保编辑器有足够的时间来加载新上传的文件
            await new Promise(resolve => setTimeout(resolve, 1000));

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
     * 处理图片上传
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
                markdown += '\n' + this.generateMarkdownImage(altText, path);
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
    async handleFolderUpload(files, folderName) {
        try {
            console.log('上传文件夹:', folderName, '文件数量:', files.length);
            
            const data = await this.uploadFiles(files, '/upload-folder', {
                key: 'files',
                extraData: { folderName: folderName }
            });
            
            console.log('文件夹上传成功:', data);
            
            return {
                success: true,
                folderName: data.folderName || folderName,
                filePaths: data.filePaths,
                filenames: data.filenames,
                data: data
            };
        } catch (error) {
            console.error('文件夹上传失败:', error);
            throw error;
        }
    }

    /**
     * 读取文件内容 - 使用通用工具类
     */
    async readFileContent(file) {
        return CommonUtils.readFileAsText(file);
    }

    /**
     * 保存文件内容
     */
    async saveContent(filename, directory, content) {
        try {
            const data = await window.apiService.saveMd({
                destination: directory,
                filename: filename,
                currentContent: content || ''
            });

            console.log(`文件保存成功: ${filename}`);
            return data;
        } catch (error) {
            console.error(`文件保存失败: ${filename}`, error);
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

            const data = await window.apiService.createFolder(formData);

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
        try {
            const data = await window.apiService.getDirectoryTree(directory);
            console.log(`获取目录树成功: ${directory}`);
            return data;
        } catch (error) {
            console.error(`获取目录树失败: ${directory}`, error);
            throw error;
        }
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

            const data = await window.apiService.custom('/move_image', {
                method: 'POST',
                body: formData
            });

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

            const response = await window.apiService.tgzDownload(formData);

            // 导出成功后触发自动保存
            if (window.state && typeof window.autoSave === 'function') {
                window.state.hasContentChanged = true;
                window.autoSave();
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
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileManager;
} else {
    window.FileManager = FileManager;
}