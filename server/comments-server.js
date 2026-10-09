/* ============================================================
   ChenQiyue 博客 · 自建后端（评论 / 友链审核 / 邮件订阅）
   依赖：node >= 22.5（node:sqlite）；发邮件需 npm i nodemailer 且在
   config.json 里配置 smtp（未配置则只收集订阅、不发信，功能不报错）
   启动：node --experimental-sqlite server/comments-server.js
   ============================================================ */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

/* ---------- 配置 ---------- */
const CONFIG_PATH = path.join(__dirname, 'config.json');
let cfg = {
  port: 8765,
  // 只监听本机，公网访问一律走 Nginx 反代；不要让 8765 直接暴露到公网
  host: '127.0.0.1',
  adminToken: 'change-me-' + crypto.randomBytes(4).toString('hex'),
  adminNickname: 'ChenQiyue',
  siteName: 'ChenQiyue 的博客',
  // 邮件里的退订链接要用这个站点根地址（不含 /api）
  publicApiBase: 'https://060929.xyz',
  // Hexo 站点根目录（含 source/ 和 node_modules/）；留空 = server 目录的上一级
  blogRoot: '',
  // 浏览器跨域白名单；留空数组 [] = 允许所有来源
  corsOrigins: ['https://060929.xyz', 'https://120.24.49.174', 'http://localhost:4000', 'http://127.0.0.1:4000'],
  rateLimitSeconds: 20,
  friendApplyLimitSeconds: 60,
  subscribeLimitSeconds: 60,
  viewCooldownSeconds: 30,
  maxNicknameLen: 20,
  maxContentLen: 500,
  maxPageLen: 200,
  // 发信配置（不配则邮件功能自动关闭）：
  // "smtp": { "host": "smtp.qq.com", "port": 465, "user": "xxx@qq.com", "pass": "授权码", "from": "xxx@qq.com" }
  smtp: null
};
if (fs.existsSync(CONFIG_PATH)) {
  try { cfg = Object.assign(cfg, JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))); }
  catch (e) { console.error('config.json parse failed, using defaults'); }
} else {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
  console.log('已生成 server/config.json，管理密钥：', cfg.adminToken);
}

/* ---------- 邮件（可选） ---------- */
let mailer = null;
function getMailer() {
  if (mailer !== null) return mailer;
  if (!cfg.smtp || !cfg.smtp.host || !cfg.smtp.user) { mailer = false; return mailer; }
  try {
    const nodemailer = require('nodemailer');
    mailer = nodemailer.createTransport({
      host: cfg.smtp.host,
      port: cfg.smtp.port || 465,
      secure: (cfg.smtp.port || 465) === 465,
      auth: { user: cfg.smtp.user, pass: cfg.smtp.pass }
    });
  } catch (e) {
    console.error('nodemailer 未安装或配置错误，邮件功能关闭');
    mailer = false;
  }
  return mailer;
}
async function sendMail(to, subject, text) {
  const m = getMailer();
  if (!m) return false;
  try {
    await m.sendMail({ from: cfg.smtp.from || cfg.smtp.user, to, subject, text });
    return true;
  } catch (e) {
    console.error('发信失败:', e.message);
    return false;
  }
}

