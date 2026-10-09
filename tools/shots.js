/**
 * 一键生成 README 用的截图（桌面端 + 移动端 + 后台面板）。
 *
 *   npm i -D playwright-core                    # 或者全局/其他目录装好后用 NODE_PATH 指过去
 *   npx hexo server -p 4000                     # 先把本站跑起来
 *   node server/comments-server.js              # 想要评论/后台截图就把后端也起来
 *   node tools/shots.js                         # 开始截图 -> docs/screenshots/
 *
 * 可用环境变量：BASE（默认 http://127.0.0.1:4000）、EDGE（浏览器可执行文件路径）
 */
const { chromium, devices } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:4000';
const EDGE = process.env.EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const ROOT = path.resolve(__dirname, '..');
const D = path.join(ROOT, 'docs/screenshots/desktop');
const M = path.join(ROOT, 'docs/screenshots/mobile');
fs.mkdirSync(D, { recursive: true });
fs.mkdirSync(M, { recursive: true });

let TOKEN = '';
try { TOKEN = JSON.parse(fs.readFileSync(path.join(ROOT, 'server/config.json'), 'utf8')).adminToken || ''; } catch (e) {}

const init = (arg) => {
  try {
    sessionStorage.setItem('blog-booted', '1');           // 跳过开机画面
    localStorage.setItem('blog-theme', (arg && arg.theme) || 'dream');
    if (arg && arg.token) localStorage.setItem('c-admin-token', arg.token);
    else localStorage.removeItem('c-admin-token');
  } catch (e) {}
};

(async () => {
  const browser = await chromium.launch({ executablePath: EDGE, args: ['--enable-unsafe-swiftshader'] });
  const done = [];

  // ---------- 桌面端（访客视角）----------
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.25 });
  await ctx.addInitScript(init, { theme: 'dream' });
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2600);
  await p.screenshot({ path: D + '/home.png' });
  const first = await p.$('.post-row h3 a');
  const postUrl = first ? await first.getAttribute('href') : null;
  done.push('home');

  for (const th of ['classic', 'crt', 'ocean']) {
    await p.evaluate((t) => localStorage.setItem('blog-theme', t), th);
    await p.goto(BASE + '/', { waitUntil: 'networkidle' });
    await p.waitForTimeout(2200);
    await p.screenshot({ path: `${D}/theme-${th}.png` });
    done.push('theme-' + th);
  }
  await p.evaluate(() => localStorage.setItem('blog-theme', 'dream'));

  if (postUrl) {
    await p.goto(BASE + postUrl, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1600);
    await p.screenshot({ path: D + '/post-top.png' });
    const c = await p.$('#comments');
    if (c) {
      await p.evaluate(() => document.getElementById('comments').scrollIntoView({ block: 'center' }));
      await p.waitForTimeout(1500);
      await p.screenshot({ path: D + '/post-comments.png' });
    }
    done.push('post');
  }

  for (const [url, name] of [['/archives/', 'archives'], ['/showcase/', 'showcase'], ['/friends/', 'friends'], ['/me/', 'me'], ['/rss/', 'rss']]) {
    await p.goto(BASE + url, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1400);
    await p.screenshot({ path: `${D}/${name}.png` });
    done.push(name);
  }

  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1800);
  if (await p.$('#search-toggle')) {
    await p.click('#search-toggle');
    await p.waitForTimeout(400);
    await p.fill('#search-input', 'a');
    await p.waitForTimeout(1200);
    await p.screenshot({ path: D + '/search.png' });
    await p.keyboard.press('Escape');
    done.push('search');
  }
  await ctx.close();

  // ---------- 移动端 ----------
  const mctx = await browser.newContext({ ...devices['iPhone 12'] });
  await mctx.addInitScript(init, { theme: 'dream' });
  const mp = await mctx.newPage();
  await mp.goto(BASE + '/', { waitUntil: 'networkidle' });
  await mp.waitForTimeout(2400);
  await mp.screenshot({ path: M + '/home.png' });
  if (postUrl) {
    await mp.goto(BASE + postUrl, { waitUntil: 'networkidle' });
    await mp.waitForTimeout(1500);
    await mp.screenshot({ path: M + '/post-top.png' });
  }
  for (const [url, name] of [['/archives/', 'archives'], ['/showcase/', 'showcase'], ['/friends/', 'friends'], ['/me/', 'me'], ['/rss/', 'rss']]) {
    await mp.goto(BASE + url, { waitUntil: 'networkidle' });
    await mp.waitForTimeout(1300);
    await mp.screenshot({ path: `${M}/${name}.png` });
  }
  done.push('mobile');
  await mctx.close();

  // ---------- 后台（需要 server/config.json 里有 adminToken）----------
  if (TOKEN) {
    const actx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.25 });
    await actx.addInitScript(init, { theme: 'dream', token: TOKEN });
    const ap = await actx.newPage();
    await ap.goto(BASE + '/admin/', { waitUntil: 'networkidle' });
    await ap.waitForTimeout(2000);
    await ap.screenshot({ path: D + '/admin-overview.png' });
    const tab = await ap.$('button[data-tab="pages"]');
    if (tab) {
      await ap.evaluate(() => document.querySelector('button[data-tab="pages"]').click());
      await ap.waitForTimeout(1500);
      await ap.screenshot({ path: D + '/admin-posts.png' });
      const edit = await ap.$('#admin-pages-list .a-edit');
      if (edit) { await edit.click(); await ap.waitForTimeout(1600); await ap.screenshot({ path: D + '/admin-editor.png' }); }
    }
    done.push('admin');
    await actx.close();
  } else {
    console.log('（没找到 server/config.json 里的 adminToken，跳过后台截图）');
  }

  await browser.close();
  console.log('截图完成：' + done.join(', '));
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
