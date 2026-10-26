import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {Fill, FONT} from '../theme';
import {Grain, Scanlines} from '../fx/Overlay';
import {clamp, easeOutCubic, easeOutExpo, inv} from '../lib/math';
import {PixelHeart} from '../components';
import {PALETTES, POSTS, SHOTS} from '../timeline';

const BEVEL = '2px solid';
const lt = '#ffffff';
const dk = '#7b7b7b';
const face = '#c3c3c3';

const Arrow: React.FC<{x: number; y: number; press: number}> = ({x, y, press}) => (
  <svg
    width={44}
    height={54}
    viewBox="0 0 22 27"
    style={{
      position: 'absolute',
      left: x,
      top: y,
      transform: `scale(${1 - press * 0.14})`,
      transformOrigin: '0 0',
      filter: 'drop-shadow(3px 3px 0 rgba(0,0,0,.35))',
      zIndex: 90,
    }}
  >
    <path d="M0 0 L0 21 L5.5 16 L9 24 L13 22.2 L9.6 14.6 L17 14.6 Z" fill="#fff" stroke="#000" strokeWidth={1.6} />
  </svg>
);

const Win98: React.FC<{
  x: number; y: number; w: number; h: number; title: string; open: number; accent: string;
  children: React.ReactNode; z?: number;
}> = ({x, y, w, h, title, open, accent, children, z = 20}) => {
  if (open < 0.005) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y + (1 - open) * 40,
        width: w,
        height: h,
        background: face,
        borderTop: `${BEVEL} ${lt}`,
        borderLeft: `${BEVEL} ${lt}`,
        borderRight: `${BEVEL} ${dk}`,
        borderBottom: `${BEVEL} ${dk}`,
        boxShadow: '10px 12px 0 rgba(0,0,0,.28)',
        opacity: open,
        transform: `scale(${0.9 + open * 0.1})`,
        zIndex: z,
      }}
    >
      <div
        style={{
          height: 40,
          margin: 3,
          background: `linear-gradient(90deg, ${accent}, rgba(255,255,255,.55))`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 6px 0 12px',
          color: '#fff',
          fontFamily: FONT.mono,
          fontSize: 20,
          fontWeight: 700,
          textShadow: '1px 1px 0 rgba(0,0,0,.4)',
        }}
      >
        <span>{title}</span>
        <span style={{display: 'flex', gap: 4}}>
          {['_', '□', '×'].map((c) => (
            <span
              key={c}
              style={{
                width: 30, height: 28, background: face, color: '#000', borderTop: `2px solid ${lt}`,
                borderLeft: `2px solid ${lt}`, borderRight: `2px solid ${dk}`, borderBottom: `2px solid ${dk}`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, textShadow: 'none',
              }}
            >
              {c}
            </span>
          ))}
        </span>
      </div>
      <div style={{padding: '8px 12px 12px'}}>{children}</div>
    </div>
  );
};

