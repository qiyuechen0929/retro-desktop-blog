import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Fill, FONT} from '../theme';
import {FluidBackground, GridLayer, StarField} from '../fx/Background';
import {Grain, LightSweep, RGBAberrate} from '../fx/Overlay';
import {PixelHeart} from '../components';
import {clamp, easeOutExpo, hash, inv, popIn, shake} from '../lib/math';
import {PALETTES} from '../timeline';

const PARTS = new Array(120).fill(0).map((_, i) => ({
  a: hash(i * 1.7) * Math.PI * 2,
  v: 240 + hash(i * 3.1) * 1000,
  s: 4 + hash(i * 5.3) * 14,
  c: hash(i * 7.7) > 0.5 ? '#ffd6ec' : '#ff8fbe',
  spin: (hash(i * 9.3) - 0.5) * 720,
}));

export const S13Slam: React.FC = () => {
  const f = useCurrentFrame();
  const P = PALETTES.dream;
  const sh = shake(f, 34, 7, 3);
  const slam = popIn(inv(f, 0, 16));
  const sub = easeOutExpo(inv(f, 14, 40));
  const sweep = inv(f, 8, 56);
  const glitch = f > 54 && f < 62 ? Math.sin(((f - 54) / 8) * Math.PI) : 0;
  const zoom = easeOutExpo(inv(f, 88, 113)) * 0.18;

  return (
    <Fill style={{background: P.bg}}>
      <FluidBackground palette={P} speed={2.4} scale={1.15} />
      <GridLayer color="rgba(255,242,252,.14)" size={48} />
      <StarField count={36} color="#fff6c9" seed={4} drift={2.4} />

      {/* 粒子爆发 */}
      {f < 70
        ? PARTS.map((p, i) => {
            const t = clamp(inv(f, 0, 46));
            const d = p.v * Math.pow(t, 0.62);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: 960 + Math.cos(p.a) * d,
                  top: 470 + Math.sin(p.a) * d * 0.72,
                  width: p.s,
                  height: p.s,
                  background: p.c,
                  opacity: (1 - t) * 0.95,
                  boxShadow: `0 0 ${p.s}px ${p.c}`,
                  transform: `rotate(${p.spin * t}deg) scale(${1 + t})`,
                }}
              />
            );
          })
        : null}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `translate(${sh.x}px, ${sh.y}px) scale(${(1 + zoom) * (0.6 + 0.4 * slam)})`,
        }}
      >
        <RGBAberrate dx={glitch * 16 + (1 - clamp(inv(f, 0, 18))) * 22}>
          <div
            style={{
              fontFamily: FONT.cjk,
              fontSize: 232,
              fontWeight: 900,
              color: '#fff',
              lineHeight: 1,
              letterSpacing: '.01em',
              textShadow: '12px 12px 0 #a06cc0, 16px 16px 0 #7e4d9d, 0 0 120px rgba(255,214,236,.75)',
              whiteSpace: 'nowrap',
            }}
          >
            ChenQiyue
          </div>
        </RGBAberrate>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginTop: 18,
            opacity: sub,
            transform: `translateY(${(1 - sub) * 30}px)`,
          }}
        >
          <PixelHeart size={40} color="#ff8fbe" />
          <div style={{fontFamily: FONT.cjk, fontSize: 66, fontWeight: 900, color: '#fff2fc', letterSpacing: '.2em', textShadow: '4px 4px 0 rgba(84,55,101,.5)'}}>
            的博客
          </div>
          <div style={{width: 54, height: 2, background: 'rgba(255,255,255,.5)', margin: '0 10px'}} />
          <div style={{fontFamily: FONT.mono, fontSize: 26, letterSpacing: '.34em', color: '#fff2fc'}}>060929.XYZ</div>
        </div>

        <div
          style={{
            marginTop: 40,
            fontFamily: FONT.cjk,
            fontSize: 36,
            letterSpacing: '.34em',
            color: '#fff2fc',
            opacity: clamp(inv(f, 34, 54)) * 0.9,
          }}
        >
          一直在折腾，偶尔有结果
        </div>
      </div>

      <LightSweep progress={sweep} angle={16} width={26} opacity={0.85} color="rgba(255,255,255,.9)" />
      <div style={{position: 'absolute', inset: 0, background: '#fff', opacity: Math.max(0, 1 - f / 9) * 0.95}} />
      <Grain opacity={0.05} />
    </Fill>
  );
};
