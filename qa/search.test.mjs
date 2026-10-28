// Search tests for index.html, run in headless Chrome against a local static server.
// usage: node qa/search.test.mjs http://127.0.0.1:8090/index.html [report.json]
// Exit code 1 when any test fails. Every building number and every full name is tested, not a sample.
import { open, sleep } from './cdp.mjs';
import { writeFileSync } from 'node:fs';

const [url, out] = process.argv.slice(2);
const b = await open({ port: 9800 + Math.floor(Math.random() * 150), width: 412, height: 915, scale: 1 });
await b.goto(url); await sleep(8000);
await b.ev('document.getElementById("helpGo")?.click();document.querySelectorAll("dialog[open]").forEach(d=>d.close());1');

// helpers inside the page: type a query the way the input does, read the result list, press keys on the input
await b.ev(`window.__t={
  type(v){q.value=v;q.dispatchEvent(new Event('input'));return [...list.querySelectorAll('li > button')].map(x=>x.querySelector('.no').textContent+'|'+x.querySelector('.t').textContent);},
  key(k){q.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true}));},
  ids(){return matches().map(x=>x.id);} };1`);

const results = [];
const test = async (name, js, check) => {
  let got; try { got = await b.ev('{' + js + '}'); } catch (e) { got = 'ERROR ' + String(e).slice(0, 200); }
  const pass = typeof got === 'string' && got.startsWith('ERROR') ? false : check(got);
  results.push({ name, pass, got: typeof got === 'string' ? got.slice(0, 300) : got });
};

// 1. the reported case
await test('"72" lists building 72 first', `__t.type('72');__t.ids()[0]`, v => v === '72');
await test('"72" + Enter selects 72 (not 52)', `__t.type('72');__t.key('Enter');selId`, v => v === '72');
await test('"72" ArrowDown + Enter selects the 2nd result', `__t.type('72');const second=__t.ids()[1];__t.key('ArrowDown');__t.key('Enter');JSON.stringify([selId,second])`, v => { const [s, e] = JSON.parse(v); return s === e; });
await test('"72" ArrowUp wraps to the last result', `__t.type('72');const ids=__t.ids();__t.key('ArrowUp');__t.key('Enter');JSON.stringify([selId,ids[ids.length-1]])`, v => { const [s, e] = JSON.parse(v); return s === e; });
await test('Escape clears the query', `select(null);__t.type('72');__t.key('Escape');q.value`, v => v === '');
await test('select(72) moves the camera target to 72', `__t.type('72');__t.key('Enter');new Promise(r=>setTimeout(()=>{const x=ALL.find(b=>b.id==='72');r(JSON.stringify([+controls.target.x.toFixed(1),+controls.target.z.toFixed(1),x.cx+x.dx,x.cz+x.dz]));},1200))`, v => { const [tx, tz, bx, bz] = JSON.parse(v); return Math.hypot(tx - bx, tz - bz) < 1; });
await test('selected building is highlighted (halo shown at it)', `__t.type('72');__t.key('Enter');const x=ALL.find(b=>b.id==='72');JSON.stringify([halo.visible,Math.hypot(halo.position.x-(x.cx+x.dx),halo.position.z-(x.cz+x.dz))<1])`, v => v === '[true,true]');
await test('no match shows a readable message', `__t.type('zzqqxx');document.getElementById('search-result-status')?.textContent||''`, v => /ไม่พบ/.test(v));
await test('empty query lists every visible place', `__t.type('');JSON.stringify([__t.ids().length,ALL.filter(b=>catOn[b.cat]).length])`, v => { const [a, c] = JSON.parse(v); return a === c; });

// 2. every building number: exact number first
const all = JSON.parse(await b.ev(`JSON.stringify(ALL.map(x=>({id:x.id,no:x.no,name:x.name,en:x.en,cat:x.cat})))`));
for (const x of all) {
  if (!x.no || x.no === '?' || /^[A-Za-z]$/.test(x.no)) continue;
  const same = all.filter(o => o.no === x.no).map(o => o.id);
  await test(`number "${x.no}" → first result has number ${x.no}`, `__t.type(${JSON.stringify(x.no)});__t.ids()[0]`, v => same.includes(v));
}
// 3. every full Thai name and English name: that place first (or another place with the identical name)
for (const x of all) {
  for (const [k, v] of [['th', x.name], ['en', x.en]]) {
    if (!v) continue;
    const same = all.filter(o => o.name === v || o.en === v).map(o => o.id);
    await test(`${k} name "${v.slice(0, 40)}" → that place first`, `__t.type(${JSON.stringify(v)});__t.ids()[0]`, r => same.includes(r));
  }
}
// 4. partial text and aliases
await test('partial Thai "หอสมุด" finds the central library (23)', `__t.type('หอสมุด');__t.ids().slice(0,3).join(',')`, v => v.split(',').includes('23'));
await test('partial English "library" finds 23', `__t.type('library');__t.ids().slice(0,3).join(',')`, v => v.split(',').includes('23'));
await test('case/space insensitive "Gym nasium" finds 72', `__t.type('Gym nasium');__t.ids().slice(0,3).join(',')`, v => v.split(',').includes('72'));
await test('result list has no duplicate place ids', `__t.type('7');const ids=__t.ids();JSON.stringify([ids.length,new Set(ids).size])`, v => { const [a, c] = JSON.parse(v); return a === c; });
await test('no page errors during the tests', `JSON.stringify(window.__errs||[])`, v => v === '[]');

await b.close();
const failed = results.filter(r => !r.pass);
const report = { url, date: new Date().toISOString(), total: results.length, passed: results.length - failed.length, failed: failed.length, results };
if (out) writeFileSync(out, JSON.stringify(report, null, 1));
console.log(`search tests: ${report.passed}/${report.total} passed`);
for (const f of failed.slice(0, 40)) console.log('FAIL', f.name, '→', JSON.stringify(f.got));
process.exit(failed.length ? 1 : 0);
