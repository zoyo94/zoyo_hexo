/**
 * UI服务类 - 统一处理界面更新操作
 */
class UIService {
    /**
     * 更新选择器显示文本
     */
    static updateSelectorText(selectId, defaultText) {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        const selectedOption = select.options[select.selectedIndex];
        const displayText = selectedOption && selectedOption.value ? 
            selectedOption.textContent : defaultText;
        
        // 更新显示文本的逻辑
        const textElement = select.parentElement.querySelector('.selector-text');
        if (textElement) {
            textElement.textContent = displayText;
        }
    }

    /**
     * 向选择器添加选项
     */
    static addOptionToSelect(selectElement, value, text = null, index = null) {
        if (!selectElement) return;
        
        // 检查选项是否已存在
        const existingOption = Array.from(selectElement.options).find(opt => opt.value === value);
        if (existingOption) return existingOption;
        
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text || value;
        
        if (index !== null && index < selectElement.options.length) {
            selectElement.insertBefore(option, selectElement.options[index]);
        } else {
            selectElement.appendChild(option);
        }
        
        return option;
    }

    /**
     * 清空选择器选项（保留第一个默认选项）
     */
    static clearSelectOptions(selectElement, keepFirst = true) {
        if (!selectElement) return;
        
        const startIndex = keepFirst ? 1 : 0;
        while (selectElement.options.length > startIndex) {
            selectElement.remove(startIndex);
        }
    }

    /**
     * 显示模态框
     */
    static showModal(title, content, options = {}) {
        // 移除已存在的模态框
        this.hideAllModals();
        
        const modal = document.createElement('div');
        modal.className = 'ui-modal';
        modal.innerHTML = `
            <div class="ui-modal-overlay"></div>
            <div class="ui-modal-content">
                <div class="ui-modal-header">
                    <h3 class="ui-modal-title">${title}</h3>
                    ${options.showCloseButton !== false ? '<button class="ui-modal-close">×</button>' : ''}
                </div>
                <div class="ui-modal-body">
                    ${content}
                </div>
                ${options.showFooter ? `<div class="ui-modal-footer">${options.footerContent || ''}</div>` : ''}
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 添加样式
        this.addModalStyles();
        
        // 绑定关闭事件
        const closeBtn = modal.querySelector('.ui-modal-close');
        const overlay = modal.querySelector('.ui-modal-overlay');
        
        const closeModal = () => this.hideModal(modal);
        
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (overlay && options.closeOnOverlay !== false) {
            overlay.addEventListener('click', closeModal);
        }
        
        // 显示动画
        setTimeout(() => modal.classList.add('show'), 10);
        
        return {
            modal,
            overlay,
            close: closeModal
        };
    }

    /**
     * 隐藏模态框
     */
    static hideModal(modal) {
        if (!modal) return;
        
        modal.classList.remove('show');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }

    /**
     * 隐藏所有模态框
     */
    static hideAllModals() {
        const modals = document.querySelectorAll('.ui-modal');
        modals.forEach(modal => this.hideModal(modal));
    }

    /**
     * 显示进度模态框
     */
    static showProgressModal(title, initialMessage = '准备中...') {
        const content = `
            <div class="progress-container">
                <div class="progress-circle"></div>
                <div id="progress-text" class="progress-text">${initialMessage}</div>
                <div id="progress-bar-container" class="progress-bar-container" style="display: none;">
                    <div id="progress-bar" class="progress-bar"></div>
                    <div id="progress-percentage" class="progress-percentage">0%</div>
                </div>
            </div>
        `;
        
        const modalData = this.showModal(title, content, { 
            showCloseButton: false, 
            closeOnOverlay: false 
        });
        
        return {
            ...modalData,
            updateText: (text) => {
                const textElement = document.getElementById('progress-text');
                if (textElement) textElement.textContent = text;
            },
            updateProgress: (percentage) => {
                const container = document.getElementById('progress-bar-container');
                const bar = document.getElementById('progress-bar');
                const percentageElement = document.getElementById('progress-percentage');
                
                if (container) container.style.display = 'block';
                if (bar) bar.style.width = `${percentage}%`;
                if (percentageElement) percentageElement.textContent = `${percentage}%`;
            }
        };
    }

    /**
     * 显示确认对话框
     */
    static showConfirm(title, message, options = {}) {
        return new Promise((resolve) => {
            const content = `
                <div class="confirm-message">${message}</div>
                <div class="confirm-buttons">
                    <button class="btn btn-cancel">${options.cancelText || '取消'}</button>
                    <button class="btn btn-confirm">${options.confirmText || '确认'}</button>
                </div>
            `;
            
            const modalData = this.showModal(title, content, { showCloseButton: false });
            
            const cancelBtn = modalData.modal.querySelector('.btn-cancel');
            const confirmBtn = modalData.modal.querySelector('.btn-confirm');
            
            cancelBtn.addEventListener('click', () => {
                modalData.close();
                resolve(false);
            });
            
            confirmBtn.addEventListener('click', () => {
                modalData.close();
                resolve(true);
            });
        });
    }

    /**
     * 显示提示消息
     */
    static showToast(message, type = 'info', duration = 3000) {
        // 移除已存在的toast
        const existingToast = document.querySelector('.ui-toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = `ui-toast ui-toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // 添加toast样式
        this.addToastStyles();
        
        // 显示动画
        setTimeout(() => toast.classList.add('show'), 10);
        
        // 自动隐藏
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    /**
     * 显示加载状态
     */
    static showLoading(element, text = '加载中...') {
        if (!element) return;
        
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'ui-loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="ui-loading-spinner"></div>
            <div class="ui-loading-text">${text}</div>
        `;
        
        element.style.position = 'relative';
        element.appendChild(loadingOverlay);
        
        this.addLoadingStyles();
        
        return {
            hide: () => {
                if (loadingOverlay.parentNode) {
                    loadingOverlay.parentNode.removeChild(loadingOverlay);
                }
            },
            updateText: (newText) => {
                const textElement = loadingOverlay.querySelector('.ui-loading-text');
                if (textElement) textElement.textContent = newText;
            }
        };
    }

    /**
     * 添加模态框样式
     */
    static addModalStyles() {
        if (document.getElementById('ui-modal-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'ui-modal-styles';
        style.textContent = `
            .ui-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }
            
            .ui-modal.show {
                opacity: 1;
                visibility: visible;
            }
            
            .ui-modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(2px);
            }
            
