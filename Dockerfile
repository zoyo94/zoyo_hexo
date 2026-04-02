# 基于 node:20-alpine 的极致瘦身版 (已集成 OhMyZsh)
FROM node:20-alpine
LABEL maintainer="ZOYO Jill406268750@gmail.com"
LABEL description="Hexo & Editor.md 极致 Alpine + OhMyZsh 版"

# 1. 自动开启社区仓库并切换科大源，安装运行时组件
# (Alpine 环境下必须先安装 bash 才能顺利执行 oh-my-zsh 安装脚本)
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories \
    && echo "http://mirrors.ustc.edu.cn/alpine/v$(cut -d. -f1,2 /etc/alpine-release)/community" >> /etc/apk/repositories \
    && apk update && apk add --no-cache \
    bash \
    git \
    zsh \
    vim \
    curl \
    procps \
    font-wqy-zenhei \
    tzdata \
    && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone

# 2. 集成 Oh My Zsh 及 3 大核心插件 (自动补全、语法高亮、提示)
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended \
    && git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-/root/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting \
    && git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-/root/.oh-my-zsh/custom}/plugins/zsh-autosuggestions \
    && git clone https://github.com/zsh-users/zsh-completions ${ZSH_CUSTOM:-/root/.oh-my-zsh/custom}/plugins/zsh-completions

# 3. 设置中文环境和全局 npm 配置
ENV LANG=zh_CN.UTF-8 \
    LANGUAGE=zh_CN:zh \
    LC_ALL=zh_CN.UTF-8

RUN npm config set registry https://registry.npmmirror.com \
    && npm install -g pm2 hexo-cli \
    && npm cache clean --force

# 4. 源码部署
ADD Hexo-app-all.tgz /

# 5. 系统收尾 (切换默认 Shell 为 Zsh 并配置工作目录)
RUN sed -i 's/\/bin\/sh/\/bin\/zsh/g' /etc/passwd
COPY zshrc /root/.zshrc 
WORKDIR /Hexo-app/blog

# 暴露端口与默认指令运行 Shell
EXPOSE 4000 3001
SHELL ["/bin/zsh", "-c"]

# 启动 (使用 pm2 守护进程)
CMD ["pm2-runtime", "ecosystem.config.js"]
