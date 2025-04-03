** 这里着重说明一下：**

1. 上传文件夹的时候子文件夹里面的文件夹名和md文件名一致，子文件夹里面包含图像文件
2. 上传图片可以多选
3. 涉及到文件名的地方尽量使用英文，中文也行但是爱出现编码问题。最近修复主要是这个问题。
4. 自己的md文档存储在：/Hexo-app/blog/source/_posts

# update:2025-04-04

> 反正就是修复了一些内容懒得写

> 加了一个自动保存倒计时

> butterfly: 5.3.3升级5.3.5

# update:2025-2-22

> 使用Grok3优化了一下代码：
> 优化了CSS样式，全部代码重新润色。

> butterfly: 4.13.0升级5.3.3

> hexo: 7.2升级7.3.0

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

- 9个月过去了，这次push，发现主要文件夹没有push上去，😅。
- 因为butterfly和md_editor是clone有.git文件，所以push不上去。
- 这次push之后，自己clone，测试没问题。😳
- 我都忘了第一次有没有上去。内心社死了。
------------------------
> 前端端口：4000

> 后端端口：3001

### 1、访问使用：http://ip:4000/

### 2、包换hexo、butterfly主题、editor.md。

### 3、添加了自己的一些功能，hexo大概其没改变，主要是hexo整合editor.md直接在网页编辑自己hexo的内容。

### 4、editor.md添加了:
1. 上传图片、
2. 上传md文件、
3. 手动保存编辑器内容、
4. 自动保存编辑器内容、
5. tgz压缩导出md文件以及相关联图片文件夹。

#### 5、这些后端功能写于文件：/Hexo-app/blog/source/md_editor/app.js

#### 6、启动后端：

`cd /Hexo-app/blog`

`nohup node source/md_editor/app.js &`

#### 7、启用hexo s

##### 7.1 创建hexoS screen名字随便，自己记得就行。

`screen -S hexoS`

`cd /Hexo-app/blog`

##### 7.2 启动

`hexo s`

##### 7.3 按键ctr+a+d后台运行

##### 7.4 想要再次回到hexoS

`screen -r hexoS`
