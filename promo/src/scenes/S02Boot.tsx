import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Fill, FONT} from '../theme';
import {CrtOverlay} from '../fx/Overlay';
import {HEART, PixelHeart} from '../components';
import {clamp, easeOutExpo, hash, inv, shake} from '../lib/math';

const CELLS: {x: number; y: number; d: number; ox: number; oy: number; rot: number; delay: number}[] = [];
HEART.forEach((row, y) => {
  row.split('').forEach((ch, x) => {
    if (ch !== '#') return;
    const d = Math.hypot(x - 7.5, y - 7.2) / 8;
    const a = hash(x * 3.1 + y * 7.7) * Math.PI * 2;
    CELLS.push({
      x,
      y,
      d,
      ox: Math.cos(a) * (900 + hash(x + y * 13) * 900),
      oy: Math.sin(a) * (700 + hash(x * 5 + y) * 700),
      rot: (hash(x * 2 + y * 11) - 0.5) * 220,
      delay: d * 8 + hash(x * 9 + y * 3) * 8,
    });
  });
});

export const S02Boot: React.FC = () => {
  const f = useCurrentFrame();
  const px = 34;
  const heartW = 16 * px;
  const cx = 960 - heartW / 2;
  const cy = 470;

  const ready = clamp(inv(f, 0, 16));
  const panic = f > 24 && f < 40;
  const sh = panic ? shake(f - 24, 26, 6, 4) : {x: 0, y: 0};
  const zoom = f > 96 ? easeOutExpo(inv(f, 96, 113)) : 0;
  const white = zoom > 0.55 ? (zoom - 0.55) / 0.45 : 0;

  return (
    <Fill style={{background: '#020602'}}>
      <div style={{position: 'absolute', inset: 0, transform: `translate(${sh.x}px, ${sh.y}px) scale(${1 + zoom * 5})`, transformOrigin: '50% 46%'}}>
        {/* 背景磷光 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at 50% 46%, rgba(40,120,58,.55) 0%, rgba(8,20,10,.9) 55%, #000 100%)',
            opacity: 0.9 - (panic ? 0.35 : 0),
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.35,
            backgroundImage:
              'linear-gradient(rgba(60,255,110,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(60,255,110,.04) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* READY + 进度条 */}
        {f < 30 ? (
          <div style={{position: 'absolute', left: 0, right: 0, top: 430, textAlign: 'center', opacity: 1 - inv(f, 24, 30)}}>
            <div
              style={{
                fontFamily: FONT.mono,
                fontSize: 44,
                letterSpacing: '.5em',
                color: '#7dff9a',
                textShadow: '0 0 24px rgba(60,255,110,.6)',
              }}
            >
              SYSTEM READY
            </div>
            <div
              style={{
                width: 720,
                height: 26,
                margin: '34px auto 0',
                border: '2px solid #3bff6a',
                padding: 4,
                boxShadow: '0 0 26px rgba(60,255,110,.35)',
              }}
            >
              <div style={{width: `${ready * 100}%`, height: '100%', background: '#3bff6a'}} />
            </div>
            <div style={{fontFamily: FONT.mono, fontSize: 20, color: '#4fbf68', marginTop: 14, letterSpacing: '.3em'}}>
              {String(Math.round(ready * 100)).padStart(3, '0')}%
            </div>
          </div>
        ) : null}

        {/* KERNEL PANIC */}
        {panic ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 1 - inv(f, 36, 42),
            }}
          >
            <div
              style={{
                fontFamily: FONT.mono,
                fontSize: 96,
                fontWeight: 700,
                letterSpacing: '.08em',
                color: '#ff3b5c',
                textShadow: '6px 0 0 #00e0ff, -6px 0 0 #ff00aa, 0 0 60px #ff3b5c',
              }}
            >
              KERNEL PANIC
            </div>
            <div style={{fontFamily: FONT.mono, fontSize: 34, color: '#ffb3c0', marginTop: 18, letterSpacing: '.2em'}}>
              TOO MUCH 折腾
            </div>
          </div>
        ) : null}

        {/* 像素爱心汇聚 */}
        {f >= 34 ? (
          <div style={{position: 'absolute', left: 0, top: 0}}>
            {CELLS.map((c, i) => {
              const p = easeOutExpo(clamp(inv(f, 34 + c.delay, 34 + c.delay + 26)));
              const q = 1 - p;
              const tx = cx + c.x * px;
              const ty = cy + c.y * px;
              const breathe = f > 96 ? 1 + 0.04 * Math.sin(f * 0.36) : 1;
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: tx,
                    top: ty,
                    width: px - 1,
                    height: px - 1,
                    background: c.d < 0.45 ? '#fff1f8' : pinkOf(c.d),
                    boxShadow: `0 0 ${px * 0.7}px ${pinkOf(c.d)}`,
                    opacity: p > 0.02 ? 1 : 0,
                    transform: `translate(${c.ox * q}px, ${c.oy * q}px) rotate(${c.rot * q}deg) scale(${
                      (0.3 + 0.7 * p) * breathe
                    })`,
                  }}
                />
              );
            })}
          </div>
        ) : null}

        {/* 爱心柔光 */}
        {f > 70 ? (
          <div
            style={{
              position: 'absolute',
              left: 960 - 420,
              top: 470 + 8 * px - 420,
              width: 840,
              height: 840,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,157,198,.30) 0%, transparent 66%)',
              opacity: clamp(inv(f, 70, 96)) * (0.7 + 0.25 * Math.sin(f * 0.28)),
              mixBlendMode: 'screen',
            }}
          />
        ) : null}
      </div>

      <CrtOverlay intensity={1} scanned glow="#3bff6a" grain={0.07} />

      {/* 白闪进下一场 */}
      <div style={{position: 'absolute', inset: 0, background: '#fff', opacity: white * 0.95}} />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%,-50%)',
          opacity: f > 100 ? clamp(inv(f, 100, 110)) * (1 - white) : 0,
        }}
      >
        <PixelHeart size={260} color="#ffd6ec" />
      </div>
    </Fill>
  );
};

const pinkOf = (d: number) => {
  if (d < 0.75) return '#ff9dc6';
  if (d < 0.92) return '#ff7fb4';
  return '#e86aa0';
};
