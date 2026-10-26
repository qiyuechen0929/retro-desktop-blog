import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Fill, FONT} from '../theme';
import {Grain, RGBAberrate} from '../fx/Overlay';
import {WinCard} from '../components';
import {clamp, inv} from '../lib/math';
import {PALETTES} from '../timeline';

const CARDS = [
  {tag: 'AI · 思考', title: '在AI时代浪潮下，对未来的思考', excerpt: '兴奋与恐惧同时到来。这是我们这代人有机会亲眼看着它发生的一次。', date: '2026.10.08'},
  {tag: '随笔', title: '折腾的意义', excerpt: '把时间花在没用的地方，然后某天它突然有用了。', date: '2026.10.08'},
  {tag: 'BLOG · HEXO', title: '这个博客是怎么搭起来的', excerpt: '手写一套 Win98 复古桌面主题，四套配色，零 UI 框架。', date: '2026.10.08'},
  {tag: 'SHOWCASE', title: '展示册', excerpt: '折腾出的东西会持续摆上来，敬请期待。', date: '持续更新'},
  {tag: 'ABOUT', title: '关于我', excerpt: '一直在折腾，偶尔有结果。', date: 'ChenQiyue'},
  {tag: 'README', title: '一直在折腾，偶尔有结果', excerpt: '记录技术、折腾与生活。', date: '2026'},
  {tag: 'RSS', title: '订阅这个博客', excerpt: 'Atom feed，随时带走。', date: 'atom.xml'},
  {tag: 'ARCHIVE', title: '归档', excerpt: '所有时间线上的碎片。', date: '2026'},
];

const STEP = 14;

export const S07Tunnel: React.FC = () => {
  const f = useCurrentFrame();
  const P = PALETTES.ocean;
  const idx = Math.floor(f / STEP) % CARDS.length;
  const t = (f % STEP) / STEP;
  const c = CARDS[idx];
  const out = inv(f, 100, 113);

  const scale = 0.66 + t * 0.62;
  const op = Math.min(clamp(t / 0.16), clamp((1 - t) / 0.16)) * (1 - out);
  const rot = (idx % 2 === 0 ? -1 : 1) * (2 + t * 3);

  return (
    <Fill style={{background: 'radial-gradient(ellipse at 50% 50%, #16405c 0%, #04121e 58%, #01060b 100%)'}}>
      {/* 速度线 */}
      <div style={{position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.55}}>
        {new Array(30).fill(0).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 960 - 760,
              top: 40 + i * 34,
              width: 1520,
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(160,220,255,.3), transparent)',
              opacity: 0.25 + 0.6 * Math.abs(Math.sin(i * 1.7 + f * 0.12)),
            }}
          />
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 360,
          top: 300,
          width: 1200,
          height: 480,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(120,200,255,.28) 0%, transparent 66%)',
          mixBlendMode: 'screen',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          perspective: 1400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            transform: `scale(${scale}) rotate(${rot}deg)`,
            opacity: op,
            filter: `blur(${clamp(Math.abs(t - 0.5) * 2 - 0.5) * 2.4}px)`,
          }}
        >
          <WinCard title={c.title.slice(0, 16)} palette={P} width={1240} titleSize={22}>
            <div style={{padding: '34px 40px 36px', background: '#fff9fd', height: 340, boxSizing: 'border-box'}}>
              <div style={{fontFamily: FONT.mono, fontSize: 15, letterSpacing: '.3em', color: P.accent}}>{c.tag}</div>
              <div
                style={{
                  fontFamily: FONT.cjk,
                  fontSize: 58,
                  fontWeight: 900,
                  color: P.ink,
                  lineHeight: 1.3,
                  marginTop: 12,
                  height: 160,
                  overflow: 'hidden',
                }}
              >
                {c.title}
              </div>
              <div style={{fontFamily: FONT.cjk, fontSize: 22, lineHeight: 1.75, color: '#8a6f93', height: 76, overflow: 'hidden'}}>
                {c.excerpt}
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 10, fontFamily: FONT.mono, fontSize: 16, color: '#91759a'}}>
                <span>{c.date}</span>
                <span style={{color: P.accent}}>READ →</span>
              </div>
            </div>
          </WinCard>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 96,
          top: 80,
          fontFamily: FONT.mono,
          fontSize: 20,
          letterSpacing: '.44em',
          color: '#cfeeff',
          opacity: 1 - out,
        }}
      >
        03 · ARTICLES
      </div>

      <div
        style={{
          position: 'absolute',
          right: 96,
          top: 78,
          fontFamily: FONT.mono,
          fontSize: 44,
          fontWeight: 700,
          letterSpacing: '.1em',
          color: 'rgba(207,238,255,.9)',
          opacity: 1 - out,
          textShadow: '0 0 26px rgba(120,200,255,.6)',
        }}
      >
        {String(idx + 1).padStart(2, '0')}
        <span style={{fontSize: 20, opacity: 0.5}}> / 08</span>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 60,
          textAlign: 'center',
          fontFamily: FONT.cjk,
          fontSize: 30,
          letterSpacing: '.5em',
          color: '#cfeeff',
          opacity: clamp(inv(f, 10, 32)) * (1 - out * 1.4),
          textShadow: '0 0 26px rgba(120,200,255,.6)',
        }}
      >
        往 下 翻 ， 全 是 折 腾
      </div>

      {t < 0.18 ? <RGBAberrate dx={0} dy={(0.18 - t) * 26}><div /></RGBAberrate> : null}
      <div style={{position: 'absolute', inset: 0, background: '#eaf7ff', opacity: inv(f, 104, 113) * 0.92}} />
      <Grain opacity={0.05} />
    </Fill>
  );
};
