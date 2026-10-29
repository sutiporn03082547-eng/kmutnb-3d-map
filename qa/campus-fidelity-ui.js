(function(){if(typeof select!=='function'||typeof ALL==='undefined'||!window.CAMPUS_FID)return;
 const F=window.CAMPUS_FID,L={V:['ยืนยันได้','VERIFIED','#2e9e5b'],E:['ประมาณการ','ESTIMATED','#e3a21a'],U:['ยังไม่ยืนยัน','UNVERIFIED','#d9534f']};
 const word=k=>k==='-'?null:L[k][0];
 /* building card: overall level and what each part rests on */
 const prior=select;select=function(id,fly){const r=prior.apply(this,arguments);const f=id!=null&&F[id];const ul=document.getElementById('cInfo');
  if(f&&ul&&!ul.querySelector('.fid-note')){const[lv,fp,h,roof,fac,src]=f;const li=document.createElement('li');li.className='fid-note';
   li.textContent='ข้อมูลอาคาร: '+L[lv][0]+' ('+L[lv][1]+') · รูปทรงฐาน '+word(fp)+(h!=='-'?' · ความสูง/จำนวนชั้น '+word(h):'')+(roof!=='-'?' · หลังคา '+word(roof):'')+(fac!=='-'?' · หน้าอาคาร '+word(fac):'')+
    ' · แหล่งข้อมูล: '+(src||'ไม่มีบันทึก');ul.appendChild(li);}return r;};
 /* map overlay: a tinted see-through shell over each entry, coloured by level (does not touch the models themselves) */
 let group=null,on=false;
 function build(){group=new THREE.Group();group.name='fidelity-overlay';const mats={};
  ALL.forEach(b=>{const f=F[b.id];if(!f||!b.p)return;const c=L[f[0]][2];mats[c]=mats[c]||new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.5,depthWrite:false});
   const sh=new THREE.Shape(b.p.map(([x,z])=>new THREE.Vector2(x+(b.dx||0),-(z+(b.dz||0)))));const h=Math.max(.8,(b.top||4)+.4);
   const g=new THREE.ExtrudeGeometry(sh,{depth:h,bevelEnabled:false});g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,mats[c]);m.renderOrder=5;m.userData.noMerge=true;group.add(m);});
  group.visible=false;scene.add(group);}
 const n={V:0,E:0,U:0};Object.values(F).forEach(f=>n[f[0]]++);
 const lg=document.createElement('div');lg.id='fidLegend';lg.className='panel';lg.hidden=true;
 lg.style.cssText='position:fixed;left:12px;bottom:12px;z-index:30;padding:10px 12px;font-size:13px;line-height:1.5;max-width:min(340px,calc(100vw - 24px))';
 lg.innerHTML='<b>ความน่าเชื่อถือข้อมูลอาคารในมหาวิทยาลัย</b>'+['V','E','U'].map(k=>`<div><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${L[k][2]};margin-right:6px;vertical-align:-1px"></span>${L[k][0]} (${L[k][1]}) · ${n[k]} รายการ</div>`).join('')+
  '<div style="opacity:.8;margin-top:4px">ยืนยันได้ = รูปทรงฐานและจำนวนชั้นตรงกับแหล่งอ้างอิง · ประมาณการ = รูปทรงฐานมีหลักฐาน แต่ความสูง/หลังคา/หน้าอาคารบางส่วนประมาณ · ยังไม่ยืนยัน = รูปทรงฐานไม่มีแหล่งอ้างอิง · อาคารหลังมอในแผนที่นี้: รูปทรงฐานจริง ความสูงประมาณ (สีส้ม)</div>';
 document.body.appendChild(lg);
 const btn=document.getElementById('fidBtn');
 function paint(v){on=v;if(on&&!group)build();if(group)group.visible=on;lg.hidden=!on;if(btn)btn.setAttribute('aria-pressed',String(on));
  const ctx=scene.getObjectByName('back-context');if(ctx&&ctx.children[0]){if(on)ctx.children[0].material.color.set(L.E[2]);else if(typeof applyMode==='function')applyMode();else ctx.children[0].material.color.set('#ffffff');}
  if(window.__plDirty)window.__plDirty();}
 if(btn)btn.onclick=()=>paint(!on);
 window.__fidelity={paint,counts:n,data:F};})();