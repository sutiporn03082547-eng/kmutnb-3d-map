// Load and smoothness measurement for index.html and back.html.
// usage: node qa/perf.mjs BASE_URL OUT_JSON [runs=2]
// "phone" = 540x960 touch viewport with the CPU slowed 4x (mid-range phone); "desktop" = 1280x860, no throttling.
//   firstFrame : navigation start -> first frame the 3D renderer drew (renderer.info.render.frame > 0)
//   settled    : navigation start -> end of the last long task (>50 ms) before 3 s of quiet (page done building)
//   fps / worst: frames per second and slowest frame while the camera orbits for 6 s after settling
//   longTasks  : total time of long tasks during load;  kb: bytes downloaded
//   objects / errors: scene object count and uncaught page errors (a page that broke would otherwise look fast)
import { open, sleep } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
const [base, out, runs = '2'] = process.argv.slice(2);
const res = [];
for (const dev of ['desktop', 'phone']) for (const file of ['index.html', 'back.html']) for (let r = 0; r < +runs; r++) {
  const phone = dev === 'phone';
  const p = await open({ port: 9450 + r, width: phone ? 540 : 1280, height: phone ? 960 : 860, scale: phone ? 2 : 1 });
  if (!phone) {
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false });
    await p.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await p.send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' });
  } else await p.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.send('Network.enable'); await p.send('Network.setCacheDisabled', { cacheDisabled: true });
  let bytes = 0; p.on('Network.loadingFinished', e => { bytes += e.encodedDataLength; });
  const errors = []; p.on('Runtime.exceptionThrown', e => errors.push((e.exceptionDetails?.exception?.description || 'error').slice(0, 160))); await p.send('Runtime.enable');
  await p.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__lt=[];try{new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__lt.push([e.startTime,e.duration]))).observe({type:'longtask',buffered:true});}catch(e){}` });
  await p.send('Page.navigate', { url: base + file });
  let firstFrame = null; const t0 = Date.now();
  while (Date.now() - t0 < 120000) {
    await sleep(100);
    try { const v = await p.ev(`(()=>{try{return renderer.info.render.frame>0?performance.now():0}catch(e){return 0}})()`); if (v) { firstFrame = v; break; } } catch {}
  }
  let settled = null;
  for (let i = 0; i < 240; i++) { await sleep(500);
    const s = await p.ev(`(()=>{const lt=window.__lt;const last=lt.length?lt[lt.length-1][0]+lt[lt.length-1][1]:0;return [performance.now(),last]})()`);
    if (s[0] - s[1] > 3000 && s[0] > (firstFrame || 0) + 3000) { settled = s[1]; break; } }
  const lt = await p.ev(`window.__lt.reduce((a,e)=>a+e[1],0)`);
  const fps = await p.ev(`(async()=>{const c=controls,t=c.target.clone(),o=camera.position.clone().sub(t),R=Math.hypot(o.x,o.z);let n=0,worst=0,last=performance.now();const t1=last;
    await new Promise(done=>{function f(now){n++;worst=Math.max(worst,now-last);last=now;const a=(now-t1)/6000*Math.PI;camera.position.set(t.x+R*Math.sin(a+Math.atan2(o.x,o.z)),t.y+o.y,t.z+R*Math.cos(a+Math.atan2(o.x,o.z)));c.update();if(now-t1<6000)requestAnimationFrame(f);else done();}requestAnimationFrame(f);});
    return [n/6,worst]})()`);
  const objects = await p.ev(`(()=>{let n=0;scene.traverse(()=>n++);return n})()`);
  const row = { dev, file, run: r, objects, errors: errors.length, firstFrame: Math.round(firstFrame), settled: Math.round(settled), longTasks: Math.round(lt), fps: +fps[0].toFixed(1), worst: Math.round(fps[1]), kb: Math.round(bytes / 1024) };
  res.push(row); console.log(JSON.stringify(row));
  await p.close();
}
writeFileSync(out, JSON.stringify(res, null, 1));
