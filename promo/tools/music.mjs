/* 30s 128BPM 电子配乐 + 音效，纯代码合成（无采样、无版权问题） */
import fs from 'node:fs';
import path from 'node:path';

const SR = 48000;
const BPM = 128;
const SPB = 60 / BPM; // 0.46875s
const BARS = 24;
const DUR = BARS * 4 * SPB; // 30.0s
const N = Math.round(SR * DUR);
const L = new Float32Array(N);
const Rc = new Float32Array(N);

let seed = 12345;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const noise = () => rnd() * 2 - 1;

const add = (i, v, pan = 0) => {
  if (i < 0 || i >= N) return;
  const lg = Math.min(1, (1 - pan) * 0.5 + 0.5);
  const rg = Math.min(1, (1 + pan) * 0.5 + 0.5);
  L[i] += v * lg;
  Rc[i] += v * rg;
};

const T = (beat) => Math.round(beat * SPB * SR);

/* ---------- 基础滤波器 ---------- */
const biquad = (type, f0, Q) => {
  const w = (2 * Math.PI * f0) / SR;
  const alpha = Math.sin(w) / (2 * Q);
  const cos = Math.cos(w);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'bp') {
    b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
  } else if (type === 'lp') {
    b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
  } else {
    b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
  }
  return {b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0, x1: 0, x2: 0, y1: 0, y2: 0};
};
const run = (st, x) => {
  const y = st.b0 * x + st.b1 * st.x1 + st.b2 * st.x2 - st.a1 * st.y1 - st.a2 * st.y2;
  st.x2 = st.x1; st.x1 = x; st.y2 = st.y1; st.y1 = y;
  return y;
};

/* ---------- 鼓 ---------- */
const kick = (beat, amp = 1) => {
  const t0 = T(beat);
  const dur = Math.round(0.55 * SR);
  for (let i = 0; i < dur; i++) {
    const t = i / SR;
    const ph = 2 * Math.PI * (46 * t + (150 * (1 - Math.exp(-30 * t))) / 30);
    let v = Math.sin(ph) * Math.exp(-t * 5.2);
    if (t < 0.012) v += noise() * 0.55 * (1 - t / 0.012);
    v = Math.tanh(v * 1.4) * 0.85;
    add(t0 + i, v * amp * 0.92);
  }
};

const clap = (beat, amp = 1) => {
  const t0 = T(beat);
  const bp = biquad('bp', 1500, 0.9);
  const dur = Math.round(0.3 * SR);
  for (let i = 0; i < dur; i++) {
    const t = i / SR;
    let burst = 0;
    for (const off of [0, 0.012, 0.024]) if (t >= off) burst = Math.max(burst, Math.exp(-(t - off) * 140));
    const v = run(bp, noise()) * burst * Math.exp(-t * 12);
    add(t0 + i, v * amp * 0.75, (rnd() - 0.5) * 0.3);
  }
};

const hat = (beat, amp = 1, open = false) => {
  const t0 = T(beat);
  const dur = Math.round((open ? 0.24 : 0.06) * SR);
  let prev = 0;
  for (let i = 0; i < dur; i++) {
    const t = i / SR;
    const x = noise();
    const hp = x - prev;
    prev = x;
    const v = hp * Math.exp(-t * (open ? 26 : 110)) * 0.5;
    add(t0 + i, v * amp, open ? 0.25 : -0.2);
  }
};

const crash = (beat, amp = 1) => {
  const t0 = T(beat);
  const dur = Math.round(1.6 * SR);
  let p1 = 0, p2 = 0;
  for (let i = 0; i < dur; i++) {
    const t = i / SR;
    const x = noise();
    const hp1 = x - p1; p1 = x;
    const hp2 = hp1 - p2; p2 = hp1;
    add(t0 + i, hp2 * Math.exp(-t * 2.4) * amp * 0.32, 0);
  }
};

