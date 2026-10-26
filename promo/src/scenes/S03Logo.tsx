import React from 'react';
import {staticFile, useCurrentFrame} from 'remotion';
import {Fill, FONT} from '../theme';
import {FluidBackground, GridLayer, StarField} from '../fx/Background';
import {Grain, LightSweep, RGBAberrate} from '../fx/Overlay';
import {PixelHeart} from '../components';
import {clamp, easeOutExpo, inv, springish} from '../lib/math';
import {PALETTES} from '../timeline';

export const S03Logo: React.FC = () => {
  const f = useCurrentFrame();
  const P = PALETTES.dream;

  const outFlash = 1 - inv(f, 0, 13);
  const lineP = springish(inv(f, 4, 34));
  const subP = easeOutExpo(inv(f, 24, 48));
  const sweep = inv(f, 34, 78);
  const glitch = f > 52 && f < 58 ? 1 - Math.abs(f - 55) / 3 : 0;
  const zoom = easeOutExpo(inv(f, 96, 113));
  const exitFlash = inv(f, 104, 113);

  return (
    <Fill style={{background: P.bg}}>
      <FluidBackground palette={P} />
      <GridLayer color="rgba(255,242,252,.12)" size={54} />
      <StarField count={26} color="#fff6c9" seed={9} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${1 + zoom * 0.55})`,
          filter: glitch ? `blur(${glitch * 1.2}px)` : undefined,
        }}
      >
        {/* 幽灵描边大字 */}
        <div
          style={{
            position: 'absolute',
            fontFamily: FONT.display,
            fontSize: 430,
            fontWeight: 800,
            color: 'transparent',
            WebkitTextStroke: '2px rgba(255,255,255,.28)',
            letterSpacing: '.06em',
            transform: `translateY(${-30 + Math.sin(f * 0.02) * 8}px) scale(${1 + 0.02 * Math.sin(f * 0.03)})`,
            opacity: 0.55,
            whiteSpace: 'nowrap',
          }}
        >
          CHENQIYUE
        </div>

        <div
          style={{
            position: 'absolute',
            top: 128,
            fontFamily: FONT.mono,
            fontSize: 20,
            letterSpacing: '.62em',
            color: '#fff2fc',
            opacity: subP * 0.85,
            textShadow: '0 2px 0 rgba(84,55,101,.45)',
          }}
        >
          EST. 2026 · HAND-BUILT DESKTOP
        </div>

        <RGBAberrate dx={glitch * 9}>
          <div style={{overflow: 'hidden', padding: '0 30px'}}>
            <div
              style={{
                transform: `translateY(${(1 - lineP) * 250}px)`,
                opacity: clamp(lineP * 1.4),
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: FONT.cjk,
                  fontSize: 196,
                  fontWeight: 900,
                  color: '#fff',
                  lineHeight: 1,
                  letterSpacing: '.01em',
                  textShadow:
                    '9px 9px 0 #b18bc7, 12px 12px 0 #8f63a8, 0 0 90px rgba(255,214,236,.6)',
                  whiteSpace: 'nowrap',
                }}
              >
                ChenQiyue
              </div>
            </div>
          </div>
        </RGBAberrate>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            marginTop: 30,
            opacity: subP,
            transform: `translateY(${(1 - subP) * 24}px)`,
          }}
        >
          <PixelHeart size={46} color="#ff8fbe" />
          <div
            style={{
              fontFamily: FONT.cjk,
              fontSize: 84,
              fontWeight: 900,
              color: '#fff2fc',
              letterSpacing: '.16em',
              textShadow: '4px 4px 0 rgba(84,55,101,.5)',
              whiteSpace: 'nowrap',
            }}
          >
            的博客
          </div>
          <div style={{width: 64, height: 2, background: 'rgba(255,255,255,.55)'}} />
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 22,
              letterSpacing: '.3em',
              color: '#fff2fc',
              opacity: 0.8,
            }}
          >
            060929.XYZ
          </div>
        </div>

        <div
          style={{
            marginTop: 34,
            fontFamily: FONT.cjk,
            fontSize: 40,
            letterSpacing: '.2em',
            color: '#fff2fc',
            opacity: subP * 0.92,
            textShadow: '2px 2px 0 rgba(84,55,101,.55)',
            transform: `translateY(${(1 - subP) * 20}px)`,
          }}
        >
          一直在折腾，偶尔有结果。
        </div>
      </div>

      <LightSweep progress={sweep} angle={14} width={26} opacity={0.5} color="rgba(255,255,255,.75)" />
      <Grain opacity={0.06} />

      <div style={{position: 'absolute', inset: 0, background: '#fff', opacity: outFlash * 0.95}} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, #fff 0%, ${P.gl} 60%, transparent 100%)`,
          opacity: exitFlash * 0.9,
        }}
      />
      {/* 底部条：站点点阵提示 */}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: 'rgba(255,255,255,.35)'}} />
    </Fill>
  );
};
