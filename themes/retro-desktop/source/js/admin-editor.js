/* ============================================================
   retro-desktop · 写作编辑器 v2（admin-editor.js）
   依赖：无。注入式 UI，复用 admin.js 的 api()/toast()。
   能力：front-matter 表单化 / 双栏实时预览 / 大纲跳转 / 字数与阅读时间
        / 自动草稿 + 历史版本 / 图片粘贴·拖拽·URL ·最近上传 / 快捷键
        / 发布前检查 / 模板与片段 / 可选 AI 助手（需后端配 cfg.ai）
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- 工具 ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function fmtDateTime(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
      ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
  }
  function debounce(fn, ms) {
    var t; return function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms); };
  }
  function byteSize(n) { return n < 1024 ? n + ' B' : (n / 1024).toFixed(1) + ' KB'; }

  /* ---------------- front-matter 解析 / 生成 ---------------- */
  var FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

  function parseFront(raw) {
    var fm = { title: '', date: '', updated: '', tags: [], categories: [], excerpt: '', cover: '', toc: '', published: '' };
    var body = raw || '';
    var m = String(raw || '').match(FM_RE);
    if (!m) return { fm: fm, body: body, hasFm: false };
    var head = m[1];
    body = String(raw).slice(m[0].length);
    var lines = head.split(/\r?\n/);
    var curList = null;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var listItem = line.match(/^\s+-\s+(.*)$/);
      if (listItem && curList) { fm[curList].push(listItem[1].trim().replace(/^['"]|['"]$/g, '')); continue; }
      var kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
      if (!kv) continue;
      var key = kv[1], val = kv[2].trim();
      curList = null;
      if (key === 'tags' || key === 'categories') {
        fm[key] = [];
        if (val) fm[key] = val.replace(/^\[|\]$/g, '').split(',').map(function (s) { return s.trim().replace(/^['"]|['"]$/g, ''); }).filter(Boolean);
        else curList = key;
      } else if (key in fm) {
        fm[key] = val.replace(/^['"]|['"]$/g, '');
      }
    }
    return { fm: fm, body: body, hasFm: true };
  }

  function yamlValue(v) {
    var s = String(v);
    if (!s) return '';
    if (/^[\w\u4e00-\u9fa5][\w\u4e00-\u9fa5 \-.·:：，,、/()+]*$/.test(s) && !/^(true|false|null|~)$/i.test(s)) return s;
    return '"' + s.replace(/"/g, '\\"') + '"';
  }

  function serializeFront(fm) {
    var out = ['---'];
    out.push('title: ' + yamlValue(fm.title));
    if (fm.date) out.push('date: ' + fm.date);
    if (fm.updated) out.push('updated: ' + fm.updated);
    if (fm.tags && fm.tags.length) { out.push('tags:'); fm.tags.forEach(function (t) { out.push('  - ' + yamlValue(t)); }); }
    if (fm.categories && fm.categories.length) { out.push('categories:'); fm.categories.forEach(function (c) { out.push('  - ' + yamlValue(c)); }); }
    if (fm.excerpt) out.push('excerpt: ' + yamlValue(fm.excerpt));
    if (fm.cover) out.push('cover: ' + yamlValue(fm.cover));
    if (fm.toc === 'false') out.push('toc: false');
    if (fm.published === 'false') out.push('published: false');
    out.push('---');
    return out.join('\n') + '\n\n';
  }

  /* ---------------- Markdown → HTML（离线、够用、安全） ---------------- */
  function mdRender(src) {
    var text = String(src || '');
    var codes = [];
    // 先抽走代码块，避免内部被当作 markdown
    text = text.replace(/```([\w+-]*)\n?([\s\S]*?)```/g, function (m, lang, code) {
      codes.push({ lang: lang || '', code: code.replace(/\n$/, '') });
      return '\u0000CODE' + (codes.length - 1) + '\u0000';
    });
    var html = esc(text)
      .replace(/`([^`\n]+)`/g, '<code>$1</code>')
      .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, '<img alt="$1" src="$2" loading="lazy">')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      .replace(/==([^=]+)==/g, '<mark>$1</mark>');

    var lines = html.split(/\n/);
    var out = [], i = 0;
    function isBlank(l) { return !l.trim(); }
    while (i < lines.length) {
      var line = lines[i];
      // 表格
      if (/\|/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1])) {
        var heads = line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(function (s) { return s.trim(); });
        var rows = [];
        i += 2;
        while (i < lines.length && /\|/.test(lines[i])) {
          rows.push(lines[i].replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(function (s) { return s.trim(); }));
          i++;
        }
        out.push('<table><thead><tr>' + heads.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
          rows.map(function (r) { return '<tr>' + heads.map(function (_, k) { return '<td>' + (r[k] || '') + '</td>'; }).join('') + '</tr>'; }).join('') +
          '</tbody></table>');
        continue;
      }
      var codeRef = line.match(/^\u0000CODE(\d+)\u0000$/);
      if (codeRef) {
        var c = codes[Number(codeRef[1])] || { lang: '', code: '' };
        out.push('<pre data-lang="' + esc(c.lang) + '"><code>' + esc(c.code) + '</code></pre>');
        i++; continue;
      }
      var h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) { var lv = h[1].length; out.push('<h' + lv + '>' + h[2] + '</h' + lv + '>'); i++; continue; }
      if (/^\s*([-*_])\s*\1\s*\1[\s-*_]*$/.test(line)) { out.push('<hr>'); i++; continue; }
      if (/^\s*>\s?/.test(line)) {
        var quote = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) { quote.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
        out.push('<blockquote>' + quote.join('<br>') + '</blockquote>');
        continue;
      }
      if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
        var ordered = /^\s*\d+[.)]\s+/.test(line);
        var items = [];
        while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*([-*+]|\d+[.)])\s+/, ''));
          i++;
        }
        var liHtml = items.map(function (t) {
          var task = t.match(/^\[( |x|X)\]\s+(.*)$/);
          if (task) return '<li class="ae-task"><input type="checkbox" disabled' + (task[1].toLowerCase() === 'x' ? ' checked' : '') + '> ' + task[2] + '</li>';
          return '<li>' + t + '</li>';
        }).join('');
        out.push(ordered ? '<ol>' + liHtml + '</ol>' : '<ul>' + liHtml + '</ul>');
        continue;
      }
      if (isBlank(line)) { i++; continue; }
      var para = [];
      while (i < lines.length && !isBlank(lines[i]) && !/^(#{1,6})\s|^\s*([-*+]|\d+[.)])\s|^\s*>|^\u0000CODE/.test(lines[i])) {
        para.push(lines[i]); i++;
      }
      out.push('<p>' + para.join('<br>') + '</p>');
    }
    return out.join('\n');
  }

  /* ---------------- 文本统计 ---------------- */
  function analyze(text) {
    var s = String(text || '');
    var cjk = (s.match(/[\u4e00-\u9fa5\u3040-\u30ff]/g) || []).length;
    var words = (s.replace(/[\u4e00-\u9fa5\u3040-\u30ff]/g, ' ').match(/[A-Za-z0-9_'-]+/g) || []).length;
    var chars = s.replace(/\s/g, '').length;
    var paragraphs = s.split(/\n{2,}/).filter(function (p) { return p.trim(); }).length;
    var minutes = Math.max(1, Math.round(cjk / 400 + words / 200));
    var headings = [];
    var re = /^(#{1,4})\s+(.+)$/gm, m;
    while ((m = re.exec(s))) headings.push({ level: m[1].length, text: m[2].trim(), index: m.index });
    return { cjk: cjk, words: words, chars: chars, paragraphs: paragraphs, minutes: minutes, headings: headings, lines: s.split(/\n/).length };
  }

  /* ---------------- 草稿（本地 + 历史版本） ---------------- */
  var HIST_MAX = 5;
  function draftKey(key) { return 'ae2-draft-' + key; }
  function histKey(key) { return 'ae2-hist-' + key; }
  function loadDraft(key) { try { return JSON.parse(localStorage.getItem(draftKey(key)) || 'null'); } catch (e) { return null; } }
  function saveDraftRaw(key, payload) { try { localStorage.setItem(draftKey(key), JSON.stringify(payload)); } catch (e) {} }
  function clearDraft(key) { try { localStorage.removeItem(draftKey(key)); localStorage.removeItem(histKey(key)); } catch (e) {} }
  function pushHistory(key, payload) {
    try {
      var list = JSON.parse(localStorage.getItem(histKey(key)) || '[]');
      if (list.length && list[0].at === payload.at && list[0].chars === payload.chars) return list;
      list.unshift(payload);
      list = list.slice(0, HIST_MAX);
      localStorage.setItem(histKey(key), JSON.stringify(list));
      return list;
    } catch (e) { return []; }
  }
  function loadHistory(key) { try { return JSON.parse(localStorage.getItem(histKey(key)) || '[]'); } catch (e) { return []; } }

  /* ---------------- 最近上传（本机记忆，方便复用） ---------------- */
  function recentUploads() { try { return JSON.parse(localStorage.getItem('ae2-uploads') || '[]'); } catch (e) { return []; } }
  function rememberUpload(url) {
    try {
      var list = recentUploads().filter(function (u) { return u !== url; });
      list.unshift(url);
      localStorage.setItem('ae2-uploads', JSON.stringify(list.slice(0, 12)));
    } catch (e) {}
  }

  /* ---------------- 模板与片段 ---------------- */
  var TEMPLATES = {
    blank: { name: '空白文章', body: '' },
    tech: {
      name: '技术笔记（含目录骨架）',
      body: '# 背景\n\n要解决什么问题、为什么值得写。\n\n## 方案\n\n- 思路一\n- 思路二\n\n## 实现\n\n```js\n// 关键代码\n```\n\n## 踩坑记录\n\n| 现象 | 原因 | 解决 |\n| --- | --- | --- |\n|  |  |  |\n\n## 小结\n\n'
    },
    essay: { name: '随笔 / 思考', body: '最近在想一件事。\n\n> 把当时最触动你的一句原话放这里。\n\n展开讲讲为什么它打动你，以及它改变了你什么做法。\n\n' },
    project: {
      name: '项目介绍',
      body: '## 这是什么\n\n一句话说清。\n\n## 能做什么\n\n- \n\n## 怎么用\n\n```bash\nnpm install\n```\n\n## 截图\n\n\n\n## 链接\n\n- GitHub：\n'
    },
    weekly: { name: '周报 / 记录', body: '本周做了：\n\n- \n\n遇到的问题：\n\n- \n\n下周计划：\n\n- \n' }
  };

  var SNIPPETS = [
    { name: '提示框（引用）', text: '\n> **提示**：这里写提示内容。\n' },
    { name: '折叠块（details）', text: '\n<details><summary>展开看更多</summary>\n\n隐藏内容\n\n</details>\n' },
    { name: '图片（带说明）', text: '\n![说明](/images/uploads/文件名.png)\n*图：说明文字*\n' },
    { name: '表格（3 列）', text: '\n| 列一 | 列二 | 列三 |\n| --- | --- | --- |\n|  |  |  |\n' },
    { name: '待办清单', text: '\n- [ ] 待办一\n- [x] 已完成\n' },
    { name: '分隔线', text: '\n---\n' },
    { name: '行内代码', text: '`code`' },
    { name: '脚注式参考链接', text: '\n参考：[标题](https://example.com)\n' }
  ];

  var SHORTCUTS = [
    ['⌘/Ctrl + S', '保存并重新生成'],
    ['⌘/Ctrl + Enter', '保存（发布）'],
    ['⌘/Ctrl + B / I', '加粗 / 斜体'],
    ['⌘/Ctrl + K', '插入链接'],
    ['⌘/Ctrl + Shift + P', '切换预览'],
    ['⌘/Ctrl + Shift + F', '沉浸/专注模式'],
    ['⌘/Ctrl + Shift + M', '插入图片'],
    ['Tab / Shift + Tab', '缩进 / 反缩进'],
    ['Esc', '关闭编辑器']
  ];

  /* ---------------- 编辑器主体 ---------------- */
  var state = null;
  var ctx = null;
  var root = null;

  function ensureRoot() {
    if (root && document.body.contains(root)) return root;
    root = document.createElement('div');
    root.id = 'ae-mask';
    root.className = 'ae-mask';
    root.hidden = true;
    root.innerHTML = [
      '<div class="ae-window window" id="ae-window" role="dialog" aria-modal="true" aria-label="写作编辑器">',
      '  <div class="window-title ae-titlebar" id="ae-titlebar">',
      '    <span class="ae-title" id="ae-title">✎ 写新文章</span>',
      '    <span class="ae-title-right">',
      '      <span class="ae-state" id="ae-state">—</span>',
      '      <button class="ae-mini" id="ae-zen-btn" type="button" title="专注模式（隐藏侧栏）">专注</button>',
      '      <button class="ae-mini" id="ae-full-btn" type="button" title="最大化 / 还原">□</button>',
      '      <span class="window-controls"><i id="ae-close" role="button" title="关闭（Esc）">×</i></span>',
      '    </span>',
      '  </div>',
      '  <div class="ae-body">',
      '    <aside class="ae-side" id="ae-side">',
      '      <section class="ae-card">',
      '        <h4>文章信息 <button class="ae-mini" id="ae-yaml-btn" type="button" title="查看/复制 front-matter">YAML</button></h4>',
      '        <div class="ae-field"><label>标题 <span id="ae-title-count">0</span>/80</label><input id="ae-f-title" type="text" maxlength="80" placeholder="这篇文章叫什么"></div>',
      '        <div class="ae-field"><label>文件名（.md）</label><input id="ae-f-file" type="text" placeholder="my-post"></div>',
      '        <div class="ae-row">',
      '          <div class="ae-field"><label>发布时间</label><input id="ae-f-date" type="text" placeholder="YYYY-MM-DD HH:mm:ss"></div>',
      '        </div>',
      '        <div class="ae-row"><button class="ae-mini" id="ae-now-btn" type="button">设为现在</button><button class="ae-mini" id="ae-updated-btn" type="button">标记已更新</button></div>',
      '      </section>',
      '      <section class="ae-card">',
      '        <h4>标签 <span class="ae-hint" id="ae-tag-suggest-count"></span></h4>',
      '        <div class="ae-row"><input id="ae-tag-input" type="text" placeholder="回车添加标签"><button class="ae-mini" id="ae-tag-add" type="button">加</button></div>',
      '        <div class="ae-chips" id="ae-tag-list"></div>',
      '        <h4 style="margin-top:.55rem">分类</h4>',
      '        <div class="ae-row"><input id="ae-cat-input" type="text" placeholder="回车添加分类"><button class="ae-mini" id="ae-cat-add" type="button">加</button></div>',
      '        <div class="ae-chips" id="ae-cat-list"></div>',
      '      </section>',
      '      <section class="ae-card">',
      '        <h4>摘要与封面</h4>',
      '        <div class="ae-field"><label>摘要（列表页显示）</label><textarea id="ae-f-excerpt" rows="3" maxlength="300" placeholder="留空则自动取正文开头"></textarea></div>',
      '        <div class="ae-field"><label>封面图</label><input id="ae-f-cover" type="text" placeholder="/images/uploads/xxx.png"></div>',
      '        <div class="ae-row"><button class="ae-mini" id="ae-cover-upload" type="button">上传封面</button><button class="ae-mini" id="ae-cover-clear" type="button">清除</button></div>',
      '        <div id="ae-cover-preview"></div>',
      '      </section>',
      '      <section class="ae-card">',
      '        <h4>发布前检查</h4>',
      '        <div id="ae-checklist"></div>',
      '      </section>',
            '      <section class="ae-card">',
      '        <h4>快捷键</h4>',
      '        <div id="ae-shortcuts"></div>',
      '      </section>',
      '    </aside>',
      '    <div class="ae-main">',
      '      <div class="ae-toolbar" id="ae-toolbar">',
      '        <button data-ae="h2" title="二级标题">H2</button>',
      '        <button data-ae="h3" title="三级标题">H3</button>',
      '        <span class="ae-tool-sep"></span>',
      '        <button data-ae="bold" title="加粗"><b>B</b></button>',
      '        <button data-ae="italic" title="斜体"><i>I</i></button>',
      '        <button data-ae="strike" title="删除线"><s>S</s></button>',
      '        <button data-ae="mark" title="高亮">🖍</button>',
      '        <span class="ae-tool-sep"></span>',
      '        <button data-ae="link" title="链接（Ctrl+K）">🔗</button>',
      '        <button data-ae="image" title="图片（Ctrl+Shift+M）">🖼</button>',
      '        <button data-ae="code" title="行内代码">&lt;/&gt;</button>',
      '        <button data-ae="codeblock" title="代码块">▤</button>',
      '        <span class="ae-tool-sep"></span>',
      '        <button data-ae="ul" title="无序列表">•</button>',
      '        <button data-ae="ol" title="有序列表">1.</button>',
      '        <button data-ae="task" title="待办清单">☑</button>',
      '        <button data-ae="quote" title="引用">❝</button>',
      '        <button data-ae="table" title="表格">▦</button>',
      '        <button data-ae="hr" title="分隔线">─</button>',
      '        <span class="ae-tool-sep"></span>',
      '        <button data-ae="undo" title="撤销（Ctrl+Z）">↺</button>',
      '        <button data-ae="redo" title="重做">↻</button>',
      '        <span class="ae-right">',
      '          <button data-ae="template" title="套用模板（可随时换）">模板</button>',
'          <button data-ae="snippet" title="插入片段">片段</button>',
      '          <button data-ae="uploads" title="最近上传的图片">图库</button>',
      '          <button data-ae="history" title="历史草稿版本">历史</button>',
      '          <button data-ae="preview" title="切换预览（Ctrl+Shift+P）" class="is-on">预览</button>',
      '        </span>',
      '      </div>',
      '      <div class="ae-panes" id="ae-panes">',
      '        <div class="ae-editor-wrap" id="ae-editor-wrap">',
      '          <textarea class="ae-content inset-input" id="ae-content" spellcheck="false" placeholder="在这里写正文，支持 Markdown…"></textarea>',
      '        </div>',
      '        <div class="ae-splitter" id="ae-splitter" title="拖动调整宽度"></div>',
      '        <div class="ae-preview-wrap" id="ae-preview-wrap">',
      '          <div class="ae-preview" id="ae-preview"></div>',
      '        </div>',
      '      </div>',
      '      <div class="ae-stats" id="ae-stats"></div>',
      '      <div class="ae-actions">',
      '        <button class="bevel-button" id="ae-save" type="button">保存并重新生成 ✓</button>',
      '        <button class="bevel-button" id="ae-draft" type="button" title="写入网站文件，并标记 published: false（不在网站列出）">存为草稿（不进网站）</button>',
      '        <button class="bevel-button" id="ae-cancel" type="button">取消</button>',
      '        <span class="ae-spacer"></span>',
      '        <span class="ae-hint" id="ae-save-hint"></span>',
      '        <a class="ae-mini" id="ae-view" href="#" target="_blank" hidden>在网站查看 ↗</a>',
      '      </div>',
      '    </div>',
      '    <aside class="ae-outline"><section class="ae-card"><h4>大纲 <span class="ae-hint" id="ae-toc-count"></span></h4><div id="ae-toc"></div></section></aside>',
      '  </div>',
      '  <input type="file" id="ae-file" accept="image/*" hidden>',
      '</div>'
    ].join('\n');
    document.body.appendChild(root);
    bindAll();
    return root;
  }

  function setState(text, cls) {
    var el = $('#ae-state');
    el.textContent = text;
    el.className = 'ae-state' + (cls ? ' ' + cls : '');
  }

  function toast(msg, ok) { if (ctx && ctx.toast) ctx.toast(msg, ok); }

  /* ---------------- 保存 ---------------- */
  function collect() {
    var fm = {
      title: $('#ae-f-title').value.trim(),
      date: $('#ae-f-date').value.trim(),
      updated: state.fm.updated || '',
      tags: state.fm.tags.slice(),
      categories: state.fm.categories.slice(),
      excerpt: $('#ae-f-excerpt').value.trim(),
      cover: $('#ae-f-cover').value.trim(),
      toc: state.fm.toc,
      published: state.fm.published
    };
    return { fm: fm, body: $('#ae-content').value };
  }

  function snapshot() {
    var c = collect();
    return { fm: c.fm, body: c.body, chars: c.body.length, at: Date.now() };
  }

  function saveLocal() {
    if (!state) return;
    var snap = snapshot();
    saveDraftRaw(state.key, snap);
    pushHistory(state.key, snap);
    setState('本机备份 ' + new Date().toTimeString().slice(0, 8) + '（未写入网站）', 'is-dirty');
  }
  var saveLocalDebounced = debounce(saveLocal, 1200);

  function markDirty() { if (!state || state.saving) return; state.dirty = true; setState('未保存 · 自动存草稿中…', 'is-dirty'); saveLocalDebounced(); refreshStats(); renderOutline(); renderChecklist(); }

  function saveToServer(asDraft) {
    if (!state || state.saving) return;
    var c = collect();
    if (!c.fm.title) { toast('标题不能为空', false); $('#ae-f-title').focus(); return; }
    if (!c.body.trim()) { toast('正文不能为空', false); $('#ae-content').focus(); return; }
    if (asDraft) {
      c.fm.published = 'false';
      if (!c.fm.date) c.fm.date = fmtDateTime(new Date());
    } else {
      c.fm.published = '';
      if (!c.fm.date) c.fm.date = fmtDateTime(new Date());
    }
    var full = serializeFront(c.fm) + c.body.replace(/^\s+/, '');
    state.saving = true;
    setState('保存中…', 'is-busy');

    function finish(d, finalFile) {
      state.saving = false;
      state.dirty = false;
      state.fm = Object.assign({}, c.fm);
      clearDraft(state.key);
      setState('已保存 ' + new Date().toTimeString().slice(0, 8), 'is-saved');
      toast((asDraft ? '已存为草稿' : '已保存') + '，网站正在重新生成（几秒后生效）', true);
      if (finalFile) {
        state.file = finalFile;
        var link = $('#ae-view');
        link.hidden = false;
        var perma = d && d.post && d.post.permalink ? d.post.permalink : '';
        link.href = perma || '/';
        link.textContent = perma ? '在网站查看 ↗' : '回到首页 ↗';
        $('#ae-f-file').value = finalFile.replace(/\.md$/, '');
        $('#ae-f-file').readOnly = true;
        $('#ae-title').textContent = '✎ 编辑：' + finalFile;
      }
      if (ctx && ctx.onSaved) ctx.onSaved(d);
      renderChecklist();
    }

    if (state.file) {
      ctx.api('/api/posts', { method: 'PUT', body: JSON.stringify({ file: state.file, content: full }) })
        .then(function (d) {
          if (!d.ok) { state.saving = false; setState('保存失败', 'is-error'); toast(d.error || '保存失败', false); return; }
          finish(d, state.file);
        })
        .catch(function () { state.saving = false; setState('保存失败', 'is-error'); toast('保存失败（网络或服务未启动）', false); });
    } else {
      var filename = $('#ae-f-file').value.trim().replace(/\.md$/, '');
      if (!filename) {
        filename = c.fm.title.replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || ('post-' + Date.now());
        $('#ae-f-file').value = filename;
      }
      ctx.api('/api/posts', { method: 'POST', body: JSON.stringify({ title: c.fm.title, filename: filename, tags: c.fm.tags, content: c.body }) })
        .then(function (d) {
          if (!d.ok) { state.saving = false; setState('保存失败', 'is-error'); toast(d.error || '保存失败', false); return; }
          var file = d.post && d.post.file ? d.post.file : (filename.replace(/[^\w\-\u4e00-\u9fa5]/g, '-') + '.md');
          // 新建时后端只写 title/date/tags，这里再用完整 front-matter 覆盖一次（分类/摘要/封面/草稿）
          if (!asDraft && !c.fm.categories.length && !c.fm.excerpt && !c.fm.cover) { finish(d, file); return; }
          ctx.api('/api/posts', { method: 'PUT', body: JSON.stringify({ file: file, content: full }) })
            .then(function (d2) { finish(d2.ok ? d2 : d, file); })
            .catch(function () { finish(d, file); });
        })
        .catch(function () { state.saving = false; setState('保存失败', 'is-error'); toast('保存失败（网络或服务未启动）', false); });
    }
  }

  /* ---------------- 预览 / 统计 / 大纲 / 检查 ---------------- */
  function refreshPreview() {
    var wrap = $('#ae-preview-wrap');
    if (wrap.hidden) return;
    $('#ae-preview').innerHTML = mdRender($('#ae-content').value) || '<p class="ae-hint">（预览区）</p>';
  }

  var previewSoon = debounce(refreshPreview, 250);

  function refreshStats() {
    var a = analyze($('#ae-content').value);
    var excerpt = $('#ae-f-excerpt').value.trim();
    var tags = state.fm.tags.length;
    $('#ae-stats').innerHTML =
      '字数 <b>' + a.chars + '</b>（中文 ' + a.cjk + ' · 英文词 ' + a.words + '）' +
      ' · 段落 <b>' + a.paragraphs + '</b>' +
      ' · 约 <b>' + a.minutes + '</b> 分钟读完' +
      ' · 标签 <b>' + tags + '</b>' +
      ' · 摘要 <b>' + excerpt.length + '</b> 字' +
      ' · 封面 ' + ($('#ae-f-cover').value.trim() ? '✅' : '—') +
      ' · ' + (state.fm.published === 'false' ? '<b>草稿（不在网站显示）</b>' : '公开发布');
    $('#ae-title-count').textContent = $('#ae-f-title').value.length;
  }

  function renderOutline() {
    var a = analyze($('#ae-content').value);
    $('#ae-toc-count').textContent = a.headings.length ? a.headings.length + ' 节' : '';
    if (!a.headings.length) { $('#ae-toc').innerHTML = '<p class="ae-hint">写 ## 二级标题 后这里会出现大纲</p>'; return; }
    $('#ae-toc').innerHTML = a.headings.map(function (h, i) {
      return '<button class="ae-toc-link ae-toc-l' + h.level + '" data-i="' + i + '" data-pos="' + h.index + '" type="button">' + esc(h.text) + '</button>';
    }).join('');
  }

  function renderChecklist() {
    var title = $('#ae-f-title').value.trim();
    var file = ($('#ae-f-file').value || '').trim();
    var body = $('#ae-content').value;
    var tags = state.fm.tags;
    var items = [
      ['标题已填', !!title],
      ['正文已写（' + body.replace(/\s/g, '').length + ' 字）', body.replace(/\s/g, '').length >= 20],
      [state.file ? '文件名（已固定）' : '文件名已填', state.file ? true : /^[\w\-.\u4e00-\u9fa5]+$/.test(file)],
      ['至少 1 个标签（建议）', tags.length > 0],
      ['有摘要（列表页更好看）', $('#ae-f-excerpt').value.trim().length > 0],
      ['有封面图（可选）', $('#ae-f-cover').value.trim().length > 0],
      ['有大纲结构（≥1 个 ## ）', /^##\s+/m.test(body)]
    ];
    $('#ae-checklist').innerHTML = items.map(function (it) {
      var ok = it[1];
      return '<div class="ae-check ' + (ok ? 'is-ok' : 'is-bad') + '"><span>' + (ok ? '✔' : '○') + '</span><span>' + esc(it[0]) + '</span></div>';
    }).join('');
    if (file && !state.file && /\s/.test(file)) $('#ae-f-file').value = file.replace(/\s+/g, '-');
  }

  /* ---------------- 标签 / 分类 ---------------- */
  function renderTags() {
    $('#ae-tag-list').innerHTML = state.fm.tags.map(function (t, i) {
      return '<span class="ae-tag-edit">' + esc(t) + '<i data-tag="' + i + '" title="移除">×</i></span>';
    }).join('') || '<span class="ae-hint">还没有标签</span>';
    renderChecklist();
  }
  function renderCats() {
    $('#ae-cat-list').innerHTML = state.fm.categories.map(function (t, i) {
      return '<span class="ae-tag-edit">' + esc(t) + '<i data-cat="' + i + '" title="移除">×</i></span>';
    }).join('') || '<span class="ae-hint">还没有分类</span>';
  }

  /* ---------------- 图片 ---------------- */
  function insertAtCursor(text) {
    // 插入类操作后由调用方统一刷新预览
    var ta = $('#ae-content');
    var s = ta.selectionStart, e = ta.selectionEnd;
    ta.setRangeText(text, s, e, 'end');
    ta.focus();
    markDirty();
    refreshPreview();
  }
  function uploadImage(file) {
    if (!file || !/^image\//.test(file.type)) { toast('只支持图片文件', false); return; }
    if (file.size > 10 * 1024 * 1024) { toast('图片不能超过 10MB', false); return; }
    setState('上传图片中…', 'is-busy');
    var fr = new FileReader();
    fr.onload = function () {
      ctx.api('/api/upload', { method: 'POST', body: JSON.stringify({ name: file.name, data: String(fr.result).split(',')[1] }) })
        .then(function (d) {
          if (!d.ok) { setState('上传失败', 'is-error'); toast(d.error || '上传失败', false); return; }
          rememberUpload(d.url);
          insertAtCursor('\n![' + (file.name || '图片').replace(/\.[^.]+$/, '') + '](' + d.url + ')\n');
          setState('图片已插入', 'is-saved');
          toast('图片已上传并插入', true);
        })
        .catch(function () { setState('上传失败', 'is-error'); toast('上传失败', false); });
    };
    fr.readAsDataURL(file);
  }
  function insertImageByUrl() {
    var url = prompt('图片地址（也可用 /images/uploads/xxx.png）', recentUploads()[0] || '');
    if (!url) return;
    insertAtCursor('\n![](' + url.trim() + ')\n');
  }

  /* ---------------- 弹层 ---------------- */
  var pop = null;
  var keepPopUntil = 0;
  function closePop(force) { if (!force && Date.now() < keepPopUntil) return; if (pop) { pop.remove(); pop = null; } }
  function showPop(anchor, html) {
    closePop(true);
    keepPopUntil = Date.now() + 400;
    pop = document.createElement('div');
    pop.className = 'ae-pop window';
    pop.innerHTML = html;
    document.body.appendChild(pop);
    var r = anchor.getBoundingClientRect();
    pop.style.left = Math.max(8, Math.min(window.innerWidth - pop.offsetWidth - 8, r.left)) + 'px';
    pop.style.top = Math.min(window.innerHeight - pop.offsetHeight - 8, r.bottom + 6) + 'px';
  }

  function showSnippets(anchor) {
    showPop(anchor, '<div class="ae-pop-title">插入片段</div><div id="ae-snip-list"></div>');
    var box = $('#ae-snip-list');
    box.innerHTML = SNIPPETS.map(function (s, i) { return '<button class="ae-mini" data-snip="' + i + '" type="button">' + esc(s.name) + '</button>'; }).join('');
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-snip]');
      if (!b) return;
      insertAtCursor(SNIPPETS[Number(b.dataset.snip)].text);
      closePop();
    });
  }

  function applyTemplate(key) {
    var t = TEMPLATES[key];
    if (!t) return;
    var ta = $('#ae-content');
    var hasContent = ta.value.replace(/\s/g, '').length > 0;
    if (hasContent) {
      var ok = confirm('正文里已经有内容了。\n\n确定 = 用模板【' + t.name + '】替换当前正文\n取消 = 把模板追加到正文末尾');
      pushUndo();
      if (ok) ta.value = t.body;
      else ta.value = ta.value.replace(/\s*$/, '') + '\n\n' + t.body;
    } else {
      ta.value = t.body;
    }
    history_.stack = [{ v: ta.value, s: 0 }];
    history_.index = 0;
    ta.focus();
    refreshStats(); renderOutline(); refreshPreview(); renderChecklist(); markDirty();
    toast('已套用模板：' + t.name, true);
  }

  function showTemplates(anchor) {
    showPop(anchor, '<div class="ae-pop-title">套用模板</div><div id="ae-tpl2"></div>');
    var box = $('#ae-tpl2');
    var empty = $('#ae-content').value.replace(/\s/g, '').length === 0;
    box.innerHTML = '<div class="ae-pop-title">' + (empty ? '会直接写入正文' : '正文非空：会问你「替换」还是「追加」') + '</div>' +
      Object.keys(TEMPLATES).map(function (k) {
        return '<button class="ae-mini" data-tpl2="' + k + '" type="button">' + esc(TEMPLATES[k].name) + '</button>';
      }).join('');
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-tpl2]');
      if (!b) return;
      closePop();
      applyTemplate(b.dataset.tpl2);
    });
  }

  function showUploads(anchor) {
    var list = recentUploads();
    if (!list.length) { toast('这台电脑还没有上传记录', false); return; }
    showPop(anchor, '<div class="ae-pop-title">最近上传（点击插入）</div><div class="ae-media-grid" id="ae-media"></div>');
    $('#ae-media').innerHTML = list.map(function (u) { return '<img src="' + esc(u) + '" data-u="' + esc(u) + '" alt="">'; }).join('');
    $('#ae-media').addEventListener('click', function (e) {
      var img = e.target.closest('img');
      if (!img) return;
      insertAtCursor('\n![](' + img.dataset.u + ')\n');
      closePop();
    });
  }

  function showHistory(anchor) {
    var list = loadHistory(state.key);
    if (!list.length) { toast('还没有历史版本（写一会儿就会自动记录）', false); return; }
    showPop(anchor, '<div class="ae-pop-title">历史版本（点击恢复，当前内容会被覆盖）</div><div id="ae-hist"></div>');
    $('#ae-hist').innerHTML = list.map(function (h, i) {
      var d = new Date(h.at);
      return '<button class="ae-mini" data-h="' + i + '" type="button">' +
        d.toLocaleString() + ' · ' + (h.chars || 0) + ' 字</button>';
    }).join('');
    $('#ae-hist').addEventListener('click', function (e) {
      var b = e.target.closest('[data-h]');
      if (!b) return;
      var h = loadHistory(state.key)[Number(b.dataset.h)];
      if (!h) return;
      if (!confirm('用这个历史版本覆盖当前内容？')) return;
      applySnapshot(h);
      closePop();
    });
  }

  function showYaml() {
    var c = collect();
    var yaml = serializeFront(c.fm);
    showPop($('#ae-yaml-btn'), '<div class="ae-pop-title">front-matter（会自动写入文件）</div>' +
      '<textarea class="ae-field" rows="8" readonly style="width:100%;font-family:monospace;font-size:.72rem">' + esc(yaml) + '</textarea>' +
      '<button class="ae-mini" id="ae-copy-yaml" type="button">复制</button>');
    $('#ae-copy-yaml').addEventListener('click', function () {
      var ta = $('#ae-yaml-btn');
      navigator.clipboard.writeText(yaml).then(function () { toast('已复制 front-matter', true); closePop(); })
        .catch(function () { toast('复制失败，手动选中复制吧', false); });
    });
  }

  function applySnapshot(snap) {
    if (snap.fm) {
      state.fm = Object.assign({}, state.fm, {
        title: snap.fm.title || '', date: snap.fm.date || '', updated: snap.fm.updated || '',
        tags: (snap.fm.tags || []).slice(), categories: (snap.fm.categories || []).slice(),
        excerpt: snap.fm.excerpt || '', cover: snap.fm.cover || '',
        toc: snap.fm.toc || '', published: snap.fm.published || ''
      });
    }
    $('#ae-f-title').value = state.fm.title;
    $('#ae-f-date').value = state.fm.date;
    $('#ae-f-excerpt').value = state.fm.excerpt;
    $('#ae-f-cover').value = state.fm.cover;
    $('#ae-content').value = snap.body || '';
    renderTags(); renderCats(); renderCover(); refreshStats(); renderOutline(); refreshPreview();
    markDirty();
  }

  function renderCover() {
    var url = $('#ae-f-cover').value.trim();
    $('#ae-cover-preview').innerHTML = url ? '<img class="ae-cover-preview" src="' + esc(url) + '" alt="封面预览">' : '';
  }

  /* ---------------- 工具栏 ---------------- */
  var history_ = { stack: [], index: -1 };
  function pushUndo() {
    var ta = $('#ae-content');
    history_.stack = history_.stack.slice(0, history_.index + 1);
    history_.stack.push({ v: ta.value, s: ta.selectionStart });
    if (history_.stack.length > 80) history_.stack.shift();
    history_.index = history_.stack.length - 1;
  }
  function undo() {
    if (history_.index <= 0) { toast('没有更早的记录了', false); return; }
    history_.index--;
    applyUndo();
  }
  function redo() {
    if (history_.index >= history_.stack.length - 1) return;
    history_.index++;
    applyUndo();
  }
  function applyUndo() {
    var h = history_.stack[history_.index];
    if (!h) return;
    var ta = $('#ae-content');
    ta.value = h.v;
    ta.selectionStart = ta.selectionEnd = h.s;
    ta.focus();
    refreshStats(); renderOutline(); refreshPreview();
  }

  function surround(before, after, placeholder) {
    var ta = $('#ae-content');
    pushUndo();
    var s = ta.selectionStart, e = ta.selectionEnd;
    var sel = ta.value.slice(s, e) || placeholder || '';
    ta.setRangeText(before + sel + after, s, e, 'end');
    ta.focus();
    markDirty(); refreshPreview();
  }
  function prefixLines(prefix, placeholder) {
    var ta = $('#ae-content');
    pushUndo();
    var s = ta.selectionStart, e = ta.selectionEnd;
    var block = ta.value.slice(s, e) || placeholder || '';
    var lines = block.split('\n').map(function (l) { return prefix + l; });
    ta.setRangeText(lines.join('\n'), s, e, 'end');
    ta.focus();
    markDirty(); refreshPreview();
  }
  function insertBlock(text) { pushUndo(); insertAtCursor(text); }

  function runToolbar(act, anchor) {
    var ta = $('#ae-content');
    switch (act) {
      case 'h2': prefixLines('## ', '小节标题'); break;
      case 'h3': prefixLines('### ', '小节标题'); break;
      case 'bold': surround('**', '**', '加粗文字'); break;
      case 'italic': surround('*', '*', '斜体文字'); break;
      case 'strike': surround('~~', '~~', '删除线'); break;
      case 'mark': surround('==', '==', '高亮'); break;
      case 'link': {
        var url = prompt('链接地址', 'https://');
        if (!url) return;
        surround('[', '](' + url + ')', '链接文字'); break;
      }
      case 'code': surround('`', '`', 'code'); break;
      case 'codeblock': {
        var lang = prompt('代码语言（可留空：js / python / bash…）', 'js');
        if (lang === null) return;
        insertBlock('\n```' + (lang || '') + '\n// 代码\n```\n'); break;
      }
      case 'ul': prefixLines('- ', '列表项'); break;
      case 'ol': prefixLines('1. ', '列表项'); break;
      case 'task': prefixLines('- [ ] ', '待办'); break;
      case 'quote': prefixLines('> ', '引用内容'); break;
      case 'table': insertBlock('\n| 列一 | 列二 | 列三 |\n| --- | --- | --- |\n|  |  |  |\n'); break;
      case 'hr': insertBlock('\n---\n'); break;
      case 'undo': undo(); break;
      case 'redo': redo(); break;
      case 'template': showTemplates(anchor); break;
      case 'snippet': showSnippets(anchor); break;
      case 'uploads': showUploads(anchor); break;
      case 'history': showHistory(anchor); break;
      case 'preview': togglePreview(); break;
      case 'image': $('#ae-file').click(); break;
    }
  }

  function togglePreview(force) {
    var wrap = $('#ae-preview-wrap'), spl = $('#ae-splitter'), btn = document.querySelector('[data-ae="preview"]');
    var show = typeof force === 'boolean' ? force : wrap.hidden;
    wrap.hidden = !show;
    spl.style.display = show ? '' : 'none';
    $('#ae-editor-wrap').style.flex = show ? '1 1 50%' : '1 1 100%';
    if (btn) btn.classList.toggle('is-on', show);
    if (show) refreshPreview();
  }

  function toggleZen() {
    var w = $('#ae-window');
    w.classList.toggle('ae-focus');
    var btn = $('#ae-zen-btn');
    btn.classList.toggle('is-on');
    btn.textContent = w.classList.contains('ae-focus') ? '退出专注' : '专注';
  }

  /* ---------------- 快捷键 ---------------- */
  function onKey(e) {
    if (!state) return;
    var meta = e.ctrlKey || e.metaKey;
    var k = e.key.toLowerCase();
    if (e.key === 'Escape') { closeEditor(); return; }
    if (meta && e.shiftKey && k === 'p') { e.preventDefault(); togglePreview(); return; }
    if (meta && e.shiftKey && k === 'f') { e.preventDefault(); toggleZen(); return; }
    if (meta && e.shiftKey && k === 'm') { e.preventDefault(); $('#ae-file').click(); return; }
    if (meta && k === 's') { e.preventDefault(); saveToServer(false); return; }
    if (meta && e.key === 'Enter') { e.preventDefault(); saveToServer(false); return; }
    if (meta && k === 'b') { e.preventDefault(); surround('**', '**', '加粗文字'); return; }
    if (meta && k === 'i') { e.preventDefault(); surround('*', '*', '斜体文字'); return; }
    if (meta && k === 'k') {
      e.preventDefault();
      var url = prompt('链接地址', 'https://');
      if (url) surround('[', '](' + url + ')', '链接文字');
      return;
    }
    if (e.key === 'Tab' && (e.target.id === 'ae-content')) {
      e.preventDefault();
      var ta = e.target;
      pushUndo();
      if (e.shiftKey) {
        var before = ta.value.slice(0, ta.selectionStart);
        var lineStart = before.lastIndexOf('\n') + 1;
        if (ta.value.slice(lineStart, lineStart + 2) === '  ') {
          ta.setRangeText('', lineStart, lineStart + 2, 'preserve');
        }
      } else {
        ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end');
      }
      markDirty();
    }
  }

  /* ---------------- 事件绑定 ---------------- */
  var bound = false;
  function bindAll() {
    if (bound) return;
    bound = true;
    root.addEventListener('click', function (e) {
      if (e.target === root) closeEditor();
      if (!e.target.closest('.ae-pop') && !e.target.closest('[data-ae="template"],[data-ae="snippet"],[data-ae="uploads"],[data-ae="history"],#ae-yaml-btn')) closePop();
    });
    $('#ae-close').addEventListener('click', closeEditor);
    $('#ae-cancel').addEventListener('click', closeEditor);
    $('#ae-save').addEventListener('click', function () { saveToServer(false); });
    $('#ae-draft').addEventListener('click', function () { saveToServer(true); });
    $('#ae-zen-btn').addEventListener('click', toggleZen);
    $('#ae-full-btn').addEventListener('click', function () {
      var w = $('#ae-window');
      if (w.classList.contains('ae-zen')) { w.classList.remove('ae-zen'); this.textContent = '□'; }
      else { w.classList.add('ae-zen'); this.textContent = '❐'; }
    });
    $('#ae-yaml-btn').addEventListener('click', showYaml);

    $('#ae-content').addEventListener('input', function () { markDirty(); previewSoon(); });
    $('#ae-f-title').addEventListener('input', markDirty);
    $('#ae-f-excerpt').addEventListener('input', markDirty);
    $('#ae-f-cover').addEventListener('input', function () { renderCover(); markDirty(); });
    $('#ae-f-file').addEventListener('input', markDirty);
    $('#ae-f-date').addEventListener('input', markDirty);
    $('#ae-now-btn').addEventListener('click', function () { $('#ae-f-date').value = fmtDateTime(new Date()); markDirty(); });
    $('#ae-updated-btn').addEventListener('click', function () { state.fm.updated = fmtDateTime(new Date()); toast('已标记「更新于」', true); markDirty(); });

    function addTag() {
      var v = $('#ae-tag-input').value.trim().replace(/[,，]$/, '');
      if (!v) return;
      if (state.fm.tags.indexOf(v) < 0) state.fm.tags.push(v);
      $('#ae-tag-input').value = '';
      renderTags(); markDirty();
    }
    function addCat() {
      var v = $('#ae-cat-input').value.trim().replace(/[,，]$/, '');
      if (!v) return;
      if (state.fm.categories.indexOf(v) < 0) state.fm.categories.push(v);
      $('#ae-cat-input').value = '';
      renderCats(); markDirty();
    }
    $('#ae-tag-add').addEventListener('click', addTag);
    $('#ae-cat-add').addEventListener('click', addCat);
    $('#ae-tag-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addTag(); } });
    $('#ae-cat-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addCat(); } });
    $('#ae-tag-list').addEventListener('click', function (e) {
      var i = e.target.closest('[data-tag]');
      if (!i) return;
      state.fm.tags.splice(Number(i.dataset.tag), 1);
      renderTags(); markDirty();
    });
    $('#ae-cat-list').addEventListener('click', function (e) {
      var i = e.target.closest('[data-cat]');
      if (!i) return;
      state.fm.categories.splice(Number(i.dataset.cat), 1);
      renderCats(); markDirty();
    });

    $('#ae-toolbar').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-ae]');
      if (!btn) return;
      runToolbar(btn.dataset.ae, btn);
    });

    $('#ae-content').addEventListener('paste', function (e) {
      var items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image/') === 0) { e.preventDefault(); uploadImage(items[i].getAsFile()); return; }
      }
    });
    $('#ae-content').addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) { e.preventDefault(); uploadImage(e.dataTransfer.files[0]); }
    });
    $('#ae-content').addEventListener('dragover', function (e) { e.preventDefault(); });
    $('#ae-file').addEventListener('change', function () { if (this.files[0]) uploadImage(this.files[0]); this.value = ''; });
    $('#ae-cover-upload').addEventListener('click', function () {
      var input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = function () {
        var f = input.files[0];
        if (!f) return;
        var fr = new FileReader();
        fr.onload = function () {
          ctx.api('/api/upload', { method: 'POST', body: JSON.stringify({ name: f.name, data: String(fr.result).split(',')[1] }) })
            .then(function (d) {
              if (!d.ok) { toast(d.error || '上传失败', false); return; }
              rememberUpload(d.url);
              $('#ae-f-cover').value = d.url;
              renderCover(); markDirty();
            });
        };
        fr.readAsDataURL(f);
      };
      input.click();
    });
    $('#ae-cover-clear').addEventListener('click', function () { $('#ae-f-cover').value = ''; renderCover(); markDirty(); });



    $('#ae-toc').addEventListener('click', function (e) {
      var b = e.target.closest('[data-pos]');
      if (!b) return;
      var ta = $('#ae-content');
      var pos = Number(b.dataset.pos);
      ta.focus();
      ta.selectionStart = ta.selectionEnd = pos;
      // 让目标行滚到可见位置
      var before = ta.value.slice(0, pos);
      var lines = before.split('\n').length;
      var lh = 1.7 * parseFloat(getComputedStyle(ta).fontSize || 13);
      ta.scrollTop = Math.max(0, (lines - 4) * lh);
    });

    // 拖动分栏
    (function initSplitter() {
      var sp = $('#ae-splitter'), panes = $('#ae-panes'), dragging = false;
      sp.addEventListener('mousedown', function (e) {
        dragging = true; document.body.style.userSelect = 'none'; e.preventDefault();
      });
      document.addEventListener('mousemove', function (e) {
        if (!dragging) return;
        var r = panes.getBoundingClientRect();
        var ratio = Math.min(0.8, Math.max(0.2, (e.clientX - r.left) / r.width));
        $('#ae-editor-wrap').style.flex = '0 0 ' + (ratio * 100) + '%';
        $('#ae-preview-wrap').style.flex = '1 1 auto';
      });
      document.addEventListener('mouseup', function () { dragging = false; document.body.style.userSelect = ''; });
    })();

    // 拖动窗口
    (function initDrag() {
      var bar = $('#ae-titlebar'), win = $('#ae-window'), dragging = false, ox = 0, oy = 0;
      bar.addEventListener('mousedown', function (e) {
        if (e.target.closest('.window-controls,button')) return;
        dragging = true; ox = e.clientX; oy = e.clientY;
        var r = win.getBoundingClientRect();
        win.style.position = 'fixed'; win.style.margin = '0';
        win.style.left = r.left + 'px'; win.style.top = r.top + 'px';
        win.classList.add('ae-dragging');
        e.preventDefault();
      });
      document.addEventListener('mousemove', function (e) {
        if (!dragging) return;
        win.style.left = Math.max(0, Math.min(window.innerWidth - 120, win.offsetLeft + (e.clientX - ox))) + 'px';
        win.style.top = Math.max(0, Math.min(window.innerHeight - 60, win.offsetTop + (e.clientY - oy))) + 'px';
        ox = e.clientX; oy = e.clientY;
      });
      document.addEventListener('mouseup', function () { dragging = false; win.classList.remove('ae-dragging'); });
    })();

    // 关闭前提醒
    window.addEventListener('beforeunload', function (e) {
      if (state && state.dirty) { e.preventDefault(); e.returnValue = ''; }
    });

    $('#ae-shortcuts').innerHTML = SHORTCUTS.map(function (s) {
      return '<div class="ae-check"><span>' + esc(s[0]) + '</span><span style="opacity:.75">' + esc(s[1]) + '</span></div>';
    }).join('');
  }

  /* 关闭 = 放弃这次改动（并清掉本机自动备份）；只有「保存」/「存为草稿」才落盘 */
  function closeEditor() {
    if (!state) return;
    if (state.dirty) {
      var giveUp = confirm('放弃这次未保存的修改？\n\n确定 = 放弃并关闭（本机自动备份也会清掉）\n取消 = 继续编辑');
      if (!giveUp) return;
      clearDraft(state.key);
      setState('已放弃修改', '');
    }
    root.hidden = true;
    document.removeEventListener('keydown', onKey);
    state = null;
    if (ctx && ctx.onClosed) ctx.onClosed();
  }

  /* ---------------- 打开 ---------------- */
  function open(options) {
    ctx = {
      api: options.api,
      toast: options.toast,
      onSaved: options.onSaved,
      onClosed: options.onClosed
    };
    ensureRoot();
    var isNew = !options.file;
    var key = options.file || 'new';
    var parsed = parseFront(options.raw || '');
    var localDraft = loadDraft(key);
    var useLocal = false;
    if (localDraft && localDraft.body != null) {
      var serverChars = (parsed.body || '').length;
      useLocal = localDraft.body.length !== serverChars || (localDraft.fm && localDraft.fm.title) !== parsed.fm.title;
    }

    state = {
      file: options.file || '',
      key: key,
      dirty: false,
      saving: false,
      fm: useLocal ? Object.assign({}, parsed.fm, localDraft.fm || {}) : parsed.fm
    };
    state.fm.tags = state.fm.tags || [];
    state.fm.categories = state.fm.categories || [];
    if (!state.fm.date) state.fm.date = fmtDateTime(new Date());

    $('#ae-title').textContent = isNew ? '✎ 写新文章' : '✎ 编辑：' + options.file;
    $('#ae-f-title').value = state.fm.title || '';
    $('#ae-f-file').value = isNew ? '' : String(options.file).replace(/\.md$/, '');
    $('#ae-f-file').readOnly = !isNew;
    $('#ae-f-date').value = state.fm.date || '';
    $('#ae-f-excerpt').value = state.fm.excerpt || '';
    $('#ae-f-cover').value = state.fm.cover || '';
    $('#ae-content').value = useLocal ? localDraft.body : (parsed.body || (isNew ? defaultTemplateBody() : ''));
    $('#ae-view').hidden = true;
    if (!isNew) {
      var link = $('#ae-view');
      link.hidden = false;
      var dateStr = (state.fm.date || '').replace(' ', 'T');
      var d = dateStr ? new Date(dateStr) : null;
      if (d && !isNaN(d)) {
        link.href = '/' + d.getFullYear() + '/' + pad2(d.getMonth() + 1) + '/' + pad2(d.getDate()) + '/' + String(options.file).replace(/\.md$/, '') + '/';
        link.textContent = '在网站查看 ↗';
      } else { link.href = '/'; link.textContent = '回到首页 ↗'; }
    }
    history_.stack = [{ v: $('#ae-content').value, s: 0 }];
    history_.index = 0;

    renderTags(); renderCats(); renderCover(); refreshStats(); renderOutline(); renderChecklist();
    togglePreview(true);
    root.hidden = false;
    setState(useLocal ? '已恢复本机备份（点取消可放弃）' : '就绪', useLocal ? 'is-dirty' : '');

    // 首次模板选择（之后随时可用工具栏「模板」按钮再换）
    if (isNew && !useLocal && !options.raw) setTimeout(function () { showTemplates($('#ae-title')); }, 80);

    document.removeEventListener('keydown', onKey);
    document.addEventListener('keydown', onKey);
    setTimeout(function () { ($('#ae-f-title').value ? $('#ae-content') : $('#ae-f-title')).focus(); }, 60);

    // 标签建议（取全站已有标签）
    ctx.api('/api/posts').then(function (d) {
      if (!d || !d.ok || !d.posts) return;
      var all = {};
      d.posts.forEach(function (p) { (p.tags || []).forEach(function (t) { all[t] = (all[t] || 0) + 1; }); });
      var tags = Object.keys(all).sort(function (a, b) { return all[b] - all[a]; }).slice(0, 14);
      $('#ae-tag-suggest-count').textContent = tags.length ? '常用：' : '';
      var old = document.getElementById('ae-tag-sug');
      if (old) old.remove();
      var box = document.createElement('div');
      box.id = 'ae-tag-sug';
      box.className = 'ae-chips';
      box.innerHTML = tags.map(function (t) { return '<button class="ae-chip" data-sug="' + esc(t) + '" type="button">' + esc(t) + '</button>'; }).join('');
      $('#ae-tag-list').parentNode.insertBefore(box, $('#ae-tag-list').nextSibling);
      var dup = document.querySelectorAll('#ae-tag-sug');
      if (dup.length > 1) dup[0].remove();
      box.addEventListener('click', function (e) {
        var b = e.target.closest('[data-sug]');
        if (!b) return;
        var t = b.dataset.sug;
        if (state.fm.tags.indexOf(t) < 0) state.fm.tags.push(t);
        renderTags(); markDirty();
      });
    }).catch(function () {});
  }

  function defaultTemplateBody() {
    return '## 写在前面\n\n\n\n## 正文\n\n\n';
  }

  window.AdminEditor = { open: open, version: '2.0', mdRender: mdRender, analyze: analyze };
})();
