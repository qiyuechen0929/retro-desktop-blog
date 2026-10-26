import React, {useLayoutEffect, useRef} from 'react';
import {random, useCurrentFrame} from 'remotion';
import {hash} from '../lib/math';

/** 胶片颗粒（小尺寸画布放大，便宜） */
export const Grain: React.FC<{opacity?: number; seed?: number}> = ({opacity = 0.07, seed = 1}) => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const {width: w, height: h} = cv;
    const img = ctx.createImageData(w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random() * 255;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [frame, seed]);
  return (
    <canvas
      ref={ref}
      width={260}
      height={150}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        opacity,
        imageRendering: 'pixelated',
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
      }}
    />
  );
};

export const Scanlines: React.FC<{opacity?: number; gap?: number}> = ({
  opacity = 0.22,
  gap = 4,
}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      opacity,
      backgroundImage: `repeating-linear-gradient(0deg, rgba(0,0,0,.55) 0px, rgba(0,0,0,.55) 1px, transparent 1px, transparent ${gap}px)`,
      pointerEvents: 'none',
    }}
  />
);

export const Vignette: React.FC<{strength?: number; color?: string}> = ({
  strength = 0.55,
  color = 'rgba(0,0,0,',
}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: `radial-gradient(ellipse at 50% 48%, transparent 38%, ${color}${strength}) 100%))`,
      pointerEvents: 'none',
    }}
  />
);

/** CRT 整屏覆盖：扫描线 + 暗角 + 颗粒 + 玻璃反光 */
export const CrtOverlay: React.FC<{
  intensity?: number;
  scanned?: boolean;
  glow?: string;
  grain?: number;
}> = ({intensity = 1, scanned = true, glow, grain = 0.06}) => {
  const frame = useCurrentFrame();
  return (
    <>
      {scanned ? <Scanlines opacity={0.18 * intensity} gap={4} /> : null}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          boxShadow: `inset 0 0 ${120 * intensity}px rgba(0,0,0,${0.55 * intensity})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'linear-gradient(115deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,0) 34%, rgba(255,255,255,0) 66%, rgba(255,255,255,.05) 100%)',
        }}
      />
      {glow ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            mixBlendMode: 'screen',
            background: `radial-gradient(ellipse at 50% 50%, ${glow}22 0%, transparent 70%)`,
            opacity: 0.5 + 0.12 * Math.sin(frame * 0.2),
          }}
        />
      ) : null}
      <Grain opacity={grain} />
    </>
  );
};

/** RGB 分离（SVG 通道位移） */
export const RGBAberrate: React.FC<{
  dx?: number;
  dy?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({dx = 6, dy = 0, children, style}) => {
  const id = React.useId().replace(/[:]/g, '');
  return (
    <div style={{position: 'relative', ...style}}>
      <svg width="0" height="0" style={{position: 'absolute'}}>
        <filter id={`rgbs${id}`} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feOffset in="SourceGraphic" dx={-dx} dy={-dy} result="ro" />
          <feColorMatrix
            in="ro"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="r"
          />
          <feOffset in="SourceGraphic" dx={dx} dy={dy} result="bo" />
          <feColorMatrix
            in="bo"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="b"
          />
          <feBlend in="r" in2="SourceGraphic" mode="screen" result="rg" />
          <feBlend in="rg" in2="b" mode="screen" />
        </filter>
      </svg>
      <div style={{filter: dx === 0 && dy === 0 ? undefined : `url(#rgbs${id})`}}>{children}</div>
    </div>
  );
};

/** 水平切片撕裂（图片专用，视觉冲击强） */
export const SliceGlitch: React.FC<{
  src: string;
  slices?: number;
  amount?: number;
  seed?: number;
  className?: string;
  style?: React.CSSProperties;
}> = ({src, slices = 22, amount = 0.06, seed = 1, style}) => {
  const frame = useCurrentFrame();
  const rows = new Array(slices).fill(0).map((_, i) => {
    const r = hash(seed + i * 2.7 + Math.floor(frame / 2) * 1.3);
    const r2 = hash(seed + i * 5.1 + Math.floor(frame / 3) * 2.1);
    const on = r > 0.55;
    return {
      i,
      dx: on ? (r - 0.5) * 2 * amount * 100 : 0,
      dy: on ? (r2 - 0.5) * 0.6 : 0,
      hue: r2 > 0.8 ? (r2 - 0.8) * 400 : 0,
      bright: on ? 1 + (r - 0.55) * 2.4 : 1,
    };
  });
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', ...style}}>
      {rows.map((row) => (
        <div
          key={row.i}
          style={{
            position: 'absolute',
            left: `${row.dx}%`,
            top: `${(row.i / slices) * 100}%`,
            width: '100%',
            height: `${100 / slices + 0.35}%`,
            overflow: 'hidden',
            filter: row.hue ? `hue-rotate(${row.hue}deg) brightness(${row.bright})` : undefined,
            transform: `translateY(${row.dy}%)`,
          }}
        >
          <img
            src={src}
            style={{
              position: 'absolute',
              left: 0,
              top: `${-row.i * 100}%`,
              width: '100%',
              height: 'auto',
            }}
          />
        </div>
      ))}
    </div>
  );
};

/** 高光横扫 */
export const LightSweep: React.FC<{
  progress: number;
  angle?: number;
  width?: number;
  color?: string;
  opacity?: number;
}> = ({progress, angle = 18, width = 42, color = 'rgba(255,255,255,.9)', opacity = 1}) => (
  <div
    style={{
      position: 'absolute',
      inset: -200,
      pointerEvents: 'none',
      mixBlendMode: 'screen',
      opacity,
      background: `linear-gradient(${90 + angle}deg, transparent ${progress * 160 - width}%, ${color} ${
        progress * 160 - width * 0.12
      }%, transparent ${progress * 160 + width * 0.5}%)`,
      filter: 'blur(2px)',
    }}
  />
);
