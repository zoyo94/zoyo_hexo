# 🚀 Zoyo-Hexo：深度集成的 Markdown 编辑全能系统

[![GitHub stars](https://img.shields.io/github/stars/zoyo94/zoyo_hexo?style=flat-square&logo=github)](https://github.com/zoyo94/zoyo_hexo)
[![Docker Pulls](https://img.shields.io/docker/pulls/zoyo94/zoyo_hexo?style=flat-square&logo=docker)](https://hub.docker.com/r/zoyo94/zoyo_hexo)
[![Language](https://img.shields.io/github/languages/top/zoyo94/zoyo_hexo?style=flat-square)](https://github.com/zoyo94/zoyo_hexo)
[![Node version](https://img.shields.io/badge/Node.js-%3E%3D%2014.0.0-green?style=flat-square&logo=node.js)](https://nodejs.org)

**Zoyo-Hexo** 是一个专为 Hexo 打造的深度集成创作方案。它打破了传统 Hexo 本地编辑的碎片化体验，将强大的 Markdown 编辑器（双版本支持）与 Node.js 安全后端完美结合，为您提供类似 CMS 的丝滑写作体验。

### ✨ 系统核心亮点
- **🗂️ 深度集成**: 在 Hexo 博客中直接开启编辑模式，实时保存同步，改动立现。
- **📂 智能迁移**: 独创“原子级”保存机制，重命名文章时自动迁移关联图片文件夹，告别冗余垃圾文件。
- **🛡️ 企业级安全性**: 经过## 📅 更新日志 (Recent Updates)

<details open>
<summary><b>🚀 2026-04-01: 后端安全与架构闭环 (Antigravity 深度重构)</b></summary>

- **可视化面板上线**：后端访问 `http://localhost:3001/` 即可进入全接口交互式文档与服务器实时监控面板。
- **启动器自检升级**：`start.js` 现支持 Dashboard 日志展示与 PID 强力销毁机制，解决僵尸进程困扰。
- **路径安全锁**：防御所有目录遍历攻击，接口调用全流程通过 `validateSafePath` 审计。
- **资产原子迁移**：重命名 MD 文件后，自动迁移其伴生资源文件夹，并执行 Hexo 逻辑清理。
- **底层流式存储**：全量迁移至 `Multer DiskStorage` 模式，极大降低了大规模上传时的服务器内存占用。
</details>

<details>
<summary>历史更新记录</summary>

- **2025-12-08**: Butterfly 主题升级 (5.5.2)；MD-Editor-RT 升级 (6.2.0)。
- **2025-09-17**: 为 MD-Editor-RT 引入 PDF 实时导出功能。
- **2025-08-30**: 增加拖拽上传支持；引入 PM2 进程守护。
- **2024-06-17**: 重构 Hexo 启动链路，实现单命令一键部署。
- **早期版本**: 完成了 Editor.md 的深层整合及多平台容器化映射逻辑。
</details>

---

## ⚡ 快速部署 (Quick Start)

### 1. 🐳 Docker 部署 (推荐)
支持 X86 与 ARM64 (v8) 架构一键上线：

```bash
docker run -d \
  -p 4000:4000 -p 3001:3001 \
  --name zoyo_hexo \
  zoyo94/zoyo_hexo:latest \
  sh -c "pm2 start ecosystem.config.js && tail -f /dev/null"
```

#### Docker Compose 配置：
```yaml
services:
    zoyo_hexo:
        stdin_open: true
        tty: true
        ports:
            - 4000:4000
            - 3001:3001
        container_name: hexo
        volumes:
            - ./_config.butterfly.yml:/Hexo-app/blog/_config.butterfly.yml
            - ./_config.yml:/Hexo-app/blog/_config.yml
            - ./MD_files:/Hexo-app/blog/source/_posts
        image: zoyo94/zoyo_hexo:latest
        command: ["sh", "-c", "pm2 start ecosystem.config.js && while true; do sleep 30; done"]
```

### 2. 💻 本地运行 (开发者模式)
在博客根目录完成依赖安装后，运行自举启动器：

```bash
node start.js
```
启动后终端将展示精美的监控面板，展示 Hexo 与后端实时状态。

---

## 📖 核心访问指南

| 模块 | 访问地址 | 功能描述 |
| :--- | :--- | :--- |
| **博客首页** | `http://localhost:4000` | Hexo 静态内容展示。 |
| **Markdown 编辑器** | `http://localhost:4000/md_editor/` | 实时协作与内容生产平台。 |
| **后端看板 (NEW)** | `http://localhost:3001/` | **接口文档与服务器监控中心**。 |

---

## 🛠️ 管理说明

- **进程守护**: 容器内默认使用 PM2。运行 `docker exec -it hexo pm2 list` 检查服务状态。
- **最佳实践**: 建议文件名使用英文或下划线以获得最佳兼容性。
- **备份导出**: 通过编辑器顶部的“导出”按钮，可将文章连同相关图片一键打包为 `.tgz` 文件。

---

**Designed with ❤️ by [zoyo94](https://github.com/zoyo94)**