/* ---------- 旋律 ---------- */
const CHORDS = [
  {root: 110.0, notes: [220.0, 261.63, 329.63]}, // Am
  {root: 87.31, notes: [174.61, 220.0, 261.63]}, // F
  {root: 130.81, notes: [261.63, 329.63, 392.0]}, // C
  {root: 98.0, notes: [196.0, 246.94, 293.66]}, // G
  {root: 110.0, notes: [220.0, 261.63, 329.63]}, // Am
  {root: 87.31, notes: [174.61, 220.0, 261.63]}, // F
  {root: 98.0, notes: [196.0, 246.94, 293.66]}, // G
  {root: 82.41, notes: [164.81, 196.0, 246.94]}, // Em
];
const chordAt = (bar) => CHORDS[bar % 8];

const bass = (beat, freq, durBeats, amp = 1) => {
  const t0 = T(beat);
  const dur = Math.round(durBeats * SPB * SR);
  const lp = biquad('lp', 700, 0.9);
  let ph = 0;
  let phSub = 0;
  for (let i = 0; i < dur; i++) {
    const t = i / SR;
    ph += freq / SR;
    phSub += freq / 2 / SR;
    const saw = 2 * (ph % 1) - 1;
    const sub = Math.sin(2 * Math.PI * phSub);
    const env = Math.exp(-t * 7) * (1 - Math.exp(-t * 400));
    const cut = 420 + 900 * Math.exp(-t * 14);
    lp.b0 = Math.min(0.9, (cut / SR) * 2 * Math.PI); // 近似一阶
    const v = Math.tanh((saw * 0.6 + sub * 0.8)) * env;
    add(t0 + i, v * amp * 0.34);
  }
};

const pluck = (beat, freq, amp = 1, pan = 0) => {
  const t0 = T(beat);
  const dur = Math.round(0.3 * SR);
  let ph = 0;
  for (let i = 0; i < dur; i++) {
    const t = i / SR;
    ph += freq / SR;
    const sq = (ph % 1) < 0.5 ? 1 : -1;
    const v = sq * Math.exp(-t * 22) * (1 - Math.exp(-t * 900));
    add(t0 + i, v * amp * 0.11, pan);
  }
};

const pad = (beat, notes, durBeats, amp = 1, cutoff = 1200) => {
  const t0 = T(beat);
  const dur = Math.round(durBeats * SPB * SR);
  const lpL = biquad('lp', cutoff, 0.8);
  const lpR = biquad('lp', cutoff * 1.05, 0.8);
  const phs = notes.map(() => [rnd(), rnd(), rnd()]);
  for (let i = 0; i < dur; i++) {
    const t = i / SR;
    const att = Math.min(1, t / 0.25);
    const rel = Math.min(1, (dur / SR - t) / 0.2);
    let l = 0, r = 0;
    notes.forEach((f, n) => {
      for (let d = 0; d < 3; d++) {
        const det = 1 + (d - 1) * 0.004;
        phs[n][d] += (f * det) / SR;
        const s = 2 * (phs[n][d] % 1) - 1;
        l += s * (d === 2 ? 0.5 : 1);
        r += s * (d === 0 ? 0.5 : 1);
      }
    });
    const vL = run(lpL, l / (notes.length * 3));
    const vR = run(lpR, r / (notes.length * 3));
    const g = amp * 0.5 * att * rel;
    add(t0 + i, vL * g, -0.35);
    add(t0 + i, vR * g, 0.35);
  }
};

const riser = (beat, durBeats, amp = 1) => {
  const t0 = T(beat);
  const dur = Math.round(durBeats * SPB * SR);
  const bp = biquad('bp', 600, 1.2);
  let ph = 0;
  for (let i = 0; i < dur; i++) {
    const p = i / dur;
    const f = 200 + 7000 * p * p;
    bp.b0 = Math.min(0.95, (f / SR) * 2 * Math.PI);
    const n = run(bp, noise());
    ph += (120 + 900 * p) / SR;
    const tone = Math.sin(2 * Math.PI * ph) * 0.25;
    const v = (n * 0.6 + tone) * Math.pow(p, 1.6);
    add(t0 + i, v * amp * 0.4, Math.sin(p * 9) * 0.6);
  }
};

