/* parking 2026-11-04 (source qa/parking/, evidence per place in qa/parking/spots.json). Same code on both pages:
   - search understands how people type it (มอไซค์, จอดมอไซ, จยย, parking...) and lists parking by vehicle;
   - every card says whether cars and motorcycles can park there, on what evidence, and where the nearest spots are;
   - two buttons show only car or only motorcycle parking;
   - marked bays and example vehicles are drawn on the real lot outlines (vehicle counts are illustrative). */
(function(){
 const PK=window.PK_DATA,page=PK.page,spots=PK.spots,campus=page==='campus';
 const MOTO=/มอเตอร์ไซด์|มอเตอร์ไซค์|มอเตอร์ไซ|มอเตอไซค์|มอเตอไซด์|มอเตอไซ|มอไซค์|มอไซด์|มอไซ|จักรยานยนต์|จยย\.?|motorcycles?|motorbikes?|motor|scooter|bikes?/g;
 const CAR=/รถยนต์|รถเก๋ง|รถกระบะ|รถส่วนตัว|\bcars?\b/g,PARKW=/ลานจอด|ที่จอด|จุดจอด|จอด|parking|carpark|park/g;
 const FILL=/รถ|ได้|ไหม|มั้ย|มั๊ย|บ้าง|ตรงไหน|ตรงนี้|ที่ไหน|ตรง|แถว|ใกล้|ของ|หน่อย|ครับ|ค่ะ/g;
 const ck=s=>s.replace(MOTO,'มอเตอร์ไซค์');
 function intent(raw){const s=ck(raw);const moto=s.includes('มอเตอร์ไซค์'),car=CAR.test(s);CAR.lastIndex=0;PARKW.lastIndex=0;const park=PARKW.test(s);PARKW.lastIndex=0;
  if(!park&&!moto&&!car)return null;const rest=s.replace(/มอเตอร์ไซค์/g,'').replace(CAR,'').replace(PARKW,'').replace(FILL,'');return{moto,car,park,rest,hasPark:park};}
 const okFor=(k,it)=>{if(!k)return false;if(k.warn)return !it.moto&&!it.car;if(it.moto&&!it.car)return k.moto==='y';if(it.car&&!it.moto)return k.car==='y';return k.car==='y'||k.moto==='y'||k.frontage;};
 const WORD={y:'จอดได้',n:'ไม่ใช่ที่จอด','?':'ยังไม่ยืนยัน'};
 const say=(k,v)=>(k.words&&k.words[v])||WORD[k[v]];
 const vLine=k=>`🚗 รถยนต์: ${say(k,'car')} · 🏍️ มอเตอร์ไซค์: ${say(k,'moto')}`;
 const badge=k=>(k.car==='y'?'🚗':'')+(k.moto==='y'?'🏍️':'')||'⚠️';
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 function nearest(o,kind){let best=null;for(const k of spots){if(k.noNear||k[kind]!=='y')continue;const d=dist(o,k);if(k.frontage&&kind==='moto'&&best&&d>best.d-40)continue;if(!best||d<best.d)best={k,d};}return best;}
 function addRow(ul,cls,build){const li=document.createElement('li');li.className='pk-row '+cls;build(li);ul.appendChild(li);return li;}
 function jump(k,label){const b=document.createElement('button');b.type='button';b.className='pk-go';b.textContent=label;b.onclick=e=>{e.stopPropagation();PK.open(k);};return b;}
 function cardFor(ul,o,k){ul.querySelectorAll('.pk-row').forEach(e=>e.remove());
  if(k){addRow(ul,'pk-main',li=>{li.textContent=vLine(k);});if(k.how&&![...ul.children].some(e=>e.textContent===k.how))addRow(ul,'',li=>{li.textContent='จุดจอด: '+k.how;});else if(k.how)[...ul.children].forEach(e=>{if(e.textContent===k.how)e.remove();}),addRow(ul,'',li=>{li.textContent='จุดจอด: '+k.how;});
   const acc=k.access||(k.area==='campus'?PK.accessCampus:'');if(acc)addRow(ul,'',li=>{li.textContent='เงื่อนไข: '+acc;});if(k.ev)addRow(ul,'pk-ev',li=>{li.textContent='หลักฐาน: '+k.ev;});}
  if(k&&k.car==='y'&&k.moto==='y'&&!k.frontage)return;
  const add=(kind,label)=>{if(k&&k[kind]==='y')return;const n=nearest(o,kind);if(!n)return;addRow(ul,'pk-near',li=>{li.append(label+' ใกล้สุด: ');li.append(jump(n.k,n.k.name));li.append(` ราว ${Math.round(n.d/5)*5} ม. (เส้นตรง)`+(n.k.frontage?' · หน้าร้าน ไม่ใช่ที่จอดสาธารณะ':''));});};
  add('car','🚗 ที่จอดรถยนต์');add('moto','🏍️ ที่จอดมอเตอร์ไซค์');}
 function photoNote(){const f=()=>document.querySelectorAll('#card .photo-status').forEach(e=>{if(e.textContent.startsWith('ยังไม่มีภาพจริง'))e.textContent='ยังไม่มีภาพถ่ายของจุดนี้ที่นำมาแสดงได้ ดูหลักฐานด้านล่าง';});f();setTimeout(f,0);}
 /* filter buttons under the search box: they use the search itself, so the list, pins and Enter all behave the same */
 function filterBar(q,after,rerun){const bar=document.createElement('div');bar.className='pk-filter';bar.setAttribute('role','group');bar.setAttribute('aria-label','ดูเฉพาะที่จอดรถ');
  [['🚗 ที่จอดรถยนต์','จอดรถยนต์'],['🏍️ ที่จอดมอเตอร์ไซค์','จอดมอเตอร์ไซค์']].forEach(([t,w])=>{const b=document.createElement('button');b.type='button';b.textContent=t;b.dataset.w=w;b.setAttribute('aria-pressed','false');
   b.onclick=()=>{const on=q.value!==w;q.value=on?w:'';rerun();if(on&&innerWidth<=760&&typeof setSide==='function')setSide(true);};bar.appendChild(b);});
  after.parentNode.insertBefore(bar,after.nextSibling);
  const sync=()=>bar.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(q.value===b.dataset.w)));q.addEventListener('input',sync);PK.syncBar=sync;
  const css=document.createElement('style');css.textContent='@media(max-width:760px){#compass{top:calc(118px + env(safe-area-inset-top,0px))!important}#gpsBtn{top:calc(168px + env(safe-area-inset-top,0px))!important}#backLink{top:calc(218px + env(safe-area-inset-top,0px))!important}}.pk-filter{display:flex;gap:6px;margin-top:8px}.pk-filter button{flex:1;font:600 12px inherit;font-family:inherit;padding:7px 6px;border-radius:9px;border:1px solid #3f8cff;background:transparent;color:inherit;cursor:pointer}.pk-filter button[aria-pressed=true]{background:#3f8cff;color:#fff}.pk-row.pk-main{font-weight:700}.pk-row.pk-ev{opacity:.75;font-size:.92em}.pk-go{font:inherit;color:#7db4ff;background:none;border:0;padding:0;text-decoration:underline;cursor:pointer;text-align:left}.t[data-pk]::before{content:attr(data-pk);margin-right:5px;font-size:12px}';document.head.append(css);}
 /* drawing: bay lines on real outlines; cars and motorcycles as examples */
 function inP(x,z,p){let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const[xi,zi]=p[i],[xj,zj]=p[j];if(((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/(zj-zi)+xi))c=!c;}return c;}
 function blocked(x,z){if(campus)return false;for(const b of BLD){const dx=x-b.x,dz=z-b.z;if(dx*dx+dz*dz>3600)continue;const c=Math.cos(b.a),n=Math.sin(b.a),u=dx*c-dz*n,v=dx*n+dz*c;if(Math.abs(u)<b.w/2+1.5&&Math.abs(v)<b.d/2+1.5)return true;}
  for(const t of D.T)if(Math.hypot(t[0]-x,t[1]-z)<2.5)return true;
  for(const r of D.roads){const q=r[2];for(let i=1;i<q.length;i++){const ax=q[i-1][0],az=q[i-1][1],bx=q[i][0]-ax,bz=q[i][1]-az,t=Math.max(0,Math.min(1,((x-ax)*bx+(z-az)*bz)/(bx*bx+bz*bz||1)));if(Math.hypot(ax+bx*t-x,az+bz*t-z)<4)return true;}}return false;}
 function draw(){const g=new THREE.Group();g.name='parking-details';const o=new THREE.Object3D(),unit=new THREE.BoxGeometry(1,1,1);
  const lines=[],bodies=[],cabs=[],motos=[];const COL=['#e8e8e8','#2b2f36','#9aa3ad','#b23a3a','#3a5fb2','#d8d2c4'];
  const pad=campus?null:new THREE.MeshLambertMaterial({color:'#4f5459'});
  spots.forEach(k=>{if(k.p){const a=k.ang||0,ux=Math.cos(a),uz=Math.sin(a),nx=-uz,nz=ux,cx=k.p.reduce((s,q)=>s+q[0],0)/k.p.length,cz=k.p.reduce((s,q)=>s+q[1],0)/k.p.length;
    if(pad&&!k.onMap){const sh=new THREE.Shape(k.p.map(([x,z])=>new THREE.Vector2(x,-z))),m=new THREE.Mesh(new THREE.ShapeGeometry(sh),pad);m.rotation.x=-Math.PI/2;m.position.y=.3;m.receiveShadow=true;g.add(m);}
    const R=Math.max(...k.p.map(q=>Math.hypot(q[0]-cx,q[1]-cz)))+3;let n=0;
    for(let v=-R;v<=R;v+=12)for(let u=-R;u<=R;u+=2.6){const ok=s=>inP(cx+ux*u+nx*(v+s),cz+uz*u+nz*(v+s),k.p);
      const P=s=>[cx+ux*u+nx*(v+s),cz+uz*u+nz*(v+s)];
      for(const side of [-1,1]){const a0=side*.6,a1=side*5.4;if(!ok(a0)||!ok(a1))continue;{const c=P(side*3);if(blocked(c[0],c[1]))continue;}
       if(k.bays){const c=P(side*3);lines.push([c[0],c[1],.1,5,a]);}
       if(!campus&&k.cars&&n<k.cars&&((u*7+v*3+side)|0)%5!==0){const c=[cx+ux*(u+1.3)+nx*(v+side*3),cz+uz*(u+1.3)+nz*(v+side*3)];bodies.push([c[0],c[1],a,COL[n%COL.length]]);n++;}}}}
   if(k.motos){for(let i=0;i<k.motos;i++)motos.push([k.x+i*.95,k.z+((i%2)*.35),.5+i*.04,COL[(i*5)%COL.length]]);}});
  const put=(rows,w,h,d,y,col,per)=>{if(!rows.length)return;const m=new THREE.InstancedMesh(unit,new THREE.MeshLambertMaterial({color:col}),rows.length);const c=new THREE.Color();
   rows.forEach((r,i)=>{per(r,o);o.updateMatrix();m.setMatrixAt(i,o.matrix);if(r[3]&&typeof r[3]==='string'){c.set(r[3]);m.setColorAt(i,c);}});m.castShadow=true;m.receiveShadow=true;g.add(m);};
  put(lines,0,0,0,0,'#f2f2ee',(r,x)=>{x.position.set(r[0],campus?.62:.34,r[1]);x.rotation.set(0,-r[4],0);x.scale.set(.12,.03,r[3]);});
  put(bodies,0,0,0,0,'#ffffff',(r,x)=>{x.position.set(r[0],.85,r[1]);x.rotation.set(0,-r[2],0);x.scale.set(1.8,.9,4.4);});
  put(bodies.map(r=>[r[0],r[1],r[2]]),0,0,0,0,'#33404f',(r,x)=>{x.position.set(r[0],1.55,r[1]);x.rotation.set(0,-r[2],0);x.scale.set(1.6,.65,2.2);});
  put(motos,0,0,0,0,'#ffffff',(r,x)=>{x.position.set(r[0],.62,r[1]);x.rotation.set(0,r[2],0);x.scale.set(.42,.75,1.75);});
  scene.add(g);if(window.__plDirty)window.__plDirty();}
 if(campus){
  const META=Object.fromEntries(spots.filter(k=>k.id).map(k=>[k.id,k]));const q=document.getElementById('q');
  spots.forEach(k=>{const b=ALL.find(x=>x.id===k.id);if(b){b.pk=k;const n=(b.p||[]);if(n.length){k.x=n.reduce((s,v)=>s+v[0],0)/n.length;k.z=n.reduce((s,v)=>s+v[1],0)/n.length;}if(!k.name)k.name=b.name;if(k.p===undefined&&k.bays)k.p=b.p;}});
  const mr0=matchRank;matchRank=function(b,s){if(!s)return mr0(b,s);const r=mr0(b,s),it=intent(s);if(!it)return r;if(r>=0&&r<=1)return r;
   const cs=ck(s);const r2=cs!==s?mr0(b,cs):-1;
   if(!it.rest){if(b.pk&&okFor(b.pk,it))return b.pk.car==='y'&&b.pk.moto==='y'?2:r>=0&&r<4?r:3;return -1;}
   const rr=mr0(b,it.rest);if(rr>=0)return rr;return r2>=0?r2:r;};
  const post=()=>{PK.syncBar&&PK.syncBar();if(!q.value.trim())return;const m=matches();[...document.querySelectorAll('#list li button')].forEach((bt,i)=>{const b=m[i];if(b&&b.pk){bt.querySelector('.t').dataset.pk=badge(b.pk);}});};
  const r0=refresh;refresh=function(){r0();post();};q.addEventListener('input',post);
  const sel=select;select=function(id,fly){const r=sel.apply(this,arguments);if(id==null)return r;const b=ALL.find(x=>x.id===id),ul=document.getElementById('cInfo');if(b&&ul){cardFor(ul,{x:b.cx+(b.dx||0),z:b.cz+(b.dz||0)},b.pk);if(b.pk){photoNote();const src=document.getElementById('cSrc');if(src)src.textContent='ตำแหน่งและขอบเขตอ่านจากภาพดาวเทียม, Street View และข้อมูลเดิมของแผนที่ เป็นค่าประมาณ · รถในแผนที่เป็นตัวอย่าง ไม่ใช่จำนวนจริง';if(b.pk.added)document.querySelectorAll('#card *').forEach(e=>{if(!e.children.length&&e.textContent==='ยืนยันโดยนักศึกษา')e.textContent='ค่าประมาณจากภาพ';});}}return r;};
  PK.open=k=>select(k.id,true);
  filterBar(q,document.querySelector('#side .searchrow'),()=>{refresh();});
  /* the old amenity chip for the pins these entries replaced */
  [...document.querySelectorAll('#ams .chip')].forEach(c=>{if(/^ที่จอดรถ$/.test(c.textContent.trim()))c.remove();});
  draw();refresh();
 }else{
  const q=document.getElementById('q');
  D.P.forEach((p,i)=>{if(p.pk){p.pk.i=i;p.pk.x=p.x;p.pk.z=p.z;}});
  (PK.dorms||[]).forEach(d=>{const r=new RegExp(d.re,'i');D.P.forEach((p,i)=>{if(r.test(p.n)&&!p.pk){p.pk=Object.assign({},d,{i,x:p.x,z:p.z,name:p.n,dorm:true});}});});
  const m0=matches;matches=function(p,qq){if(!qq)return true;if(norm(p.n).includes(qq))return true;const it=intent(qq);if(!it)return m0(p,qq);if(!it.rest){return okFor(p.pk,it);}
   return m0(p,it.rest)||m0(p,ck(qq));};
  const post=()=>{PK.syncBar&&PK.syncBar();if(!q.value.trim())return;[...document.querySelectorAll('#list li button')].forEach((bt,i)=>{const pn=listOrder[i];if(pn&&pn.p.pk){bt.querySelector('.t').dataset.pk=badge(pn.p.pk);}});
   const it=intent(norm(q.value.trim()));if(it&&!it.rest){const key=pn=>{const k=pn.p.pk;return !k?1e6:k.area==='campus'?5e5+Math.hypot(pn.p.x-35,pn.p.z+47):k.warn?4e5:Math.hypot(pn.p.x-35,pn.p.z+47);};const lis=[...list.children],idx=listOrder.map((pn,i)=>i).sort((a,b)=>key(listOrder[a])-key(listOrder[b]));listOrder=idx.map(i=>listOrder[i]);idx.forEach(i=>list.append(lis[i]));markListActive();}};
  const r0=refresh;refresh=function(){r0();post();};q.addEventListener('input',post);
  const sel=select;select=function(i,fly){const r=sel.apply(this,arguments);if(i==null)return r;const p=D.P[i],ul=document.getElementById('cInfo');if(p&&ul){cardFor(ul,{x:p.x,z:p.z},p.pk);if(p.pk)photoNote();
    document.querySelectorAll('#card>.btn').forEach(e=>{if(/ดูหน้าร้านระยะใกล้|ดูโครงสร้างอาคาร/.test(e.textContent))e.hidden=p.c==='park';});
    if(p.c==='park'&&p.pk&&!p.pid){const src=document.getElementById('cSrc');if(src)src.textContent='ตำแหน่งอ่านจากภาพดาวเทียมและ Street View เป็นค่าประมาณ · รถในแผนที่เป็นตัวอย่าง';}}return r;};
  PK.open=k=>select(k.i,true);
  filterBar(q,document.querySelector('#side .searchrow'),()=>refresh());
  draw();refresh();
 }
 window.__parking={spots,intent,okFor};
})();
