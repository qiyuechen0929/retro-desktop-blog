import React from 'react';
import {Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {BAR, DURATION, FPS, HEIGHT, SCENES, WIDTH} from './timeline';
import {FONT} from './theme';
import {clamp, hash, inv} from './lib/math';
import {S01Wake} from './scenes/S01Wake';
import {S02Boot} from './scenes/S02Boot';
import {S03Logo} from './scenes/S03Logo';
import {S04Desktop} from './scenes/S04Desktop';
import {S05Roulette} from './scenes/S05Roulette';
import {S06Dive} from './scenes/S06Dive';
import {S07Tunnel} from './scenes/S07Tunnel';
import {S08Card} from './scenes/S08Card';
import {S09Cube} from './scenes/S09Cube';
import {S10Stats} from './scenes/S10Stats';
import {S11Slabs} from './scenes/S11Slabs';
import {S12Breakdown} from './scenes/S12Breakdown';
import {S13Slam} from './scenes/S13Slam';
import {S14Url} from './scenes/S14Url';
import {S15Orbit} from './scenes/S15Orbit';
import {S17Shatter} from './scenes/S17Shatter';
import {S18Play} from './scenes/S18Play';
import {S19Voxel} from './scenes/S19Voxel';
import {S20Finale} from './scenes/S20Finale';

const MAP: Record<string, React.FC> = {
  wake: S01Wake,
  boot: S02Boot,
  logo: S03Logo,
  desktop: S04Desktop,
  roulette: S05Roulette,
  dive: S06Dive,
  tunnel: S07Tunnel,
  card: S08Card,
  cube: S09Cube,
  stats: S10Stats,
  slabs: S11Slabs,
  breakdown: S12Breakdown,
  slam: S13Slam,
  url: S14Url,
  orbit: S15Orbit,
  shatter: S17Shatter,
  play: S18Play,
  voxel: S19Voxel,
  finale: S20Finale,
};

const LABEL: Record<string, string> = {
  wake: 'POWER ON',
  boot: 'POST',
  logo: 'IDENTITY',
  desktop: 'DESKTOP',
  roulette: 'SKINS',
  dive: 'DIVE IN',
  tunnel: 'ARTICLES',
  card: 'READING',
  cube: 'GALLERY',
  stats: 'NUMBERS',
  slabs: 'FOUR WORLDS',
  breakdown: 'BREATHE',
  slam: 'IMPACT',
  url: '060929.XYZ',
  orbit: 'ORBIT',
  shatter: 'SHATTER',
  play: 'PLAY',
  voxel: 'VOXEL HEART',
  finale: 'THE END',
};

const Hud: React.FC<{f: number}> = ({f}) => {
  const op = clamp(inv(f, 150, 230)) * (1 - clamp((f - 2470) / 60));
  if (op <= 0.001) return null;
  const p = f / DURATION;
  const idx = SCENES.findIndex((s) => f >= s.from && f < s.to);
  const cur = SCENES[Math.max(0, idx)];
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 120, opacity: op, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: 'rgba(255,255,255,.14)'}}>
        {SCENES.map((s) => (
          <div key={s.id} style={{position: 'absolute', left: `${(s.from / DURATION) * 100}%`, bottom: 0, width: 1, height: f >= s.from && f < s.to ? 16 : 7, background: f >= s.from && f < s.to ? '#ff9dc6' : 'rgba(255,255,255,.35)'}} />
        ))}
        <div style={{position: 'absolute', left: 0, bottom: 0, width: `${p * 100}%`, height: 3, background: 'linear-gradient(90deg,#c77bab,#ff9dc6,#ffd6ec)'}} />
      </div>
      <div style={{position: 'absolute', left: 64, bottom: 26, display: 'flex', alignItems: 'baseline', gap: 14}}>
        <span style={{fontFamily: FONT.mono, fontSize: 13, letterSpacing: '.42em', color: 'rgba(255,255,255,.55)'}}>
          {String(Math.max(0, idx) + 1).padStart(2, '0')}/{SCENES.length}
        </span>
        <span style={{fontFamily: FONT.mono, fontSize: 15, letterSpacing: '.34em', color: 'rgba(255,255,255,.85)'}}>{LABEL[cur.id] ?? ''}</span>
      </div>
      <div style={{position: 'absolute', right: 64, bottom: 26, fontFamily: FONT.mono, fontSize: 14, letterSpacing: '.28em', color: 'rgba(255,255,255,.6)'}}>
        {(f / FPS).toFixed(2)}s · 128 BPM
      </div>
    </div>
  );
};

export const Promo: React.FC = () => {
  const f = useCurrentFrame();

  const inBar = f % BAR;
  const amp = inBar < 6 ? 8 * (1 - inBar / 6) : 0;
  const sx = amp ? (hash(f * 1.7) - 0.5) * amp : 0;
  const sy = amp ? (hash(f * 3.1) - 0.5) * amp : 0;
  const flash = inBar < 2 ? 0.1 : 0;

  return (
    <div style={{position: 'absolute', inset: 0, background: '#000', transform: `scale(1.012) translate(${sx}px, ${sy}px)`}}>
      <Audio src={staticFile('audio/track.wav')} />
      {SCENES.map((s) => {
        const C = MAP[s.id];
        if (!C) return null;
        return (
          <Sequence key={s.id} from={Math.round(s.from)} durationInFrames={Math.round(s.to - s.from)}>
            <C />
          </Sequence>
        );
      })}
      <Hud f={f} />
      {flash ? <div style={{position: 'absolute', inset: 0, background: '#fff', opacity: flash}} /> : null}
    </div>
  );
};

export const comp = {id: 'Promo', component: Promo, durationInFrames: DURATION, fps: FPS, width: WIDTH, height: HEIGHT};
