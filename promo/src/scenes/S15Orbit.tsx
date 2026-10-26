import React from 'react';
import {staticFile, useCurrentFrame} from 'remotion';
import {Fill, FONT} from '../theme';
import {Grain, LightSweep} from '../fx/Overlay';
import {PixelHeart, PixelDrift} from '../components';
import {clamp, easeOutExpo, inv} from '../lib/math';
import {PALETTES, SHOTS} from '../timeline';

const PLANES = [
  {src: SHOTS.dream, name: 'DREAM', p: PALETTES.dream},
  {src: SHOTS.classic, name: 'CLASSIC', p: PALETTES.classic},
  {src: SHOTS.crt, name: 'CRT', p: PALETTES.crt},
  {src: SHOTS.ocean, name: 'OCEAN', p: PALETTES.ocean},
];

export const S15Orbit: React.FC = () => {
  const f = useCurrentFrame();
  const rot = f * 2.05;
  const tilt = -10 + Math.sin(f * 0.02) * 4;
  const zoomIn = easeOutExpo(inv(f, 96, 113));
  const sweep = inv(f, 20, 90);

  return (
    <Fill style={{background: 'radial-gradient(ellipse at 50% 50%, #2a1436 0%, #0e0714 58%, #000 100%)'}}>
      <PixelDrift count={110} color="#ffd6ec" seed={11} speed={0.5} size={5} />

      {/* 中心光环 */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 960 - (260 + i * 90),
            top: 520 - (260 + i * 90),
            width: (260 + i * 90) * 2,
            height: (260 + i * 90) * 2,
            borderRadius: '50%',
            border: `1px solid rgba(255,143,190,${0.22 - i * 0.05})`,
            transform: `scale(${1 + 0.04 * Math.sin(f * 0.05 + i)})`,
          }}
        />
      ))}

      <div style={{position: 'absolute', inset: 0, perspective: 2100, perspectiveOrigin: '50% 50%'}}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transformStyle: 'preserve-3d',
            transform: `scale(${1 + zoomIn * 0.35}) rotateX(${tilt}deg) rotateY(${rot}deg)`,
          }}
        >
          {PLANES.map((pl, i) => {
            const a = i * 90;
            const w = 620;
            const h = 388;
            return (
              <div
                key={pl.name}
                style={{
                  position: 'absolute',
                  left: 960 - w / 2,
                  top: 520 - h / 2,
                  width: w,
                  height: h,
                  transform: `rotateY(${a}deg) translateZ(650px)`,
                  border: `1px solid ${pl.p.gl}`,
                  boxShadow: `0 0 60px ${pl.p.gl}66`,
                  overflow: 'hidden',
                  background: '#000',
                }}
              >
                <img src={staticFile(pl.src)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center'}} />
                <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 55%, rgba(0,0,0,.75))'}} />
                <div
                  style={{
                    position: 'absolute',
                    left: 18,
                    bottom: 14,
                    fontFamily: FONT.display,
                    fontSize: 26,
                    fontWeight: 800,
                    letterSpacing: '.22em',
                    color: '#fff',
                    textShadow: `0 0 18px ${pl.p.gl}`,
                  }}
                >
                  {pl.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 中心爱心 */}
      <div
        style={{
          position: 'absolute',
          left: 960 - 62,
          top: 520 - 62,
          transform: `scale(${1 + Math.sin(f * 0.2) * 0.06})`,
          filter: 'drop-shadow(0 0 60px rgba(255,143,190,.85))',
        }}
      >
        <PixelHeart size={124} color="#ff9dc6" />
      </div>

      <div style={{position: 'absolute', left: 96, top: 86, opacity: 1 - zoomIn}}>
        <div style={{fontFamily: FONT.mono, fontSize: 20, letterSpacing: '.44em', color: '#f7d9ef'}}>06 · FOUR WORLDS</div>
      </div>

      <LightSweep progress={sweep} angle={22} width={18} opacity={0.35} color="rgba(255,214,236,.85)" />
      <div style={{position: 'absolute', inset: 0, background: '#fff', opacity: zoomIn * 0.9}} />
      <Grain opacity={0.05} />
    </Fill>
  );
};
