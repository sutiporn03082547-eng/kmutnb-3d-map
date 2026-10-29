"""Write the fidelity pass into back.html (run once, from the repo root, after fidelity_match.py):  python qa/back/inject_fidelity.py

Per legacy box (D.B[i]) one letter in FID.k:
  M  matches one reference footprint and is (nearly) that rectangle already: kept as is            -> footprint from dataset
  P  matches one reference footprint that is NOT a rectangle (L shapes, notches; area < 90% of the
     box): walls and roof are now extruded from the real footprint (FID.poly)                     -> footprint from dataset
  S  one of several boxes that together cover one footprint (shophouse row split into units)        -> outline from dataset, units estimated
  F  carries a photo-based shop model: kept exactly as it was (the photo is the evidence)
  G  no footprint under it, or it sits inside a footprint another box already draws: shown as a
     see-through placeholder, no windows/awning, so it does not pass for a surveyed building        -> unverified
FID.r[i]: reference footprint ("m<n>" Microsoft feature n, "o<n>" OSM way n), "" when none.
FID.front[i]: for P shops/dorms, the box is re-fitted to the real front wall so storefront and name board sit on it.
Heights (D.B[i][5] floors) are not changed: no source exists for them, the card says so.
"""
import json, math, collections
from shapely.geometry import Polygon, Point

s = open('back.html', encoding='utf-8', newline='').read()
assert 'const FID=' not in s, 'already injected'
i = s.index('const D='); D = json.loads(s[i + 8:s.index('\n', i)].rstrip().rstrip(';'))
M = json.load(open('qa/back/data/fidelity-match.json', encoding='utf-8'))['boxes']
photo = set(json.load(open('qa/back/data/photo-boxes.json')))

# reference polygons again (same order/ids as fidelity_match.py) for the three boxes that sit inside an undrawn footprint
lat0, lon0 = 13.82156, 100.51408; kx, kz = 111320 * math.cos(math.radians(lat0)), 110574
xz = lambda lon, lat: ((lon - lon0) * kx, -(lat - lat0) * kz)
refs = {}
for e in json.load(open('qa/back/data/osm-back.json', encoding='utf-8'))['elements']:
    if e['type'] == 'way' and 'building' in e.get('tags', {}) and 'geometry' in e and len(e['geometry']) > 3:
        refs[('osm', e['id'])] = Polygon([xz(g['lon'], g['lat']) for g in e['geometry'][:-1]])
for k, f in enumerate(json.load(open('qa/back/data/ms-footprints-back.json'))):
    refs[('ms', k)] = Polygon([xz(*p) for p in f['geometry']['coordinates'][0][:-1]])
claimed = {(m['src'], m['id']) for m in M if m['kind'] in ('match', 'split')}
drawnRefs = list(claimed)

def front_rect(poly, b):
    """box (x,z,w,d,a,sd) whose front face is the footprint wall that faces the same way as the old front"""
    oa, sd = b[4], b[9]; of = (sd * math.sin(oa), -sd * math.cos(oa))
    pts = list(poly.exterior.coords)[:-1]; best = None
    for k in range(len(pts)):
        p, q = pts[k], pts[(k + 1) % len(pts)]; L = math.hypot(q[0] - p[0], q[1] - p[1])
        if L < 2: continue
        n = ((q[1] - p[1]) / L, -(q[0] - p[0]) / L); mid = ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2)
        if poly.contains(Point(mid[0] + n[0] * .2, mid[1] + n[1] * .2)): n = (-n[0], -n[1])
        dot = n[0] * of[0] + n[1] * of[1]
        if dot < 0.7: continue
        reach = max((mid[0] - v[0]) * n[0] + (mid[1] - v[1]) * n[1] for v in pts)  # depth behind this wall
        sc = L * dot
        if best is None or sc > best[0]: best = (sc, p, q, n, mid, reach)
    if not best: return None
    _, p, q, n, mid, d = best; a = math.atan2(q[1] - p[1], q[0] - p[0])
    sdn = 1 if n[0] * math.sin(a) - n[1] * math.cos(a) > 0 else -1
    return [round(mid[0] - n[0] * d / 2, 2), round(mid[1] - n[1] * d / 2, 2), round(math.hypot(q[0] - p[0], q[1] - p[1]), 2), round(d, 2), round(a, 4), sdn]

