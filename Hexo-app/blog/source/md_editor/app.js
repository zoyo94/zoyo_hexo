const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os'); // Add os module for temporary file handling
const cors = require('cors');
const tar = require('tar');
const winston = require('winston');
const { exec, spawn } = require('child_process');
const FileUtils = require('./utils/file-utils');

/**
 * 确保 Markdown 文件包含 Hexo 格式的 Front Matter
 * 如果没有，则自动添加 title 和 date
 * @param {string} content - Markdown 文件内容
 * @param {string} filename - 文件名 (e.g., "my-post.md")
 * @returns {string} 处理后的 Markdown 内容
 */
function ensureHexoFrontMatter(content, filename) {
    const lines = content.split('\n');
    let hasFrontMatter = false;
    let frontMatterEndIndex = -1;
    let frontMatterContent = ''; // 确保 frontMatterContent 始终被定义

    if (lines.length > 0 && lines[0].trim() === '---') {
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '---') {
                frontMatterEndIndex = i;
                hasFrontMatter = true;
                break;
            }
        }
    }

    // 检查现有 Front Matter 是否包含 Hexo 必需字段
    let needsNewFrontMatter = true;
    let allFieldsPresent = false; // 确保 allFieldsPresent 始终被定义

    if (hasFrontMatter && frontMatterEndIndex !== -1) {
        frontMatterContent = lines.slice(1, frontMatterEndIndex).join('\n'); // 赋值而不是重新声明
        const requiredFields = ['title:', 'date:', 'categories:', 'tags:'];
        allFieldsPresent = requiredFields.every(field => frontMatterContent.includes(field));
        
        if (allFieldsPresent) {
            needsNewFrontMatter = false;
        }
    }

    logger.info(`[ensureHexoFrontMatter] hasFrontMatter: ${hasFrontMatter}, allFieldsPresent: ${allFieldsPresent}, needsNewFrontMatter: ${needsNewFrontMatter}`);
    if (hasFrontMatter && frontMatterEndIndex !== -1) {
        logger.info(`[ensureHexoFrontMatter] Existing front matter content: \n${frontMatterContent}`);
    }

    if (needsNewFrontMatter) {
        const title = filename.replace(/\.md$/, '');
        const date = new Date().toISOString().slice(0, 19).replace('T', ' '); // YYYY-MM-DD HH:mm:ss 格式

        const newFrontMatter = `---
title: ${title}
date: ${date}
categories:
  - 未分类
tags:
  - 未标签
---
`;
        // 如果有旧的 Front Matter，移除它再添加新的
        if (hasFrontMatter && frontMatterEndIndex !== -1) {
            return newFrontMatter + lines.slice(frontMatterEndIndex + 1).join('\n');
        } else {
            return newFrontMatter + content;
        }
    }

    return content;
}

// 配置常量
const CONFIG = {
    WORK_DIR: path.join(__dirname, 'public', 'uploads'), // 工作目录
    HEXO_DIR: path.resolve(__dirname, '../..'), // Hexo 博客根目录
    PORT: 3001, // 服务监听端口
    MD_FILE_SIZE_LIMIT: 5 * 1024 * 1024, // MD文件大小限制：5MB
    IMG_FILE_SIZE_LIMIT: 50 * 1024 * 1024 // 图片文件大小限制：50MB
};

// 定义博客文章目录的绝对路径
// __dirname 是 /root/Hexo-app-imzbf/blog/source/md_editor
// Hexo 的 _posts 目录在 /root/Hexo-app-imzbf/blog/source/_posts
const POSTS_DIR = path.resolve(__dirname, '..', '_posts');

// 初始化工作目录
process.chdir(CONFIG.WORK_DIR); // 切换到 public/uploads/，保持文件操作路径

// 创建 Express 应用
const app = express();
app.use(cors());
app.use(express.json({ type: 'application/json', charset: 'utf-8' }));

// 配置日志，存放在 md_editor/ 下，使用绝对路径
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info', // 生产环境设置为 warn，开发环境为 info
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: path.join(__dirname, 'error.log'), level: 'error' }), // 错误日志存放在 md_editor/error.log
        new winston.transports.File({ filename: path.join(__dirname, 'combined.log') }) // 综合日志存放在 md_editor/combined.log
    ]
});
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({ format: winston.format.simple() }));
}

// 创建 Multer 实例的通用配置
const createMulter = (fileSizeLimit, fileFilter) => multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: fileSizeLimit },
    fileFilter
});

// 启动服务器
const PORT = process.env.PORT || CONFIG.PORT;
app.listen(PORT, () => {
    logger.info(`服务器已启动，端口: ${PORT}`);
    logger.info(`编辑器的后端访问地址: http://localhost:${PORT}`);
});

