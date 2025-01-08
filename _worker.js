'use strict'

let 屏蔽爬虫UA = ['netcraft'];

// 前缀，如果自定义路由为example.com/gh/*，将PREFIX改为 '/gh/'，注意，少一个杠都会错！
const PREFIX = '/' // 路由前缀
// 分支文件使用jsDelivr镜像的开关，0为关闭，默认关闭
const Config = {
	jsdelivr: 0 // 配置是否使用jsDelivr镜像
}

const whiteList = [] // 白名单，路径中包含白名单字符的请求才会通过，例如 ['/username/']

/** @type {ResponseInit} */
const PREFLIGHT_INIT = {
	status: 204, // 响应状态码
	headers: new Headers({
		'access-control-allow-origin': '*', // 允许所有来源
		'access-control-allow-methods': 'GET,POST,PUT,PATCH,TRACE,DELETE,HEAD,OPTIONS', // 允许的HTTP方法
		'access-control-max-age': '1728000', // 预检请求的缓存时间
	}),
}

const exp1 = /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/(?:releases|archive)\/.*$/i // 匹配GitHub的releases或archive路径
const exp2 = /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/(?:blob|raw)\/.*$/i // 匹配GitHub的blob或raw路径
const exp3 = /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/(?:info|git-).*$/i // 匹配GitHub的info或git-路径
const exp4 = /^(?:https?:\/\/)?raw\.(?:githubusercontent|github)\.com\/.+?\/.+?\/.+?\/.+$/i // 匹配raw.githubusercontent.com的路径
const exp5 = /^(?:https?:\/\/)?gist\.(?:githubusercontent|github)\.com\/.+?\/.+?\/.+$/i // 匹配Gist的路径
const exp6 = /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/tags.*$/i // 匹配GitHub的tags路径

/**
 * 创建响应对象
 * @param {any} body - 响应体
 * @param {number} status - 状态码
 * @param {Object<string, string>} headers - 响应头
 */
function makeRes(body, status = 200, headers = {}) {
	headers['access-control-allow-origin'] = '*' // 设置跨域头
	return new Response(body, { status, headers }) // 返回新的响应
}

/**
 * 创建URL对象
 * @param {string} urlStr - URL字符串
 */
function newUrl(urlStr) {
	try {
		return new URL(urlStr) // 尝试创建URL对象
	} catch (err) {
		return null // 如果失败，返回null
	}
}

/**
 * 检查URL是否匹配白名单中的正则表达式
 * @param {string} u - 待检查的URL
 */
function checkUrl(u) {
	for (let i of [exp1, exp2, exp3, exp4, exp5, exp6]) {
		if (u.search(i) === 0) {
			return true // 如果匹配，返回true
		}
	}
	return false // 如果不匹配，返回false
}

/**
 * 处理HTTP请求
 * @param {Request} req - 请求对象
 * @param {string} pathname - 请求路径
 */
