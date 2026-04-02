// 定义视频和图片扩展名常量
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv'];
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];

// 创建文件管理器实例
const fileManager = new FileManager(CONFIG);

/**
 * 处理文件上传
 * 支持单个MD文件上传和文件夹上传
 */
async function handleFileUpload() {
    try {
        const files = Array.from(DOM.fileInput.files);
        if (!files.length) return;
        
        const isFolder = files.length > 1 || files[0].webkitRelativePath.includes('/');
        
        if (isFolder) {
            await handleFolderUpload(files);
        } else {
            await handleSingleFileUpload(files[0]);
        }
    } catch (error) {
        console.error('文件上传失败:', error);
        alert(`文件上传失败: ${error.message}`);
    } finally {
        // 清空文件输入框
        DOM.fileInput.value = null;
    }
}

/**
 * 处理单个文件上传
 * @param {File} file - 要上传的文件
 */
async function handleSingleFileUpload(file) {
    // 验证文件类型
    if (!file.name.endsWith('.md')) {
        alert('请选择一个 Markdown 文件');
        return;
    }
    
    // 检查文件是否已存在
    const filename = file.name;
    const existingOption = Array.from(DOM.mdSelect.options).find(opt => opt.value === filename);
    if (existingOption && !confirm(`"${filename}" 已存在，是否替换?`)) {
        return;
    }
    
    // 上传文件
    const data = await uploadMdFile(file);
    
    // 更新UI
    await updateUIAfterMdUpload(data, existingOption);
}

/**
 * 处理文件夹上传
 * @param {File[]} files - 文件列表
 */
async function handleFolderUpload(files) {
    // 分类文件
    const { mdFile, subFiles, folderName } = categorizeFolderFiles(files);
    
    // 验证是否包含MD文件
    if (!mdFile) {
        alert('No MD file found in folder');
        return;
    }
    
    // 上传MD文件
    const mdData = await uploadMdFile(mdFile);
    
    // 更新UI
    const existingMdOption = Array.from(DOM.mdSelect.options).find(opt => opt.value === mdData.filename);
    await updateUIAfterMdUpload(mdData, existingMdOption);
    
    // 上传子文件
    if (subFiles.length > 0) {
        await uploadSubFiles(subFiles, mdData.filename);
    }
}

/**
 * 分类文件夹中的文件
 * @param {File[]} files - 文件列表
 * @returns {Object} 分类后的文件对象
 */
function categorizeFolderFiles(files) {
    let mdFile = null, subFiles = [], folderName = '';
    
    for (const file of files) {
        const parts = file.webkitRelativePath.split('/');
        if (parts.length === 2 && file.name.endsWith('.md')) {
            mdFile = file;
            folderName = parts[0];
        } else if (parts.length > 2) {
            subFiles.push(file);
        }
    }
    
    return { mdFile, subFiles, folderName };
}

/**
 * 上传Markdown文件
 * @param {File} mdFile - Markdown文件
 * @returns {Promise<Object>} 上传结果
 */
async function uploadMdFile(mdFile) {
    const data = await fileManager.uploadFiles([mdFile], '/upload', { key: 'md_file' });
    state.currentFilename = data.filename;
    
    return data;
}

/**
 * 读取文件内容为文本 - 使用通用工具类
 * @param {File} file - 要读取的文件
 * @returns {Promise<string>} 文件内容
 */
function readFileAsText(file) {
    return CommonUtils.readFileAsText(file);
}

/**
 * 上传子文件
 * @param {File[]} subFiles - 子文件列表
 * @param {string} mdFilename - Markdown文件名
 */
async function uploadSubFiles(subFiles, mdFilename) {
    const newFolderName = mdFilename.split('.')[0];
    const folderData = await fileManager.uploadFiles(subFiles, '/upload-folder', {
        key: 'files',
        extraData: { folderName: newFolderName }
    });
    console.log('Folder uploaded successfully:', folderData);
    
    // 文件夹上传成功后，手动更新目录选择器
    if (!Array.from(DOM.directorySelect.options).find(opt => opt.value === newFolderName)) {
        addOptionToSelect(DOM.directorySelect, newFolderName);
    }
    DOM.directorySelect.value = newFolderName;
    
    // 更新文件夹选择器显示文本
    if (window.updateSelectorText) {
        window.updateSelectorText('directory-select', '文件夹');
    }
    
    // 更新目标路径
    state.destination = `${CONFIG.ORIGINAL_DIR}${newFolderName}/`;
    
    // 更新图片选择器
    await fetchDirectoryTree(state.destination, DOM.imgSelect, 'file', 'Failed to get IMG files');
    
    // 更新图片选择器显示文本
    if (window.updateSelectorText) {
        window.updateSelectorText('img-select', '图片/视频文件');
    }
}

/**
 * 上传MD文件后更新UI
 * @param {Object} data - 上传结果数据
 * @param {HTMLOptionElement} existingOption - 已存在的选项元素
 */
async function updateUIAfterMdUpload(data, existingOption) {
    // 更新选择器
    if (!existingOption) {
        addOptionToSelect(DOM.mdSelect, data.filename);
    } else {
        DOM.mdSelect.value = data.filename;
    }
    
    // 更新MD选择器显示文本
    if (window.updateSelectorText) {
        window.updateSelectorText('md-select', 'MD 文件');
    }
    
    // 同步文件夹和图片选择器
    await syncFolderWithMdFile(data.filename);
    
    // 上传成功后，从服务器重新读取文件内容
    // 延迟一下确保文件已经完全写入服务器
    setTimeout(async () => {
        await getContent(data.filename);
    }, 500);
}

/**
 * 处理图片上传
 * 上传图片文件并将其插入到编辑器中
 */
