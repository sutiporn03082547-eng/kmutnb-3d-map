// Six standard views of one campus building (index.html) for comparison with photos and imagery:
// top, and from the four compass sides (labelled N/E/S/W = camera stands on that side), plus an isometric and a close-up.
// Framing uses the footprint (b.p), not the model's bounding box, so stray parts cannot push the camera away.
// Other campus buildings, the back-of-campus layer and labels are hidden while shooting (inspection only, nothing is saved).
// usage: node qa/building-views.mjs BASE_URL BUILDING_ID OUT_DIR [prefix]
import { open, sleep } from './cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const [base, id, out, prefix = ''] = process.argv.slice(2); mkdirSync(out, { recursive: true });
const p = await open({ port: 9500, width: 1100, height: 800, scale: 1 });
await p.send('Emulation.setDeviceMetricsOverride', { width: 1100, height: 800, deviceScaleFactor: 1, mobile: false });
await p.send('Emulation.setTouchEmulationEnabled', { enabled: false });
await p.goto(base + 'index.html'); await sleep(16000);
const info = await p.ev(`(()=>{document.querySelectorAll('#side,#help,.help,#helpDlg,[role=dialog]').forEach(e=>e.style.display='none');
  const b=ALL.find(b=>b.id===${JSON.stringify(id)}||b.no===${JSON.stringify(id)});const bx=new THREE.Box3();b.p.forEach(([x,z])=>bx.expandByPoint(new THREE.Vector3(x+(b.dx||0),0,z+(b.dz||0))));bx.max.y=b.top||20;
  const c=bx.getCenter(new THREE.Vector3()),s=bx.getSize(new THREE.Vector3());window.__bv={c,s};
  const keep=new Set();b.group.traverse(o=>keep.add(o));const near=o=>{const q=new THREE.Box3().setFromObject(o);return q.isEmpty()||q.max.x<bx.min.x-6||q.min.x>bx.max.x+6||q.max.z<bx.min.z-6||q.min.z>bx.max.z+6||q.max.x-q.min.x>400;};
  ALL.forEach(o=>{if(o!==b&&o.group)o.group.visible=false;});scene.children.forEach(o=>{if(!keep.has(o)&&o.isGroup&&o!==b.group&&!/ground|terrain|road|green|water|canal/i.test(o.name)&&near(o))o.visible=false;});const bc=scene.getObjectByName('back-context');if(bc)bc.visible=false;
  document.querySelectorAll('#labels,.tag,.pin').forEach(e=>e.style.display='none');return {id:b.id,c:[c.x,c.y,c.z].map(v=>+v.toFixed(1)),size:[s.x,s.y,s.z].map(v=>+v.toFixed(1)),top:b.top,lv:b.lv}})()`);
console.log(JSON.stringify(info));
const R = Math.max(info.size[0], info.size[2]) * 1.35 + 30, H = info.size[1];
const [cx, , cz] = info.c;
const views = { top: [[cx, 0, cz], [cx, R * 2.4, cz + 0.01]], N: [[cx, H * .4, cz], [cx, H * .4 + R * .55, cz - R]], E: [[cx, H * .4, cz], [cx + R, H * .4 + R * .55, cz]],
  S: [[cx, H * .4, cz], [cx, H * .4 + R * .55, cz + R]], W: [[cx, H * .4, cz], [cx - R, H * .4 + R * .55, cz]], iso: [[cx, 0, cz], [cx - R * .8, R * .9, cz + R * .8]] };
for (const [k, [t, c]] of Object.entries(views)) {
  await p.ev(`(()=>{controls.minDistance=1;controls.maxPolarAngle=Math.PI;controls.target.set(${t});camera.position.set(${c});controls.update();window.__plDirty&&window.__plDirty();return 1})()`);
  await sleep(2200); const r = await p.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/${prefix}${id}-${k}.png`, Buffer.from(r.result.data, 'base64'));
}
await p.close();
