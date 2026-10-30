/* notes from the newest imagery (Esri World Imagery, captured 2026-03-05), shown on the building card as "รอยืนยัน" (not verified).
   Source and comparison with earlier captures: qa/reports/imagery-review.json, qa/imagery_timeline.py. */
(function(){if(typeof select!=='function')return;
 const N={
  '66':'ภาพดาวเทียมล่าสุด (5 มี.ค. 2569) ไม่เห็นหลังคาเมทัลชีทเดิมที่มีในภาพ 19 ม.ค. 2568 เห็นเพียงแนวผนัง อาจรื้อหรือปรับปรุงอยู่ โมเดลยังแสดงหลังคาเดิม รอยืนยันหน้างาน',
  '67':'ภาพดาวเทียมล่าสุด (5 มี.ค. 2569) ไม่เห็นหลังคาเมทัลชีทเดิมที่มีในภาพ 19 ม.ค. 2568 เห็นเพียงแนวผนัง อาจรื้อหรือปรับปรุงอยู่ โมเดลยังแสดงหลังคาเดิม รอยืนยันหน้างาน',
  '68':'ภาพดาวเทียมล่าสุด (5 มี.ค. 2569) ไม่เห็นหลังคาเมทัลชีทเดิมที่มีในภาพ 19 ม.ค. 2568 เห็นเพียงแนวผนัง อาจรื้อหรือปรับปรุงอยู่ โมเดลยังแสดงหลังคาเดิม รอยืนยันหน้างาน',
  '71':'หลังคาในภาพดาวเทียมทุกช่วงอยู่ทางตะวันออกเฉียงเหนือของกรอบอาคารราว 4–10 ม. (ส่วนหนึ่งเกิดจากมุมถ่าย) ตำแหน่งรอยืนยัน'};
 const prior=select;select=function(id,fly){const r=prior.apply(this,arguments);const t=id!=null&&N[id];const ul=document.getElementById('cInfo');
  if(t&&ul&&!ul.querySelector('.imagery-note')){const li=document.createElement('li');li.className='imagery-note';li.textContent='ภาพล่าสุด · '+t;ul.appendChild(li);}return r;};})();