async function handleImageUpload() {
    const imgFiles = Array.from(DOM.imgInput.files);
    if (!imgFiles.length) return;

    // 确定目标文件夹
    state.destination = DOM.directorySelect.value 
        ? `${CONFIG.ORIGINAL_DIR}${DOM.directorySelect.value}/`
        : `${CONFIG.ORIGINAL_DIR}${CONFIG.DEFAULT_IMG_DIR}/`;

    // 显示上传进度
    const { modal, overlay } = showModal('正在上传图片和视频，请稍候...', '<div class=\"progress-circle\"></div><div id=\"upload-status\">准备上传...</div>');
    const statusDiv = document.getElementById('upload-status');
    
    try {
        // 使用 fileManager 批量上传文件
        statusDiv.textContent = `正在上传 ${imgFiles.length} 个文件...`;
        
        const data = await fileManager.uploadFiles(imgFiles, '/upimg', {
            key: 'image',
            extraData: { destination: state.destination }
        });
        
        if (data.success) {
            statusDiv.textContent = '文件上传完成，正在处理...';
            
            // 生成 markdown
            const markdown = generateMarkdownForFiles(data.filenames, state.destination);
            
            // 更新文件列表
            statusDiv.textContent = '更新文件列表...';
            await updateFileListAndSelector(state.destination);
            
            // 更新编辑器内容
            statusDiv.textContent = '更新编辑器内容...';
            insertAtCursor(markdown);
            state.hasContentChanged = true;
        } else {
            throw new Error(data.message || '上传失败');
        }

        hideModal(modal, overlay);
    } catch (error) {
        console.error('Image upload failed:', error);
        alert(`图片和视频上传失败: ${error.message}`);
        hideModal(modal, overlay);
    } finally {
        // 清空文件输入框
        DOM.imgInput.value = null;
    }
}

/**
 * 为上传的文件生成Markdown代码 - 使用通用工具类
 * @param {string[]} filenames - 文件名数组
 * @param {string} destination - 目标路径
 * @returns {string} 生成的Markdown代码
 */
function generateMarkdownForFiles(filenames, destination) {
    return CommonUtils.generateMarkdownForFiles(filenames, destination);
}

/**
 * 更新文件列表和选择器
 * @param {string} destination - 目标路径
 */
async function updateFileListAndSelector(destination) {
    await fetchDirectoryTree(destination, DOM.imgSelect, 'file', 'Failed to get IMG files');
    
    // 更新选择器显示文本
    if (window.updateSelectorText) {
        window.updateSelectorText('img-select', '图片/视频文件');
    }
}

/**
 * 处理MD文件选择变更
 * 保存当前内容，加载新选择的文件，并同步文件夹选择器
 */
async function handleMdSelectChange() {
    try {
        const newFilename = DOM.mdSelect.value;
        
        // 如果选择的文件与当前文件相同，则不做任何操作
        if (newFilename === state.currentFilename) return;
        
        // 如果有未保存的更改，先自动保存
        if (window.autoSave && state.hasContentChanged) {
            await window.autoSave();
        }
        
        // 更新当前文件名
        state.currentFilename = newFilename;
        
        // 加载新文件内容
        await getContent(newFilename);
        
        // 同步文件夹选择器
        await syncFolderWithMdFile(newFilename);
        
        console.log(`Switched to file: ${newFilename}`);
    } catch (error) {
        console.error('Error changing MD file:', error);
        alert(`切换文件失败: ${error.message}`);
    }
}

/**
 * 获取并设置编辑器内容
 * @param {string} filename - 文件名
 * @param {string|null} forceContent - 可选的强制内容
 * @returns {Promise<void>}
 */
async function getContent(filename, forceContent = null) {
    if (forceContent !== null) {
        // 为编辑器优化内容
        const optimizedContent = optimizeContentForEditor(forceContent);
        setTimeout(() => {
            mdEditor.cm.setValue(optimizedContent);
            state.hasContentChanged = false;
        }, 500);
        return;
    }
    
    // 使用 apiService 获取内容
    try {
        const data = await window.apiService.getMd(filename);
        let content = '';
        
        if (data.success) {
            content = data.content;
            if (content.trim() === '' || content.trim() === '\n') {
                if (filename === 'cache') {
                    content = `---\ntitle: ${filename}\ndate: ${moment().format('YYYY-MM-DD HH:mm:ss')}\ncategories:\n    - [Category / 分类]\ntags:\n    - Tag / 标签\n---`;
                }
            }
        } else {
            console.error(`获取文件失败: ${data.message}`);
            if (filename === 'cache') {
                content = `---\ntitle: ${filename}\ndate: ${moment().format('YYYY-MM-DD HH:mm:ss')}\ncategories:\n    - [Category / 分类]\ntags:\n    - Tag / 标签\n---`;
            } else {
                return;
            }
        }
        
        const optimizedContent = optimizeContentForEditor(content);
        setTimeout(() => {
            mdEditor.cm.setValue(optimizedContent);
            state.hasContentChanged = false;
        }, 500);
    } catch (error) {
        console.error('请求文件内容失败:', error);
    }
};



/**
 * 从服务器获取文件内容
 * @param {string} filename - 文件名
 * @returns {Promise<string>} 文件内容
 */
async function fetchFileContent(filename) {
    try {
        const data = await window.apiService.getMd(filename);
        let content = '';

        if (data.success) {
            content = data.content;
            
            // 检查内容是否为空或只有空白字符
            if (content.trim() === '' || content.trim() === '\n') {
                content = generateDefaultContent(filename);
            }
        } else if (data.message && data.message.includes('不存在')) {
            // 文件不存在，生成默认内容
            content = generateDefaultContent(filename);
        } else {
            // 其他错误
            throw new Error(`Failed to fetch file: ${data.message}`);
        }
        
        return content;
    } catch (error) {
        console.error('Network error or fetch failed:', error);
        throw error;
    }
}

