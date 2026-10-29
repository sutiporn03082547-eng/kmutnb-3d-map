// Screenshots of the map from fixed camera positions, for visual comparison (top, oblique, close, streets, campus/back seam).
// usage: node qa/shots.mjs BASE_URL OUT_DIR [fid]      e.g. node qa/shots.mjs http://127.0.0.1:8093/ qa/reports/shots
// "fid" also turns on the evidence-level colouring before each shot. Views are in local metres (x east, z south).
import { open, sleep } from './cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const [base, out, mode] = process.argv.slice(2); mkdirSync(out, { recursive: true });
const VIEWS = {
  'back.html': [
    ['back-top', [300, 0, -250], [300, 1100, -249]],
    ['back-oblique', [300, 0, -250], [700, 420, 150]],
    ['back-close-lshape', [780, 0, -300], [840, 70, -230]],
    ['back-soi', [780, 0, -300], [700, 160, -120]],
    ['back-ghosts', [60, 0, -660], [140, 90, -580]],
    ['back-seam', [120, 0, -120], [-260, 380, 260]],
  ],
  'index.html': [
    ['campus-top', [100, 0, 0], [100, 900, 1]],
    ['campus-oblique', [100, 0, 0], [450, 380, 380]],
    ['campus-seam', [150, 0, -250], [-150, 420, 200]],
  ],
};
const page = await open({ width: 1280, height: 860, scale: 1 });
for (const [file, views] of Object.entries(VIEWS)) {
  await page.goto(base + file);
  await sleep(file === 'back.html' ? 16000 : 12000);
  if (mode === 'fid') await page.ev(`window.__fidelity&&window.__fidelity.paint(true)`);
  for (const [name, t, p] of views) {
    await page.ev(`(()=>{controls.target.set(${t});camera.position.set(${p});controls.update();window.__plDirty&&window.__plDirty();return 1})()`);
    await sleep(2500);
    const r = await page.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`${out}/${name}${mode ? '-' + mode : ''}.png`, Buffer.from(r.result.data, 'base64')); console.log('shot', name);
  }
}
await page.close();
