/* retro-desktop —— 实时访客
   和「个人网站」同款：你是第几位访客 / 今天多少人 / 现在几人在线
   数据来自评论服务的 /api/stats/live：进页面拉一次，之后每 25 秒心跳一次，
   切回标签页时立刻再拉一次（这样"在线"才准）。 */
(function () {
  'use strict';

  var cfg = window.COMMENTS_CONFIG;
  if (!cfg || !cfg.api) return;
  var API = cfg.api.replace(/\/$/, '');

  var pill = document.getElementById('live-visitors');   // 首页欢迎区那颗胶囊
  var foot = document.getElementById('live-foot');         // 页脚那行（每页都有）
  if (!pill && !foot) return;

  var LS_SID = 'c-client-id';   // 和评论系统共用同一个客户端 id
  function sid() {
    try {
      var v = localStorage.getItem(LS_SID);
      if (!v) {
        v = (window.crypto && crypto.randomUUID)
          ? crypto.randomUUID()
          : String(Date.now()) + Math.random().toString(16).slice(2);
        localStorage.setItem(LS_SID, v);
      }
      return v;
    } catch (e) { return ''; }
  }

  var reduce = document.documentElement.dataset.motion === 'reduce';

  function roll(el, to) {
    if (!el) return;
    to = Number(to) || 0;
    var from = parseInt(el.textContent, 10);
    if (reduce || isNaN(from) || from === to) { el.textContent = to; return; }
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / 700);
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function fill(root, d) {
    if (!root) return;
    root.hidden = false;
    roll(root.querySelector('.lv-uv'), d.uv);
    roll(root.querySelector('.lv-today'), d.todayUv);
    roll(root.querySelector('.lv-online'), d.online);
    root.classList.toggle('is-quiet', !d.online);
  }

  function paint(d) {
    fill(pill, d);
    fill(foot, d);
  }

  function load() {
    fetch(API + '/api/stats/live?sid=' + encodeURIComponent(sid()), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d && d.ok) paint(d); })
      .catch(function () { /* 接口挂了就不显示，别留 "…" 在这儿 */ });
  }

  load();
  var timer = setInterval(load, 25000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) load();
  });
  window.addEventListener('pagehide', function () { clearInterval(timer); });

  /* 给控制台/自测留个口子 */
  window.__blogVisitors = { refresh: load };
})();
