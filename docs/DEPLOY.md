# 部署指南

从「本机能跑」到「公网能访问」，这份文档按顺序列一遍。只有静态站也能上线（评论/订阅/后台/实时访客会自动隐藏）。

## 0. 你需要准备

| 东西 | 要求 |
| --- | --- |
| 服务器 | 任意 Linux（1 核 1G 就够，后端常驻内存约 30–60MB） |
| Node | **≥ 22.5**（用到 `node:sqlite`；22.5~23.3 启动要加 `--experimental-sqlite`） |
| Nginx | 或者 Caddy（配置见文末） |
| 域名 | 想做 HTTPS 就需要；国内服务器 + 80/443 需要 ICP 备案（见第 6 节） |

## 1. 服务器上的目录规划

```
/www/blog/
├── public/        # hexo generate 的产物（Nginx 的 root）
├── server/        # 评论服务：comments-server.js + config.json + node_modules
├── source/        # 文章源文件（想让后台能写文章就必须传）
├── themes/  scripts/  _config.yml  package.json  node_modules/   # 同上，后台重建要用
└── certs/         # HTTPS 证书
```

> 只想要静态站？只传 `public/` 就够了。

## 2. 上传

```bash
# 本机
npx hexo clean && npx hexo generate
scp -r public/*            server:/www/blog/public/
scp -r server/*            server:/www/blog/server/      # 注意别把本地 config.json 的密钥泄出去之前先想清楚
scp -r themes source scripts _config.yml package.json server:/www/blog/
```

服务器上：

```bash
cd /www/blog/server
npm i --omit=dev            # 只为 nodemailer；不装也能跑（邮件功能自动关闭）
```

`server/config.json` 里线上要改的两处：`publicApiBase` = 你的站点地址；`blogRoot` = `/www/blog`（不传源文件就别设，后台会给出「找不到 source/_posts」的提示）。

## 3. 让后端常驻

**pm2（最简单）**

```bash
cd /www/blog
pm2 start deploy/ecosystem.config.js      # 或：pm2 start server/comments-server.js --name blog-api --node-args="--experimental-sqlite"
pm2 save && pm2 startup                   # 开机自启
curl -s http://127.0.0.1:8765/api/health  # 期望 {"ok":true,...}
```

**systemd**

```bash
cp deploy/blog-api.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now blog-api
journalctl -u blog-api -f
```

> 后端**只监听 127.0.0.1**，不要对公网开放（公网访问一律经 Nginx 的 `/api/`）。

## 4. Nginx

```bash
cp deploy/nginx.conf /etc/nginx/sites-available/blog.conf
ln -s /etc/nginx/sites-available/blog.conf /etc/nginx/sites-enabled/
nginx -t && nginx -s reload
```

配置里已经写好：`/api/` 反代到 `127.0.0.1:8765`、静态缓存策略、安全头（HSTS 等）、`client_max_body_size 16m`（后台上传图片要用）。

两个容易踩的点：

1. **`add_header` 不继承**：location 里写了 `add_header`，server 级的那几个就失效了。模板里每个 location 都重写了一遍，你新增 location 时注意。
2. **老版本 Nginx 不认 `http2 on;`**：1.25.1 之前要写 `listen 443 ssl http2;`。

## 5. HTTPS

**方案 A：Cloudflare 域名 + DNS-01（推荐，不用开 80 端口）**

```bash
curl https://get.acme.sh | sh
export CF_Token=<Cloudflare Token，权限 Zone.DNS:Edit>
export CF_Zone_ID=<Zone ID>
~/.acme.sh/acme.sh --issue --dns dns_cf -d blog.example.com --keylength ec-256
~/.acme.sh/acme.sh --install-cert -d blog.example.com --ecc \
  --key-file /www/blog/certs/privkey.pem \
  --fullchain-file /www/blog/certs/fullchain.pem \
  --reloadcmd "nginx -s reload"
```

**方案 B：certbot + HTTP-01**（需要 80 端口可达、域名已解析）

```bash
certbot --nginx -d blog.example.com
```

**方案 C：宝塔/1Panel 面板**：网站 → SSL → Let's Encrypt，点一下就行。

## 6. 国内服务器特别注意（作者踩过）

- **未备案域名走 80/443 会被拦**：运营商可能在 80 端口返回 ICP 提示页，443 也可能被重置。
  三条出路：① 老老实实 ICP 备案；② 换香港/海外节点；③ **上 Cloudflare Tunnel**（cloudflared 主动出网连 Cloudflare，完全不碰 80/443，也不需要备案）：
  ```bash
  # 装 cloudflared 后
  cloudflared tunnel login
  cloudflared tunnel create blog
  cloudflared tunnel route dns blog blog.example.com     # 自动加 DNS
  cloudflared tunnel run --url http://127.0.0.1:80 blog   # 指向本机 Nginx
  ```
- 非标端口（如 `https://blog.example.com:8443`）不触发备案拦截，代价是 URL 带端口。

## 7. 以后更新

| 改了什么 | 怎么做 |
| --- | --- |
| 文章 / 样式 / 主题 | `./deploy/deploy.sh`（Windows：`deploy\deploy.cmd`）——本地构建 → 上传 `public/` + 源文件 → 重启后端 |
| 只在后台改文章 | 直接进 `/admin/`，保存即自动 `hexo generate`（服务器上装了依赖才行） |
| `server/config.json` | 改完 `pm2 restart blog-api` |
| 后端代码 | 重新上传 `server/comments-server.js` 并重启 |

## 8. 备份

- `server/comments.db` —— 评论、友链、订阅者、访客统计**全在这一个文件**里
- `server/config.json` —— 密钥与配置（别丢）
- `source/` —— 文章源文件
- `public/` 可以随时重建，不用备份

```bash
# 每天 3 点打包一次（crontab -e）
0 3 * * * tar -czf /backup/blog-$(date +\%F).tgz -C /www/blog server/comments.db server/config.json source
```

## 9. 排错

| 现象 | 原因 / 解决 |
| --- | --- |
| 页面能开，评论一直是空的、控制台 `/api/api/...` 404 | 主题配置 `comments.api` 填多了 `/api`，只填站点根地址 |
| 评论 CORS 报错 | `server/config.json` 的 `corsOrigins` 加上你的域名；留空数组 `[]` = 允许所有 |
| `/api/health` 502 | 后端没起来 / 端口不对：`pm2 logs blog-api`、`ss -ltnp \| grep 8765` |
| 后台上传图片 413 | Nginx 的 `client_max_body_size` 太小（模板给了 16m） |
| 后台保存文章后线上没变 | 服务器上没有 hexo 依赖，或 `blogRoot` 没指对；看 `pm2 logs blog-api` 里的提示 |
| 手机上看不到最新样式 | `js/css` 缓存；模板里设成了 1 小时，改完等一会儿或给资源加版本号 |
| 邮件发不出去 | SMTP 授权码错 / 465 端口没放行 / `nodemailer` 没装 |
| 窗口在手机上会被拖走 | 已修：`main.js` 的 `canDragWindows()` 在触摸设备/窄屏禁用拖拽 |

## Caddy 等价配置（更省心）

```caddyfile
blog.example.com {
  root * /www/blog/public
  handle /api/* {
    reverse_proxy 127.0.0.1:8765
  }
  file_server
  encode gzip
  header Strict-Transport-Security "max-age=15552000"
}
```
