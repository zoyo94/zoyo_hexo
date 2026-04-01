const fs = require('fs');
const path = require('path');

class FileUtils {
    /**
     * 解码文件名，以正确处理可能存在的中文编码问题。
     * @param {string} filename - 原始文件名。
     * @returns {string} 解码后的文件名。
     */
    static decodeFilename(filename) {
        try {
            // 尝试将文件名从 binary 编码转换为 UTF-8，这通常能解决乱码问题。
            return Buffer.from(filename, 'binary').toString('utf8');
        } catch (error) {
            // 如果转换失败，则返回原始文件名，避免程序崩溃。
            return filename;
        }
    }

    /**
     * 对文件名进行安全化处理，移除或替换不适用于文件系统的特殊字符。
     * @param {string} filename - 需要处理的文件名。
     * @returns {string} 安全的文件名。
     */
    static sanitizeFilename(filename) {
        const ext = path.extname(filename);
        let nameWithoutExt = path.basename(filename, ext);
        
        // 替换特殊字符：点号、括号、逗号、其他不安全字符
        const safeName = nameWithoutExt
            .replace(/\./g, '_')               // 点号替换为下划线
            .replace(/[()（）]/g, '_')          // 各种括号替换为下划线
            .replace(/[<>:"/\\|?*[\]{}]/g, '_') // 其他不安全字符
            .replace(/,/g, '_')                // 逗号替换为下划线
            .replace(/\s+/g, '_')              // 空格替换为下划线
            .replace(/-{2,}/g, '-')            // 连续短横线合并为单个
            .replace(/_{2,}/g, '_')            // 连续下划线合并为单个
            .replace(/^[_-]+|[_-]+$/g, '')     // 移除开头和结尾的下划线和短横线
            .trim() || 'untitled';             // 如果为空使用默认名称
        
        return safeName + ext; // 只拼接实际存在的扩展名，不添加默认后缀
    }

    /**
     * 生成唯一的文件名。如果目标目录中已存在同名文件，则在文件名后添加数字后缀。
     * @param {string} originalName - 原始文件名。
     * @param {string} targetDir - 目标目录路径。
     * @returns {string} 唯一的、安全的文件名。
     */
    static async generateUniqueFilename(originalName, targetDir) {
        const safeName = this.sanitizeFilename(originalName);
        let finalName = safeName;
        let counter = 1;
        
        // 异步检查文件是否存在，避免阻塞事件循环
        const fileExists = async (filePath) => {
            try {
                await fs.promises.access(filePath);
                return true;
            } catch {
                return false;
            }
        };
        
        while (await fileExists(path.join(targetDir, finalName))) {
            const ext = path.extname(safeName);
            const nameWithoutExt = path.basename(safeName, ext);
            finalName = `${nameWithoutExt}_${counter}${ext}`;
            counter++;
        }
        
        return finalName;
    }

    /**
     * 确保指定的目录存在。如果不存在，则递归创建它。
     * @param {string} dirPath - 需要检查的目录路径。
     */
    static async ensureDirectory(dirPath) {
        try {
            await fs.promises.access(dirPath);
        } catch (error) {
            if (error.code === 'ENOENT') {
                await fs.promises.mkdir(dirPath, { recursive: true });
            } else {
                throw error;
            }
        }
    }

    /**
     * 验证文件类型是否在允许的列表中。
     * @param {string} filename - 文件名。
     * @param {string[]} allowedTypes - 允许的文件扩展名数组 (例如 ['jpg', 'png'])。
     * @returns {boolean} 如果文件类型有效，则返回 true。
     */
    static validateFileType(filename, allowedTypes) {
        const ext = path.extname(filename).toLowerCase().replace('.', '');
        return allowedTypes.includes(ext);
    }
}

module.exports = FileUtils;
