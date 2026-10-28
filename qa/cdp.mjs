// Minimal Chrome DevTools helper for the QA scripts: launches headless Chrome (GPU) with a phone-sized viewport.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function open({ port = 9400, width = 540, height = 960, scale = 2 } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'cdp-'));
  const ch = spawn(process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${port}`,
    `--user-data-dir=${dir}`, '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars',
    `--window-size=${width},${height}`, '--no-first-run', '--lang=th-TH', 'about:blank'], { stdio: 'ignore' });
  let tabs; for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(200); } }
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pend = new Map(), handlers = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    else if (m.method && handlers.has(m.method)) handlers.get(m.method)(m.params); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout: 120000 });
    if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result?.result?.value; };
  const goto = async url => { await send('Page.navigate', { url });
    for (let i = 0; i < 400; i++) { try { if (await ev('location.href+"|"+document.readyState') === url + '|complete') break; } catch {} await sleep(100); } };
  return { send, ev, goto, on: (m, f) => handlers.set(m, f),
    close: async () => { try { ws.close(); } catch {} ch.kill(); await sleep(600); try { rmSync(dir, { recursive: true, force: true }); } catch {} } };
}
