export class OperationsFloatingPanel {
    constructor() {
        this.panel = null;
        this.isVisible = false;
        this.init();
    }

    init() {
        this.createPanel();
        this.createToggleButton();
        this.bindEvents();
    }

    createToggleButton() {
        // 创建切换按钮
        this.toggleBtn = document.createElement('div');
        this.toggleBtn.id = 'operations-toggle-btn';
        this.toggleBtn.className = 'operations-toggle-btn';
        this.toggleBtn.innerHTML = '🛠️';
        this.toggleBtn.title = '打开操作面板';
        
        this.toggleBtn.addEventListener('click', () => {
            this.togglePanel();
        });
        
        document.body.appendChild(this.toggleBtn);
    }

    createPanel() {
        // 创建操作面板
        this.panel = document.createElement('div');
        this.panel.id = 'operations-floating-panel';
        this.panel.className = 'operations-floating-panel hidden';
        

        // 创建内容
        const content = document.createElement('div');
        content.className = 'operations-content';
        
        // 创建标题栏
        const header = this.createHeader();
        content.appendChild(header);
        
        // 创建主要内容区域
        const mainContent = document.createElement('div');
        mainContent.className = 'operations-main';
        
        // 添加各个功能区域
        mainContent.appendChild(this.createFileOperationsSection());
        mainContent.appendChild(this.createQuickActionsSection());
        
        content.appendChild(mainContent);
        this.panel.appendChild(content);
        
        // 添加到页面
        document.body.appendChild(this.panel);
    }

    createHeader() {
        const header = document.createElement('div');
        header.className = 'operations-header';
        
        const title = document.createElement('div');
        title.className = 'operations-title';
        title.innerHTML = '🛠️ 操作面板';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn';
        closeBtn.innerHTML = '×';
        closeBtn.title = '关闭操作面板';
        
        closeBtn.addEventListener('click', () => {
            this.hidePanel();
        });
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        return header;
    }

    createFileOperationsSection() {
        const section = document.createElement('div');
        section.className = 'operations-section';
        
        const title = document.createElement('div');
        title.className = 'section-title';
        title.textContent = '📁 文件操作';
        
        const operations = [
            {
                icon: '📝',
                text: '导入MD文件',
                tooltip: '选择本地.md文件导入到编辑器中',
                action: 'load-md'
            },
            {
                icon: '🖼️',
                text: '批量上传图片/视频',
                tooltip: '选择多张图片批量上传到服务器',
                action: 'upload-images'
            },
            {
                icon: '📂',
                text: '上传文件夹',
                tooltip: '选择整个文件夹上传到服务器',
                action: 'upload-folder'
            },
            {
                icon: '📁',
                text: '创建文件夹',
                tooltip: '在当前目录创建新文件夹',
                action: 'create-folder'
            }
        ];
        
        operations.forEach(op => {
            const btn = this.createOperationButton(op);
            section.appendChild(btn);
        });
        
        return section;
    }

    createQuickActionsSection() {
        const section = document.createElement('div');
        section.className = 'operations-section';
        
        const title = document.createElement('div');
        title.className = 'section-title';
        title.textContent = '⚡ 快捷操作';
        
        const actions = [
            {
                icon: '💾',
                text: '立即保存',
                tooltip: '立即保存当前编辑的文档内容',
                action: 'save'
            },
            {
                icon: '🔄',
                text: '初始化博客',
                tooltip: '执行hexo clean和generate，更新博客显示图片',
                action: 'regenerate'
            },
            {
                icon: '📤',
                text: '导出MD文件',
                tooltip: '将当前内容压缩并导出（md 文件+媒体文件夹）',
                action: 'export'
            }
        ];
        
        actions.forEach(action => {
            const btn = this.createOperationButton(action);
            section.appendChild(btn);
        });
        
        return section;
    }

    createOperationButton(item) {
        const button = document.createElement('button');
        button.className = 'operation-btn';
        button.innerHTML = `${item.icon} ${item.text}`;
        button.title = item.tooltip;
        button.dataset.action = item.action;
        
        button.addEventListener('click', () => {
            this.handleAction(item.action);
        });
        
        return button;
    }

    handleAction(action) {
        switch (action) {
            case 'load-md':
                if (window.importMdFile) {
                    window.importMdFile();
                }
                break;
            case 'upload-images':
                if (window.inputImg) {
                    window.inputImg();
                }
                break;
            case 'upload-folder':
                if (window.uploadFolder) {
                    window.uploadFolder();
                }
                break;
            case 'create-folder':
                if (window.createFolderPrompt) {
                    window.createFolderPrompt();
                }
                break;
            case 'save':
                if (window.handSave) {
                    window.handSave();
                }
                break;
            case 'regenerate':
                if (window.cleanHexo) {
                    window.cleanHexo();
                }
                break;
            case 'export':
                if (window.handExport) {
                    window.handExport();
                }
                break;
        }
    }

    togglePanel() {
        if (this.isVisible) {
            this.hidePanel();
        } else {
            this.showPanel();
        }
    }

    showPanel() {
        this.panel.classList.remove('hidden');
        this.panel.classList.add('visible');
        this.toggleBtn.innerHTML = '✕';
        this.toggleBtn.title = '关闭操作面板';
        this.isVisible = true;
        
        // 设置z-index使其置顶
        this.panel.style.zIndex = '2147483647'; // 最大z-index

        // 将其他面板的z-index设置为较低值
        const statusPanel = document.querySelector('.status-floating-panel');
        if (statusPanel) {
            statusPanel.style.zIndex = '2147483646';
        }

        // 动态调整面板位置，显示在小浮球旁边
        this.positionPanelNearButton();
    }

    hidePanel() {
        this.panel.classList.remove('visible');
        this.panel.classList.add('hidden');
        this.toggleBtn.innerHTML = '🛠️';
        this.toggleBtn.title = '打开操作面板';
        this.isVisible = false;
    }


    bindEvents() {
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            this.adjustPosition();
        });
        
        // 点击外部关闭面板
        document.addEventListener('click', (e) => {
            if (this.isVisible && 
                !this.panel.contains(e.target) && 
                !this.toggleBtn.contains(e.target)) {
                this.hidePanel();
            }
        });
    }

    positionPanelNearButton() {
        // 获取小浮球的位置
        const btnRect = this.toggleBtn.getBoundingClientRect();
        const panelWidth = 240;
        const panelHeight = this.panel.offsetHeight || 400;
        
        // 计算面板位置（显示在小浮球左侧）
        let left = btnRect.left - panelWidth - 10;
        let top = btnRect.top;
        
        // 确保面板不会超出屏幕边界
        if (left < 10) {
            left = btnRect.right + 10; // 如果左侧空间不够，显示在右侧
        }
        
        if (top + panelHeight > window.innerHeight) {
            top = window.innerHeight - panelHeight - 10;
        }
        
        if (top < 10) {
            top = 10;
        }
        
        // 设置面板位置
        this.panel.style.left = left + 'px';
        this.panel.style.top = top + 'px';
        this.panel.style.right = 'auto';
    }

    adjustPosition() {
        // 响应式调整位置
        if (window.innerWidth < 768) {
            this.toggleBtn.style.right = '10px';
            this.toggleBtn.style.bottom = '80px';
        } else {
            this.toggleBtn.style.right = '20px';
            this.toggleBtn.style.bottom = '80px';
        }
        
        // 如果面板是打开的，重新定位
        if (this.isVisible) {
            this.positionPanelNearButton();
        }
    }
}