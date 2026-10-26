import React from 'react';
import {AbsoluteFill, staticFile} from 'remotion';

export const FONT_CSS = `
@font-face{font-family:'Orbitron';src:url('${staticFile(
  'fonts/Orbitron[wght].ttf',
)}') format('truetype');font-weight:100 900;font-display:block;}
@font-face{font-family:'Audiowide';src:url('${staticFile(
  'fonts/Audiowide-Regular.ttf',
)}') format('truetype');font-display:block;}
@font-face{font-family:'NotoSansSC';src:url('${staticFile(
  'fonts/NotoSansSC.ttf',
)}') format('truetype');font-weight:100 900;font-display:block;}
`;

export const FONT = {
  mono: '"Courier New", ui-monospace, monospace',
  cjk: '"SimSun", "Songti SC", "NotoSansSC", serif',
  ui: '"Microsoft YaHei", "NotoSansSC", sans-serif',
  display: 'Orbitron, "Microsoft YaHei", sans-serif',
  wide: 'Audiowide, "Microsoft YaHei", sans-serif',
};

export const Fonts: React.FC = () => <style dangerouslySetInnerHTML={{__html: FONT_CSS}} />;

export const Fill: React.FC<{
  style?: React.CSSProperties;
  children?: React.ReactNode;
  className?: string;
}> = ({style, children}) => (
  <AbsoluteFill style={{overflow: 'hidden', ...style}}>
    <Fonts />
    {children}
  </AbsoluteFill>
);
