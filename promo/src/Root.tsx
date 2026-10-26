import React from 'react';
import {Composition} from 'remotion';
import {Promo, comp} from './Promo';

export const RemotionRoot: React.FC = () => (
  <Composition
    id={comp.id}
    component={comp.component}
    durationInFrames={comp.durationInFrames}
    fps={comp.fps}
    width={comp.width}
    height={comp.height}
  />
);
