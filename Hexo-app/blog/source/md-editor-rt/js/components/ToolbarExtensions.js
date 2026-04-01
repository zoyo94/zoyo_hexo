import React from 'react';
import { DropdownToolbar } from 'md-editor-rt';

// 获取当前时间的函数
export function getCurrentTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

// 实时时间显示组件
export function TimeDisplay() {
    const [currentTime, setCurrentTime] = React.useState(getCurrentTime());
    
    React.useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(getCurrentTime());
        }, 1000);
        return () => clearInterval(timer);
    }, []);
    
    return React.createElement('span', {
        style: { 
            marginLeft: '10px', 
            color: '#999',
            fontSize: '12px',
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: 'rgba(255,255,255,0.1)'
        }
    }, `🕒 ${currentTime}`);
}

// 自定义工具栏按钮组件
export function CustomToolbarButton({ title, icon, onClick, disabled }) {
    return React.createElement('div', {
        className: 'md-editor-toolbar-item',
        title: title,
        onClick: disabled ? undefined : onClick,
        style: { 
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            padding: '4px 4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '15px',
            height: '15px',
            fontSize: '15px',
            userSelect: 'none'
        }
    }, icon);
}

// 手动保存按钮
export function SaveButton(props) {
    return React.createElement(CustomToolbarButton, {
        title: '手动保存',
        icon: '💾',
        onClick: () => window.handSave && window.handSave(),
        disabled: props.disabled
    });
}

// 清理Hexo按钮
export function CleanHexoButton(props) {
    return React.createElement(CustomToolbarButton, {
        title: '清理Hexo',
        icon: '🔄',
        onClick: () => window.cleanHexo && window.cleanHexo(),
        disabled: props.disabled
    });
}

// 导出文件按钮
export function ExportButton(props) {
    return React.createElement(CustomToolbarButton, {
        title: '导出文件',
        icon: '📤',
        onClick: () => window.handExport && window.handExport(),
        disabled: props.disabled
    });
}

// 上传图片按钮
export function UploadImageButton(props) {
    return React.createElement(CustomToolbarButton, {
        title: '上传图片',
        icon: '🖼️',
        onClick: () => window.inputImg && window.inputImg(),
        disabled: props.disabled
    });
}

// 主题切换按钮
export function ThemeDropdown(props) {
    const [visible, setVisible] = React.useState(false);

    const options = [
        { value: 'default', label: 'Default' },
        { value: 'dark', label: 'Dark' },
        { value: 'light', label: 'Light' },
        { value: 'github', label: 'GitHub' },
        { value: 'vuepress', label: 'VuePress' },
        { value: 'mk-cute', label: 'Mk-Cute' },
        { value: 'smart-blue', label: 'Smart Blue' },
        { value: 'cyanosis', label: 'Cyanosis' },
    ];

    const handleChange = React.useCallback((value) => {
        props.onChange(value);
        if (props.closeAfterSelect) {
            setVisible(false);
        }
    }, [props]);

    return React.createElement(DropdownToolbar, {
        title: props.title || props.value,
        visible: visible,
        onChange: setVisible,
        disabled: props.disabled,
        overlay: React.createElement('ul', { className: 'md-editor-menu', role: 'menu' },
            options.map((option) =>
                React.createElement('li', {
                    className: `md-editor-menu-item${option.value === props.value ? ' active' : ''}`,
                    role: 'menuitem',
                    tabIndex: 0,
                    key: option.value,
                    onClick: () => handleChange(option.value)
                }, option.label)
            )
        ),
        trigger: React.createElement(React.Fragment, null,
            React.createElement('span', { className: 'md-editor-icon' }, '🎨'),
            props.showToolbarName && React.createElement('div', { className: 'md-editor-toolbar-item-name' }, props.title || props.value)
        )
    });
}
