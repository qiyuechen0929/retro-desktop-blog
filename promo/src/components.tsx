import React from 'react';
import {staticFile, useCurrentFrame} from 'remotion';
import {FONT} from './theme';
import {Palette} from './timeline';
import {clamp, hash, inv} from './lib/math';

/* ---------------- 像素爱心（站点标志物） ---------------- */
export const HEART = [
  '................',
  '..##......##....',
  '.####....####...',
  '.######..######.',
  '################',
  '################',
  '################',
  '################',
  '.##############.',
  '..############..',
  '...##########...',
  '....########....',
  '.....######.....',
  '......####......',
  '.......##.......',
  '................',
];

export const PixelHeart: React.FC<{
  size?: number;
  color?: string;
  glow?: number;
  style?: React.CSSProperties;
  opacity?: number;
}> = ({size = 120, color = '#ff9dc6', glow = 1, style, opacity = 1}) => {
  const cells = 16;
  const px = size / cells;
  const rects: React.ReactNode[] = [];
  HEART.forEach((row, y) => {
    row.split('').forEach((ch, x) => {
      if (ch !== '#') return;
      rects.push(
        <rect
          key={`${x}-${y}`}
          x={x * px}
          y={y * px}
          width={px}
          height={px}
          fill={color}
        />,
      );
    });
  });
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      style={{
        overflow: 'visible',
        filter: glow ? `drop-shadow(0 0 ${px * 1.4}px ${color})` : undefined,
        opacity,
        ...style,
      }}
    >
      {rects}
    </svg>
  );
};

/* ---------------- 复古窗口卡片 ---------------- */
export const WinCard: React.FC<{
  title: string;
  children: React.ReactNode;
  palette?: Palette;
  width?: number;
  style?: React.CSSProperties;
  titleSize?: number;
}> = ({title, children, palette, width = 900, style, titleSize = 22}) => {
  const p = palette;
  const frame = p?.frame ?? '#ead6ed';
  const border = p?.ink ?? '#836398';
  const bar = p?.key === 'crt'
    ? 'linear-gradient(90deg,#0d3d12,#1a6b22)'
    : p?.key === 'classic'
      ? 'linear-gradient(90deg,#000080,#1084d0)'
      : p?.key === 'ocean'
        ? 'linear-gradient(90deg,#2f6fa8,#63a8d8)'
        : 'linear-gradient(90deg,#9472bd,#bb8bc9 50%,#e1a3c9)';
  return (
    <div
      style={{
        width,
        background: frame,
        border: `2px solid ${border}`,
        boxShadow: `6px 6px 0 rgba(0,0,0,.22), 18px 26px 60px rgba(0,0,0,.35)`,
        ...style,
      }}
    >
      <div
        style={{
          height: titleSize * 2.1,
          background: bar,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          fontFamily: FONT.mono,
          fontWeight: 700,
          fontSize: titleSize,
          color: '#fff',
          textShadow: '1px 1px 0 rgba(0,0,0,.35)',
          letterSpacing: '.02em',
        }}
      >
        <span style={{whiteSpace: 'nowrap', overflow: 'hidden'}}>{title}</span>
        <span style={{display: 'flex', gap: 6}}>
          {['_', '□', '×'].map((c) => (
            <span
              key={c}
              style={{
                width: titleSize * 1.5,
                height: titleSize * 1.5,
                background: frame,
                color: border,
                border: `2px solid ${border}`,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: titleSize * 0.85,
                lineHeight: 1,
                textShadow: 'none',
              }}
            >
              {c}
            </span>
          ))}
        </span>
      </div>
      <div style={{padding: 0}}>{children}</div>
    </div>
  );
};

/* ---------------- CRT 显示器（3D） ---------------- */
export const Monitor: React.FC<{
  src: string;
  width: number;
  rotateY?: number;
  rotateX?: number;
  glow?: number;
  palette?: Palette;
  screenDim?: number;
  children?: React.ReactNode;
}> = ({src, width, rotateY = 0, rotateX = 0, glow = 1, palette, screenDim = 0, children}) => {
  const screenW = width;
  const screenH = (screenW * 9) / 16;
  const bezel = width * 0.038;
  return (
    <div
      style={{
        width,
        transformStyle: 'preserve-3d',
        transform: `perspective(2400px) rotateY(${rotateY}deg) rotateX(${rotateX}deg)`,
        filter: `drop-shadow(0 ${width * 0.03}px ${width * 0.08}px rgba(0,0,0,.55))`,
      }}
    >
      <div
        style={{
          padding: bezel,
          borderRadius: width * 0.045,
          background:
            'linear-gradient(160deg,#d9d2c8 0%,#efeae2 18%,#b9b0a6 55%,#8e857c 100%)',
          boxShadow: `inset 0 0 0 ${bezel * 0.18}px rgba(255,255,255,.55), inset 0 0 0 ${bezel * 0.3}px rgba(0,0,0,.25), 0 0 ${width * 0.14}px rgba(120,90,160,${0.35 * glow})`,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: screenW,
            height: screenH,
            borderRadius: width * 0.022,
            overflow: 'hidden',
            background: '#000',
            boxShadow: `inset 0 0 ${width * 0.05}px rgba(0,0,0,.85), 0 0 ${width * 0.1}px rgba(160,120,220,${0.5 * glow})`,
          }}
        >
          <img
            src={staticFile(src)}
            style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center'}}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'repeating-linear-gradient(0deg, rgba(0,0,0,.22) 0px, rgba(0,0,0,.22) 1px, transparent 1px, transparent 3px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(120deg, rgba(255,255,255,.16) 0%, rgba(255,255,255,0) 26%, rgba(255,255,255,0) 74%, rgba(255,255,255,.09) 100%)',
            }}
          />
          {screenDim > 0 ? (
            <div style={{position: 'absolute', inset: 0, background: `rgba(0,0,0,${screenDim})`}} />
          ) : null}
          {children}
        </div>
      </div>
      {/* 底座 */}
      <div
        style={{
          width: width * 0.24,
          height: width * 0.05,
          margin: `${width * 0.012}px auto 0`,
          borderRadius: '0 0 12px 12px',
          background: 'linear-gradient(180deg,#cfc6bb,#8b8279)',
        }}
      />
    </div>
  );
};

