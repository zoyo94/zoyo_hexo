**这里着重说明一下：**

1. 上传文件夹的时候子文件夹里面的文件夹名和md文件名一致，子文件夹里面包含图像文件
2. 上传图片可以多选
3. 涉及到文件名的地方尽量使用英文，中文也行但是爱出现编码问题。最近修复主要是这个问题。
4. 自己的文档存储在：/Hexo-app/blog/source/_posts

# update:2025-09-06

> 添加了对[imzbf/md-editor-rt](https://github.com/imzbf/md-editor-rt)版本适配。

> 两个版本都能跑，http://xxxx:4000/md-editor-rt/md_editor/、http://xxxx:4000/md-editor-rt/

# update:2025-08-30

> 更新了代码，交互逻辑，UI，以及修复BUG。

> 可拖拽上传 md、图片、视频文件

> 使用pm2 启动应用

# update:2025-04-04

> 反正就是修复了一些内容懒得写

> 加了一个自动保存倒计时

> butterfly: 5.3.3升级5.3.5

# update:2025-2-22

> 使用Grok3优化了一下代码：
> 优化了CSS样式，全部代码重新润色。

> butterfly: 4.13.0升级5.3.3

> hexo: 7.2升级7.3.0

# update:2024-6-17
> 添加hexo s默认启动无需再手动启动。

> 启动没有那么快，可以执行screen -r hexo 查看是否加载完成，再访问页面。

# update:2024-6-14
> 修复手动保存问题。

> butterfly: 4.12.0升级4.13.0

> hexo: 7.1.1升级7.2.0

> 后续自己使用npm升级hexo、butterfly

# update:2024-5-6
> 修复上传md文件名乱码

# update:2024-2-20
> butterfly: 4.8.5升级4.12.0

> hexo: 7.0.0升级7.1.1
------------------------
### 1、启动容器。
##### X86平台
`docker run -d -p 4000:4000 -p 3001:3001 --name hexo zoyo94/zoyo_hexo:latest sh -c "pm2 start ecosystem.config.js && while true; do sleep 30; done"`
##### ARM64_v8平台
`docker run -d -p 4000:4000 -p 3001:3001 --name hexo zoyo94/zoyo_hexo:latest sh -c "pm2 start ecosystem.config.js && while true; do sleep 30; done"`

##### docker-compose.yml
```
name: hera
services:
    zoyo_hexo:
        platform: linux/arm64/v8
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

> 前端端口：4000

> 后端端口：3001

### 2、访问使用：http://ip:4000/

### 3、包换hexo、butterfly主题、editor.md、zsh、debian中文环境。

### 4、添加了自己的一些功能，hexo大概其没改变，主要是hexo整合editor.md直接在网页编辑自己hexo的内容。

### 5、editor.md添加了:
1. 上传图片、
2. 上传md文件、
3. 上传视频、
4. 手动保存编辑器内容、
5. 自动保存编辑器内容、
6. tgz压缩导出md文件以及相关联图片文件夹。

#### 6、这些后端功能写于文件：/Hexo-app/blog/source/md_editor/app.js

#### 7、 进入容器中
`docker exec -it 容器名字 zsh`

`cd /Hexo-app/blog`

### 8、使用 pm2 启动(默认启动状态)
` pm2 list `

` pm2 start all `

` pm2 stop all `

### 8、启动后端写了一个启动命令(默认启动状态不用操作)：~

#### 8.1启动：~
~`service appjs start`~
#### 8.2停止：~
~`service appjs stop`~

### 9、启用hexo s（默认启动状态不用操作）~

#### 这里给一个建议使用screen另外起一个会话运行启动，再使用ctr+a+d保持退出会话。~

#### 9.1 创建hexo screen名字随便，自己记得就行。~

~`screen -S hexo`~

~`cd /Hexo-app/blog`~

#### 9.2 启动~

~`hexo s`~

#### 9.3 按键ctr+a+d后台运行~

#### 9.4 想要再次回到hexo~

~`screen -r hexo`~