// 图片上传配置
const uploadImg = createMulter(CONFIG.IMG_FILE_SIZE_LIMIT);

// MD文件上传配置
const uploadMd = createMulter(CONFIG.MD_FILE_SIZE_LIMIT);

// 无文件上传配置（仅处理表单数据）
const noFileUpload = createMulter();

// 写入文件到磁盘的通用函数
const writeFile = (filePath, buffer) => new Promise((resolve, reject) => {
    fs.writeFile(filePath, buffer, (err) => {
        err ? reject(err) : resolve();
    });
});

// 读取目录树的递归函数 - 再次更新以确保递归逻辑正确
const readDirectory = async (directory) => {
    const entries = await fs.promises.readdir(directory, { withFileTypes: true, encoding: 'utf8' });
    const children = await Promise.all(entries.map(async (entry) => {
        const fullPath = path.join(directory, entry.name);
        try {
            // 使用 lstat 来处理软链接，而不是 stat
            const stats = await fs.promises.lstat(fullPath);
            if (stats.isDirectory()) {
                // 使用纯 async/await 简化递归调用
                const subChildren = await readDirectory(fullPath);
                return { name: entry.name, children: subChildren, type: 'directory' };
            } else if (stats.isFile()) {
                return { name: entry.name, type: 'file' };
            }
            // 如果是软链接或其他类型，则安全地忽略
            return null;
        } catch (error) {
            // 如果读取 lstat 失败（例如，权限问题），则忽略该条目
            logger.warn(`无法读取条目: ${fullPath}, 错误: ${error.message}`);
            return null;
        }
    }));
    // 过滤掉所有被忽略的条目 (null)
    return children.filter(child => child !== null);
};

// 获取相对路径的工具函数（相对于 md_editor/）
const getRelativePath = (fullPath) => path.relative(__dirname, fullPath);

// 模块作用域的 Map，用于存储目录日志时间戳
const directoryLogTimestamps = new Map();

// 清理请求去重机制
let isCleaningInProgress = false;
let lastCleanTime = 0;
const CLEAN_COOLDOWN = 5000; // 5秒冷却时间

// 自动清理 Hexo 缓存的函数
const autoCleanHexo = () => {
    return new Promise((resolve, reject) => {
        const now = Date.now();
        
        // 如果正在清理中或距离上次清理不足5秒，直接返回
        if (isCleaningInProgress || (now - lastCleanTime) < CLEAN_COOLDOWN) {
            logger.info('Hexo 清理请求被跳过（正在进行中或冷却期内）');
            return resolve();
        }
        
        isCleaningInProgress = true;
        lastCleanTime = now;
        
        logger.info(`开始执行 Hexo clean，工作目录: ${CONFIG.HEXO_DIR}`);
        
        // 执行 hexo clean
        const hexoClean = spawn('npx', ['hexo', 'clean'], { 
            cwd: CONFIG.HEXO_DIR,
            stdio: 'pipe'
        });
        
        // 捕获 hexo clean 的输出
        hexoClean.stdout.on('data', (data) => {
            logger.info(`Hexo Clean stdout: ${data.toString().trim()}`);
        });
        
        hexoClean.stderr.on('data', (data) => {
            logger.warn(`Hexo Clean stderr: ${data.toString().trim()}`);
        });
        
        hexoClean.on('close', (cleanCode) => {
            logger.info(`Hexo clean 进程结束，退出码: ${cleanCode}`);
            
            if (cleanCode !== 0) {
                logger.error(`Hexo clean 失败，退出码: ${cleanCode}`);
                isCleaningInProgress = false;
                return reject(new Error(`Hexo clean failed with code ${cleanCode}`));
            }
            
            logger.info('Hexo clean 完成，开始执行 Hexo generate...');
            
            const hexoGenerate = spawn('npx', ['hexo', 'generate'], { 
                cwd: CONFIG.HEXO_DIR,
                stdio: 'pipe'
            });
            
            // 捕获 hexo generate 的输出
            hexoGenerate.stdout.on('data', (data) => {
                logger.info(`Hexo Generate stdout: ${data.toString().trim()}`);
            });
            
            hexoGenerate.stderr.on('data', (data) => {
                logger.warn(`Hexo Generate stderr: ${data.toString().trim()}`);
            });
            
            hexoGenerate.on('close', (generateCode) => {
                logger.info(`Hexo generate 进程结束，退出码: ${generateCode}`);
                isCleaningInProgress = false;
                
                if (generateCode !== 0) {
                    logger.error(`Hexo generate 失败，退出码: ${generateCode}`);
                    return reject(new Error(`Hexo generate failed with code ${generateCode}`));
                }
                
                logger.info('Hexo generate 完成，缓存清理和重新生成成功！');
                resolve();
            });
            
            hexoGenerate.on('error', (error) => {
                isCleaningInProgress = false;
                logger.error(`Hexo generate 进程错误: ${error.message}`);
                reject(error);
            });
        });
        
        hexoClean.on('error', (error) => {
            isCleaningInProgress = false;
            logger.error(`Hexo clean 进程错误: ${error.message}`);
            reject(error);
        });
    });
};

