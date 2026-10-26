import React from 'react';
import {staticFile, useCurrentFrame} from 'remotion';
import {Fill, FONT} from '../theme';
import {Grain, RGBAberrate, Scanlines} from '../fx/Overlay';
import {Cursor} from '../components';
import {clamp, easeOutExpo, inv} from '../lib/math';
import {BEAT, PALETTES, SHOTS} from '../timeline';

const ORDER = ['dream', 'classic', 'crt', 'ocean'] as const;

export const S05Roulette: React.FC = () => {
  const f = useCurrentFrame();
  const idx = Math.min(3, Math.floor(f / BEAT));
  const local = f - idx * BEAT;
  const sinceCut = local;
  const flash = Math.max(0, 1 - sinceCut / 7);
  const glitch = Math.max(0, 1 - sinceCut / 9);
  const P = PALETTES[ORDER[idx]];

  const press = Math.max(0, 1 - Math.abs(local - 2) / 6);
  const cursorX = 986 + idx * 19;
  const cursorY = 66 + Math.sin(f * 0.12) * 3;

  return (
    <Fill style={{background: '#000'}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${1.02 + glitch * 0.02})`,
          filter: glitch > 0.35 ? `saturate(${1 + glitch * 0.9}) contrast(${1 + glitch * 0.3})` : undefined,
        }}
      >
        {ORDER.map((key, i) => {
          if (i !== idx && i !== idx - 1) return null;
          const isCur = i === idx;
          const op = isCur ? 1 : clamp(1 - sinceCut / 4);
          return (
            <img
              key={key}
              src={staticFile(SHOTS[key])}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center 45%',
                opacity: op,
                transform: isCur ? `translateY(${(1 - easeOutExpo(clamp(sinceCut / 6))) * -26}px)` : 'none',
              }}
            />
          );
        })}
      </div>

      <Scanlines opacity={0.1} gap={4} />
      <Grain opacity={0.045} />

      {/* 光标点色板 */}
      <RGBAberrate dx={glitch * 8}>
        <Cursor x={cursorX} y={cursorY} scale={1.6} click={press} tint="#000" />
      </RGBAberrate>

      {/* 主题名 */}
      <div style={{position: 'absolute', left: 92, bottom: 96}}>
        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: 18,
            letterSpacing: '.44em',
            color: P.gl,
            marginBottom: 10,
            opacity: 0.9,
          }}
        >
          COLOR SCHEME {String(idx + 1).padStart(2, '0')}/04
        </div>
        <div
          style={{
            fontFamily: FONT.display,
            fontSize: 132,
            fontWeight: 900,
            letterSpacing: '.02em',
            lineHeight: 0.94,
            color: '#fff',
            textShadow: `0 0 40px ${P.gl}, 10px 10px 0 rgba(0,0,0,.22)`,
            transform: `scale(${1 + (1 - easeOutExpo(inv(sinceCut, 0, 10))) * 0.22})`,
            transformOrigin: '0 100%',
          }}
        >
          {P.name}
        </div>
      </div>

      {/* 右侧色板列表 */}
      <div style={{position: 'absolute', right: 88, bottom: 100, display: 'flex', flexDirection: 'column', gap: 10}}>
        {ORDER.map((k, i) => {
          const on = i === idx;
          return (
            <div key={k} style={{display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end'}}>
              <div
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 16,
                  letterSpacing: '.3em',
                  color: on ? '#fff' : 'rgba(255,255,255,.42)',
                }}
              >
                {PALETTES[k].name}
              </div>
              <div
                style={{
                  width: on ? 58 : 34,
                  height: 16,
                  background: PALETTES[k].blobs[0],
                  border: '1px solid rgba(255,255,255,.6)',
                  boxShadow: on ? `0 0 18px ${PALETTES[k].blobs[0]}` : 'none',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* 切色白闪 */}
      <div style={{position: 'absolute', inset: 0, background: P.blobs[0], opacity: flash * 0.34, mixBlendMode: 'screen'}} />
    </Fill>
  );
};
