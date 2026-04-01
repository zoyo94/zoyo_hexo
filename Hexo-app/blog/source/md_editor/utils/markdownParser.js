/**
 * markdownParser.js
 * 确保 Markdown 文件包含 Hexo 格式的 Front Matter
 */

/**
 * 确保 Markdown 文件包含完整的 Hexo Front Matter。
 * 如果缺少必要字段则自动补全。
 * @param {string} content - Markdown 文件内容
 * @param {string} filename - 文件名 (e.g., "my-post.md")
 * @param {object} [logger] - 可选的 winston logger 实例（由调用方注入，避免在工具模块中创建独立 logger）
 * @returns {string} 处理后的 Markdown 内容
 */
function ensureHexoFrontMatter(content, filename, logger) {
    const log = logger || console; // 兜底到 console，避免强依赖 winston
    const lines = content.split('\n');
    let hasFrontMatter = false;
    let frontMatterEndIndex = -1;
    let frontMatterContent = '';

    if (lines.length > 0 && lines[0].trim() === '---') {
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '---') {
                frontMatterEndIndex = i;
                hasFrontMatter = true;
                break;
            }
        }
    }

    let needsNewFrontMatter = true;
    let allFieldsPresent = false;

    if (hasFrontMatter && frontMatterEndIndex !== -1) {
        frontMatterContent = lines.slice(1, frontMatterEndIndex).join('\n');
        const requiredFields = ['title:', 'date:', 'categories:', 'tags:'];
        allFieldsPresent = requiredFields.every(field => frontMatterContent.includes(field));
        if (allFieldsPresent) needsNewFrontMatter = false;
    }

    log.info(`[ensureHexoFrontMatter] hasFrontMatter: ${hasFrontMatter}, allFieldsPresent: ${allFieldsPresent}, needsNewFrontMatter: ${needsNewFrontMatter}`);

    if (needsNewFrontMatter) {
        const title = filename.replace(/\.md$/, '');
        const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const newFrontMatter = `---\ntitle: ${title}\ndate: ${date}\ncategories:\n  - 未分类\ntags:\n  - 未标签\n---\n`;

        if (hasFrontMatter && frontMatterEndIndex !== -1) {
            return newFrontMatter + lines.slice(frontMatterEndIndex + 1).join('\n');
        }
        return newFrontMatter + content;
    }

    return content;
}

module.exports = { ensureHexoFrontMatter };
