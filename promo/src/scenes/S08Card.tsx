import React from 'react';
import {staticFile, useCurrentFrame} from 'remotion';
import {Fill, FONT} from '../theme';
import {Grain, Scanlines} from '../fx/Overlay';
import {clamp, easeOutExpo, inv, shake} from '../lib/math';
import {PALETTES, SHOTS} from '../timeline';

export const S08Card: React.FC = () => {
  const f = useCurrentFrame();
  const P = PALETTES.dream;
  const inP = easeOutExpo(inv(f, 0, 22));
  const scroll = easeOutExpo(inv(f, 16, 104)) * 520;
  const glitch = f > 92 ? 1 - Math.abs(f - 99) / 7 : 0;
  const sh = glitch > 0 ? shake(f, 12, 6, 2) : {x: 0, y: 0};
  const prog = clamp(inv(f, 12, 104));

  return (
    <Fill style={{background: '#1a0f22'}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          transform: `translate(${sh.x}px, ${sh.y}px)`,
        }}
      >
        <img
          src={staticFile(SHOTS.post)}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: 'auto',
            transform: `scale(${1.3 + (1 - inP) * 0.35}) translateY(${-scroll}px)`,
            transformOrigin: 'top center',
            filter:
              inP < 1
                ? `blur(${(1 - inP) * 10}px) brightness(.8)`
                : glitch > 0
                  ? `brightness(.8) saturate(${1 + glitch}) contrast(${1 + glitch * 0.4})`
                  : 'brightness(.8) saturate(1.02)',
          }}
        />
      </div>

      {/* 顶部/底部渐隐 */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 190, background: 'linear-gradient(180deg, rgba(26,15,34,.85), transparent)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 300, background: 'linear-gradient(0deg, rgba(26,15,34,.92), transparent)'}} />

      <div style={{position: 'absolute', left: 96, top: 86, display: 'flex', alignItems: 'center', gap: 14}}>
        <div style={{fontFamily: FONT.mono, fontSize: 20, letterSpacing: '.44em', color: '#f7d9ef'}}>04 · ARTICLE</div>
      </div>

      {/* 文章标题 */}
      <div
        style={{
          position: 'absolute',
          left: 80,
          bottom: 96,
          width: 1240,
          padding: '30px 34px 32px',
          background: 'linear-gradient(100deg, rgba(20,10,28,.86) 0%, rgba(20,10,28,.62) 62%, rgba(20,10,28,0) 100%)',
          borderLeft: '6px solid #ff8fbe',
          backdropFilter: 'blur(6px)',
        }}
      >
        <div
          style={{
            fontFamily: FONT.cjk,
            fontSize: 68,
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1.25,
            textShadow: '0 0 46px rgba(199,123,171,.85), 0 6px 30px rgba(0,0,0,.9), 2px 2px 0 rgba(0,0,0,.6)',
            transform: `translateY(${(1 - easeOutExpo(inv(f, 8, 34))) * 40}px)`,
            opacity: clamp(inv(f, 8, 30)),
          }}
        >
          这个博客是怎么搭起来的
        </div>
        <div style={{display: 'flex', gap: 10, marginTop: 18, opacity: clamp(inv(f, 20, 40))}}>
          {['hexo', 'retro desktop', '手写主题', '4 套配色'].map((t) => (
            <div
              key={t}
              style={{
                fontFamily: FONT.mono,
                fontSize: 15,
                letterSpacing: '.18em',
                color: '#fff2fc',
                border: '1px solid rgba(255,255,255,.45)',
                padding: '6px 12px',
                background: 'rgba(84,55,101,.35)',
                backdropFilter: 'blur(3px)',
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* 阅读进度 */}
      <div style={{position: 'absolute', right: 54, top: 140, bottom: 140, width: 4, background: 'rgba(255,255,255,.18)'}}>
        <div style={{width: '100%', height: `${prog * 100}%`, background: P.gl, boxShadow: `0 0 14px ${P.gl}`}} />
      </div>

      <Scanlines opacity={0.07} />
      <Grain opacity={0.05} />
      <div style={{position: 'absolute', inset: 0, background: '#fff', opacity: inv(f, 0, 12) * 0.9}} />
      <div style={{position: 'absolute', inset: 0, background: '#fff', opacity: inv(f, 102, 113) * 0.95}} />
    </Fill>
  );
};
