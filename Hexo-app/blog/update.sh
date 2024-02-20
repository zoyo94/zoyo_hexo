#!/bin/bash

# 切换到hexo目录
#cd /Hexo-app/blog

#安装NVM
#curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.2/install.sh | bash

# 在脚本中加载 nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"  

#nvm ls-remote		#列出所有
nvm install node --lts --reinstall-packages-from=node #安装最新的lts版本吧，比较推荐
#nvm ls                #查看现在安装的哪些版本
#nvm uninstall v20.11.1 #找到旧的版本删除掉吧
#nvm alias default node #指定默认版本

# 获取 npm 的版本号
npm_version=$(npm -v)

# 检查是否有最新版本
latest_npm_version=$(npm show npm version)
if [ "$npm_version" != "$latest_npm_version" ]; then
    echo "发现新版本的 npm：$latest_npm_version，正在更新..."
    npm config set registry https://registry.npmmirror.com/
    npm install -g npm
else
    echo "npm 已经是最新版本：$npm_version"
fi


# hexo-cli版本
hexo_cli_version=$( hexo version | awk '/hexo-cli/ {print $2}')
hexo_cli_npm_version=$(npm show hexo-cli version)

# 检查hexo版本是否等于hexo-cli版本
if [ "$hexo_cli_version" != "$hexo_cli_npm_version" ]; then
    # 安装或更新hexo-cli
    echo "Hexo-cli 版本不一致，进行更新"
    npm install -g hexo-cli
else
	echo "Hexo-cli 版本一致"
fi

# hexo版本
hexo_version=$(hexo version | awk '/hexo:/ {print $2}')
hexo_npm_version=$(npm show hexo version)

# 检查hexo版本是否等于hexo-cli版本
if [ "$hexo_version" != "$hexo_npm_version" ]; then
    # 安装或更新hexo-cli
    echo "Hexo 版本不一致，进行更新，检查所以插件，升级所以插件"
    # 检查系统中的插件是否有升级的 npm install -g npm-check
    npm-check 
    # 升级系统中的相关插件 npm install -g npm-upgrade
    npm-upgrade
    npm uninstall punycode
    npm install hexo-renderer-marked
else
    echo "Hexo 版本一致"
fi

#更新butterfly
cd ./themes/butterfly
# 获取需要checkout的文件列表，并循环执行git checkout
git checkout | grep "M"  | awk -F ' ' '{print $2}' | while read -r file; do git checkout -- "$file"
done

git pull

#最后清理重构
hexo clean


