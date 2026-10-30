"""Time strip of Esri World Imagery Wayback releases (dated archive) around one or more campus buildings, footprint in red, to tell
when a building appears or disappears. Written outside the repo (imagery terms). Esri Wayback config:
https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json
usage (repo root): python qa/imagery_timeline.py WAYBACK_JSON OUT.png id[,id...] [YYYY-MM ...]"""
import io, json, math, sys, urllib.request, bisect
from PIL import Image, ImageDraw
cfg, out, ids, *want = sys.argv[1:]; ids = ids.split(',')
C = json.load(open(cfg)); rel = sorted((v['itemTitle'][-11:-1], v['itemURL']) for v in C.values())
want = want or ['2016-06', '2018-06', '2020-06', '2021-06', '2022-06', '2023-06', '2024-06', '2025-06', '2026-10']
pick = []
for w in want:
    i = bisect.bisect_right([d for d, _ in rel], w + '-31') - 1
    if i >= 0 and rel[i] not in pick: pick.append(rel[i])
P = json.load(open('qa/reports/polygons.json', encoding='utf-8'))
lat0, lon0 = 13.82156, 100.51408; kx, kz = 111320 * math.cos(math.radians(lat0)), 110574; Z = 19; N = 2 ** Z
ll = lambda x, z: (lat0 - z / kz, lon0 + x / kx); txy = lambda la, lo: ((lo + 180) / 360 * N, (1 - math.asinh(math.tan(math.radians(la))) / math.pi) / 2 * N)
pts = [q for i in ids for q in P[i]]; x0, x1 = min(p[0] for p in pts) - 15, max(p[0] for p in pts) + 15; z0, z1 = min(p[1] for p in pts) - 15, max(p[1] for p in pts) + 15
(ax, ay), (bx, by) = txy(*ll(x0, z0)), txy(*ll(x1, z1)); tx0, ty0, tx1, ty1 = int(ax), int(ay), int(bx), int(by)
S = int(__import__("os").environ.get("TL_SIZE", "300")); frames = []
for d, url in pick:
    im = Image.new('RGB', ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256))
    for x in range(tx0, tx1 + 1):
        for y in range(ty0, ty1 + 1):
            try:
                r = urllib.request.Request(url.replace('{level}', str(Z)).replace('{row}', str(y)).replace('{col}', str(x)), headers={'User-Agent': 'kmutnb-3d-map-qa'})
                im.paste(Image.open(io.BytesIO(urllib.request.urlopen(r, timeout=30).read())).convert('RGB'), ((x - tx0) * 256, (y - ty0) * 256))
            except Exception: pass
    dr = ImageDraw.Draw(im); px = lambda x, z: tuple((v - o) * 256 for v, o in zip(txy(*ll(x, z)), (tx0, ty0)))
    for i in ids: dr.polygon([px(*q) for q in P[i]], outline=(255, 40, 40))
    c = im.crop(((ax - tx0) * 256, (ay - ty0) * 256, (bx - tx0) * 256, (by - ty0) * 256)); c = c.resize((S, int(S * c.height / max(1, c.width))))
    frames.append((d, c))
W = S * min(5, len(frames)); rows = (len(frames) + 4) // 5; H = max(f.height for _, f in frames) + 16
sheet = Image.new('RGB', (W, H * rows), 'white'); dr = ImageDraw.Draw(sheet)
for k, (d, f) in enumerate(frames):
    sheet.paste(f, ((k % 5) * S, (k // 5) * H + 16)); dr.text(((k % 5) * S + 4, (k // 5) * H + 2), 'Wayback ' + d, fill=(0, 0, 0))
sheet.save(out); print('frames', [d for d, _ in frames])
