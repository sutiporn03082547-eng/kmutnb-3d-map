"""Fidelity pass for the 3,564 legacy back-of-campus boxes (back.html D.B).

Compares every box with the two footprint references already in qa/back/data (OSM buildings first, they are traced by
people; then Microsoft ML footprints) and decides, per box, what the evidence supports:

  match   one reference footprint, claimed by this box alone, IoU >= 0.5  -> geometry is replaced by that footprint
  split   the box is one of several boxes that together cover one footprint (shophouse row split into units)
          -> outline is supported, the split into units is not; box kept
  weak    some overlap, but not enough to say which footprint it is        -> box kept, footprint unverified
  none    no reference footprint under the box                             -> box kept, footprint unverified

Writes qa/back/data/fidelity-match.json (read by inject_fidelity.py) and prints the counts.
Run from the repo root:  python qa/back/fidelity_match.py
"""
import json, math, re, collections
from shapely.geometry import Polygon
from shapely.strtree import STRtree
from shapely import make_valid

lat0, lon0 = 13.82156, 100.51408
kx, kz = 111320 * math.cos(math.radians(lat0)), 110574
xz = lambda lon, lat: ((lon - lon0) * kx, -(lat - lat0) * kz)

s = open('back.html', encoding='utf-8').read()
i = s.index('const D='); D = json.loads(s[i + 8:s.index('\n', i)].rstrip().rstrip(';'))
B = D['B']

def box(b):
    x, z, w, d, a = b[:5]; ux, uz = math.cos(a), math.sin(a); nx, nz = -uz, ux
    return Polygon([(x + sx * ux * w / 2 + sy * nx * d / 2, z + sx * uz * w / 2 + sy * nz * d / 2) for sx, sy in [(-1, -1), (1, -1), (1, 1), (-1, 1)]])

def poly(pts):
    p = Polygon(pts)
    return p if p.is_valid else make_valid(p).buffer(0)

refs = []  # (src, id, Polygon, levels)
O = json.load(open('qa/back/data/osm-back.json', encoding='utf-8'))['elements']
for e in O:
    t = e.get('tags', {})
    if e['type'] == 'way' and 'building' in t and 'geometry' in e and len(e['geometry']) > 3:
        lv = t.get('building:levels')
        refs.append(('osm', e['id'], poly([xz(g['lon'], g['lat']) for g in e['geometry'][:-1]]), lv))
for k, f in enumerate(json.load(open('qa/back/data/ms-footprints-back.json'))):
    refs.append(('ms', k, poly([xz(*p) for p in f['geometry']['coordinates'][0][:-1]]), None))
tree = STRtree([r[2] for r in refs])

boxes = [box(b) for b in B]
best = []
claims = collections.defaultdict(list)  # ref index -> boxes that have most of their area on it
for bi, bp in enumerate(boxes):
    top = (0, -1)
    for ri in tree.query(bp):
        rp = refs[ri][2]
        inter = bp.intersection(rp).area
        if inter <= 0: continue
        if inter / bp.area > 0.5: claims[ri].append(bi)
        iou = inter / (bp.area + rp.area - inter)
        # an OSM footprint wins a near tie with the Microsoft one for the same building (people-traced)
        key = iou + (0.02 if refs[ri][0] == 'osm' else 0)
        if key > top[0]: top = (key, ri)
    best.append((min(1, top[0]), top[1]))

def rect_fit(p):
    """minimum-area rectangle of a footprint as (x, z, w, d, a) in the box convention"""
    r = p.minimum_rotated_rectangle; c = list(r.exterior.coords)[:4]
    e1 = (c[1][0] - c[0][0], c[1][1] - c[0][1]); e2 = (c[2][0] - c[1][0], c[2][1] - c[1][1])
    w, d = math.hypot(*e1), math.hypot(*e2); a = math.atan2(e1[1], e1[0])
    return r.centroid.x, r.centroid.y, w, d, a, p.area / r.area

out = []; stat = collections.Counter()
for bi, b in enumerate(B):
    iou, ri = best[bi]; rec = {'i': bi, 'iou': round(iou, 3)}
    if ri >= 0 and iou >= 0.5 and claims[ri] == [bi]:
        src, rid, rp, lv = refs[ri]
        if rp.geom_type != 'Polygon': rp = max(rp.geoms, key=lambda g: g.area)
        rp = rp.simplify(0.15)
        x, z, w, d, a, rectness = rect_fit(rp)
        # keep the side that faced the road: pick the rectangle axis/sign whose normal is closest to the old front normal
        oa = b[4]; sd = b[9]; ofx, ofz = sd * math.sin(oa), -sd * math.cos(oa)  # front = -sd * (-sin a, cos a)
        cands = []
        for aa, ww, dd in [(a, w, d), (a + math.pi / 2, d, w)]:
            for s2 in (1, -1):
                fx, fz = s2 * math.sin(aa), -s2 * math.cos(aa)
                cands.append((fx * ofx + fz * ofz, aa, ww, dd, s2))
        _, aa, ww, dd, s2 = max(cands)
        moved = math.hypot(x - b[0], z - b[1])
        rec.update(kind='match', src=src, id=rid, rect=[round(x, 2), round(z, 2), round(ww, 2), round(dd, 2), round(aa, 4)], sd=s2,
                   rectness=round(rectness, 3), moved=round(moved, 2), dw=round(ww - b[2], 2), dd=round(dd - b[3], 2),
                   p=[[round(q[0], 2), round(q[1], 2)] for q in list(rp.exterior.coords)[:-1]], lv=lv)
        stat['match ' + src] += 1
    elif ri >= 0 and len(claims[ri]) > 1 and bi in claims[ri]:
        rp = refs[ri][2]
        from shapely.ops import unary_union
        u = unary_union([boxes[j] for j in claims[ri]]); uiou = u.intersection(rp).area / u.union(rp).area
        rec.update(kind='split', src=refs[ri][0], id=refs[ri][1], n=len(claims[ri]), union_iou=round(uiou, 3)); stat['split'] += 1
    elif iou > 0:
        rec.update(kind='weak'); stat['weak'] += 1
    else:
        rec.update(kind='none'); stat['none'] += 1
    rec['poi'] = b[8] >= 0; rec['t'] = b[6]
    out.append(rec)

json.dump({'refs': 'OSM snapshot 2026-10-28T18:20Z (ODbL) + Microsoft Global ML Building Footprints 2026-02-03 (ODbL)', 'boxes': out},
          open('qa/back/data/fidelity-match.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
for k, v in sorted(stat.items()): print(k, v)
m = [r for r in out if r['kind'] == 'match']
print('match: moved >1 m', sum(r['moved'] > 1 for r in m), '| size change >1 m', sum(abs(r['dw']) > 1 or abs(r['dd']) > 1 for r in m),
      '| rectness<0.9', sum(r['rectness'] < 0.9 for r in m), '(of which shops', sum(r['rectness'] < 0.9 and r['poi'] for r in m), ', houses', sum(r['rectness'] < 0.9 and r['t'] == 'hs' for r in m), ')')
sp = [r for r in out if r['kind'] == 'split']
print('split union IoU median', sorted(r['union_iou'] for r in sp)[len(sp) // 2] if sp else '-', '| union IoU<0.5', sum(r['union_iou'] < 0.5 for r in sp))
print('types by kind', {k: dict(collections.Counter(r['t'] for r in out if r['kind'] == k)) for k in ('match', 'split', 'weak', 'none')})
print('with OSM levels', sum(1 for r in m if r.get('lv')))
