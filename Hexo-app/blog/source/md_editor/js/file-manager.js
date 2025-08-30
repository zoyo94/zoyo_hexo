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
     * 安全化文件名，处理中文和特殊字符
     */
    sanitizeFilename(filename) {
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
     * 生成 Markdown 图片链接，处理特殊字符和中文路径
     */
    generateMarkdownImage(altText, imagePath) {
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
    getBackendUrl() {
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

            // 添加一个3秒的延迟，以确保编辑器有足够的时间来加载新上传的文件
            await new Promise(resolve => setTimeout(resolve, 3000));

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
     * 读取文件内容
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
    async saveContent(filename, directory, content) {
        try {
            const formData = new FormData();
            formData.append('destination', directory);
            formData.append('filename', filename);
            formData.append('currentContent', content || '');

            const backendUrl = this.getBackendUrl();
            const response = await fetch(`${backendUrl}/save_md`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || '保存失败');
            }

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
        try {
            const backendUrl = this.getBackendUrl();
            const response = await fetch(`${backendUrl}/directory-tree?directory=${encodeURIComponent(directory)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
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
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileManager;
} else {
    window.FileManager = FileManager;
}