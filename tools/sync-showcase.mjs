#!/usr/bin/env node
/* ==================================================================
   博客「展示册」自动同步 —— 让 showcase 的星数/语言跟着 GitHub 走
   ------------------------------------------------------------------
   适用：Hexo 博客，展示册数据放在主题配置的 showcase 数组里
        （例如 themes/<your-theme>/_config.yml 的 showcase:）

   特点：
   · 只刷新「客观字段」：lang（语言）、stars（星数）
     —— 你手写的 title / desc / tag / 顺序 一个字都不会动
   · 可选自动追加新仓库（autoAppend.enabled = true）
   · 改完自动跑 hexo generate 重建 public/
   · 幂等：没变化不写文件；写前备份；产物校验失败则中止

   用法：
     node tools/sync-showcase.mjs                    # 用同目录的 sync-showcase.config.json
     node tools/sync-showcase.mjs path/to/其他配置.json

   每天自动跑（crontab -e）：
     20 4 * * * /usr/bin/node /path/to/tools/sync-showcase.mjs >/dev/null 2>&1

   配置文件字段见 tools/sync-showcase.config.example.json
   ================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CFG = process.argv[2] || path.join(HERE, 'sync-showcase.config.json');
if (!fs.existsSync(CFG)) {
  console.error('找不到配置文件：' + CFG + '\n先复制 tools/sync-showcase.config.example.json 再改。');
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(CFG, 'utf8'));
const LOG = cfg.logFile || path.join(path.dirname(CFG), 'sync-showcase.log');
const BK = cfg.backupDir || path.join(path.dirname(CFG), 'backups');

const buf = [];
const log = (m) => { const s = '[' + new Date().toISOString().replace('T', ' ').slice(0, 19) + '] ' + m; buf.push(s); console.log(s); };
const flush = (code) => {
  try { fs.mkdirSync(path.dirname(LOG), { recursive: true }); fs.appendFileSync(LOG, buf.join('\n') + '\n'); } catch {}
  process.exit(code || 0);
};
const die = (m) => { log('中止：' + m); flush(1); };

const YML = cfg.themeConfig;
if (!YML) die('配置里缺少 themeConfig（主题 _config.yml 的绝对路径）');
if (!fs.existsSync(YML)) die('找不到 ' + YML);
const text = fs.readFileSync(YML, 'utf8');

/* ---------- 1) 拉 GitHub ---------- */
let repos;
try {
  const r = await fetch(`https://api.github.com/users/${cfg.user}/repos?per_page=100&sort=pushed`, {
    headers: { 'User-Agent': 'site-showcase-sync', 'Accept': 'application/vnd.github+json' }
  });
  if (!r.ok) die('GitHub API 返回 ' + r.status + (r.status === 403 ? '（匿名限流，稍后重试）' : ''));
  repos = (await r.json()).filter((x) => !x.fork);
} catch (e) { die('访问 GitHub 失败：' + e.message); }
const byName = new Map(repos.map((r) => [r.name, r]));
log(`GitHub：${repos.length} 个非 fork 仓库（${cfg.user}）`);

/* ---------- 2) 定位 showcase 块 ---------- */
const lines = text.split('\n');
const si = lines.findIndex((l) => /^showcase:\s*$/.test(l));
if (si < 0) die('主题配置里没找到 showcase:（改过主题结构？）');
let se = si + 1;
while (se < lines.length && (lines[se].trim() === '' || /^\s/.test(lines[se]))) se++;
log(`showcase 在第 ${si + 1}~${se} 行`);

const starts = [];
for (let i = si + 1; i < se; i++) if (/^\s*-\s+\w+:/.test(lines[i])) starts.push(i);
const ranges = starts.map((s, k) => ({ from: s, to: k + 1 < starts.length ? starts[k + 1] : se }));
log(`共 ${ranges.length} 条`);

const getVal = (from, to, key) => {
  for (let i = from; i < to; i++) {
    const m = lines[i].match(new RegExp('^\\s+' + key + ':\\s*(.*)$'));
    if (m) return { i, val: m[1].trim() };
  }
  return null;
};
const repoOf = (url) => ((url || '').match(/github\.com\/[\w.-]+\/([\w.-]+?)\/?$/i) || [])[1] || '';

