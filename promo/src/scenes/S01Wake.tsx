import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Fill, FONT} from '../theme';
import {CrtOverlay, Grain} from '../fx/Overlay';
import {clamp, easeOutExpo, hash, inv, typed} from '../lib/math';

const LINES = [
  {at: 50, text: 'CHENQIYUE OS  v1.0  ·  16-BIT DESKTOP', color: '#a8ffbc'},
  {at: 62, text: '(c) 2026 CHENQIYUE — ALL RAMBLINGS RESERVED', color: '#4fbf68'},
  {at: 74, text: '> MOUNT  /DEV/DREAM ............. OK', color: '#7dff9a'},
  {at: 84, text: '> LOAD   MEMORY [4 POSTS] ....... OK', color: '#7dff9a'},
  {at: 94, text: '> WAKE   DESKTOP ................ OK', color: '#7dff9a'},
];

export const S01Wake: React.FC = () => {
  const f = useCurrentFrame();

  const sx = f < 22 ? 0.02 + 0.33 * easeOutExpo(inv(f, 8, 22)) : 0.35 + 0.65 * easeOutExpo(inv(f, 22, 30));
  const sy = 0.0018 + 0.9982 * easeOutExpo(inv(f, 30, 48));
  const on = f >= 8;
  const flash = Math.max(0, 1 - Math.abs(f - 27) / 4);
  const flicker = 0.9 + 0.1 * hash(Math.floor(f / 2) * 3.7);

  const rollY = inv(f, 40, 78) * 1200 - 100;
  const showRoll = f > 38 && f < 82;

  const cursorOn = Math.floor(f / 12) % 2 === 0;

  return (
    <Fill style={{background: '#000'}}>
      {/* 屏幕本体 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scaleX(${sx}) scaleY(${sy})`,
          transformOrigin: '50% 50%',
          opacity: on ? 1 : 0,
          filter: `brightness(${1 + 2.2 * (1 - clamp(sy))}) saturate(1.1)`,
          background: 'radial-gradient(ellipse at 50% 50%, #0b180c 0%, #050a05 55%, #000 100%)',
          overflow: 'hidden',
        }}
      >
        {/* 磷光网格 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.5,
            backgroundImage:
              'linear-gradient(rgba(60,255,110,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(60,255,110,.05) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
        {/* 启动文本 */}
        <div
          style={{
            position: 'absolute',
            left: 148,
            top: 236,
            width: 1500,
            fontFamily: FONT.mono,
            fontSize: 30,
            lineHeight: 1.9,
            letterSpacing: '.04em',
            color: '#7dff9a',
            textShadow: '0 0 14px rgba(60,255,110,.55), 0 0 42px rgba(60,255,110,.25)',
            opacity: flicker,
          }}
        >
          {LINES.map((l, i) => {
            const p = inv(f, l.at - 6, l.at + 12);
            if (f < l.at - 6) return null;
            const txt = typed(l.text, p);
            const isLast = i === LINES.length - 1 || (i < LINES.length - 1 && f < LINES[i + 1].at - 6);
            return (
              <div key={i} style={{color: l.color, whiteSpace: 'pre'}}>
                {txt}
                {isLast && cursorOn ? (
                  <span style={{background: '#7dff9a', color: '#041004', marginLeft: 6}}>&nbsp;</span>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* 垂直回扫滚动带 */}
        {showRoll ? (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: rollY,
              height: 220,
              background:
                'linear-gradient(180deg, transparent, rgba(160,255,190,.13) 40%, rgba(220,255,230,.22) 50%, rgba(160,255,190,.13) 60%, transparent)',
              mixBlendMode: 'screen',
            }}
          />
        ) : null}

        <CrtOverlay intensity={1} scanned glow="#3bff6a" grain={0.09} />
      </div>

      {/* 开机白闪 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#eafff0',
          opacity: flash * 0.85,
          mixBlendMode: 'screen',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 2200 * sx,
          height: Math.max(2, 3 * (1 - inv(f, 30, 46)) + 1),
          transform: 'translate(-50%,-50%)',
          background: '#f2fff6',
          boxShadow: '0 0 30px #9dffbe, 0 0 90px #3bff6a, 0 0 180px #3bff6a',
          opacity: f < 46 ? 1 : Math.max(0, 1 - inv(f, 46, 56)),
        }}
      />
      <Grain opacity={0.09} />
    </Fill>
  );
};