/* ---------------- 光标 + 点击涟漪 ---------------- */
export const Cursor: React.FC<{x: number; y: number; scale?: number; click?: number; tint?: string}> = ({
  x,
  y,
  scale = 2,
  click = 0,
  tint = '#000',
}) => (
  <div style={{position: 'absolute', left: x, top: y, pointerEvents: 'none', transform: `scale(${scale})`, transformOrigin: '0 0'}}>
    <svg width="24" height="32" viewBox="0 0 24 32">
      <path d="M2 1 L2 24 L8 18.5 L12 28 L16.5 26 L12.5 17 L20 17 Z" fill={tint} stroke="#fff" strokeWidth="1.6" />
    </svg>
    {click > 0 && click < 1 ? (
      <>
        <div
          style={{
            position: 'absolute',
            left: 4,
            top: 4,
            width: 20 + click * 90,
            height: 20 + click * 90,
            marginLeft: -(20 + click * 90) / 2,
            marginTop: -(20 + click * 90) / 2,
            borderRadius: '50%',
            border: `2px solid rgba(255,255,255,${1 - click})`,
            opacity: 1 - click,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 14,
            top: 14,
            width: 160 * click,
            height: 160 * click,
            marginLeft: -80 * click,
            marginTop: -80 * click,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(255,255,255,${0.55 * (1 - click)}) 0%, transparent 70%)`,
          }}
        />
      </>
    ) : null}
  </div>
);

/* ---------------- 小标签 ---------------- */
export const Label: React.FC<{children: React.ReactNode; color?: string; size?: number; style?: React.CSSProperties}> = ({
  children,
  color = '#fff',
  size = 18,
  style,
}) => (
  <div
    style={{
      fontFamily: FONT.mono,
      fontSize: size,
      letterSpacing: '.32em',
      textTransform: 'uppercase',
      color,
      border: `1px solid ${color}55`,
      padding: `${size * 0.28}px ${size * 0.7}px`,
      display: 'inline-block',
      backdropFilter: 'blur(2px)',
      ...style,
    }}
  >
    {children}
  </div>
);

/* ---------------- 漂移的前景点阵（深度感） ---------------- */
export const PixelDrift: React.FC<{
  count?: number;
  color?: string;
  seed?: number;
  speed?: number;
  size?: number;
}> = ({count = 90, color = '#fff', seed = 1, speed = 1, size = 6}) => {
  const f = useCurrentFrame();
  const items = new Array(count).fill(0).map((_, i) => {
    const z = 0.15 + hash(seed + i * 2.3);
    const x0 = hash(seed + i * 4.7) * 2400 - 240;
    const y0 = hash(seed + i * 6.1) * 1400 - 160;
    const drift = (f * speed * (0.4 + z)) % 2400;
    return {
      i,
      x: x0 - drift * 0.7,
      y: y0 + Math.sin((f + i * 10) * 0.02) * 10 * z,
      s: size * z * 2,
      o: 0.06 + z * 0.3,
      z,
    };
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
            opacity: it.o,
            boxShadow: `0 0 ${it.s}px ${color}`,
          }}
        />
      ))}
    </div>
  );
};

/* ---------------- 巨型中文标题 ---------------- */
export const BigCJK: React.FC<{
  text: string;
  size?: number;
  color?: string;
  weight?: number;
  bright?: number;
  style?: React.CSSProperties;
}> = ({text, size = 200, color = '#fff', weight = 900, bright = 0, style}) => (
  <div
    style={{
      fontFamily: FONT.cjk,
      fontSize: size,
      fontWeight: weight,
      color,
      lineHeight: 1,
      letterSpacing: '.04em',
      textShadow: bright
        ? `0 0 ${size * 0.08}px ${color}, 0 0 ${size * 0.3}px ${color}66, ${size * 0.03}px ${size * 0.03}px 0 rgba(0,0,0,.35)`
        : `${size * 0.025}px ${size * 0.025}px 0 rgba(0,0,0,.28)`,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {text}
  </div>
);

/* ---------------- 逐字入场 ---------------- */
export const StaggerChars: React.FC<{
  text: string;
  from: number;
  stagger?: number;
  dur?: number;
  style?: React.CSSProperties;
  render?: (ch: string, p: number, i: number) => React.ReactNode;
}> = ({text, from, stagger = 2, dur = 14, style, render}) => {
  const f = useCurrentFrame();
  return (
    <div style={{display: 'flex', ...style}}>
      {text.split('').map((ch, i) => {
        const p = clamp(inv(f, from + i * stagger, from + i * stagger + dur));
        return (
          <span key={i} style={{display: 'inline-block', opacity: render ? 1 : p}}>
            {render ? render(ch, p, i) : ch === ' ' ? '\u00A0' : ch}
          </span>
        );
      })}
    </div>
  );
};