            .ui-modal-content {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
                max-width: 90vw;
                max-height: 90vh;
                overflow: hidden;
                min-width: 300px;
            }
            
            .ui-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #eee;
                background: #f8f9fa;
            }
            
            .ui-modal-title {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: #333;
            }
            
            .ui-modal-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.2s ease;
            }
            
            .ui-modal-close:hover {
                background: #e9ecef;
                color: #333;
            }
            
            .ui-modal-body {
                padding: 20px;
                max-height: 60vh;
                overflow-y: auto;
            }
            
            .ui-modal-footer {
                padding: 20px;
                border-top: 1px solid #eee;
                background: #f8f9fa;
                text-align: right;
            }
            
            .progress-container {
                text-align: center;
                padding: 20px;
            }
            
            .progress-circle {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #007bff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }
            
            .progress-text {
                font-size: 16px;
                color: #666;
                margin-bottom: 20px;
            }
            
            .progress-bar-container {
                width: 100%;
                background: #f0f0f0;
                border-radius: 10px;
                overflow: hidden;
                margin-bottom: 10px;
            }
            
            .progress-bar {
                height: 20px;
                background: linear-gradient(90deg, #007bff, #0056b3);
                transition: width 0.3s ease;
                border-radius: 10px;
            }
            
            .progress-percentage {
                font-size: 14px;
                color: #666;
            }
            
            .confirm-message {
                font-size: 16px;
                color: #333;
                margin-bottom: 30px;
                line-height: 1.5;
            }
            
            .confirm-buttons {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }
            
            .btn {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s ease;
            }
            
            .btn-cancel {
                background: #6c757d;
                color: white;
            }
            
            .btn-cancel:hover {
                background: #5a6268;
            }
            
            .btn-confirm {
                background: #007bff;
                color: white;
            }
            
            .btn-confirm:hover {
                background: #0056b3;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 添加Toast样式
     */
    static addToastStyles() {
        if (document.getElementById('ui-toast-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'ui-toast-styles';
        style.textContent = `
            .ui-toast {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                color: white;
                font-size: 14px;
                font-weight: 500;
                z-index: 10001;
                transform: translateX(100%);
                transition: all 0.3s ease;
                max-width: 300px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }
            
            .ui-toast.show {
                transform: translateX(0);
            }
            
            .ui-toast-info {
                background: #007bff;
            }
            
            .ui-toast-success {
                background: #28a745;
            }
            
            .ui-toast-warning {
                background: #ffc107;
                color: #333;
            }
            
            .ui-toast-error {
                background: #dc3545;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 添加加载样式
     */
    static addLoadingStyles() {
        if (document.getElementById('ui-loading-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'ui-loading-styles';
        style.textContent = `
            .ui-loading-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.9);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            
            .ui-loading-spinner {
                width: 30px;
                height: 30px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #007bff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 10px;
            }
            
            .ui-loading-text {
                font-size: 14px;
                color: #666;
            }
        `;
        document.head.appendChild(style);
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIService;
} else {
    window.UIService = UIService;
}