function httpHandler(req, pathname) {
	const reqHdrRaw = req.headers

	// 处理预检请求
	if (req.method === 'OPTIONS' &&
		reqHdrRaw.has('access-control-request-headers')
	) {
		return new Response(null, PREFLIGHT_INIT) // 返回预检响应
	}

	const reqHdrNew = new Headers(reqHdrRaw)

	let urlStr = pathname
	let flag = !Boolean(whiteList.length) // 如果白名单为空，默认允许
	for (let i of whiteList) {
		if (urlStr.includes(i)) {
			flag = true // 如果路径包含白名单中的任意项，允许请求
			break
		}
	}
	if (!flag) {
		return new Response("blocked", { status: 403 }) // 不在白名单中，返回403
	}
	if (urlStr.search(/^https?:\/\//) !== 0) {
		urlStr = 'https://' + urlStr // 确保URL以https开头
	}
	const urlObj = newUrl(urlStr)

	/** @type {RequestInit} */
	const reqInit = {
		method: req.method, // 请求方法
		headers: reqHdrNew, // 请求头
		redirect: 'manual', // 手动处理重定向
		body: req.body // 请求体
	}
	return proxy(urlObj, reqInit) // 代理请求
}

/**
 *
 * @param {URL} urlObj - 目标URL对象
 * @param {RequestInit} reqInit - 请求初始化对象
 */
async function proxy(urlObj, reqInit) {
	const res = await fetch(urlObj.href, reqInit) // 发送请求并获取响应
	const resHdrOld = res.headers
	const resHdrNew = new Headers(resHdrOld)

	const status = res.status

	if (resHdrNew.has('location')) { // 如果响应包含重定向
		let _location = resHdrNew.get('location')
		if (checkUrl(_location))
			resHdrNew.set('location', PREFIX + _location) // 修改重定向URL
		else {
			reqInit.redirect = 'follow' // 允许自动跟随重定向
			return proxy(newUrl(_location), reqInit) // 递归处理新的重定向
		}
	}
	resHdrNew.set('access-control-expose-headers', '*') // 设置跨域暴露头
	resHdrNew.set('access-control-allow-origin', '*') // 允许所有来源

	resHdrNew.delete('content-security-policy') // 删除安全策略头
	resHdrNew.delete('content-security-policy-report-only') // 删除报告模式的安全策略头
	resHdrNew.delete('clear-site-data') // 删除清除站点数据的头

	return new Response(res.body, {
		status,
		headers: resHdrNew,
	}) // 返回新的响应
}

/**
 * 主要的请求处理函数
 * @param {Request} request - 原始请求对象
 */
export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url)
		const urlStr = request.url
		const urlObj = new URL(urlStr)

		if (env.UA) 屏蔽爬虫UA = 屏蔽爬虫UA.concat(await ADD(env.UA));
		const userAgentHeader = request.headers.get('User-Agent');
		const userAgent = userAgentHeader ? userAgentHeader.toLowerCase() : "null";
		if (屏蔽爬虫UA.some(fxxk => userAgent.includes(fxxk)) && 屏蔽爬虫UA.length > 0) {
			// 首页改成一个nginx伪装页
			return new Response(await nginx(), {
				headers: {
					'Content-Type': 'text/html; charset=UTF-8',
				},
			});
		} 
		let path = urlObj.searchParams.get('q')
		if (path) {
			return Response.redirect('https://' + urlObj.host + PREFIX + path, 301) // 重定向到带前缀的路径
		} else if (url.pathname.toLowerCase() == '/favicon.ico') {
			const 浅色图标 = 'https://github.githubassets.com/favicons/favicon.png';
			const 深色图标 = 'https://github.githubassets.com/favicons/favicon-dark.png';

			// 检测浏览器主题模式
			const 主题模式 = request.headers.get('sec-ch-prefers-color-scheme');
			const 使用浅色图标 = 主题模式 === 'light';  // 反转判断逻辑

			// 返回对应主题的图标，默认深色
			return fetch(使用浅色图标 ? 浅色图标 : 深色图标);
		}
		// cfworker 会把路径中的 `//` 合并成 `/`
		path = urlObj.href.substr(urlObj.origin.length + PREFIX.length).replace(/^https?:\/+/, 'https://')
		if (path.search(exp1) === 0 || path.search(exp5) === 0 || path.search(exp6) === 0 || path.search(exp3) === 0 || path.search(exp4) === 0) {
			return httpHandler(request, path) // 处理符合正则的请求
		} else if (path.search(exp2) === 0) {
			if (Config.jsdelivr) {
				const newUrl = path.replace('/blob/', '@').replace(/^(?:https?:\/\/)?github\.com/, 'https://cdn.jsdelivr.net/gh') // 使用jsDelivr镜像
				return Response.redirect(newUrl, 302) // 重定向到jsDelivr
			} else {
				path = path.replace('/blob/', '/raw/') // 修改路径为raw
				return httpHandler(request, path) // 处理修改后的请求
			}
		} else if (path.search(exp4) === 0) {
			const newUrl = path.replace(/(?<=com\/.+?\/.+?)\/(.+?\/)/, '@$1').replace(/^(?:https?:\/\/)?raw\.(?:githubusercontent|github)\.com/, 'https://cdn.jsdelivr.net/gh') // 修改为jsDelivr镜像URL
			return Response.redirect(newUrl, 302) // 重定向到新的URL
		} else {
			return new Response(await githubInterface(), {
				headers: {
					'Content-Type': 'text/html; charset=UTF-8',
				},
			});
		}
	}
}