// 中间件：统一错误处理
const errorHandler = (err, req, res, next) => {
    logger.error(`服务器错误: ${err.message}`, err.stack); // 记录完整的错误堆栈
    const message = process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message;
    res.status(500).json({ success: false, message: message });
};

/**
 * 处理 MD 文件上传
 * POST /upload
 */
app.post('/upload', uploadMd.single('md_file'), async (req, res, next) => {
    try {
        if (!req.file) throw new Error('未上传文件');
        // 使用 FileUtils 处理文件名
        const originalName = FileUtils.decodeFilename(req.file.originalname);
        const finalName = FileUtils.sanitizeFilename(originalName);
        
        // 先写入到工作目录（uploads）
        const filePath = path.join(CONFIG.WORK_DIR, finalName);
        await writeFile(filePath, req.file.buffer);
        logger.info(`MD 文件已上传到文章目录: ${originalName} -> ${finalName}`);
        
        // 立即执行保存操作，确保文件真实写入到 _posts 目录
        let fileContent = req.file.buffer.toString('utf8');
        
        // 确保 MD 文件包含 Hexo Front Matter
        fileContent = ensureHexoFrontMatter(fileContent, finalName);

        try {
            // 写入到工作目录（uploads），由于软链接，文件会自动出现在 _posts 目录
            await writeFile(filePath, fileContent);
            logger.info(`MD 文件已保存到工作目录: ${filePath} (通过软链接同步到 _posts)`);
            
            logger.info('MD 文件上传并保存成功');
        } catch (saveError) {
            logger.warn(`保存 MD 文件失败: ${saveError.message}`);
            throw saveError; // 重新抛出错误，让 errorHandler 处理
        }
        
        res.json({
            success: true,
            message: 'MD 文件上传并保存成功',
            filePath: filePath, 
            filename: finalName,
            destination: './',
            content: fileContent // 返回处理后的文件内容
        });
    } catch (err) {
        next(err);
    }
});

/**
 * 处理图片上传
 * POST /upimg
 */
