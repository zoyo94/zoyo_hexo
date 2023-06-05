### 1、启动后端app.js。
`nohup node ~/Hexo-app/blog/source/md_editor/app.js  &`

### 2、启动前端Hexo
`cd ~/Hexo-app`
`hexo s`

> 前端端口：4000

> 后端端口：3001

### 3、访问使用：http://ip:4000/

### 4、添加了自己的一些功能，hexo大概其没改变，主要是hexo整合editor.md直接在网页编辑自己hexo的内容。

### 5、editor.md添加了:
1. 上传图片、
2. 上传md文件、
3. 手动保存编辑器内容、
4. 自动保存编辑器内容、
5. tgz压缩导出md文件以及相关联图片文件夹。

#### 6、这些后端功能写于文件：/Hexo-app/blog/source/md_editor/app.js
