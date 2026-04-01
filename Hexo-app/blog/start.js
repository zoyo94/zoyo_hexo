#!/usr/bin/env node

/**
 * 🛠️ MD Editor + Hexo 博客集成启动器 (PRO版)
 * 核心功能：服务监控模块化、全流程日志、资产自检、优雅退出
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// --- 配色与装饰 ---
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    underscore: "\x1b[4m",
    fgCyan: "\x1b[36m",
    fgGreen: "\x1b[32m",
    fgYellow: "\x1b[33m",
    fgRed: "\x1b[31m",
    fgMagenta: "\x1b[35m",
    bgBlue: "\x1b[44m"
};

const divider = `${colors.dim}------------------------------------------------------------${colors.reset}`;

// --- 配置声明 ---
const CONFIG = {
    HEXO_PORT: 4000,
    BACKEND_PORT: 3001,
    BACKEND_PATH: path.join(__dirname, 'source', 'md_editor'),
    //EDITOR_URL: 'index.html', // 修正文件名
    TIMEOUT: {
        HEXO: 30000,
        BACKEND: 10000
    }
};

let children = []; // 追踪所有子进程

/**
 * 打印带样式的 Dashboard 头部
 */
function printHeader() {
    console.clear();
    console.log(`${colors.bgBlue}${colors.bright}  MD EDITOR & HEXO BLOG SYSTEM  ${colors.reset}`);
    console.log(`${colors.fgCyan}🚀 系统启动中...${colors.reset}`);
    console.log(divider);
}

/**
 * 环境变量与依赖自检
 */
function selfCheck() {
    console.log(`${colors.fgMagenta}[1/3] 执行资产自检...${colors.reset}`);

    const required = [
        { path: 'package.json', type: 'root' },
        { path: 'node_modules', type: 'root' },
        { path: 'source/md_editor/app.js', type: 'backend' }
    ];

    for (const item of required) {
        const fullPath = path.join(__dirname, item.path);
        if (!fs.existsSync(fullPath)) {
            if (item.optional) {
                console.warn(`${colors.fgYellow}⚠️  提示: ${item.path} 未找到，可能依赖未完整安装。${colors.reset}`);
            } else {
                throw new Error(`缺少关键资源: ${item.path}\n请在根目录运行 npm install`);
            }
        }
    }
    console.log(`${colors.fgGreen}✅ 自检通过：核心依赖已就位。${colors.reset}`);
}

/**
 * 端口清理 logic
 */
async function cleanupPorts() {
    console.log(`${colors.fgMagenta}[2/3] 正在核查端口占用 (4000 & 3001)...${colors.reset}`);

    const ports = [CONFIG.HEXO_PORT, CONFIG.BACKEND_PORT];
    for (const port of ports) {
        try {
            // macOS/Linux 直接用 lsof 查找并 kill
            const pid = await new Promise((resolve) => {
                exec(`lsof -ti :${port}`, (err, stdout) => resolve(stdout.trim()));
            });

            if (pid) {
                console.log(`${colors.fgYellow}⚠️  端口 ${port} 已被进程 ${pid} 占用，正在强行清理...${colors.reset}`);
                exec(`kill -9 ${pid}`);
                await new Promise(r => setTimeout(r, 1500));
            }
        } catch (e) {
            // 忽略错误
        }
    }
    console.log(`${colors.fgGreen}✅ 端口检查完成。${colors.reset}`);
}

/**
 * 启动子进程并监控
 */
function launchService(name, command, args, options, readyFlag) {
    return new Promise((resolve, reject) => {
        console.log(`${colors.bright}${colors.fgCyan}启动 ${name}...${colors.reset}`);

        const proc = spawn(command, args, options);
        children.push(proc);

        let isReady = false;

        proc.stdout.on('data', (data) => {
            const line = data.toString().trim();
            if (line) console.log(`${colors.dim}[${name}] ${line}${colors.reset}`);

            if (line.includes(readyFlag) && !isReady) {
                isReady = true;
                resolve(proc);
            }
        });

        proc.stderr.on('data', (data) => {
            console.error(`${colors.fgRed}[${name} ERROR] ${data.toString().trim()}${colors.reset}`);
        });

        proc.on('error', (err) => reject(new Error(`${name} 启动异常: ${err.message}`)));

        // 超时兜底
        const timer = name === 'HEXO' ? CONFIG.TIMEOUT.HEXO : CONFIG.TIMEOUT.BACKEND;
        setTimeout(() => {
            if (!isReady) {
                proc.kill('SIGKILL');
                reject(new Error(`${name} 启动超时 (未检测到: "${readyFlag}")`));
            }
        }, timer);
    });
}

/**
 * 打印启动成功的仪表盘
 */
function printReady() {
    console.log('\n' + divider);
    console.log(`${colors.fgGreen}${colors.bright}🎉 服务已就位！您可以开始撰写了。${colors.reset}`);
    console.log(divider);
    console.log(`${colors.bright}🔗 访问链接:${colors.reset}`);
    console.log(`   ${colors.fgCyan}🏠 博客首页:${colors.reset} http://localhost:4000`);
    console.log(`   ${colors.fgMagenta}✏️  MD 编辑器:${colors.reset} http://localhost:4000/md_editor`);
    console.log(`   ${colors.fgYellow}🔧 后端调试:${colors.reset} http://localhost:3001/`);
    console.log(divider);
    console.log(`${colors.dim}按 Ctrl+C 停止所有服务并清理环境。${colors.reset}\n`);
}

/**
 * 优雅退出逻辑
 */
function setupProcessHandlers() {
    const shutdown = (signal) => {
        console.log(`\n${colors.fgYellow}接收到信号 ${signal}，正在清理子进程...${colors.reset}`);
        children.forEach(child => {
            if (!child.killed) {
                child.kill('SIGKILL');
            }
        });
        console.log(`${colors.fgGreen}✅ 环境已清理，再见！${colors.reset}`);
        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('exit', () => {
        children.forEach(child => child.kill('SIGKILL'));
    });
}

// --- 主执行流 ---
async function main() {
    try {
        printHeader();
        selfCheck();
        await cleanupPorts();

        console.log(`${colors.fgMagenta}[3/3] 正在拉起所有子进程服务...${colors.reset}`);

        // 1. 启动 Hexo
        await launchService('HEXO', 'npm', ['run', 'server'], { cwd: __dirname }, 'localhost:4000');

        // 2. 启动 Backend
        await launchService('BACKEND', 'node', ['app.js'], { cwd: CONFIG.BACKEND_PATH }, '服务器已启动');

        setupProcessHandlers();
        printReady();

    } catch (err) {
        console.error(`\n${colors.fgRed}${colors.bright}❌ 启动遇到致命错误:${colors.reset}`);
        console.error(`   ${err.message}`);
        console.log(divider);
        console.log(`${colors.dim}建议：尝试运行 npm install 或手动杀死占用端口的进程。${colors.reset}`);

        // 报错时清理已启动的子进程
        children.forEach(child => child.kill('SIGKILL'));
        process.exit(1);
    }
}

main();