/**
 * 生成默认的文件内容 - 使用通用工具类
 * @param {string} filename - 文件名
 * @returns {string} 默认内容
 */
function generateDefaultContent(filename) {
    return CommonUtils.generateDefaultContent(filename);
}

/**
 * 设置编辑器内容
 * @param {string} content - 要设置的内容
 * @returns {Promise<void>}
 */
async function setEditorContent(content) {
    return new Promise((resolve) => {
        setTimeout(() => {
            if (mdEditor && mdEditor.cm) {
                mdEditor.cm.setValue(content);
                state.hasContentChanged = false; // 重置变化标记
                resolve();
            } else {
                console.error('Editor not initialized');
                resolve(); // 仍然解析 Promise，但记录错误
            }
        }, 100);
    });
}

/**
 * 同步文件夹选择器与MD文件
 * @param {string} mdFilename - MD文件名
 */
async function syncFolderWithMdFile(mdFilename) {
    const folderName = mdFilename.split('.')[0];
    const existingDir = Array.from(DOM.directorySelect.options).find(opt => opt.value === folderName);
    
    if (existingDir || folderName === 'cache') {
        state.destination = folderName === 'cache' 
            ? `${CONFIG.ORIGINAL_DIR}${CONFIG.DEFAULT_IMG_DIR}/`
            : `${CONFIG.ORIGINAL_DIR}${folderName}/`;
        DOM.directorySelect.value = folderName === 'cache' ? CONFIG.DEFAULT_IMG_DIR : folderName;
        
        // 更新文件夹选择器显示文本
        if (window.updateSelectorText) {
            window.updateSelectorText('directory-select', '文件夹');
        }
        
        await fetchDirectoryTree(state.destination, DOM.imgSelect, 'file', 'Failed to get IMG files');
        
        // 更新图片选择器显示文本
        if (window.updateSelectorText) {
            window.updateSelectorText('img-select', '图片/视频文件');
        }
    } else if (!state.canceledFolders.has(folderName)) {
        if (confirm("Create a folder with the same name?\n(No images, no need to create)")) {
            await createAndSyncFolder(folderName, CONFIG.ORIGINAL_DIR);
        } else {
            state.canceledFolders.add(folderName);
            localStorage.setItem('canceledFolders', JSON.stringify([...state.canceledFolders]));
        }
    }
}

/**
 * 处理图片/视频选择变更
 * 将选中的图片或视频插入到编辑器中
 */
async function handleImgSelectChange() {
    const imgFilename = DOM.imgSelect.value;
    if (!imgFilename) return;
    
    // 确定目标文件夹
    state.destination = DOM.directorySelect.value 
        ? `${CONFIG.ORIGINAL_DIR}${DOM.directorySelect.value}/`
        : `${CONFIG.ORIGINAL_DIR}${CONFIG.DEFAULT_IMG_DIR}/`;
    
    const filenameWithoutExt = imgFilename.split('.')[0];
    
    // 检查文件扩展名来决定使用图片还是视频格式
    const fileExt = imgFilename.split('.').pop().toLowerCase();
    
    // 生成插入代码
    let markdown;
    if (VIDEO_EXTENSIONS.includes(fileExt)) {
        // 视频文件使用简洁的 HTML video 标签格式，包含完整路径
        markdown = `<video src=\"${state.destination}${imgFilename}\" controls=\"controls\" width=\"500\" height=\"300\"></video>\n`;
    } else {
        // 图片文件使用标准 markdown 格式
        markdown = `![${filenameWithoutExt}](${state.destination}${imgFilename})\n`;
    }
    
    // 使用短延迟确保编辑器已准备好接收内容
    setTimeout(() => {
        insertAtCursor(markdown);
        state.hasContentChanged = true;
    }, 500);
}

/**
 * 处理手动保存操作
 * 保存当前编辑器内容到文件，并同步相关选择器
 */
async function handleManualSave() {
    const content = mdEditor.getMarkdown();
    
    // 确定文件名
    let fileName = await determineFileName(content);
    if (!fileName) return; // 用户取消了操作
    
    // 保存内容
    const success = await saveContent(fileName, CONFIG.ORIGINAL_DIR, content);
    if (!success) return;
    
    // 更新自动保存倒计时
    updateAutoSaveCountdown();
    
    // 清理缓存文件
    await cleanupCacheIfNeeded(fileName);
    
    // 更新MD选择器
    updateMdSelector(fileName);
    
    // 同步文件夹选择器
    await syncFolderSelector(fileName);
    
    // 保存完成后重新加载内容
    await getContent(fileName);
}

/**
 * 根据内容确定文件名
 * @param {string} content - 编辑器内容
 * @returns {Promise<string|null>} 确定的文件名，如果用户取消则返回null
 */
