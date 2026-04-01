/**
 * EditorApp.js
 * React 编辑器根组件，负责：
 *   1. 初始化加载 cache 文件内容
 *   2. 通过 CustomEvent 事件总线与外部通信（不直接暴露 React setter）
 *   3. 渲染 MdEditor，并注入自定义工具栏、页脚组件
 */

import React from 'react';
import { MdEditor } from 'md-editor-rt';
import { ExportPDF } from '@vavt/rt-extension';
import {
    TimeDisplay, SaveButton, CleanHexoButton,
    ExportButton, UploadImageButton, ThemeDropdown
} from './ToolbarExtensions.js';

// ─── 工具函数 ────────────────────────────────────────────
function buildDefaultTemplate() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    return `---\ntitle: cache\ndate: ${date}\ncategories:\n    - [Category / 分类]\ntags:\n    - Tag / 标签\n---`;
}

// ─── 主组件 ──────────────────────────────────────────────
export function App() {
    const [text, setText] = React.useState('');
    const [previewTheme, setPreviewTheme] = React.useState('default');

    // 保持对最新文本的 ref（供事件监听器同步读取，避免闭包过期）
    const textRef = React.useRef(text);
    textRef.current = text;

    // ── 初始化：加载 cache 文件 ──
    React.useEffect(() => {
        let cancelled = false;
        const load = async () => {
            const filename = window.state?.currentFilename ?? 'cache';
            if (filename !== 'cache') return;

            const filePath = `${window.CONFIG?.ORIGINAL_DIR ?? '.'}/${filename}`;
            try {
                const content = await window.fileManager?.fetchFileContent(filePath);
                if (!cancelled) setText(content || buildDefaultTemplate());
            } catch (err) {
                console.error('[App] 初始化加载失败:', err);
                if (!cancelled) setText(buildDefaultTemplate());
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    // ── 事件总线：替代直接暴露 React setter ──
    React.useEffect(() => {
        const handleUpdate = e => setText(e.detail);
        const handleInsert = e => {
            setText(prev => {
                if (window.state) window.state.hasContentChanged = true;
                return prev + e.detail;
            });
        };

        window.addEventListener('editor:update', handleUpdate);
        window.addEventListener('editor:insert', handleInsert);

        // 向外暴露只读接口（实际读写通过事件分发）
        window.getEditorContent  = () => textRef.current;
        window.updateEditorContent = content =>
            window.dispatchEvent(new CustomEvent('editor:update', { detail: content }));
        window.insertEditorContent = content =>
            window.dispatchEvent(new CustomEvent('editor:insert', { detail: content }));

        return () => {
            window.removeEventListener('editor:update', handleUpdate);
            window.removeEventListener('editor:insert', handleInsert);
        };
    }, []);

    // ── 图片上传回调 ──
    const handleUploadImg = React.useCallback(async (files, callback) => {
        const destination = window.appState?.getCurrentMediaFolder() ?? 'IMG';
        try {
            const result = await window.fileManager.handleImageUpload(files, destination);
            if (result.success) {
                callback(result.imagePaths);
                window.simpleCacheUI?.showToast('✅ 图片上传成功', 'success');
                window.appState?.onStateChange();
            } else {
                window.simpleCacheUI?.showToast(`❌ 图片上传失败: ${result.message}`, 'error');
            }
        } catch (err) {
            window.simpleCacheUI?.showToast(`❌ 图片上传异常: ${err.message}`, 'error');
        }
    }, []);

    // ── 渲染 ──
    return React.createElement(MdEditor, {
        modelValue: text,
        onChange: (v) => { setText(v); if (window.state) window.state.hasContentChanged = true; },
        height: '100%',
        language: 'zh-CN',
        theme: 'dark',
        codeTheme: 'github',
        previewTheme,
        onUploadImg: handleUploadImg,
        floatingToolbars: [
            'bold', 'italic', 'strikeThrough', 'title', 'sub', 'sup',
            'quote', 'unorderedList', 'orderedList', 'task',
            'codeRow', 'code', 'link', 'image', 'table', 'mermaid', 'katex'
        ],
        toolbars: [
            'bold', 'italic', 'underline', 'strikeThrough', 'title', 'sub', 'sup',
            'quote', 'unorderedList', 'orderedList', 'task',
            '-',
            'codeRow', 'code', 'link', 'image', 'table', 'mermaid', 'katex',
            '-',
            'revoke', 'next', 'save', 5,
            '=',
            0, 1, 2, 3, 4,
            '-',
            'pageFullscreen', 'fullscreen', 'preview', 'htmlPreview', 'catalog', 'github'
        ],
        defToolbars: [
            React.createElement(SaveButton,       { key: 'save-btn' }),
            React.createElement(CleanHexoButton,  { key: 'clean-btn' }),
            React.createElement(ExportButton,     { key: 'export-btn' }),
            React.createElement(UploadImageButton,{ key: 'upload-btn' }),
            React.createElement(ThemeDropdown, {
                key: 'theme-switch',
                value: previewTheme,
                onChange: setPreviewTheme,
                title: '主题',
                closeAfterSelect: true
            }),
            React.createElement(ExportPDF, { key: 'export-pdf', value: text })
        ],
        footers: ['markdownTotal', '=', 'scrollSwitch', 0],
        defFooters: [
            React.createElement(TimeDisplay, { key: 'time-display' })
        ],
        onSave: () => window.handSave?.()
    });
}
