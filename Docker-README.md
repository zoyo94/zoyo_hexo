# 🚀 Zoyo-Hexo Docker 版：极致轻量且深度集成的创作系统

[![Docker v1.1.0](https://img.shields.io/badge/Release-v1.1.0-blue?style=for-the-badge&logo=docker)](https://hub.docker.com/r/zoyo94/zoyo_hexo)
[![Image Size](https://img.shields.io/badge/Size-Alpine_Lightweight-5cb85c?style=for-the-badge&logo=alpine-linux)](https://hub.docker.com/r/zoyo94/zoyo_hexo)
[![Shell](https://img.shields.io/badge/Shell-Oh_My_Zsh-ff69b4?style=for-the-badge&logo=zsh)](https://github.com/ohmyzsh/ohmyzsh)

**Zoyo-Hexo** 官方 Docker 镜像现已全面重构为 **v1.1.0 Alpine 版**。在保持极小体积的同时，通过 `Oh My Zsh` 提供了生产级别的交互式终端，旨在为 Hexo 站长提供一个“开箱即用、管理自如”的写作与运维环境。

---

## 💎 v1.1.0 核心特性

- **🐳 极致瘦身 (Alpine-Based)**: 完美迁移至 `node:20-alpine` 基础镜像，不仅体积骤降，启动速度比 Debian 提高约 40%。
- **⚡ 现代化终端 (Oh My Zsh)**: 容器内预装 `Zsh` + `Oh My Zsh`，并集成了：
    - **自动补全 (Auto-suggestions)**
    - **语法高亮 (Syntax-highlighting)**
    - **Hexo 专属别名**: `hxc` (clean), `hxs` (server), `pm2 list` 等一键触达。
- **📝 双编辑器架构**: 完美兼容 `md-editor-rt` (现代级 React 体验) 与 `Editor.md` (经典极简)，统一后端，数据互通。
- **🛡️ 资产级安全性**: 全路径防穿越 (Path Traversal Protection)、DiskStorage 流式上传，确保服务器内存与资产双重安全。
- **📊 状态看板**: 后端 3001 端口提供可视化 API 交互文档与实时监控面板。

---

## ⚡ 快速开始 (Getting Started)

### 1. 🐳 一键 Docker 部署

支持 X86_64 与 ARM64 (Apple M 系列 / 树莓派) 全架构运行：

```bash
docker run -d \
  -p 4000:4000 -p 3001:3001 \
  --name zoyo_hexo \
  -v ./MD_files:/Hexo-app/blog/source/_posts \
  zoyo94/zoyo_hexo:latest
```

### 2. 🏗️ Docker Compose 黄金配置 (推荐)

使用 `docker-compose.yml` 可以更优雅地管理您的持久化数据和主题配置：

```yaml
version: '3.8'
services:
  zoyo_hexo:
    image: zoyo94/zoyo_hexo:latest
    container_name: hexo-site
    restart: always
    ports:
      - "4000:4000"   # Hexo 博客预览
      - "3001:3001"   # 编辑器后端看板
    volumes:
      - ./my_posts:/Hexo-app/blog/source/_posts       # 文章存储 (挂载该目录即可持久化)
      - ./_config.yml:/Hexo-app/blog/_config.yml      # Hexo 基础配置
      - ./_config.butterfly.yml:/Hexo-app/blog/_config.butterfly.yml # 主题配置
    stdin_open: true
    tty: true
```

---

## 📖 核心访问入口

| 模块 | 端口 | 路径 | 功能说明 |
| :--- | :--- | :--- | :--- |
| **博客首页** | `4000` | `/` | Hexo 静态页面实时预览。 |
| **RT 编辑器** | `4000` | `/md-editor-rt/` | **[最新]** 基于 React 的现代化编辑体验。 |
| **经典编辑器**| `4000` | `/md_editor/` | 经典的 Editor.md 极简模式。 |
| **后端看板**   | `3001` | `/` | **可视化控制中心**，监控日志与 API 调试。 |

---

## 🛠️ 进阶运维 (Operations)

### 进入生产级 Zsh 终端
体验容器内顶配的 Shell 环境：
```bash
docker exec -it hexo-site zsh
```

### 常用快捷指令 (Aliases)
在容器 Zsh 终端中，您可以享受以下加速指令：
- `hxc`: 执行 `hexo clean`
- `hxg`: 执行 `hexo generate`
- `hxs`: 执行 `hexo server` (预览模式)
- `hxl`: 查看后端 `pm2` 日志

---

## 📅 更新日志 (Recent Updates)

<details open>
<summary><b>🚀 v1.1.0 [当前版本] (2026-04-02)</b></summary>

- **镜像重构**: 全量迁移至 Alpine 3.20 系统，实现环境极简。
- **环境集成**: 全面集成 Oh My Zsh + 插件组。
- **体验优化**: 修复 RT 版首屏黑屏，统一了 MD 文件列表的 `cache` 隐藏逻辑。
- **存储优化**: 引入 `.gitkeep` 机制确保 `public/` 结构完整。
</details>

<details>
<summary>历史版本历史 (Archive)</summary>

- **2026-02-04**: 解决 cache 缓存清理残留；ExportPDF.css 改为本地加载。
- **2025-09-17**: md-editor-rt 添加 PDF 导出及 6.2.0 版本升级。
- **2025-08-30**: 增加拖拽上传支持；引入 PM2 原生启动。
- **2024-06-17**: 取代 screen/service appjs，实现 PM2 统一管理。
- **早期版本**: 实现了编辑器深度整合、自动保存及 tgz 资源打包导出。
</details>

---

## 🏗️ 核心组件致谢 (Core Credits)

本 Docker 镜像集成了以下开源生态的卓越成果：

- **[Hexo](https://github.com/hexojs/hexo)**: 高性能静态博客引擎。
- **[Editor.md](https://github.com/pandao/editor.md)** - 开源的可嵌入 Markdown 编辑器（经典版核心）。
- **[Md-Editor-RT](https://github.com/imzbf/md-editor-rt)** - 现代化的 React Markdown 编辑器（RT 版核心）。
- **[Oh My Zsh](https://github.com/ohmyzsh/ohmyzsh)** - 为容器提供极致终端体验的框架。
- **[hexo-theme-butterfly](https://github.com/jerryc127/hexo-theme-butterfly)**: 博客主题。
---

**Designed with ❤️ by [zoyo94](https://github.com/zoyo94)**