async function determineFileName(content) {
    let fileName = state.currentFilename;
    const titleMatch = content.match(/^title:\s*(.+)$/m); // 修复转义错误：\\s+ -> \s+
    
    if (!fileName || fileName === 'cache') {
        if (titleMatch && titleMatch[1].trim()) {
            // 从标题生成文件名
            const titleName = titleMatch[1].trim()
                .replace(/[<>:\"/\\|?*]/g, '_')
                .replace(/\\s+/g, '_')
                .replace(/_{2,}/g, '_')
                .replace(/^_+|_+$/g, '');
            fileName = `${titleName}.md`;
        } else {
            // 提示用户输入文件名
            fileName = prompt('请输入文件名 (Enter file name)', 'Untitled');
            if (!fileName) return null; // 用户取消了操作
            fileName = `${fileName}.md`;
        }
    }
    
    return fileName;
}

/**
 * 更新自动保存倒计时
 */
function updateAutoSaveCountdown() {
    if (state.autoSaveIntervalSeconds > 0) {
        state.remainingSeconds = state.autoSaveIntervalSeconds;
        updateCountdown();
        DOM.autosaveCountdown.textContent = '已保存';
        setTimeout(updateCountdown, 1000);
    }
}

/**
 * 如果需要，清理缓存文件
 * @param {string} fileName - 当前文件名
 */
async function cleanupCacheIfNeeded(fileName) {
    // 只有当保存的不是cache文件时，才清空cache
    if (fileName !== 'cache' && state.currentFilename === 'cache') {
        await saveContent('cache', CONFIG.ORIGINAL_DIR, '');
    }
}

/**
 * 更新MD选择器
 * @param {string} fileName - 文件名
 */
function updateMdSelector(fileName) {
    if (!Array.from(DOM.mdSelect.options).find(opt => opt.value === fileName)) {
        addOptionToSelect(DOM.mdSelect, fileName);
    }
    state.currentFilename = fileName;
    DOM.mdSelect.value = fileName;
    
    // 更新选择器显示文本
    if (window.updateSelectorText) {
        window.updateSelectorText('md-select', 'MD 文件');
    }
}

/**
 * 同步文件夹选择器
 * @param {string} fileName - 文件名
 */
async function syncFolderSelector(fileName) {
    // 等待文件写入完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const folderName = fileName.split('.')[0];
    const folderExists = Array.from(DOM.directorySelect.options).find(opt => opt.value === folderName);
    
    if (!folderExists) {
        // 创建新文件夹
        await createAndSyncFolder(folderName, CONFIG.ORIGINAL_DIR);
        await fetchDirectoryTree(`${CONFIG.ORIGINAL_DIR}${folderName}/`, DOM.imgSelect, 'file', 'Failed to get IMG files');
        DOM.directorySelect.value = folderName;
        
        // 更新文件夹选择器显示文本
        if (window.updateSelectorText) {
            window.updateSelectorText('directory-select', '文件夹');
        }
        
        // 触发文件夹选择器的change事件
        DOM.directorySelect.dispatchEvent(new Event('change'));
    } else if (DOM.directorySelect.value !== folderName) {
        // 更新现有文件夹
        DOM.directorySelect.value = folderName;
        await fetchDirectoryTree(`${CONFIG.ORIGINAL_DIR}${folderName}/`, DOM.imgSelect, 'file', 'Failed to get IMG files');
        
        // 更新文件夹选择器显示文本
        if (window.updateSelectorText) {
            window.updateSelectorText('directory-select', '文件夹');
        }
        
        // 触发文件夹选择器的change事件
        DOM.directorySelect.dispatchEvent(new Event('change'));
    }
}

/**
 * 处理导出操作
 * 将当前编辑器内容和相关文件打包下载
 */
async function handleExport() {
    // 准备导出参数
    const exportParams = prepareExportParams();
    
    // 显示进度模态框
    const { modal, overlay, progressText } = showExportProgressModal();
    
    try {
        // 发送导出请求
        const response = await sendExportRequest(exportParams);
        if (!response.ok) throw new Error('Export failed');
        
        // 处理响应流
        const blob = await processResponseStream(response, progressText);
        
        // 下载文件
        downloadExportedFile(blob, exportParams.exportFileName);
        
        // 导出完成后直接调用手动保存，为的是再次更新 md 文件为 hexo 可读的视频格式
        await handleManualSave();
        
        // 完成导出
        progressText.textContent = '100%';
        setTimeout(() => hideModal(modal, overlay), 500);
    } catch (error) {
        console.error('Export failed:', error);
        alert('Download failed!');
        hideModal(modal, overlay);
    }
}

/**
 * 准备导出参数
 * @returns {Object} 导出参数对象
 */
function prepareExportParams() {
    const selectedFile = DOM.mdSelect.value || 'cache';
    const dirSelect = DOM.directorySelect.value || 'IMG';
    const markdownContent = mdEditor.getMarkdown();
    
    // 确定导出文件名
    const exportFileName = selectedFile === 'cache' && dirSelect === 'IMG' 
        ? selectedFile 
        : selectedFile !== 'cache' && dirSelect === 'IMG' 
        ? selectedFile.replace('.md', '') 
        : dirSelect;
    
    return {
        selectedFile,
        dirSelect,
        markdownContent,
        exportFileName
    };
}

/**
 * 显示导出进度模态框
 * @returns {Object} 模态框对象和进度文本元素
 */
function showExportProgressModal() {
    const { modal, overlay } = showModal('正在压缩文件，请稍候...', '<div class="progress-circle"></div><p id="progress-text">0%</p>');
    const progressText = document.getElementById('progress-text');
    return { modal, overlay, progressText };
}

/**
 * 发送导出请求
 * @param {Object} params - 导出参数
 * @returns {Promise<Response>} 响应对象
 */
async function sendExportRequest(params) {
    const formData = new FormData();
    formData.append('directoryName', params.dirSelect || params.exportFileName);
    formData.append('selectedFile', params.selectedFile);
    formData.append('original_dir', CONFIG.ORIGINAL_DIR);
    formData.append('markdownContent', params.markdownContent);
    
    return window.apiService.tgzDownload(formData);
}

/**
 * 处理响应流
 * @param {Response} response - 响应对象
 * @param {HTMLElement} progressText - 进度文本元素
 * @returns {Promise<Blob>} 处理后的Blob对象
 */
async function processResponseStream(response, progressText) {
    const reader = response.body.getReader();
    const contentLength = +response.headers.get('Content-Length');
    let receivedLength = 0, chunks = [];
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        receivedLength += value.length;
        
        // 更新进度显示
        progressText.textContent = contentLength 
            ? `${Math.round((receivedLength / contentLength) * 100)}%` 
            : `${Math.min(95, Math.round((receivedLength / 1024 / 1024) * 10))}%`;
    }
    
    return new Blob(chunks, { type: 'application/octet-stream' });
}

/**
 * 下载导出的文件
 * @param {Blob} blob - 文件Blob对象
 * @param {string} fileName - 文件名
 */
function downloadExportedFile(blob, fileName) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.tar`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

/**
 * 在编辑器光标位置插入文本
 * @param {string} text - 要插入的文本
 */
function insertAtCursor(text) {
    if (!mdEditor || !mdEditor.cm) {
        console.warn('Editor not initialized, cannot insert text');
        return;
    }
    
    try {
        // 如果有保存的光标位置，使用它
        if (state.lastCursorPosition) {
            mdEditor.cm.setCursor(state.lastCursorPosition);
            mdEditor.cm.replaceSelection(text);
            // 更新光标位置到插入文本后
            const newCursor = mdEditor.cm.getCursor();
            mdEditor.cm.setCursor(newCursor);
        } else {
            // 否则使用当前光标位置
            mdEditor.cm.replaceSelection(text);
        }
        
        // 刷新编辑器并聚焦
        mdEditor.cm.refresh();
        mdEditor.cm.focus();
        
        // 标记内容已更改
        state.hasContentChanged = true;
    } catch (error) {
        console.error('Error inserting text at cursor:', error);
    }
}

/**
 * 设置编辑器内容变更监听器
 * 当编辑器内容变化时更新状态
 */
function setupContentChangeListener() {
    // 检查编辑器是否已初始化
    if (mdEditor && mdEditor.cm) {
        // 添加变更事件监听器
        mdEditor.cm.on('change', function() {
            state.hasContentChanged = true;
        });
        console.log('Content change listener setup complete');
    } else {
        // 如果编辑器尚未初始化，稍后重试
        console.log('Editor not ready, retrying content change listener setup...');
        setTimeout(setupContentChangeListener, 100);
    }
}

// 拖拽上传功能
/**
 * 设置拖拽上传功能
 * 允许用户将文件和文件夹拖拽到编辑器中
 */
function setupDragAndDrop() {
    // 等待编辑器加载完成
    waitForEditor();
    
    /**
     * 等待编辑器初始化完成
     */
    function waitForEditor() {
        const editorContainer = document.getElementById('editor');
        if (!editorContainer || !mdEditor || !mdEditor.cm) {
            setTimeout(waitForEditor, 100);
            return;
        }
        
        setupDragDropEvents(editorContainer);
    }
    
    /**
     * 设置拖拽事件监听
     * @param {HTMLElement} editorContainer - 编辑器容器元素
     */
    function setupDragDropEvents(editorContainer) {
        // 阻止默认拖拽行为
        const preventDefaults = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };
        
        // 添加拖拽高亮效果
        const highlight = () => editorContainer.classList.add('drag-over');
        const unhighlight = () => editorContainer.classList.remove('drag-over');
        
        // 设置拖拽事件监听
        const dragEvents = ['dragenter', 'dragover', 'dragleave', 'drop'];
        const highlightEvents = ['dragenter', 'dragover'];
        const unhighlightEvents = ['dragleave', 'drop'];
        
        // 为所有拖拽事件添加默认行为阻止
        dragEvents.forEach(eventName => {
            editorContainer.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });

        // 添加高亮效果
        highlightEvents.forEach(eventName => {
            editorContainer.addEventListener(eventName, highlight, false);
        });

        // 移除高亮效果
        unhighlightEvents.forEach(eventName => {
            editorContainer.addEventListener(eventName, unhighlight, false);
        });

        // 处理文件拖放
        editorContainer.addEventListener('drop', handleDrop, false);
    }

    /**
     * 处理拖放事件
     * @param {DragEvent} e - 拖放事件对象
     */
    async function handleDrop(e) {
        const dt = e.dataTransfer;
        
        // 保存当前光标位置
        if (mdEditor && mdEditor.cm) {
            state.lastCursorPosition = mdEditor.cm.getCursor();
        }
        
        try {
            // 收集所有文件
            const files = await collectFiles(dt);
            
            // 处理收集到的文件
            if (files.length > 0) {
                handleDraggedFiles(files);
            }
        } catch (error) {
            console.error('Error handling dropped files:', error);
            alert('处理拖拽文件时出错');
        }
    }
    
    /**
     * 从拖拽数据中收集文件
     * @param {DataTransfer} dataTransfer - 拖拽数据对象
     * @returns {Promise<File[]>} 收集到的文件数组
     */
    async function collectFiles(dataTransfer) {
        const files = [];
        
        // 使用 DataTransferItemList API (现代浏览器)
        if (dataTransfer.items && dataTransfer.items.length > 0) {
            for (let i = 0; i < dataTransfer.items.length; i++) {
                const item = dataTransfer.items[i];
                
                if (item.kind === 'file') {
                    const entry = item.webkitGetAsEntry();
                    
                    if (entry) {
                        if (entry.isDirectory) {
                            // 处理文件夹
                            const folderFiles = await readDirectory(entry);
                            files.push(...folderFiles);
                        } else {
                            // 处理单个文件
                            const file = item.getAsFile();
                            if (file) files.push(file);
                        }
                    }
                }
            }
        } 
        // 回退到传统 FileList API
        else if (dataTransfer.files && dataTransfer.files.length > 0) {
            files.push(...Array.from(dataTransfer.files));
        }
        
        return files;
    }
    
    /**
     * 递归读取文件夹内容
     * @param {FileSystemDirectoryEntry} dirEntry - 文件夹入口点
     * @returns {Promise<File[]>} 文件夹中的所有文件
     */
    async function readDirectory(dirEntry) {
        const files = [];
        
        return new Promise((resolve) => {
            const dirReader = dirEntry.createReader();
            
            function readEntries() {
                dirReader.readEntries(async (entries) => {
                    // 如果没有更多条目，返回收集到的文件
                    if (entries.length === 0) {
                        resolve(files);
                        return;
                    }
                    
                    // 处理每个条目
                    const entryPromises = entries.map(async (entry) => {
                        if (entry.isFile) {
                            // 处理文件
                            return processFileEntry(entry);
                        } else if (entry.isDirectory) {
                            // 递归处理子文件夹
                            return readDirectory(entry);
                        }
                        return [];
                    });
                    
                    // 等待所有条目处理完成
                    const results = await Promise.all(entryPromises);
                    
                    // 将结果添加到文件数组
                    results.forEach(result => {
                        if (Array.isArray(result)) {
                            files.push(...result);
                        } else if (result) {
                            files.push(result);
                        }
                    });
                    
                    // 继续读取更多条目
                    readEntries();
                });
            }
            
            readEntries();
        });
    }
    
    /**
     * 处理文件入口点
     * @param {FileSystemFileEntry} fileEntry - 文件入口点
     * @returns {Promise<File>} 处理后的文件
     */
    function processFileEntry(fileEntry) {
        return new Promise((resolve) => {
            fileEntry.file((file) => {
                // 设置webkitRelativePath来模拟文件夹结构
                Object.defineProperty(file, 'webkitRelativePath', {
                    value: fileEntry.fullPath.substring(1), // 去掉开头的 /
                    writable: false
                });
                resolve(file);
            }, () => resolve(null));
        });
    }
}

/**
 * 处理拖拽上传的文件
 * 根据文件类型和结构进行分类处理
 * @param {FileList|File[]} files - 拖拽的文件列表
 */
async function handleDraggedFiles(files) {
    const filesArray = Array.from(files);
    
    // 文件类型定义
    const fileTypes = {
        md: file => file.name.endsWith('.md'),
        image: file => file.type.startsWith('image/'),
        video: file => file.type.startsWith('video/')
    };
    
    // 检查是否是文件夹拖拽
    const isFolder = filesArray.length > 1 || 
                    (filesArray[0] && filesArray[0].webkitRelativePath && 
                     filesArray[0].webkitRelativePath.includes('/'));
    
    if (isFolder) {
        // 处理文件夹拖拽
        let mdFile = null;
        const subFiles = [];
        
        // 分类文件
        for (const file of filesArray) {
            const parts = file.webkitRelativePath ? file.webkitRelativePath.split('/') : [file.name];
            
            if (parts.length === 2 && fileTypes.md(file)) {
                mdFile = file;
            } else if (parts.length > 2 || (parts.length === 1 && !fileTypes.md(file))) {
                subFiles.push(file);
            }
        }
        
        if (mdFile) {
            // 处理包含MD文件的文件夹
            await processMdFileWithSubfiles(mdFile, subFiles);
        } else {
            // 只有媒体文件的文件夹，按文件类型处理
            await processMediaFiles(subFiles);
        }
    } else {
        // 处理单个或多个文件拖拽
        const categorizedFiles = categorizeFiles(filesArray);
        await processAllFileTypes(categorizedFiles);
    }
    
    /**
     * 处理MD文件及其相关子文件
     * @param {File} mdFile - MD文件
     * @param {File[]} subFiles - 子文件列表
     */
    async function processMdFileWithSubfiles(mdFile, subFiles) {
        // 上传MD文件
        const mdData = await fileManager.uploadFiles([mdFile], '/upload', { key: 'md_file' });
        state.currentFilename = mdData.filename;
        
        // 更新MD选择器
        const existingMdOption = Array.from(DOM.mdSelect.options).find(opt => opt.value === mdData.filename);
        if (!existingMdOption) {
            addOptionToSelect(DOM.mdSelect, mdData.filename);
        } else {
            DOM.mdSelect.value = mdData.filename;
        }
        
        // 更新选择器显示文本
        if (window.updateSelectorText) {
            window.updateSelectorText('md-select', 'MD 文件');
        }

        // 上传子文件
        const newFolderName = mdData.filename.split('.')[0];
        if (subFiles.length > 0) {
            const folderData = await fileManager.uploadFiles(subFiles, '/upload-folder', {
                key: 'files',
                extraData: { folderName: newFolderName }
            });
            console.log('Folder uploaded successfully:', folderData);
            
            // 文件夹上传成功后，手动更新目录选择器
            if (!Array.from(DOM.directorySelect.options).find(opt => opt.value === newFolderName)) {
                addOptionToSelect(DOM.directorySelect, newFolderName);
            }
            DOM.directorySelect.value = newFolderName;
            
            // 更新文件夹选择器显示文本
            if (window.updateSelectorText) {
                window.updateSelectorText('directory-select', '文件夹');
            }
            
            // 更新目标路径
            state.destination = `${CONFIG.ORIGINAL_DIR}${newFolderName}/`;
            
            // 更新图片选择器
            await fetchDirectoryTree(state.destination, DOM.imgSelect, 'file', 'Failed to get IMG files');
            
            // 更新图片选择器显示文本
            if (window.updateSelectorText) {
                window.updateSelectorText('img-select', '图片/视频文件');
            }
        }
        
        // 同步文件夹和图片选择器
        await syncFolderWithMdFile(mdData.filename);
        
        // 上传成功后，从服务器重新读取文件内容
        setTimeout(async () => {
            await getContent(mdData.filename);
        }, 500);
    }
    
    /**
     * 处理媒体文件（图片和视频）
     * @param {File[]} files - 媒体文件列表
     */
    async function processMediaFiles(files) {
        const categorized = categorizeFiles(files);
        await processAllFileTypes(categorized);
    }
    
    /**
     * 将文件按类型分类
     * @param {File[]} files - 文件列表
     * @returns {Object} 分类后的文件对象
     */
    function categorizeFiles(files) {
        return files.reduce((result, file) => {
            if (fileTypes.md(file)) {
                result.md.push(file);
            } else if (fileTypes.image(file)) {
                result.image.push(file);
            } else if (fileTypes.video(file)) {
                result.video.push(file);
            } else {
                result.other.push(file);
            }
            return result;
        }, { md: [], image: [], video: [], other: [] });
    }
    
    /**
     * 处理所有类型的文件
     * @param {Object} categorizedFiles - 分类后的文件对象
     */
    async function processAllFileTypes(categorizedFiles) {
        const processTasks = [];
        
        if (categorizedFiles.md.length > 0) {
            processTasks.push(handleDraggedMdFiles(categorizedFiles.md));
        }
        
        if (categorizedFiles.image.length > 0) {
            processTasks.push(handleDraggedImages(categorizedFiles.image));
        }
        
        if (categorizedFiles.video.length > 0) {
            processTasks.push(handleDraggedVideos(categorizedFiles.video));
        }
        
        if (categorizedFiles.other.length > 0) {
            console.log('Other files:', categorizedFiles.other);
        }
        
        // 并行处理所有文件类型以提高效率
        await Promise.all(processTasks);
    }
}

/**
 * 处理拖拽上传的媒体文件（图片或视频）
 * @param {File[]} files - 拖拽的媒体文件数组
 * @param {string} fileType - 文件类型，'image' 或 'video'
 */
async function handleDraggedMedia(files, fileType) {
    if (!files.length) return;
    
    // 确定目标文件夹
    state.destination = DOM.directorySelect.value 
        ? `${CONFIG.ORIGINAL_DIR}${DOM.directorySelect.value}/`
        : `${CONFIG.ORIGINAL_DIR}${CONFIG.DEFAULT_IMG_DIR}/`;

    // 过滤已存在的文件
    const newFiles = await filterExistingFiles(files, state.destination);
    if (!newFiles.length) return;

    // 显示上传进度
    const typeText = fileType === 'video' ? '视频' : '图片';
    const statusId = `${fileType}-upload-status`;
    const { modal, overlay } = showModal(`正在上传${typeText}，请稍候...`, `<div class=\"progress-circle\"></div><div id=\"${statusId}\">准备上传...</div>`);
    const statusDiv = document.getElementById(statusId);
    
    try {
        statusDiv.textContent = `正在上传${typeText}文件...`;
        
        // 上传文件
        const data = await fileManager.uploadFiles(newFiles, '/upimg', {
            key: 'image',
            extraData: { destination: state.destination }
        });

        if (!data.success) {
            throw new Error(data.message || `${typeText}上传失败`);
        }

        // 生成插入代码
        let markdown = '';
        if (fileType === 'video') {
            markdown = generateVideoMarkdown(data.filenames, state.destination);
        } else {
            markdown = generateImageMarkdown(data.filenames, state.destination);
        }

        // 更新文件列表和选择器
        statusDiv.textContent = '更新文件列表...';
        await updateFileListAndSelector(state.destination);
        
        // 插入代码到编辑器
        insertAtCursor(markdown);
        state.hasContentChanged = true;

        hideModal(modal, overlay);
    } catch (error) {
        console.error(`${typeText}上传失败:`, error);
        alert(`${typeText}上传失败！${error.message ? ': ' + error.message : ''}`);
        hideModal(modal, overlay);
    }
}

