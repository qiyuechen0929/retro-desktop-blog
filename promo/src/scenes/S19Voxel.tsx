import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Fill, FONT} from '../theme';
import {Grain} from '../fx/Overlay';
import {StarField} from '../fx/Background';
import {HEART} from '../components';
import {clamp, easeOutExpo, hash, inv} from '../lib/math';

const CELL = 26;
const LAYERS = [-52, 0, 52];

type Vox = {x: number; y: number; z: number; i: number; d: number; sx: number; sy: number; sz: number; rot: number; hue: number};

const buildVoxels = (): Vox[] => {
  const out: Vox[] = [];
  let i = 0;
  LAYERS.forEach((z, zi) => {
    HEART.forEach((row, y) => {
      row.split('').forEach((ch, x) => {
        if (ch !== '#') return;
        const cx = (x - 7.5) * CELL;
        const cy = (y - 7.5) * CELL;
        const d = Math.sqrt(cx * cx + cy * cy) / 200;
        out.push({
          x: cx,
          y: cy,
          z,
          i,
          d,
          sx: (hash(i * 3.1) - 0.5) * 2600,
          sy: (hash(i * 7.7) - 0.5) * 1800,
          sz: -1400 - hash(i * 5.3) * 1800,
          rot: (hash(i * 9.1) - 0.5) * 720,
          hue: zi === 1 ? 0.1 : 0,
        });
        i++;
      });
    });
  });
  return out;
};

const VOXELS = buildVoxels();

export const S19Voxel: React.FC = () => {
  const f = useCurrentFrame();
  const out = inv(f, 200, 225);

  const spin = -28 + Math.sin(f * 0.013) * 34;
  const tiltX = -12 + Math.sin(f * 0.019) * 7;
  const zoom = 0.94 + clamp((f - 150) / 75) * 0.9;
  const pulse = 1 + Math.max(0, Math.sin(f * 0.16)) * 0.035;

  const textIn = clamp((f - 120) / 26);

  return (
    <Fill style={{background: 'radial-gradient(ellipse at 50% 46%, #3a1030 0%, #170616 52%, #050206 100%)'}}>
      <StarField count={170} drift={0.5} />
      <div
        style={{
          position: 'absolute',
          left: 360,
          top: 140,
          width: 1200,
          height: 800,
          background: 'radial-gradient(circle, rgba(255,120,180,.22) 0%, transparent 62%)',
          mixBlendMode: 'screen',
        }}
      />

      <div style={{position: 'absolute', inset: 0, perspective: 1400}}>
        <div
          style={{
            position: 'absolute',
            left: 960,
            top: 520,
            transformStyle: 'preserve-3d',
            transform: `scale(${zoom * pulse}) rotateX(${tiltX}deg) rotateY(${spin}deg)`,
          }}
        >
          {VOXELS.map((v) => {
            const t = clamp((f - 8 - v.d * 34) / 34);
            const e = easeOutExpo(t);
            const px = v.sx * (1 - e);
            const py = v.sy * (1 - e);
            const pz = v.sz * (1 - e);
            const rot = v.rot * (1 - e);
            const light = 0.62 + 0.38 * Math.sin((v.x + v.y) * 0.02 + f * 0.03);
            return (
              <div
                key={v.i}
                style={{
                  position: 'absolute',
                  left: -CELL / 2,
                  top: -CELL / 2,
                  width: CELL,
                  height: CELL,
                  opacity: e,
                  transform: `translate3d(${v.x + px}px, ${v.y + py}px, ${v.z + pz}px) rotateX(${rot}deg) rotateY(${rot}deg)`,
                  background: `linear-gradient(135deg, hsl(${330 + v.hue * 40} 100% ${72 * light}%), hsl(${333 + v.hue * 40} 78% ${46 * light}%))`,
                  boxShadow: `inset 0 0 0 1px rgba(255,255,255,${0.28 + 0.3 * light}), 0 0 ${14 + 10 * light}px rgba(255,120,180,${0.25 + 0.4 * light})`,
                  borderRadius: 2,
                }}
              />
            );
          })}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 92,
          textAlign: 'center',
          fontFamily: FONT.cjk,
          fontSize: 44,
          letterSpacing: '.34em',
          color: '#ffd6ec',
          opacity: textIn * (1 - out),
          textShadow: '0 0 40px rgba(255,120,180,.7)',
        }}
      >
        折 腾 是 唯 一 的 形 状
      </div>

      <div style={{position: 'absolute', left: 96, top: 80, fontFamily: FONT.mono, fontSize: 20, letterSpacing: '.44em', color: '#ffd6ec', opacity: 0.9 * (1 - out)}}>
        06 · VOXEL HEART
      </div>

      <div style={{position: 'absolute', inset: 0, background: '#fff', opacity: inv(f, 214, 225) * 0.85}} />
      <Grain opacity={0.07} />
    </Fill>
  );
};
