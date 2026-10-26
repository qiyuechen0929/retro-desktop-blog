import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Fill, FONT} from '../theme';
import {Grain} from '../fx/Overlay';
import {PixelHeart} from '../components';
import {clamp, easeOutExpo, hash, inv} from '../lib/math';
import {PALETTES} from '../timeline';

const STREAKS = new Array(70).fill(0).map((_, i) => ({
  a: (i / 70) * Math.PI * 2 + hash(i) * 0.6,
  len: 260 + hash(i * 3.1) * 700,
  w: 1 + hash(i * 7.3) * 3,
  sp: 0.6 + hash(i * 5.5) * 1.1,
}));

export const S20Finale: React.FC = () => {
  const f = useCurrentFrame();
  const P = PALETTES.dream;

  const warp = 1 - inv(f, 26, 52);
  const warpZoom = 0.5 + inv(f, 0, 52) * 2.4;

  const cursorT = easeOutExpo(clamp((f - 60) / 34));
  const cursorX = 980 + (336 - 980) * cursorT;
  const cursorY = 620 + (108 - 620) * cursorT;
  const click = Math.max(0, 1 - Math.abs(f - 96) / 6);

  const closeT = easeOutExpo(clamp((f - 100) / 18));
  const tabW = 340 * (1 - closeT);
  const tabOp = 1 - clamp((f - 100) / 14);

  const shrink = easeOutExpo(clamp((f - 128) / 26));
  const winScale = Math.max(0.0016, 1 - shrink);
  const winOp = 1 - clamp((f - 140) / 20);

  const dot = clamp(inv(f, 150, 158)) * (1 - inv(f, 176, 196));
  const heartIn = clamp((f - 168) / 26);
  const heartP = f > 168 ? 0.5 + 0.5 * Math.sin(((f - 168) / 46) * Math.PI * 2) : 0;
  const textOp = clamp((f - 196) / 30);
  const urlOp = clamp((f - 214) / 30);
  const out = 1 - inv(f, 318, 337);

  return (
    <Fill style={{background: '#000'}}>
      {/* 超空间拉伸 */}
      {warp > 0 ? (
        <div style={{position: 'absolute', inset: 0, opacity: warp}}>
          {STREAKS.map((s, i) => {
            const r = 40 + f * 34 * s.sp;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: 960,
                  top: 540,
                  width: s.len * warpZoom,
                  height: s.w,
                  transformOrigin: '0 0',
                  transform: `rotate(${s.a}rad) translateX(${r}px)`,
                  background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,214,236,.95) 60%, #fff 100%)',
                  borderRadius: 4,
                  filter: 'blur(.4px)',
                }}
              />
            );
          })}
          <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,.75) 0%, transparent 40%)', opacity: clamp(inv(f, 0, 24))}} />
        </div>
      ) : null}

      {/* 浏览器窗口：关掉标签页 */}
      {f > 50 && f < 175 ? (
        <div
          style={{
            position: 'absolute',
            left: 960,
            top: 540,
            width: 1240,
            height: 720,
            transform: `translate(-50%,-50%) scale(${winScale})`,
            opacity: winOp,
            filter: shrink > 0.2 ? `blur(${shrink * 6}px)` : undefined,
          }}
        >
          <div style={{position: 'absolute', inset: 0, background: '#dee1e6', borderRadius: 12, overflow: 'hidden', boxShadow: '0 40px 120px rgba(0,0,0,.7)'}}>
            <div style={{height: 46, background: '#202124', display: 'flex', alignItems: 'center', paddingLeft: 14, gap: 8}}>
              {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
                <span key={c} style={{width: 12, height: 12, borderRadius: 6, background: c}} />
              ))}
            </div>
            <div style={{height: 44, background: '#3a3d42', display: 'flex', alignItems: 'flex-end', paddingLeft: 12, gap: 4}}>
              <div
                style={{
                  width: tabW,
                  height: 38,
                  background: '#dee1e6',
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  paddingLeft: 12,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
              >
                <PixelHeart size={16} color="#e2557f" glow={0} />
                <span style={{fontFamily: FONT.cjk, fontSize: 15, color: '#1d1d1f', opacity: tabOp}}>ChenQiyue 的博客</span>
                <span style={{marginLeft: 'auto', marginRight: 10, fontSize: 15, color: '#6b6b6f', opacity: tabOp * (0.4 + click * 0.6)}}>×</span>
              </div>
            </div>
            <div style={{height: 38, background: '#dee1e6', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10, borderBottom: '1px solid #c4c7cc'}}>
              <span style={{fontFamily: FONT.mono, fontSize: 13, color: '#8a8d92'}}>← → ⟳</span>
              <div style={{flex: 1, height: 24, background: '#f1f3f4', borderRadius: 12, display: 'flex', alignItems: 'center', paddingLeft: 12, fontFamily: FONT.mono, fontSize: 13, color: '#3c4043'}}>
                060929.xyz
              </div>
            </div>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 128,
                bottom: 0,
                background: `linear-gradient(140deg, ${P.bg} 0%, ${P.blobs[1]} 55%, ${P.blobs[0]} 100%)`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 18,
              }}
            >
              <PixelHeart size={90} color="#f7a8c9" />
              <div style={{fontFamily: FONT.cjk, fontSize: 46, fontWeight: 900, color: '#fff', textShadow: '0 4px 24px rgba(60,20,60,.6)'}}>
                ChenQiyue 的博客
              </div>
              <div style={{fontFamily: FONT.cjk, fontSize: 22, letterSpacing: '.3em', color: 'rgba(255,255,255,.85)'}}>一直在折腾，偶尔有结果。</div>
            </div>
          </div>
          {/* 光标 */}
          {cursorT > 0 ? (
            <svg width={40} height={50} viewBox="0 0 22 27" style={{position: 'absolute', left: cursorX - 620, top: cursorY - 360, transform: `scale(${1 - click * 0.14})`, transformOrigin: '0 0', filter: 'drop-shadow(3px 3px 0 rgba(0,0,0,.3))'}}>
              <path d="M0 0 L0 21 L5.5 16 L9 24 L13 22.2 L9.6 14.6 L17 14.6 Z" fill="#fff" stroke="#000" strokeWidth={1.6} />
            </svg>
          ) : null}
        </div>
      ) : null}

      {/* 收束成点 */}
      {dot > 0 ? (
        <div style={{position: 'absolute', left: 960 - 9, top: 540 - 9, width: 18, height: 18, borderRadius: 9, background: '#fff', boxShadow: '0 0 80px #ffd6ec', opacity: dot}} />
      ) : null}

      {/* 结尾 */}
      {f > 160 ? (
        <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, opacity: out}}>
          <div style={{opacity: heartIn * (0.55 + heartP * 0.45), transform: `scale(${0.86 + heartIn * 0.14 + heartP * 0.04})`}}>
            <PixelHeart size={132} color="#ff9dc6" glow={2.4} />
          </div>
          <div style={{fontFamily: FONT.cjk, fontSize: 46, letterSpacing: '.44em', color: '#fff2fc', opacity: textOp, textShadow: '0 0 44px rgba(255,143,190,.6)', marginTop: 8}}>
            下 篇 文 章 见
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 18, opacity: urlOp}}>
            <span style={{width: 60, height: 1, background: 'rgba(255,214,236,.45)'}} />
            <span style={{fontFamily: FONT.mono, fontSize: 17, letterSpacing: '.55em', color: 'rgba(255,214,236,.75)'}}>060929.XYZ</span>
            <span style={{width: 60, height: 1, background: 'rgba(255,214,236,.45)'}} />
          </div>
        </div>
      ) : null}

      <Grain opacity={0.08} />
    </Fill>
  );
};
