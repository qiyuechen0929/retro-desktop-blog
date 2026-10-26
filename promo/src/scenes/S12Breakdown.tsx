import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Fill, FONT} from '../theme';
import {Grain} from '../fx/Overlay';
import {clamp, inv, typed} from '../lib/math';

export const S12Breakdown: React.FC = () => {
  const f = useCurrentFrame();
  const line1 = typed('一直在折腾，', inv(f, 16, 52));
  const line2 = typed('偶尔有结果。', inv(f, 58, 96));
  const build = inv(f, 96, 113);
  const ring = (f * 6) % 360;

  return (
    <Fill style={{background: '#000'}}>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(30,16,40,.85) 0%, #000 62%)'}} />

      {/* 扩散环（riser 视觉） */}
      {[0, 1, 2].map((i) => {
        const r = ((ring + i * 120) % 360) * (1 + build * 2);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 960 - r,
              top: 540 - r,
              width: r * 2,
              height: r * 2,
              borderRadius: '50%',
              border: `1px solid rgba(255,214,236,${(1 - r / 360) * (0.16 + build * 0.35)})`,
            }}
          />
        );
      })}

      {/* 中心像素 */}
      <div
        style={{
          position: 'absolute',
          left: 960 - 6,
          top: 540 - 6,
          width: 12,
          height: 12,
          background: '#fff',
          boxShadow: `0 0 ${20 + build * 90}px rgba(255,214,236,${0.5 + build * 0.5}), 0 0 ${60 + build * 160}px rgba(255,143,190,${0.3 + build * 0.4})`,
          transform: `scale(${1 + Math.sin(f * 0.32) * 0.18 + build * 1.6})`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 610,
          textAlign: 'center',
          fontFamily: FONT.cjk,
          fontSize: 76,
          fontWeight: 900,
          letterSpacing: '.24em',
          color: '#fff2fc',
          lineHeight: 1.6,
          textShadow: '0 0 50px rgba(255,143,190,.35)',
          opacity: 1 - build * 0.25,
        }}
      >
        <div>{line1}</div>
        <div style={{height: 122, opacity: clamp(inv(f, 56, 70))}}>{line2}</div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 72,
          textAlign: 'center',
          fontFamily: FONT.mono,
          fontSize: 16,
          letterSpacing: '.7em',
          color: 'rgba(255,255,255,.32)',
          opacity: clamp(inv(f, 30, 50)),
        }}
      >
        CHENQIYUE · 060929.XYZ
      </div>

      <div style={{position: 'absolute', inset: 0, background: '#fff', opacity: Math.max(0, build - 0.85) * 0.6}} />
      <Grain opacity={0.07} />
    </Fill>
  );
};
