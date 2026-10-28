// Checks for the area behind campus: opening hours by place type, added open-data buildings and roads, and the context layer in index.html.
// usage: node qa/back-physical.test.mjs http://127.0.0.1:8090/ [report.json]   (base URL of the site)
import { open, sleep } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
const [base, out] = process.argv.slice(2);
const results = [], ok = (name, pass, got) => results.push({ name, pass: !!pass, got });

let b = await open({ port: 9600 + Math.floor(Math.random() * 90), width: 412, height: 915, scale: 1 });
await b.goto(base + 'back.html'); await sleep(9000);
const r = JSON.parse(await b.ev(`(()=>{
  const dorms=D.P.filter(p=>p.c==='dorm'),shopsH=D.P.filter(p=>p.h&&showsHours(p));
  const cardHours=i=>{select(i,false);return {rows:document.querySelectorAll('#hours tr').length,hidden:document.getElementById('hours').hidden};};
  const d=D.P.findIndex(p=>p.c==='dorm'&&p.h),s=D.P.findIndex(p=>p.c==='food'&&p.h);
  const xs=EXTRA.blds.map(x=>x[5]),bad=xs.filter(p=>p.length<3||!p.every(q=>isFinite(q[0])&&isFinite(q[1]))).length;
  const unknownWithLevels=EXTRA.blds.filter(x=>x[0]==='ms'&&x[2]!=null).length;
  showExtra(0);const card=document.getElementById('cMeta').textContent;
  return JSON.stringify({dorms:dorms.length,dormStatus:dorms.filter(p=>status(p)).length,dormH:dorms.filter(p=>p.h).length,shopsH:shopsH.length,
    dormCard:cardHours(d),shopCard:cardHours(s),extra:EXTRA.blds.length,roads:EXTRA.roads.length,bad,unknownWithLevels,card,
    xbTris:XB.meshes.reduce((n,m)=>n+m.geometry.attributes.position.count/3,0),errs:window.__errs||[]});})()`));
await b.close();
ok('no dorm shows opening status', r.dormStatus === 0, `${r.dormStatus} of ${r.dorms}`);
ok('dorm card shows no hours table', r.dormCard.rows === 0 && r.dormCard.hidden, r.dormCard);
ok('dorm hours data kept in the data (field not deleted)', r.dormH > 0, r.dormH);
ok('shop card still shows its hours', r.shopCard.rows === 7 && !r.shopCard.hidden, r.shopCard);
ok('shops with hours still have a status', r.shopsH > 0, r.shopsH);
ok('added footprints are valid polygons', r.bad === 0, r.bad);
ok('Microsoft footprints never carry a floor count', r.unknownWithLevels === 0, r.unknownWithLevels);
ok('added-building card states source and height status', /footprints|OpenStreetMap/.test(r.card) && /ความสูง|ชั้น/.test(r.card), r.card);
ok('added buildings drawn', r.xbTris > 0, r.xbTris);
ok('no page errors (back.html)', !r.errs.length, r.errs);

b = await open({ port: 9700 + Math.floor(Math.random() * 90), width: 412, height: 915, scale: 1 });
await b.goto(base + 'index.html'); await sleep(14000);
const c = JSON.parse(await b.ev(`JSON.stringify({ctx:window.__backContext||null,errs:window.__errs||[]})`));
await b.goto(base + 'back.html#cam=300,-300,350,400,-100'); await sleep(9000);
const cam = JSON.parse(await b.ev(`JSON.stringify([controls.target.x,controls.target.z,camera.position.x,camera.position.y,camera.position.z].map(v=>Math.round(v)))`));
await b.close();
ok('index.html loads the back-area context layer', c.ctx && c.ctx.triangles > 0, c.ctx);
ok('context boxes never duplicate a campus building', c.ctx && c.ctx.skipped === 0, c.ctx && c.ctx.skipped);
ok('no page errors (index.html)', !c.errs.length, c.errs);
ok('back.html opens at the camera passed from index.html', JSON.stringify(cam) === JSON.stringify([300, -300, 350, 400, -100]), cam);

const failed = results.filter(x => !x.pass);
if (out) writeFileSync(out, JSON.stringify({ base, date: new Date().toISOString(), total: results.length, passed: results.length - failed.length, results }, null, 1));
console.log(`back physical tests: ${results.length - failed.length}/${results.length} passed`);
failed.forEach(f => console.log('FAIL', f.name, '→', JSON.stringify(f.got)));
process.exit(failed.length ? 1 : 0);