/**
 * 过滤已存在的文件，提示用户是否替换 - 使用通用工具类
 * @param {File[]} files - 文件列表
 * @param {string} destination - 目标路径
 * @returns {Promise<File[]>} 过滤后的文件列表
 */
async function filterExistingFiles(files, destination) {
    return CommonUtils.filterExistingFiles(files, destination);
}

/**
 * 为视频文件生成Markdown代码 - 使用通用工具类
 * @param {string[]} filenames - 文件名数组
 * @param {string} destination - 目标路径
 * @returns {string} 生成的Markdown代码
 */
function generateVideoMarkdown(filenames, destination) {
    return CommonUtils.generateVideoMarkdown(filenames, destination);
}

/**
 * 为图片文件生成Markdown代码 - 使用通用工具类
 * @param {string[]} filenames - 文件名数组
 * @param {string} destination - 目标路径
 * @returns {string} 生成的Markdown代码
 */
function generateImageMarkdown(filenames, destination) {
    return CommonUtils.generateImageMarkdown(filenames, destination);
}

/**
 * 处理拖拽上传的视频文件
 * @param {File[]} videoFiles - 拖拽的视频文件数组
 */
async function handleDraggedVideos(videoFiles) {
    await handleDraggedMedia(videoFiles, 'video');
}

