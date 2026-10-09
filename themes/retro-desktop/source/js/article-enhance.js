/* retro-desktop · 文章增强：图片灯箱 / 代码复制 / 表格横向包裹（离线、无依赖） */
(function () {
  'use strict';
  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function () {
    var article = document.getElementById('article-content');
    if (!article) return;

    /* 1) 表格包一层，窄屏可横向滚动 */
    article.querySelectorAll('table').forEach(function (t) {
      if (t.closest('figure.highlight, .highlight')) return;
      if (t.parentElement && t.parentElement.classList.contains('table-wrap')) return;
      var wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      t.parentNode.insertBefore(wrap, t);
      wrap.appendChild(t);
    });

    /* 2) 代码块一键复制：先清掉历史遗留，再保证每块恰好一个 */
    article.querySelectorAll(".code-copy").forEach(function (b) { b.remove(); });
    function addCopy(host, codeEl) {
      var btn = document.createElement("button");
      btn.className = "code-copy";
      btn.type = "button";
      btn.textContent = "复制";
      btn.addEventListener("click", function () {
        var text = codeEl ? codeEl.innerText : host.innerText;
        function done(ok) { btn.textContent = ok ? "已复制 ✓" : "复制失败"; setTimeout(function () { btn.textContent = "复制"; }, 1500); }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
        } else {
          var ta = document.createElement("textarea");
          ta.value = text; document.body.appendChild(ta); ta.select();
          try { document.execCommand("copy"); done(true); } catch (e) { done(false); }
          ta.remove();
        }
      });
      host.appendChild(btn);
    }
    /* 先处理 highlight 包裹（可能有 figure.highlight 或 .highlight 两种外壳） */
    var handled = [];
    article.querySelectorAll("figure.highlight, div.highlight").forEach(function (fig) {
      fig.classList.add("has-copy");
      addCopy(fig, fig.querySelector("td.code pre code") || fig.querySelector("pre code") || fig.querySelector("code"));
      fig.querySelectorAll("pre").forEach(function (p) { handled.push(p); });
    });
    /* 其余独立代码块 */
    article.querySelectorAll("pre").forEach(function (pre) {
      if (handled.indexOf(pre) >= 0 || pre.closest("figure.highlight, div.highlight")) return;
      if (pre.querySelector("code") && pre.parentElement && pre.parentElement.tagName === "TD") { handled.push(pre); return; }
      pre.classList.add("has-copy");
      addCopy(pre, pre.querySelector("code"));
    });

    /* 3) 图片灯箱：点开看大图 */
    var box = document.createElement('div');
    box.id = 'ae-lightbox';
    box.innerHTML = '<button class="lb-close" type="button" aria-label="关闭">×</button><img alt=""><div class="lb-hint">点击任意处或按 Esc 关闭</div>';
    document.body.appendChild(box);
    var img = box.querySelector('img');
    function open(src, alt) { img.src = src; img.alt = alt || ''; box.classList.add('is-open'); }
    function close() { box.classList.remove('is-open'); img.src = ''; }
    article.querySelectorAll('img').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        open(el.currentSrc || el.src, el.alt);
      });
    });
    box.addEventListener('click', function (e) {
      if (e.target === box || e.target.classList.contains('lb-close')) close();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  });
})();
