import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = 'C:/Users/26529/.cache/puppeteer/chrome/win64-131.0.6778.204/chrome-win64/chrome.exe';
const PORT = 9333;
const OUT = process.argv[2] || 'D:/blog-promo/public/shots';
fs.mkdirSync(OUT, { recursive: true });

const W = 1920, H = 1200;

const shots = [
  { name: 'home-dream', url: 'http://localhost:4000/', theme: 'dream' },
  { name: 'home-classic', url: 'http://localhost:4000/', theme: 'classic' },
  { name: 'home-crt', url: 'http://localhost:4000/', theme: 'crt' },
  { name: 'home-ocean', url: 'http://localhost:4000/', theme: 'ocean' },
  { name: 'post-dream', url: 'http://localhost:4000/2026/10/08/how-this-blog-was-built/', theme: 'dream' },
  { name: 'post-crt', url: 'http://localhost:4000/2026/10/08/on-tinkering/', theme: 'crt' },
  { name: 'archive-dream', url: 'http://localhost:4000/archives/', theme: 'dream' },
  { name: 'me-ocean', url: 'http://localhost:4000/me/', theme: 'ocean' },
  { name: 'showcase-dream', url: 'http://localhost:4000/showcase/', theme: 'dream' },
  { name: 'friends-classic', url: 'http://localhost:4000/friends/', theme: 'classic' },
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function cdp(ws, method, params = {}) {
  const id = ++cdp.id;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    const onMsg = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id === id) {
        ws.removeEventListener('message', onMsg);
        m.error ? reject(new Error(method + ': ' + JSON.stringify(m.error))) : resolve(m.result);
      }
    };
    ws.addEventListener('message', onMsg);
  });
}
cdp.id = 0;

const proc = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--disable-gpu-sandbox', '--no-first-run', '--no-default-browser-check',
  '--hide-scrollbars', '--force-device-scale-factor=2',
  '--user-data-dir=D:/blog-promo/.chrome-profile',
  `--window-size=${W},${H}`,
  'about:blank',
], { stdio: 'ignore' });

await sleep(2500);
const ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
await cdp(ws, 'Target.setDiscoverTargets', { discover: true });
await cdp(ws, 'Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });

const attach = async () => {
  const { targetInfos } = await cdp(ws, 'Target.getTargets');
  const page = targetInfos.find(t => t.type === 'page' && t.url === 'about:blank') || targetInfos.find(t => t.type === 'page');
  const { sessionId } = await cdp(ws, 'Target.attachToTarget', { targetId: page.targetId, flatten: true });
  return sessionId;
};
const sid = await attach();

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++send.id;
  ws.send(JSON.stringify({ id, method, params, sessionId: sid }));
  const onMsg = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id === id) {
      ws.removeEventListener('message', onMsg);
      m.error ? reject(new Error(method + ': ' + JSON.stringify(m.error))) : resolve(m.result);
    }
  };
  ws.addEventListener('message', onMsg);
});
send.id = 0;

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: false });

for (const s of shots) {
  await send('Page.navigate', { url: s.url });
  await sleep(2600);
  await send('Runtime.evaluate', {
    expression: `(() => {
      const sw = document.querySelector('.swatch[data-theme="${s.theme}"]');
      if (sw) sw.click();
      document.querySelectorAll('.boot-screen,.boot,#boot,.loading-screen').forEach(e => e.remove());
      document.documentElement.classList.remove('theme-fade');
      return document.documentElement.dataset.theme;
    })()`,
    awaitPromise: false,
  });
  await sleep(1200);
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
  const file = path.join(OUT, s.name + '.png');
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
  console.log('saved', file);
}

ws.close();
proc.kill();
process.exit(0);
