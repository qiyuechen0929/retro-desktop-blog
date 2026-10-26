import React from 'react';
import {staticFile, useCurrentFrame} from 'remotion';
import {Fill, FONT} from '../theme';
import {Grain, LightSweep} from '../fx/Overlay';
import {clamp, easeOutExpo, inv} from '../lib/math';
import {PALETTES, SHOTS} from '../timeline';

const SIDE = 720;
const FACES = [
  {src: SHOTS.dream, t: 'translateZ(360px)'},
  {src: SHOTS.ocean, t: 'rotateY(180deg) translateZ(360px)'},
  {src: SHOTS.classic, t: 'rotateY(90deg) translateZ(360px)'},
  {src: SHOTS.crt, t: 'rotateY(-90deg) translateZ(360px)'},
  {src: SHOTS.post, t: 'rotateX(90deg) translateZ(360px)'},
  {src: SHOTS.showcase, t: 'rotateX(-90deg) translateZ(360px)'},
];

export const S09Cube: React.FC = () => {
  const f = useCurrentFrame();
  const P = PALETTES.classic;
  const rotY = -24 + f * 2.35;
  const rotX = -16 + Math.sin(f * 0.03) * 5;
  const scale = 0.9 + 0.1 * easeOutExpo(inv(f, 0, 26)) + 0.5 * easeOutExpo(inv(f, 92, 113));
  const sweep = inv(f, 40, 92);

  return (
    <Fill style={{background: 'radial-gradient(ellipse at 50% 42%, #0d7d7d 0%, #053535 55%, #01100f 100%)'}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(159,224,213,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(159,224,213,.08) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at 50% 45%, #000 10%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 45%, #000 10%, transparent 70%)',
        }}
      />
      {/* 地面投影 */}
      <div
        style={{
          position: 'absolute',
          left: 960 - 420,
          top: 760,
          width: 840,
          height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(0,0,0,.6) 0%, transparent 70%)',
          filter: 'blur(14px)',
        }}
      />

      <div style={{position: 'absolute', inset: 0, perspective: 2000, perspectiveOrigin: '50% 44%'}}>
        <div
          style={{
            position: 'absolute',
            left: 960 - SIDE / 2,
            top: 470 - SIDE / 2,
            width: SIDE,
            height: SIDE,
            transformStyle: 'preserve-3d',
            transform: `scale(${scale}) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
          }}
        >
          {FACES.map((face, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                inset: 0,
                transform: face.t,
                backfaceVisibility: 'hidden',
                border: '2px solid rgba(159,224,213,.75)',
                boxShadow: '0 0 42px rgba(122,208,200,.4), inset 0 0 60px rgba(0,0,0,.5)',
                overflow: 'hidden',
                background: '#022',
              }}
            >
              <img src={staticFile(face.src)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(120deg, rgba(255,255,255,.20) 0%, rgba(255,255,255,0) 40%, rgba(0,0,0,.35) 100%)',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <LightSweep progress={sweep} angle={20} width={18} opacity={0.55} color="rgba(210,255,250,.9)" />

      <div style={{position: 'absolute', left: 96, bottom: 80, opacity: 1 - inv(f, 96, 113)}}>
        <div style={{fontFamily: FONT.mono, fontSize: 20, letterSpacing: '.44em', color: '#cfeee7'}}>05 · GALLERY</div>
        <div style={{fontFamily: FONT.cjk, fontSize: 54, fontWeight: 900, color: '#fff', marginTop: 10, textShadow: '0 0 30px rgba(122,208,200,.6)'}}>
          四套皮肤，一个桌面
        </div>
      </div>

      <div style={{position: 'absolute', inset: 0, background: '#fff', opacity: inv(f, 104, 113) * 0.9}} />
      <Grain opacity={0.05} />
    </Fill>
  );
};
