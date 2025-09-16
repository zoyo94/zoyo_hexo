/**
 * 拖拽上传处理器
 * 支持图片、视频、MD文件和文件夹的拖拽上传
 */

export class DragDropHandler {
    constructor() {
        this.isDragOver = false;
        this.init();
    }

    init() {
        // 获取编辑器容器
        this.editorContainer = document.getElementById('root');
        if (!this.editorContainer) {
            console.warn('编辑器容器未找到，拖拽功能可能无法正常工作');
            return;
        }

        this.setupDragDropEvents();
        this.addDragDropStyles();
    }

    addDragDropStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .drag-over {
                border: 2px dashed #ff6f61 !important;
                background-color: rgba(255, 111, 97, 0.1) !important;
                position: relative;
            }
            
            .drag-over::after {
                content: "拖拽图片、视频、MD文件或文件夹到此处上传";
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: #ff6f61;
                padding: 20px 30px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                z-index: 10000;
                pointer-events: none;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(10px);
            }
        `;
        document.head.appendChild(style);
    }

    setupDragDropEvents() {
        // 阻止默认的拖拽行为
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // 拖拽进入
        document.addEventListener('dragenter', (e) => {
            if (this.hasFiles(e)) {
                this.isDragOver = true;
                this.editorContainer.classList.add('drag-over');
            }
        });

        // 拖拽悬停
        document.addEventListener('dragover', (e) => {
            if (this.hasFiles(e)) {
                this.isDragOver = true;
                this.editorContainer.classList.add('drag-over');
            }
        });

        // 拖拽离开
        document.addEventListener('dragleave', (e) => {
            // 检查是否真的离开了编辑器区域
            if (!this.editorContainer.contains(e.relatedTarget)) {
                this.isDragOver = false;
                this.editorContainer.classList.remove('drag-over');
            }
        });

        // 文件放置
        document.addEventListener('drop', async (e) => {
            this.isDragOver = false;
            this.editorContainer.classList.remove('drag-over');

            if (this.hasFiles(e)) {
                await this.handleFileDrop(e);
            }
        });
    }

    hasFiles(e) {
        return e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files');
    }

    async handleFileDrop(e) {
        const items = Array.from(e.dataTransfer.items);
        const files = [];
        const folders = [];

        // 处理拖拽的项目
        for (const item of items) {
            if (item.kind === 'file') {
                const entry = item.webkitGetAsEntry();
                if (entry) {
                    if (entry.isFile) {
                        const file = item.getAsFile();
                        files.push(file);
                    } else if (entry.isDirectory) {
                        folders.push(entry);
                    }
                }
            }
        }

        // 处理文件
        if (files.length > 0) {
            await this.processFiles(files);
        }

        // 处理文件夹
        if (folders.length > 0) {
            await this.processFolders(folders);
        }
    }

    async processFiles(files) {
        const imageFiles = [];
        const videoFiles = [];
        const mdFiles = [];
        const otherFiles = [];

        // 分类文件
        files.forEach(file => {
            const fileType = file.type;
            const fileName = file.name.toLowerCase();

            if (fileType.startsWith('image/')) {
                imageFiles.push(file);
            } else if (fileType.startsWith('video/')) {
                videoFiles.push(file);
            } else if (fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
                mdFiles.push(file);
            } else {
                otherFiles.push(file);
            }
        });

        // 处理图片和视频文件
        if (imageFiles.length > 0 || videoFiles.length > 0) {
            const mediaFiles = [...imageFiles, ...videoFiles];
            await this.uploadMediaFiles(mediaFiles);
        }

        // 处理MD文件
        if (mdFiles.length > 0) {
            await this.processMdFiles(mdFiles);
        }

        // 处理其他文件
        if (otherFiles.length > 0) {
            window.showMessage(`跳过了 ${otherFiles.length} 个不支持的文件类型`, 'warning');
        }
    }

    async uploadMediaFiles(files) {
        try {
            window.showMessage(`正在上传 ${files.length} 个媒体文件...`, 'info');
            
            // 使用状态管理系统获取当前媒体文件夹
            const destination = window.appState.getCurrentMediaFolder();
            
            const result = await window.fileManager.handleImageUpload(files, destination);
            
            if (result.success) {
                // 插入到编辑器
                if (window.insertEditorContent) {
                    window.insertEditorContent(result.markdown);
                }
                window.showMessage(`✅ ${files.length} 个媒体文件上传成功`, 'success');
                
                // 更新状态
                if (window.appState) {
                    window.appState.onStateChange();
                }
            } else {
                window.showMessage(`❌ 媒体文件上传失败: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('媒体文件上传失败:', error);
            window.showMessage(`❌ 媒体文件上传异常: ${error.message}`, 'error');
        }
    }

    async processMdFiles(files) {
        if (files.length > 0) {
            window.showMessage(`正在导入 ${files.length} 个MD文件...`, 'info');
            for (const file of files) {
                // 调用全局的单个MD文件导入函数
                await window.handleSingleMdFileImport(file);
            }
        }
    }

    async processFolders(folders) {
        for (const folder of folders) {
            try {
                window.showMessage(`正在处理文件夹: ${folder.name}...`, 'info');
                const files = await this.readFolderRecursively(folder);
                
                if (files.length > 0) {
                    // 调用全局的文件夹上传核心函数
                    const result = await window.handleFolderUploadCore(files);
                    
                    if (result && result.success) {
                        window.showMessage(`✅ 文件夹 ${folder.name} 上传成功，包含 ${files.length} 个文件`, 'success');
                    } else if (result) {
                        window.showMessage(`❌ 文件夹 ${folder.name} 上传失败: ${result.message}`, 'error');
                    } else {
                        window.showMessage(`❌ 文件夹 ${folder.name} 上传失败: 未知错误`, 'error');
                    }
                } else {
                    window.showMessage(`文件夹 ${folder.name} 为空`, 'warning');
                }
            } catch (error) {
                console.error(`处理文件夹 ${folder.name} 失败:`, error);
                window.showMessage(`❌ 处理文件夹 ${folder.name} 失败: ${error.message}`, 'error');
            }
        }
    }

    async readFolderRecursively(folderEntry) {
        const files = [];
        
        const readEntries = (dirReader) => {
            return new Promise((resolve, reject) => {
                dirReader.readEntries(resolve, reject);
            });
        };

        const processEntry = async (entry) => {
            if (entry.isFile) {
                return new Promise((resolve, reject) => {
                    entry.file(resolve, reject);
                });
            } else if (entry.isDirectory) {
                const dirReader = entry.createReader();
                const entries = await readEntries(dirReader);
                const subFiles = [];
                
                for (const subEntry of entries) {
                    const result = await processEntry(subEntry);
                    if (Array.isArray(result)) {
                        subFiles.push(...result);
                    } else if (result) {
                        subFiles.push(result);
                    }
                }
                
                return subFiles;
            }
        };

        const result = await processEntry(folderEntry);
        if (Array.isArray(result)) {
            files.push(...result);
        } else if (result) {
            files.push(result);
        }

        return files;
    }

    async readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('文件读取失败'));
            reader.readAsText(file, 'UTF-8');
        });
    }
}

// 导出到全局
window.DragDropHandler = DragDropHandler;