app.post('/upimg', uploadImg.array('image'), async (req, res, next) => {
    try {
        // 设置处理状态为“正在上传图片”
        setProcessingStatus(true, 'uploading_images');
        
        const customDestination = req.body.destination || './';
        const targetDir = path.join(CONFIG.WORK_DIR, customDestination.replace(/^\.\//, ''));
        const imagePaths = [];
        const filenames = [];

        await fs.promises.mkdir(targetDir, { recursive: true }); // 确保目录存在
        logger.info(`确保目录存在: ${getRelativePath(targetDir)}`);

        for (const file of req.files) {
            // 使用 FileUtils 处理文件名
            const originalName = FileUtils.decodeFilename(file.originalname);
            const finalName = FileUtils.generateUniqueFilename(originalName, targetDir);
            
            const imagePath = path.join(targetDir, finalName);
            await writeFile(imagePath, file.buffer);
            imagePaths.push(`${customDestination}${finalName}`);
            filenames.push(finalName);
            logger.info(`图片已上传: ${originalName} -> ${finalName} 到 ${customDestination}`);
        }

        logger.info(`已上传 ${req.files.length} 张图片到 ${customDestination}`);
        
        // 清除处理状态
        setProcessingStatus(false);
    
    res.json({
        success: true,
        message: '图片和视频上传成功❤️',
        imagePaths,
        filenames,
        destination: customDestination
    });
    } catch (err) {
        // 出错时也要清除处理状态
        setProcessingStatus(false);
        next(err);
    }
});

/**
 * 处理文件夹上传
 * POST /upload-folder
 */
app.post('/upload-folder', uploadImg.array('files'), async (req, res, next) => {
    try {
        // 设置处理状态为“正在上传文件夹”
        setProcessingStatus(true, 'uploading_folder');
        
        const folderName = req.body.folderName;
        if (!folderName || !req.files || req.files.length === 0) throw new Error('缺少必要参数或文件');

        const filePaths = [];
        const filenames = [];
        let mainMdContent = null; // 初始化为 null
        let mainMdFilename = null; // 初始化为 null

        for (const file of req.files) {
            // 使用 FileUtils 处理文件名
            const originalName = FileUtils.decodeFilename(file.originalname);
            const finalName = FileUtils.sanitizeFilename(originalName);
            
            console.log(`${originalName} -> ${finalName}`);
            const fullPath = path.join(CONFIG.WORK_DIR, folderName, finalName);
            const dir = path.dirname(fullPath);

            await fs.promises.mkdir(dir, { recursive: true }); // 确保目录存在
            logger.info(`确保目录存在: ${getRelativePath(dir)}`);

            let fileBuffer = file.buffer;
            // 如果是 Markdown 文件，则处理 Front Matter
            if (finalName.endsWith('.md')) {
                let mdContent = file.buffer.toString('utf8');
                mdContent = ensureHexoFrontMatter(mdContent, finalName);
                fileBuffer = Buffer.from(mdContent, 'utf8');

                // 识别主 Markdown 文件：优先选择与文件夹同名的MD文件，否则选择第一个MD文件
                if (mainMdFilename === null || finalName === `${folderName}.md`) {
                    mainMdContent = mdContent;
                    mainMdFilename = finalName;
                }

                await writeFile(fullPath, fileBuffer); // 写入处理后的MD文件
                logger.info(`MD 文件已保存到工作目录: ${fullPath} (通过软链接同步到 _posts)`);
            } else {
                await writeFile(fullPath, fileBuffer); // 写入非MD文件
            }

            filePaths.push(`${folderName}/${finalName}`);
            filenames.push(finalName);
            logger.info(`文件已上传: ${originalName} -> ${finalName} 到 ${folderName}`);
        }

        // 清除处理状态
        setProcessingStatus(false);
        
        res.json({
            success: true,
            message: '文件夹上传成功',
            filePaths,
            filenames,
            destination: `./${folderName}/`,
            mdContent: mainMdContent, // 返回主MD文件的内容
            mdFilename: mainMdFilename // 返回主MD文件的文件名
        });
    } catch (err) {
        // 出错时也要清除处理状态
        setProcessingStatus(false);
        next(err);
    }
});

/**
 * 获取目录树
 * GET /directory-tree
 */
app.get('/directory-tree', async (req, res, next) => {
    try {
        const directory = req.query.directory;
        if (!directory) throw new Error('缺少目录参数');
        
        // 确保基础目录存在
        try {
            await fs.promises.access(directory); // 检查目录是否存在
        } catch (error) {
            logger.warn(`请求的目录不存在或无权限访问: ${directory}, 错误: ${error.message}`);
            return res.json([]); // 返回空数组
        }

        const children = await readDirectory(directory);
        const tree = { name: path.basename(directory), children };

        // 为避免日志刷屏，对同一个目录的树获取操作进行5秒的日志输出冷却
        const now = Date.now();
        const lastLogKey = `dir_${directory}`;
        // 使用模块作用域的 Map 来替代全局变量
        if (!directoryLogTimestamps.has(lastLogKey) || (now - directoryLogTimestamps.get(lastLogKey)) > 5000) {
            logger.info(`获取目录树: ${getRelativePath(directory)}`);
            directoryLogTimestamps.set(lastLogKey, now);
        }
        
        res.json(tree);
    } catch (err) {
        next(err);
    }
});

/**
 * 获取 MD 文件内容
 * GET /get_md
 */
// 移除不必要的文件上传中间件，并使用req.query获取参数
app.get('/get_md', async (req, res, next) => {
    try {
        const { directory, filename } = req.query; // 从查询参数获取
        if (!directory || !filename) throw new Error('缺少必要参数: directory 或 filename');
        
        const filePath = path.join(CONFIG.WORK_DIR, directory.replace(/^\.\//, ''), filename);
        
        try {
            await fs.promises.access(filePath);
        } catch (error) {
            throw new Error(`文件不存在或无权限访问: ${filename}`);
        }
        
        let content = await fs.promises.readFile(filePath, 'utf8');
        
        // 处理视频文件路径：为没有路径的视频文件添加目录前缀
        // 匹配 <video src="文件名.扩展名" 格式（没有路径的视频）
        const videoRegex = /<video\s+src="([^\/][^"]*\.(mp4|MP4|avi|AVI|mov|MOV|wmv|WMV|flv|FLV|webm|WEBM))"/g;
        
        // 确定目录前缀
        let dirPrefix = '';
        if (filename === 'cache') {
            dirPrefix = './IMG/';
        } else {
            // 从文件名中提取标题作为目录名
            const titleMatch = filename.match(/^(.+)\.md$/);
            if (titleMatch) {
                dirPrefix = `./${titleMatch[1]}/`;
            } else {
                dirPrefix = './IMG/'; // 默认使用 IMG 目录
            }
        }
        
        // 替换视频路径
        content = content.replace(videoRegex, (match, videoFile, ext) => {
            return match.replace(`src="${videoFile}"`, `src="${dirPrefix}${videoFile}"`);
        });
        
        logger.info(`Read MD file: ${getRelativePath(filePath)}, processed video paths with prefix: ${dirPrefix}`);
        
        res.json({
            success: true,
            content: content,
            filename: filename,
            message: '文件读取成功'
        });
    } catch (err) {
        next(err);
    }
});

/**
 * 保存修改后的 MD 文件
 * POST /save_md
 */
app.post('/save_md', noFileUpload.single('file'), async (req, res, next) => {
    try {
        // 设置处理状态为“正在保存MD文件”
        setProcessingStatus(true, 'saving_md');
        
        const { destination, filename, currentContent, hasImages } = req.body;
        if (!destination || !filename) throw new Error('缺少必要参数');

        const filePath = path.join(CONFIG.WORK_DIR, destination.replace(/^\.\//, ''), filename);
        const baseName = path.basename(filename, '.md');
        let finalContent = currentContent || '';

        // 如果有图片或视频，处理移动和路径更新
        if (hasImages && finalContent) {
            const imageDir = path.join(path.dirname(filePath), baseName);
            
            // 确保图片目录存在
            await fs.promises.mkdir(imageDir, { recursive: true }); // 如果目录已存在，不会抛出错误
            logger.info(`确保图片目录存在: ${getRelativePath(imageDir)}`);
            
            // 提取所有图片路径
            const imageMatches = finalContent.match(/!\[.*?\]\((.*?)\)/g);
            if (imageMatches) {
                for (const match of imageMatches) {
                    const imagePath = match.match(/!\[.*?\]\((.*?)\)/)[1];
                    logger.info(imagePath)
                    // 如果是相对路径且不在同名文件夹中
                    if (!imagePath.startsWith('http') && !imagePath.startsWith(baseName + '/')) {
                        const sourceImagePath = path.join(CONFIG.WORK_DIR, destination.replace(/^\.\//, ''), imagePath);
                        logger.info(`sourceImagePath:${sourceImagePath}`);
                        const imageFileName = path.basename(imagePath);
                        logger.info(`imageFileName:${ imageFileName}`);
                        const targetImagePath = path.join(imageDir, imageFileName);
                        logger.info(`targetImagePath:${ targetImagePath}`);
                        
                        // 检查源文件和目标文件是否为同一个文件
                        if (path.resolve(sourceImagePath) === path.resolve(targetImagePath)) {
                            
                            logger.info(`📍 图片已在目标位置，无需移动: ${imagePath}`);
                            // 文件已在正确位置，但仍需要更新路径格式
                            const newImagePath = `${baseName}/${imageFileName}`;
                            const escapedImagePath = imagePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            finalContent = finalContent.replace(new RegExp(escapedImagePath, 'g'), newImagePath);
                        } else {
                            try {
                                await fs.promises.access(sourceImagePath); // 检查源文件是否存在
                                // 尝试移动文件
                                await fs.promises.rename(sourceImagePath, targetImagePath);
                                
                                // 只有当移动成功时才更新内容中的路径
                                const newImagePath = `${baseName}/${imageFileName}`;
                                const escapedImagePath = imagePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                finalContent = finalContent.replace(new RegExp(escapedImagePath, 'g'), newImagePath);
                                
                                logger.info(`✅ 图片已移动并更新路径: ${imagePath} -> ${newImagePath}`);
                                logger.info(`   文件位置: ${getRelativePath(sourceImagePath)} -> ${getRelativePath(targetImagePath)}`);
                            } catch (error) {
                                if (error.code === 'ENOENT') {
                                    logger.warn(`⚠️ 源图片文件不存在或无权限访问，跳过移动: ${getRelativePath(sourceImagePath)}`);
                                } else {
                                    logger.error(`❌ 移动图片失败: ${error.message}. 源: ${getRelativePath(sourceImagePath)}, 目标: ${getRelativePath(targetImagePath)}`);
                                }
                                // 如果移动失败或源文件不存在，不更新 finalContent
                            }
                        }
                    }
                }
            }
            
            // 提取所有视频路径 - 逻辑模仿图片处理
            const videoMatches = finalContent.match(/<video[^>]*src="([^"]+)"[^>]*>/g);
            if (videoMatches) {
                logger.info('开始处理视频文件移动...');
                logger.info(`找到 ${videoMatches.length} 个视频标签.`);

                for (const match of videoMatches) {
                    const videoPath = match.match(/src="([^"]+)"/)[1];
                    logger.info(`正在处理视频路径: ${videoPath}`);
                    
                    // 如果是相对路径且不在同名文件夹中
                    if (!videoPath.startsWith('http') && !videoPath.startsWith(baseName + '/')) {
                        const videoFileName = path.basename(videoPath);
                        let sourceVideoPath;

                        // 如果路径不包含斜杠，则假定它在 IMG 目录下
                        if (!videoPath.includes('/')) {
                            sourceVideoPath = path.join(CONFIG.WORK_DIR, destination.replace(/^\.\//, ''), 'IMG', videoFileName);
                        } else {
                            // 否则，按原样处理（例如 ./IMG/video.mp4）
                            sourceVideoPath = path.join(CONFIG.WORK_DIR, destination.replace(/^\.\//, ''), videoPath.replace(/^\.\//, ''));
                        }
                        
                        const targetVideoPath = path.join(imageDir, videoFileName);
                        logger.info(`源路径: ${sourceVideoPath}`);
                        logger.info(`目标路径: ${targetVideoPath}`);

                        // 检查源文件和目标文件是否为同一个文件
                        if (path.resolve(sourceVideoPath) === path.resolve(targetVideoPath)) {
                            logger.info(`📍 视频已在目标位置，无需移动: ${videoPath}`);
                            // 文件已在正确位置，但仍需要更新路径格式
                            const escapedVideoPath = videoPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            finalContent = finalContent.replace(new RegExp(`src="${escapedVideoPath}"`, 'g'), `src="${videoFileName}"`);
                        } else {
                            try {
                                await fs.promises.access(sourceVideoPath); // 检查源文件是否存在
                                // 尝试移动视频到同名文件夹
                                await fs.promises.rename(sourceVideoPath, targetVideoPath);
                                
                                // 只有当移动成功时才更新内容中的路径
                                const escapedVideoPath = videoPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                finalContent = finalContent.replace(new RegExp(`src="${escapedVideoPath}"`, 'g'), `src="${videoFileName}"`);
                                
                                logger.info(`✅ 视频已移动并更新路径: ${videoPath} -> ${videoFileName}`);
                                logger.info(`   文件位置: ${getRelativePath(sourceVideoPath)} -> ${getRelativePath(targetVideoPath)}`);
                            } catch (error) {
                                if (error.code === 'ENOENT') {
                                    logger.warn(`⚠️ 源视频文件不存在或无权限访问，跳过移动: ${getRelativePath(sourceVideoPath)}`);
                                } else {
                                    logger.error(`❌ 移动视频失败: ${error.message}. 源: ${getRelativePath(sourceVideoPath)}, 目标: ${getRelativePath(targetVideoPath)}`);
                                }
                                // 如果移动失败或源文件不存在，不更新 finalContent
                            }
                        }
                    } else {
                        logger.info(`跳过视频（已在目标文件夹或为外部链接）: ${videoPath}`);
                    }
                }
            }
        }

        await writeFile(filePath, finalContent);
        logger.info(`已保存 MD 文件: ${getRelativePath(filePath)} 到 ${destination}`);
        
        // 只有保存真实的 MD 文件（非 cache）时才自动触发 Hexo 清理，以更新博客内容
        if (filename !== 'cache') {
            logger.info('真实 MD 文件保存成功，自动触发 Hexo 清理以确保博客图片和文章正常显示');
            // 异步执行清理，不阻塞响应
            setImmediate(async () => {
                try {
                    await autoCleanHexo();
                    logger.info('自动 Hexo 清理完成');
                } catch (error) {
                    logger.error(`自动 Hexo 清理失败: ${error.message}`);
                }
            });
        } else {
            logger.info('缓存文件保存成功，无需执行 Hexo 清理');
        }
        
        // 清除处理状态
        setProcessingStatus(false);
        
        res.json({
            success: true,
            message: '文件写入成功❤️',
            filepath: filename,
            content: finalContent // 添加最终处理后的内容
        });
    } catch (err) {
        // 出错时也要清除处理状态
        setProcessingStatus(false);
        next(err);
    }
});

/**
 * 创建文件夹
 * POST /create_folder
 */
app.post('/create_folder', noFileUpload.single('file'), async (req, res, next) => {
    try {
        const { folderPath, folderName } = req.body;
        if (!folderPath || !folderName) throw new Error('缺少目录参数');
        const fullFolderPath = path.join(CONFIG.WORK_DIR, folderPath.replace(/^\.\//, ''), folderName);
        
        // 如果目录已存在，直接返回成功
        try {
            await fs.promises.access(fullFolderPath);
            logger.info(`文件夹已存在: ${getRelativePath(fullFolderPath)}`);
            res.json({
                success: true,
                message: '目录已存在，无需创建',
                folderpath: `./${folderName}/`
            });
            return;
        } catch (error) {
            // 目录不存在，继续创建
        }
        
        await fs.promises.mkdir(fullFolderPath);
        logger.info(`已创建文件夹: ${getRelativePath(fullFolderPath)}`);
        res.json({
            success: true,
            message: '目录创建成功❤️',
            folderpath: `./${folderName}/`
        });
    } catch (err) {
        next(err);
    }
});

/**
 * 移动图片文件
 * POST /move_image
 */
app.post('/move_image', noFileUpload.single('file'), async (req, res, next) => {
    try {
        // 设置处理状态为“正在移动图片”
        setProcessingStatus(true, 'moving_image');
        
        const { folderName, fileName, new_folderName, original_dir } = req.body;
        if (!folderName || !fileName || !new_folderName || !original_dir) throw new Error('缺少必要参数');
        
        const sourcePath = path.join(CONFIG.WORK_DIR, folderName, fileName);
        const destinationPath = path.join(CONFIG.WORK_DIR, new_folderName, fileName);

        await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true }); // 确保目标目录存在
        logger.info(`确保移动目标目录存在: ${getRelativePath(path.dirname(destinationPath))}`);

        await fs.promises.rename(sourcePath, destinationPath);
        logger.info(`已将 ${fileName} 从 ${folderName} 移动到 ${new_folderName}`);
        // 清除处理状态
        setProcessingStatus(false);
        
        res.json({
            success: true,
            message: `图片视频移动成功❤️，已将 ${fileName} 从 ${folderName} 移动至 ${new_folderName}`,
            data: { original_dir, folderName, fileName: fileName, new_folderName }
        });
    } catch (err) {
        // 出错时也要清除处理状态
        setProcessingStatus(false);
        next(err);
    }
});

/**
 * 检查文件是否存在
 * POST /api/check-file
 */
app.post('/api/check-file', noFileUpload.single('file'), async (req, res, next) => {
    try {
        const { filename } = req.body;
        if (!filename) throw new Error('缺少文件名参数');
        
        const filePath = path.join(CONFIG.WORK_DIR, filename);
        let exists = false;
        try {
            await fs.promises.access(filePath);
            exists = true;
        } catch (error) {
            // 文件不存在或无权限访问
        }
        
        logger.info(`检查文件存在性: ${filename} - ${exists ? '存在' : '不存在'}`);
        
        res.json({
            success: true,
            exists: exists,
            filename: filename
        });
    } catch (err) {
        logger.error(`检查文件失败: ${err.message}`);
        res.status(500).json({
            success: false,
            message: err.message || '检查文件失败'
        });
    }
});

/**
 * 获取服务器文件列表
 * GET /api/list-files
 */
app.get('/api/list-files', async (req, res, next) => {
    try {
        const files = [];
        
        // 递归读取所有文件
        const readFilesRecursively = async (dir) => {
            const entries = await fs.promises.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    await readFilesRecursively(fullPath);
                } else {
                    // 获取相对于工作目录的路径
                    const relativePath = path.relative(CONFIG.WORK_DIR, fullPath);
                    files.push(relativePath);
                }
            }
        };
        
        try {
            await fs.promises.access(CONFIG.WORK_DIR); // 检查工作目录是否存在
            await readFilesRecursively(CONFIG.WORK_DIR);
        } catch (error) {
            logger.warn(`工作目录不存在或无权限访问: ${CONFIG.WORK_DIR}, 错误: ${error.message}`);
        }
        
        logger.info(`获取文件列表成功，共 ${files.length} 个文件`);
        
        res.json({
            success: true,
            files: files,
            count: files.length
        });
    } catch (err) {
        logger.error(`获取文件列表失败: ${err.message}`);
        res.status(500).json({
            success: false,
            message: err.message || '获取文件列表失败'
        });
    }
});

/**
 * 手动清理 Hexo 缓存
 * POST /clean_hexo
 */
app.post('/clean_hexo', noFileUpload.single('file'), async (req, res, next) => {
    try {
        logger.info('开始手动清理 Hexo 缓存...');
        await autoCleanHexo();
        logger.info('手动清理 Hexo 缓存成功');
        
        res.json({
            success: true,
            message: 'Hexo 缓存清理成功❤️'
        });
    } catch (err) {
        logger.error(`手动清理 Hexo 缓存失败: ${err.message}`);
        res.status(500).json({
            success: false,
            message: `清理失败: ${err.message}`
        });
    }
});

/**
 * 下载压缩文件
 * POST /tgz_download
 */
app.post('/tgz_download', noFileUpload.none(), async (req, res, next) => {
    let tempMdFileToClean = null; // To store path of temporary MD file
    try {
        const { directoryName, selectedFile, original_dir, markdownContent } = req.body;
        if (!directoryName || !original_dir) throw new Error('缺少必要参数: directoryName 或 original_dir');

        const tarFileName = `${directoryName}.tar`;
        
        // 确定要打包的文件列表
        const filesToPack = [];
        
        // 检查目录是否存在
        const fullDirPath = path.join(CONFIG.WORK_DIR, directoryName);
        try {
            await fs.promises.access(fullDirPath);
            filesToPack.push(directoryName);
        } catch (error) {
            logger.warn(`打包目录不存在或无权限访问: ${fullDirPath}, 错误: ${error.message}`);
        }
        
        // 检查MD文件是否存在并根据条件写入内容
        if (selectedFile) {
            const mdFilePath = path.join(CONFIG.WORK_DIR, selectedFile);
            let existingFileContent = '';
            let contentToWrite = markdownContent; // 默认使用编辑器内容

            try {
                // 尝试读取现有文件内容
                existingFileContent = await fs.promises.readFile(mdFilePath, 'utf8');
                logger.info(`MD文件存在，已读取其内容: ${mdFilePath}`);
            } catch (error) {
                logger.warn(`MD文件不存在或无法读取: ${mdFilePath}, 错误: ${error.message}. 将使用编辑器内容或空字符串。`);
                // 如果文件不存在，existingFileContent 保持为空，contentToWrite 仍为 markdownContent (这是正确的)。
            }

            // 定义用于检测视频标签的正则表达式
            // 匹配任何包含 src 属性的 <video> 标签 (不区分大小写)
            const videoTagRegex = /<video[^>]*src="[^"]+"[^>]*>/i;

            // 应用用户指定的条件
            if (markdownContent && videoTagRegex.test(markdownContent)) {
                // 如果编辑器内容包含视频标签，则使用编辑器内容
                contentToWrite = markdownContent;
                logger.info(`编辑器内容包含视频标签，将使用编辑器内容写入MD文件: ${selectedFile}`);
            } else {
                // 如果编辑器内容不包含视频标签，则优先使用现有文件内容
                if (existingFileContent) {
                    contentToWrite = existingFileContent;
                    logger.info(`编辑器内容不包含视频标签，将使用现有MD文件内容写入MD文件: ${selectedFile}`);
                } else if (markdownContent) {
                    // 如果MD文件不存在或为空，但编辑器有内容，则使用编辑器内容 (适用于新建文件或清空文件后编辑的情况)
                    contentToWrite = markdownContent;
                    logger.info(`MD文件不存在或为空，且编辑器有内容，将使用编辑器内容写入MD文件: ${selectedFile}`);
                } else {
                    // 现有文件和编辑器内容都为空
                    contentToWrite = '';
                    logger.info(`MD文件和编辑器内容都为空，MD文件 ${selectedFile} 将被清空。`);
                }
            }

            // 将最终确定的内容写入到MD文件
            await fs.promises.writeFile(mdFilePath, contentToWrite, 'utf8');
            logger.info(`最终内容已写入MD文件: ${mdFilePath}`);
            
            filesToPack.push(selectedFile); // 确保将文件添加到打包列表
        }
        
        if (filesToPack.length === 0 && !directoryName) { // 如果没有文件也没有目录，则抛出错误
            throw new Error(`要下载的文件或文件夹不存在`);
        }

        const encodedTarFileName = encodeURIComponent(tarFileName);
        const safeTarFileName = tarFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        res.set('Content-Type', 'application/octet-stream');
        res.set('Content-Disposition', `attachment; filename="${safeTarFileName}"; filename*=UTF-8''${encodedTarFileName}`);

        logger.info(`开始打包文件: ${filesToPack.join(', ')}`);
        
        // 直接流式传输，避免创建临时文件，提高效率
        const tarStream = tar.create({ 
            gzip: true,
            cwd: CONFIG.WORK_DIR  // 设置打包的工作目录
        }, filesToPack);
        
        // 监听响应结束事件来记录日志
        res.on('finish', () => {
            logger.info(`下载完成: ${filesToPack.join(', ')} as ${tarFileName}`);
        });
        
        res.on('error', (err) => {
            logger.error(`下载失败: ${err.message}`);
        });
        
        // 直接将 tar 流传输给响应
        tarStream.pipe(res);

        logger.info(`已导出: ${filesToPack.join(', ')} as ${tarFileName}`);
    } catch (err) {
        logger.error(`Export failed: ${err.message}`);
        res.status(500).json({ success: false, message: err.message || '导出失败' });
    }
});


// 全局状态跟踪，用于监控长时间运行的任务
let processingStatus = {
    isProcessing: false, // 是否正在处理
    operation: '', // 当前操作
    startTime: null // 开始时间
};

// 保存状态检查 API，前端可以轮询此接口来获取后端状态
app.get('/api/save-status', (req, res) => {
    res.json(processingStatus);
});

// 更新处理状态的辅助函数
const setProcessingStatus = (isProcessing, operation = '') => {
    processingStatus = {
        isProcessing,
        operation,
        startTime: isProcessing ? Date.now() : null
    };
};

// 应用统一的错误处理中间件
app.use(errorHandler);

