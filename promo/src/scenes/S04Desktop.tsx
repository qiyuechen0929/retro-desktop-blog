import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Fill, FONT} from '../theme';
import {FluidBackground, GridLayer} from '../fx/Background';
import {Grain, LightSweep, Vignette} from '../fx/Overlay';
import {Monitor} from '../components';
import {clamp, easeOutExpo, inv, springish} from '../lib/math';
import {PALETTES, SHOTS} from '../timeline';

export const S04Desktop: React.FC = () => {
  const f = useCurrentFrame();
  const P = PALETTES.dream;

  const inP = springish(inv(f, 0, 40), 3.4, 6);
  const rotY = -34 * (1 - easeOutExpo(inv(f, 0, 44)));
  const rotX = 12 * (1 - easeOutExpo(inv(f, 0, 44)));
  const float = Math.sin(f * 0.035) * 8;
  const zoom = easeOutExpo(inv(f, 92, 113));
  const sweep = inv(f, 52, 92);

  const chip = (i: number) => ({
    p: springish(inv(f, 26 + i * 7, 56 + i * 7), 3.8, 6.5),
  });

  return (
    <Fill style={{background: P.bg}}>
      <FluidBackground palette={P} speed={1.2} />
      <GridLayer color="rgba(255,242,252,.10)" size={54} />
      <Vignette strength={0.6} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: 2200,
        }}
      >
        <div
          style={{
            transform: `translateY(${float + (1 - inP) * 420}px) scale(${(0.82 + 0.18 * inP) * (1 + zoom * 3.2)})`,
            opacity: clamp(inP * 1.2),
          }}
        >
          <Monitor src={SHOTS.dream} width={1180} rotateY={rotY} rotateX={rotX} glow={1} />
        </div>

        {/* 悬浮小组件 */}
        <div
          style={{
            position: 'absolute',
            left: 130,
            top: 210,
            transform: `translateY(${(1 - chip(0).p) * 80}px) rotate(-4deg) scale(${0.92 + 0.08 * chip(0).p})`,
            opacity: chip(0).p * (1 - zoom),
          }}
        >
          <div
            style={{
              width: 300,
              background: 'rgba(255,249,253,.92)',
              border: '2px solid #836398',
              boxShadow: '10px 14px 40px rgba(70,40,90,.35)',
              padding: '16px 20px',
              fontFamily: FONT.mono,
              color: '#543765',
            }}
          >
            <div style={{fontSize: 14, letterSpacing: '.28em', color: '#91759a'}}>TAGS</div>
            <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10}}>
              {['blog 2', '折腾 2', '随笔 1', 'hexo 1'].map((t) => (
                <span
                  key={t}
                  style={{
                    border: '1px solid #c9afd3',
                    padding: '3px 8px',
                    fontSize: 15,
                    background: '#fff9fd',
                    boxShadow: 'inset 1px 1px 0 #fff, inset -1px -1px 0 #e4cfe7',
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            right: 120,
            top: 560,
            transform: `translateY(${(1 - chip(1).p) * 90}px) rotate(3.5deg) scale(${0.92 + 0.08 * chip(1).p})`,
            opacity: chip(1).p * (1 - zoom),
          }}
        >
          <div
            style={{
              width: 286,
              background: 'rgba(255,249,253,.92)',
              border: '2px solid #836398',
              boxShadow: '10px 14px 40px rgba(70,40,90,.35)',
              fontFamily: FONT.mono,
              color: '#543765',
            }}
          >
            <div style={{height: 34, background: 'linear-gradient(90deg,#9472bd,#e1a3c9)', color: '#fff', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 16}}>
              个人资料
            </div>
            <div style={{padding: '14px 16px', fontSize: 15, lineHeight: 1.8}}>
              <div style={{fontSize: 22, fontWeight: 700}}>ChenQiyue</div>
              <div style={{color: '#91759a'}}>一直在折腾，偶尔有结果。</div>
            </div>
          </div>
        </div>
      </div>

      {/* 顶部场景标签 */}
      <div style={{position: 'absolute', left: 84, top: 74, opacity: clamp(inv(f, 14, 30)) * (1 - zoom), display: 'flex', alignItems: 'center', gap: 16}}>
        <div style={{width: 46, height: 2, background: '#fff'}} />
        <div style={{fontFamily: FONT.mono, fontSize: 20, letterSpacing: '.4em', color: '#fff2fc'}}>01 · HOME</div>
      </div>

      <LightSweep progress={sweep} angle={20} width={22} opacity={0.75} color="rgba(255,255,255,.85)" />
      <Grain opacity={0.05} />
    </Fill>
  );
};