const impact = (beat, amp = 1) => {
  const t0 = T(beat);
  const dur = Math.round(2.2 * SR);
  const lp = biquad('lp', 500, 0.7);
  for (let i = 0; i < dur; i++) {
    const t = i / SR;
    const ph = 2 * Math.PI * (38 * t + (90 * (1 - Math.exp(-8 * t))) / 8);
    const boom = Math.sin(ph) * Math.exp(-t * 1.9);
    const hit = run(lp, noise()) * Math.exp(-t * 9);
    add(t0 + i, Math.tanh((boom + hit * 0.5) * 1.2) * amp * 0.6);
  }
};

/* ---------- 编排 ---------- */
const barBeat = (bar) => bar * 4;

// 和弦铺底 + 侧链
const sec = [];
for (let bar = 0; bar < BARS; bar++) {
  const c = chordAt(bar);
  const drop = bar >= 4 && bar !== 11;
  sec.push({bar, c, drop});
  pad(barBeat(bar), c.notes, 4, drop ? 0.55 : 0.4, drop ? 2400 : 900);
}

// 鼓
for (let bar = 2; bar < BARS; bar++) {
  if (bar === 11) continue;
  const base = barBeat(bar);
  if (bar >= 4 || bar === 2) {
    for (let b = 0; b < 4; b++) kick(base + b, bar === 2 ? 0.75 : 1);
  }
  if (bar >= 4) {
    clap(base + 1, 0.9);
    clap(base + 3, 0.9);
  }
  // hat 16 分
  for (let s = 0; s < 16; s++) {
    const strong = s % 4 === 2;
    if (bar === 2 && s % 2) continue;
    hat(base + s * 0.25, strong ? 0.85 : 0.45, s % 8 === 6);
  }
}

// 贝斯
for (let bar = 2; bar < BARS; bar++) {
  if (bar === 11) continue;
  const c = chordAt(bar);
  const base = barBeat(bar);
  const pat = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5];
  pat.forEach((p, i) => bass(base + p, c.root * (i % 4 === 3 ? 2 : 1), 0.42, bar === 2 ? 0.7 : 1));
}

// 琶音
for (let bar = 4; bar < BARS; bar++) {
  if (bar === 11) continue;
  const c = chordAt(bar);
  const base = barBeat(bar);
  for (let s = 0; s < 16; s++) {
    const n = c.notes[(s + bar) % 3] * (s % 8 >= 4 ? 2 : 1);
    pluck(base + s * 0.25, n, s % 4 === 0 ? 1 : 0.7, Math.sin(s) * 0.5);
  }
}

// 过渡
riser(barBeat(3) + 2, 2, 1.1);
riser(barBeat(11), 4, 1.2);
riser(barBeat(15) + 2, 2, 1.3);
riser(barBeat(19) + 2, 2, 1.25);
riser(barBeat(21) + 2, 2, 1.3);
impact(barBeat(0), 0.55);
impact(barBeat(4), 1.0);
impact(barBeat(16), 1.15);
impact(barBeat(17), 0.95);
impact(barBeat(20), 1.1);
impact(barBeat(22), 1.3);
crash(barBeat(16), 1.0);
crash(barBeat(22), 1.2);
impact(barBeat(8), 0.8);
impact(barBeat(12), 1.0);
impact(barBeat(14), 0.7);
crash(barBeat(4), 1);
crash(barBeat(12), 1);
crash(barBeat(8), 0.6);

/* ---------- 音效 ---------- */
// CRT 通电
(() => {
  const t0 = T(0) + Math.round(0.08 * SR);
  for (let i = 0; i < 0.5 * SR; i++) {
    const t = i / SR;
    const v = Math.sin(2 * Math.PI * (90 * t + 300 * t * t)) * Math.exp(-t * 7) * 0.4 + noise() * Math.exp(-t * 30) * 0.25;
    add(t0 + i, v * 0.8);
  }
})();
// 打字咔哒
for (let k = 0; k < 26; k++) {
  const at = T(0.9 + k * 0.052);
  for (let i = 0; i < 0.012 * SR; i++) {
    const t = i / SR;
    add(at + i, noise() * Math.exp(-t * 400) * 0.12, (rnd() - 0.5) * 0.6);
  }
}
// 穿屏 whoosh
(() => {
  const t0 = T(18); // 9.375s
  const bp = biquad('bp', 900, 0.9);
  for (let i = 0; i < 0.9 * SR; i++) {
    const p = i / (0.9 * SR);
    bp.b0 = Math.min(0.95, ((300 + 5000 * p * p) / SR) * 2 * Math.PI);
    const v = run(bp, noise()) * Math.sin(Math.PI * Math.min(1, p * 1.2)) * 0.5;
    add(t0 + i, v * 0.5, (p - 0.5) * 1.6);
  }
})();
// 关机
(() => {
  const t0 = T(56); // 26.25s
  for (let i = 0; i < 0.45 * SR; i++) {
    const t = i / SR;
    const ph = 2 * Math.PI * (700 * t - 900 * t * t);
    const v = Math.sin(ph) * Math.exp(-t * 8) * 0.35 + noise() * Math.exp(-t * 50) * 0.2;
    add(t0 + i, v * 0.7);
  }
})();

