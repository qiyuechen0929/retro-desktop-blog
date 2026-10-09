/* retro-desktop —— 全站管理后台 */
(function () {
  'use strict';

  var loginBox = document.getElementById('admin-login');
  if (!loginBox || !window.ADMIN_CONFIG) return;
  var API = window.ADMIN_CONFIG.api.replace(/\/$/, '');
  var LS_TOKEN = 'c-admin-token';

  var panel = document.getElementById('admin-panel');
  var tokenInput = document.getElementById('admin-token-input');
  var loginBtn = document.getElementById('admin-login-btn');
  var loginErr = document.getElementById('admin-login-err');

  function getToken() { try { return localStorage.getItem(LS_TOKEN) || ''; } catch (e) { return ''; } }
  function setToken(t) { try { t ? localStorage.setItem(LS_TOKEN, t) : localStorage.removeItem(LS_TOKEN); } catch (e) {} }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    var t = getToken();
    if (t) opts.headers['X-Admin-Token'] = t;
    return fetch(API + path, opts).then(function (r) {
      if (r.status === 403) { logout(); throw new Error('forbidden'); }
      return r.json();
    });
  }

  /* ---------- 登录 / 退出 ---------- */
  function showPanel() {
    loginBox.hidden = true;
    panel.hidden = false;
    loadAll();
  }
  function logout() {
    setToken('');
    panel.hidden = true;
    loginBox.hidden = false;
  }
  loginBtn.addEventListener('click', function () {
    var t = tokenInput.value.trim();
    if (!t) return;
    setToken(t);
    api('/api/comments/all')
      .then(function () { showPanel(); })
      .catch(function (e) {
        setToken('');
        var forbidden = e && /forbidden/i.test(String(e.message || ''));
        loginErr.textContent = forbidden
          ? '密钥不对，再想想？'
          : '连不上后台服务：请先启动 server/comments-server.js（8765），再试一次';
        loginErr.hidden = false;
      });
  });
  tokenInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') loginBtn.click();
  });
  document.getElementById('admin-logout').addEventListener('click', logout);

  /* ---------- 标签页 ---------- */
  document.querySelector('.admin-tabs').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-tab]');
    if (!btn) return;
    document.querySelectorAll('.admin-tabs [data-tab]').forEach(function (b) {
      b.classList.toggle('is-active', b === btn);
    });
    document.querySelectorAll('.admin-tab-page').forEach(function (p) {
      p.hidden = p.id !== 'tab-' + btn.dataset.tab;
    });
  });

  /* ---------- 数据加载 ---------- */
  function loadAll() {
    loadOverview();
    loadPages();
    loadFriends();
    loadSubs();
  }

  /* ---------- 轻提示 ---------- */
  var toastEl = document.getElementById('admin-toast');
  function toast(msg, ok) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    toastEl.classList.toggle('f-ok', ok !== false);
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.hidden = true; }, 3000);
  }

  /* ---------- 极简 markdown 渲染（查看/预览用） ---------- */
  function mdLite(src) {
    var html = esc(src)
      .replace(/```(\w*)\n([\s\S]*?)```/g, function (m, lang, code) {
        return '<pre>' + code + '</pre>';
      })
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">')
      .replace(/`([^`\n]+)`/g, '<code>$1</code>')
      .replace(/^###### (.*)$/gm, '<h6>$1</h6>')
      .replace(/^##### (.*)$/gm, '<h5>$1</h5>')
      .replace(/^#### (.*)$/gm, '<h4>$1</h4>')
      .replace(/^### (.*)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*)$/gm, '<h1>$1</h1>')
      .replace(/^&gt; (.*)$/gm, '<blockquote>$1</blockquote>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\*([^*\n]+)\*/g, '<i>$1</i>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/^- (.*)$/gm, '<li>$1</li>')
      .replace(/^---$/gm, '<hr>');
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
    html = html.replace(/\n{2,}/g, '<br><br>').replace(/\n/g, ' ');
    return html;
  }

  var commentsCache = null;
  function refreshCommentsCache() {
    return api('/api/comments/all').then(function (data) {
      commentsCache = data.comments || [];
      return commentsCache;
    });
  }

  function loadPages() {
    Promise.all([api('/api/posts'), api('/api/stats/pages'), refreshCommentsCache()]).then(function (rs) {
      var posts = rs[0].posts || [];
      var stats = {};
      (rs[1].pages || []).forEach(function (p) { stats[p.page] = p; });
      var box = document.getElementById('admin-pages-list');
      if (!posts.length) { box.innerHTML = '<p class="c-empty">还没有文章</p>'; return; }
      box.innerHTML =
        '<div class="admin-row admin-row-head">' +
          '<div class="admin-row-main">文章（点击行展开评论）</div>' +
          '<span class="admin-col">阅读</span><span class="admin-col">评论</span>' +
          '<span class="admin-col">获赞</span><span class="admin-col admin-col-acts">操作</span>' +
        '</div>' +
        posts.map(function (p) {
          var s = stats[p.permalink] || { views: 0, comments: 0, likes: 0 };
          return '<div class="admin-row admin-page-row" data-page="' + esc(p.permalink) + '" data-file="' + esc(p.file) + '">' +
            '<div class="admin-row-main">' +
              '<span class="admin-page-toggle">▸</span> <b>' + esc(p.title) + '</b>' +
              '<span class="c-meta"> · ' + esc((p.date || '').slice(0, 10)) + '</span> ' +
              '<a href="' + esc(p.permalink) + '" target="_blank" onclick="event.stopPropagation()" class="c-meta">查看页面 ↗</a>' +
            '</div>' +
            '<span class="admin-col">' + s.views + '</span>' +
            '<span class="admin-col">' + s.comments + '</span>' +
            '<span class="admin-col">' + s.likes + '</span>' +
            '<span class="admin-col admin-col-acts">' +
              '<button class="c-act a-view" data-file="' + esc(p.file) + '" type="button">👁</button>' +
              '<button class="c-act a-edit" data-file="' + esc(p.file) + '" type="button">✎</button>' +
              '<button class="c-act a-del" data-file="' + esc(p.file) + '" type="button">×</button>' +
            '</span>' +
          '</div>' +
          '<div class="admin-page-comments" data-page="' + esc(p.permalink) + '" hidden></div>';
        }).join('');
    }).catch(function () {});
  }

  /* ---------- 文章编辑器：交给 admin-editor.js（v2 全功能编辑器） ---------- */
  function openEditor(opts) {
    if (!window.AdminEditor) { toast('编辑器脚本没加载上（admin-editor.js）', false); return; }
    function launch(raw) {
      window.AdminEditor.open({
        api: api,
        toast: toast,
        file: opts.file || '',
        raw: raw || '',
        onSaved: function () { loadPages(); },
        onClosed: function () { loadPages(); }
      });
    }
    if (opts.file && !opts.raw) {
      api('/api/posts/raw?file=' + encodeURIComponent(opts.file)).then(function (d) {
        if (!d.ok) { toast(d.error || '读取失败', false); return; }
        launch(d.post.raw);
      }).catch(function () { toast('读取失败', false); });
      return;
    }
    launch(opts.raw);
  }

  /* ---------- 查看全文 ---------- */
  function viewPost(file, anchorRow) {
    api('/api/posts/raw?file=' + encodeURIComponent(file)).then(function (d) {
      if (!d.ok) { toast(d.error || '读取失败', false); return; }
      var old = document.querySelector('.post-reader');
      if (old) old.remove();
      var div = document.createElement('div');
      div.className = 'post-reader window';
      div.innerHTML =
        '<div class="window-title"><span>👁 ' + esc(d.post.title) + '</span>' +
        '<span class="window-controls"><i class="pr-close" role="button">×</i></span></div>' +
        '<div class="post-reader-body">' + mdLite(d.post.raw.replace(/^---[\s\S]*?---\r?\n?/, '')) + '</div>';
      anchorRow.parentNode.insertBefore(div, anchorRow.nextSibling);
      div.scrollIntoView({ behavior: 'smooth', block: 'start' });
      div.querySelector('.pr-close').addEventListener('click', function () { div.remove(); });
    });
  }

  function togglePageComments(row) {
    var page = row.dataset.page;
    var slot = row.nextElementSibling;
    if (!slot || !slot.classList.contains('admin-page-comments')) return;
    if (slot.hidden) {
      var list = (commentsCache || []).filter(function (c) { return c.page === page; });
      slot.innerHTML = list.length
        ? list.map(function (c) {
            return '<div class="admin-row admin-row-c">' +
              '<div class="admin-row-main">' +
                '<b>' + esc(c.nickname) + '</b>' +
                (c.isAdmin ? '<span class="c-badge">✦ 博主</span>' : '') +
                '<span class="c-meta">' + esc(c.time) + (c.region ? ' · 来自 ' + esc(c.region) : '') + (c.ip ? ' · IP ' + esc(c.ip) : '') + '</span>' +
                '<p>' + esc(c.content) + (c.editedAt ? ' <span class="c-edited">（已编辑）</span>' : '') + '</p>' +
                '<span class="c-meta">' + (c.parentId ? '回复 #' + c.parentId + ' · ' : '') + '♥ ' + c.likes + '</span>' +
              '</div>' +
              '<button class="c-act a-del-comment" data-id="' + c.id + '" type="button">× 删除</button>' +
            '</div>';
          }).join('')
        : '<p class="c-empty">这篇文章还没有评论</p>';
      slot.hidden = false;
      row.querySelector('.admin-page-toggle').textContent = '▾';
    } else {
      slot.hidden = true;
      row.querySelector('.admin-page-toggle').textContent = '▸';
    }
  }

  function loadOverview() {
    Promise.all([
      api('/api/comments/all'),
      api('/api/friends/all'),
      api('/api/subscribers')
    ]).then(function (rs) {
      var comments = rs[0].comments || [];
      var friends = rs[1].friends || [];
      var subs = rs[2].subscribers || [];
      var pending = friends.filter(function (f) { return f.status === 'pending'; }).length;
      var active = subs.filter(function (s) { return s.status === 'active'; }).length;
      var likes = comments.reduce(function (a, c) { return a + (c.likes || 0); }, 0);
      document.getElementById('tab-comments-n').textContent = comments.length;
      document.getElementById('tab-friends-n').textContent = pending ? '(' + pending + ' 待审)' : '';
      document.getElementById('tab-subs-n').textContent = active;
      document.getElementById('admin-stats').innerHTML = [
        ['评论总数', comments.length],
        ['获赞总数', likes],
        ['待审友链', pending],
        ['活跃订阅者', active]
      ].map(function (s) {
        return '<div class="admin-stat window"><b>' + s[1] + '</b><span>' + s[0] + '</span></div>';
      }).join('');
    }).catch(function () {});
  }

  function loadFriends() {
    api('/api/friends/all').then(function (data) {
      var pendings = data.friends.filter(function (f) { return f.status === 'pending'; });
      var others = data.friends.filter(function (f) { return f.status !== 'pending'; });
      document.getElementById('admin-friends-pending').innerHTML = pendings.length
        ? pendings.map(function (f) {
            return '<div class="f-pending-row">' +
              '<div class="f-pending-info">' +
                '<b>' + esc(f.name) + '</b> <span class="friend-url">' + esc(f.url) + '</span>' +
                '<p>' + esc(f.desc || '（无简介）') + '</p>' +
                '<span class="c-meta">' + esc(f.time) + ' · IP ' + esc(f.ip || '-') + '</span>' +
              '</div>' +
              '<div class="f-pending-acts">' +
                '<button class="bevel-button f-approve" data-id="' + f.id + '" type="button">✓ 通过</button>' +
                '<button class="bevel-button f-reject" data-id="' + f.id + '" type="button">× 拒绝</button>' +
              '</div>' +
            '</div>';
          }).join('')
        : '<p class="c-empty">没有待审核的申请</p>';
      document.getElementById('admin-friends-all').innerHTML = others.length
        ? others.map(function (f) {
            return '<div class="admin-row">' +
              '<div class="admin-row-main">' +
                '<b>' + esc(f.name) + '</b> ' +
                '<span class="admin-status admin-status-' + f.status + '">' + (f.status === 'approved' ? '已上墙' : '已拒绝') + '</span>' +
                '<p><a href="' + esc(f.url) + '" target="_blank">' + esc(f.url) + '</a></p>' +
              '</div>' +
              '<button class="c-act a-del-friend" data-id="' + f.id + '" type="button">× 删除</button>' +
            '</div>';
          }).join('')
        : '<p class="c-empty">暂无记录</p>';
    });
  }

  function loadSubs() {
    api('/api/subscribers').then(function (data) {
      var box = document.getElementById('admin-subs-list');
      if (!data.subscribers.length) { box.innerHTML = '<p class="c-empty">还没有订阅者</p>'; return; }
      box.innerHTML = data.subscribers.map(function (s) {
        return '<div class="admin-row">' +
          '<div class="admin-row-main">' +
            '<b>' + esc(s.email) + '</b> ' +
            '<span class="admin-status admin-status-' + s.status + '">' + (s.status === 'active' ? '订阅中' : '已退订') + '</span>' +
            '<span class="c-meta">' + esc(s.created_at) + '</span>' +
          '</div>' +
          '<button class="c-act a-del-sub" data-id="' + s.id + '" type="button">× 删除</button>' +
        '</div>';
      }).join('');
    });
  }

  /* ---------- 操作（事件委托） ---------- */
  document.getElementById('post-new-btn').addEventListener('click', function () {
    openEditor({ file: '', raw: '' });
  });

  document.addEventListener('click', function (e) {
    var delComment = e.target.closest('.a-del-comment');
    var delFriend = e.target.closest('.a-del-friend');
    var delSub = e.target.closest('.a-del-sub');
    var approve = e.target.closest('.f-approve');
    var reject = e.target.closest('.f-reject');
    var viewBtn = e.target.closest('.a-view');
    var editBtn2 = e.target.closest('.a-edit');
    var delPost = e.target.closest('.a-del');

    if (viewBtn || editBtn2 || delPost) {
      e.stopPropagation();
      var row = (viewBtn || editBtn2 || delPost).closest('.admin-page-row');
      var file = (viewBtn || editBtn2 || delPost).dataset.file;
      if (viewBtn) {
        viewPost(file, row);
      } else if (editBtn2) {
        api('/api/posts/raw?file=' + encodeURIComponent(file)).then(function (d) {
          if (!d.ok) { toast(d.error || '读取失败', false); return; }
          openEditor({ file: file, raw: d.post.raw });
        });
      } else {
        if (!confirm('删除这篇文章？文件会移入回收站（server/trash），可以手动恢复。')) return;
        api('/api/posts?file=' + encodeURIComponent(file), { method: 'DELETE' })
          .then(function (d) {
            if (!d.ok) { toast(d.error || '删除失败', false); return; }
            toast('已移入回收站，网站正在重新生成');
            loadPages();
          });
      }
      return;
    }

    if (delComment) {
      if (!confirm('删除这条评论？（它的回复也会一起删掉）')) return;
      api('/api/comments/' + delComment.dataset.id, { method: 'DELETE' })
        .then(function () { refreshCommentsCache().then(function () { loadOverview(); loadPages(); }); });
      return;
    }
    var pageRow = e.target.closest('.admin-page-row');
    if (pageRow) { togglePageComments(pageRow); return; }
    if (delFriend) {
      if (!confirm('删除这条友链记录？')) return;
      api('/api/friends/' + delFriend.dataset.id, { method: 'DELETE' })
        .then(function () { loadFriends(); loadOverview(); });
    } else if (delSub) {
      if (!confirm('删除这个订阅者？')) return;
      api('/api/subscribers/' + delSub.dataset.id, { method: 'DELETE' })
        .then(function () { loadSubs(); loadOverview(); });
    } else if (approve || reject) {
      var btn = approve || reject;
      api('/api/friends/' + btn.dataset.id + (approve ? '/approve' : '/reject'), { method: 'POST' })
        .then(function () { loadFriends(); loadOverview(); });
    }
  });

  /* ---------- 已登录则直接进 ---------- */
  if (getToken()) {
    api('/api/comments/all').then(showPanel).catch(function () {});
  }
})();
