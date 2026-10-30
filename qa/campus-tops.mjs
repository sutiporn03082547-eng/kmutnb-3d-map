// Top view of every campus building on its own (others hidden), north up, framed on its footprint with a 10 m margin, for a
// side-by-side check against imagery (qa/campus_audit_imagery.py), plus an oblique view from the south-west.
// Rendered with a separate camera straight into the canvas and read back (the page's own camera is clamped by its controls),
// so labels and buttons are not in the picture. usage: node qa/campus-tops.mjs BASE_URL OUT_DIR [id ...]
import { open, sleep } from './cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const [base, out, ...only] = process.argv.slice(2); mkdirSync(out, { recursive: true });
const p = await open({ port: 9510, width: 600, height: 600, scale: 1 });
await p.send('Emulation.setDeviceMetricsOverride', { width: 600, height: 600, deviceScaleFactor: 1, mobile: false });
await p.send('Emulation.setTouchEmulationEnabled', { enabled: false });
await p.goto(base + 'index.html'); await sleep(16000);
const ids = await p.ev(`(()=>{const bc=scene.getObjectByName('back-context');if(bc)bc.visible=false;
  window.__shot=(cam)=>{renderer.shadowMap.needsUpdate=true;renderer.render(scene,cam);return renderer.domElement.toDataURL('image/png');};
  return ALL.filter(b=>!b.flat&&b.p&&b.group).map(b=>b.id)})()`);
const frames = {};
for (const id of only.length ? only : ids) {
  const r = await p.ev(`(()=>{const b=ALL.find(b=>b.id===${JSON.stringify(id)});const vis=new Map();ALL.forEach(o=>{if(o.group){vis.set(o,o.group.visible);o.group.visible=o===b;}});
    const xs=b.p.map(q=>q[0]+(b.dx||0)),zs=b.p.map(q=>q[1]+(b.dz||0)),x0=Math.min(...xs)-10,x1=Math.max(...xs)+10,z0=Math.min(...zs)-10,z1=Math.max(...zs)+10;
    const cx=(x0+x1)/2,cz=(z0+z1)/2,half=Math.max(x1-x0,z1-z0)/2,top=b.top||20;const W=renderer.domElement.width,H=renderer.domElement.height;
    const c=new THREE.PerspectiveCamera(20,W/H,1,5000);const h=half/Math.tan(10*Math.PI/180);c.position.set(cx,h+top,cz);c.up.set(0,0,-1);c.lookAt(cx,0,cz);
    /* frame the footprint square exactly at ground level */ c.fov=2*Math.atan(half/(h+top))*180/Math.PI;c.updateProjectionMatrix();
    const a=__shot(c);const o=new THREE.PerspectiveCamera(30,W/H,1,5000),d=half*2.4+30;o.position.set(cx-d*.62,d*.62,cz+d*.62);o.lookAt(cx,top*.35,cz);const bimg=__shot(o);
    vis.forEach((v,k)=>k.group.visible=v);return {f:{cx,cz,half,top:b.top,lv:b.lv},a,b:bimg}})()`);
  frames[id] = r.f;
  writeFileSync(`${out}/${id}-top.png`, Buffer.from(r.a.split(',')[1], 'base64')); writeFileSync(`${out}/${id}-obl.png`, Buffer.from(r.b.split(',')[1], 'base64'));
}
writeFileSync(`${out}/frames.json`, JSON.stringify(frames)); console.log('views', Object.keys(frames).length);
await p.close();
