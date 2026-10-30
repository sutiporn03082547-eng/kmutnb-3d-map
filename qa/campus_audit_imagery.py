"""Side-by-side sheets for the building audit: Esri World Imagery (z19, footprint in red, same frame and scale as the model's top
view) | model top view | model oblique view, several buildings per sheet. For a person to judge; written OUTSIDE the repo
(imagery terms). usage (repo root): python qa/campus_audit_imagery.py VIEWS_DIR OUT_DIR [per_sheet=4]"""
import io, json, math, sys, urllib.request, os
from PIL import Image, ImageDraw
views, out, per = sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 4
os.makedirs(out, exist_ok=True)
F = json.load(open(views + '/frames.json')); P = json.load(open('qa/reports/polygons.json', encoding='utf-8'))
lat0, lon0 = 13.82156, 100.51408; kx, kz = 111320 * math.cos(math.radians(lat0)), 110574; Z = 19; N = 2 ** Z
ll = lambda x, z: (lat0 - z / kz, lon0 + x / kx); txy = lambda la, lo: ((lo + 180) / 360 * N, (1 - math.asinh(math.tan(math.radians(la))) / math.pi) / 2 * N)
cache = {}
def tile(x, y):
    if (x, y) not in cache:
        r = urllib.request.Request(f'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{Z}/{y}/{x}', headers={'User-Agent': 'kmutnb-3d-map-qa'})
        cache[(x, y)] = Image.open(io.BytesIO(urllib.request.urlopen(r, timeout=30).read())).convert('RGB')
    return cache[(x, y)]
def imagery(id, f, size=420):
    (tx0, ty0), (tx1, ty1) = txy(*ll(f['cx'] - f['half'], f['cz'] - f['half'])), txy(*ll(f['cx'] + f['half'], f['cz'] + f['half']))
    ax, ay, bx, by = int(tx0), int(ty0), int(tx1) + 1, int(ty1) + 1
    im = Image.new('RGB', ((bx - ax + 1) * 256, (by - ay + 1) * 256))
    for x in range(ax, bx + 1):
        for y in range(ay, by + 1): im.paste(tile(x, y), ((x - ax) * 256, (y - ay) * 256))
    d = ImageDraw.Draw(im); px = lambda x, z: tuple((v - o) * 256 for v, o in zip(txy(*ll(x, z)), (ax, ay)))
    if id in P: d.polygon([px(*q) for q in P[id]], outline=(255, 40, 40))
    c = im.crop(((tx0 - ax) * 256, (ty0 - ay) * 256, (tx1 - ax) * 256, (ty1 - ay) * 256)).resize((size, size))
    return c
ids = list(F); sheets = 0
for k in range(0, len(ids), per):
    chunk = ids[k:k + per]; W = 420 * 3 + 20; sheet = Image.new('RGB', (W, 440 * len(chunk)), 'white'); d = ImageDraw.Draw(sheet)
    for i, id in enumerate(chunk):
        f = F[id]; y = i * 440
        sheet.paste(imagery(id, f), (0, y + 18))
        sheet.paste(Image.open(f'{views}/{id}-top.png').convert('RGB').resize((420, 420)), (430, y + 18))
        sheet.paste(Image.open(f'{views}/{id}-obl.png').convert('RGB').resize((420, 420)), (860, y + 18))
        d.text((6, y + 3), f'{id}  floors {f["lv"]}  top {f["top"]} m   | imagery (red = footprint) | model top | model oblique from SW', fill=(0, 0, 0))
    sheet.save(f'{out}/sheet-{sheets:02d}.png'); sheets += 1
print('sheets', sheets)
