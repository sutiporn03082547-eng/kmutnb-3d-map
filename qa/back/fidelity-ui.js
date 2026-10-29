/* fidelity 2026-10-29: evidence level of every back-of-campus building, on its card and as a map colouring.
   VERIFIED = footprint and height both from a source; ESTIMATED = real footprint (or its outline), height/roof estimated;
   UNVERIFIED = no footprint data supports the shape. Letters in FID.k are explained in qa/back/inject_fidelity.py. */
const FIDL={V:{t:"VERIFIED",th:"ยืนยันได้",c:"#2e9e5b"},E:{t:"ESTIMATED",th:"ประมาณการ",c:"#e3a21a"},U:{t:"UNVERIFIED",th:"ยังไม่ยืนยัน",c:"#d9534f"}};
const fidLevel=bi=>FID.k[bi]==="G"?"U":"E";
const fidRef=bi=>{const r=FID.r.split(",")[bi]||"";return r?(r[0]==="o"?"OpenStreetMap way "+r.slice(1):"Microsoft footprint #"+r.slice(1)):"";};
function fidLines(bi){const b=BLD[bi],k=FID.k[bi],ref=fidRef(bi),L=[];
  L.push(k==="M"?`รูปทรงฐาน: ตรงกับ ${ref} (ตำแหน่งต่างกันไม่ถึง 1 ม.)`:
    k==="P"?`รูปทรงฐาน: ใช้รูปทรงจริงจาก ${ref} (เดิมเป็นกล่องสี่เหลี่ยม)`:
    k==="S"?`รูปทรงฐาน: แนวขอบรวมตรงกับ ${ref} · การแบ่งเป็นห้อง/คูหาเป็นค่าประมาณ`:
    k==="F"?(ref?`รูปทรงฐาน: ตรงกับ ${ref} · หน้าร้านทำจากรูปถ่าย`:"รูปทรงฐาน: ไม่มีข้อมูล footprint · หน้าร้านทำจากรูปถ่ายที่ยืนยันว่ามีอาคาร"):
    "รูปทรงฐาน: ไม่มีข้อมูล footprint รองรับ · แสดงเป็นกล่องโปร่งตามตำแหน่งหมุดร้าน ไม่ใช่รูปทรงอาคารจริง");
  L.push(`ความสูง: ${Math.max(1,b.fl)} ชั้น เป็นค่าประมาณ (ไม่มีข้อมูลจำนวนชั้นหรือความสูงจริง)`);
  if(k!=="G")L.push(b.t==="hs"&&k!=="P"?"หลังคา: จั่ว เป็นค่าประมาณ (ยังไม่ได้ตรวจกับภาพถ่าย)":"หลังคา: แสดงเป็นหลังคาแบน · รูปทรงจริงยังไม่ได้ตรวจ");
  if(k!=="G"&&k!=="F")L.push("หน้าต่าง กันสาด และสีผนังเป็นลายประกอบ ไม่ใช่รายละเอียดจริงของอาคารนี้");
  return L;}
/* tapping a building without a shop: show where its shape comes from */
function showBox(bi){const b=BLD[bi];select(null);const lv=FIDL[fidLevel(bi)];card.style.setProperty("--c",lv.c);
  document.getElementById("cKind").textContent="🏠 อาคาร";document.getElementById("cName").textContent=b.t==="dm"?"อาคารพักอาศัยหลายชั้น (ไม่มีชื่อในข้อมูล)":"อาคารไม่มีชื่อในข้อมูล";
  const meta=document.getElementById("cMeta");meta.innerHTML="";const s=document.createElement("span");s.className="pill";s.textContent="ข้อมูลอาคาร: "+lv.th+" ("+lv.t+")";meta.appendChild(s);
  const ul=document.getElementById("cInfo");ul.innerHTML="";fidLines(bi).forEach(t=>{const li=document.createElement("li");li.textContent=t;ul.appendChild(li);});
  const tb=document.getElementById("hours");tb.innerHTML="";tb.hidden=true;const cg=document.getElementById("cGrp");if(cg)cg.hidden=true;
  const lat=13.82156-b.z/110574,lon=100.51408+b.x/(111320*Math.cos(13.82156*Math.PI/180));
  document.getElementById("cMap").href=`https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lon.toFixed(6)}`;
  document.getElementById("cSrc").innerHTML='รูปทรงฐาน: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> / <a href="https://github.com/microsoft/GlobalMLBuildingFootprints" target="_blank" rel="noopener">Microsoft Global ML Building Footprints</a> (ODbL)';
  card.hidden=false;halo.position.set(b.x,0.6,b.z);halo.scale.setScalar(Math.max(b.w,b.d)*.75+3);halo.visible=true;window.__boxSel=bi;}
