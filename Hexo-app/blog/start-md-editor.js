#!/usr/bin/env node

/**
 * MD Editor 完整启动脚本
 * 集成 Hexo 博客系统 + MD Editor 后端服务
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 启动 Hexo 博客 + MD Editor 集成系统...\n');

// 检查端口占用
function checkPort(port) {
    return new Promise((resolve) => {
        exec(`lsof -i :${port}`, (error, stdout) => {
            resolve(!error && stdout.trim() !== '');
        });
    });
}

// 启动 Hexo 服务
function startHexoServer() {
    return new Promise((resolve, reject) => {
        console.log('📝 启动 Hexo 博客服务 (端口 4000)...');
        
        const hexo = spawn('npm', ['run', 'server'], {
            cwd: __dirname,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let started = false;
        
        hexo.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`   Hexo: ${output.trim()}`);
            
            if (output.includes('Hexo is running') || output.includes('localhost:4000')) {
                if (!started) {
                    started = true;
                    resolve(hexo);
                }
            }
        });

        hexo.stderr.on('data', (data) => {
            console.error(`   Hexo Error: ${data.toString().trim()}`);
        });

        hexo.on('error', (error) => {
            reject(new Error(`Hexo 启动失败: ${error.message}`));
        });

        // 超时处理
        setTimeout(() => {
            if (!started) {
                reject(new Error('Hexo 启动超时'));
            }
        }, 30000);
    });
}

// 启动 MD Editor 后端服务
function startMdEditorBackend() {
    return new Promise((resolve, reject) => {
        console.log('🛠️  启动 MD Editor 后端服务 (端口 3001)...');
        
        const backend = spawn('node', ['app-optimized.js'], {
            cwd: path.join(__dirname, 'source', 'md_editor'),
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let started = false;

        backend.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`   MD Editor: ${output.trim()}`);
            
            if (output.includes('监听端口 3001')) {
                if (!started) {
                    started = true;
                    resolve(backend);
                }
            }
        });

        backend.stderr.on('data', (data) => {
            console.error(`   MD Editor Error: ${data.toString().trim()}`);
        });

        backend.on('error', (error) => {
            reject(new Error(`MD Editor 后端启动失败: ${error.message}`));
        });

        // 超时处理
        setTimeout(() => {
            if (!started) {
                reject(new Error('MD Editor 后端启动超时'));
            }
        }, 10000);
    });
}

// 主函数
async function main() {
    try {
        // 检查必要文件
        const requiredFiles = [
            path.join(__dirname, 'package.json'),
            path.join(__dirname, '_config.yml'),
            path.join(__dirname, 'source/md_editor/app-optimized.js'),
            path.join(__dirname, 'source/md_editor/index-optimized.html')
        ];

        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                throw new Error(`缺少必要文件: ${file}`);
            }
        }

        // 检查端口占用
        const port4000Busy = await checkPort(4000);
        const port3001Busy = await checkPort(3001);

        if (port4000Busy) {
            console.log('⚠️  端口 4000 已被占用，可能 Hexo 已在运行');
        }

        if (port3001Busy) {
            console.log('⚠️  端口 3001 已被占用，正在停止...');
            exec('lsof -ti:3001 | xargs kill -9');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // 启动服务
        let hexoProcess, backendProcess;

        if (!port4000Busy) {
            hexoProcess = await startHexoServer();
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        backendProcess = await startMdEditorBackend();
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 显示启动完成信息
        console.log('\n🎉 所有服务启动完成！\n');
        
        console.log('📖 访问地址:');
        console.log(`   🏠 博客首页: http://localhost:4000`);
        console.log(`   ✏️  MD编辑器: http://localhost:4000/md_editor/index-optimized.html`);
        console.log(`   🔧 直接访问: http://localhost:3001/index-optimized.html`);
        
        console.log('\n⌨️  快捷键:');
        console.log('   Ctrl+S: 保存文件');
        console.log('   Ctrl+O: 打开文件');
        console.log('   Ctrl+Shift+I: 上传图片');
        console.log('   Ctrl+E: 导出文件');

        console.log('\n🔧 主要优化:');
        console.log('   ✅ 解决中文编码问题');
        console.log('   ✅ 处理文件名特殊字符和空格');
        console.log('   ✅ 优化 Markdown 图片链接生成');
        console.log('   ✅ 支持拖拽上传');
        console.log('   ✅ 模块化代码结构');
        console.log('   ✅ 集成到 Hexo 博客系统');

        console.log('\n💡 使用建议:');
        console.log('   1. 在 MD Editor 中编辑文章');
        console.log('   2. 保存的文件会自动出现在 Hexo 博客中');
        console.log('   3. 图片会自动处理并生成正确的链接');
        console.log('   4. 支持中文文件名和特殊字符');

        console.log('\n🛑 按 Ctrl+C 停止所有服务');

        // 优雅退出处理
        process.on('SIGINT', () => {
            console.log('\n🛑 正在关闭所有服务...');
            
            if (hexoProcess) {
                console.log('   停止 Hexo 服务...');
                hexoProcess.kill('SIGTERM');
            }
            
            if (backendProcess) {
                console.log('   停止 MD Editor 后端服务...');
                backendProcess.kill('SIGTERM');
            }
            
            setTimeout(() => {
                console.log('✅ 所有服务已停止');
                process.exit(0);
            }, 2000);
        });

        process.on('SIGTERM', () => {
            if (hexoProcess) hexoProcess.kill('SIGTERM');
            if (backendProcess) backendProcess.kill('SIGTERM');
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ 启动失败:', error.message);
        console.log('\n🔧 故障排除:');
        console.log('   1. 确保在项目根目录运行此脚本');
        console.log('   2. 检查 Node.js 版本 (需要 >= 14.0.0)');
        console.log('   3. 运行 npm install 安装依赖');
        console.log('   4. 检查端口 3001 和 4000 是否被占用');
        process.exit(1);
    }
}

main();