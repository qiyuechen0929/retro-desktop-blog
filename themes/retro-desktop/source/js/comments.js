/* retro-desktop —— 自建评论系统前端
   像素 identicon 头像 / 嵌套回复 / 点赞 / 博主徽章 / 管理员模式 */
(function () {
  'use strict';

  var root = document.getElementById('comments');
  if (!root || !window.COMMENTS_CONFIG) return;
  var API = window.COMMENTS_CONFIG.api.replace(/\/$/, '');
  var PAGE = root.dataset.page;

  var elList = document.getElementById('c-list');
  var elCount = document.getElementById('c-count');
  var elForm = document.getElementById('c-form');
  var elNick = document.getElementById('c-nick');
  var elEmail = document.getElementById('c-email');
  var elContent = document.getElementById('c-content');
  var elError = document.getElementById('c-error');
  var elAdminToggle = document.getElementById('c-admin-toggle');

  var LS_TOKEN = 'c-admin-token';
  var LS_NICK = 'c-nickname';
  var LS_EMAIL = 'c-email';
  var LS_LIKED = 'c-liked';
  var LS_CID = 'c-client-id';

  function getToken() { try { return localStorage.getItem(LS_TOKEN) || ''; } catch (e) { return ''; } }
  function setToken(t) { try { t ? localStorage.setItem(LS_TOKEN, t) : localStorage.removeItem(LS_TOKEN); } catch (e) {} }
  function getCid() {
    try {
      var c = localStorage.getItem(LS_CID);
      if (!c) {
        c = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
        localStorage.setItem(LS_CID, c);
      }
      return c;
    } catch (e) { return ''; }
  }
  function getLiked() { try { return JSON.parse(localStorage.getItem(LS_LIKED) || '[]'); } catch (e) { return []; } }
  function setLiked(l) { try { localStorage.setItem(LS_LIKED, JSON.stringify(l)); } catch (e) {} }
  function markLiked(id) {
    var l = getLiked();
    if (l.indexOf(id) === -1) { l.push(id); setLiked(l); }
  }
  function unmarkLiked(id) {
    setLiked(getLiked().filter(function (x) { return x !== id; }));
  }
  try { elNick.value = localStorage.getItem(LS_NICK) || ''; } catch (e) {}
  try { if (elEmail) elEmail.value = localStorage.getItem(LS_EMAIL) || ''; } catch (e) {}

  /* ---------- 像素 identicon 头像 ---------- */
  function identicon(seed, size) {
    size = size || 40;
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    var ctx = canvas.getContext('2d');
    var hue = parseInt(seed.slice(0, 4), 16) % 360;
    var bg = 'hsl(' + hue + ', 60%, 88%)';
    var fg = 'hsl(' + hue + ', 65%, 55%)';
    var fg2 = 'hsl(' + ((hue + 40) % 360) + ', 70%, 65%)';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    var cell = size / 5;
    var bits = seed + seed.split('').reverse().join('');
    for (var y = 0; y < 5; y++) {
      for (var x = 0; x < 3; x++) {
        var idx = (y * 3 + x) % bits.length;
        var v = parseInt(bits[idx], 16);
        if (v % 2 === 0) continue;
        ctx.fillStyle = v % 4 === 1 ? fg2 : fg;
        ctx.fillRect(x * cell, y * cell, cell, cell);
        ctx.fillRect((4 - x) * cell, y * cell, cell, cell);
      }
    }
    return canvas.toDataURL();
  }

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function relTime(t) {
    var d = new Date(t.replace(' ', 'T'));
    var diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
    if (diff < 86400 * 30) return Math.floor(diff / 86400) + ' 天前';
    return t.slice(0, 10);
  }
  function showError(msg) {
    elError.textContent = msg;
    elError.hidden = false;
    clearTimeout(showError._t);
    showError._t = setTimeout(function () { elError.hidden = true; }, 4000);
  }
  function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    var token = getToken();
    if (token) opts.headers['X-Admin-Token'] = token;
    opts.headers['X-Client-Id'] = getCid();
    return fetch(API + path, opts).then(function (r) { return r.json(); });
  }

  /* ---------- 渲染 ---------- */
  function renderItem(c, byParent) {
    var liked = getLiked().indexOf(c.id) !== -1;
    var html = '<div class="c-item' + (c.isAdmin ? ' c-item-admin' : '') + '" data-id="' + c.id + '">' +
      '<img class="c-avatar" width="40" height="40" alt="" src="' + identicon(c.avatarSeed) + '">' +
      '<div class="c-main">' +
        '<div class="c-head">' +
          '<b class="c-name">' + esc(c.nickname) + '</b>' +
          (c.isAdmin ? '<span class="c-badge">✦ 博主</span>' : '') +
          '<span class="c-meta">' + relTime(c.time) + '</span>' +
          (c.region ? '<span class="c-meta c-region">来自 ' + esc(c.region) + '</span>'
                    : (c.ip ? '<span class="c-meta c-ip">IP ' + esc(c.ip) + '</span>' : '')) +
          (getToken() && c.ip ? '<span class="c-meta c-ip">IP ' + esc(c.ip) + '</span>' : '') +
        '</div>' +
        '<p class="c-text">' + esc(c.content).replace(/\n/g, '<br>') + '</p>' +
        (c.editedAt ? '<span class="c-edited" title="' + esc(c.editedAt) + '">（已编辑）</span>' : '') +
        '<div class="c-actions">' +
          '<button class="c-act c-like' + (liked ? ' is-liked' : '') + '" data-id="' + c.id + '" type="button" title="' + (liked ? '再点一次取消点赞' : '点赞') + '">♥ <i>' + c.likes + '</i></button>' +
          '<button class="c-act c-reply" data-id="' + c.id + '" data-nick="' + esc(c.nickname) + '" type="button">↩ 回复</button>' +
          ((getToken() || c.mine) ? '<button class="c-act c-edit" data-id="' + c.id + '" type="button">✎ 编辑</button>' : '') +
          ((getToken() || c.mine) ? '<button class="c-act c-del" data-id="' + c.id + '" type="button">× 删除</button>' : '') +
        '</div>' +
        '<div class="c-reply-slot"></div>' +
      '</div>' +
    '</div>';
    var replies = byParent[c.id] || [];
    if (replies.length) {
      html += '<div class="c-children">' + replies.map(function (r) { return renderItem(r, byParent); }).join('') + '</div>';
    }
    return html;
  }

  function load() {
    api('/api/comments?page=' + encodeURIComponent(PAGE))
      .then(function (data) {
        if (!data.ok) throw new Error(data.error || '加载失败');
        elCount.textContent = data.total;
        if (!data.comments.length) {
          elList.innerHTML = '<p class="c-empty">还没有评论——来抢沙发 ♪</p>';
          return;
        }
        var byParent = {};
        data.comments.forEach(function (c) {
          (byParent[c.parentId] = byParent[c.parentId] || []).push(c);
        });
        var roots = byParent[0] || [];
        elList.innerHTML = roots.map(function (c) { return renderItem(c, byParent); }).join('');
      })
      .catch(function (e) {
        elList.innerHTML = '<p class="c-empty">评论服务暂时不在线（' + esc(e.message) + '）</p>';
        elCount.textContent = '?';
      });
  }

  /* ---------- 发表 ---------- */
  function submit(parentId, nickEl, contentEl, onDone) {
    var nickname = nickEl.value.trim();
    var content = contentEl.value.trim();
    if (!nickname || !content) { showError('昵称和内容都要填哦'); return; }
    try { localStorage.setItem(LS_NICK, nickname); } catch (e) {}
    try { if (elEmail) localStorage.setItem(LS_EMAIL, elEmail.value.trim()); } catch (e) {}
    api('/api/comments', {
      method: 'POST',
      body: JSON.stringify({
        page: PAGE, nickname: nickname, content: content,
        email: elEmail ? elEmail.value.trim() : '', parentId: parentId || 0
      })
    }).then(function (data) {
      if (!data.ok) { showError(data.error || '发表失败'); return; }
      contentEl.value = '';
      load();
      if (onDone) onDone();
    }).catch(function () { showError('网络错误，稍后再试'); });
  }

  elForm.addEventListener('submit', function (e) {
    e.preventDefault();
    submit(0, elNick, elContent);
  });

  /* ---------- 列表内交互（事件委托） ---------- */
  elList.addEventListener('click', function (e) {
    var likeBtn = e.target.closest('.c-like');
    var replyBtn = e.target.closest('.c-reply');
    var delBtn = e.target.closest('.c-del');
    var editBtn = e.target.closest('.c-edit');
    var cancelBtn = e.target.closest('.c-reply-cancel');
    var replySubmit = e.target.closest('.c-reply-submit');
    var editSave = e.target.closest('.c-edit-save');
    var editCancel = e.target.closest('.c-edit-cancel');

    if (likeBtn) {
      var id = Number(likeBtn.dataset.id);
      var isLiked = likeBtn.classList.contains('is-liked');
      api('/api/comments/' + (isLiked ? 'unlike' : 'like'), { method: 'POST', body: JSON.stringify({ id: id }) })
        .then(function (data) {
          if (!data.ok) return;
          likeBtn.querySelector('i').textContent = data.likes;
          if (isLiked) {
            likeBtn.classList.remove('is-liked');
            likeBtn.title = '点赞';
            unmarkLiked(id);
          } else {
            likeBtn.classList.add('is-liked', 'c-burst');
            likeBtn.title = '再点一次取消点赞';
            markLiked(id);
            setTimeout(function () { likeBtn.classList.remove('c-burst'); }, 500);
          }
        });
      return;
    }

    if (replyBtn) {
      var item = replyBtn.closest('.c-item');
      var slot = item.querySelector('.c-reply-slot');
      if (slot.innerHTML) { slot.innerHTML = ''; return; }
      slot.innerHTML =
        '<div class="c-reply-form">' +
          '<div class="c-form-row">' +
            '<input type="text" class="inset-input c-nick c-r-nick" placeholder="你的昵称" maxlength="20" value="' + esc(elNick.value) + '">' +
            '<button class="bevel-button c-reply-submit" type="button" data-id="' + replyBtn.dataset.id + '">回复 ' + esc(replyBtn.dataset.nick) + ' ↗</button>' +
            '<button class="bevel-button c-reply-cancel" type="button">取消</button>' +
          '</div>' +
          '<textarea class="inset-input c-textarea c-r-content" rows="2" maxlength="500" placeholder="回复 ' + esc(replyBtn.dataset.nick) + '…"></textarea>' +
        '</div>';
      slot.querySelector('.c-r-content').focus();
      return;
    }

    if (cancelBtn) {
      cancelBtn.closest('.c-reply-slot').innerHTML = '';
      return;
    }

    if (replySubmit) {
      var form = replySubmit.closest('.c-reply-form');
      var pid = Number(replySubmit.dataset.id);
      submit(pid, form.querySelector('.c-r-nick'), form.querySelector('.c-r-content'));
      return;
    }

    if (delBtn) {
      if (!confirm('确定删除这条评论？（它的回复也会一起删掉）')) return;
      api('/api/comments/' + delBtn.dataset.id, { method: 'DELETE' })
        .then(function (data) {
          if (!data.ok) { showError(data.error || '删除失败'); return; }
          load();
        });
      return;
    }

    if (editBtn) {
      var editItem = editBtn.closest('.c-item');
      var textEl = editItem.querySelector('.c-text');
      var oldText = textEl.innerText;
      textEl.innerHTML =
        '<div class="c-edit-form">' +
          '<textarea class="inset-input c-textarea c-e-content" rows="3" maxlength="500">' + esc(oldText) + '</textarea>' +
          '<div class="c-edit-acts">' +
            '<button class="bevel-button c-edit-save" data-id="' + editBtn.dataset.id + '" type="button">保存 ✓</button>' +
            '<button class="bevel-button c-edit-cancel" type="button">取消</button>' +
          '</div>' +
        '</div>';
      textEl.querySelector('.c-e-content').focus();
      return;
    }

    if (editCancel) {
      load();
      return;
    }

    if (editSave) {
      var eid = Number(editSave.dataset.id);
      var newContent = editSave.closest('.c-edit-form').querySelector('.c-e-content').value.trim();
      if (!newContent) { showError('内容不能为空'); return; }
      api('/api/comments/' + eid, { method: 'PUT', body: JSON.stringify({ content: newContent }) })
        .then(function (data) {
          if (!data.ok) { showError(data.error || '编辑失败'); return; }
          load();
        });
      return;
    }
  });

  /* ---------- 管理员 ---------- */
  function refreshAdminBtn() {
    elAdminToggle.textContent = getToken() ? '⚿ 退出管理员' : '⚿ 站长入口';
  }
  elAdminToggle.addEventListener('click', function () {
    if (getToken()) {
      setToken('');
      refreshAdminBtn();
      load();
      return;
    }
    var t = prompt('输入管理密钥：');
    if (t) {
      setToken(t.trim());
      refreshAdminBtn();
      load();
    }
  });
  refreshAdminBtn();

  /* 阅读计数上报（静默） */
  fetch(API + '/api/view', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page: PAGE })
  }).catch(function () {});

  load();
})();
