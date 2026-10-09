/* retro-desktop —— 邮箱订阅（表单带 data-subscribe 属性即自动接入） */
(function () {
  'use strict';

  function apiBase() {
    var cfg = window.COMMENTS_CONFIG || window.FRIENDS_CONFIG || window.SUBSCRIBE_CONFIG || {};
    return (cfg.api || '').replace(/\/$/, '');
  }

  document.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-subscribe]');
    if (!form) return;
    e.preventDefault();
    var input = form.querySelector('input[type="email"]');
    var btn = form.querySelector('button[type="submit"]');
    var msg = form.parentElement.querySelector('.sub-msg');
    var email = input.value.trim();
    if (!email) return;
    if (btn) btn.disabled = true;
    fetch(apiBase() + '/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    }).then(function (r) { return r.json(); })
      .then(function (data) {
        if (msg) {
          msg.textContent = data.ok ? ('✓ ' + (data.message || '订阅成功！')) : (data.error || '订阅失败');
          msg.hidden = false;
          msg.classList.toggle('f-ok', !!data.ok);
        }
        if (data.ok) input.value = '';
      })
      .catch(function () {
        if (msg) { msg.textContent = '网络错误，稍后再试'; msg.hidden = false; }
      })
      .finally(function () { if (btn) btn.disabled = false; });
  });
})();
