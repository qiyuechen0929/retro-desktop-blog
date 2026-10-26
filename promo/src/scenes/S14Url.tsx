import React from 'react';
import {staticFile, useCurrentFrame} from 'remotion';
import {Fill, FONT} from '../theme';
import {FluidBackground} from '../fx/Background';
import {Grain} from '../fx/Overlay';
import {clamp, easeOutExpo, inv, typed} from '../lib/math';
import {PALETTES, SHOTS} from '../timeline';

const URL = 'https://060929.xyz';

export const S14Url: React.FC = () => {
  const f = useCurrentFrame();
  const P = PALETTES.ocean;
  const link = typed('060929.xyz', inv(f, 10, 40));
  const caret = Math.floor(f / 8) % 2 === 0;
  const go = inv(f, 46, 54);
  const loaded = easeOutExpo(inv(f, 56, 78));
  const zoom = easeOutExpo(inv(f, 92, 113));
  const ripple = clamp((f - 48) / 18);

  return (
    <Fill style={{background: '#0b1b2a'}}>
      <FluidBackground palette={P} speed={0.8} fade={0.55} />
      <div style={{position: 'absolute', inset: 0, background: 'rgba(4,14,24,.55)'}} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${1 + zoom * 0.5})`,
        }}
      >
        <div style={{width: 1360, transform: `perspective(1600px) rotateX(${6 - 6 * easeOutExpo(inv(f, 0, 30))}deg)`}}>
          {/* 浏览器窗口 */}
          <div style={{background: '#d8d0c6', border: '2px solid #2c2c2c', boxShadow: '0 40px 90px rgba(0,0,0,.6)'}}>
            <div
              style={{
                height: 46,
                background: 'linear-gradient(90deg,#123a5c,#2f7fb8)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                gap: 10,
                fontFamily: FONT.mono,
                fontSize: 18,
                color: '#fff',
              }}
            >
              <span style={{width: 14, height: 14, background: '#ff8fbe', border: '1px solid #fff'}} />
              <span>ChenQiyue 的博客 — Netscape Navigator</span>
              <span style={{marginLeft: 'auto', display: 'flex', gap: 6}}>
                {['_', '□', '×'].map((c) => (
                  <span key={c} style={{width: 26, height: 22, background: '#d8d0c6', color: '#123a5c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, border: '1px solid #2c2c2c'}}>
                    {c}
                  </span>
                ))}
              </span>
            </div>

            <div style={{display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', background: '#c8c0b6'}}>
              <div style={{fontFamily: FONT.mono, fontSize: 15, color: '#333'}}>地址</div>
              <div
                style={{
                  flex: 1,
                  height: 40,
                  background: '#fff',
                  border: '2px solid',
                  borderColor: '#6d6d6d #f4f4f4 #f4f4f4 #6d6d6d',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  fontFamily: FONT.mono,
                  fontSize: 26,
                  color: '#123a5c',
                  letterSpacing: '.02em',
                }}
              >
                <span style={{color: '#8aa6bb'}}>{URL.slice(0, 8)}</span>
                <span>{link}</span>
                {caret && f < 46 ? <span style={{width: 2, height: 28, background: '#123a5c', marginLeft: 2}} /> : null}
              </div>
              <div
                style={{
                  width: 96,
                  height: 40,
                  background: 'linear-gradient(180deg,#f2efe8,#cfc7bb)',
                  border: '2px solid',
                  borderColor: '#fff #6d6d6d #6d6d6d #fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: FONT.mono,
                  fontSize: 18,
                  color: '#123a5c',
                  transform: `scale(${1 - go * 0.08})`,
                  boxShadow: go > 0.2 ? 'inset 2px 2px 0 #6d6d6d' : 'none',
                }}
              >
                前往
              </div>
              {ripple > 0 && ripple < 1 ? (
                <div
                  style={{
                    position: 'absolute',
                    right: 12,
                    width: 40 + ripple * 220,
                    height: 40 + ripple * 220,
                    marginTop: -(40 + ripple * 220) / 2 + 20,
                    marginRight: -(40 + ripple * 220) / 2 + 48,
                    borderRadius: '50%',
                    border: `2px solid rgba(122,208,200,${1 - ripple})`,
                  }}
                />
              ) : null}
            </div>

            {/* 页面内容 */}
            <div style={{position: 'relative', height: 620, overflow: 'hidden', background: '#07131d'}}>
              {loaded > 0 ? (
                <img
                  src={staticFile(SHOTS.ocean)}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: 'auto',
                    transform: `scale(${1.02}) translateY(${-20 + (1 - loaded) * 60}px)`,
                    opacity: loaded,
                  }}
                />
              ) : null}
              {f > 46 && f < 86 ? (
                <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,16,26,.96)'}}>
                  <div style={{width: 560}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16}}>
                      <div style={{width: 12, height: 12, borderRadius: 6, background: '#7ad0c8', boxShadow: '0 0 18px #7ad0c8', opacity: 0.5 + 0.5 * Math.abs(Math.sin(f * 0.25))}} />
                      <div style={{fontFamily: FONT.mono, fontSize: 18, letterSpacing: '.32em', color: '#7ad0c8'}}>CONNECTING 060929.XYZ</div>
                    </div>
                    <div style={{height: 20, border: '1px solid #2f7fb8', padding: 3}}>
                      <div style={{height: '100%', width: `${clamp(inv(f, 48, 84)) * 100}%`, background: 'linear-gradient(90deg,#2f7fb8,#7ad0c8)', boxShadow: '0 0 18px #7ad0c8'}} />
                    </div>
                    <div style={{fontFamily: FONT.mono, fontSize: 14, letterSpacing: '.3em', color: 'rgba(122,208,200,.65)', marginTop: 14}}>
                      TRANSFERRING DATA ...
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 96,
          textAlign: 'center',
          fontFamily: FONT.cjk,
          fontSize: 40,
          letterSpacing: '.5em',
          color: '#eaf7ff',
          opacity: clamp(inv(f, 2, 20)) * (1 - zoom),
          textShadow: '0 0 30px rgba(122,208,200,.5)',
        }}
      >
        记 住 这 串 地 址
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 58,
          textAlign: 'center',
          fontFamily: FONT.cjk,
          fontSize: 34,
          letterSpacing: '.36em',
          color: '#eaf7ff',
          opacity: clamp(inv(f, 66, 88)) * (1 - zoom),
        }}
      >
        现 在 就 去 看 看
      </div>
      <Grain opacity={0.05} />
    </Fill>
  );
};
