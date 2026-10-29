"""Overlay back-of-campus footprints on Esri World Imagery for a person to judge (imagery is not saved in the repo, Esri terms).
red = box drawn by back.html before the fidelity pass, green = reference footprint used now (OSM / Microsoft), yellow = box kept
with no supporting footprint, cyan = road / path centre lines. usage (repo root): python qa/back/imagery_back.py OUT_DIR x,z [x,z ...]   (local metres)"""
import io, json, math, sys, urllib.request
from PIL import Image, ImageDraw

out, *centres = sys.argv[1:]
lat0, lon0 = 13.82156, 100.51408; kx, kz = 111320 * math.cos(math.radians(lat0)), 110574; Z = 19; N = 2 ** Z
s = open('back.html', encoding='utf-8').read(); i = s.index('const D='); D = json.loads(s[i + 8:s.index('\n', i)].rstrip().rstrip(';'))
M = json.load(open('qa/back/data/fidelity-match.json', encoding='utf-8'))['boxes']
ll = lambda x, z: (lat0 - z / kz, lon0 + x / kx)
txy = lambda la, lo: ((lo + 180) / 360 * N, (1 - math.asinh(math.tan(math.radians(la))) / math.pi) / 2 * N)
cache = {}
def tile(x, y):
    if (x, y) not in cache:
        req = urllib.request.Request(f'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{Z}/{y}/{x}', headers={'User-Agent': 'kmutnb-3d-map-qa'})
        cache[(x, y)] = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=30).read())).convert('RGB')
    return cache[(x, y)]
def box(b):
    x, z, w, d, a = b[:5]; ux, uz = math.cos(a), math.sin(a); nx, nz = -uz, ux
    return [(x + sx * ux * w / 2 + sy * nx * d / 2, z + sx * uz * w / 2 + sy * nz * d / 2) for sx, sy in [(-1, -1), (1, -1), (1, 1), (-1, 1)]]
for c in centres:
    X, Zc = map(float, c.split(',')); cx, cy = txy(*ll(X, Zc)); x0, y0 = int(cx) - 1, int(cy) - 1
    im = Image.new('RGB', (768, 768))
    for dx in range(3):
        for dy in range(3): im.paste(tile(x0 + dx, y0 + dy), (dx * 256, dy * 256))
    d = ImageDraw.Draw(im); px = lambda x, z: tuple((v - o) * 256 for v, o in zip(txy(*ll(x, z)), (x0, y0)))
    for b, m in zip(D['B'], M):
        if abs(b[0] - X) > 130 or abs(b[1] - Zc) > 130: continue
        d.polygon([px(*q) for q in box(b)], outline=(255, 50, 50) if m['kind'] != 'none' else (255, 230, 0))
        if m['kind'] == 'match': d.polygon([px(*q) for q in m['p']], outline=(40, 255, 90))
    for t, n, pts in D['roads']:
        if len(pts) > 1 and any(abs(q[0] - X) < 140 and abs(q[1] - Zc) < 140 for q in pts): d.line([px(*q) for q in pts], fill=(0, 230, 255), width=2)
    d.text((6, 6), f'{c}  red=old box  green=reference footprint  yellow=no reference  cyan=road  Esri World Imagery z19', fill=(255, 255, 0))
    im.save(f'{out}/back-{c.replace(",", "_")}.png'); print('wrote', c)