k = []; r = []; polys = {}; fronts = {}; stat = collections.Counter()
for m in M:
    bi = m['i']; b = D['B'][bi]; ref = ''
    if m['kind'] in ('match', 'split'): ref = ('m' if m['src'] == 'ms' else 'o') + str(m['id'])
    if bi in photo: c = 'F'
    elif m['kind'] == 'match' and m['rectness'] < 0.9:
        c = 'P'; polys[bi] = m['p']
    elif m['kind'] == 'match': c = 'M'
    elif m['kind'] == 'split': c = 'S'
    else:
        c = 'G'; cen = Point(b[0], b[1])
        free = [key for key, p in refs.items() if key not in claimed and abs(p.centroid.x - b[0]) < 60 and abs(p.centroid.y - b[1]) < 60 and p.contains(cen)]
        if free:  # the box sits inside a real footprint that nothing draws yet: use that footprint
            key = free[0]; claimed.add(key); p = refs[key].simplify(0.15)
            c = 'P'; polys[bi] = [[round(x, 2), round(z, 2)] for x, z in list(p.exterior.coords)[:-1]]
            ref = ('m' if key[0] == 'ms' else 'o') + str(key[1])
    if c == 'P' and b[6] != 'hs':
        fr = front_rect(Polygon(polys[bi]), b)
        if fr: fronts[bi] = fr
        else: stat['P without a usable front wall'] += 1
    k.append(c); r.append(ref); stat[c] += 1
print(dict(stat), 'front walls', len(fronts))
FID = {'src': 'qa/back/fidelity_match.py + inject_fidelity.py, 2026-10-29: OSM snapshot 2026-10-28 (ODbL) and Microsoft Global ML Building Footprints 2026-02-03 (ODbL)',
       'k': ''.join(k), 'r': ','.join(r), 'poly': polys, 'front': fronts}
data = json.dumps(FID, ensure_ascii=False, separators=(',', ':'))
nl = '\r\n'
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, (s.count(old), old[:80]); s = s.replace(old, new)

j = s.index('\n', i)
s = s[:j] + nl + ("/* fidelity 2026-10-29: what the evidence supports for each box in D.B (see qa/back/inject_fidelity.py for the letters)." + nl +
                  "   No floor count or roof shape here has a source: they stay estimates and the building card says so. */" + nl +
                  "const FID=" + data + ";") + s[j:]

rep('const G={dm:GB(),sh:GB(),hs:GB(),flat:GB()};', 'const G={dm:GB(),sh:GB(),hs:GB(),flat:GB(),ghost:GB()};' + nl +
    '/* fidelity: walls and roof from a real footprint ring [[x,z],…] (same wall texturing as obox, roof triangulated) */' + nl +
    'function prism(g,ring,y0,y1,color,own,roofG,roofColor,tileW){let A=0;for(let i=0;i<ring.length;i++){const p=ring[i],q=ring[(i+1)%ring.length];A+=p[0]*q[1]-q[0]*p[1];}' + nl +
    '  const R=A<0?ring:ring.slice().reverse();' + nl +
    '  for(let k=0;k<R.length;k++){const a=R[k],b=R[(k+1)%R.length],L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<.01)continue;const bays=Math.max(1,Math.round(L/(tileW||3.6)))/4,fl=(y1-y0)/3.1/4;' + nl +
    '    quad(g,[a[0],y0,a[1]],[b[0],y0,b[1]],[b[0],y1,b[1]],[a[0],y1,a[1]],[[0,0],[bays,0],[bays,fl],[0,fl]],color,own);}' + nl +
    '  if(!roofG)return;const tris=THREE.ShapeUtils.triangulateShape(R.map(p=>new THREE.Vector2(p[0],p[1])),[]);' + nl +
    '  tris.forEach(([a,b,c])=>{const P=[R[a],R[b],R[c]].map(p=>[p[0],y1,p[1]]);const up=(P[1][0]-P[0][0])*(P[2][2]-P[0][2])-(P[1][2]-P[0][2])*(P[2][0]-P[0][0])<0;tri(roofG,P[0],up?P[1]:P[2],up?P[2]:P[1],roofColor,own);});}' + nl +
    'const boxRing=b=>{const ux=Math.cos(b.a),uz=Math.sin(b.a),nx=-uz,nz=ux;return [[1,1],[-1,1],[-1,-1],[1,-1]].map(([s,t])=>[b.x+ux*s*b.w/2+nx*t*b.d/2,b.z+uz*s*b.w/2+nz*t*b.d/2]);};')