const Icon: React.FC<{x: number; y: number; label: string; kind: 'doc' | 'book' | 'pal' | 'feed'; hot: number}> = ({x, y, label, kind, hot}) => (
  <div style={{position: 'absolute', left: x, top: y, width: 132, textAlign: 'center', zIndex: 10}}>
    <div style={{position: 'absolute', inset: -10, background: 'rgba(255,255,255,.16)', outline: hot > 0.3 ? '2px dotted rgba(255,255,255,.9)' : 'none', opacity: hot}} />
    <svg width={64} height={64} viewBox="0 0 32 32" style={{imageRendering: 'pixelated', filter: 'drop-shadow(3px 3px 0 rgba(0,0,0,.3))'}}>
      {kind === 'doc' ? (
        <>
          <rect x={5} y={2} width={20} height={28} fill="#fff" stroke="#333" strokeWidth={1} />
          {[8, 12, 16, 20, 24].map((yy) => <rect key={yy} x={9} y={yy} width={12} height={1.6} fill="#5a7fb0" />)}
        </>
      ) : kind === 'book' ? (
        <>
          <rect x={3} y={6} width={26} height={20} fill="#f6d66a" stroke="#6b4a12" strokeWidth={1} />
          <rect x={6} y={9} width={10} height={8} fill="#e88ab5" />
          <rect x={18} y={9} width={8} height={5} fill="#7ac0e8" />
          <rect x={9} y={21} width={15} height={1.6} fill="#6b4a12" />
        </>
      ) : kind === 'pal' ? (
        <>
          <rect x={3} y={7} width={26} height={18} fill="#dcdcdc" stroke="#333" strokeWidth={1} />
          {['#c77bab', '#0d7d7d', '#0f3312', '#2f7fb8'].map((col, i) => (
            <rect key={col} x={5.5 + i * 6.1} y={11} width={5} height={10} fill={col} stroke="#555" strokeWidth={0.6} />
          ))}
        </>
      ) : (
        <>
          <rect x={4} y={5} width={24} height={22} fill="#ffd6ec" stroke="#8c3d63" strokeWidth={1} />
          <circle cx={11} cy={13} r={3.4} fill="#ff6fa8" />
          <path d="M11 22 q-6 -4 0 -8 q6 4 0 8" fill="#ff6fa8" />
          <rect x={18} y={11} width={7} height={1.8} fill="#8c3d63" />
          <rect x={18} y={16} width={7} height={1.8} fill="#8c3d63" />
        </>
      )}
    </svg>
    <div style={{fontFamily: FONT.cjk, fontSize: 17, color: '#fff', textShadow: '1px 1px 2px #000, 0 0 6px rgba(0,0,0,.6)', marginTop: 4}}>{label}</div>
  </div>
);

const THEMES = ['dream', 'classic', 'crt', 'ocean'];

