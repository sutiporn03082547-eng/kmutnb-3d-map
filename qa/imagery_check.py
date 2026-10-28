"""Draw map footprints (red) and OpenStreetMap footprints (blue) on Esri World Imagery tiles, one image per building.
For a person to judge position and shape; the imagery is NOT saved in the repository (Esri terms), only shown locally.
usage: python qa/imagery_check.py qa/reports/audit.json qa/osm-campus.json OUT_DIR id [id ...]
Imagery: Esri World Imagery z19 (~0.29 m/px at this latitude), positional accuracy as published by Esri for the scene."""
import io, json, math, sys, urllib.request
from PIL import Image, ImageDraw

audit, osmf, out, *ids = sys.argv[1:]
A = json.load(open(audit, encoding='utf-8'))
O = json.load(open(osmf, encoding='utf-8'))['elements']
g = A['geo']; Z = 19; N = 2 ** Z
nodes = {n['id']: n for n in O if n['type'] == 'node'}
def ll(x, z): return g['lat0'] - z / g['kz'], g['lon0'] + x / g['kx']
def tile_xy(lat, lon): return (lon + 180) / 360 * N, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * N
cache = {}
def tile(x, y):
    if (x, y) not in cache:
        req = urllib.request.Request(f'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{Z}/{y}/{x}', headers={'User-Agent': 'kmutnb-3d-map-audit'})
        cache[(x, y)] = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=30).read())).convert('RGB')
    return cache[(x, y)]
osm_polys = [[(nodes[i]['lat'], nodes[i]['lon']) for i in w['nodes'] if i in nodes] for w in O if w['type'] == 'way' and 'building' in w.get('tags', {})]
rows = {r['id']: r for r in A['rows']}
foot = {r['id']: r for r in A['rows']}
# footprints are not in audit.json; read them from the page dump written by audit.mjs (polygons file)
polys = json.load(open(audit.replace('audit.json', 'polygons.json'), encoding='utf-8'))
for bid in ids:
    P = polys[bid]; lat, lon = ll(sum(p[0] for p in P) / len(P), sum(p[1] for p in P) / len(P))
    cx, cy = tile_xy(lat, lon); x0, y0 = int(cx) - 1, int(cy) - 1
    im = Image.new('RGB', (768, 768))
    for dx in range(3):
        for dy in range(3): im.paste(tile(x0 + dx, y0 + dy), (dx * 256, dy * 256))
    d = ImageDraw.Draw(im)
    px = lambda la, lo: ((tile_xy(la, lo)[0] - x0) * 256, (tile_xy(la, lo)[1] - y0) * 256)
    for op in osm_polys:
        pts = [px(a, b) for a, b in op]
        if any(0 <= p[0] < 768 and 0 <= p[1] < 768 for p in pts): d.line(pts, fill=(60, 160, 255), width=2)
    d.polygon([px(*ll(x, z)) for x, z in P], outline=(255, 40, 40))
    d.text((6, 6), f'{bid}  red=map  blue=OSM  Esri World Imagery z19', fill=(255, 255, 0))
    im.save(f'{out}/imagery-{bid}.png')
    print('wrote', bid)