rep('const SIGNS=[];', 'const SIGNS=[];' + nl +
    '/* fidelity: P shops/dorms get the box of their real front wall, so storefront, awning and name board sit on the footprint */' + nl +
    'Object.entries(FID.front).forEach(([i,r])=>{const b=BLD[i];[b.x,b.z,b.w,b.d,b.a,b.sd]=r;});')
rep('  b.fx=fx;b.fz=fz;const wc=b.wc||WALLC[b.col];',
    '  b.fx=fx;b.fz=fz;const wc=b.wc||WALLC[b.col];const FK=FID.k[b.i];' + nl +
    '  /* fidelity: no footprint supports this box: see-through placeholder at the shop pin, no windows, awning or roof detail */' + nl +
    '  if(FK==="G"){prism(G.ghost,boxRing(b),0,Math.max(1,b.fl)*3.1,"#c9ced6",b.i,G.ghost,"#c9ced6");if(b.poi>=0)SIGNS.push(b);return;}')
rep('const H=Math.max(1,b.fl)*3.1;obox(G.hs,b.x,b.z,ux,uz,b.w,b.d,0,H,wc,b.i,true,null,3.4);',
    'const H=Math.max(1,b.fl)*3.1;' + nl +
    '    /* fidelity: a house on a non-rectangular footprint: real outline, flat roof (its real roof shape is not known) */' + nl +
    '    if(FK==="P"){prism(G.hs,FID.poly[b.i],0,H,wc,b.i,G.flat,HROOF[b.col%HROOF.length],3.4);return;}' + nl +
    '    obox(G.hs,b.x,b.z,ux,uz,b.w,b.d,0,H,wc,b.i,true,null,3.4);')
rep('obox(kind,b.x,b.z,ux,uz,b.w,b.d,0,H,wcol,b.i,true,ROOFC[b.col%4],b.t==="sh"||b.t==="th"?b.w/2:3.6);',
    'if(FK==="P")prism(kind,FID.poly[b.i],0,H,wcol,b.i,G.flat,ROOFC[b.col%4],b.t==="sh"||b.t==="th"?b.w/2:3.6);' + nl +
    '  else obox(kind,b.x,b.z,ux,uz,b.w,b.d,0,H,wcol,b.i,true,ROOFC[b.col%4],b.t==="sh"||b.t==="th"?b.w/2:3.6);')
# rooftop stair box + blue water tank were put on every dorm without any evidence: removed
a = s.index('/* parapet + roof box for dorms */'); e = s.index('/* ground-floor storefront + awning on the road side */', a)
s = s[:a] + '/* fidelity: the stair box and blue water tank that used to sit on every dorm roof had no evidence: removed */' + nl + '  ' + s[e:]
rep('picks.push(mkMesh(G.flat,flatMat));', 'picks.push(mkMesh(G.flat,flatMat));' + nl +
    'const ghostMat=new THREE.MeshLambertMaterial({vertexColors:true,transparent:true,opacity:.34,depthWrite:false});ghostMat.userData.noMerge=true;' + nl +
    'const ghostMesh=mkMesh(G.ghost,ghostMat);ghostMesh.castShadow=false;ghostMesh.userData.noMerge=true;ghostMesh.name="fidelity-unverified-placeholders";picks.push(ghostMesh);')