/* ---------- 数据库 ---------- */
const db = new DatabaseSync(path.join(__dirname, 'comments.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page TEXT NOT NULL,
    nickname TEXT NOT NULL,
    content TEXT NOT NULL,
    parent_id INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    ip TEXT DEFAULT '',
    is_admin INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
  CREATE INDEX IF NOT EXISTS idx_page ON comments(page);
  CREATE INDEX IF NOT EXISTS idx_parent ON comments(parent_id);
  CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    desc TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    ip TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
  CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    token TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
  CREATE TABLE IF NOT EXISTS pageviews (
    page TEXT PRIMARY KEY,
    views INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
  /* 访客统计：累计独立访客 / 每日访客 / 在线人数（在线是内存态，不落库） */
  CREATE TABLE IF NOT EXISTS visitors (
    sid TEXT PRIMARY KEY,
    first_seen TEXT DEFAULT (datetime('now', 'localtime')),
    last_seen TEXT DEFAULT (datetime('now', 'localtime')),
    hits INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS visit_days (
    day TEXT PRIMARY KEY,
    uv INTEGER DEFAULT 0,
    pv INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS visit_day_sids (
    day TEXT NOT NULL,
    sid TEXT NOT NULL,
    PRIMARY KEY (day, sid)
  );
`);
try { db.exec("ALTER TABLE comments ADD COLUMN region TEXT DEFAULT ''"); } catch (e) {}
try { db.exec("ALTER TABLE comments ADD COLUMN cid TEXT DEFAULT ''"); } catch (e) {}
try { db.exec("ALTER TABLE comments ADD COLUMN email TEXT DEFAULT ''"); } catch (e) {}
try { db.exec("ALTER TABLE comments ADD COLUMN edited_at TEXT DEFAULT ''"); } catch (e) {}

const stmtList = db.prepare('SELECT * FROM comments WHERE page = ? ORDER BY id ASC');
const stmtListAll = db.prepare('SELECT * FROM comments ORDER BY id DESC LIMIT 500');
const stmtInsert = db.prepare(
  'INSERT INTO comments (page, nickname, content, parent_id, ip, is_admin, region, cid, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
const stmtUpdateContent = db.prepare(
  "UPDATE comments SET content = ?, edited_at = datetime('now', 'localtime') WHERE id = ?"
);
const stmtLike = db.prepare('UPDATE comments SET likes = likes + 1 WHERE id = ?');
const stmtUnlike = db.prepare('UPDATE comments SET likes = MAX(likes - 1, 0) WHERE id = ?');
const stmtDelete = db.prepare('DELETE FROM comments WHERE id = ?');
const stmtDeleteChildren = db.prepare('DELETE FROM comments WHERE parent_id = ?');
const stmtRecentByIp = db.prepare('SELECT created_at FROM comments WHERE ip = ? ORDER BY id DESC LIMIT 1');
const stmtGet = db.prepare('SELECT * FROM comments WHERE id = ?');

const stmtFriendsApproved = db.prepare("SELECT * FROM friends WHERE status = 'approved' ORDER BY id ASC");
const stmtFriendsAll = db.prepare('SELECT * FROM friends ORDER BY id DESC');
const stmtFriendInsert = db.prepare('INSERT INTO friends (name, url, desc, ip) VALUES (?, ?, ?, ?)');
const stmtFriendGet = db.prepare('SELECT * FROM friends WHERE id = ?');
const stmtFriendStatus = db.prepare('UPDATE friends SET status = ? WHERE id = ?');
const stmtFriendDelete = db.prepare('DELETE FROM friends WHERE id = ?');
const stmtFriendRecentByIp = db.prepare('SELECT created_at FROM friends WHERE ip = ? ORDER BY id DESC LIMIT 1');

const stmtSubGet = db.prepare('SELECT * FROM subscribers WHERE email = ?');
const stmtSubInsert = db.prepare('INSERT INTO subscribers (email, token) VALUES (?, ?)');
const stmtSubReactivate = db.prepare("UPDATE subscribers SET status = 'active' WHERE email = ?");
const stmtSubByToken = db.prepare('SELECT * FROM subscribers WHERE token = ?');
const stmtSubDeactivate = db.prepare("UPDATE subscribers SET status = 'inactive' WHERE token = ?");
const stmtSubActive = db.prepare("SELECT * FROM subscribers WHERE status = 'active' ORDER BY id ASC");
const stmtSubAll = db.prepare('SELECT * FROM subscribers ORDER BY id DESC');
const stmtSubDelete = db.prepare('DELETE FROM subscribers WHERE id = ?');

const stmtViewHit = db.prepare(`
  INSERT INTO pageviews (page, views) VALUES (?, 1)
  ON CONFLICT(page) DO UPDATE SET views = views + 1, updated_at = datetime('now', 'localtime')
`);
const stmtViewsAll = db.prepare('SELECT * FROM pageviews');

/* ---------- 访客统计 ---------- */
const stmtVisitorGet = db.prepare('SELECT * FROM visitors WHERE sid = ?');
const stmtVisitorInsert = db.prepare('INSERT INTO visitors (sid) VALUES (?)');
const stmtVisitorTouch = db.prepare(
  "UPDATE visitors SET last_seen = datetime('now', 'localtime'), hits = hits + 1 WHERE sid = ?"
);
const stmtVisitorCount = db.prepare('SELECT COUNT(*) AS n FROM visitors');
const stmtPvTotal = db.prepare('SELECT COALESCE(SUM(views), 0) AS n FROM pageviews');
const stmtDayPvBump = db.prepare(
  'INSERT INTO visit_days (day, pv) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET pv = pv + 1'
);
const stmtDayUvBump = db.prepare(
  'INSERT INTO visit_days (day, uv) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET uv = uv + 1'
);
const stmtDaySidInsert = db.prepare('INSERT OR IGNORE INTO visit_day_sids (day, sid) VALUES (?, ?)');
const stmtDayGet = db.prepare('SELECT * FROM visit_days WHERE day = ?');
const stmtDayUvCount = db.prepare('SELECT COUNT(*) AS n FROM visit_day_sids WHERE day = ?');

/* “在线”判定：内存里记 sid/ip 的最后一次心跳，60 秒内算在线（前端 25 秒心跳一次） */
const ONLINE_MS = 60 * 1000;
const onlinePeers = new Map();

function dayKey() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function onlineCount(now) {
  let n = 0;
  for (const ts of onlinePeers.values()) if (now - ts <= ONLINE_MS) n++;
  return n;
}

/* ---------- 文章文件管理（Hexo source/_posts） ---------- */
const BLOG_ROOT = cfg.blogRoot ? path.resolve(cfg.blogRoot) : path.join(__dirname, '..');
const POSTS_DIR = path.join(BLOG_ROOT, 'source', '_posts');
const TRASH_DIR = path.join(__dirname, 'trash');
const BACKUP_DIR = path.join(__dirname, 'backups');
for (const d of [TRASH_DIR, BACKUP_DIR]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function validMdName(name) {
  return /^[\w\-.\u4e00-\u9fa5]+\.md$/.test(name || '') && !name.includes('..');
}

function parsePost(file, withRaw) {
  const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const fm = m ? m[1] : '';
  const get = (k) => {
    const r = fm.match(new RegExp('^' + k + ':\\s*(.+)$', 'm'));
    return r ? r[1].trim().replace(/^['"]|['"]$/g, '') : '';
  };
  const title = get('title') || file.replace(/\.md$/, '');
  const dateStr = get('date');
  const tags = [];
  const tagBlock = fm.match(/^tags:\s*\r?\n((?:\s+-\s+.+\r?\n?)+)/m);
  if (tagBlock) {
    for (const t of tagBlock[1].matchAll(/^\s+-\s+(.+)$/gm)) tags.push(t[1].trim());
  }
  let permalink = '';
  if (dateStr) {
    const d = new Date(dateStr.replace(' ', 'T'));
    permalink = '/' + d.getFullYear() + '/' +
      String(d.getMonth() + 1).padStart(2, '0') + '/' +
      String(d.getDate()).padStart(2, '0') + '/' +
      file.replace(/\.md$/, '') + '/';
  }
  const out = { file, title, date: dateStr, tags, permalink };
  if (withRaw) out.raw = raw;
  return out;
}

/* 保存后自动重新生成静态站 */
const { spawn } = require('node:child_process');
let rebuilding = false;
function regenerate(logPrefix) {
  if (rebuilding) return false;
  const hexo = path.join(BLOG_ROOT, 'node_modules', 'hexo', 'bin', 'hexo');
  if (!fs.existsSync(hexo)) {
    console.log('[' + logPrefix + '] 没找到 hexo（' + hexo + '），跳过静态站重建；' +
      '请在本机跑 hexo generate 后重新上传 public/，或把 config.json 的 blogRoot 指到带 node_modules 的站点根目录');
    return false;
  }
  rebuilding = true;
  const child = spawn(process.execPath, [hexo, 'generate'], { cwd: BLOG_ROOT });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  child.on('close', (code) => {
    rebuilding = false;
    console.log('[' + logPrefix + '] hexo generate 完成，退出码', code);
  });
  return true;
}

/* 文章管理要求服务器上真的有 /source/_posts */
function postsDirReady() {
  try { return fs.existsSync(POSTS_DIR); } catch (e) { return false; }
}
const POSTS_DIR_ERROR = '服务器上找不到 Hexo 源目录 source/_posts：请在 config.json 里把 blogRoot 指向站点根目录（或上传整个项目）';

/* ---------- 工具 ---------- */
function maskIp(ip) {
  if (!ip) return '';
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1';
  const v4 = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) return v4[1] + '.' + v4[2] + '.*.*';
  const v6 = ip.replace(/^::ffff:/, '');
  const parts = v6.split(':');
  return parts.slice(0, 3).join(':') + ':*:*';
}

function hashSeed(s) {
  return crypto.createHash('md5').update(s).digest('hex').slice(0, 12);
}

function validEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 100;
}

/* ---------- IP 属地解析 ---------- */
const regionCache = new Map();
async function fetchRegion(ip) {
  if (!ip) return '';
  if (ip === '127.0.0.1' || ip === '::1') return '本地';
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip)) return '局域网';
  if (regionCache.has(ip)) return regionCache.get(ip);
  let region = '';
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 3000);
    const r = await fetch('http://ip-api.com/json/' + encodeURIComponent(ip) +
      '?fields=status,country,regionName,city&lang=zh-CN', { signal: ctl.signal });
    clearTimeout(timer);
    const d = await r.json();
    if (d && d.status === 'success') {
      const norm = (s) => s.replace(/[省市壮族自治区回族维吾尔特别行政区\s]/g, '');
      const parts = [d.country, d.regionName, d.city].filter(Boolean)
        .filter((p, i, arr) => arr.findIndex((q) => norm(q) === norm(p)) === i);
      if (parts[0] === '中国' && parts.length > 1) parts.shift();
      region = parts.join('');
    }
  } catch (e) { /* 失败留空 */ }
  regionCache.set(ip, region);
  return region;
}

function toPublic(row, withIp, mine) {
  return {
    id: row.id,
    nickname: row.nickname,
    content: row.content,
    parentId: row.parent_id,
    likes: row.likes,
    time: row.created_at,
    editedAt: row.edited_at || '',
    ip: withIp ? row.ip : maskIp(row.ip),
    region: row.region || '',
    isAdmin: !!row.is_admin,
    mine: !!mine,
    avatarSeed: hashSeed(row.nickname + '|' + row.ip)
  };
}

function friendPublic(row) {
  return { id: row.id, name: row.name, url: row.url, desc: row.desc, time: row.created_at };
}
function friendAdmin(row) {
  return Object.assign(friendPublic(row), { status: row.status, ip: row.ip });
}

function resolveOrigin(origin) {
  const list = cfg.corsOrigins;
  if (!Array.isArray(list) || list.length === 0) return '*';
  if (origin && list.indexOf(origin) !== -1) return origin;
  return list[0];
}

function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': res.corsOrigin || '*',
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token, X-Client-Id'
  });
  res.end(body);
}

function sendHtml(res, code, html) {
  res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let data = '';
    const max = limit || 64 * 1024;
    req.on('data', (c) => {
      data += c;
      if (data.length > max) { reject(new Error('body too large')); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { reject(new Error('invalid json')); }
    });
    req.on('error', reject);
  });
}

const CONTROL_CHARS = new RegExp('[\\u0000-\\u001f\\u007f]', 'g');
function sanitize(s, maxLen) {
  return String(s || '')
    .replace(CONTROL_CHARS, '')
    .trim()
    .slice(0, maxLen);
}

function clientIp(req) {
  let ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
  return ip.replace(/^::ffff:/, '');
}

/* ---------- 简易内存限流表（重启即清空，够用） ---------- */
const lastSubscribe = new Map();   // ip -> ts，防邮件轰炸
const lastView = new Map();        // page|ip -> ts，防刷阅读量

/* ---------- 管理密钥防暴破：同 IP 错 10 次锁 10 分钟 ---------- */
const adminFails = new Map();
function tokenEquals(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function adminStatus(req) {
  const t = req.headers['x-admin-token'];
  if (!t) return 'none';
  if (tokenEquals(t, cfg.adminToken)) return 'ok';
  const ip = clientIp(req);
  const now = Date.now();
  const rec = adminFails.get(ip) || { count: 0, until: 0 };
  if (now < rec.until) return 'locked';
  rec.count++;
  if (rec.count >= 10) {
    rec.until = now + 10 * 60 * 1000;
    rec.count = 0;
    console.log('管理密钥暴破锁定:', ip);
  }
  adminFails.set(ip, rec);
  return 'bad';
}

function unsubLink(token) {
  return cfg.publicApiBase.replace(/\/$/, '') + '/api/unsubscribe?token=' + token;
}

/* ---------- 服务 ---------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  res.corsOrigin = resolveOrigin(req.headers.origin);

  if (req.method === 'OPTIONS') { send(res, 204, {}); return; }

  const adminSt = adminStatus(req);
  if (adminSt === 'locked') {
    return send(res, 429, { ok: false, error: '错误次数太多，这个 IP 被锁定 10 分钟' });
  }
  const admin = adminSt === 'ok';
  const cid = sanitize(req.headers['x-client-id'], 64);

  try {
    /* ======== 评论 ======== */

    if (req.method === 'GET' && url.pathname === '/api/comments') {
      const page = sanitize(url.searchParams.get('page'), cfg.maxPageLen);
      if (!page) return send(res, 400, { ok: false, error: 'missing page' });
      const rows = stmtList.all(page);
      send(res, 200, {
        ok: true,
        total: rows.length,
        comments: rows.map((r) => toPublic(r, admin, cid && r.cid === cid))
      });
      return;
    }

    /* 全站评论列表（管理员） */
    if (req.method === 'GET' && url.pathname === '/api/comments/all') {
      if (!admin) return send(res, 403, { ok: false, error: '没有权限' });
      const rows = stmtListAll.all();
      send(res, 200, {
        ok: true,
        total: rows.length,
        comments: rows.map((r) => Object.assign(toPublic(r, true, false), { page: r.page }))
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/comments') {
      const body = await readBody(req);
      const page = sanitize(body.page, cfg.maxPageLen);
      const nickname = sanitize(body.nickname, cfg.maxNicknameLen);
      const content = sanitize(body.content, cfg.maxContentLen);
      const email = sanitize(body.email, 100);
      const parentId = Number(body.parentId) || 0;
      if (!page || !nickname || !content) {
        return send(res, 400, { ok: false, error: '昵称和内容不能为空' });
      }
      if (email && !validEmail(email)) {
        return send(res, 400, { ok: false, error: '邮箱格式不对' });
      }
      if (!admin && cfg.adminNickname &&
          nickname.toLowerCase() === String(cfg.adminNickname).toLowerCase()) {
        return send(res, 400, { ok: false, error: '这个昵称是站长的，换一个吧' });
      }
      if (parentId && !stmtGet.get(parentId)) {
        return send(res, 400, { ok: false, error: '回复的评论不存在' });
      }
      const ip = clientIp(req);
      if (!admin) {
        const last = stmtRecentByIp.get(ip);
        if (last && (Date.now() - new Date(last.created_at.replace(' ', 'T'))) < cfg.rateLimitSeconds * 1000) {
          return send(res, 429, { ok: false, error: '发得太快啦，喝口水再来（' + cfg.rateLimitSeconds + ' 秒一条）' });
        }
      }
      const region = await fetchRegion(ip);
      const info = stmtInsert.run(page, nickname, content, parentId, ip, admin ? 1 : 0, region, cid, email);
      const row = stmtGet.get(info.lastInsertRowid);

      // 回复邮件通知（配了 SMTP 且被回复者留了邮箱时）
      if (parentId) {
        const parent = stmtGet.get(parentId);
        if (parent && parent.email && parent.email !== email) {
          sendMail(
            parent.email,
            '你在「' + cfg.siteName + '」的评论有了新回复',
            parent.nickname + ' 你好：\n\n' + nickname + ' 回复了你的评论：\n\n「' +
            content.slice(0, 200) + '」\n\n去看看：' + page + '\n\n—— ' + cfg.siteName
          );
        }
      }
      send(res, 200, { ok: true, comment: toPublic(row, admin, true) });
      return;
    }

    /* 编辑评论（本人或管理员） */
    const editMatch = url.pathname.match(/^\/api\/comments\/(\d+)$/);
    if (req.method === 'PUT' && editMatch) {
      const id = Number(editMatch[1]);
      const row = stmtGet.get(id);
      if (!row) return send(res, 404, { ok: false, error: '评论不存在' });
      const own = cid && row.cid && row.cid === cid;
      if (!admin && !own) {
        return send(res, 403, { ok: false, error: '只能编辑自己的评论' });
      }
      const body = await readBody(req);
      const content = sanitize(body.content, cfg.maxContentLen);
      if (!content) return send(res, 400, { ok: false, error: '内容不能为空' });
      stmtUpdateContent.run(content, id);
      send(res, 200, { ok: true, comment: toPublic(stmtGet.get(id), admin, own) });
      return;
    }

    if (req.method === 'POST' && (url.pathname === '/api/comments/like' || url.pathname === '/api/comments/unlike')) {
      const body = await readBody(req);
      const id = Number(body.id) || 0;
      const row = stmtGet.get(id);
      if (!row) return send(res, 404, { ok: false, error: '评论不存在' });
      if (url.pathname.endsWith('unlike')) {
        stmtUnlike.run(id);
        send(res, 200, { ok: true, likes: Math.max(row.likes - 1, 0) });
      } else {
        stmtLike.run(id);
        send(res, 200, { ok: true, likes: row.likes + 1 });
      }
      return;
    }

    if (req.method === 'DELETE' && editMatch) {
      const id = Number(editMatch[1]);
      const row = stmtGet.get(id);
      if (!row) return send(res, 404, { ok: false, error: '评论不存在' });
      const own = cid && row.cid && row.cid === cid;
      if (!admin && !own) {
        return send(res, 403, { ok: false, error: '只能删除自己的评论' });
      }
      stmtDelete.run(id);
      stmtDeleteChildren.run(id);
      send(res, 200, { ok: true });
      return;
    }

    /* ======== 友链 ======== */

    if (req.method === 'GET' && url.pathname === '/api/friends') {
      send(res, 200, { ok: true, friends: stmtFriendsApproved.all().map(friendPublic) });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/friends/all') {
      if (!admin) return send(res, 403, { ok: false, error: '没有权限' });
      send(res, 200, { ok: true, friends: stmtFriendsAll.all().map(friendAdmin) });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/friends') {
      const body = await readBody(req);
      const name = sanitize(body.name, 30);
      const furl = sanitize(body.url, 200);
      const desc = sanitize(body.desc, 100);
      if (!name || !furl) return send(res, 400, { ok: false, error: '站名和地址都要填' });
      if (!/^https?:\/\/.+\..+/.test(furl)) {
        return send(res, 400, { ok: false, error: '地址格式不对（要以 http:// 或 https:// 开头）' });
      }
      const ip = clientIp(req);
      const last = stmtFriendRecentByIp.get(ip);
      if (last && (Date.now() - new Date(last.created_at.replace(' ', 'T'))) < cfg.friendApplyLimitSeconds * 1000) {
        return send(res, 429, { ok: false, error: '申请太频繁啦，一会儿再来' });
      }
      stmtFriendInsert.run(name, furl, desc, ip);
      send(res, 200, { ok: true });
      return;
    }

    const fMatch = url.pathname.match(/^\/api\/friends\/(\d+)(\/(approve|reject))?$/);
    if (fMatch) {
      if (!admin) return send(res, 403, { ok: false, error: '没有权限' });
      const fid = Number(fMatch[1]);
      const row = stmtFriendGet.get(fid);
      if (!row) return send(res, 404, { ok: false, error: '申请不存在' });
      if (req.method === 'DELETE') {
        stmtFriendDelete.run(fid);
        return send(res, 200, { ok: true });
      }
      if (req.method === 'POST' && fMatch[3]) {
        stmtFriendStatus.run(fMatch[3] === 'approve' ? 'approved' : 'rejected', fid);
        return send(res, 200, { ok: true });
      }
    }

    /* ======== 邮件订阅 ======== */

    /* 订阅 */
    if (req.method === 'POST' && url.pathname === '/api/subscribe') {
      const body = await readBody(req);
      const email = sanitize(body.email, 100).toLowerCase();
      if (!validEmail(email)) {
        return send(res, 400, { ok: false, error: '邮箱格式不对' });
      }
      const subIp = clientIp(req);
      const subCd = (Number(cfg.subscribeLimitSeconds) || 0) * 1000;
      if (subCd && Date.now() - (lastSubscribe.get(subIp) || 0) < subCd) {
        return send(res, 429, { ok: false, error: '订阅太频繁啦，稍等一下再试' });
      }
      const exist = stmtSubGet.get(email);
      if (exist && exist.status === 'active') {
        return send(res, 200, { ok: true, message: '这个邮箱已经订阅过了' });
      }
      if (exist) {
        stmtSubReactivate.run(email);
      } else {
        stmtSubInsert.run(email, crypto.randomBytes(16).toString('hex'));
      }
      const row = stmtSubGet.get(email);
      if (lastSubscribe.size > 5000) lastSubscribe.clear();
      lastSubscribe.set(subIp, Date.now());
      sendMail(
        email,
        '订阅成功 · ' + cfg.siteName,
        '欢迎订阅「' + cfg.siteName + '」！\n\n以后每发新文章，都会第一时间送到你的邮箱。\n\n' +
        '如果哪天不想收了，点这里退订：\n' + unsubLink(row.token) + '\n\n—— ' + cfg.siteName
      );
      send(res, 200, { ok: true, message: '订阅成功！新文章会发到你的邮箱' });
      return;
    }

    /* 退订（邮件里的链接，GET 直接生效） */
    if (req.method === 'GET' && url.pathname === '/api/unsubscribe') {
      const token = sanitize(url.searchParams.get('token'), 64);
      const row = token && stmtSubByToken.get(token);
      if (!row) {
        return sendHtml(res, 404, '<meta charset="utf-8"><p>链接无效或已退订。</p>');
      }
      stmtSubDeactivate.run(token);
      sendHtml(res, 200,
        '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
        '<div style="max-width:480px;margin:15vh auto;font-family:sans-serif;text-align:center">' +
        '<h2>已退订</h2><p>「' + cfg.siteName + '」不会再发邮件到 ' + row.email + '。</p>' +
        '<p>改变主意的话，随时回博客重新订阅。</p></div>');
      return;
    }

    /* 订阅者列表 / 删除（管理员） */
    if (req.method === 'GET' && url.pathname === '/api/subscribers') {
      if (!admin) return send(res, 403, { ok: false, error: '没有权限' });
      send(res, 200, { ok: true, subscribers: stmtSubAll.all() });
      return;
    }
    const subMatch = url.pathname.match(/^\/api\/subscribers\/(\d+)$/);
    if (req.method === 'DELETE' && subMatch) {
      if (!admin) return send(res, 403, { ok: false, error: '没有权限' });
      stmtSubDelete.run(Number(subMatch[1]));
      send(res, 200, { ok: true });
      return;
    }

    /* 新文章通知（管理员调用，通常由 hexo 钩子触发） */
    if (req.method === 'POST' && url.pathname === '/api/notify') {
      if (!admin) return send(res, 403, { ok: false, error: '没有权限' });
      const body = await readBody(req);
      const postUrl = sanitize(body.postUrl, 300);
      const postTitle = sanitize(body.postTitle, 200);
      if (!postUrl || !postTitle) return send(res, 400, { ok: false, error: '缺少 postUrl/postTitle' });
      const subs = stmtSubActive.all();
      if (!getMailer()) {
        return send(res, 200, { ok: true, sent: 0, total: subs.length, note: 'smtp 未配置，未实际发信' });
      }
      let sent = 0;
      for (const s of subs) {
        const ok = await sendMail(
          s.email,
          '新文章：' + postTitle + ' · ' + cfg.siteName,
          '「' + cfg.siteName + '」发布了新文章：\n\n《' + postTitle + '》\n' + postUrl +
          '\n\n—— 退订：' + unsubLink(s.token)
        );
        if (ok) sent++;
      }
      send(res, 200, { ok: true, sent, total: subs.length });
      return;
    }

    /* 阅读计数（公开上报） */
    if (req.method === 'POST' && url.pathname === '/api/view') {
      const body = await readBody(req);
      const page = sanitize(body.page, cfg.maxPageLen);
      if (page) {
        const key = page + '|' + clientIp(req);
        const cd = (Number(cfg.viewCooldownSeconds) || 0) * 1000;
        if (!cd || Date.now() - (lastView.get(key) || 0) >= cd) {
          stmtViewHit.run(page);
          stmtDayPvBump.run(dayKey());
          if (lastView.size > 20000) lastView.clear();
          lastView.set(key, Date.now());
        }
      }
      send(res, 200, { ok: true });
      return;
    }

    /* 按文章聚合统计（管理员） */
    if (req.method === 'GET' && url.pathname === '/api/stats/pages') {
      if (!admin) return send(res, 403, { ok: false, error: '没有权限' });
      const views = {};
      stmtViewsAll.all().forEach((v) => { views[v.page] = v.views; });
      const byPage = {};
      db.prepare('SELECT page, likes, created_at FROM comments').all().forEach((c) => {
        const p = byPage[c.page] = byPage[c.page] || { comments: 0, likes: 0, lastComment: '' };
        p.comments++;
        p.likes += c.likes || 0;
        if (c.created_at > p.lastComment) p.lastComment = c.created_at;
      });
      const pages = Object.keys(Object.assign({}, views, byPage)).map((page) => ({
        page,
        views: views[page] || 0,
        comments: byPage[page] ? byPage[page].comments : 0,
        likes: byPage[page] ? byPage[page].likes : 0,
        lastComment: byPage[page] ? byPage[page].lastComment : ''
      })).sort((a, b) => b.views - a.views || b.comments - a.comments);
      send(res, 200, { ok: true, pages });
      return;
    }

    /* 实时访客：现在在线几人 / 累计多少位访客 / 今天多少人（前端每 25 秒心跳一次） */
    if (req.method === 'GET' && url.pathname === '/api/stats/live') {
      const sid = sanitize(url.searchParams.get('sid'), 64);
      const ip = clientIp(req);
      const now = Date.now();

      onlinePeers.set(sid ? 's:' + sid : 'i:' + ip, now);
      if (onlinePeers.size > 3000) {
        for (const [k, ts] of onlinePeers) if (now - ts > ONLINE_MS) onlinePeers.delete(k);
      }

      const day = dayKey();
      let isNew = false;
      let mine = 0;
      if (sid) {
        const row = stmtVisitorGet.get(sid);
        if (row) {
          stmtVisitorTouch.run(sid);
          mine = (row.hits || 0) + 1;
        } else {
          stmtVisitorInsert.run(sid);
          isNew = true;
          mine = 1;
          const ins = stmtDaySidInsert.run(day, sid);
          if (ins && ins.changes > 0) stmtDayUvBump.run(day);
        }
      }

      const dayRow = stmtDayGet.get(day) || { uv: 0, pv: 0 };
      send(res, 200, {
        ok: true,
        online: onlineCount(now),
        uv: stmtVisitorCount.get().n,
        pv: stmtPvTotal.get().n,
        todayUv: stmtDayUvCount.get(day).n,
        todayPv: dayRow.pv || 0,
        isNew,
        mine
      });
      return;
    }

    /* 全站公开统计（阅读总数/评论总数，供页脚展示） */
    if (req.method === 'GET' && url.pathname === '/api/stats/public') {
      const views = db.prepare('SELECT COALESCE(SUM(views), 0) AS v FROM pageviews').get().v;
      const comments = db.prepare('SELECT COUNT(*) AS c FROM comments').get().c;
      send(res, 200, { ok: true, views, comments });
      return;
    }

    /* ======== 文章管理（管理员，操作 Hexo 源文件） ======== */

    /* 文章列表 */
    if (req.method === 'GET' && url.pathname === '/api/posts') {
      if (!admin) return send(res, 403, { ok: false, error: '没有权限' });
      if (!postsDirReady()) return send(res, 503, { ok: false, error: POSTS_DIR_ERROR });
      const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md')).sort().reverse();
      send(res, 200, { ok: true, posts: files.map((f) => parsePost(f, false)) });
      return;
    }

    /* 读取全文（原始 markdown） */
    if (req.method === 'GET' && url.pathname === '/api/posts/raw') {
      if (!admin) return send(res, 403, { ok: false, error: '没有权限' });
      if (!postsDirReady()) return send(res, 503, { ok: false, error: POSTS_DIR_ERROR });
      const file = url.searchParams.get('file') || '';
      if (!validMdName(file) || !fs.existsSync(path.join(POSTS_DIR, file))) {
        return send(res, 404, { ok: false, error: '文章不存在' });
      }
      send(res, 200, { ok: true, post: parsePost(file, true) });
      return;
    }

    /* 新建文章 */
    if (req.method === 'POST' && url.pathname === '/api/posts') {
      if (!admin) return send(res, 403, { ok: false, error: '没有权限' });
      if (!postsDirReady()) return send(res, 503, { ok: false, error: POSTS_DIR_ERROR });
      const body = await readBody(req);
      const title = sanitize(body.title, 100);
      let filename = sanitize(body.filename, 100).replace(/\.md$/, '');
      const tags = Array.isArray(body.tags) ? body.tags.map((t) => sanitize(t, 30)).filter(Boolean) : [];
      const content = String(body.content || '').slice(0, 100000);
      if (!title || !filename) return send(res, 400, { ok: false, error: '标题和文件名必填' });
      filename = filename.replace(/[^\w\-\u4e00-\u9fa5]/g, '-');
      const full = filename + '.md';
      if (!validMdName(full)) return send(res, 400, { ok: false, error: '文件名不合法' });
      if (fs.existsSync(path.join(POSTS_DIR, full))) {
        return send(res, 400, { ok: false, error: '同名文件已存在' });
      }
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const dateStr = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) +
        ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
      const md = '---\ntitle: ' + title + '\ndate: ' + dateStr +
        (tags.length ? '\ntags:\n' + tags.map((t) => '  - ' + t).join('\n') : '') +
        '\n---\n\n' + content + '\n';
      fs.writeFileSync(path.join(POSTS_DIR, full), md, 'utf8');
      regenerate('新建文章');
      send(res, 200, { ok: true, post: parsePost(full, false) });
      return;
    }

    /* 编辑文章（写回源文件，自动备份） */
    if (req.method === 'PUT' && url.pathname === '/api/posts') {
      if (!admin) return send(res, 403, { ok: false, error: '没有权限' });
      if (!postsDirReady()) return send(res, 503, { ok: false, error: POSTS_DIR_ERROR });
      const body = await readBody(req);
      const file = body.file || '';
      const content = String(body.content || '');
      if (!validMdName(file) || !fs.existsSync(path.join(POSTS_DIR, file))) {
        return send(res, 404, { ok: false, error: '文章不存在' });
      }
      if (!content.trim()) return send(res, 400, { ok: false, error: '内容不能为空' });
      fs.copyFileSync(
        path.join(POSTS_DIR, file),
        path.join(BACKUP_DIR, file + '.' + Date.now() + '.bak')
      );
      fs.writeFileSync(path.join(POSTS_DIR, file), content, 'utf8');
      regenerate('编辑文章');
      send(res, 200, { ok: true, post: parsePost(file, false) });
      return;
    }

    /* 删除文章（移入回收站，可恢复） */
    if (req.method === 'DELETE' && url.pathname === '/api/posts') {
      if (!admin) return send(res, 403, { ok: false, error: '没有权限' });
      if (!postsDirReady()) return send(res, 503, { ok: false, error: POSTS_DIR_ERROR });
      const file = url.searchParams.get('file') || '';
      if (!validMdName(file) || !fs.existsSync(path.join(POSTS_DIR, file))) {
        return send(res, 404, { ok: false, error: '文章不存在' });
      }
      fs.renameSync(path.join(POSTS_DIR, file), path.join(TRASH_DIR, file + '.' + Date.now()));
      regenerate('删除文章');
      send(res, 200, { ok: true });
      return;
    }

    /* ======== 图片上传（管理员） ======== */
    if (req.method === 'POST' && url.pathname === '/api/upload') {
      if (!admin) return send(res, 403, { ok: false, error: '没有权限' });
      if (!postsDirReady()) return send(res, 503, { ok: false, error: POSTS_DIR_ERROR });
      const body = await readBody(req, 15 * 1024 * 1024);
      const name = sanitize(body.name || 'image.png', 100);
      const b64 = String(body.data || '');
      const ext = (name.match(/\.(png|jpe?g|gif|webp|svg)$/i) || [])[1];
      if (!ext) return send(res, 400, { ok: false, error: '只支持 png/jpg/gif/webp/svg' });
      let buf;
      try { buf = Buffer.from(b64.replace(/^data:[^,]+,/, ''), 'base64'); }
      catch (e) { return send(res, 400, { ok: false, error: '图片数据无效' }); }
      if (!buf.length) return send(res, 400, { ok: false, error: '图片数据为空' });
      if (buf.length > 10 * 1024 * 1024) return send(res, 400, { ok: false, error: '图片不能超过 10MB' });
      const dir = path.join(BLOG_ROOT, 'source', 'images', 'uploads');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const fname = Date.now() + '-' + crypto.randomBytes(3).toString('hex') + '.' + ext.toLowerCase();
      fs.writeFileSync(path.join(dir, fname), buf);
      regenerate('上传图片');
      send(res, 200, { ok: true, url: '/images/uploads/' + fname });
      return;
    }

    /* 健康检查 */
    if (req.method === 'GET' && url.pathname === '/api/health') {
      send(res, 200, { ok: true, service: 'comments', mail: !!getMailer(), time: new Date().toISOString() });
      return;
    }

    send(res, 404, { ok: false, error: 'not found' });
  } catch (e) {
    console.error(e);
    send(res, 500, { ok: false, error: 'server error' });
  }
});

const LISTEN_HOST = cfg.host || '127.0.0.1';
server.listen(cfg.port, LISTEN_HOST, () => {
  console.log('评论服务已启动: http://' + LISTEN_HOST + ':' + cfg.port);
  console.log('邮件功能:', getMailer() ? '已启用' : '未配置 SMTP（只收集订阅不发信）');
});