/* ---------- 延迟 + 混响 ---------- */
const delay = (buf, ms, fb, mix) => {
  const d = Math.round((ms / 1000) * SR);
  const out = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) {
    const delayed = i >= d ? out[i - d] : 0;
    out[i] = buf[i] + delayed * fb;
  }
  for (let i = 0; i < buf.length; i++) buf[i] = buf[i] * (1 - mix) + out[i] * mix;
};
delay(Rc, 176, 0.32, 0.18);
delay(L, 264, 0.28, 0.14);

// 伪混响：四梳状
const reverb = (buf, mix = 0.16) => {
  const combs = [1557, 1617, 1491, 1422].map((d) => Math.round((d / 44100) * SR));
  const wet = new Float32Array(buf.length);
  combs.forEach((d, ci) => {
    const tmp = new Float32Array(buf.length);
    for (let i = 0; i < buf.length; i++) {
      const fb = i >= d ? tmp[i - d] : 0;
      tmp[i] = buf[i] + fb * 0.78;
      wet[i] += tmp[i] * (0.25 - ci * 0.03);
    }
  });
  for (let i = 0; i < buf.length; i++) buf[i] = buf[i] * (1 - mix) + wet[i] * mix;
};
reverb(L, 0.18);
reverb(Rc, 0.18);

/* ---------- 侧链（pad/bass 让位给鼓） ---------- */
for (let bar = 4; bar < BARS; bar++) {
  if (bar === 11) continue;
  for (let b = 0; b < 4; b++) {
    const start = T(barBeat(bar) + b);
    for (let i = 0; i < 0.16 * SR; i++) {
      const g = 1 - 0.42 * Math.exp(-i / SR / 0.05);
      if (start + i < N) {
        L[start + i] *= g;
        Rc[start + i] *= g;
      }
    }
  }
}

/* ---------- 母带 ---------- */
let peak = 0;
for (let i = 0; i < N; i++) {
  L[i] = Math.tanh(L[i] * 1.15);
  Rc[i] = Math.tanh(Rc[i] * 1.15);
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(Rc[i]));
}
const norm = 0.92 / (peak || 1);
const fadeIn = Math.round(0.02 * SR);
const fadeOut = Math.round(0.35 * SR);
for (let i = 0; i < N; i++) {
  let g = norm;
  if (i < fadeIn) g *= i / fadeIn;
  if (i > N - fadeOut) g *= (N - i) / fadeOut;
  L[i] *= g;
  Rc[i] *= g;
}

/* ---------- 写 WAV ---------- */
const out = Buffer.alloc(44 + N * 4);
out.write('RIFF', 0);
out.writeUInt32LE(36 + N * 4, 4);
out.write('WAVE', 8);
out.write('fmt ', 12);
out.writeUInt32LE(16, 16);
out.writeUInt16LE(1, 20);
out.writeUInt16LE(2, 22);
out.writeUInt32LE(SR, 24);
out.writeUInt32LE(SR * 4, 28);
out.writeUInt16LE(4, 32);
out.writeUInt16LE(16, 34);
out.write('data', 36);
out.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))), 44 + i * 4);
  out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(Rc[i] * 32767))), 46 + i * 4);
}
const dest = path.resolve('public/audio/track.wav');
fs.mkdirSync(path.dirname(dest), {recursive: true});
fs.writeFileSync(dest, out);
console.log('wrote', dest, (out.length / 1024 / 1024).toFixed(1) + 'MB', DUR + 's');