rep('const b=BLD[bi];if(!b||b.w<2.2||', 'const b=BLD[bi];if(!b||FID.k[bi]==="G"||b.w<2.2||')
# 3D window frames, coping and gable trims follow the old rectangle: none on placeholders or on real-outline buildings
rep("if(protectedIds.has(b.i))continue;", "if(protectedIds.has(b.i)||FID.k[b.i]==='G'||FID.k[b.i]==='P')continue;")
rep("BLD.filter(b=>b.t==='dm'&&b.poi>=0&&", "BLD.filter(b=>b.t==='dm'&&b.poi>=0&&FID.k[b.i]!=='G'&&")
# generic envelope details: none on placeholders, none on real-outline buildings (they follow the old rectangle); the rooftop box on every
# 3rd building and the wall AC condensers on every 2nd building had no evidence (brief: no roof/AC equipment without proof): removed
rep("if(window.__photoRebuiltBuildings?.has(b.i)||b.t==='hs'||", "if(window.__photoRebuiltBuildings?.has(b.i)||FID.k[b.i]==='G'||FID.k[b.i]==='P'||b.t==='hs'||")
rep("    if(i%3===0){const p=at(b.w*.31,-b.d*.25);box('#8c9695',p[0],H+.42,p[1],1.1,.8,1.5,-b.a);" + nl + "      box('#555f5f',p[0],H+.84,p[1],.8,.04,1.2,-b.a);}" + nl +
    "    // Recessed shop threshold, thin rainwater pipe, condenser units with dark fan grille.",
    "    // fidelity: the rooftop unit (every 3rd building) and wall AC condensers (every 2nd) were removed: no evidence they exist." + nl +
    "    // Recessed shop threshold and thin rainwater pipe (illustrative, not surveyed).")
rep("    if(i%2===0)for(let floor=1;floor<Math.min(b.fl,5);floor++){" + nl + "      const q=at(b.w*.3,b.d/2+.34),y=floor*3.1+1;" + nl +
    "      box('#d2d1c8',q[0],y,q[1],.85,.52,.42,-b.a);" + nl + "      box('#626b6a',q[0]+b.fx*.22,y,q[1]+b.fz*.22,.45,.36,.025,-b.a);" + nl + "    }" + nl, "")
rep('<button class="btn" id="night" type="button">กลางคืน</button>',
    '<button class="btn" id="night" type="button">กลางคืน</button>' + nl +
    '    <button class="btn" id="fidBtn" type="button" aria-pressed="false">ความน่าเชื่อถือข้อมูลอาคาร</button>')
rep('ตึกที่ไม่มีชื่อเป็นแบบจำลอง ตำแหน่งร้านเป็นค่าประมาณ',
    'รูปทรงฐานอาคารจาก OpenStreetMap และ Microsoft Global ML Building Footprints (ODbL) · จำนวนชั้น หลังคา หน้าต่างและกันสาดเป็นค่าประมาณ ไม่มีข้อมูลรังวัด · กล่องโปร่งคือจุดที่ไม่มีข้อมูลรูปทรงอาคาร · ตำแหน่งร้านเป็นค่าประมาณ')
code = open('qa/back/fidelity-ui.js', encoding='utf-8').read().replace('\n', nl)
rep('showExtra(hx.object.userData.xown[hx.faceIndex]);});', 'showExtra(hx.object.userData.xown[hx.faceIndex]);});' + nl + code)
open('back.html', 'w', encoding='utf-8', newline='').write(s)
print('FID bytes', len(data))