export const S18Play: React.FC = () => {
  const f = useCurrentFrame();

  const ti = f < 190 ? 0 : f < 220 ? 1 : f < 250 ? 2 : 3;
  const P = PALETTES[THEMES[ti]];
  const swap = [190, 220, 250].reduce((a, m) => Math.max(a, m <= f && f < m + 9 ? 1 - (f - m) / 9 : 0), 0);

  const winA = clamp((f - 32) / 10);
  const winB = clamp((f - 102) / 10);
  const menu = clamp((f - 166) / 7) * (1 - clamp((f - 300) / 8));
  const closeAll = inv(f, 300, 316);
  const out = inv(f, 324, 337);

  // 光标路径
  const way = [
    {f: 0, x: 1500, y: 880},
    {f: 26, x: 96, y: 150},
    {f: 40, x: 96, y: 150},
    {f: 92, x: 96, y: 268},
    {f: 106, x: 96, y: 268},
    {f: 160, x: 96, y: 1012},
    {f: 176, x: 96, y: 1012},
    {f: 186, x: 330, y: 980},
    {f: 214, x: 330, y: 940},
    {f: 244, x: 330, y: 900},
    {f: 274, x: 330, y: 860},
    {f: 337, x: 1500, y: 300},
  ];
  let cx = way[0].x;
  let cy = way[0].y;
  for (let i = 0; i < way.length - 1; i++) {
    const a = way[i];
    const b = way[i + 1];
    if (f >= a.f && f <= b.f) {
      const t = easeOutCubic((f - a.f) / Math.max(1, b.f - a.f));
      cx = a.x + (b.x - a.x) * t;
      cy = a.y + (b.y - a.y) * t;
    }
  }
  const pressAt = [32, 102, 168, 192, 222, 252, 282];
  const press = pressAt.reduce((a, p) => Math.max(a, Math.abs(f - p) < 4 ? 1 - Math.abs(f - p) / 4 : 0), 0);

  const posts = POSTS.concat([{date: '2026.10.08', tag: 'readme', title: '一直在折腾，偶尔有结果'}]);

  return (
    <Fill style={{background: P.bg, overflow: 'hidden'}}>
      {/* 壁纸光斑 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 76% 24%, ${P.blobs[0]}cc 0%, transparent 42%),
                       radial-gradient(circle at 24% 74%, ${P.blobs[1]}bb 0%, transparent 46%),
                       radial-gradient(circle at 50% 50%, ${P.blobs[3]}88 0%, transparent 62%)`,
        }}
      />

      {/* 壁纸水印 */}
      <div style={{position: 'absolute', right: 90, bottom: 150, textAlign: 'right', opacity: 0.22}}>
        <div style={{fontFamily: FONT.cjk, fontSize: 86, fontWeight: 900, color: '#fff', letterSpacing: '.04em'}}>ChenQiyue 的博客</div>
        <div style={{fontFamily: FONT.mono, fontSize: 22, letterSpacing: '.5em', color: '#fff', marginTop: 6}}>060929.XYZ · 06:09</div>
      </div>
      <div style={{position: 'absolute', right: 150, bottom: 290, opacity: 0.18}}>
        <PixelHeart size={150} color="#fff" glow={0} />
      </div>

      {/* 图标 */}
      <Icon x={30} y={70} label="我的文章" kind="doc" hot={clamp((f - 26) / 6) * (1 - clamp((f - 46) / 8))} />
      <Icon x={30} y={190} label="展示册" kind="book" hot={clamp((f - 92) / 6) * (1 - clamp((f - 112) / 8))} />
      <Icon x={30} y={310} label="主题切换" kind="pal" hot={0} />
      <Icon x={30} y={430} label="订阅" kind="feed" hot={0} />

      {/* 窗口 A */}
      <Win98 x={400} y={120} w={980} h={500} title="我的文章 — 04 篇" open={winA * (1 - closeAll)} accent={P.accent} z={30}>
        <div style={{background: '#fff', border: `2px solid ${dk}`, borderRight: `2px solid ${lt}`, borderBottom: `2px solid ${lt}`, height: 380, padding: '10px 14px'}}>
          {posts.map((p, i) => {
            const t = clamp((f - 40 - i * 7) / 8);
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 16,
                  alignItems: 'baseline',
                  padding: '13px 10px',
                  borderBottom: '1px dashed #c9c9c9',
                  opacity: t,
                  transform: `translateX(${(1 - t) * -24}px)`,
                  background: i === 0 ? 'rgba(199,123,171,.14)' : undefined,
                }}
              >
                <span style={{fontFamily: FONT.mono, fontSize: 15, color: '#7a7a7a'}}>{p.date}</span>
                <span style={{fontFamily: FONT.mono, fontSize: 13, color: P.accent, letterSpacing: '.16em'}}>{p.tag.toUpperCase()}</span>
                <span style={{fontFamily: FONT.cjk, fontSize: 24, fontWeight: 700, color: '#1a1a1a'}}>{p.title}</span>
              </div>
            );
          })}
        </div>
      </Win98>

      {/* 窗口 B */}
      <Win98 x={760} y={330} w={760} h={520} title="展示册 — SHOWCASE" open={winB * (1 - closeAll)} accent={P.accent} z={40}>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#fff', border: `2px solid ${dk}`, padding: 10, height: 430}}>
          {[SHOTS.dream, SHOTS.post, SHOTS.showcase, SHOTS.crt].map((s, i) => {
            const t = clamp((f - 108 - i * 6) / 10);
            return (
              <div key={s} style={{position: 'relative', overflow: 'hidden', border: '2px solid #888', opacity: t, transform: `scale(${0.92 + t * 0.08})`}}>
                <Img src={staticFile(s)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, padding: '4px 8px', background: 'rgba(0,0,0,.6)', color: '#fff', fontFamily: FONT.mono, fontSize: 13}}>
                  {String(i + 1).padStart(2, '0')}
                </div>
              </div>
            );
          })}
        </div>
      </Win98>

      {/* 开始菜单 */}
      {menu > 0.01 ? (
        <div
          style={{
            position: 'absolute',
            left: 8,
            bottom: 56 + (1 - menu) * 30,
            width: 340,
            background: face,
            borderTop: `2px solid ${lt}`,
            borderLeft: `2px solid ${lt}`,
            borderRight: `2px solid ${dk}`,
            borderBottom: `2px solid ${dk}`,
            padding: 4,
            opacity: menu,
            zIndex: 60,
            boxShadow: '8px 8px 0 rgba(0,0,0,.3)',
          }}
        >
          <div style={{background: 'linear-gradient(180deg,#6a6a6a,#3a3a3a)', color: '#fff', fontFamily: FONT.mono, fontSize: 13, letterSpacing: '.3em', padding: '8px 10px'}}>
            4 SKINS · 主题
          </div>
          {THEMES.map((k, i) => {
            const p = PALETTES[k];
            const active = ti === i;
            return (
              <div
                key={k}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  background: active ? 'rgba(199,123,171,.35)' : 'transparent',
                  fontFamily: FONT.mono,
                  fontSize: 19,
                  color: '#111',
                }}
              >
                <span style={{width: 22, height: 22, background: p.bg, border: '1px solid #333', display: 'inline-block'}} />
                {p.name}
                {active ? <span style={{marginLeft: 'auto', fontSize: 15, color: '#444'}}>ACTIVE</span> : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* 任务栏 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 56,
          background: face,
          borderTop: `2px solid ${lt}`,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 8px',
          zIndex: 70,
        }}
      >
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: face,
            borderTop: `2px solid ${lt}`, borderLeft: `2px solid ${lt}`, borderRight: `2px solid ${dk}`, borderBottom: `2px solid ${dk}`,
            fontFamily: FONT.cjk, fontSize: 21, fontWeight: 700, color: '#111',
          }}
        >
          <span style={{width: 18, height: 18, background: `conic-gradient(${P.accent} 0 25%, ${P.blobs[0]} 0 50%, ${P.blobs[2]} 0 75%, ${P.blobs[1]} 0)`, display: 'inline-block'}} />
          开始
        </div>
        {['我的文章', '展示册'].map((t, i) => (
          <div key={t} style={{padding: '6px 14px', fontSize: 18, fontFamily: FONT.cjk, color: '#111', borderTop: `2px solid ${lt}`, borderLeft: `2px solid ${lt}`, borderRight: `2px solid ${dk}`, borderBottom: `2px solid ${dk}`, opacity: i === 0 ? winA : winB}}>
            {t}
          </div>
        ))}
        <div style={{marginLeft: 'auto', padding: '0 14px', fontFamily: FONT.mono, fontSize: 19, color: '#111', borderLeft: `2px solid ${dk}`}}>
          06:09
        </div>
      </div>

      <Arrow x={cx} y={cy} press={press} />

      {/* 主题切换闪白 */}
      {swap > 0 ? <div style={{position: 'absolute', inset: 0, background: P.bg, opacity: swap * 0.9, zIndex: 80}} /> : null}

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 96,
          textAlign: 'center',
          fontFamily: FONT.cjk,
          fontSize: 60,
          fontWeight: 900,
          letterSpacing: '.16em',
          color: '#fff',
          opacity: clamp((f - 250) / 14) * (1 - out) * 0.95,
          textShadow: '0 6px 30px rgba(0,0,0,.7), 0 0 60px rgba(255,255,255,.35)',
          zIndex: 65,
        }}
      >
        点 一 下 ， 就 是 一 个 世 界
      </div>

      <div style={{position: 'absolute', left: 96, top: 26, fontFamily: FONT.mono, fontSize: 20, letterSpacing: '.44em', color: '#fff', opacity: 0.9 * (1 - out), textShadow: '1px 1px 3px #000', zIndex: 75}}>
        05 · PLAY
      </div>

      {ti === 2 ? <Scanlines opacity={0.22} /> : null}
      <div style={{position: 'absolute', inset: 0, background: '#eaf7ff', opacity: inv(f, 330, 337) * 0.9, zIndex: 95}} />
      <Grain opacity={0.05} />
    </Fill>
  );
};
