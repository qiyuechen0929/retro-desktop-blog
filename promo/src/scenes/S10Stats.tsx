import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Fill, FONT} from '../theme';
import {Grain} from '../fx/Overlay';
import {PixelDrift} from '../components';
import {clamp, easeOutExpo, inv} from '../lib/math';
import {BEAT} from '../timeline';

const STATS = [
  {n: 4, cn: '篇文章', en: 'POSTS'},
  {n: 4, cn: '套配色', en: 'THEMES'},
  {n: 1, cn: '个桌面', en: 'DESKTOP'},
  {n: 999, cn: '次折腾', en: 'TINKERING', inf: true},
];

export const S10Stats: React.FC = () => {
  const f = useCurrentFrame();
  const idx = Math.min(3, Math.floor(f / BEAT));
  const local = f - idx * BEAT;
  const s = STATS[idx];
  const p = easeOutExpo(inv(local, 0, 16));
  const count = s.inf ? 0 : Math.round(s.n * clamp(inv(local, 0, 14)));
  const out = clamp(inv(local, 26, 28.125));

  return (
    <Fill style={{background: '#08050c'}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 30% 50%, rgba(199,123,171,.22) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(120,80,200,.18) 0%, transparent 50%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px)',
          backgroundSize: '100% 108px',
        }}
      />
      <PixelDrift count={70} color="#ffd6ec" seed={5} speed={0.6} size={5} />

      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 130, paddingRight: 130}}>
        {/* 数字 */}
        <div style={{width: 700, overflow: 'hidden'}}>
          <div
            style={{
              fontFamily: FONT.display,
              fontSize: s.inf ? 400 : 400,
              fontWeight: 900,
              lineHeight: 0.86,
              color: '#fff',
              letterSpacing: '-.02em',
              transform: `translateY(${(1 - p) * 380 - out * 320}px)`,
              opacity: clamp(p * 2) * (1 - out),
              textShadow: '0 0 80px rgba(255,143,190,.55), 0 0 20px rgba(255,143,190,.8)',
            }}
          >
            {s.inf ? '∞' : String(count).padStart(2, '0')}
          </div>
        </div>
        {/* 文案 */}
        <div style={{marginLeft: 60, overflow: 'hidden'}}>
          <div
            style={{
              fontFamily: FONT.cjk,
              fontSize: 132,
              fontWeight: 900,
              color: '#fff2fc',
              letterSpacing: '.06em',
              transform: `translateX(${(1 - p) * 180 - out * 140}px)`,
              opacity: clamp(p * 2) * (1 - out),
              whiteSpace: 'nowrap',
            }}
          >
            {s.cn}
          </div>
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 30,
              letterSpacing: '.62em',
              color: '#c77bab',
              marginTop: 14,
              transform: `translateX(${(1 - p) * 240}px)`,
              opacity: clamp(p * 1.6) * (1 - out),
            }}
          >
            {s.en}
          </div>
        </div>
      </div>

      {/* 节拍刻度 */}
      <div style={{position: 'absolute', left: 130, right: 130, bottom: 76, display: 'flex', gap: 12}}>
        {STATS.map((_, i) => (
          <div key={i} style={{flex: 1, height: 3, background: i <= idx ? '#ff8fbe' : 'rgba(255,255,255,.16)', boxShadow: i <= idx ? '0 0 12px #ff8fbe' : 'none'}} />
        ))}
      </div>
      <div style={{position: 'absolute', right: 130, top: 70, fontFamily: FONT.mono, fontSize: 18, letterSpacing: '.5em', color: 'rgba(255,255,255,.4)'}}>
        {String(idx + 1).padStart(2, '0')} / 04
      </div>
      <Grain opacity={0.06} />
    </Fill>
  );
};
