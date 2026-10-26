import React from 'react';
import {staticFile, useCurrentFrame} from 'remotion';
import {Fill, FONT} from '../theme';
import {Grain, Scanlines} from '../fx/Overlay';
import {clamp, easeInExpo, easeOutExpo, hash, inv} from '../lib/math';
import {PALETTES, SHOTS} from '../timeline';

export const S06Dive: React.FC = () => {
  const f = useCurrentFrame();
  const P = PALETTES.ocean;
  const p = inv(f, 0, 86);
  const s = 1 + 6.2 * easeInExpo(p);
  const ox = 0.345 * 1920;
  const oy = 0.6 * 1080;
  const tx = 960 - ox * s;
  const ty = 540 - oy * s;
  const trail = clamp((p - 0.42) / 0.5);
  const flash = inv(f, 92, 108);

  return (
    <Fill style={{background: '#04121e'}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          transformOrigin: '0 0',
          transform: `translate(${tx}px, ${ty}px) scale(${s}) rotate(${-1.6 * p}deg)`,
        }}
      >
        <img
          src={staticFile(SHOTS.ocean)}
          style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 45%'}}
        />
      </div>

      {/* 速度线 */}
      <div style={{position: 'absolute', inset: 0, overflow: 'hidden', opacity: trail * 0.9, mixBlendMode: 'screen'}}>
        {new Array(46).fill(0).map((_, i) => {
          const a = hash(i * 3.3) * Math.PI * 2;
          const r0 = 260 + hash(i * 7.1) * 700;
          const len = 260 + hash(i * 5.9) * 900;
          const w = 1 + hash(i * 2.1) * 3;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 960 + Math.cos(a) * r0,
                top: 540 + Math.sin(a) * r0 * 0.62,
                width: len * (0.4 + trail * 1.6),
                height: w,
                background: `linear-gradient(90deg, transparent, rgba(255,255,255,${0.15 + 0.5 * trail}), transparent)`,
                transform: `rotate(${a}rad)`,
                opacity: 0.2 + trail * 0.8,
              }}
            />
          );
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 52%, transparent 28%, rgba(3,16,26,${0.55 * trail}) 82%)`,
        }}
      />
      <Scanlines opacity={0.12 + trail * 0.1} />

      <div
        style={{
          position: 'absolute',
          left: 96,
          bottom: 84,
          opacity: (1 - trail) * clamp(inv(f, 0, 10)),
          transform: `translateY(${(1 - clamp(inv(f, 0, 12))) * 30}px)`,
        }}
      >
        <div style={{fontFamily: FONT.mono, fontSize: 20, letterSpacing: '.44em', color: '#cfeeff'}}>02 · DIVE IN</div>
        <div style={{fontFamily: FONT.cjk, fontSize: 62, fontWeight: 900, color: '#fff', marginTop: 8, textShadow: `0 0 40px ${P.gl}66`}}>
          一头扎进去
        </div>
      </div>

      <div style={{position: 'absolute', inset: 0, background: '#eaf7ff', opacity: flash * 0.96}} />
      <Grain opacity={0.05} />
    </Fill>
  );
};