/**
 * 处理拖拽上传的图片文件
 * @param {File[]} imageFiles - 拖拽的图片文件数组
 */
async function handleDraggedImages(imageFiles) {
    await handleDraggedMedia(imageFiles, 'image');
}

/**
 * 处理拖拽上传的Markdown文件
 * @param {File[]} mdFiles - 拖拽的Markdown文件数组
 */
async function handleDraggedMdFiles(mdFiles) {
    // 使用Promise.all并行处理多个MD文件上传
    const uploadPromises = mdFiles.map(async (mdFile) => {
        const filename = mdFile.name;
        const existingOption = Array.from(DOM.mdSelect.options).find(opt => opt.value === filename);
        
        // 如果文件已存在且用户取消替换，则跳过此文件
        if (existingOption && !confirm(`\"${filename}\" already exists, replace it?`)) {
            return null;
        }
        
        try {
            // 使用fileManager上传文件，保持一致性
            const data = await fileManager.uploadFiles([mdFile], '/upload', { key: 'md_file' });
            
            return { file: mdFile, data };
        } catch (error) {
            console.error('MD file upload failed:', error);
            alert(`MD 文件 ${filename} 上传失败！`);
            return null;
        }
    });
    
    // 等待所有上传完成
    const results = await Promise.all(uploadPromises);
    
    // 处理成功上传的文件
    for (const result of results) {
        if (!result) continue; // 跳过失败或取消的上传
        
        const { file, data } = result;
        state.currentFilename = data.filename;
        
        // 更新MD选择器
        const existingOption = Array.from(DOM.mdSelect.options).find(opt => opt.value === data.filename);
        if (!existingOption) {
            addOptionToSelect(DOM.mdSelect, data.filename);
        } else {
            DOM.mdSelect.value = data.filename;
        }
        
        // 更新选择器显示文本
        if (window.updateSelectorText) {
            window.updateSelectorText('md-select', 'MD 文件');
        }
        
        // 同步文件夹和图片选择器
        await syncFolderWithMdFile(data.filename);
        
        // 上传成功后，从服务器重新读取文件内容
        setTimeout(async () => {
            await getContent(data.filename);
        }, 1000);
    }
}

