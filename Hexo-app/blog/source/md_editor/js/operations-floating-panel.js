class OperationsFloatingPanel {
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
        
        // 添加样式
        this.addStyles();
        
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
                text: '批量上传图片',
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
                tooltip: '将当前内容导出为.md文件下载',
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
                if (window.loadMdFile) {
                    window.loadMdFile();
                }
                break;
            case 'upload-images':
                if (window.inputImg) {
                    window.inputImg();
                }
                break;
            case 'upload-folder':
                if (window.loadMdFile) {
                    window.loadMdFile();
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

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .operations-toggle-btn {
                position: fixed;
                bottom: 80px;
                right: 20px;
                width: 50px;
                height: 50px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
                z-index: 9998;
                transition: all 0.3s ease;
                user-select: none;
            }

            .operations-toggle-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 25px rgba(102, 126, 234, 0.6);
            }

            .operations-floating-panel {
                position: fixed;
                width: 240px;
                max-height: 80vh;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
                border: 1px solid rgba(255, 255, 255, 0.2);
                z-index: 9998;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                overflow: hidden;
                transition: all 0.3s ease;
            }

            .operations-floating-panel.hidden {
                opacity: 0;
                transform: translateX(100%);
                pointer-events: none;
            }

            .operations-floating-panel.visible {
                opacity: 1;
                transform: translateX(0);
                pointer-events: all;
            }

            .operations-content {
                display: flex;
                flex-direction: column;
                height: 100%;
            }

            .operations-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }

            .operations-title {
                font-weight: 600;
                font-size: 14px;
            }

            .close-btn {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 18px;
                font-weight: bold;
                padding: 4px 8px;
                border-radius: 6px;
                transition: all 0.2s ease;
            }

            .close-btn:hover {
                background: rgba(255, 255, 255, 0.2);
            }

            .operations-main {
                flex: 1;
                overflow-y: auto;
                padding: 12px;
                max-height: calc(80vh - 60px);
            }

            .operations-section {
                margin-bottom: 12px;
                padding: 10px;
                background: rgba(248, 250, 252, 0.8);
                border-radius: 8px;
                border: 1px solid rgba(226, 232, 240, 0.5);
            }

            .section-title {
                font-weight: 600;
                color: #334155;
                font-size: 13px;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid rgba(226, 232, 240, 0.5);
            }

            .selector-item {
                margin-bottom: 12px;
            }

            .selector-label {
                display: block;
                color: #64748b;
                font-size: 12px;
                font-weight: 500;
                margin-bottom: 6px;
            }

            .modern-select {
                width: 100%;
                padding: 8px 10px;
                border: 1px solid rgba(226, 232, 240, 0.8);
                border-radius: 8px;
                background: white;
                color: #1a1a1a;
                font-size: 12px;
                transition: all 0.2s ease;
            }

            .modern-select:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }

            .operation-btn {
                width: 100%;
                padding: 8px 12px;
                margin-bottom: 6px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: flex-start;
                gap: 8px;
            }

            .operation-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
            }

            .operation-btn:active {
                transform: translateY(0);
            }

            .operation-btn:last-child {
                margin-bottom: 0;
            }

            @media (max-width: 768px) {
                .operations-floating-panel {
                    width: 300px;
                    right: 10px;
                    top: 60px;
                }
                
                .operations-toggle-btn {
                    right: 10px;
                    bottom: 20px;
                }
            }

            @media (max-width: 480px) {
                .operations-floating-panel {
                    width: calc(100vw - 20px);
                    right: 10px;
                    left: 10px;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// 初始化操作面板
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.operationsPanel = new OperationsFloatingPanel();
    }, 2000);
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.operationsPanel = new OperationsFloatingPanel();
        }, 2000);
    });
} else {
    setTimeout(() => {
        window.operationsPanel = new OperationsFloatingPanel();
    }, 2000);
}