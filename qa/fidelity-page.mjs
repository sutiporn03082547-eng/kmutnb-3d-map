// In-page fidelity checks that need the real 3D scene: buildings floating or sunk below ground, evidence counts, page errors.
// usage: node qa/fidelity-page.mjs BASE_URL OUT_JSON      e.g. node qa/fidelity-page.mjs http://127.0.0.1:8093/ qa/reports/fidelity-page.json
// Ground is y = 0 in both pages (roads and lots sit at 0.08-0.35). A building whose lowest point is above 0.5 m floats;
// below -0.5 m it is sunk (a basement or ramp would have to be confirmed).
import { open, sleep } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
const [base, out] = process.argv.slice(2);
const page = await open({ width: 900, height: 700, scale: 1 });
const errors = []; page.on('Runtime.exceptionThrown', p => errors.push(p.exceptionDetails?.exception?.description?.slice(0, 200) || 'exception'));
await page.send('Runtime.enable');
const res = {};
await page.goto(base + 'back.html'); await sleep(20000);
res.back = await page.ev(`(()=>{
  const per=new Map();const add=(o,y)=>{let r=per.get(o);if(!r)per.set(o,r=[1e9,-1e9]);r[0]=Math.min(r[0],y);r[1]=Math.max(r[1],y);};
  picks.slice(0,4).concat([ghostMesh]).forEach(m=>{const p=m.geometry.attributes.position,own=m.userData.own;for(let t=0;t<own.length;t++)for(let v=0;v<3;v++)add('B'+own[t],p.getY(t*3+v));});
  XB.meshes.forEach(m=>{const p=m.geometry.attributes.position,own=m.userData.xown;for(let t=0;t<own.length;t++)for(let v=0;v<3;v++)add('X'+own[t],p.getY(t*3+v));});
  const rows=[...per].map(([k,[lo,hi]])=>[k,+lo.toFixed(2),+hi.toFixed(2)]);
  const floating=rows.filter(r=>r[1]>0.5),sunk=rows.filter(r=>r[1]<-0.5),missing=BLD.filter(b=>!per.has('B'+b.i)).map(b=>b.i);
  const kinds={};for(const c of FID.k)kinds[c]=(kinds[c]||0)+1;
  return {buildings:rows.length,boxes:BLD.length,extra:EXTRA.blds.length,kinds,levels:window.__fidelityCounts,floating,sunk,missingModels:missing,
    ghostVertices:ghostMesh.geometry.attributes.position.count,fidelityUi:!!document.getElementById('fidBtn')&&!!window.__fidelity};})()`);
// card text for one building of each kind, to prove the evidence wording reaches the user
res.backCards = await page.ev(`(()=>{const o={};for(const k of 'MPSG'){const i=FID.k.indexOf(k);if(i<0)continue;showBox(i);o[k]={i,name:document.getElementById('cName').textContent,meta:document.getElementById('cMeta').textContent,info:[...document.querySelectorAll('#cInfo li')].map(l=>l.textContent)};}select(null);return o;})()`);
await page.goto(base + 'index.html'); await sleep(15000);
// Box3.setFromObject ignores instance matrices in three r128 (it measures the template at the origin), so instanced parts are
// measured per instance here; empty instance slots (scale 0) are skipped.
res.campus = await page.ev(`(()=>{const rows=[];const box=new THREE.Box3(),one=new THREE.Box3(),m4=new THREE.Matrix4(),s=new THREE.Vector3();
  const measure=g=>{box.makeEmpty();g.updateMatrixWorld(true);g.traverse(m=>{if(!m.isMesh||!m.visible)return;if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();
    if(m.isInstancedMesh){for(let i=0;i<m.count;i++){m.getMatrixAt(i,m4);s.setFromMatrixScale(m4);if(s.x*s.y*s.z<1e-9)continue;one.copy(m.geometry.boundingBox).applyMatrix4(m4).applyMatrix4(m.matrixWorld);box.union(one);}}
    else{one.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld);box.union(one);}});return box;};
  ALL.forEach(b=>{if(!b.group)return;measure(b.group);if(!isFinite(box.min.y))return;rows.push([b.id,+box.min.y.toFixed(2),+box.max.y.toFixed(2),!!b.flat]);});
  return {entries:ALL.length,withModel:rows.length,floating:rows.filter(r=>!r[3]&&r[1]>0.5),sunk:rows.filter(r=>r[1]<-0.5),levels:window.__fidelity&&window.__fidelity.counts,
    context:window.__backContext||null,fidelityUi:!!document.getElementById('fidBtn')};})()`);
res.campusCard = await page.ev(`(()=>{select('75',false);const li=document.querySelector('#cInfo .fid-note');const t=li&&li.textContent;select(null);return t;})()`);
res.errors = errors;
writeFileSync(out, JSON.stringify(res, null, 1)); console.log(JSON.stringify({ back: { ...res.back, floating: res.back.floating.length, sunk: res.back.sunk.length }, campus: { ...res.campus, floating: res.campus.floating, sunk: res.campus.sunk }, errors }, null, 1));
await page.close();