/**
 * 获取目录树并更新选择器
 * @param {string} directory - 目录路径
 * @param {HTMLSelectElement} parentNode - 要更新的选择器元素
 * @param {string} fileType - 文件类型过滤器
 * @param {string} errorMessage - 错误提示信息
 */
window.fetchDirectoryTree = async (directory, parentNode, fileType, errorMessage) => {
    while (parentNode.options.length > 1) parentNode.remove(1);
    try {
        const data = await window.apiService.getDirectoryTree(directory);
        buildOptions(data, parentNode, fileType);
    } catch (error) {
        console.error(error);
        alert(errorMessage);
    }
};

/**
 * 根据目录树数据构建选择器选项
 * @param {Object} treeData - 目录树数据
 * @param {HTMLSelectElement} parentNode - 选择器元素
 * @param {string} fileType - 文件类型过滤器
 */
window.buildOptions = (treeData, parentNode, fileType) => {
    // 获取 select 元素的 ID 以应用特定的过滤规则
    const selectId = parentNode.id;

    // 使用 Set 来跟踪已添加的选项以防止重复
    const addedItems = new Set();
    for (let i = 1; i < parentNode.options.length; i++) {
        addedItems.add(parentNode.options[i].value);
    }

    let itemIndex = 1; // 初始化项目计数器

    const addOptionsRecursively = (data) => {
        // 确保数据及其子项有效
        if (!data || !Array.isArray(data.children)) {
            return;
        }

        for (const child of data.children) {
            let shouldAddItem = false;

            // 检查项目类型是否与所需的文件类型匹配
            if (child.type === fileType) {
                // 根据下拉列表的 ID 应用特定规则
                if (selectId === 'md-select') {
                    // 对于 MD 文件下拉列表，按 .md 后缀过滤，并排除内部缓存文件 cache
                    if (child.name.endsWith('.md') && child.name !== 'cache') {
                        shouldAddItem = true;
                    }
                } else {
                    // 对于所有其他下拉列表（例如 img-select, directory-select），接受所有正确类型的项目
                    shouldAddItem = true;
                }
            }

            // 如果项目应该被添加且尚未被添加
            if (shouldAddItem && !addedItems.has(child.name)) {
                const option = document.createElement('option');
                option.value = child.name;

                let displayName = child.name; // 默认显示名称
                let icon = '';

                // 根据文件类型添加图标，但对于目录选择器不添加图标
                if (child.type === 'file') {
                    const fileExt = child.name.split('.').pop().toLowerCase();
                    if (VIDEO_EXTENSIONS.includes(fileExt)) {
                        icon = '🎬 '; // 添加视频图标
                    } else if (IMAGE_EXTENSIONS.includes(fileExt)) {
                        icon = '🖼️ '; // 添加图片图标
                    }
                }
                
                // 将项目索引和图标添加到显示名称中
                displayName = `${itemIndex}. ${icon}${child.name}`;
                option.textContent = displayName;
                itemIndex++; // 为下一个项目增加索引

                parentNode.appendChild(option);
                addedItems.add(child.name); // 标记为已添加
            }

            // 总是递归到子目录中以查找所有嵌套的文件/文件夹
            if (child.type === 'directory') {
                addOptionsRecursively(child);
            }
        }
    };

    // 启动递归过程
    addOptionsRecursively(treeData);
};

/**
 * 处理图片目录选择变更
 * 更新目标路径和图片选择器
 */
window.imgDirectorySelect = async () => {
    state.destination = DOM.directorySelect.value 
        ? `${CONFIG.ORIGINAL_DIR}${DOM.directorySelect.value}/`
        : `${CONFIG.ORIGINAL_DIR}${CONFIG.DEFAULT_IMG_DIR}/`;
    
    await fetchDirectoryTree(state.destination, DOM.imgSelect, 'file', 'Failed to get IMG files');
    
    // 更新选择器显示文本
    if (window.updateSelectorText) {
        window.updateSelectorText('img-select', '图片/视频文件');
    }
};
