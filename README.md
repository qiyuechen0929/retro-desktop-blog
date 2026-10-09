# 陈启粤的博客 · retro-desktop

> 一个复古桌面风（Win98 那种）的 Hexo 博客：主题是手写的，评论/订阅/后台也是自己写的，**零外部 CDN、零前端框架**。
> 线上演示：<https://060929.xyz> · 个人网站（同一套审美，3D 书房）：<https://chenqiyue.ccwu.cc>

[![Hexo](https://img.shields.io/badge/Hexo-7.x-0e83cd?logo=hexo)](https://hexo.io)
[![Node](https://img.shields.io/badge/Node-%E2%89%A522.5-3c873a?logo=nodedotjs)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-4c9a2a.svg)](LICENSE)
[![后端依赖](https://img.shields.io/badge/%E5%90%8E%E7%AB%AF-0%20%E4%BE%9D%E8%B5%96-8957e5.svg)](#评论后端comments-serverjs)

![首页](docs/screenshots/desktop/home.jpg)

---

## 这是什么

不是"又一个 Hexo 主题"，而是**一整套可以自己跑起来的个人博客**：

- **外观**：复古桌面 —— 浏览器外壳、窗口（可拖、能最小化/关闭/还原）、斜面按钮、一秒一秒跳的时钟；4 套配色一键切换（梦幻粉紫 / 经典桌面 / 暗夜终端 / 海盐蓝），选择记在本地。
- **文章阅读**：自动目录（滚动高亮）、顶部阅读进度条、字数与预计阅读时间、代码块一键复制、图片点开看大图、同标签相关推荐、上一篇/下一篇。
- **评论系统**：不挂 Giscus/Disqus，**自己写的**——盖楼回复、点赞、IP 属地（已脱敏）、博主徽章、管理员就地删除/编辑；前端是像素 identicon 头像。
- **邮件订阅**：订阅/退订双向、SMTP 发信、发新文章自动群发通知。
- **友链**：访客在线申请 → 后台审核通过 → 自动上墙。
- **管理后台** `/admin/`：浏览器里写文章（markdown + 实时预览 + 标签建议 + 图片粘贴上传），保存后**自动 `hexo generate`**，线上立刻更新；文章/评论/友链/订阅者一站管理。
- **实时访客**：首页胶囊显示「你是第 N 位访客 · 今天 M 人 · 现在 K 人在线」，页脚也有；在线数基于 60 秒心跳，是真数字。
- **技术口味**：主题纯手写 CSS/EJS + 原生 JS；后端只用 Node 标准库（`node:http` + `node:sqlite`），**0 依赖**（除了发邮件可选的 nodemailer）；字体/图标/脚本全部本地化，没有外部 CDN。

**动起来看看**（点开是 GIF）：



---

## 截图

**桌面端**

| 首页 | 文章页（目录 + 进度） | 评论区 |
| --- | --- | --- |
| ![首页](docs/screenshots/desktop/home.jpg) | ![文章](docs/screenshots/desktop/post-top.jpg) | ![评论](docs/screenshots/desktop/post-comments.jpg) |

| 归档 | 展示册 | 友链 |
| --- | --- | --- |
| ![归档](docs/screenshots/desktop/archives.jpg) | ![展示册](docs/screenshots/desktop/showcase.jpg) | ![友链](docs/screenshots/desktop/friends.jpg) |

| 关于我 | RSS 订阅引导 | 站内搜索 |
| --- | --- | --- |
| ![关于](docs/screenshots/desktop/me.jpg) | ![RSS](docs/screenshots/desktop/rss.jpg) | ![搜索](docs/screenshots/desktop/search.jpg) |



**管理后台**（`/admin/`，手机也能用）

| 概览 | 文章与评论 | 就地管评论 |
| --- | --- | --- |
| ![后台概览](docs/screenshots/desktop/admin-overview.jpg) | ![文章与评论](docs/screenshots/desktop/admin-posts.jpg) | ![就地管理](docs/screenshots/desktop/comments-admin-mode.jpg) |

| markdown 编辑器 | 友链审核 | 登录 |
| --- | --- | --- |
| ![编辑器](docs/screenshots/desktop/admin-editor.jpg) | ![友链](docs/screenshots/desktop/admin-friends.jpg) | ![登录](docs/screenshots/desktop/admin-login.jpg) |

**移动端**（同一套主题，导航变横向滑动、窗口不可拖、后台可用）

| 首页 | 文章 | 评论 | 归档 |
| --- | --- | --- | --- |
| ![m-home](docs/screenshots/mobile/home.jpg) | ![m-post](docs/screenshots/mobile/post-top.jpg) | ![m-comments](docs/screenshots/mobile/post-comments.jpg) | ![m-archives](docs/screenshots/mobile/archives.jpg) |

| 展示册 | 友链 | 关于我 | RSS |
| --- | --- | --- | --- |
| ![m-showcase](docs/screenshots/mobile/showcase.jpg) | ![m-friends](docs/screenshots/mobile/friends.jpg) | ![m-me](docs/screenshots/mobile/me.jpg) | ![m-rss](docs/screenshots/mobile/rss.jpg) |

| 搜索 | 后台概览 | 后台文章 |
| --- | --- | --- |
| ![m-search](docs/screenshots/mobile/search.jpg) | ![m-admin](docs/screenshots/mobile/admin-overview.jpg) | ![m-admin-posts](docs/screenshots/mobile/admin-posts.jpg) |

**整页长图**：[首页（桌面）](docs/screenshots/desktop/home-full.jpg) · [文章页（桌面）](docs/screenshots/desktop/post-full.jpg) · [长文章](docs/screenshots/desktop/post-long.jpg) · [后台就地管评论](docs/screenshots/desktop/admin-comments-inline.jpg) · [首页（移动端）](docs/screenshots/mobile/home-full.jpg)

---

## 三分钟跑起来

```bash
git clone https://github.com/qiyuechen0929/retro-desktop-blog.git my-blog
cd my-blog
npm install                 # 只装 Hexo 和渲染插件

# 1) 本地预览（静态站，端口 4000）
npx hexo server -p 4000

# 2) 想要评论/订阅/后台，再起后端（端口 8765，需 Node ≥ 22.5）
cd server && npm install    # 只为发邮件装 nodemailer，不装也能跑
node --experimental-sqlite comments-server.js
```

Windows 用户可以直接双击根目录的 **`start-blog.cmd`**，它会同时开好后端和站点。

> 第一次启动后端会自动生成 `server/config.json`（里面有管理密钥，**已在 .gitignore 里，别提交**）。
> 管理密钥也在控制台打印出来了，进 `/admin/` 用它登录。

---

## 套版：把它变成你自己的博客

### 方式一：一条命令（推荐）

```bash
node tools/init-site.mjs
```

它会问你站点名 / 昵称 / 域名 / 一句话简介，然后自动改好：

| 文件 | 改什么 |
| --- | --- |
| `_config.yml` | 站点标题、副标题、描述、关键词、作者、`url`、语言、时区 |
| `themes/retro-desktop/_config.yml` | 昵称、座右铭、头像路径、个人标签、评论接口地址 |
| `server/config.json` | 站点名、站长昵称、`publicApiBase`、CORS 白名单，并**重新生成一份随机管理密钥** |
| `deploy/nginx.conf` | 你的域名、静态目录、证书路径、后端端口 |
| `deploy/blog-api.service` | systemd 服务里的路径与 Node 参数 |

非交互（脚本里跑）：

```bash
node tools/init-site.mjs --yes \
  --title "我的博客" --author "你的名字" --nickname "你的昵称" \
  --motto "一句座右铭" --url "https://blog.example.com" --desc "站点简介"
```

改完之后：`npx hexo clean && npx hexo generate`。

### 方式二：手动改（知道每样东西在哪）

| 想改的东西 | 文件 | 位置 |
| --- | --- | --- |
| 站点名 / 描述 / 域名 / 作者 | `_config.yml` | 顶部 `## Site` 与 `## URL` |
| 昵称 / 座右铭 / 头像 / 标签 | `themes/retro-desktop/_config.yml` | `nickname`、`motto`、`avatar`、`profile_tags` |
| 顶部导航 | `themes/retro-desktop/_config.yml` | `nav:`（`source/` 下要有对应的页面目录） |
| 首页/侧栏文案 | `themes/retro-desktop/layout/index.ejs` | 欢迎区直接写在那儿 |
| 展示册（作品/收藏） | `themes/retro-desktop/_config.yml` | `showcase:` 列表 |
| 友链 | `themes/retro-desktop/_config.yml` | `friends:` 列表（也可以让访客在线申请） |
| 关于我 | `source/me/index.md` | 纯 markdown |
| 页脚 / 社交链接 | `themes/retro-desktop/layout/layout.ejs` | `footer-*` |
| 配色 | `themes/retro-desktop/source/css/desktop.css` | 搜 `:root[data-theme=`，每个主题一组 CSS 变量 |
| 头像 | `themes/retro-desktop/source/images/avatar.svg` | 换成你自己的图（改 `avatar:` 路径即可） |
| 站点图标 | `themes/retro-desktop/source/icon.svg` | 同上 |
| 文章 | `source/_posts/*.md` | 删掉示例文章，`npx hexo new "标题"` 写新的 |

### 关于内容

仓库里带的 4 篇文章、展示册、关于我都是作者本人的内容，**请删掉或换成你自己的**（尤其别直接把作者的经历当成你的）。

---

## 目录结构

```
.
├── _config.yml                  # Hexo 主配置（站点信息、域名、插件）
├── source/                      # 你的内容
│   ├── _posts/                  #   文章（markdown）
│   ├── admin/  friends/  me/    #   后台 / 友链 / 关于我 页面
│   ├── rss/  showcase/          #   RSS 引导页 / 展示册
├── themes/retro-desktop/        # 主题（自研，全部在这里）
│   ├── layout/                  #   EJS 模板
│   ├── scripts/api-base.js      #   把评论接口地址统一成「站点根地址」
│   └── source/{css,js,images}/  #   样式、前端脚本、头像图标
├── server/                      # 评论/订阅/友链/文章管理 后端（0 依赖）
│   ├── comments-server.js       #   全部逻辑都在这一个文件
│   └── README.md                #   接口清单
├── scripts/email-notify.js      # Hexo 钩子：发新文章自动邮件通知订阅者
├── deploy/                      # Nginx / systemd / pm2 / 一键上传脚本
├── tools/                       # init-site.mjs（套版）+ shots.js（截图）
└── docs/                        # 截图、演示视频、部署与接口文档
```

---

## 主题配置项（`themes/retro-desktop/_config.yml`）

```yaml
nickname: 你的昵称
motto: 一句座右铭            # 首页会打字机式逐字显示
avatar: /images/avatar.svg
profile_tags: [折腾, 编程, 生活随笔]

nav:                        # 顶部导航（首页固定在最前）
  - name: 归档
    url: /archives
  - name: 展示册
    url: /showcase

comments:
  enable: true
  api: https://你的域名       # 评论服务的「站点根地址」，不要带 /api；本地开发填 http://127.0.0.1:8765

showcase: [...]             # 展示册卡片（标题/简介/链接/标签/语言/星数）
friends: [...]              # 友链（留空 [] 则显示「虚位以待」）
```

> `comments.api` 填站点根地址就行，主题会自动去掉结尾的 `/api`（见 `themes/retro-desktop/scripts/api-base.js`），前端自己拼 `/api/comments`、`/api/view`、`/api/stats/live`。

---

## 评论后端（`server/comments-server.js`）

只用 Node 标准库：`node:http` + `node:sqlite` + `node:crypto`（发邮件才需要 `nodemailer`）。
默认只监听 `127.0.0.1:8765`，公网访问一律走 Nginx 反代 `/api/`。

```bash
node --experimental-sqlite server/comments-server.js     # Node 22.5 ~ 23.3 要带这个参数；≥23.4 可省
```

配置全在 `server/config.json`（首次启动自动生成；含 adminToken，**不要提交**）：

| 字段 | 说明 |
| --- | --- |
| `port` / `host` | 默认 `8765` / `127.0.0.1`（只给反代用，不要对公网开放） |
| `adminToken` | 管理密钥，登录 `/admin/` 用；连错 10 次锁 10 分钟 |
| `publicApiBase` | 邮件里退订链接用的站点根地址（如 `https://blog.example.com`） |
| `blogRoot` | Hexo 站点根目录（后台写文章要 `hexo generate`；留空=server 的上一级） |
| `corsOrigins` | 跨域白名单；留空数组 `[]` = 允许所有来源 |
| `rateLimitSeconds` / `subscribeLimitSeconds` / `viewCooldownSeconds` | 评论 / 订阅 / 阅读计数的限流 |
| `smtp` | 可选。配了才发信（订阅成功、回复通知、新文章群发） |

接口清单见 [`server/README.md`](server/README.md)，对外的几个：

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/api/comments?page=` · `POST /api/comments` | 读/发评论（盖楼、点赞、编辑） |
| `GET`/`POST` | `/api/friends` | 友链申请与展示（审核需管理员） |
| `GET`/`POST` | `/api/subscribe` · `GET /api/unsubscribe` | 邮件订阅与退订 |
| `GET` | `/api/stats/live?sid=` | 实时访客：在线 / 累计 / 今日（前端每 25 秒心跳） |
| `GET` | `/api/stats/public` | 页脚的总阅读与评论数 |
| `POST`/`GET` | `/api/view` · `/api/comments/like` | 阅读上报、点赞 |
| 管理 | `/api/posts` · `/api/subscribers` · `/api/upload` · `/api/notify` | 文章 CRUD、订阅者、传图、群发（需 `X-Admin-Token`） |

---

## 部署到自己的服务器

完整版见 [`docs/DEPLOY.md`](docs/DEPLOY.md)。最省事的一条路（域名 + HTTPS + 反代）：

```bash
# 1) 上传：静态产物 + 后端 + 源文件（源文件是为了让后台能改文章）
scp -r public/*            server:/www/blog/public/
scp -r server/*            server:/www/blog/server/     # 记得单独传 config.json（含密钥）
scp -r themes source scripts _config.yml package.json server:/www/blog/

# 2) 服务器上：装依赖 + 常驻
cd /www/blog/server && npm i --omit=dev
pm2 start comments-server.js --name blog-api --node-args="--experimental-sqlite"
pm2 save && pm2 startup

# 3) Nginx：用 deploy/nginx.conf（改好域名和路径）→ /etc/nginx/sites-available/
nginx -t && nginx -s reload

# 4) 证书（DNS 校验，不用开 80 端口）
acme.sh --issue --dns dns_cf -d blog.example.com --keylength ec-256
```

以后更新只要 `deploy/deploy.sh`（Linux/macOS）或 `deploy/deploy.cmd`（Windows，走 ssh/scp）。

**两个国内部署的坑**（作者踩过）：

1. 国内服务器 + 未备案域名，**80 端口会被运营商拦**（返回 ICP 拦截页），非标端口不受影响；要么备案，要么上 Cloudflare Tunnel 代理。
2. HTTPS 用 **DNS-01** 签发（Cloudflare Token 很好用），否则证书续期依赖 80 端口。

---

## 运维

| 事情 | 命令 |
| --- | --- |
| 服务状态 / 日志 | `pm2 list` · `pm2 logs blog-api` |
| 重启后端 | `pm2 restart blog-api` |
| 只改文章 | `npx hexo clean && npx hexo generate && 上传 public/` |
| 后台改文章 | 直接进 `/admin/`，保存后自动重建 |
| 备份 | `server/comments.db`（评论/订阅/访客）+ `public/` |
| 证书续期 | acme.sh 自带 cron（DNS-01），续期后 `nginx -s reload` |

---

## FAQ

**Q：能不能不要后端，只做静态博客？**
可以。把主题配置里 `comments.enable` 设为 `false`，或者只部署 `public/`。评论/订阅/实时访客/后台会自动隐藏，其它页面照常。

**Q：评论发不出去 / 控制台 404 或 CORS 报错？**
99% 是 `comments.api` 填错了。它要填**站点根地址**（`https://blog.example.com`），不要带 `/api`；本地预览时填 `http://127.0.0.1:8765` 并把它加进 `corsOrigins`。

**Q：后台保存文章报「找不到 source/_posts」？**
服务器上没传源文件。要么把 `source/ themes/ scripts/ _config.yml package.json` 一起传上去并在 `server/config.json` 里把 `blogRoot` 指向站点根目录，要么只用本地 `hexo generate` 上传 `public/`。

**Q：QQ 邮箱发信失败？**
`server/config.json` 里 `smtp.pass` 要填 **SMTP 授权码**（不是登录密码），端口 465/SSL；服务器出网要放行 465。

**Q：手机上不想让那些窗口能拖？**
已经处理好了：触摸设备 / 窄屏一律禁止拖拽（`themes/retro-desktop/source/js/main.js` 里的 `canDragWindows()`）；桌面鼠标仍可拖、双击标题栏复位。想全禁掉就把那个函数改成 `return false`。

**Q：想换成别的评论系统（Giscus/Valine）？**
主题的 `themes/retro-desktop/layout/partial/comments.ejs` 就是评论区的入口，换掉它即可；后端完全不装也没关系。

**Q：文章里的表情、数学公式？**
渲染器是 `hexo-renderer-marked`。要公式装 `hexo-renderer-kramed`；要更花哨的 markdown 可以换 `hexo-renderer-markdown-it`。

---

## 开发

```bash
npx hexo server -p 4000        # 改模板/CSS/JS 实时看效果（改主题配置或 _config.yml 要重启）
node tools/shots.js            # 一键生成 README 用的桌面/移动端截图（需要 playwright-core）
```

- 主题前端只有 6 个原生 JS 文件（`main.js` 窗口系统与特效、`enhance.js` 阅读增强、`comments.js` 评论、`admin.js` + `admin-editor.js` 后台、`visitors.js` 实时访客、`sfx.js` 8-bit 音效）。
- 后端是一个 1k 行左右的单文件（`server/comments-server.js`），没有构建步骤。

## 致谢

- [Hexo](https://hexo.io) —— 静态站生成器
- 视觉参考了小雨的博客那类 Win98 复古桌面风，实现是从零手写的
- 配色命名（梦幻粉紫 / 经典桌面 / 暗夜终端 / 海盐蓝）来自作者自己折腾的四套皮肤

## License

[MIT](LICENSE) © 2026 Chen Qiyue（陈启粤）
