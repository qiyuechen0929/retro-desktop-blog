# 博客后端服务（评论 / 友链 / 订阅 / 文章管理 / 阅读统计）

零依赖 HTTP 服务：只用 Node 内置模块（`node:http` / `node:sqlite` / `node:crypto`）。
发邮件是**可选**的——配了 `smtp` 才需要 `npm i`（nodemailer），不配也照常跑，只是不发信。

- 运行环境：Node ≥ 22.5（`node:sqlite`）。22.5 ~ 23.3 启动要加 `--experimental-sqlite`；23.4 之后可以不加。
- 默认只监听 `127.0.0.1:8765`，公网访问一律经 Nginx 反代 `/api/`，**不要把 8765 暴露出去**。

## 启动

```bash
node --experimental-sqlite server/comments-server.js
# 默认 http://127.0.0.1:8765
```

Windows 上直接双击项目根目录的 `start-blog.cmd`（同时起后端 + 站点预览）。
线上用 pm2 或 systemd 常驻，见根目录 `部署到服务器.md`。

## 配置

全部在 `server/config.json`（已在 .gitignore 里，不会进 Git；**别提交、别贴群**）：

| 字段 | 说明 |
| --- | --- |
| `port` | 监听端口，默认 8765 |
| `host` | 监听地址，默认 `127.0.0.1`（只给本机/反代用）。设成 `0.0.0.0` 才会对外 |
| `adminToken` | 管理密钥（登录 `/admin/` 用；建议 24 位以上随机串） |
| `siteName` / `adminNickname` | 站点名 / 站长昵称（昵称被保护，访客不能冒用） |
| `publicApiBase` | 邮件里退订链接用的**站点根地址**，不含 `/api`，如 `https://060929.xyz` |
| `blogRoot` | Hexo 站点根目录（含 `source/`、`node_modules/`）。留空 = server 的上一级。线上若只上传了 `public/ + server/`，后台的文章编辑会用不了 |
| `corsOrigins` | 浏览器跨域白名单。留空数组 `[]` = 允许所有来源 |
| `rateLimitSeconds` / `friendApplyLimitSeconds` | 评论 / 友链申请的同 IP 间隔 |
| `subscribeLimitSeconds` | 订阅请求的同 IP 间隔（防被拿去发垃圾邮件） |
| `viewCooldownSeconds` | 同一 IP 对同一页面的阅读计数间隔（防刷） |
| `maxNicknameLen` / `maxContentLen` / `maxPageLen` | 长度上限 |
| `smtp` | 可选。配了才发信（订阅欢迎信 / 回复通知 / 新文章群发） |

## 接口一览（管理接口需要请求头 `X-Admin-Token`）

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| GET | `/api/comments` · `/api/comments/all` | 评论（当前页 / 全站，后者需管理员） |
| POST | `/api/comments` | 发评论（限流 + 站长昵称保护） |
| PUT/DELETE | `/api/comments/:id` | 编辑 / 删除（本人 cid 或管理员） |
| POST | `/api/comments/like` · `/api/comments/unlike` | 点赞 / 取消点赞 |
| GET/POST | `/api/friends` · `/api/friends/:id/(approve\|reject)` | 友链申请与审核（审核需管理员） |
| GET/POST | `/api/subscribe` | 邮件订阅（同 IP 限流） |
| GET | `/api/unsubscribe?token=` | 退订（邮件里的链接，返回 HTML） |
| GET | `/api/subscribers` | 订阅者列表（管理员） |
| POST | `/api/notify` | 新文章群发（管理员，通常由 `scripts/email-notify.js` 钩子调） |
| POST | `/api/view` | 阅读量上报（同 IP 同页面有冷却） |
| GET | `/api/stats/live?sid=` | **实时访客**：在线人数 / 累计访客 / 今日访客（前端每 25 秒心跳一次，`sid` 就是访客的唯一标识） |
| GET | `/api/stats/public` · `/api/stats/pages` | 全站公开统计 / 按文章统计（后者需管理员） |
| GET | `/api/posts` · `/api/posts/raw?file=` | 文章列表 / 原文（需管理员） |
| POST/PUT/DELETE | `/api/posts` | 新建 / 保存 / 删除（删除进 `server/trash/`，编辑前自动备份到 `server/backups/`） |
| POST | `/api/upload` | 上传图片（≤10MB，存 `source/images/uploads/`） |

写文章类接口结束后会 spawn 一次 `hexo generate` 重建静态站；服务器上没装 hexo 时会跳过并在日志里说明（不会报错）。

## 访客统计表

- `visitors`：每个访客一行（`sid` 主键）→ 累计访客数、每人来过几次
- `visit_days`：每天的 uv / pv（`pv` 由 `/api/view` 累加）
- `visit_day_sids`：当天出现过哪些访客 → 当日 uv
- **在线人数不落库**：内存里记最后一次心跳（60 秒内算在线），重启服务会清零，这是正常的；累计数都在 SQLite 里，不会丢。