async function githubInterface() {
	const html = `
	<!DOCTYPE html>
	<html lang="zh-CN">
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>GitHub 文件加速</title>
		<style>
			:root {
				--ph-orange: #ff9000;
				--ph-black: #0a0a0a;
				--ph-dark-gray: #1b1b1b;
				--ph-light-gray: #cccccc;
			}
			body {
				font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;
				margin: 0;
				padding: 0;
				background: var(--ph-black);
				color: #ffffff;
				display: flex;
				flex-direction: column;
				align-items: center;
				min-height: 100vh;
				padding-top: 30px;
			}
			.logo {
				width: 100px;
				height: 100px;
				margin-bottom: 20px;
				fill: var(--ph-orange);
			}
			.container {
				width: 90%;
				max-width: 960px;
				text-align: center;
			}
			.title-wrapper {
				display: inline-block;
				background: var(--ph-black);
				padding: 5px 10px;
				margin: 20px 0;
			}
			.title-text {
				font-size: 42px;
				font-weight: bold;
				margin: 0;
				display: inline-block;
			}
			.title-text span:first-child {
				color: #ffffff;
				background: var(--ph-black);
				padding: 0 5px;
			}
			.title-text span:last-child {
				color: var(--ph-black);
				background: var(--ph-orange);
				padding: 0 5px;
			}
			.search-container {
				position: relative;
				margin: 25px 0;
				background: #ffffff;
				border-radius: 25px;
				padding: 5px;
			}
			.search-input {
				width: 100%;
				padding: 15px 120px 15px 25px;
				font-size: 18px;
				border: none;
				border-radius: 25px;
				background: #ffffff;
				color: #000000;
				box-sizing: border-box;
			}
			.search-input:focus {
				outline: none;
			}
			.search-button {
				position: absolute;
				right: 5px;
				top: 50%;
				transform: translateY(-50%);
				padding: 12px 30px;
				background: var(--ph-orange);
				border: none;
				border-radius: 20px;
				color: var(--ph-black);
				font-weight: bold;
				font-size: 16px;
				cursor: pointer;
				transition: background 0.3s;
			}
			.search-button:hover {
				background: #ff7700;
			}
			.info {
				margin: 20px 0;
				color: var(--ph-light-gray);
				font-size: 16px;
				line-height: 1.6;
				background: var(--ph-dark-gray);
				padding: 20px;
				border-radius: 8px;
			}
			.warning {
				color: var(--ph-orange);
				font-weight: bold;
			}
			.examples {
				text-align: left;
				background: var(--ph-dark-gray);
				padding: 25px;
				border-radius: 8px;
				margin-top: 20px;
				border: 1px solid #2a2a2a;
			}
			.examples h3 {
				color: var(--ph-orange);
				margin-top: 0;
				font-size: 20px;
				margin-bottom: 15px;
			}
			.examples code {
				display: block;
				margin: 12px 0;
				color: var(--ph-light-gray);
				word-break: break-all;
				font-family: monospace;
				font-size: 14px;
				padding: 8px;
				background: var(--ph-black);
				border-radius: 4px;
			}
		</style>
	</head>
	<body>
		<div class="container">
			<svg class="logo" viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg">
				<path fill-rule="evenodd" clip-rule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"/>
			</svg>
			<div class="title-wrapper">
				<h1 class="title-text">
					<span>GitHub</span>
					<span>文件加速</span>
				</h1>
			</div>
			<div class="search-container">
				<input type="text" class="search-input" id="input" placeholder="请输入 GitHub 文件链接" 
					onkeydown="if(event.keyCode==13) document.querySelector('.search-button').click()">
				<button class="search-button" onclick="window.location.href=window.location.pathname+(input.value?'?q='+encodeURIComponent(input.value):'')">GO</button>
			</div>
			<div class="info">
				<p>✨ 支持带协议头(https://)或不带的GitHub链接，更多用法见文档说明</p>
				<p>🚀 release、archive使用cf加速，文件会跳转至JsDelivr</p>
				<p class="warning">⚠️ 注意：暂不支持文件夹下载</p>
			</div>
			<div class="examples">
				<h3>📝 合法输入示例：</h3>
				<code>分支源码：https://github.com/hunshcn/project/archive/master.zip</code>
				<code>release源码：https://github.com/hunshcn/project/archive/v0.1.0.tar.gz</code>
				<code>release文件：https://github.com/hunshcn/project/releases/download/v0.1.0/example.zip</code>
				<code>commit文件：https://github.com/hunshcn/project/blob/123/filename</code>
				<code>gist：https://gist.githubusercontent.com/cielpy/123/raw/cmd.py</code>
			</div>
		</div>
		<script>
			const input = document.getElementById('input')
			if(location.search) {
				input.value = decodeURIComponent(location.search.substr(3))
			}
		</script>
	</body>
	</html>
	`;
	return html;
}

async function ADD(envadd) {
	var addtext = envadd.replace(/[	 |"'\r\n]+/g, ',').replace(/,+/g, ',');	// 将空格、双引号、单引号和换行符替换为逗号
	if (addtext.charAt(0) == ',') addtext = addtext.slice(1);
	if (addtext.charAt(addtext.length - 1) == ',') addtext = addtext.slice(0, addtext.length - 1);
	const add = addtext.split(',');
	return add;
}

async function nginx() {
	const text = `
	<!DOCTYPE html>
	<html>
	<head>
	<title>Welcome to nginx!</title>
	<style>
		body {
			width: 35em;
			margin: 0 auto;
			font-family: Tahoma, Verdana, Arial, sans-serif;
		}
	</style>
	</head>
	<body>
	<h1>Welcome to nginx!</h1>
	<p>If you see this page, the nginx web server is successfully installed and
	working. Further configuration is required.</p>
	
	<p>For online documentation and support please refer to
	<a href="http://nginx.org/">nginx.org</a>.<br/>
	Commercial support is available at
	<a href="http://nginx.com/">nginx.com</a>.</p>
	
	<p><em>Thank you for using nginx.</em></p>
	</body>
	</html>
	`
	return text;
}