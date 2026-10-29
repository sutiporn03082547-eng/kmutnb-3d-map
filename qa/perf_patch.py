"""Speed pass 2026-10-29 for index.html and back.html (run once from the repo root: python qa/perf_patch.py). Nothing is moved,
resized or removed from the data; only how often and in how many pieces things are drawn changes. Measured with qa/perf.mjs.
1. Shadows are redrawn only when they can change: the sun/shadow area moved, objects were added or removed, light changed,
   right after a tap/click/key (toggles), and at least every 1.5 s while the camera moves. Nothing in the scene animates
   (checked: no shadow caster changes its matrix by itself), so the picture is the same; rotating no longer redraws shadows.
2. While panning, the shadow area re-centres only after the view moved 10% of its size (was: every snapped texel step).
3. Construction details (roof edges, gutters, ridge caps) are batched in 280 m tiles instead of 140 m (4x fewer draw calls)
   and hidden beyond 800 m camera distance, where each piece is smaller than one pixel (0.1-0.3 m wide at ~0.5 m per pixel).
4. Pins and labels: the camera matrix is combined once per frame instead of twice per pin (~700 pins), and the window size is read
   once per frame. Reading innerWidth right after moving the previous label forced a full style/layout pass per label."""
import re
NL = '\r\n'
def patch(path):
    s = open(path, encoding='utf-8', newline='').read(); assert '/* speed 2026-10-29' not in s, 'already patched'
    def rep(a, b):
        nonlocal s; assert s.count(a) == 1, (path, a[:70]); s = s.replace(a, b)
    rep("function tile(x,z,level){const tx=Math.floor(x/140),tz=Math.floor(z/140),key=tx+','+tz+','+level;if(!tiles.has(key))tiles.set(key,{x:tx*140+70,z:tz*140+70,",
        "function tile(x,z,level){const S=level==='profile'?280:140;/* speed 2026-10-29: profile details in 280 m tiles */const tx=Math.floor(x/S),tz=Math.floor(z/S),key=tx+','+tz+','+level;if(!tiles.has(key))tiles.set(key,{x:tx*S+S/2,z:tz*S+S/2,")
    rep("t.group.visible=enabled&&(t.level==='fine'?distance<620&&dx*dx+dz*dz<350*350:dx*dx+dz*dz<1500*1500);",
        "t.group.visible=enabled&&(t.level==='fine'?distance<620&&dx*dx+dz*dz<350*350:distance<800&&dx*dx+dz*dz<1500*1500);")
    rep("function screen(pos){v.copy(pos).project(camera);if(v.z>1)return null;return[(v.x*.5+.5)*innerWidth,(-v.y*.5+.5)*innerHeight];}",
        "/* speed 2026-10-29: same result as v.project(camera), with projection x view combined once per drawn frame */" + NL +
        "const SCM={m:new THREE.Matrix4(),f:-1};function screen(pos){const f=renderer.info.render.frame;if(SCM.f!==f){camera.updateMatrixWorld();SCM.m.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);SCM.f=f;SCM.w=innerWidth;SCM.h=innerHeight;}" +
        "v.copy(pos).applyMatrix4(SCM.m);if(v.z>1)return null;return[(v.x*.5+.5)*SCM.w,(-v.y*.5+.5)*SCM.h];}")
    for a in ["const place=(el,s)=>{if(!s||s[0]<-80||s[0]>innerWidth+80||s[1]<-40||s[1]>innerHeight+40)",
              "place(pn,s,sync){const on=!!s&&!(s[0]<-80||s[0]>innerWidth+80||s[1]<-40||s[1]>innerHeight+40)",
              "if(!s||s[0]<-60||s[0]>innerWidth+60||s[1]<-30||s[1]>innerHeight+30)"]:
        if s.count(a): rep(a, a.replace('innerWidth', 'SCM.w').replace('innerHeight', 'SCM.h'))
    # 5. startup, same results: point-in-polygon rejects points outside the polygon's bounding box first (index.html tree
    #    placement); the back-of-campus building grid lists each building in every cell it can reach, so a lookup reads one cell.
    a = "function inPoly(x,z,p){let c=false;"
    if s.count(a) == 1:
        rep(a, "/* speed 2026-10-29: bounding box first (same result); the cache lives on the function because inPoly is hoisted and runs early */function inPoly(x,z,p){const PBB=inPoly.bb||(inPoly.bb=new WeakMap());let bb=PBB.get(p);"
               "if(!bb){bb=[Infinity,Infinity,-Infinity,-Infinity];for(const q of p){if(q[0]<bb[0])bb[0]=q[0];if(q[1]<bb[1])bb[1]=q[1];if(q[0]>bb[2])bb[2]=q[0];if(q[1]>bb[3])bb[3]=q[1];}PBB.set(p,bb);}"
               "if(x<bb[0]||x>bb[2]||z<bb[1]||z>bb[3])return false;let c=false;")
    a = ("const OCC=(()=>{const cs=40,g=new Map();let R=0;BLD.forEach(b=>{R=Math.max(R,b.w+b.d+3);const k=Math.floor(b.x/cs)+','+Math.floor(b.z/cs);let l=g.get(k);if(!l)g.set(k,l=[]);l.push(b);});return{cs,g,r:Math.ceil(R/cs)};})();" + NL +
         "  const near=(x,z)=>{const out=[],cx=Math.floor(x/OCC.cs),cz=Math.floor(z/OCC.cs);for(let a=-OCC.r;a<=OCC.r;a++)for(let c=-OCC.r;c<=OCC.r;c++){const l=OCC.g.get((cx+a)+','+(cz+c));if(l)for(const b of l)out.push(b);}return out;};")
    if s.count(a) == 1:
        rep(a, "/* speed 2026-10-29: each building is listed in every cell its bounding test can reach, so a lookup reads one cell (same result) */" + NL +
               "  const OCC=(()=>{const cs=40,g=new Map();BLD.forEach(b=>{const R=b.w+b.d+3;for(let a=Math.floor((b.x-R)/cs);a<=Math.floor((b.x+R)/cs);a++)for(let c=Math.floor((b.z-R)/cs);c<=Math.floor((b.z+R)/cs);c++){const k=a+','+c;let l=g.get(k);if(!l)g.set(k,l=[]);l.push(b);}});return{cs,g};})();" + NL +
               "  const near=(x,z)=>OCC.g.get(Math.floor(x/OCC.cs)+','+Math.floor(z/OCC.cs))||[];")
    block = NL.join([
        "<script>/* speed 2026-10-29: shadows on demand (see qa/perf_patch.py). Nothing in the scene moves by itself, so the shadow map only",
        "   has to be redrawn when the sun's shadow area moves, objects are added/removed, the light changes, or the user toggles something. */",
        "(function(){if(typeof renderer==='undefined'||typeof sun==='undefined'||typeof scene==='undefined')return;",
        " const sm=renderer.shadowMap;sm.autoUpdate=false;sm.needsUpdate=true;let sig='',input=0,structure=0,last=0;",
        " ['pointerup','click','keyup','change'].forEach(e=>addEventListener(e,()=>{input=performance.now();},{passive:true,capture:true}));",
        " const O=THREE.Object3D.prototype,add=O.add,rem=O.remove;O.add=function(){structure++;return add.apply(this,arguments);};O.remove=function(){structure++;return rem.apply(this,arguments);};",
        " const lod=window.__surfaceLOD;if(typeof lod==='function')window.__surfaceLOD=function(d){const pt=sun.target.position.clone(),pp=sun.position.clone(),r0=sun.shadow.camera.right;lod(d);",
        "  const r=sun.shadow.camera.right;if(r===r0&&sun.target.position.distanceTo(pt)<r*0.1){sun.target.position.copy(pt);sun.position.copy(pp);sun.target.updateMatrixWorld();}};",
        " const render=renderer.render;renderer.render=function(s,c){if(s===scene&&c===camera){const t=sun.target.position,p=sun.position,k=sun.shadow.camera,now=performance.now();",
        "  const key=p.x+','+p.y+','+p.z+','+t.x+','+t.y+','+t.z+','+k.left+','+k.top+','+structure+','+sun.intensity+','+sun.castShadow+','+sun.visible;",
        "  if(key!==sig||now-input<400||(now-last>1500&&window.__pl&&window.__pl.moving)){sm.needsUpdate=true;sig=key;last=now;}}return render.apply(this,arguments);};",
        " window.__shadowOnDemand=true;})();",
        "</script>"])
    rep('</body>', block + NL + '</body>')
    open(path, 'w', encoding='utf-8', newline='').write(s); print('patched', path)
for f in ('index.html', 'back.html'): patch(f)
