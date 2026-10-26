import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {Fill, FONT} from '../theme';
import {Grain} from '../fx/Overlay';
import {clamp, easeOutExpo, hash, inv} from '../lib/math';
import {PALETTES, SHOTS} from '../timeline';

const ORDER = ['dream', 'classic', 'crt', 'ocean'] as const;
const COLS = 7;
const ROWS = 4;
const STEP = 56; // 每次碎裂间隔（2 拍）

type Shard = {x: number; y: number; w: number; h: number; dx: number; dy: number; rot: number; delay: number};

const makeShards = (seed: number): Shard[] => {
  const out: Shard[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const w = 1920 / COLS;
      const h = 1080 / ROWS;
      const jx = (hash(seed + r * 13 + c * 7) - 0.5) * 40;
      const jy = (hash(seed + r * 29 + c * 31) - 0.5) * 40;
      const cx = c * w + w / 2 + jx;
      const cy = r * h + h / 2 + jy;
      const dirX = (cx - 960) / 960;
      const dirY = (cy - 540) / 540;
      out.push({
        x: c * w,
        y: r * h,
        w,
        h,
        dx: dirX * 900 + (hash(seed + r + c * 3) - 0.5) * 500,
        dy: dirY * 700 + (hash(seed + c + r * 5) - 0.5) * 400,
        rot: (hash(seed + r * 3 + c) - 0.5) * 140,
        delay: hash(seed + c * 11 + r * 17) * 8,
      });
    }
  }
  return out;
};

export const S17Shatter: React.FC = () => {
  const f = useCurrentFrame();
  const k = Math.floor(f / STEP) % 4;
  const t = (f % STEP) / STEP;
  const shards = React.useMemo(() => makeShards(k * 97 + 3), [k]);

  const cur = ORDER[k];
  const next = ORDER[(k + 1) % 4];
  const P = PALETTES[next];

  const burst = easeOutExpo(clamp((t - 0.16) / 0.84));
  const flash = t < 0.14 ? 1 - t / 0.14 : 0;
  const out = inv(f, 100, 113);

  const crackOp = clamp((t - 0.02) / 0.1) * (1 - clamp((t - 0.2) / 0.2));

  return (
    <Fill style={{background: P.bg}}>
      <Img src={staticFile(SHOTS[next])} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'}} />

      {shards.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: s.x,
            top: s.y,
            width: s.w,
            height: s.h,
            opacity: burst >= 0.999 ? 0 : 1,
            transform: `translate(${s.dx * Math.max(0, burst - s.delay / 40)}px, ${s.dy * Math.max(0, burst - s.delay / 40)}px) rotate(${s.rot * burst}deg)`,
            backgroundImage: `url(${staticFile(SHOTS[cur])})`,
            backgroundSize: '1920px 1080px',
            backgroundPosition: `${-s.x}px ${-s.y}px`,
            boxShadow: `inset 0 0 0 1px rgba(255,255,255,${0.5 * (1 - burst)})`,
            filter: `brightness(${1 + burst * 0.5})`,
          }}
        />
      ))}

      {/* 裂痕 */}
      {crackOp > 0 ? (
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: crackOp}}>
          {new Array(14).fill(0).map((_, i) => {
            const a = (i / 14) * Math.PI * 2 + k;
            const r1 = 180 + (i % 3) * 90;
            return (
              <line
                key={i}
                x1={960}
                y1={540}
                x2={960 + Math.cos(a) * r1 * 2.4}
                y2={540 + Math.sin(a) * r1 * 2.4}
                stroke="#fff"
                strokeWidth={2.5}
                opacity={0.8}
              />
            );
          })}
          <circle cx={960} cy={540} r={70 + t * 260} fill="none" stroke="#fff" strokeWidth={3} opacity={0.9} />
        </svg>
      ) : null}

      {flash > 0 ? <div style={{position: 'absolute', inset: 0, background: '#fff', opacity: flash * 0.92}} /> : null}

      <div
        style={{
          position: 'absolute',
          right: 90,
          bottom: 70,
          fontFamily: FONT.mono,
          fontSize: 18,
          letterSpacing: '.4em',
          color: P.ink,
          opacity: 0.75 * (1 - out),
        }}
      >
        {P.name} · {String(k + 1).padStart(2, '0')}/04
      </div>

      <div
        style={{
          position: 'absolute',
          left: 90,
          top: 74,
          fontFamily: FONT.mono,
          fontSize: 20,
          letterSpacing: '.44em',
          color: P.ink,
          opacity: 0.85 * (1 - out),
        }}
      >
        04 · FOUR SKINS
      </div>

      <div style={{position: 'absolute', inset: 0, background: '#eaf7ff', opacity: inv(f, 104, 113) * 0.9}} />
      <Grain opacity={0.06} />
    </Fill>
  );
};
