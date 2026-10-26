export const FPS = 60;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const BPM = 128;
/** 一拍 = 28.125 帧；一小节 = 112.5 帧 */
export const BEAT = (60 / BPM) * FPS;
export const BAR = BEAT * 4;
export const TOTAL_BARS = 24;
export const DURATION = Math.round(BAR * TOTAL_BARS); // 2700 帧 = 45.0s

/** 第 n 小节（1 起）起始帧 */
export const bar = (n: number) => (n - 1) * BAR;
/** 第 n 小节内第 b 拍（0 起） */
export const beat = (n: number, b: number) => (n - 1) * BAR + b * BEAT;

export type SceneId =
  | 'wake'
  | 'boot'
  | 'logo'
  | 'desktop'
  | 'roulette'
  | 'dive'
  | 'tunnel'
  | 'card'
  | 'cube'
  | 'stats'
  | 'slabs'
  | 'breakdown'
  | 'slam'
  | 'url'
  | 'orbit'
  | 'shatter'
  | 'play'
  | 'voxel'
  | 'finale';

export const SCENES: {id: SceneId; from: number; to: number}[] = [
  {id: 'wake', from: bar(1), to: bar(2)},
  {id: 'boot', from: bar(2), to: bar(3)},
  {id: 'logo', from: bar(3), to: bar(4)},
  {id: 'desktop', from: bar(4), to: bar(5)},
  {id: 'roulette', from: bar(5), to: bar(6)},
  {id: 'dive', from: bar(6), to: bar(7)},
  {id: 'tunnel', from: bar(7), to: bar(8)},
  {id: 'card', from: bar(8), to: bar(9)},
  {id: 'cube', from: bar(9), to: bar(10)},
  {id: 'stats', from: bar(10), to: bar(11)},
  {id: 'slabs', from: bar(11), to: bar(12)},
  {id: 'breakdown', from: bar(12), to: bar(13)},
  {id: 'slam', from: bar(13), to: bar(14)},
  {id: 'url', from: bar(14), to: bar(15)},
  {id: 'orbit', from: bar(15), to: bar(16)},
  {id: 'shatter', from: bar(16), to: bar(17)},
  {id: 'play', from: bar(17), to: bar(20)},
  {id: 'voxel', from: bar(20), to: bar(22)},
  {id: 'finale', from: bar(22), to: DURATION},
];

export const sceneStart = (id: SceneId) => {
  const s = SCENES.find((x) => x.id === id)!;
  return Math.round(s.from);
};

/* ---------------- 主题色板（取自站点 4 套主题） ---------------- */
export type Palette = {
  key: 'dream' | 'classic' | 'crt' | 'ocean';
  name: string;
  bg: string;
  blobs: string[];
  ink: string;
  accent: string;
  title: string;
  frame: string;
  gl: string;
};

export const PALETTES: Record<string, Palette> = {
  dream: {
    key: 'dream',
    name: 'DREAM',
    bg: '#b18bc7',
    blobs: ['#f5beda', '#b79bdd', '#ecc4e3', '#9a6fc4', '#ffd6ec'],
    ink: '#543765',
    accent: '#c77bab',
    title: '#68417c',
    frame: '#ead6ed',
    gl: '#ffd6ec',
  },
  classic: {
    key: 'classic',
    name: 'CLASSIC',
    bg: '#0d7d7d',
    blobs: ['#3aa6a6', '#0b6e8f', '#7ad0c8', '#005f6b', '#9fe0d5'],
    ink: '#eafffa',
    accent: '#7ad0c8',
    title: '#cfe9e4',
    frame: '#c8c8c8',
    gl: '#9fe0d5',
  },
  crt: {
    key: 'crt',
    name: 'CRT',
    bg: '#060a06',
    blobs: ['#0d2b0d', '#123d12', '#0a2410', '#144214', '#0f3312'],
    ink: '#7dff9a',
    accent: '#3bff6a',
    title: '#a8ffbc',
    frame: '#0f1a0f',
    gl: '#3bff6a',
  },
  ocean: {
    key: 'ocean',
    name: 'OCEAN',
    bg: '#8fb8dd',
    blobs: ['#cfe8f7', '#a8cbe8', '#e8f3fb', '#7fa8d0', '#bfe0f0'],
    ink: '#123a5c',
    accent: '#2f7fb8',
    title: '#1b4e77',
    frame: '#e8f3fb',
    gl: '#cfeeff',
  },
};

export const SHOTS = {
  dream: 'shots/home-dream.png',
  classic: 'shots/home-classic.png',
  crt: 'shots/home-crt.png',
  ocean: 'shots/home-ocean.png',
  post: 'shots/post-dream.png',
  postCrt: 'shots/post-crt.png',
  archive: 'shots/archive-dream.png',
  me: 'shots/me-ocean.png',
  showcase: 'shots/showcase-dream.png',
  friends: 'shots/friends-classic.png',
};

export const POSTS = [
  {date: '2026.10.08', tag: 'AI · 思考', title: '在AI时代浪潮下，对未来的思考'},
  {date: '2026.10.08', tag: '随笔', title: '折腾的意义'},
  {date: '2026.10.08', tag: 'blog · hexo', title: '这个博客是怎么搭起来的'},
];
