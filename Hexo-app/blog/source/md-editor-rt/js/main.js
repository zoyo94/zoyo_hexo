// ES 模块导入
import React from 'react';
import ReactDOMClient from 'react-dom/client';

// 自定义模块
import { API } from './services/api.js';
import { FileManager } from './managers/file-manager.js';
import { CacheManager } from './managers/cache-manager.js';
import { OperationsFloatingPanel } from './floating-panels/operations-panel.js';
import { SimpleCacheUI } from './floating-panels/cache-panel.js';
import { StatusFloatingPanel } from './floating-panels/status-panel.js';
import { DragDropHandler } from './drag-drop-handler.js';
import { App } from './components/EditorApp.js';

// 防止重复初始化
if (window.mdEditorRtAppInitialized) {
    console.warn('main.js 已经初始化，跳过第二次执行。');
} else {
    window.mdEditorRtAppInitialized = true;

    // 定义全局配置和状态
    window.CONFIG = {
        ORIGINAL_DIR: '.', // Hexo文章的实际目录，相对于后端WORK_DIR
    };

    window.state = {
        currentFilename: 'cache',
        destination: 'IMG', // Set default destination to IMG
        autoSaveIntervalSeconds: 3600, // 默认1小时自动保存
        remainingSeconds: 3600,
        autoSaveIntervalId: null,
        countdownIntervalId: null, // 倒计时更新器ID
        hasContentChanged: false,
        // 其他可能的状态，根据需要添加
    };

    // 全局状态管理系统
    window.appState = {
        currentFile: 'cache',
        currentMediaFolder: 'IMG',
        
        // 更新当前文件和对应的媒体文件夹
        updateCurrentFile(filename, mediaFolder = null) {
            const oldFile = this.currentFile;
            const oldFolder = this.currentMediaFolder;
            
            // 更新文件名 - cache文件不需要去掉.md后缀，因为它本身就没有
            if (filename === 'cache') {
                this.currentFile = 'cache';
            } else {
                this.currentFile = filename.replace(/\.md$/, '');
            }
            
            // 根据文件名自动设置媒体文件夹 (按照原项目的syncFolderWithMdFile逻辑)
            if (this.currentFile === 'cache') {
                this.currentMediaFolder = 'IMG';
            } else {
                // 如果明确提供了 mediaFolder，则使用它；否则默认使用 'IMG'
                this.currentMediaFolder = mediaFolder || 'IMG';
            }
            
            // 同步到FileManager
            window.fileManager.setCurrentFilename(filename);
            window.fileManager.setDestination(this.currentMediaFolder);
            
            // 触发联动更新
            if (oldFile !== this.currentFile || oldFolder !== this.currentMediaFolder) {
                this.onStateChange();
            }
            
            console.log(`状态更新: 文件=${this.currentFile}, 媒体文件夹=${this.currentMediaFolder}`);
        },
        
        // 同步文件夹选择器与MD文件选择 (按照原项目逻辑)
        async syncFolderWithMdFile() { // Make it async
            
            // 只有当 currentMediaFolder 是默认的 'IMG' 或者 currentFile 是 'cache' 时才执行自动同步逻辑
            // 如果已经明确设置了媒体文件夹（例如通过文件夹上传），则不应覆盖它
            if (this.currentMediaFolder !== 'IMG' && this.currentFile !== 'cache') {
                return; // 跳过自动同步
            }

            const selectedMdFile = this.currentFile;
            if (selectedMdFile && selectedMdFile !== '' && selectedMdFile !== 'cache') {
                // 获取MD文件名（去掉.md扩展名）
                const baseName = selectedMdFile.replace(/\.md$/, '');
                
                // 检查文件夹是否存在，如果存在则使用，否则使用IMG
                try {
                    // 假设 window.fileManager.fetchDirectoryTree 可以获取目录列表
                    const data = await window.fileManager.fetchDirectoryTree();
                    const folders = Array.isArray(data.folders) ? data.folders : [];
                    const folderExists = folders.some(folder => folder.name === baseName);

                    if (folderExists) {
                        this.currentMediaFolder = baseName;
                    } else {
                        // 文件夹不存在，保持为IMG
                        this.currentMediaFolder = 'IMG';
                    }
                } catch (error) {
                    console.error('Error checking folder existence:', error);
                    // 检查出错，回退到IMG
                    this.currentMediaFolder = 'IMG';
                }
            } else {
                // cache文件或空文件使用IMG文件夹
                this.currentMediaFolder = 'IMG';
            }
            
            // 同步到FileManager
            window.fileManager.setDestination(this.currentMediaFolder);
            this.onStateChange();
        },
        
        // 状态变化时的回调
        onStateChange() {
            // 更新状态面板显示
            if (window.statusPanel) {
                window.statusPanel.updateStatusPanel();
            }
            
            // 更新全局state对象
            window.state.currentFilename = this.currentFile;
            window.state.destination = this.currentMediaFolder;
        },
        
        // 获取当前状态
        getCurrentFile() {
            return this.currentFile;
        },
        
        getCurrentMediaFolder() {
            return this.currentMediaFolder;
        }
    };

    // 初始化管理器
    window.fileManager = new FileManager(window.CONFIG); 
    window.cacheManager = new CacheManager();

    // 初始化浮窗面板 (确保只初始化一次)
    window.simpleCacheUI = new SimpleCacheUI();
    window.operationsPanel = new OperationsFloatingPanel();
    window.statusPanel = new StatusFloatingPanel();

    // 初始化状态管理系统 - 在面板初始化后设置初始文件为 cache
    window.appState.updateCurrentFile('cache'); 

    // 辅助函数
    window.showMessage = (message, type = 'info') => {
        window.simpleCacheUI.showToast(message, type);
    };

    window.updateSelectorText = (selectorId, defaultText) => {
        // 状态面板中的选择器不再是原生的select元素，而是通过JS动态生成的
        // 这个函数可能不再直接使用，或者需要根据新的UI结构进行调整
        console.log(`Update selector text for ${selectorId}: ${defaultText}`);
    };

    window.syncFolderWithMdFile = () => {
        // 此函数在旧版中用于同步文件夹和MD文件，新版中可能需要重新实现或调整
        console.log('syncFolderWithMdFile called');
    };

    // 定义全局函数，供浮窗面板调用
    window.loadMdFile = async (filePath) => {
        try {
            // 通过FileManager获取文件内容
            console.log('loadMdFile attempting to fetch:', filePath); // 添加日志
            const content = await window.fileManager.fetchFileContent(filePath); // 使用 FileManager 中已更新的函数
            if (content) {
                // 提取文件名作为 currentTitle
                const filenameParts = filePath.split('/');
                const filename = filenameParts[filenameParts.length - 1];
                
                // cache文件特殊处理 - 不去掉.md后缀，因为它本身就没有
                const currentTitle = filename === 'cache' ? 'cache' : filename.replace(/\.md$/, '');
                
                // 转换内容以在编辑器中显示
                const transformedContent = window.fileManager.transformMarkdownContent(
                    content, 
                    currentTitle, 
                    currentTitle, // targetTitle 也是 currentTitle，因为是显示当前文件
                    'display'
                );

                window.updateEditorContent(transformedContent);
                
                // 使用状态管理系统更新文件和媒体文件夹 - cache文件特殊处理
                if (filename === 'cache') {
                    window.appState.updateCurrentFile('cache', 'IMG');
                } else {
                    window.appState.updateCurrentFile(filename);
                }
                await window.appState.syncFolderWithMdFile(); // 确保媒体文件夹在文件更新后同步
                window.showMessage(`✅ MD文件 ${filename} 加载成功`, 'success');
            } else {
                // fetchFileContent 内部已处理错误消息，这里只显示通用失败信息
                window.showMessage(`❌ MD文件加载失败: 未获取到内容`, 'error');
            }
        } catch (error) {
            window.showMessage(`❌ MD文件加载异常: ${error.message}`, 'error');
        }
    };

    window.inputImg = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*';
        input.multiple = true;
        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                try {
                    // 使用状态管理系统获取当前媒体文件夹
                    const destination = window.appState.getCurrentMediaFolder();

                    const result = await window.fileManager.handleImageUpload(files, destination);
                    if (result.success) {
                        if (window.insertEditorContent) {
                            window.insertEditorContent(result.markdown);
                        }
                        window.showMessage('✅ 图片上传成功', 'success');
                        window.appState.onStateChange(); // 触发状态更新
                    } else {
                        window.showMessage(`❌ 图片上传失败: ${result.message}`, 'error');
                    }
                } catch (error) {
                    window.showMessage(`❌ 图片上传异常: ${error.message}`, 'error');
                }
            }
        };
        input.click();
    };

    // 新增：处理单个MD文件导入的核心逻辑
    window.handleSingleMdFileImport = async (file) => {
        if (!file) {
            window.showMessage('❌ 未选择MD文件', 'error');
            return;
        }
        try {
            // 调用 FileManager 处理 MD 文件上传
            const result = await window.fileManager.handleMdFileUpload(file);
            if (result.success) {
                window.loadMdFile(result.filename);
                window.showMessage(`✅ MD文件 ${result.originalName} 导入成功`, 'success');
            } else {
                window.showMessage(`❌ MD文件导入失败: ${result.message}`, 'error');
            }
        } catch (error) {
            window.showMessage(`❌ MD文件导入异常: ${error.message}`, 'error');
        }
    };

    // 新增：导入MD文件功能 (供按钮点击使用)
    window.importMdFile = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.md'; // 只接受 Markdown 文件
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                window.handleSingleMdFileImport(file);
            }
        };
        input.click();
    };

    // 新增：处理文件夹上传的核心逻辑
    window.handleFolderUploadCore = async (files) => {
        if (!files || files.length === 0) {
            window.showMessage('❌ 未选择文件夹', 'error');
            return { success: false, message: '未选择文件夹' }; // 确保返回一个结果对象
        }
        let result = null;
        try {
            result = await window.fileManager.handleFolderUpload(files);

            if (result.success) {
                window.showMessage(`✅ 文件夹 '${result.folderName}' 上传成功`, 'success');
                window.loadMdFile(result.mdFilename);
                window.appState.onStateChange(); // 触发状态更新

            } else {
                window.showMessage(`❌ 文件夹上传失败: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('文件夹上传异常:', error); // 更改为 error 级别
            window.showMessage(`❌ 文件夹上传异常: ${error.message}`, 'error');
            result = { success: false, message: error.message }; // 在错误时也给 result 赋值
        }
        return result; // 现在 result 在这里是可访问的
    };

    // 新增：上传文件夹功能 (供按钮点击使用)
    window.uploadFolder = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true; // 允许选择文件夹
        input.directory = true; // 允许选择文件夹
        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                window.handleFolderUploadCore(files);
            }
        };
        input.click();
    };

    window.handSave = async () => {
        const content = window.getEditorContent ? window.getEditorContent() : '';
        if (!content) {
            window.showMessage('❌ 保存失败: 内容为空', 'error');
            return;
        }

        let fileName = window.appState.getCurrentFile();
        let needsReload = false; // 标记是否需要重新读取文件
        
        // Logic for saving a NEW file (按照原项目逻辑)
        if (!fileName || fileName === 'cache') {
            let title = window.extractTitleFromMarkdown(content);

            if (!title) {
                title = prompt('未在文档中找到标题，请手动输入文件名：', 'Untitled');
                if (!title) {
                    window.showMessage('用户取消了保存操作。', 'info');
                    return;
                }
            }
            
            // 如果title是cache，直接保存为cache，不创建文件夹，不加.md后缀
            if (title === 'cache') {
                const saveResult = await window.fileManager.saveContent('cache', content, false, '.');
                if (saveResult && saveResult.success) {
                    window.appState.updateCurrentFile('cache', 'IMG');
                    window.showMessage(`✅ cache文件保存成功！`, 'success');
                } else {
                    window.showMessage(`❌ cache文件保存失败`, 'error');
                }
                return;
            }
            
            // 非cache文件的处理
            const sanitizedName = window.sanitizeFilenameForSave(title);
            fileName = `${sanitizedName}.md`;

            // 1. Save the .md file to the root directory first
            // 获取当前媒体文件夹，对于新文件，通常是 'IMG'
            const currentMediaFolder = 'IMG';
            // 目标媒体文件夹是新文件的标题
            const targetMediaFolder = sanitizedName;

            // 1. Save the .md file to the root directory first
            const saveResult = await window.fileManager.saveContent(fileName, content, false, '.');

            if (saveResult && saveResult.success) {
                // 检查是否需要重新加载：当内容包含媒体文件时（使用原项目的检测逻辑）
                const hasImages = /!\[.*?\]\(.*?\)/g.test(content) || /<video[^>]*src="[^"]*"[^>]*>/g.test(content);
                
                if (hasImages) {
                    needsReload = true;
                }
                
                // 2. Create the corresponding asset folder at the same level (只有非cache才创建)
                try {
                    await window.fileManager.createFolder(sanitizedName, '.');
                } catch (error) {
                    // 文件夹创建失败不影响保存
                }

                // 3. Update state to reflect the new file and its asset folder
                window.appState.updateCurrentFile(fileName, sanitizedName);
                
                window.showMessage(`✅ 文件保存成功！`, 'success');

                // 如果是从cache保存到新文件，清空cache
                if (fileName !== 'cache') { // 只有保存为非cache文件时才清空cache
                    try {
                        await window.fileManager.clearCache();
                        window.showMessage('✅ cache已清空', 'info');
                    } catch (clearError) {
                        console.error('ERROR: 清空cache失败:', clearError);
                        window.showMessage(`❌ 清空cache失败: ${clearError.message}`, 'error');
                    }
                }
            } else {
                window.showMessage(`❌ 文件保存失败`, 'error');
                return;
            }
        } else {
            // 保存现有文件的逻辑
            const oldFile = window.appState.currentFile;
            const oldTitle = oldFile.replace(/\.md$/, '');
            const newTitle = window.extractTitleFromMarkdown(content) || oldTitle;
            const newFile = newTitle + '.md';
            const oldFilename = oldFile + (oldFile.endsWith('.md') ? '' : '.md');
            
            // 执行带重命名支持的保存
            const saveResult = await window.fileManager.saveContent(newFile, content, false, '.', oldFilename);

            if (saveResult && saveResult.success) {
                // 如果标题发生了变化，更新全局状态中的当前文件名
                if (oldTitle !== newTitle) {
                    window.appState.updateCurrentFile(newTitle, newTitle); // 更新文件名为新标题，媒体文件夹也同步为新标题
                    needsReload = true;
                    window.showMessage(`✅ 文章已重命名并保存成功！`, 'success');
                } else {
                    window.showMessage(`✅ 保存成功！`, 'success');
                }
            } else {
                window.showMessage(`❌ 保存失败`, 'error');
                return;
            }
        }
        
        // 保存后重新读取文件内容更新编辑器，确保显示后端处理后的最新内容
        if (needsReload) {
            // 延迟500ms，确保后端有足够时间完成文件写入和处理
            setTimeout(async () => {
                try {
                    const reloadResult = await API.getMarkdownFile('.', fileName);
                    if (reloadResult && reloadResult.success && window.updateEditorContent) {
                        window.updateEditorContent(reloadResult.content);
                    }
                } catch (reloadError) {
                    console.error('ERROR: Failed to reload content after save:', reloadError);
                }
            }, 500);
        }
    };

    window.cleanHexo = async () => {
        window.showMessage('🔄 正在执行 Hexo clean & generate...', 'info');
        try {
            const data = await API.cleanHexo();
            if (data.success) {
                window.showMessage('✅ Hexo clean & generate 完成', 'success');
            } else {
                window.showMessage(`❌ Hexo clean & generate 失败: ${data.message}`, 'error');
            }
        } catch (error) {
            window.showMessage(`❌ Hexo clean & generate 失败: ${error.message}`, 'error');
        }
    };

    window.handExport = async () => {
        const currentFile = window.appState.getCurrentFile(); // 获取当前文件名 (不带.md后缀，如果是cache就是cache)
        const currentMediaFolder = window.appState.getCurrentMediaFolder(); // 获取当前媒体文件夹

        if (currentFile === 'cache') {
            // 如果是cache文件，只导出当前编辑器内容为MD文件
            const content = window.getEditorContent ? window.getEditorContent() : '';
            if (!content) {
                window.showMessage('❌ 导出失败: 编辑器内容为空', 'error');
                return;
            }
            const blob = new Blob([content], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'exported_cache.md'; // cache文件导出为exported_cache.md
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            window.showMessage('✅ cache文件导出成功', 'success');
        } else {
            // 如果是已保存的MD文件，则请求后端打包MD文件和对应的媒体文件夹
            const filenameWithExt = currentFile + '.md'; // 加上.md后缀
            const content = window.getEditorContent ? window.getEditorContent() : ''; // 获取当前编辑器内容

            window.showMessage('🔄 正在准备导出文件和媒体文件夹...', 'info');
            try {
                const blob = await API.downloadTarball({
                    directoryName: currentMediaFolder,
                    selectedFile: filenameWithExt,
                    original_dir: '.',
                    markdownContent: content
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${currentFile}.tar.gz`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                window.showMessage('✅ 导出请求已发送，请检查下载', 'success');
                window.state.hasContentChanged = true;
                window.autoSave();
            } catch (error) {
                console.error('导出文件和媒体文件夹失败:', error);
                window.showMessage(`❌ 导出失败: ${error.message}`, 'error');
            }
        }
    };

    window.createFolderPrompt = async () => {
        const folderName = prompt('请输入要创建的文件夹名称:');
        if (folderName) {
            try {
                await window.fileManager.createFolder(folderName, window.fileManager.getDestination() || window.CONFIG.ORIGINAL_DIR);
                window.showMessage(`✅ 文件夹 '${folderName}' 创建成功`, 'success');
            } catch (error) {
                window.showMessage(`❌ 文件夹创建失败: ${error.message}`, 'error');
            }
        } else {
            window.showMessage('ℹ️ 文件夹创建已取消', 'info');
        }
    };

    // 辅助函数：安全化文件名
    window.sanitizeFilenameForSave = (filename) => {
        if (!filename) return '';
        
        const name = filename.replace(/\.(md|txt|html)$/i, '');
        
        // 替换空格和特殊字符，保留中文
        let safeName = name
            .replace(/\s+/g, '_')  // 空格替换为下划线
            .replace(/[<>:"/\\|?*]/g, '_')  // 替换Windows不允许的字符
            .replace(/[.]{2,}/g, '_')  // 连续的点替换为下划线
            .replace(/^[._-]+|[._-]+$/g, '');  // 移除开头和结尾的特殊字符
        
        if (!safeName) {
            safeName = `file_${Date.now()}`;
        }
        
        return safeName;
    };

    // 辅助函数：从 Markdown 内容中提取 title
    window.extractTitleFromMarkdown = (content) => {
        if (!content) return null;

        // 从 YAML front-matter 中提取 title（包括cache）
        const frontMatterMatch = content.match(/^title:\s*(.*)/m);
        if (frontMatterMatch && frontMatterMatch[1]) {
            const title = frontMatterMatch[1].trim();
            if (title && title !== 'Untitled') {
                return title;
            }
        }

        // 如果 front-matter 中没有，则查找 H1 标题
        const h1Match = content.match(/^#\s+(.*)/m);
        if (h1Match && h1Match[1]) {
            return h1Match[1].trim();
        }

        return null;
    };

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    root.render(React.createElement(App));

    // 初始化拖拽上传处理器
    window.dragDropHandler = new DragDropHandler();

    // 初始化自动保存功能
    initAutoSave();

    // 自动保存功能实现
    function initAutoSave() {
        // 启动自动保存定时器
        if (window.state.autoSaveIntervalSeconds > 0) {
            window.state.autoSaveIntervalId = setInterval(autoSave, window.state.autoSaveIntervalSeconds * 1000);
        }
        
        // 启动倒计时更新器
        const startCountdown = () => {
            // 清除旧的倒计时更新器（如果存在）
            if (window.state.countdownIntervalId) {
                clearInterval(window.state.countdownIntervalId);
            }
            
            // 启动新的倒计时更新器并保存ID
            window.state.countdownIntervalId = setInterval(updateAutoSaveCountdown, 1000);
            
            // 立即更新一次显示
            updateAutoSaveCountdown();
        };
        
        // 延迟启动，确保DOM完全加载
        setTimeout(startCountdown, 500);
        
        // 监听编辑器内容变化
        setupContentChangeListener();
    }

    // 自动保存函数
    async function autoSave() {
        if (!window.state.currentFilename || !window.state.hasContentChanged) {
            return;
        }
        
        try {
            const content = window.getEditorContent ? window.getEditorContent() : '';
            if (!content) {
                console.error('无法获取编辑器内容');
                return;
            }
            
            let filenameToSave = window.state.currentFilename;
            if (filenameToSave !== 'cache') {
                filenameToSave += '.md';
            }
            // 自动保存不涉及媒体文件夹迁移

            const success = await window.fileManager.saveContent(filenameToSave, content, true, '.'); // isAuto = true
            
            if (success) {
                console.log('自动保存成功');
                window.state.hasContentChanged = false;
                window.state.remainingSeconds = window.state.autoSaveIntervalSeconds; // 重置倒计时
            }
        } catch (error) {
            console.error('自动保存失败:', error);
        }
    }

    // 设置自动保存间隔
    function setAutoSaveInterval() {
        const newInterval = parseInt(prompt("设置自动保存间隔 (秒):", window.state.autoSaveIntervalSeconds));
        if (!isNaN(newInterval)) {
            if (newInterval > 0 && newInterval !== window.state.autoSaveIntervalSeconds) {
                window.state.autoSaveIntervalSeconds = newInterval;
                window.state.remainingSeconds = newInterval;
                
                // 清除旧的定时器并设置新的
                if (window.state.autoSaveIntervalId) {
                    clearInterval(window.state.autoSaveIntervalId);
                }
                window.state.autoSaveIntervalId = setInterval(autoSave, newInterval * 1000);
                
                // 重新启动倒计时更新器
                if (window.state.countdownIntervalId) {
                    clearInterval(window.state.countdownIntervalId);
                }
                window.state.countdownIntervalId = setInterval(updateAutoSaveCountdown, 1000);
                
                // 保存到localStorage
                localStorage.setItem('autoSaveInterval', newInterval.toString());
                
                window.simpleCacheUI.showToast(`✅ 自动保存间隔已设置为 ${newInterval} 秒`, 'success');
            } else if (newInterval === 0) {
                // 关闭自动保存
                window.state.autoSaveIntervalSeconds = 0;
                window.state.remainingSeconds = 0;
                
                if (window.state.autoSaveIntervalId) {
                    clearInterval(window.state.autoSaveIntervalId);
                    window.state.autoSaveIntervalId = null;
                }
                
                // 停止倒计时更新器
                if (window.state.countdownIntervalId) {
                    clearInterval(window.state.countdownIntervalId);
                    window.state.countdownIntervalId = null;
                }
                
                localStorage.setItem('autoSaveInterval', '0');
                window.simpleCacheUI.showToast('✅ 自动保存已关闭', 'info');
            }
            
            // 更新状态面板显示
            if (window.statusPanel) {
                window.statusPanel.updateStatusPanel();
            }
        }
    }

    // 更新自动保存倒计时显示
    function updateAutoSaveCountdown() {
        if (window.state.autoSaveIntervalSeconds === 0) {
            return; // 自动保存已关闭
        }
        
        if (window.state.remainingSeconds > 0) {
            window.state.remainingSeconds--;
        } else {
            window.state.remainingSeconds = window.state.autoSaveIntervalSeconds;
        }
        
        // 仅更新状态面板中的自动保存倒计时显示，避免频繁触发其他更新
        if (window.statusPanel) {
            const autosaveElement = document.getElementById('autosave-status');
            if (autosaveElement) {
                if (window.state.autoSaveIntervalSeconds === 0) {
                    autosaveElement.textContent = '已关闭';
                } else {
                    const minutes = Math.floor(window.state.remainingSeconds / 60);
                    const seconds = window.state.remainingSeconds % 60;
                    autosaveElement.textContent = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
                }
            }
        }
    }

    // 监听内容变化（RT 版已由 React 组件内部设置 window.state.hasContentChanged）
    function setupContentChangeListener() {
        // 留空即可，React 组件会通过 onChange 更新 hasContentChanged
    }

    // 从localStorage恢复自动保存设置
    function restoreAutoSaveSettings() {
        const savedInterval = localStorage.getItem('autoSaveInterval');
        if (savedInterval !== null) {
            const interval = parseInt(savedInterval);
            if (!isNaN(interval)) {
                window.state.autoSaveIntervalSeconds = interval;
                window.state.remainingSeconds = interval;
            }
        }
    }

    // 在页面加载时恢复设置
    restoreAutoSaveSettings();

    // 导出自动保存相关函数到全局
    window.setAutoSaveInterval = setAutoSaveInterval;
    window.autoSave = autoSave;

    // 页面关闭时自动触发 clean_hexo
    function setupPageCloseHandler() {
        // 页面关闭 / 隐藏时静默触发 clean_hexo
        window.addEventListener('beforeunload', () => API.cleanHexoBeacon());
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') API.cleanHexoBeacon();
        });
    }

    // 初始化页面关闭处理器
    setupPageCloseHandler();
}
