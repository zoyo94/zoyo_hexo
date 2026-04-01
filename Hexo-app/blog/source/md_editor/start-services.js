#!/usr/bin/env node

/**
 * MD Editor 服务启动脚本
 * 集成到 Hexo 博客系统中
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 启动 MD Editor 集成服务...\n');

// 检查是否在正确的目录
const currentDir = process.cwd();
const expectedPath = path.join('blog', 'source', 'md_editor');

if (!currentDir.includes('md_editor')) {
    console.log('❌ 请在 md_editor 目录下运行此脚本');
    console.log(`   当前目录: ${currentDir}`);
    console.log(`   应该在: ${expectedPath}`);
    process.exit(1);
}

// 检查 Hexo 是否在运行
function checkHexoRunning() {
    return new Promise((resolve) => {
        const { exec } = require('child_process');
        exec('lsof -i :4000', (error, stdout) => {
            resolve(!error && stdout.includes('node'));
        });
    });
}

// 启动优化版本的后端服务
function startBackendService() {
    console.log('📡 启动 MD Editor 后端服务 (端口 3001)...');
    
    const backend = spawn('node', ['app.js'], {
        stdio: 'inherit',
        cwd: __dirname
    });

    backend.on('error', (error) => {
        console.error('❌ 后端服务启动失败:', error.message);
        process.exit(1);
    });

    backend.on('exit', (code) => {
        if (code !== 0) {
            console.log(`❌ 后端服务异常退出，代码: ${code}`);
        }
    });

    return backend;
}

// 主函数
async function main() {
    try {
        // 检查 Hexo 服务状态
        const hexoRunning = await checkHexoRunning();
        
        if (hexoRunning) {
            console.log('✅ Hexo 服务已在运行 (端口 4000)');
        } else {
            console.log('⚠️  Hexo 服务未运行');
            console.log('   请在项目根目录运行: cd blog && hexo server');
            console.log('   或者运行: npm run server');
        }

        // 启动后端服务
        const backend = startBackendService();

        // 等待服务启动
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('\n🎉 MD Editor 服务启动完成！');
        console.log('\n📖 访问地址:');
        console.log(`   博客首页: http://localhost:4000`);
        console.log(`   MD编辑器: http://localhost:4000/md_editor/index.html`);
        console.log(`   或直接访问: http://localhost:3001/index.html`);
        
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

        // 优雅退出处理
        process.on('SIGINT', () => {
            console.log('\n🛑 正在关闭服务...');
            backend.kill('SIGTERM');
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            backend.kill('SIGTERM');
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ 启动失败:', error.message);
        process.exit(1);
    }
}

main();