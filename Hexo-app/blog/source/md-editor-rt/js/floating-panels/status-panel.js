const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv'];
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];

export class StatusFloatingPanel {
    constructor() {
        this.statusPanel = null;
        this.statusToggleButton = null;
        this.statusPanelVisible = true; // 默认展开模式

        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.hasDragged = false;
        this.dragStartPos = { x: 0, y: 0 };

        this.init();
    }

    init() {
        this.createToggleButton();
        this.createStatusPanel();
        this.bindEvents();
        this.showStatusPanel(); // 默认展开状态面板，其内部会调用 updateStatusPanel
        // 移除 setInterval，避免频繁请求
        // 状态更新将由用户操作或相关事件触发
    }

    createToggleButton() {
        this.statusToggleButton = document.createElement('div');
        this.statusToggleButton.className = 'status-toggle-btn'; // 使用CSS类
        this.statusToggleButton.innerHTML = '✕';
        this.statusToggleButton.title = '关闭状态面板 (可拖动)';
        document.body.appendChild(this.statusToggleButton);
    }

    createStatusPanel() {
        this.statusPanel = document.createElement('div');
        this.statusPanel.className = 'status-floating-panel'; // 使用CSS类

        this.statusPanel.innerHTML = `
            <div style="margin-bottom: 8px; font-weight: bold; color: #ff6b35; border-bottom: 1px solid rgba(255, 107, 53, 0.3); padding-bottom: 6px; font-size: 12px;">📊 操作中心</div>
            <div id="status-content">
                <div class="status-item clickable-item" onclick="window.statusPanel.showMdFileSelector()"><span class="status-label">📝 文件:</span><span id="current-file-status">-</span><button class="action-btn" title="选择MD文件">📂</button></div>
                <div class="status-item clickable-item" onclick="window.statusPanel.showFolderSelector()"><span class="status-label">📁 目录:</span><span id="current-folder-status">-</span><button class="action-btn" title="选择文件夹">📁</button></div>
                <div class="status-item clickable-item" onclick="window.statusPanel.showMediaSelector()"><span class="status-label">🖼️ 媒体:</span><span id="media-files-status">-</span><button class="action-btn" title="选择媒体文件">🖼️</button></div>
                <div class="status-item"><span class="status-label">⏰ 保存:</span><span id="autosave-status">-</span><button class="action-btn" onclick="window.setAutoSaveInterval()" title="设置自动保存">⚙️</button></div>
                <div class="status-item"><span class="status-label">🗂️ 初始化 hexo:</span><span id="cache-status">-</span><button class="action-btn" onclick="window.cleanHexo()" title="hexo clean && hexo generate ">🧹</button></div>
            </div>
        `;
        document.body.appendChild(this.statusPanel);
    }

