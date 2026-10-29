"""Compare Google Maps search results near the back gate with the shops/dorms already on back.html (D.P).
usage (repo root): python qa/back/shops_compare.py RESULT_DIR [RESULT_DIR ...]  -> qa/back/data/shops-missing.json + counts
A result is "already on the map" when its Google place id is in D.P, or a D.P entry within 80 m has a matching name.
Only places outside the campus boundary and within RADIUS m of the back gate (x 35, z -47) are considered."""
import json, re, math, sys, glob, collections
RADIUS = 600
s = open('back.html', encoding='utf-8').read(); D = json.loads(re.search(r'const D=(\{.*?\});\r?\n', s).group(1))
B = json.loads(re.search(r'const BOUNDARY=(\[\[.*?\]\]);', open('index.html', encoding='utf-8').read()).group(1))
lat0, lon0 = 13.82156, 100.51408; kx, kz = 111320 * math.cos(math.radians(lat0)), 110574
xz = lambda lat, lon: ((lon - lon0) * kx, -(lat - lat0) * kz)
def inp(x, z, p=B):
    c = False; j = len(p) - 1
    for i in range(len(p)):
        xi, zi = p[i]; xj, zj = p[j]
        if (zi > z) != (zj > z) and x < (xj - xi) * (z - zi) / (zj - zi) + xi: c = not c
        j = i
    return c
norm = lambda t: re.sub(r'[^0-9a-zก-ฮะ-ูเ-์]', '', t.lower())
pids = {p['pid'] for p in D['P'] if p.get('pid')}
known = [(norm(p['n']), p['x'], p['z'], p['n']) for p in D['P']]
def same_name(a, b):
    if not a or not b: return False
    if a in b or b in a: return min(len(a), len(b)) >= 3
    k = 5; return len(a) >= k and len(b) >= k and a[:k] == b[:k]
seen = {}; stat = collections.Counter()
for d in sys.argv[1:]:
    for f in glob.glob(d + '/*.json'):
        R = json.load(open(f, encoding='utf-8'))
        for n, lat, lon, pid, info in R['rows']:
            if lat is None: continue
            key = pid or f'{n}|{lat:.5f}'
            if key in seen: seen[key]['q'].add(R['q']); continue
            x, z = xz(lat, lon); r = {'n': n, 'lat': lat, 'lon': lon, 'pid': pid, 'info': info, 'x': round(x, 1), 'z': round(z, 1), 'q': {R['q']}}
            if inp(x, z): r['why'] = 'campus'
            elif math.hypot(x - 35, z + 47) > RADIUS: r['why'] = 'far'
            elif pid and pid in pids: r['why'] = 'pid'
            elif any(same_name(norm(n), kn) and math.hypot(kx_ - x, kz_ - z) < 80 for kn, kx_, kz_, _ in known): r['why'] = 'name'
            else: r['why'] = 'missing'
            seen[key] = r
for r in seen.values(): stat[r['why']] += 1
miss = sorted((r for r in seen.values() if r['why'] == 'missing'), key=lambda r: math.hypot(r['x'] - 35, r['z'] + 47))
for r in miss: r['q'] = sorted(r['q'])
json.dump(miss, open('qa/back/data/shops-missing.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(dict(stat), 'missing', len(miss))
