import {Config} from '@remotion/cli/config';

Config.setBrowserExecutable(
  'C:/Users/26529/.cache/puppeteer/chrome/win64-131.0.6778.204/chrome-win64/chrome.exe',
);
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setConcurrency(6);
Config.setChromiumOpenGlRenderer('angle');