/* ---------- 3) 刷新客观字段 ---------- */
let changed = 0;
for (const R of ranges) {
  const u = getVal(R.from, R.to, 'url');
  if (!u) continue;
  const name = repoOf(u.val);
  const title = (getVal(R.from, R.to, 'title') || { val: name }).val;
  if (!name) continue;
  const r = byName.get(name);
  if (!r) { log(`警告：GitHub 上找不到 ${name}（${title}），跳过`); continue; }
  const want = { lang: r.language || '', stars: String(r.stargazers_count ?? 0) };
  for (const key of cfg.refreshFields || ['lang', 'stars']) {
    if (!want[key]) continue;
    const cur = getVal(R.from, R.to, key);
    if (!cur || cur.val === want[key]) continue;
    log(`${title} · ${key}：${cur.val} → ${want[key]}`);
    lines[cur.i] = lines[cur.i].replace(/(:\s*).*$/, '$1' + want[key]);
    changed++;
  }
}

/* ---------- 4) 可选：自动追加新仓库 ---------- */
if (cfg.autoAppend && cfg.autoAppend.enabled) {
  const used = new Set(ranges.map((R) => repoOf((getVal(R.from, R.to, 'url') || {}).val)).filter(Boolean));
  const excluded = new Set(cfg.exclude || []);
  const cands = repos
    .filter((r) => !used.has(r.name) && r.name !== cfg.user && !excluded.has(r.name))
    .filter((r) => { const d = (r.description || '').trim(); return d && d !== r.name; })
    .sort((a, b) => (b.stargazers_count - a.stargazers_count) || String(b.pushed_at).localeCompare(String(a.pushed_at)));
  const yq = (s) => '"' + String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  const extra = [];
  for (const r of cands) {
    if (ranges.length + extra.length / 6 >= (cfg.autoAppend.maxTotal || 10)) break;
    extra.push(
      `  - title: ${yq(r.name)}`,
      `    desc: ${yq(r.description)}`,
      `    url: ${r.html_url}`,
      `    tag: ${yq(cfg.autoAppend.tag || '项目')}`,
      `    lang: ${r.language || 'Code'}`,
      `    stars: ${r.stargazers_count || 0}`
    );
    log(`自动追加：${r.name}（⭐${r.stargazers_count}）`);
  }
  if (extra.length) { lines.splice(se, 0, ...extra); changed += extra.length; }
}

/* ---------- 5) 写入 + 备份 ---------- */
if (!changed) { log('数据没有变化，不写入（保持原样）'); flush(0); }
const outp = lines.join('\n');
if (!/^showcase:/m.test(outp)) die('产物校验失败：showcase 不见了');
if (outp.length < text.length * 0.7) die('产物校验失败：文件被截断');

fs.mkdirSync(BK, { recursive: true });
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
fs.writeFileSync(path.join(BK, `_config-${stamp}.yml`), text);
fs.writeFileSync(YML + '.tmp', outp, 'utf8');
fs.renameSync(YML + '.tmp', YML);
log(`已更新主题配置（备份 backups/_config-${stamp}.yml），改动 ${changed} 处`);

/* ---------- 6) 重建网站 ---------- */
if (cfg.generate !== false) {
  const root = cfg.siteRoot || path.resolve(path.dirname(YML), '..', '..');
  const hexoBin = [
    path.join(root, 'node_modules', 'hexo', 'bin', 'hexo'),
    path.join(root, 'node_modules', '.bin', 'hexo')
  ].find((p) => fs.existsSync(p));
  if (!hexoBin) {
    log('警告：没找到 hexo，跳过自动重建（请手动 hexo generate）');
  } else {
    try {
      const t = execFileSync(process.execPath, [hexoBin, 'generate'], { cwd: root, encoding: 'utf8', timeout: 300000 });
      const tail = t.split('\n').filter((l) => /Generated|INFO|WARN|ERROR/i.test(l)).slice(-2).join(' / ');
      log('hexo generate 完成' + (tail ? '：' + tail.slice(0, 180) : ''));
    } catch (e) {
      log('hexo generate 失败：' + String(e.message || e).slice(0, 300));
      flush(1);
    }
  }
}

/* ---------- 7) 校验生成的页面 ---------- */
try {
  const built = path.join(cfg.siteRoot || path.resolve(path.dirname(YML), '..', '..'), 'public', 'showcase', 'index.html');
  const h = fs.readFileSync(built, 'utf8');
  const stars = [...h.matchAll(/showcase-stars[^>]*>([^<]+)</g)].map((m) => m[1].trim());
  log(`页面校验：${stars.length} 张卡片；星数 = [${stars.join(', ')}]`);
} catch (e) { log('页面校验跳过：' + e.message); }

flush(0);
