import React from 'react';
import {staticFile, useCurrentFrame} from 'remotion';
import {Fill, FONT} from '../theme';
import {Grain} from '../fx/Overlay';
import {clamp, easeOutExpo, inv} from '../lib/math';
import {BEAT, PALETTES, SHOTS} from '../timeline';

const SLABS = [
  {key: 'dream', src: SHOTS.dream, dir: -1},
  {key: 'classic', src: SHOTS.classic, dir: 1},
  {key: 'crt', src: SHOTS.crt, dir: -1},
  {key: 'ocean', src: SHOTS.ocean, dir: 1},
] as const;

export const S11Slabs: React.FC = () => {
  const f = useCurrentFrame();
  const merge = easeOutExpo(inv(f, 86, 113));
  const gap = 18 * (1 - merge);
  const width = (1920 - 24 * 2 - gap * 3) / 4;

  return (
    <Fill style={{background: '#050308'}}>
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap}}>
        {SLABS.map((s, i) => {
          const start = i * BEAT;
          const p = easeOutExpo(inv(f, start, start + 20));
          const off = (1 - p) * s.dir * 1100;
          const P = PALETTES[s.key];
          return (
            <div
              key={s.key}
              style={{
                width,
                height: 1080 * 0.86 + (1 - p) * 160,
                transform: `translateX(${off}px) perspective(1200px) rotateY(${(1 - p) * s.dir * -22}deg) scale(${1 - merge * 0.06})`,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,.28)',
                boxShadow: `0 0 ${40 + merge * 60}px rgba(0,0,0,.65), inset 0 0 90px rgba(0,0,0,.4)`,
                position: 'relative',
                opacity: clamp(p * 1.5),
              }}
            >
              <img
                src={staticFile(s.src)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center 40%',
                  transform: `scale(${1.35 + (1 - p) * 0.2})`,
                  filter: 'saturate(.95)',
                }}
              />
              <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.15), rgba(0,0,0,.55))'}} />
              <div
                style={{
                  position: 'absolute',
                  left: 24,
                  bottom: 32,
                  fontFamily: FONT.display,
                  fontSize: 34,
                  fontWeight: 800,
                  letterSpacing: '.18em',
                  color: '#fff',
                  textShadow: `0 0 24px ${P.gl}`,
                }}
              >
                {P.name}
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: 24,
                  top: 26,
                  fontFamily: FONT.mono,
                  fontSize: 14,
                  letterSpacing: '.3em',
                  color: 'rgba(255,255,255,.65)',
                }}
              >
                {`0${i + 1}`}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 54,
          textAlign: 'center',
          fontFamily: FONT.cjk,
          fontSize: 32,
          letterSpacing: '.4em',
          color: '#fff2fc',
          opacity: clamp(inv(f, 20, 44)) * (1 - merge * 0.5),
        }}
      >
        一 个 桌 面 · 四 种 宇 宙
      </div>

      <div style={{position: 'absolute', inset: 0, background: '#fff', opacity: clamp((merge - 0.55) / 0.45) * 0.92}} />
      <Grain opacity={0.05} />
    </Fill>
  );
};
