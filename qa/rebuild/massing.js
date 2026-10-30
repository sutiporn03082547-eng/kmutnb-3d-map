/* campus massing rebuild 2026-10-30 (source: qa/rebuild/*.js, injected by qa/rebuild_campus.py; evidence and what is still an
   estimate: qa/BUILDINGS-REPORT.md). Replaces the single extruded block of a building with its parts: blocks, wings, links,
   light wells, roof halls, read from Esri World Imagery and the photos in photos/. Positions come from the building's own
   footprint corners (b.p), so the building does not move on the map. Photo-fitted entrance models and facade details are kept. */
window.CAMPUS_REBUILD=window.CAMPUS_REBUILD||{};
(function(){if(typeof ALL==='undefined'||typeof scene==='undefined')return;
 const R=window.CAMPUS_REBUILD;
 const Lm=(c,o)=>new THREE.MeshLambertMaterial(Object.assign({color:c},o||{}));
 /* point inside a 4-corner block [NW,NE,SE,SW] at s (west->east) and t (north->south), both 0..1 */
 const bil=(Q,s,t)=>{const[a,b,c,d]=Q,u=[a[0]+(b[0]-a[0])*s,a[1]+(b[1]-a[1])*s],v=[d[0]+(c[0]-d[0])*s,d[1]+(c[1]-d[1])*s];return[u[0]+(v[0]-u[0])*t,u[1]+(v[1]-u[1])*t];};
 R.rect=(Q,s0,s1,t0,t1)=>[bil(Q,s0,t0),bil(Q,s1,t0),bil(Q,s1,t1),bil(Q,s0,t1)];
 /* hip roof over a 4-corner base at height y: ridge along the longer side, rise h */
 function hip(p,y,h,m,E){/* E: how far in the ridge ends start (0 = gable) */const L1=Math.hypot(p[1][0]-p[0][0],p[1][1]-p[0][1]),L2=Math.hypot(p[2][0]-p[1][0],p[2][1]-p[1][1]);
  const q=L1>=L2?p:[p[1],p[2],p[3],p[0]],mid=(a,b,f)=>[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];
  const e=E!==undefined?E:Math.min(L1,L2)/2/Math.max(L1,L2),c0=mid(mid(q[0],q[3],.5),mid(q[1],q[2],.5),e),c1=mid(mid(q[0],q[3],.5),mid(q[1],q[2],.5),1-e);
  const V=(a,yy)=>[a[0],yy,a[1]],r0=V(c0,y+h),r1=V(c1,y+h),b=q.map(a=>V(a,y));
  const tris=[[b[0],b[1],r1],[b[0],r1,r0],[b[2],b[3],r0],[b[2],r0,r1],[b[1],b[2],r1],[b[3],b[0],r0]];
  const pos=[];tris.forEach(t=>t.forEach(v=>pos.push(...v)));const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();
  const o=new THREE.Mesh(g,m);o.material.side=THREE.DoubleSide;return o;}
 /* spec: {keep:/name regex/, style:{glass,band,lip,roof}, parts:[{p:[[x,z]..], y0:floorIndex, floors, roof:'#hex', name}],
          halls:[{p, floors(above roof of its part), up, rise, color, wall}], stripes:true} */
 R.rebuild=function(id,spec){const b=ALL.find(b=>b.id===id);if(!b||!b.group)return null;const g=b.group,removed=[];
  [...g.children].forEach(c=>{if(spec.keep&&spec.keep.test(c.name||''))return;g.remove(c);removed.push(c);});
  if(typeof picks!=='undefined')for(let i=picks.length-1;i>=0;i--){let o=picks[i],gone=false;for(;o;o=o.parent)if(removed.includes(o)){gone=true;break;}if(gone)picks.splice(i,1);}
  const S=spec.style,glass=new THREE.MeshPhongMaterial({color:S.glass,specular:'#9fb3c0',shininess:40}),band=Lm(S.band,{emissive:'#2a2927'}),lip=Lm(S.lip,{emissive:'#1c1e20'});
  const part=new THREE.Group();part.name='massing-'+id;part.position.set(-g.position.x+(spec.world?0:(b.dx||0)),-g.position.y,-g.position.z+(spec.world?0:(b.dz||0)));g.add(part);/* spec.world: coordinates already include b.dx/dz */
  const ex=(p,d,m,y,k)=>{const c=[p.reduce((s,q)=>s+q[0],0)/p.length,p.reduce((s,q)=>s+q[1],0)/p.length],pp=k?p.map(([x,z])=>[c[0]+(x-c[0])*k,c[1]+(z-c[1])*k]):p;
   const o=rotX(new THREE.Mesh(new THREE.ExtrudeGeometry(shape(pp),{depth:d,bevelEnabled:false}),m));o.position.y=y+.3;o.castShadow=true;o.receiveShadow=true;o.userData.bid=b.id;part.add(o);if(typeof picks!=='undefined')picks.push(o);return o;};
  let top=0;
  spec.parts.forEach(P=>{for(let i=P.y0;i<P.y0+P.floors;i++){const y=i*FLOOR;ex(P.p,FLOOR-1.1,glass,y,.985);ex(P.p,1.1,band,y+FLOOR-1.1);ex(P.p,.16,lip,y+FLOOR-1.25,1.012);}
   const h=(P.y0+P.floors)*FLOOR;ex(P.p,.6,Lm(P.roof||S.roof),h);top=Math.max(top,h+.6);});
  (spec.halls||[]).forEach(H=>{const y=H.base*FLOOR+.6;ex(H.p,H.up,Lm(H.wall||S.band),y);const r=hip(H.p,y+H.up+.3,H.rise,Lm(H.color));r.castShadow=true;r.userData.bid=b.id;part.add(r);if(typeof picks!=='undefined')picks.push(r);top=Math.max(top,y+H.up+H.rise);});
  if(spec.stripes){const red=Lm('#d6322f'),wS=Lm('#ffffff');b.p.forEach(([x,z],i)=>{const[x2,z2]=b.p[(i+1)%b.p.length],L=Math.hypot(x2-x,z2-z);if(L<14)return;const r=-Math.atan2(z2-z,x2-x),tx=(x2-x)/L,tz=(z2-z)/L;let nx=-tz,nz=tx;if(inPoly(x+tx*L/2+nx,z+tz*L/2+nz,b.p)){nx=-nx;nz=-nz;}
    [.3,.78].forEach(f=>{for(let k=0;k<b.lv;k++)[[0,red],[.55,wS]].forEach(([o,m])=>{const s1=new THREE.Mesh(new THREE.BoxGeometry(.42,1.25,.08),m);s1.position.set(x+tx*(L*f+o)+nx*.06,k*FLOOR+FLOOR-.25,z+tz*(L*f+o)+nz*.06);s1.rotation.set(0,r,-.55,'YXZ');part.add(s1);});});});}
  b.top=Math.max(b.top||0,top+.3);b.rebuilt={by:'qa/rebuild',parts:spec.parts.length,halls:(spec.halls||[]).length,removed:removed.length};
  if(window.__plDirty)window.__plDirty();return b.rebuilt;};
 /* pitched roof on an existing model: hip or gable over the footprint's minimum rectangle (shrunk by k), set on the model's own
    roof surface (found by casting a ray down at the footprint centre), so the walls below are not touched */
 function minRect(p){let best=null;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<1)continue;const ux=(b[0]-a[0])/L,uz=(b[1]-a[1])/L;
   let u0=1e9,u1=-1e9,v0=1e9,v1=-1e9;p.forEach(([x,z])=>{const u=x*ux+z*uz,v=-x*uz+z*ux;u0=Math.min(u0,u);u1=Math.max(u1,u);v0=Math.min(v0,v);v1=Math.max(v1,v);});
   const A=(u1-u0)*(v1-v0);if(!best||A<best.A)best={A,pts:[[u0,v0],[u1,v0],[u1,v1],[u0,v1]].map(([u,v])=>[u*ux-v*uz,u*uz+v*ux])};}return best.pts;}
 R.addRoof=function(id,o){const b=ALL.find(b=>b.id===id);if(!b||!b.group)return null;const g=b.group;
  const P=b.p.map(([x,z])=>[x+(b.dx||0),z+(b.dz||0)]),c=[P.reduce((s,q)=>s+q[0],0)/P.length,P.reduce((s,q)=>s+q[1],0)/P.length];
  const rc=new THREE.Raycaster(new THREE.Vector3(c[0],400,c[1]),new THREE.Vector3(0,-1,0));g.updateMatrixWorld(true);const hit=rc.intersectObject(g,true).find(h=>h.object.isMesh&&!h.object.isInstancedMesh);
  const y=o.y!=null?o.y:hit?hit.point.y:(b.top||10)-.9,k=o.k||1,R4=minRect(P).map(([x,z])=>[c[0]+(x-c[0])*k,c[1]+(z-c[1])*k]);
  const m=Lm(o.color,{emissive:'#1a1512'}),r=hip(R4,y,o.rise,m,o.type==='gable'?0:undefined);r.name='pitched-roof-'+id;r.castShadow=true;r.receiveShadow=true;r.userData.bid=b.id;
  const holder=new THREE.Group();holder.name='roof-'+id;g.updateMatrixWorld(true);holder.applyMatrix4(new THREE.Matrix4().copy(g.matrixWorld).invert());holder.add(r);g.add(holder);
  if(typeof picks!=='undefined')picks.push(r);b.top=Math.max(b.top||0,y+o.rise+.3);b.roofAdded={type:o.type,y:+y.toFixed(2),rise:o.rise};if(window.__plDirty)window.__plDirty();return b.roofAdded;};
})();
