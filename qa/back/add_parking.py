"""Add parking places to back.html as the category "park", appended after every existing entry so no index changes.
Evidence per place is written on its card; nothing is claimed about vehicle types unless a source says so.
Sources (2026-11-01): Google Maps listings (place id), Esri World Imagery 2026-03-05 read by a person, OSM amenity=parking,
and the campus parking entries already in index.html. Run once from the repo root: python qa/back/add_parking.py
Left out: BMA environment depot (government truck yard), two "CPAC" listings (reviews: concrete plant), a land-for-sale listing,
bus depot, OSM way 1433588400 (access=private), OSM way 377892389 (south of campus, owner and access unknown),
OSM way 1411867218 (on the road itself), dorm car parks (for residents, per their own sites)."""
import json, math, re
s = open('back.html', encoding='utf-8', newline='').read(); assert 'const PARKING_ADDED=' not in s, 'already added'
idx = open('index.html', encoding='utf-8').read(); P = json.load(open('qa/reports/polygons.json', encoding='utf-8'))
lat0, lon0 = 13.82156, 100.51408; kx, kz = 111320 * math.cos(math.radians(lat0)), 110574
ll = lambda x, z: [round(lat0 - z / kz, 6), round(lon0 + x / kx, 6)]
xz = lambda la, lo: (round((lo - lon0) * kx, 1), round(-(la - lat0) * kz, 1))
CALL = 'ยังไม่ทราบราคาและเงื่อนไข ควรสอบถามก่อนจอด'
G = [
 ('ลานจอดรถให้เช่าใกล้ มจพ.', 13.82094, 100.51189, 'ChIJ', 'ลานจอดรถให้เช่า ซ.เรียงปรีชา · โทร 096 945 6014', 'รถยนต์: รีวิวใน Google กล่าวถึงช่องจอดรถ · มอเตอร์ไซค์: ยังไม่ยืนยัน', [[420,1140]]*5+[[420,1020],None]),
 ('ที่จอดรถ เลขที่ 199 วงศ์สว่าง', 13.82312, 100.51234, 'ChIJ', 'ลานเล็กข้างสนามฟุตบอล ภาพดาวเทียม 5 มี.ค. 2569 เห็นรถยนต์จอด · ไม่มีรีวิวใน Google', 'รถยนต์: เห็นในภาพดาวเทียม · มอเตอร์ไซค์: ยังไม่ยืนยัน · ยังไม่ทราบว่าเปิดให้บุคคลทั่วไปหรือไม่', None),
 ('ลานจอดรถวัดน้อย มจพ.', 13.82235, 100.51977, 'ChIJ', 'ลานจอดรถในวัด เลขที่ 60 ถ.วงศ์สว่าง · ภาพดาวเทียม 5 มี.ค. 2569 เห็นรถยนต์จอดเต็มลาน', 'รถยนต์: เห็นในภาพดาวเทียม · มอเตอร์ไซค์: ยังไม่ยืนยัน', [[360,1190]]*7),
 ('ที่จอดรถ รายเดือน (143 ถ.พิบูลสงคราม)', 13.82274, 100.50892, 'ChIJ', 'ที่จอดรายเดือนตามรายการใน Google · โทร 02 020 4242', 'ตำแหน่งรอยืนยัน: ภาพดาวเทียม 5 มี.ค. 2569 ตรงหมุดเห็นเป็นบ้าน ไม่เห็นลานจอด · ประเภทรถยังไม่ยืนยัน', None),
]
near = json.load(open(__import__('sys').argv[1], encoding='utf-8'))
def pid(la, lo):
    return next(v['pid'] for v in near if abs(v['lat'] - la) < 1e-4 and abs(v['lon'] - lo) < 1e-4 and ('จอด' in v['n']) and 'สำนักสิ่งแวดล้อม' not in v['n'])
out = []
for n, la, lo, _, a, b, h in G:
    x, z = xz(la, lo); out.append({'n': n, 'c': 'park', 'x': x, 'z': z, 'note': [a, b, CALL], 'pid': pid(la, lo), 'll': [la, lo], 'q': '', 'h': h})
# campus parking already on the campus map: the only places where motorcycle parking is recorded. Who may use them is not recorded.
C = [('lot72', 'รถยนต์'), ('lot52', 'รถยนต์'), ('lotDorm', 'รถยนต์'), ('lotGate', 'รถยนต์'), ('ugGate', 'รถยนต์'), ('lotLib', 'รถยนต์'), ('canalBikes', 'มอเตอร์ไซค์'), ('bikeLib', 'มอเตอร์ไซค์'), ('bikeStub', 'มอเตอร์ไซค์')]
for id, kind in C:
    m = re.search(r'id:"%s".*?name:"([^"]+)".*?info:\[(.*?)\],p:' % id, idx); name = m.group(1); info = re.findall(r'"([^"]+)"', m.group(2))
    p = P[id]; x = round(sum(q[0] for q in p) / len(p), 1); z = round(sum(q[1] for q in p) / len(p), 1); la, lo = ll(x, z)
    out.append({'n': name + ' (ในมหาวิทยาลัย)', 'c': 'park', 'x': x, 'z': z, 'note': ['จอดได้: ' + kind + ' (ข้อมูลจากแผนที่ในมหาวิทยาลัย)'] + info[:1] + ['อยู่ในรั้วมหาวิทยาลัย: ยังไม่ทราบเงื่อนไขสำหรับบุคคลภายนอก'], 'pid': '', 'll': [la, lo], 'q': f'{la},{lo}', 'h': None})
nl = '\r\n'; i = s.index('const SHOPS_ADDED='); j = s.index('SHOPS_ADDED.forEach(p=>D.P.push(p));', i) + len('SHOPS_ADDED.forEach(p=>D.P.push(p));')
s = s[:j] + nl + '/* parking 2026-11-01 (qa/back/add_parking.py): evidence and unconfirmed points are on each card. */' + nl + 'const PARKING_ADDED=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';' + nl + 'PARKING_ADDED.forEach(p=>D.P.push(p));' + s[j:]
a = '  temple:{th:"วัด / โรงเรียน",ic:"🛕",c:"#f2d06b"}'; assert s.count(a) == 1
s = s.replace(a, '  park:{th:"ที่จอดรถ (รถยนต์ / มอเตอร์ไซค์)",ic:"🅿️",c:"#3f8cff"},' + nl + a)
open('back.html', 'w', encoding='utf-8', newline='').write(s); print('added', len(out))
