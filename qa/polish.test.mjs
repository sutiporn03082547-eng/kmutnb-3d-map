// Checks for the polish pass: card order, quick chips, share links on both pages.
// usage: node qa/polish.test.mjs http://127.0.0.1:8090/ [report.json] [SHOT_DIR]   (base URL of the site; SHOT_DIR saves phone screenshots)
import { open, sleep } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
const [base, out, shots] = process.argv.slice(2);
const results = [], ok = (name, pass, got) => results.push({ name, pass: !!pass, got });
const shot = async (b, name) => { if (!shots) return; const r = await b.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${shots}/${name}.png`, Buffer.from(r.result.data, 'base64')); };

let b = await open({ port: 9300 + Math.floor(Math.random() * 90), width: 412, height: 915, scale: 1 });
await b.goto(base + 'back.html'); await sleep(9000);
const r = JSON.parse(await b.ev(`(async()=>{
  const vis=()=>pins.filter(p=>!p.el.hidden).length,B=[...document.querySelectorAll('.pk-filter button')],by=t=>B.find(x=>x.textContent.includes(t));
  const o={loading:document.body.classList.contains('pl-loading'),all:vis(),total:pins.length};
  by('อาหาร').click();o.food=vis();o.foodWant=pins.filter(p=>p.cat==='food').length;o.foodPressed=by('อาหาร').getAttribute('aria-pressed');
  by('ที่จอดรถยนต์').click();o.parkVis=vis();o.parkQ=q.value;by('ที่จอดรถยนต์').click();
  by('หอพัก').click();by('หอพัก').click();o.back=vis();
  const s=D.P.findIndex(p=>p.c==='food'&&p.h&&p.pid);select(s,false);
  const order=e=>+getComputedStyle(e).order,card=document.getElementById('card');
  o.footBeforeInfo=order(card.querySelector('.foot'))<order(document.getElementById('cInfo'));
  o.rowsShown=[...hours.rows].filter(t=>getComputedStyle(t).display!=='none').length;document.getElementById('hoursMore').click();
  o.rowsAll=[...hours.rows].filter(t=>getComputedStyle(t).display!=='none').length;
  o.noPhotoHidden=[...card.querySelectorAll('.real-place')].every(x=>x.querySelector('img,figure,.photo-failure')||getComputedStyle(x).display==='none');
  o.link=__polish.linkOf(D.P[s]);o.name=D.P[s].n;o.share=!document.getElementById('cShare').hidden;
  select(D.P.findIndex(p=>p.c==='dorm'&&p.h),false);o.dormMore=document.getElementById('hoursMore').hidden;
  select(null);location.hash=o.link.split('#')[1];await new Promise(r=>setTimeout(r,300));o.opened=selId!=null?D.P[selId].n:null;
  o.errs=window.__errs||[];return JSON.stringify(o);})()`));
await shot(b, 'back-card');
await b.ev(`select(null);[...document.querySelectorAll('.pk-filter button')].find(x=>x.textContent.includes('คาเฟ่')).click()`); await sleep(2500); await shot(b, 'back-cafe-only');
await b.close();
ok('loading screen is gone after the map draws', !r.loading, r.loading);
ok('"อาหาร" chip shows only food places', r.food === r.foodWant && r.food < r.all, [r.food, r.foodWant]);
ok('the active chip stays highlighted', r.foodPressed === 'true', r.foodPressed);
ok('a parking button brings every category back', r.parkVis === r.total && r.parkQ, [r.parkVis, r.parkQ]);
ok('tapping a chip twice shows everything again', r.back === r.total, r.back);
ok('card: action buttons come before the notes', r.footBeforeInfo, r.footBeforeInfo);
ok('card: only today\'s hours first, the week on demand', r.rowsShown === 1 && r.rowsAll === 7, [r.rowsShown, r.rowsAll]);
ok('card: empty photo section is hidden', r.noPhotoHidden, r.noPhotoHidden);
ok('dorm card has no hours toggle', r.dormMore, r.dormMore);
ok('share link opens the same place', r.share && r.opened === r.name, [r.link, r.opened]);
ok('no page errors (back.html)', !r.errs.length, r.errs);

b = await open({ port: 9200 + Math.floor(Math.random() * 90), width: 412, height: 915, scale: 1 });
await b.goto(base + 'index.html#b=81'); await sleep(14000);
const c = JSON.parse(await b.ev(`JSON.stringify({sel:selId,name:document.getElementById('cName').textContent,help:document.getElementById('help').hidden,
  share:!document.getElementById('cShare').hidden,link:__polish.linkOf(ALL.find(x=>x.id===selId)||{id:''}),errs:window.__errs||[]})`));
await shot(b, 'index-link');
await b.close();
ok('index.html#b=81 opens building 81 without the help dialog', c.sel === '81' && c.help && /81/.test(c.name), c);
ok('building card has a share button with a #b= link', c.share && /#b=81$/.test(c.link), c.link);
ok('no page errors (index.html)', !c.errs.length, c.errs);

const failed = results.filter(x => !x.pass);
if (out) writeFileSync(out, JSON.stringify({ base, date: new Date().toISOString(), total: results.length, passed: results.length - failed.length, results }, null, 1));
console.log(`polish tests: ${results.length - failed.length}/${results.length} passed`);
failed.forEach(f => console.log('FAIL', f.name, '→', JSON.stringify(f.got)));
process.exit(failed.length ? 1 : 0);
