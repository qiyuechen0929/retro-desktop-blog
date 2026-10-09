/* retro-desktop —— 友链：已上墙列表 / 自助挂链 / 管理员审核 */
(function () {
  'use strict';

  var grid = document.getElementById('friend-grid');
  if (!grid || !window.FRIENDS_CONFIG) return;
  var API = window.FRIENDS_CONFIG.api.replace(/\/$/, '');

  var applyForm = document.getElementById('friend-apply');
  var fName = document.getElementById('f-name');
  var fUrl = document.getElementById('f-url');
  var fDesc = document.getElementById('f-desc');
  var fMsg = document.getElementById('f-msg');
  var adminBox = document.getElementById('friend-admin');
  var pendingBox = document.getElementById('friend-pending');

  var LS_TOKEN = 'c-admin-token';
  function getToken() { try { return localStorage.getItem(LS_TOKEN) || ''; } catch (e) { return ''; } }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function showMsg(text, ok) {
    fMsg.textContent = text;
    fMsg.hidden = false;
    fMsg.classList.toggle('f-ok', !!ok);
    clearTimeout(showMsg._t);
    showMsg._t = setTimeout(function () { fMsg.hidden = true; }, 4000);
  }
  function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    var t = getToken();
    if (t) opts.headers['X-Admin-Token'] = t;
    return fetch(API + path, opts).then(function (r) { return r.json(); });
  }

  /* ---------- 已上墙 ---------- */
  function loadFriends() {
    api('/api/friends').then(function (data) {
      if (!data.ok) throw new Error();
      if (!data.friends.length) {
        grid.innerHTML =
          '<div class="friend-card window friend-empty">' +
            '<span class="friend-name">虚位以待</span>' +
            '<span class="friend-desc">还没有友链——第一个位置，等你来上墙。</span>' +
            '<span class="friend-url">在下方「自助挂链」提交 ↓</span>' +
          '</div>';
        return;
      }
      var admin = !!getToken();
      grid.innerHTML = data.friends.map(function (f) {
        return '<a class="friend-card window" href="' + esc(f.url) + '" target="_blank" rel="noopener">' +
          '<span class="friend-name">' + esc(f.name) + '</span>' +
          '<span class="friend-desc">' + esc(f.desc || '这位朋友很低调，什么都没写') + '</span>' +
          '<span class="friend-url">' + esc(f.url.replace(/^https?:\/\//, '')) + '</span>' +
          (admin ? '<button class="c-act f-del" data-id="' + f.id + '" type="button">× 下架</button>' : '') +
        '</a>';
      }).join('');
    }).catch(function () {
      grid.innerHTML = '<p class="c-empty">友链服务暂时不在线</p>';
    });
  }

  /* ---------- 自助申请 ---------- */
  applyForm.addEventListener('submit', function (e) {
    e.preventDefault();
    api('/api/friends', {
      method: 'POST',
      body: JSON.stringify({ name: fName.value.trim(), url: fUrl.value.trim(), desc: fDesc.value.trim() })
    }).then(function (data) {
      if (!data.ok) { showMsg(data.error || '提交失败'); return; }
      fName.value = ''; fUrl.value = ''; fDesc.value = '';
      showMsg('已提交！站长审核通过后就会上墙，常回来看看～', true);
      if (getToken()) loadPending();
    }).catch(function () { showMsg('网络错误，稍后再试'); });
  });

  /* ---------- 管理员审核 ---------- */
  function loadPending() {
    if (!getToken()) { adminBox.hidden = true; return; }
    api('/api/friends/all').then(function (data) {
      if (!data.ok) { adminBox.hidden = true; return; }
      var pendings = data.friends.filter(function (f) { return f.status === 'pending'; });
      adminBox.hidden = false;
      pendingBox.innerHTML = pendings.length
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
    });
  }

  document.addEventListener('click', function (e) {
    var approve = e.target.closest('.f-approve');
    var reject = e.target.closest('.f-reject');
    var del = e.target.closest('.f-del');
    if (approve || reject) {
      var btn = approve || reject;
      var action = approve ? 'approve' : 'reject';
      api('/api/friends/' + btn.dataset.id + '/' + action, { method: 'POST' })
        .then(function (data) {
          if (!data.ok) { showMsg(data.error || '操作失败'); return; }
          loadPending();
          loadFriends();
        });
      return;
    }
    if (del) {
      e.preventDefault();
      if (!confirm('确定把这个友链下架？')) return;
      api('/api/friends/' + del.dataset.id, { method: 'DELETE' })
        .then(function () { loadFriends(); });
      return;
    }
  });

  /* 评论区登录管理员后，回到本页刷新审核区 */
  window.addEventListener('focus', function () {
    if (getToken()) { loadPending(); loadFriends(); }
  });

  loadFriends();
  if (getToken()) loadPending();
})();
