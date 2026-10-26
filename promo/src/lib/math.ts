import {interpolate} from 'remotion';

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const inv = (v: number, a: number, b: number) => clamp((v - a) / (b - a || 1));

export const t = (frame: number, a: number, b: number) => inv(a, b, frame);

export const mix = (frame: number, a: number, b: number, from: number, to: number) =>
  interpolate(frame, [a, b], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export const easeOutExpo = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
export const easeInExpo = (x: number) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10));
export const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
export const easeInOutCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
export const easeOutQuint = (x: number) => 1 - Math.pow(1 - x, 5);
export const easeInOutQuint = (x: number) =>
  x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2;
export const easeOutBack = (x: number, s = 1.70158) =>
  1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);

/** 阻尼弹簧 0→1（无 remotion 依赖的确定性解） */
export const springish = (x: number, freq = 4.2, damp = 7.5) => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return 1 - Math.exp(-damp * x) * Math.cos(freq * Math.PI * x);
};

/** 带轻微回弹的落位（0→1，过冲 6%） */
export const popIn = (x: number) => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const e = 1 - Math.pow(1 - x, 3);
  return e + Math.sin(x * Math.PI) * (1 - x) * 0.28;
};

export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export const rnd = (seed: number, i: number) => hash(seed * 91.7 + i * 13.13);

export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(rnd(seed, i), rnd(seed, i + 1), u);
};

/** 屏幕抖动（衰减） */
export const shake = (frame: number, amp = 10, decay = 8, seed = 1) => {
  const k = Math.exp(-frame / decay);
  return {
    x: (noise1(frame * 0.9, seed) - 0.5) * 2 * amp * k,
    y: (noise1(frame * 0.9, seed + 7) - 0.5) * 2 * amp * k,
  };
};

/** 把 0..1 映射成字符数（逐字打字机） */
export const typed = (text: string, p: number) =>
  text.slice(0, Math.round(clamp(p) * text.length));

export const hueRotate = (deg: number) => `hue-rotate(${deg}deg)`;
