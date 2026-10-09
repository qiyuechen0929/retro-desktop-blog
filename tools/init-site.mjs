#!/usr/bin/env node
/**
 * 套版脚本：把「陈启粤的博客」改成你自己的站点信息。
 *
 *   node tools/init-site.mjs                      # 交互式问答
 *   node tools/init-site.mjs --yes --title "我的博客" --author "张三" \
 *        --nickname "张三" --motto "随便写写" --url "https://blog.example.com" --desc "我的博客"
 *
 * 可改的选项：--title --subtitle --desc --keywords --author --language
 *             --timezone --nickname --motto --url --yes
 * 会重新生成一份随机的管理密钥（server/config.json），并套出 deploy/ 下的三个配置文件。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...a) => path.join(ROOT, ...a);

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const ask = async (rl, label, def) => {
  if (args.yes && def !== undefined) return def;
  const a = rl.question(`  ${label}${def ? `（默认 ${def}）` : ''}: `);
  const v = (await a).trim();
  return v || def || '';
};

function setYaml(text, key, value) {
  const line = `${key}: ${value}`;
  const re = new RegExp(`^${key}:.*$`, 'm');
  if (!re.test(text)) throw new Error(`没找到 _config.yml 里的 ${key}:`);
  return text.replace(re, line);
}
function setNestedYaml(text, key, value) {
  // 只改缩进 2 空格的顶层子项（主题配置里用）
  const re = new RegExp(`^  ${key}:.*$`, 'm');
  if (!re.test(text)) throw new Error(`没找到主题配置里的 ${key}:`);
  return text.replace(re, `  ${key}: ${value}`);
}

(async () => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const y = (k, def) => (args[k] !== undefined && args[k] !== true ? args[k] : def);

  console.log('\n=== 博客套版向导 ===\n直接回车用默认值；带 --yes 跑就是全默认。\n');

  const site = {};
  site.title = await ask(rl, '站点标题', y('title', '我的博客'));
  site.subtitle = await ask(rl, '副标题（可留空）', y('subtitle', ''));
  site.desc = await ask(rl, '站点描述', y('desc', '记录技术、折腾与生活。'));
  site.keywords = await ask(rl, '关键词（逗号分隔）', y('keywords', 'blog,个人博客,技术'));
  site.author = await ask(rl, '作者名', y('author', '你的名字'));
  site.nickname = await ask(rl, '昵称（侧栏/首页显示）', y('nickname', site.author));
  site.motto = await ask(rl, '座右铭（首页打字机那句话）', y('motto', '一直在折腾，偶尔有结果。'));
  site.url = await ask(rl, '站点地址（含 https://，末尾不要 /）', y('url', 'https://blog.example.com'));
  site.language = await ask(rl, '语言', y('language', 'zh-CN'));
  site.timezone = await ask(rl, '时区', y('timezone', 'Asia/Shanghai'));
  rl.close();

  site.url = site.url.replace(/\/+$/, '');
  const host = site.url.replace(/^https?:\/\//, '').split('/')[0];
  const port = 8765;
  const changed = [];

  // 1) Hexo 主配置
  let main = fs.readFileSync(p('_config.yml'), 'utf8');
  main = setYaml(main, 'title', site.title);
  main = setYaml(main, 'subtitle', `'${site.subtitle}'`);
  main = setYaml(main, 'description', `'${site.desc}'`);
  main = setYaml(main, 'keywords', site.keywords);
  main = setYaml(main, 'author', site.author);
  main = setYaml(main, 'language', site.language);
  main = setYaml(main, 'timezone', site.timezone);
  main = setYaml(main, 'url', site.url);
  fs.writeFileSync(p('_config.yml'), main);
  changed.push('_config.yml');

  // 2) 主题配置
  let theme = fs.readFileSync(p('themes/retro-desktop/_config.yml'), 'utf8');
  theme = setNestedYaml(theme, 'nickname', site.nickname);
  theme = setNestedYaml(theme, 'motto', site.motto);
  theme = theme.replace(/^  api:.*$/m, `  api: ${site.url}        # 站点根地址；本地开发改成 http://127.0.0.1:${port}`);
  fs.writeFileSync(p('themes/retro-desktop/_config.yml'), theme);
  changed.push('themes/retro-desktop/_config.yml');

  // 3) 后端配置（顺便换一把新的管理密钥）
  const cfgPath = p('server/config.json');
  let cfg = {};
  if (fs.existsSync(cfgPath)) {
    try { cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch (e) { cfg = {}; }
  }
  const token = crypto.randomBytes(18).toString('base64url').slice(0, 28);
  cfg = Object.assign({
    port, host: '127.0.0.1', adminToken: token, adminNickname: site.nickname, siteName: site.title,
    publicApiBase: site.url, blogRoot: '', rateLimitSeconds: 20, friendApplyLimitSeconds: 60,
    subscribeLimitSeconds: 60, viewCooldownSeconds: 30, maxNicknameLen: 20, maxContentLen: 500,
    maxPageLen: 200, smtp: null
  }, cfg);
  cfg.adminToken = token;
  cfg.host = cfg.host || '127.0.0.1';
  cfg.adminNickname = site.nickname;
  cfg.siteName = site.title;
  cfg.publicApiBase = site.url;
  cfg.blogRoot = cfg.blogRoot || '';
  cfg.corsOrigins = [site.url, 'http://localhost:4000', 'http://127.0.0.1:4000'];
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
  changed.push('server/config.json（已重新生成管理密钥）');

  // 4) deploy/ 下的模板 → 具体文件
  const subs = { __DOMAIN__: host, __URL__: site.url, __ROOT__: `/www/blog`, __PORT__: String(port), __PORT_HOST__: `${host}:${port}` };
  const tpl = [
    ['deploy/nginx.conf.template', 'deploy/nginx.conf'],
    ['deploy/blog-api.service.template', 'deploy/blog-api.service'],
    ['deploy/deploy.cmd.template', 'deploy/deploy.cmd'],
    ['deploy/deploy.sh.template', 'deploy/deploy.sh'],
  ];
  for (const [from, to] of tpl) {
    if (!fs.existsSync(p(from))) continue;
    let s = fs.readFileSync(p(from), 'utf8');
    for (const [k, v] of Object.entries(subs)) s = s.split(k).join(v);
    fs.writeFileSync(p(to), s);
    if (to.endsWith('.sh')) fs.chmodSync(p(to), 0o755);
    changed.push(to);
  }

  console.log('\n--- 已更新 ---');
  changed.forEach((c) => console.log('  · ' + c));
  console.log(`\n管理密钥（进 /admin/ 用，别外传）：${token}\n`);
  console.log('--- 手动还剩这几步 ---');
  console.log('  1. 换头像：themes/retro-desktop/source/images/avatar.svg（或改主题配置 avatar:）');
  console.log('  2. 换站点图标：themes/retro-desktop/source/icon.svg');
  console.log('  3. 改「关于我」：source/me/index.md');
  console.log('  4. 改展示册 / 友链：themes/retro-desktop/_config.yml 里的 showcase: / friends:');
  console.log('  5. 删掉示例文章：source/_posts/*.md（保留一篇也行）');
  console.log('  6. 本地跑：npx hexo clean && npx hexo server -p 4000');
  console.log('  7. 起后端：cd server && node --experimental-sqlite comments-server.js\n');
})().catch((e) => { console.error('出错了：' + e.message); process.exit(1); });
