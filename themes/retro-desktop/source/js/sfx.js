/* retro-desktop —— 8-bit 音效（Web Audio 合成，零素材）
   默认关闭，页脚「♪ 音效」切换，选择记忆 */
(function () {
  'use strict';

  var LS = 'sfx-enabled';
  var ctx = null;
  var reduceMotion = document.documentElement.dataset.motion === 'reduce';

  function enabled() { try { return localStorage.getItem(LS) === '1'; } catch (e) { return false; } }
  function setEnabled(v) { try { localStorage.setItem(LS, v ? '1' : '0'); } catch (e) {} }

  function ac() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function beep(freq, dur, type, vol, when, slideTo) {
    var c = ac();
    if (!c || !enabled()) return;
    var t = c.currentTime + (when || 0);
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  var SFX = {
    click: function () { beep(880, 0.05, 'square', 0.045); },
    open: function () { beep(523, 0.06, 'square', 0.05); beep(784, 0.08, 'square', 0.05, 0.06); },
    success: function () { beep(659, 0.07, 'square', 0.05); beep(880, 0.1, 'square', 0.05, 0.07); beep(1174, 0.14, 'square', 0.05, 0.14); },
    laser: function () { beep(1200, 0.12, 'sawtooth', 0.04, 0, 300); },
    error: function () { beep(220, 0.12, 'square', 0.05); beep(185, 0.16, 'square', 0.05, 0.1); }
  };

  /* 事件挂接 */
  document.addEventListener('click', function (e) {
    if (!enabled()) return;
    if (e.target.closest('.c-like, .c-submit, .c-reply-submit, .f-approve, .lucky, #lucky-btn')) SFX.laser();
    else if (e.target.closest('.window-title a, .post-row h3 a, .related-card, .friend-card, .showcase-card')) SFX.open();
    else if (e.target.closest('.bevel-button, .swatch, .window-controls i, .c-act')) SFX.click();
  }, true);
  document.addEventListener('submit', function () { if (enabled()) SFX.success(); }, true);

  /* 页脚开关 */
  var toggle = document.getElementById('sfx-toggle');
  if (toggle) {
    var refresh = function () { toggle.textContent = enabled() ? '♪ 音效：开' : '♪ 音效：关'; toggle.classList.toggle('is-on', enabled()); };
    toggle.addEventListener('click', function () {
      setEnabled(!enabled());
      refresh();
      if (enabled()) SFX.success();
    });
    refresh();
  }
})();