    bindEvents() {
        // 悬停效果
        this.statusToggleButton.addEventListener('mouseenter', () => {
            this.statusToggleButton.style.transform = 'scale(1.1)';
            this.statusToggleButton.style.boxShadow = '0 6px 20px rgba(255, 107, 53, 0.4)';
        });

        this.statusToggleButton.addEventListener('mouseleave', () => {
            this.statusToggleButton.style.transform = 'scale(1)';
            this.statusToggleButton.style.boxShadow = '0 4px 15px rgba(255, 107, 53, 0.3)';
        });

        // 鼠标按下事件
        this.statusToggleButton.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.isDragging = true;
                this.hasDragged = false;
                
                const rect = this.statusToggleButton.getBoundingClientRect();
                this.dragOffset.x = e.clientX - rect.left;
                this.dragOffset.y = e.clientY - rect.top;
                
                this.dragStartPos.x = e.clientX;
                this.dragStartPos.y = e.clientY;
                
                e.preventDefault();
                
                this.statusToggleButton.style.cursor = 'grabbing';
                this.statusToggleButton.style.transition = 'none';
            }
        });

        // 鼠标移动事件
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const moveDistance = Math.sqrt(
                    Math.pow(e.clientX - this.dragStartPos.x, 2) + 
                    Math.pow(e.clientY - this.dragStartPos.y, 2)
                );
                
                if (moveDistance > 5) {
                    this.hasDragged = true;
                }
                
                const x = e.clientX - this.dragOffset.x;
                const y = e.clientY - this.dragOffset.y;
                
                const maxX = window.innerWidth - 50;
                const maxY = window.innerHeight - 50;
                
                const constrainedX = Math.max(0, Math.min(x, maxX));
                const constrainedY = Math.max(0, Math.min(y, maxY));
                
                this.statusToggleButton.style.left = constrainedX + 'px';
                this.statusToggleButton.style.top = constrainedY + 'px';
                this.statusToggleButton.style.right = 'auto';
                this.statusToggleButton.style.bottom = 'auto';
            }
        });

        // 鼠标释放事件
        document.addEventListener('mouseup', (e) => {
            if (this.isDragging) {
                this.isDragging = false;
                this.statusToggleButton.style.cursor = 'move';
                this.statusToggleButton.style.transition = 'all 0.3s ease';
                
                if (this.hasDragged) {
                    const rect = this.statusToggleButton.getBoundingClientRect();
                    localStorage.setItem('statusButtonPosition', JSON.stringify({
                        left: rect.left,
                        top: rect.top
                    }));
                }
            }
        });

        // 点击切换面板（只在没有拖动时触发）
        this.statusToggleButton.addEventListener('click', (e) => {
            if (!this.hasDragged) {
                this.toggleStatusPanel();
            }
            this.hasDragged = false;
        });

        // 监听选择器变化 (不再依赖旧的 window.DOM)
        // 状态面板的更新将由其内部的 updateStatusPanel 方法负责，该方法会读取 window.state 和 window.fileManager 的最新状态
    }

    toggleStatusPanel() {
        if (this.statusPanelVisible) {
            this.hideStatusPanel();
        } else {
            this.showStatusPanel();
        }
    }

    showStatusPanel() {
        this.positionStatusPanel();
        this.statusPanel.style.opacity = '1';
        this.statusPanel.style.transform = 'translateX(0)';
        this.statusPanel.style.pointerEvents = 'all';
        this.statusPanel.style.zIndex = '9999'; // 置顶

        // 将其他面板的z-index设置为较低值
        const operationsPanel = document.querySelector('.operations-floating-panel');
        if (operationsPanel) {
            operationsPanel.style.zIndex = '9998';
        }

        this.statusToggleButton.innerHTML = '✕';
        this.statusToggleButton.title = '关闭状态面板';
        this.statusPanelVisible = true;
        this.updateStatusPanel();
    }

    hideStatusPanel() {
        this.statusPanel.style.opacity = '0';
        this.statusPanel.style.transform = 'translateX(100%)';
        this.statusPanel.style.pointerEvents = 'none';
        this.statusPanel.style.zIndex = '9998'; // 恢复默认层级
        this.statusToggleButton.innerHTML = '📊';
        this.statusToggleButton.title = '打开状态面板';
        this.statusPanelVisible = false;
    }

    positionStatusPanel() {
        const buttonRect = this.statusToggleButton.getBoundingClientRect();
        const panelWidth = 280;
        const panelHeight = 400; // 预估高度

        let left = buttonRect.left - panelWidth - 10;
        let top = buttonRect.top;
        
        if (left < 10) {
            left = buttonRect.right + 10;
        }
        
        if (top + panelHeight > window.innerHeight) {
            top = window.innerHeight - panelHeight - 10;
        }
        
        if (top < 10) {
            top = 10;
        }
        
        this.statusPanel.style.left = left + 'px';
        this.statusPanel.style.top = top + 'px';
    }

    updateStatusPanel() {
        if (!this.statusPanel || !window.appState || !window.CONFIG || !window.fileManager) return;

        const currentFileElement = document.getElementById('current-file-status');
        if (currentFileElement) {
            let displayedFilename = window.appState.getCurrentFile() || 'cache';
            if (displayedFilename !== 'cache') {
                displayedFilename += '.md';
            }
            currentFileElement.textContent = displayedFilename;
        }

        const currentFolderElement = document.getElementById('current-folder-status');
        if (currentFolderElement) {
            currentFolderElement.textContent = window.appState.getCurrentMediaFolder() || 'IMG';
        }

        const mediaFilesElement = document.getElementById('media-files-status');
        if (mediaFilesElement) {
            mediaFilesElement.textContent = '加载中...';
            // 使用状态管理系统获取当前媒体文件夹
            const currentMediaFolder = window.appState.getCurrentMediaFolder();
            const mediaDirToFetch = currentMediaFolder === 'IMG' ? 
                (window.CONFIG.ORIGINAL_DIR + '/IMG') : 
                (window.CONFIG.ORIGINAL_DIR + '/' + currentMediaFolder);
            
            // Normalize the path BEFORE passing to fetchDirectoryTree
            const normalizedMediaDirToFetch = window.fileManager.normalizeDirectoryPath(mediaDirToFetch);

            window.fileManager.fetchDirectoryTree(normalizedMediaDirToFetch)
                .then(data => {
                    const mediaCount = (Array.isArray(data.files) ? data.files : []).filter(file =>
                        file.name.match(/\.(jpg|jpeg|png|gif|bmp|svg|webp|mp4|webm|ogg)$/i)
                    ).length;
                    mediaFilesElement.textContent = mediaCount > 0 ? `${mediaCount} 个文件` : '无文件';
                })
                .catch(error => {
                    console.error(`获取媒体文件数量失败 (${normalizedMediaDirToFetch}):`, error);
                    mediaFilesElement.textContent = '加载失败';
                });
        }

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

        const cacheElement = document.getElementById('cache-status');
        if (cacheElement) {
            cacheElement.textContent = '页面关闭时自动执行';
            cacheElement.style.color = '#10b981';
        }
    }


    async showMdFileSelector() {
        try {
            const data = await window.fileManager.fetchDirectoryTree(window.CONFIG.ORIGINAL_DIR);
            console.log('Fetched data for MD files:', data); // 添加日志
            const mdFiles = (Array.isArray(data.files) ? data.files : []).filter(file => file.name.endsWith('.md'));
            console.log('Filtered MD files:', mdFiles); // 添加日志
            
            if (mdFiles.length === 0) {
                window.showMessage('暂无MD文件可选择', 'info');
                return;
            }
            
            const options = mdFiles.map((file, index) => ({ value: file.path, textContent: `${index + 1}. 📝 ${file.name}` }));
            
            this.createStatusDropdown('MD文件选择', options, (selectedValue) => {
                window.loadMdFile(selectedValue);
            });
        } catch (error) {
            window.showMessage(`获取MD文件列表失败: ${error.message}`, 'error');
        }
    }

    async showFolderSelector() {
        try {
            const data = await window.fileManager.fetchDirectoryTree(window.CONFIG.ORIGINAL_DIR);
            const folders = Array.isArray(data.folders) ? data.folders : [];
            
            // 添加IMG文件夹选项
            const options = [
                { value: 'IMG', textContent: '1. 📁 IMG (默认媒体文件夹)' }
            ];
            
            // 添加其他文件夹
            folders.forEach((folder) => {
                // 避免重复添加IMG文件夹
                if (folder.name !== 'IMG') {
                    options.push({ 
                        value: folder.name, 
                        textContent: `${options.length + 1}. 📁 ${folder.name}` 
                    });
                }
            });
            
            this.createStatusDropdown('媒体文件夹选择', options, (selectedValue) => {
                // 使用状态管理系统更新媒体文件夹，确保触发相应的事件和 UI 更新
                window.appState.updateCurrentFile(window.appState.getCurrentFile(), selectedValue);
                window.showMessage(`已选择媒体文件夹: ${selectedValue}`, 'success');
            });
        } catch (error) {
            window.showMessage(`获取文件夹列表失败: ${error.message}`, 'error');
        }
    }

    async showMediaSelector() {
        try {
            // 使用状态管理系统获取当前媒体文件夹
            const currentMediaFolder = window.appState.getCurrentMediaFolder();
            const mediaDirToFetch = currentMediaFolder === 'IMG' ? 
                (window.CONFIG.ORIGINAL_DIR + '/IMG') : 
                (window.CONFIG.ORIGINAL_DIR + '/' + currentMediaFolder);
            
            const normalizedMediaDir = window.fileManager.normalizeDirectoryPath(mediaDirToFetch);
            const mediaData = await window.fileManager.fetchDirectoryTree(normalizedMediaDir);
            
            const mediaFiles = (Array.isArray(mediaData.files) ? mediaData.files : []).filter(file => 
                file.name.match(/\.(jpg|jpeg|png|gif|bmp|svg|webp|mp4|webm|ogg)$/i)
            );
            
            if (mediaFiles.length === 0) {
                window.showMessage(`当前媒体文件夹 (${currentMediaFolder}) 中暂无媒体文件`, 'info');
                return;
            }
            
            const options = mediaFiles.map((file, index) => {
                const fileExt = file.name.split('.').pop().toLowerCase();
                let icon = '';
                if (VIDEO_EXTENSIONS.includes(fileExt)) {
                    icon = '🎬';
                } else if (IMAGE_EXTENSIONS.includes(fileExt)) {
                    icon = '🖼️';
                }
                return { value: file.path, textContent: `${index + 1}. ${icon} ${file.name}` };
            });
            
            this.createStatusDropdown(`媒体文件选择 (${currentMediaFolder})`, options, (selectedValue) => {
                // 插入媒体文件到编辑器
                const filename = selectedValue.split('/').pop();
                const lastDotIndex = filename.lastIndexOf('.');
                const altTextWithoutExtension = (lastDotIndex > 0) ? filename.substring(0, lastDotIndex) : filename;

                const markdown = window.fileManager.generateMarkdownImage(altTextWithoutExtension, selectedValue);
                if (window.insertEditorContent) {
                    window.insertEditorContent(markdown);
                    window.showMessage(`✅ 媒体文件 ${filename} 已插入`, 'success');
                } else {
                    window.showMessage('❌ 无法插入媒体文件，编辑器接口未准备好', 'error');
                }
            });
        } catch (error) {
            console.error('获取媒体文件失败:', error);
            window.showMessage(`获取媒体文件列表失败: ${error.message}`, 'error');
        }
    }

    createStatusDropdown(title, options, onSelect) {
        const existingDropdown = document.querySelector('.status-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
        }

        const dropdown = document.createElement('div');
        dropdown.className = 'status-dropdown';

        const titleElement = document.createElement('div');
        titleElement.className = 'status-dropdown-title'; // 使用CSS类
        titleElement.textContent = title;
        dropdown.appendChild(titleElement);

        options.forEach((option) => {
            const item = document.createElement('div');
            item.className = 'status-dropdown-item';
            item.textContent = option.textContent;

            item.addEventListener('mouseenter', function() {
                this.style.background = 'rgba(255, 107, 53, 0.2)';
                this.style.borderColor = 'rgba(255, 107, 53, 0.5)';
                this.style.transform = 'translateX(4px)';
            });

            item.addEventListener('mouseleave', function() {
                this.style.background = 'transparent';
                this.style.borderColor = 'transparent';
                this.style.transform = 'translateX(0)';
            });

            item.addEventListener('click', function() {
                onSelect(option.value);
                dropdown.remove();
            });

            dropdown.appendChild(item);
        });

        const statusPanelElement = document.querySelector('#status-floating-panel') || 
                                   document.querySelector('.status-floating-panel');
        if (statusPanelElement) {
            const rect = statusPanelElement.getBoundingClientRect();
            dropdown.style.left = (rect.left - 260) + 'px';
            dropdown.style.top = rect.top + 'px';
        } else {
            dropdown.style.left = '50%';
            dropdown.style.top = '50%';
            dropdown.style.transform = 'translate(-50%, -50%)';
        }

        document.body.appendChild(dropdown);

        setTimeout(() => {
            document.addEventListener('click', function closeDropdown(e) {
                if (!dropdown.contains(e.target)) {
                    dropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                }
            });
        }, 100);
    }
}

window.StatusFloatingPanel = StatusFloatingPanel;