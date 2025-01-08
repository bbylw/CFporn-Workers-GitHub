# CF-Workers-GitHub-PH-Style

这是一个基于 [@cmliu/CF-Workers-GitHub](https://github.com/cmliu/CF-Workers-GitHub) 的修改版本，保持原有功能的同时，将界面风格改造为类似 Pornhub 的黑橙配色方案。

## 修改内容

- UI 界面采用深黑色背景 (#0a0a0a)
- 强调色采用标志性橙色 (#ff9000)
- GitHub 图标采用橙色填充
- 搜索框和按钮采用圆角设计
- 整体视觉风格模仿 Pornhub

## 简介

github release、archive以及项目文件的加速项目，支持clone，Cloudflare Workers & Pages 版本

## 使用

直接在copy出来的url前加`https://Github.fxxk.dedyn.io/`即可

也可以直接访问，在input输入

***大量使用请自行部署，以上域名仅为演示使用。***

访问私有仓库可以通过

`git clone https://user:TOKEN@github.fxxk.dedyn.io/https://github.com/xxxx/xxxx` [#71](https://github.com/hunshcn/gh-proxy/issues/71)

以下都是合法输入（仅示例，文件不存在）：

- 分支源码：https://github.com/hunshcn/project/archive/master.zip
- release源码：https://github.com/hunshcn/project/archive/v0.1.0.tar.gz
- release文件：https://github.com/hunshcn/project/releases/download/v0.1.0/example.zip
- 分支文件：https://github.com/hunshcn/project/blob/master/filename
- commit文件：https://github.com/hunshcn/project/blob/123/filename
- gist：https://gist.githubusercontent.com/cielpy/123/raw/cmd.py

## Pages Github 部署

### 1. 部署 Cloudflare Pages：
   - 在 Github 上先 Fork 本项目，并点上 Star !!!
   - 在 Cloudflare Pages 控制台中选择 `连接到 Git`后，选中 `CF-Workers-GitHub`项目后点击 `开始设置`。
     
### 2. 给 Pages绑定 自定义域：
   - 在 Pages控制台的 `自定义域`选项卡，下方点击 `设置自定义域`。
   - 填入你的自定义次级域名，注意不要使用你的根域名，例如：
     您分配到的域名是 `fxxk.dedyn.io`，则添加自定义域填入 `github.fxxk.dedyn.io`即可；
   - 按照 Cloudflare 的要求将返回你的域名DNS服务商，添加 该自定义域 `github`的 CNAME记录 `CF-Workers-GitHub.pages.dev` 后，点击 `激活域`即可。

## Workers 部署方法
### 部署 Cloudflare Worker：

   - 在 Cloudflare Worker 控制台中创建一个新的 Worker。
   - 将 [_worker.js](https://github.com/cmliu/CF-Workers-GitHub/blob/main/_worker.js) 的内容粘贴到 Worker 编辑器中。


# 致谢
- [cmliu/CF-Workers-GitHub](https://github.com/cmliu/CF-Workers-GitHub) - 原项目
- [gh-proxy](https://github.com/hunshcn/gh-proxy)
- [jsproxy](https://github.com/EtherDream/jsproxy/)
