/* retro-desktop —— 体验增强包
   阅读进度 / 目录 TOC / 代码复制 / 图片放大 / 回顶部 / 随机文章 / 数字滚动 / Konami 像素雨 */
(function () {
  'use strict';

  var reduceMotion = document.documentElement.dataset.motion === 'reduce';

  /* ---------- 阅读进度条 ---------- */
  var progress = document.getElementById('read-progress');
  if (progress) {
    var onScroll = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      progress.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    };
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- 目录 TOC ---------- */
  var tocBody = document.getElementById('toc-body');
  var article = document.getElementById('article-content');
  if (tocBody && article) {
    var heads = article.querySelectorAll('h2, h3');
    if (!heads.length) {
      var tocWin = document.getElementById('toc-window');
      if (tocWin) tocWin.style.display = 'none';
    } else {
      var items = [];
      heads.forEach(function (h, i) {
        h.id = 'h-' + i;
        var a = document.createElement('a');
        a.href = '#h-' + i;
        a.textContent = h.textContent;
        a.className = 'toc-link toc-' + h.tagName.toLowerCase();
        a.addEventListener('click', function (e) {
          e.preventDefault();
          h.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
          history.replaceState(null, '', '#h-' + i);
        });
        tocBody.appendChild(a);
        items.push({ el: h, a: a });
      });
      var onTocScroll = function () {
        var current = 0;
        items.forEach(function (it, i) {
          if (it.el.getBoundingClientRect().top < 120) current = i;
        });
        items.forEach(function (it, i) { it.a.classList.toggle('is-current', i === current); });
      };
      document.addEventListener('scroll', onTocScroll, { passive: true });
      onTocScroll();
    }
  }

  /* ---------- 代码块一键复制 ---------- */
  if (article) {
    article.querySelectorAll('pre, figure.highlight').forEach(function (block) {
      if (block.querySelector('.code-copy')) return;
      block.style.position = 'relative';
      var btn = document.createElement('button');
      btn.className = 'code-copy';
      btn.type = 'button';
      btn.textContent = '复制';
      btn.addEventListener('click', function () {
        var text = block.innerText.replace(/^复制\n/, '');
        var done = function () {
          btn.textContent = '已复制 ✓';
          setTimeout(function () { btn.textContent = '复制'; }, 1500);
        };
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(done);
        else {
          var t = document.createElement('textarea');
          t.value = text; document.body.appendChild(t); t.select();
          document.execCommand('copy'); t.remove(); done();
        }
      });
      block.appendChild(btn);
    });

    /* ---------- 图片点击放大 ---------- */
    article.querySelectorAll('img').forEach(function (img) {
      img.classList.add('zoomable');
      img.addEventListener('click', function () {
        var mask = document.createElement('div');
        mask.className = 'lightbox-mask';
        mask.innerHTML = '<img src="' + img.src + '" alt="">';
        mask.addEventListener('click', function () { mask.remove(); });
        document.addEventListener('keydown', function esc(e) {
          if (e.key === 'Escape') { mask.remove(); document.removeEventListener('keydown', esc); }
        });
        document.body.appendChild(mask);
      });
    });
  }

  /* ---------- 回到顶部 ---------- */
  var topBtn = document.createElement('button');
  topBtn.id = 'back-to-top';
  topBtn.type = 'button';
  topBtn.title = '回到顶部';
  topBtn.textContent = '▲';
  topBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
  document.body.appendChild(topBtn);
  document.addEventListener('scroll', function () {
    topBtn.classList.toggle('is-show', window.scrollY > 400);
  }, { passive: true });

  /* ---------- 手气不错（随机文章） ---------- */
  var luckyBtn = document.getElementById('lucky-btn');
  if (luckyBtn) {
    luckyBtn.addEventListener('click', function () {
      fetch('/search.json').then(function (r) { return r.json(); }).then(function (list) {
        if (!Array.isArray(list) || !list.length) return;
        var pick = list[(Math.random() * list.length) | 0];
        if (pick && pick.url) location.href = pick.url;
      }).catch(function () {});
    });
  }

  /* ---------- 数字滚动 ---------- */
  if (!reduceMotion) {
    document.querySelectorAll('[data-count]').forEach(function (el) {
      var target = parseInt(el.dataset.count, 10) || 0;
      var start = null;
      function step(t) {
        if (!start) start = t;
        var p = Math.min(1, (t - start) / 900);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* ---------- 全站访问统计 / 运行天数 ---------- */
  var viewsEl = document.getElementById('site-views');
  if (viewsEl && window.COMMENTS_CONFIG) {
    fetch(window.COMMENTS_CONFIG.api.replace(/\/$/, '') + '/api/stats/public')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.ok) {
          viewsEl.dataset.count = d.views;
          viewsEl.textContent = d.views;
        }
      })
      .catch(function () { viewsEl.textContent = '—'; });
  }
  var daysEl = document.getElementById('site-days');
  if (daysEl) {
    daysEl.textContent = Math.max(1, Math.floor((Date.now() - new Date('2026-10-08').getTime()) / 86400000) + 1);
  }

  /* ---------- Konami 秘籍：↑↑↓↓←→←→BA → 像素星星雨 ---------- */
  var KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  var pos = 0;
  document.addEventListener('keydown', function (e) {
    pos = (e.key === KONAMI[pos]) ? pos + 1 : (e.key === KONAMI[0] ? 1 : 0);
    if (pos === KONAMI.length) { pos = 0; starRain(); }
  });
  function starRain() {
    if (reduceMotion) return;
    var canvas = document.createElement('canvas');
    canvas.id = 'konami-rain';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    canvas.width = innerWidth; canvas.height = innerHeight;
    var colors = ['#ff9dc6', '#fff6c9', '#d9c6f2', '#a8e6ff', '#ffffff'];
    var drops = [];
    for (var i = 0; i < 120; i++) {
      drops.push({
        x: Math.random() * canvas.width,
        y: -Math.random() * canvas.height,
        v: 2 + Math.random() * 4,
        s: 2 + Math.random() * 5,
        c: colors[(Math.random() * colors.length) | 0]
      });
    }
    var startT = performance.now();
    (function loop(t) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drops.forEach(function (d) {
        d.y += d.v;
        if (d.y > canvas.height) { d.y = -10; d.x = Math.random() * canvas.width; }
        ctx.fillStyle = d.c;
        ctx.fillRect(d.x, d.y, d.s, d.s);
        ctx.fillRect(d.x - d.s, d.y + d.s / 3, d.s * 3, d.s / 3);
        ctx.fillRect(d.x + d.s / 3, d.y - d.s / 2, d.s / 3, d.s * 2);
      });
      if (t - startT < 8000) requestAnimationFrame(loop);
      else canvas.remove();
    })(startT);
  }
})();
