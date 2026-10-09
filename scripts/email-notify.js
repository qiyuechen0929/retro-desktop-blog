/* Hexo 钩子：生成站点后检测新文章，通知邮件订阅者
   原理：比较最新文章链接与上次记录的链接，不同则调评论服务的 /api/notify
   首次运行只记录基线，不会把旧文章群发一遍 */
'use strict';

const fs = require('fs');
const path = require('path');

const STATE_PATH = path.join(hexo.base_dir, 'server', 'notify-state.json');
const CONFIG_PATH = path.join(hexo.base_dir, 'server', 'config.json');

hexo.on('generateAfter', async function () {
  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch (e) { return; }
  if (!cfg.adminToken || !cfg.smtp || !cfg.smtp.host) return; // 没配 SMTP 就不用打扰

  const posts = hexo.locals.get('posts').sort('-date');
  if (!posts.length) return;
  const latest = posts.data[0];
  const link = latest.permalink;

  let state = {};
  try { state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')); } catch (e) {}

  if (state.lastLink === link) return; // 没有新文章

  if (!state.lastLink) {
    // 首次运行：只记基线
    fs.writeFileSync(STATE_PATH, JSON.stringify({ lastLink: link }), 'utf8');
    hexo.log.info('[email-notify] 已记录基线文章，之后的新文章将通知订阅者');
    return;
  }

  const apiBase = 'http://127.0.0.1:' + (cfg.port || 8765);
  try {
    const r = await fetch(apiBase + '/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Token': cfg.adminToken },
      body: JSON.stringify({ postUrl: link, postTitle: latest.title })
    });
    const data = await r.json();
    if (data.ok) {
      fs.writeFileSync(STATE_PATH, JSON.stringify({ lastLink: link }), 'utf8');
      hexo.log.info(`[email-notify] 新文章《${latest.title}》已通知 ${data.sent}/${data.total} 位订阅者`);
    }
  } catch (e) {
    hexo.log.warn('[email-notify] 评论服务不在线，通知跳过:', e.message);
  }
});
