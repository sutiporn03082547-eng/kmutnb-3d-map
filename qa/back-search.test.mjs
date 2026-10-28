// Search tests for back.html (shops and dorms behind campus). usage: node qa/back-search.test.mjs http://127.0.0.1:8090/back.html [report.json]
import { open, sleep } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
const [url, out] = process.argv.slice(2);
const b = await open({ port: 9850 + Math.floor(Math.random() * 90), width: 412, height: 915, scale: 1 });
await b.goto(url); await sleep(9000);
// rows as shown: the name of every button in the list, in order; the place opened by Enter
const r = JSON.parse(await b.ev(`(()=>{const rows=()=>[...list.querySelectorAll('li > button .t')].map(t=>t.textContent);
  const type=v=>{q.value=v;q.dispatchEvent(new Event('input'));};const key=k=>q.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true}));
  const res=[];const names=[...new Set(D.P.map(p=>p.n))];
  for(const n of names){type(n);const first=rows()[0];res.push({name:n,first,pass:first===n});}
  const e=[];for(const n of names.slice(0,60)){type(n);key('Enter');e.push({name:n,opened:typeof selId!=='undefined'&&selId!=null?D.P[selId].n:null});}
  type('7-11');const r711=rows();type('ร้าน');const shown=rows();key('ArrowDown');key('Enter');const second=selId!=null?D.P[selId].n:null;
  type('zzqqxx');const empty=list.textContent;type('');
  return JSON.stringify({res,e,r711:r711.slice(0,3),second,secondExpected:shown[1],empty,errs:window.__errs||[]});})()`));
await b.close();
const results = [];
r.res.forEach(x => results.push({ name: `name "${x.name.slice(0, 30)}" → first row`, pass: x.pass, got: x.first }));
r.e.forEach(x => results.push({ name: `name "${x.name.slice(0, 30)}" + Enter opens it`, pass: x.opened === x.name, got: x.opened }));
results.push({ name: 'ArrowDown + Enter opens the 2nd row', pass: r.second === r.secondExpected, got: r.second });
results.push({ name: '"7-11" finds 7-Eleven shops', pass: r.r711.some(n => /7-?11|เซเว่น|7-Eleven/i.test(n)), got: r.r711 });
results.push({ name: 'no match shows a message', pass: /ไม่พบ/.test(r.empty), got: r.empty.slice(0, 60) });
results.push({ name: 'no page errors', pass: !r.errs.length, got: r.errs });
const failed = results.filter(x => !x.pass);
if (out) writeFileSync(out, JSON.stringify({ url, date: new Date().toISOString(), total: results.length, passed: results.length - failed.length, failed: failed.length, results }, null, 1));
console.log(`back search tests: ${results.length - failed.length}/${results.length} passed`);
failed.slice(0, 20).forEach(f => console.log('FAIL', f.name, '→', JSON.stringify(f.got)));
process.exit(failed.length ? 1 : 0);
