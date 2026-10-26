import React, {useLayoutEffect, useRef} from 'react';
import {useCurrentFrame} from 'remotion';
import {Palette} from '../timeline';
import {hash} from '../lib/math';

const BLOBS = [
  {r: 0.55, sx: 0.22, sy: 0.28, ax: 0.16, ay: 0.12, fx: 0.00021, fy: 0.00017, p: 0},
  {r: 0.62, sx: 0.72, sy: 0.22, ax: 0.14, ay: 0.16, fx: 0.00016, fy: 0.00023, p: 2},
  {r: 0.5, sx: 0.3, sy: 0.75, ax: 0.18, ay: 0.1, fx: 0.00019, fy: 0.00014, p: 4},
  {r: 0.46, sx: 0.8, sy: 0.7, ax: 0.12, ay: 0.15, fx: 0.00024, fy: 0.00019, p: 1},
  {r: 0.38, sx: 0.5, sy: 0.48, ax: 0.2, ay: 0.18, fx: 0.00013, fy: 0.00026, p: 3},
];

export const FluidBackground: React.FC<{
  palette: Palette;
  w?: number;
  h?: number;
  speed?: number;
  scale?: number;
  fade?: number;
}> = ({palette, w = 1920, h = 1080, speed = 1, scale = 1, fade = 1}) => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const time = (frame / 60) * 1000 * speed;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < BLOBS.length; i++) {
      const b = BLOBS[i];
      const x = (b.sx + Math.sin(time * b.fx + b.p) * b.ax) * w;
      const y = (b.sy + Math.cos(time * b.fy + b.p * 1.7) * b.ay) * h;
      const rad = b.r * Math.max(w, h) * scale * (0.85 + 0.15 * Math.sin(time * 0.0001 + b.p));
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, palette.blobs[i % palette.blobs.length]);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.globalAlpha = fade;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }, [frame, palette, w, h, speed, scale, fade]);

  return (
    <canvas
      ref={ref}
      width={w}
      height={h}
      style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}
    />
  );
};

/** 站点同款网格 + 像素星点 */
export const GridLayer: React.FC<{color?: string; size?: number; opacity?: number}> = ({
  color = 'rgba(255,255,255,0.08)',
  size = 48,
  opacity = 1,
}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      opacity,
      backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
      backgroundSize: `${size}px ${size}px`,
      maskImage: 'radial-gradient(circle at 50% 45%, #000 20%, transparent 78%)',
      WebkitMaskImage: 'radial-gradient(circle at 50% 45%, #000 20%, transparent 78%)',
    }}
  />
);

/** 漂浮像素星星 */
export const StarField: React.FC<{
  count?: number;
  color?: string;
  seed?: number;
  drift?: number;
}> = ({count = 40, color = '#fff6c9', seed = 3, drift = 1}) => {
  const frame = useCurrentFrame();
  const items = new Array(count).fill(0).map((_, i) => {
    const ax = hash(seed + i * 1.7);
    const ay = hash(seed + i * 3.1);
    const sp = 0.2 + hash(seed + i * 5.3) * 0.8;
    const x = ((ax * 1.2 - 0.1 + (frame * drift * sp) / 900) % 1.2) * 1920 - 60;
    const y = ay * 1080 + Math.sin(frame * 0.02 * sp + i) * 18;
    const s = 3 + hash(seed + i * 9.1) * 7;
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(frame * 0.05 * sp + i * 2.1));
    return {x, y, s, tw, i};
  });
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
      {items.map((it) => (
        <div
          key={it.i}
          style={{
            position: 'absolute',
            left: it.x,
            top: it.y,
            width: it.s,
            height: it.s,
            background: color,
            opacity: it.tw,
            boxShadow: `0 0 ${it.s * 2}px ${color}`,
            transform: 'rotate(0deg)',
          }}
        />
      ))}
    </div>
  );
};
