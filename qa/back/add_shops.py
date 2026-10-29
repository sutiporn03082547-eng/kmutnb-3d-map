"""Append the shops in qa/back/data/shops-added.json to back.html (D.P), after the existing 613, so no existing index changes.
Each shop sits at its Google Maps coordinate and is tied to the building whose drawn footprint contains it (placeholders
excluded); otherwise it stays a free-standing pin. Opening hours are left empty (the search list does not give a week).
Run from the repo root after inject_fidelity.py:  python qa/back/add_shops.py"""
import json, math, re
from shapely.geometry import Polygon, Point
s = open('back.html', encoding='utf-8', newline='').read()
assert 'const SHOPS_ADDED=' not in s, 'already added'
line = lambda name: s[s.index(name) + len(name):s.index('\n', s.index(name))].rstrip().rstrip(';')
D = json.loads(line('const D=')); F = json.loads(line('const FID='))
A = json.load(open('qa/back/data/shops-added.json', encoding='utf-8'))
lat0, lon0 = 13.82156, 100.51408; kx, kz = 111320 * math.cos(math.radians(lat0)), 110574
def box(b):
    x, z, w, d, a = b[:5]; ux, uz = math.cos(a), math.sin(a); nx, nz = -uz, ux
    return Polygon([(x + sx * ux * w / 2 + sy * nx * d / 2, z + sx * uz * w / 2 + sy * nz * d / 2) for sx, sy in [(-1, -1), (1, -1), (1, 1), (-1, 1)]])
geo = {i: (Polygon(F['poly'][str(i)]) if F['k'][i] == 'P' else box(b)) for i, b in enumerate(D['B']) if F['k'][i] != 'G'}
def kind(info, c):
    for part in info.split(' | '):
        if ' · ' in part:
            k = part.split(' · ')[0].strip()
            if k: return k
    return {'svc': 'บริการ', 'food': 'ร้านอาหาร'}.get(c, '')
out = []; tied = 0
for r in A['shops']:
    x, z = (r['lon'] - lon0) * kx, -(r['lat'] - lat0) * kz; pt = Point(x, z)
    b = next((i for i, g in geo.items() if abs(g.centroid.x - x) < 60 and abs(g.centroid.y - z) < 60 and g.contains(pt)), None)
    p = {'n': r['n'], 'c': r['c'], 'x': round(x, 1), 'z': round(z, 1), 'note': [kind(r['info'], r['c']), 'จาก Google Maps (ค้นเพิ่ม 29 ต.ค. 2026) · ยังไม่มีข้อมูลเวลาเปิด-ปิด'],
         'pid': r['pid'], 'll': [round(r['lat'], 6), round(r['lon'], 6)], 'q': '', 'h': None}
    if b is not None: p['b'] = b; tied += 1
    out.append(p)
nl = '\r\n'; i = s.index('const FID='); j = s.index('\n', i)
block = (nl + '/* shops 2026-10-29: places found on Google Maps within 600 m of the back gate that the map did not have (qa/back/shops_compare.py,' + nl +
         '   curated list qa/back/data/shops-added.json). Appended after the original 613 so existing indexes stay the same. */' + nl +
         'const SHOPS_ADDED=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';' + nl + 'SHOPS_ADDED.forEach(p=>D.P.push(p));')
s = s[:j] + block + s[j:]
open('back.html', 'w', encoding='utf-8', newline='').write(s)
print('added', len(out), 'tied to a building', tied)
