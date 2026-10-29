// CPU profile of one page on the throttled phone profile: load phase and orbit phase separately, top functions by self time,
// plus renderer counts. usage: node qa/perf-profile.mjs URL [phase=both]
import { open, sleep } from './cdp.mjs';
const [url] = process.argv.slice(2);
const p = await open({ port: 9470, width: 540, height: 960, scale: 2 });
await p.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await p.send('Profiler.enable'); await p.send('Profiler.setSamplingInterval', { interval: 500 });
function top(profile, n = 25) {
  const nodes = new Map(profile.nodes.map(x => [x.id, x])); const self = new Map();
  const dt = profile.timeDeltas; profile.samples.forEach((id, i) => { const nd = nodes.get(id); const cf = nd.callFrame;
    const k = `${cf.functionName || '(anon)'} @${(cf.url || '').split('/').pop()}:${cf.lineNumber}:${cf.columnNumber}`; self.set(k, (self.get(k) || 0) + (dt[i] || 0)); });
  const tot = [...self.values()].reduce((a, b) => a + b, 0);
  return { totalMs: Math.round(tot / 1000), top: [...self].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [Math.round(v / 1000), k]) };
}
await p.send('Profiler.start');
await p.send('Page.navigate', { url }); await sleep(45000);
let r = await p.send('Profiler.stop'); console.log('LOAD', JSON.stringify(top(r.result.profile), null, 0));
console.log('INFO', await p.ev(`JSON.stringify({calls:renderer.info.render.calls,tris:renderer.info.render.triangles,geos:renderer.info.memory.geometries,tex:renderer.info.memory.textures,progs:renderer.info.programs.length,pr:renderer.getPixelRatio(),shadow:renderer.shadowMap.enabled&&sun.shadow.mapSize.x,objects:(()=>{let n=0,m=0,i=0;scene.traverse(o=>{n++;if(o.isMesh&&o.visible)m++;if(o.isInstancedMesh)i+=o.count;});return [n,m,i]})()})`));
await p.send('Profiler.start');
await p.ev(`(async()=>{const c=controls,t=c.target.clone(),o=camera.position.clone().sub(t),R=Math.hypot(o.x,o.z);const t1=performance.now();await new Promise(done=>{function f(now){const a=(now-t1)/6000*Math.PI;camera.position.set(t.x+R*Math.sin(a),t.y+o.y,t.z+R*Math.cos(a));c.update();if(now-t1<6000)requestAnimationFrame(f);else done();}requestAnimationFrame(f);});return 1})()`);
r = await p.send('Profiler.stop'); console.log('ORBIT', JSON.stringify(top(r.result.profile), null, 0));
await p.close();
