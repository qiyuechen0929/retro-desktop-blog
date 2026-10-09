/* retro-desktop —— 多主题 / 流体背景 / 窗口系统 / 粒子特效 / 打字机 / 开机画面 / 搜索 */
(function () {
  'use strict';

  var reduceMotion = document.documentElement.dataset.motion === 'reduce';

  /* ============================================================
     主题系统
     ============================================================ */
  var THEMES = {
    dream:   { base: '#b18bc7', blobs: ['#f5beda', '#b79bdd', '#ecc4e3', '#9a6fc4', '#ffd6ec'] },
    classic: { base: '#0d7d7d', blobs: ['#3aa6a6', '#0b6e8f', '#7ad0c8', '#005f6b', '#9fe0d5'] },
    crt:     { base: '#060a06', blobs: ['#0d2b0d', '#123d12', '#0a2410', '#144214', '#0f3312'] },
    ocean:   { base: '#8fb8dd', blobs: ['#cfe8f7', '#a8cbe8', '#e8f3fb', '#7fa8d0', '#bfe0f0'] }
  };
  var currentTheme = 'dream';

  function applyTheme(name, save) {
    if (!THEMES[name]) name = 'dream';
    currentTheme = name;
    var rootEl = document.documentElement;
    rootEl.classList.add('theme-fade');
    setTimeout(function () { rootEl.classList.remove('theme-fade'); }, 600);
    rootEl.dataset.theme = name;
    var swatches = document.querySelectorAll('.swatch');
    for (var i = 0; i < swatches.length; i++) {
      swatches[i].classList.toggle('is-active', swatches[i].dataset.theme === name);
    }
    if (save) { try { localStorage.setItem('blog-theme', name); } catch (e) {} }
  }

  (function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem('blog-theme'); } catch (e) {}
    applyTheme(saved || 'dream', false);
    document.addEventListener('click', function (e) {
      var sw = e.target.closest('.swatch');
      if (sw) applyTheme(sw.dataset.theme, true);
    });
  })();

  /* ============================================================
     流体渐变背景
     ============================================================ */
  var fluid = document.getElementById('fluid-canvas');
  if (fluid && fluid.getContext) {
    var fctx = fluid.getContext('2d');
    var conf = [
      { r: .55, sx: .22, sy: .28, ax: .16, ay: .12, fx: .00021, fy: .00017, p: 0 },
      { r: .62, sx: .72, sy: .22, ax: .14, ay: .16, fx: .00016, fy: .00023, p: 2 },
      { r: .50, sx: .30, sy: .75, ax: .18, ay: .10, fx: .00019, fy: .00014, p: 4 },
      { r: .46, sx: .80, sy: .70, ax: .12, ay: .15, fx: .00024, fy: .00019, p: 1 },
      { r: .38, sx: .50, sy: .48, ax: .20, ay: .18, fx: .00013, fy: .00026, p: 3 }
    ];
    var fw, fh;
    function fresize() { fw = fluid.width = fluid.offsetWidth; fh = fluid.height = fluid.offsetHeight; }
    function fpaint(t) {
      var colors = THEMES[currentTheme].blobs;
      fctx.clearRect(0, 0, fw, fh);
      for (var i = 0; i < conf.length; i++) {
        var b = conf[i];
        var x = (b.sx + Math.sin(t * b.fx + b.p) * b.ax) * fw;
        var y = (b.sy + Math.cos(t * b.fy + b.p * 1.7) * b.ay) * fh;
        var rad = b.r * Math.max(fw, fh) * (0.85 + 0.15 * Math.sin(t * 0.0001 + b.p));
        var g = fctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, colors[i % colors.length]);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        fctx.fillStyle = g;
        fctx.fillRect(0, 0, fw, fh);
      }
    }
    fresize();
    window.addEventListener('resize', function () { fresize(); if (reduceMotion) fpaint(0); });
    if (reduceMotion) fpaint(0);
    else (function loop(t) { fpaint(t || 0); requestAnimationFrame(loop); })();
  }

  /* ============================================================
     时钟
     ============================================================ */
  var clock = document.getElementById('taskbar-clock');
  function tick() {
    if (!clock) return;
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, '0'); };
    clock.textContent = p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }
  tick();
  setInterval(tick, 1000);

  /* ============================================================
     窗口系统：拖拽 / 最小化 / 最大化 / 关闭 + 还原坞
     ============================================================ */
  var zTop = 40;
  var dock = document.getElementById('restore-dock');

  function windowLabel(win) {
    var t = win.querySelector('.window-title');
    return t ? t.textContent.replace(/[_□×]/g, '').trim().slice(0, 16) : '窗口';
  }

  /* 窗口能不能拖：只有「鼠标 + 够宽」才允许。
     手机/平板上手指滑页面时总会蹭到标题栏，窗口跟着乱跑比「能动」烦多了，
     所以触摸设备、粗指针、窄窗口一律不禁用拖拽（桌面端保持原样）。 */
  var coarsePointer = window.matchMedia ? window.matchMedia('(pointer: coarse)') : { matches: true };
  function canDragWindows() {
    if (coarsePointer.matches) return false;
    if (navigator.maxTouchPoints > 0) return false;
    if (window.innerWidth < 900) return false;
    return true;
  }

  // 拖拽（仅桌面端；见 canDragWindows）
  document.addEventListener('pointerdown', function (e) {
    var title = e.target.closest('.window-title');
    if (!title || e.target.closest('.window-controls, a, button')) return;
    var win = title.closest('.window');
    if (!win || win.classList.contains('is-max')) return;
    if (e.pointerType && e.pointerType !== 'mouse') return;   // 手指/笔不拖
    if (!canDragWindows()) return;
    e.preventDefault();
    var rect = win.getBoundingClientRect();
    var startX = e.clientX, startY = e.clientY;
    var curX = parseFloat(win.dataset.dx || 0), curY = parseFloat(win.dataset.dy || 0);
    win.classList.add('dragging');
    win.style.zIndex = ++zTop;

    function move(ev) {
      var dx = curX + ev.clientX - startX;
      var dy = curY + ev.clientY - startY;
      win.dataset.dx = dx; win.dataset.dy = dy;
      win.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    }
    function up() {
      win.classList.remove('dragging');
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
    }
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  });

  // 双击标题栏复位位置
  document.addEventListener('dblclick', function (e) {
    if (!canDragWindows()) return;
    var title = e.target.closest('.window-title');
    if (!title || e.target.closest('.window-controls')) return;
    var win = title.closest('.window');
    if (!win) return;
    win.dataset.dx = 0; win.dataset.dy = 0;
    win.style.transform = '';
  });

  // 一旦变成「不能拖」的条件（缩小窗口、手机上转屏），把拖歪的窗口归位
  window.addEventListener('resize', function () {
    if (canDragWindows()) return;
    Array.prototype.forEach.call(document.querySelectorAll('.window'), function (w) {
      if (w.dataset.dx || w.dataset.dy) {
        w.dataset.dx = 0; w.dataset.dy = 0; w.style.transform = '';
      }
    });
  });

  // 控制按钮
  document.addEventListener('click', function (e) {
    var ctrl = e.target.closest('.window-controls i');
    if (!ctrl) return;
    var win = ctrl.closest('.window');
    if (!win) return;
    var action = ctrl.textContent.trim();
    if (action === '_') {
      win.classList.toggle('is-min');
    } else if (action === '□') {
      win.classList.remove('is-min');
      win.classList.toggle('is-max');
      if (win.classList.contains('is-max')) win.style.zIndex = ++zTop;
    } else if (action === '×') {
      win.style.display = 'none';
      if (dock) {
        var btn = document.createElement('button');
        btn.className = 'bevel-button';
        btn.type = 'button';
        btn.textContent = '↩ 还原：' + windowLabel(win);
        btn.addEventListener('click', function () {
          win.style.display = '';
          win.classList.remove('is-min');
          win.style.zIndex = ++zTop;
          btn.remove();
        });
        dock.appendChild(btn);
      }
    }
  });

  /* ============================================================
     粒子特效：鼠标星星拖尾 + 点击空白放烟花
     ============================================================ */
  var fx = document.getElementById('fx-canvas');
  if (fx && fx.getContext && !reduceMotion) {
    var xctx = fx.getContext('2d');
    var parts = [];
    var FX_COLORS = ['#ffffff', '#fff6c9', '#ffb3d9', '#d9c6f2', '#a8e6ff'];

    function fxResize() { fx.width = window.innerWidth; fx.height = window.innerHeight; }
    fxResize();
    window.addEventListener('resize', fxResize);

    function spawn(x, y, burst) {
      var n = burst ? 14 : 1;
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2;
        var sp = burst ? 1.5 + Math.random() * 3 : Math.random() * .8;
        parts.push({
          x: x, y: y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - (burst ? 1 : .3),
          life: 1,
          size: burst ? 2 + Math.random() * 3 : 1.5 + Math.random() * 2.5,
          color: FX_COLORS[(Math.random() * FX_COLORS.length) | 0],
          star: Math.random() < .3
        });
      }
      if (parts.length > 220) parts.splice(0, parts.length - 220);
    }

    var lastTrail = 0;
    document.addEventListener('pointermove', function (e) {
      var now = performance.now();
      if (now - lastTrail < 45) return;
      lastTrail = now;
      spawn(e.clientX, e.clientY, false);
    });
    document.addEventListener('pointerdown', function (e) {
      if (e.target.closest('a, button, input, .window, .modal-mask')) return;
      spawn(e.clientX, e.clientY, true);
    });

    (function fxLoop() {
      xctx.clearRect(0, 0, fx.width, fx.height);
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.x += p.vx; p.y += p.vy; p.vy += .02; p.life -= .016;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        xctx.globalAlpha = Math.max(0, p.life) * .9;
        xctx.fillStyle = p.color;
        var s = p.size;
        xctx.fillRect(p.x - s, p.y - s, s * 2, s * 2);
        if (p.star) {
          xctx.fillRect(p.x - s * 2, p.y - s / 2, s * 4, s);
          xctx.fillRect(p.x - s / 2, p.y - s * 2, s, s * 4);
        }
      }
      xctx.globalAlpha = 1;
      requestAnimationFrame(fxLoop);
    })();
  }

  /* ============================================================
     打字机座右铭
     ============================================================ */
  var motto = document.getElementById('welcome-motto');
  if (motto) {
    var text = motto.dataset.text || '';
    if (reduceMotion) {
      motto.textContent = text;
    } else {
      var mi = 0;
      var cursor = document.createElement('span');
      cursor.className = 'type-cursor';
      motto.appendChild(cursor);
      (function type() {
        if (mi <= text.length) {
          motto.firstChild && motto.firstChild.nodeType === 3
            ? motto.firstChild.textContent = text.slice(0, mi)
            : motto.insertBefore(document.createTextNode(text.slice(0, mi)), cursor);
          mi++;
          setTimeout(type, 90);
        }
      })();
    }
  }

  /* ============================================================
     开机画面（每会话一次）
     ============================================================ */
  var boot = document.getElementById('boot-screen');
  if (boot) {
    var booted = false;
    try { booted = sessionStorage.getItem('blog-booted') === '1'; } catch (e) {}
    if (booted || reduceMotion) {
      boot.remove();
    } else {
      boot.hidden = false;
      var fill = document.getElementById('boot-fill');
      var prog = 0;
      var done = function () {
        boot.classList.add('boot-done');
        try { sessionStorage.setItem('blog-booted', '1'); } catch (e) {}
        setTimeout(function () { boot.remove(); }, 550);
      };
      var timer = setInterval(function () {
        prog += 8 + Math.random() * 14;
        if (fill) fill.style.width = Math.min(100, prog) + '%';
        if (prog >= 100) { clearInterval(timer); setTimeout(done, 250); }
      }, 110);
      boot.addEventListener('click', function () { clearInterval(timer); done(); });
    }
  }

  /* ============================================================
     站内搜索
     ============================================================ */
  var modal = document.getElementById('search-modal');
  var toggle = document.getElementById('search-toggle');
  var closeBtn = document.getElementById('search-close');
  var input = document.getElementById('search-input');
  var results = document.getElementById('search-results');
  if (modal && toggle && input && results) {
    var index = null, loading = false;

    function openModal() {
      modal.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      input.focus();
      loadIndex();
    }
    function closeModal() {
      modal.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
    function loadIndex() {
      if (index || loading) return;
      loading = true;
      results.innerHTML = '<p class="search-tip">加载中…</p>';
      fetch((window.BLOG_CONFIG && window.BLOG_CONFIG.searchPath) || '/search.json')
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (data) {
          index = Array.isArray(data) ? data : [];
          results.innerHTML = '<p class="search-tip">输入关键词开始搜索</p>';
          if (input.value.trim()) render(input.value.trim());
        })
        .catch(function () { results.innerHTML = '<p class="search-tip">加载搜索索引失败，请稍后重试</p>'; });
    }
    function stripTags(html) {
      var div = document.createElement('div');
      div.innerHTML = html || '';
      return div.textContent || div.innerText || '';
    }
    function escapeHtml(s) {
      return s.replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }
    function highlight(text, kw) {
      var safe = escapeHtml(text);
      if (!kw) return safe;
      var re = new RegExp('(' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      return safe.replace(re, '<mark>$1</mark>');
    }
    function render(q) {
      if (!index) return;
      var kw = q.toLowerCase();
      var hits = index.filter(function (item) {
        var title = (item.title || '').toLowerCase();
        var text = stripTags(item.content).toLowerCase();
        return title.indexOf(kw) !== -1 || text.indexOf(kw) !== -1;
      }).slice(0, 20);
      if (!hits.length) {
        results.innerHTML = '<p class="search-tip">没有找到「' + escapeHtml(q) + '」相关的结果</p>';
        return;
      }
      results.innerHTML = hits.map(function (item) {
        var text = stripTags(item.content);
        var pos = text.toLowerCase().indexOf(kw);
        var snippet = pos === -1 ? text.slice(0, 80) : text.slice(Math.max(0, pos - 30), pos + 60);
        return '<a class="search-hit" href="' + item.url + '">' +
          '<h4>' + highlight(item.title || '(无标题)', kw) + '</h4>' +
          '<p>' + highlight(snippet, kw) + '…</p></a>';
      }).join('');
    }
    var debounce = null;
    input.addEventListener('input', function () {
      clearTimeout(debounce);
      var q = input.value.trim();
      if (!q) { results.innerHTML = '<p class="search-tip">输入关键词开始搜索</p>'; return; }
      debounce = setTimeout(function () { render(q); }, 200);
    });
    toggle.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        modal.hidden ? openModal() : closeModal();
      }
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });
  }
})();