canvas.addEventListener("pointerup",e=>{const d=window.__bdown;window.__bdown=null;if(!d||Math.hypot(e.clientX-d.x,e.clientY-d.y)>=6||selId!=null)return;setNdc(e);
  const h=ray.intersectObjects(picks,false)[0];if(!h||!h.object.userData.own)return;const bi=h.object.userData.own[h.faceIndex];const b=BLD[bi];if(!b||b.poi>=0)return;
  const hx=ray.intersectObjects(XB.meshes,false)[0];if(hx&&hx.distance<h.distance)return;showBox(bi);});
canvas.addEventListener("pointerdown",e=>{window.__bdown={x:e.clientX,y:e.clientY};});
/* shop / dorm cards: add the building's evidence level under the shop notes */
{const sel0=select;select=function(i,fly){sel0(i,fly);if(i==null)return;const p=pins[i]&&pins[i].p;if(!p||p.b==null||!BLD[p.b])return;
  const ul=document.getElementById("cInfo"),li=document.createElement("li");li.className="fid";const lv=FIDL[fidLevel(p.b)];
  li.textContent="ข้อมูลอาคาร: "+lv.th+" ("+lv.t+") · "+fidLines(p.b).join(" · ");ul.appendChild(li);};}
/* map colouring by evidence level (button in the menu); originals are kept and restored */
const FIDV={on:false,saved:null};
function fidPaint(){const meshes=picks.slice(0,4).concat([ghostMesh]);
  if(!FIDV.saved)FIDV.saved=meshes.map(m=>({m,c:m.geometry.attributes.color.array.slice(),map:m.material.map}));
  const col=new THREE.Color();
  FIDV.saved.forEach(({m,c,map})=>{const a=m.geometry.attributes.color,own=m.userData.own;
    if(FIDV.on){for(let t=0;t<own.length;t++){col.set(FIDL[fidLevel(own[t])].c);for(let v=0;v<3;v++){a.array[(t*3+v)*3]=col.r;a.array[(t*3+v)*3+1]=col.g;a.array[(t*3+v)*3+2]=col.b;}}}
    else a.array.set(c);
    a.needsUpdate=true;if(m.material!==ghostMat){m.material.map=FIDV.on?null:map;m.material.needsUpdate=true;}});
  XB.meshes.forEach(m=>{const known=m.material.color.getHexString()==="ddd6c8"||m.material.color.getHexString()==="5f646b";m.userData.fidKnown??=known;
    if(FIDV.on)m.material.color.set(m.userData.fidKnown?FIDL.V.c:FIDL.E.c);});
  if(!FIDV.on&&typeof applyMode==="function")applyMode();
  document.getElementById("fidLegend").hidden=!FIDV.on;const bt=document.getElementById("fidBtn");bt.setAttribute("aria-pressed",String(FIDV.on));
  if(window.__plDirty)window.__plDirty();}
{const n={V:XB.meshes.filter(m=>m.material.color.getHexString()==="ddd6c8").reduce((s,m)=>s+new Set(m.userData.xown).size,0),E:0,U:0};
  for(let i=0;i<BLD.length;i++)n[fidLevel(i)]++;n.E+=EXTRA.blds.length-n.V;
  const lg=document.createElement("div");lg.id="fidLegend";lg.className="panel";lg.hidden=true;
  lg.style.cssText="position:fixed;left:12px;bottom:12px;z-index:30;padding:10px 12px;font-size:13px;line-height:1.5;max-width:min(330px,calc(100vw - 24px))";
  lg.innerHTML="<b>ความน่าเชื่อถือข้อมูลอาคาร</b>"+["V","E","U"].map(k=>`<div><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${FIDL[k].c};margin-right:6px;vertical-align:-1px"></span>${FIDL[k].th} (${FIDL[k].t}) · ${n[k].toLocaleString("th-TH")} หลัง</div>`).join("")+
    "<div style='opacity:.8;margin-top:4px'>ยืนยันได้ = รูปทรงและจำนวนชั้นมีแหล่งอ้างอิง · ประมาณการ = รูปทรงฐานจริง แต่ความสูง/หลังคาประมาณ · ยังไม่ยืนยัน = ไม่มีข้อมูลรูปทรงรองรับ</div>";
  document.body.appendChild(lg);window.__fidelityCounts=n;}
document.getElementById("fidBtn").onclick=()=>{FIDV.on=!FIDV.on;fidPaint();};
{const am=applyMode;applyMode=function(){am.apply(this,arguments);if(FIDV.on)XB.meshes.forEach(m=>m.material.color.set(m.userData.fidKnown?FIDL.V.c:FIDL.E.c));};}
window.__fidelity={level:fidLevel,lines:fidLines,paint:on=>{FIDV.on=on;fidPaint();}};
