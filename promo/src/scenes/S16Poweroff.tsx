import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Fill, FONT} from '../theme';
import {FluidBackground} from '../fx/Background';
import {Grain} from '../fx/Overlay';
import {PixelHeart} from '../components';
import {clamp, easeInExpo, inv} from '../lib/math';
import {PALETTES} from '../timeline';

export const S16Poweroff: React.FC = () => {
  const f = useCurrentFrame();
  const P = PALETTES.dream;

  const collapse = easeInExpo(inv(f, 0, 12));
  const sy = Math.max(0.0015, 1 - collapse);
  const sx = 1 - easeInExpo(inv(f, 9, 20)) * 0.985;
  const dot = clamp(inv(f, 18, 25)) * (1 - inv(f, 30, 42));
  const black = inv(f, 26, 34);

  const heartP = f > 26 ? Math.max(0, Math.sin(((f - 26) / 30) * Math.PI)) * (f < 70 ? 1 : 0.45 + 0.15 * Math.sin(f * 0.18)) : 0;
  const textOp = clamp(inv(f, 34, 54));
  const outOp = 1 - inv(f, 104, 113);

  return (
    <Fill style={{background: '#000'}}>
      {/* 关机收束 */}
      {f < 34 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `scaleY(${sy}) scaleX(${sx})`,
            transformOrigin: '50% 50%',
            background: P.bg,
            overflow: 'hidden',
            filter: `brightness(${1 + (1 - sy) * 2.4})`,
          }}
        >
          <FluidBackground palette={P} />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: FONT.cjk,
              fontSize: 150,
              fontWeight: 900,
              color: '#fff',
              textShadow: '10px 10px 0 #a06cc0',
              whiteSpace: 'nowrap',
            }}
          >
            ChenQiyue
          </div>
        </div>
      ) : null}

      {/* 关机白线 */}
      {f < 24 ? (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: `${1920 * sx}px`,
            height: `${Math.max(2, 1080 * sy)}px`,
            transform: 'translate(-50%,-50%)',
            background: '#fff',
            boxShadow: '0 0 40px #ffd6ec, 0 0 140px #ff8fbe',
          }}
        />
      ) : null}

      {/* 残点 + 扩散环 */}
      {dot > 0 ? (
        <>
          <div
            style={{
              position: 'absolute',
              left: 960 - 8,
              top: 540 - 8,
              width: 16,
              height: 16,
              background: '#fff',
              boxShadow: '0 0 60px #ffd6ec',
              opacity: dot,
              borderRadius: 8,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 960 - 320 * (1 - dot),
              top: 540 - 320 * (1 - dot),
              width: 640 * (1 - dot),
              height: 640 * (1 - dot),
              borderRadius: '50%',
              border: `1px solid rgba(255,214,236,${dot * 0.5})`,
            }}
          />
        </>
      ) : null}

      {black > 0 ? <div style={{position: 'absolute', inset: 0, background: '#000', opacity: black}} /> : null}

      {/* 结尾心跳 + 文案 */}
      {f > 24 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
            opacity: outOp,
          }}
        >
          <div style={{opacity: 0.45 + heartP * 0.55, transform: `scale(${0.94 + heartP * 0.06})`}}>
            <PixelHeart size={80} color="#ff9dc6" />
          </div>
          <div
            style={{
              fontFamily: FONT.cjk,
              fontSize: 42,
              letterSpacing: '.42em',
              color: '#fff2fc',
              opacity: textOp,
              textShadow: '0 0 40px rgba(255,143,190,.6)',
              marginTop: 10,
            }}
          >
            下 篇 文 章 见
          </div>
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 16,
              letterSpacing: '.55em',
              color: 'rgba(255,214,236,.6)',
              opacity: textOp,
            }}
          >
            060929.XYZ
          </div>
        </div>
      ) : null}

      <Grain opacity={0.08} />
    </Fill>
  );
};
