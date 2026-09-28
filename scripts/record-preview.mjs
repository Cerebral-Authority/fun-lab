// Records an experiment's preview clip at a 400x600 (2:3) phone viewport,
// driving its demo page with real touch input over the Chrome DevTools
// Protocol, and writes preview.mp4, preview.jpg and preview.gif into
// packages/<name>/demo/.
//
//   npm run record -- <name>
//
// The gesture comes from packages/<name>/preview.scenario.mjs, which exports:
//   default async function (api)  performs the gesture
//   poster (optional, seconds)    where in the clip to take the still image
// api: { touch(type, x, y), sleep(ms), evalJs(expr), markStart(t?), markEnd(t?), width, height }
// markStart/markEnd take epoch seconds (default: now) and trim the clip.
//
// Needs Google Chrome and ffmpeg. Set CHROME to override the Chrome path.
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const name = process.argv[2];
if (!name) {
  console.error('usage: npm run record -- <package-name>');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgDir = join(root, 'packages', name);
const scenarioPath = join(pkgDir, 'preview.scenario.mjs');
if (!existsSync(scenarioPath)) {
  console.error('missing ' + scenarioPath);
  process.exit(1);
}
const scenario = await import(pathToFileURL(scenarioPath).href);

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
const W = 400, H = 600, DPR = 2;
const work = join(tmpdir(), 'fun-lab-record-' + name);
const FRAMES = join(work, 'frames');
const OUT = join(pkgDir, 'demo');

rmSync(work, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });

// The demo is recorded from the built site, exactly as it deploys
execFileSync('node', [join(root, 'scripts', 'build-site.mjs')], { stdio: 'ignore' });
const PAGE = pathToFileURL(join(root, '_site', name, 'index.html')).href;

const sleep = ms => new Promise(r => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=' + PORT,
  '--user-data-dir=' + join(work, 'profile'), '--hide-scrollbars',
  '--allow-file-access-from-files', '--window-size=' + W + ',' + H, 'about:blank'
], { stdio: 'ignore' });

let wsUrl = null;
for (let i = 0; i < 50 && !wsUrl; i++) {
  await sleep(200);
  try {
    const list = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
    const page = list.find(t => t.type === 'page');
    if (page) wsUrl = page.webSocketDebuggerUrl;
  } catch (e) { /* not up yet */ }
}
if (!wsUrl) throw new Error('Chrome did not start (set CHROME to its path)');

const ws = new WebSocket(wsUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let nextId = 1;
const pending = new Map();
const handlers = {};
ws.addEventListener('message', ev => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  } else if (msg.method && handlers[msg.method]) {
    handlers[msg.method](msg.params);
  }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = nextId++;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});

// Fingertip indicator, drawn only for the recording
const FINGER = `
  addEventListener('DOMContentLoaded', () => {
    const dot = document.createElement('div');
    dot.style.cssText = 'position:fixed;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;' +
      'background:rgba(255,255,255,0.28);border:2px solid rgba(255,255,255,0.7);' +
      'box-shadow:0 2px 10px rgba(0,0,0,0.35);pointer-events:none;z-index:2147483647;' +
      'opacity:0;transform:scale(1.4);transition:opacity .18s ease, transform .18s ease;';
    document.body.appendChild(dot);
    const move = e => { dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'; };
    addEventListener('pointerdown', e => { move(e); dot.style.opacity = '1'; dot.style.transform = 'scale(1)'; }, true);
    addEventListener('pointermove', move, true);
    addEventListener('pointerup', () => { dot.style.opacity = '0'; dot.style.transform = 'scale(1.4)'; }, true);
  });`;

await send('Page.enable');
await send('Runtime.enable');
handlers['Runtime.exceptionThrown'] = p => console.log('page error:',
  String(p.exceptionDetails.exception && p.exceptionDetails.exception.description || p.exceptionDetails.text).slice(0, 400));
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: true });
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await send('Page.addScriptToEvaluateOnNewDocument', { source: FINGER });
const loaded = new Promise(r => { handlers['Page.loadEventFired'] = r; });
await send('Page.navigate', { url: PAGE });
await loaded;
await sleep(1500); // web fonts

// Screencast capture with timestamps (epoch seconds)
const frames = [];
handlers['Page.screencastFrame'] = p => {
  const file = join(FRAMES, String(frames.length).padStart(5, '0') + '.jpg');
  writeFileSync(file, Buffer.from(p.data, 'base64'));
  frames.push({ file, t: p.metadata.timestamp });
  send('Page.screencastFrameAck', { sessionId: p.sessionId }).catch(() => {});
};
await send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W * DPR, maxHeight: H * DPR, everyNthFrame: 1 });

let clipStart = 0;
let clipEnd = 0;
const api = {
  width: W,
  height: H,
  sleep,
  evalJs: async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value,
  touch: (type, x, y) => send('Input.dispatchTouchEvent', {
    type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 10, radiusY: 10, force: 1 }]
  }),
  markStart: t => { clipStart = t || Date.now() / 1000; },
  markEnd: t => { clipEnd = t || Date.now() / 1000; }
};

await scenario.default(api);
const tStop = Date.now() / 1000;
await send('Page.stopScreencast');
await sleep(200);
ws.close();
chrome.kill();

if (!clipStart) clipStart = frames.length ? frames[0].t : 0;
if (!clipEnd) clipEnd = tStop;
if (!frames.length || clipEnd <= clipStart) throw new Error('nothing captured');
console.log('clip ' + (clipEnd - clipStart).toFixed(2) + 's from ' + frames.length + ' captured frames');

// Frames inside the clip, starting from the one on screen at clipStart
let first = frames.findIndex(f => f.t > clipStart) - 1;
if (first < 0) first = 0;
let list = '';
for (let i = first; i < frames.length && frames[i].t < clipEnd; i++) {
  const from = Math.max(frames[i].t, clipStart);
  const to = Math.min(i + 1 < frames.length ? frames[i + 1].t : clipEnd, clipEnd);
  list += "file '" + frames[i].file + "'\nduration " + Math.max(0.001, to - from).toFixed(4) + '\n';
}
writeFileSync(join(work, 'frames.txt'), list);

const ff = args => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args]);
const mp4 = join(OUT, 'preview.mp4');
// MP4 for the website: small, sharp, autoplays like a GIF
ff(['-f', 'concat', '-safe', '0', '-i', join(work, 'frames.txt'),
  '-vf', 'fps=30,scale=600:900:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24',
  '-movflags', '+faststart', '-an', mp4]);
// Still image for reduced motion visitors and before playback
ff(['-ss', String(scenario.poster ?? 0.2), '-i', mp4, '-frames:v', '1', '-q:v', '4', join(OUT, 'preview.jpg')]);
// GIF for READMEs (GitHub does not play MP4s stored in a repo)
ff(['-i', mp4, '-vf', 'fps=20,scale=320:480:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];' +
  '[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle', '-loop', '0', join(OUT, 'preview.gif')]);

rmSync(work, { recursive: true, force: true });
console.log('wrote packages/' + name + '/demo/preview.mp4, preview.jpg, preview.gif');
