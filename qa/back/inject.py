import json,re
R=json.load(open('backosm/missing-roads.json',encoding='utf-8'));B=json.load(open('backosm/add-buildings.json',encoding='utf-8'))
TYPE={'residential':'rl','service':'se','track':'tk','footway':'ph','path':'ph','steps':'ph','pedestrian':'ph','secondary':'py'}
roads=[[TYPE[r['hw']],r['name'],r['pts'],r['id']] for r in R if r['hw'] in TYPE]
skipped=[r for r in R if r['hw'] not in TYPE]
blds=[[b['src'],b['id'],b['lv'],b['kind'],b['name'],b['p']] for b in B]
data=json.dumps({'fetched':'2026-10-29','osm':'OpenStreetMap via overpass-api.de, snapshot 2026-10-28T18:20Z, ODbL','ms':'Microsoft Global ML Building Footprints, release 2026-02-03, quadkey 132203310, ODbL','roads':roads,'blds':blds},ensure_ascii=False,separators=(',',':'))
f='repo/back.html';s=open(f,encoding='utf-8',newline='').read()
i=s.index('const D={');j=s.index('\n',i);nl='\r\n' if s[j-1]=='\r' else '\n'
block=(nl+"/* back-expand 2026-10-29: physical detail from open data, added to the same local coordinates (metres from 13.82156,100.51408)."+nl+
"   EXTRA.roads: OSM highways outside campus that the map did not have (motorway/motorway_link left out: elevated, no height data)."+nl+
"   EXTRA.blds: building footprints with no existing model: OSM first, then Microsoft ML footprints. Heights: OSM building:levels when"+nl+
"   tagged; otherwise unknown and drawn as a 2-storey placeholder (marked on the card), never stored as a verified floor count. */"+nl+
"const EXTRA="+data+";"+nl+
"EXTRA.roads.forEach(([t,n,pts])=>D.roads.push([t,n,pts]));")
s=s[:j]+block+s[j:]
anchor="/* OSM dorm footprints (real shapes) */"
assert s.count(anchor)==1
code=r"""/* back-expand: buildings from EXTRA.blds as extruded footprints, merged into one mesh per material (two draw calls in all).
   Known height (OSM building:levels) uses the light wall colour; unknown height is a 2-storey placeholder in a paler grey. */
const XB=(()=>{const known=new THREE.MeshLambertMaterial({color:"#ddd6c8"}),unknown=new THREE.MeshLambertMaterial({color:"#c9c6be"});
  const parts={k:[],u:[]},owners={k:[],u:[]};
  EXTRA.blds.forEach((b,i)=>{const[src,id,lv,kind,name,p]=b;const h=lv?lv*3.1:(/carport|roof|shed/.test(kind)?3:6.2);
    const g=new THREE.ExtrudeGeometry(shape(p),{depth:h,bevelEnabled:false}).toNonIndexed();g.rotateX(-Math.PI/2);g.translate(0,.25,0);
    const key=lv?'k':'u';parts[key].push(g);for(let t=0;t<g.attributes.position.count/3;t++)owners[key].push(i);});
  const group=new THREE.Group();group.name='back-expand-buildings';const meshes=[];
  for(const key of ['k','u']){if(!parts[key].length)continue;let n=0;parts[key].forEach(g=>n+=g.attributes.position.count);
    const pos=new Float32Array(n*3),nor=new Float32Array(n*3);let o=0;parts[key].forEach(g=>{pos.set(g.attributes.position.array,o*3);nor.set(g.attributes.normal.array,o*3);o+=g.attributes.position.count;g.dispose();});
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));geo.computeBoundingSphere();
    const m=new THREE.Mesh(geo,key==='k'?known:unknown);m.castShadow=true;m.receiveShadow=true;m.userData.xown=owners[key];m.userData.noMerge=true;group.add(m);meshes.push(m);}
  scene.add(group);
  if(typeof applyMode==='function'){const prev=applyMode;applyMode=function(){prev.apply(this,arguments);const n=typeof mode!=='undefined'&&mode==='night';known.color.set(n?'#5f646b':'#ddd6c8');unknown.color.set(n?'#555a61':'#c9c6be');};}
  return{group,meshes};})();
"""
s=s.replace(anchor,code+anchor)
pick_anchor='addEventListener("keydown",e=>{if(e.key==="Escape")select(null);});'
assert s.count(pick_anchor)==1
pick=r"""
/* back-expand: tapping a building added from open data shows where its shape and height come from (shops keep their own cards) */
function showExtra(i){const[src,id,lv,kind,name,p]=EXTRA.blds[i];select(null);const card=document.getElementById("card");card.style.setProperty("--c","#9aa3ad");
  const cx=p.reduce((s,q)=>s+q[0],0)/p.length,cz=p.reduce((s,q)=>s+q[1],0)/p.length,lat=13.82156-cz/110574,lon=100.51408+cx/(111320*Math.cos(13.82156*Math.PI/180));
  const area=Math.abs(p.reduce((s,q,k)=>{const r=p[(k+1)%p.length];return s+q[0]*r[1]-r[0]*q[1];},0)/2);
  document.getElementById("cKind").textContent="🏢 อาคาร";document.getElementById("cName").textContent=name||("อาคารไม่มีชื่อ · รหัส "+(src==='osm'?'OSM-':'MS-')+id);
  const meta=document.getElementById("cMeta");meta.innerHTML="";const pill=(t,c)=>{const s=document.createElement("span");s.className="pill "+(c||"");s.textContent=t;meta.appendChild(s);};
  pill(src==='osm'?"รูปทรงจาก OpenStreetMap":"รูปทรงจาก Microsoft footprints");pill(lv?("สูง "+lv+" ชั้น (OSM)"):"ความสูงไม่ทราบ · แสดง 2 ชั้นแทน","off");
  const ul=document.getElementById("cInfo");ul.innerHTML="";[`พื้นที่ฐานราว ${Math.round(area)} ตร.ม. (คำนวณจากรูปทรง)`,`ประเภทใน OSM: ${kind}`,src==='osm'?`OpenStreetMap way ${id}`:"Microsoft Global ML Building Footprints (ตรวจจับจากภาพถ่ายดาวเทียมด้วย ML อาจคลาดเคลื่อน)","ชื่อและการใช้งานอาคารยังไม่ได้ตรวจสอบ"].forEach(t=>{if(src!=='osm'&&t.startsWith('ประเภท'))return;const li=document.createElement("li");li.textContent=t;ul.appendChild(li);});
  const tb=document.getElementById("hours");tb.innerHTML="";tb.hidden=true;const cg=document.getElementById("cGrp");if(cg)cg.hidden=true;
  const a=document.getElementById("cMap");a.href=`https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lon.toFixed(6)}`;
  document.getElementById("cSrc").innerHTML=src==='osm'?'รูปทรง: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> (ODbL)':'รูปทรง: <a href="https://github.com/microsoft/GlobalMLBuildingFootprints" target="_blank" rel="noopener">Microsoft Global ML Building Footprints</a> (ODbL)';
  card.hidden=false;halo.position.set(cx,0.6,cz);halo.scale.setScalar(Math.sqrt(area)*.8+4);halo.visible=true;window.__extraSel=i;}
canvas.addEventListener("pointerup",e=>{if(!down&&window.__extraTap===undefined)return;},true);
canvas.addEventListener("pointerdown",e=>{window.__xdown={x:e.clientX,y:e.clientY};});
canvas.addEventListener("pointerup",e=>{const d=window.__xdown;window.__xdown=null;if(!d||Math.hypot(e.clientX-d.x,e.clientY-d.y)>=6)return;setNdc(e);
  const hx=ray.intersectObjects(XB.meshes,false)[0];if(!hx)return;const hp=ray.intersectObjects(picks,false)[0];if(selId!=null&&hp&&hp.distance<hx.distance)return;
  showExtra(hx.object.userData.xown[hx.faceIndex]);});"""
s=s.replace(pick_anchor,pick_anchor+pick)
open(f,'w',encoding='utf-8',newline='').write(s)
print('roads',len(roads),'skipped',len(skipped),'blds',len(blds),'bytes',len(data))
