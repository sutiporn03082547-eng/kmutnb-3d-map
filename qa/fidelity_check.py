"""Repeatable fidelity checks for the back-of-campus model (back.html) against its reference footprints, plus a summary of the
campus checks. Every number is computed from the page data and the reference files; nothing is typed in.

  1 footprint vs reference (IoU)      2 position (centroid offset, m)      3 size / proportion (area ratio)
  4 spacing: overlapping buildings    5 roads and paths running through buildings
  6 overlapping models (= 4, incl. added footprints)    7 floating / sunk (from qa/reports/fidelity-page.json, measured in the page)
  8 incomplete data (per attribute)   9 source and confidence per building (back-fidelity.csv)   10 issue list (fidelity-issues.csv)

usage (repo root, after `node qa/fidelity-page.mjs ...`):  python qa/fidelity_check.py
writes qa/reports/back-fidelity.csv, qa/reports/fidelity-issues.csv, qa/reports/fidelity-summary.json, qa/reports/FIDELITY-CHECKS.md
"""
import json, math, re, csv, collections, os
from shapely.geometry import Polygon, LineString
from shapely.strtree import STRtree
from shapely.ops import unary_union
from shapely import make_valid

s = open('back.html', encoding='utf-8').read()
D = json.loads(re.search(r'const D=(\{.*?\});\r?\n', s).group(1)); F = json.loads(re.search(r'const FID=(\{.*?\});\r?\n', s).group(1))
EX = json.loads(re.search(r'const EXTRA=(\{.*?\});\r?\n', s).group(1))
lat0, lon0 = 13.82156, 100.51408; kx, kz = 111320 * math.cos(math.radians(lat0)), 110574
xz = lambda lon, lat: ((lon - lon0) * kx, -(lat - lat0) * kz)
def valid(p): return p if p.is_valid else make_valid(p).buffer(0)
refs = {}
for e in json.load(open('qa/back/data/osm-back.json', encoding='utf-8'))['elements']:
    if e['type'] == 'way' and 'building' in e.get('tags', {}) and 'geometry' in e and len(e['geometry']) > 3:
        refs['o' + str(e['id'])] = valid(Polygon([xz(g['lon'], g['lat']) for g in e['geometry'][:-1]]))
for k, f in enumerate(json.load(open('qa/back/data/ms-footprints-back.json'))):
    refs['m' + str(k)] = valid(Polygon([xz(*p) for p in f['geometry']['coordinates'][0][:-1]]))
def box(b):
    x, z, w, d, a = b[:5]; ux, uz = math.cos(a), math.sin(a); nx, nz = -uz, ux
    return Polygon([(x + sx * ux * w / 2 + sy * nx * d / 2, z + sx * uz * w / 2 + sy * nz * d / 2) for sx, sy in [(-1, -1), (1, -1), (1, 1), (-1, 1)]])
R = F['r'].split(',')
# rendered footprints: P from the real outline, the rest from their box; G placeholders are listed but not treated as buildings
rendered = {}
for i, b in enumerate(D['B']):
    k = F['k'][i]
    rendered['B%d' % i] = valid(Polygon(F['poly'][str(i)])) if k == 'P' else box(b)
for j, b in enumerate(EX['blds']): rendered['X%d' % j] = valid(Polygon(b[5]))
for j, o in enumerate(D['osmd']): rendered['O%d' % j] = valid(Polygon(o[2][:-1]))
issues = []; rows = []
# 1-3: per box against its reference
ious, offs, ratios = [], [], []
splitref = collections.defaultdict(list)
for i, b in enumerate(D['B']):
    k = F['k'][i]; ref = R[i]; rp = refs.get(ref); geo = rendered['B%d' % i]
    iou = off = ratio = ''
    if k == 'S' and rp is not None: splitref[ref].append(i)
    elif rp is not None and k in 'MPF':
        inter = geo.intersection(rp).area; iou = round(inter / geo.union(rp).area, 3)
        off = round(geo.centroid.distance(rp.centroid), 2); ratio = round(geo.area / rp.area, 3)
        ious.append(iou); offs.append(off); ratios.append(ratio)
        if iou < 0.5: issues.append(['footprint-differs', 'B%d' % i, f'IoU {iou} with {ref}'])
        if off > 2: issues.append(['position-offset', 'B%d' % i, f'centroid {off} m from {ref}'])
        if not 0.8 <= ratio <= 1.25: issues.append(['size-differs', 'B%d' % i, f'area ratio {ratio} vs {ref}'])
    lvl = 'UNVERIFIED' if k == 'G' else 'ESTIMATED'
    fp = {'M': 'reference rectangle', 'P': 'reference outline', 'S': 'reference outline, unit split estimated', 'F': 'photo model' + (' + reference' if ref else ''), 'G': 'none'}[k]
    rows.append(['B%d' % i, k, lvl, ref, fp, iou, off, ratio, b[5], 'none (estimate)', 'gable (estimate)' if b[6] == 'hs' and k != 'P' else 'flat (estimate)',
                 'photo' if k == 'F' else 'illustrative', b[8] >= 0, round(b[0], 1), round(b[1], 1)])
    if k == 'G': issues.append(['no-footprint', 'B%d' % i, 'shown as see-through placeholder at the shop pin' if b[8] >= 0 else 'shown as see-through placeholder'])
split_iou = []
for ref, ids in splitref.items():
    u = unary_union([rendered['B%d' % i] for i in ids]); rp = refs[ref]; v = round(u.intersection(rp).area / u.union(rp).area, 3); split_iou.append(v)
    if v < 0.5: issues.append(['split-outline-differs', ','.join('B%d' % i for i in ids[:6]), f'units together IoU {v} with {ref}'])
for j, b in enumerate(EX['blds']):
    rows.append(['X%d' % j, 'X', 'VERIFIED' if b[2] else 'ESTIMATED', ('o' if b[0] == 'osm' else 'm') + str(b[1]), 'reference outline', 1.0, 0, 1.0,
                 b[2] or '', 'OSM building:levels' if b[2] else 'none (2-storey placeholder)', 'flat (estimate)', 'none', False, '', ''])
# 4/6: overlaps between rendered buildings (placeholders excluded)
keys = [k for k in rendered if not (k[0] == 'B' and F['k'][int(k[1:])] == 'G')]
geoms = [rendered[k] for k in keys]; tree = STRtree(geoms); overlaps = []
for a, ga in enumerate(geoms):
    for bidx in tree.query(ga):
        if bidx <= a: continue
        ar = ga.intersection(geoms[bidx]).area
        if ar > 1.0:
            small = min(ga.area, geoms[bidx].area); overlaps.append((keys[a], keys[bidx], round(ar, 1), round(ar / small, 2)))
for a, b2, ar, fr in overlaps: issues.append(['buildings-overlap', f'{a}x{b2}', f'{ar} m2 ({int(fr*100)}% of the smaller)'])
# 5: roads / paths through buildings (centre line more than 3 m inside a footprint)
RW = {'py': 14, 'rl': 6, 'se': 4, 'tk': 3.5, 'ph': 2, 'fy': 2}
crossings = []
for ri, (t, n, pts) in enumerate(D['roads'] + [[r[0], r[1], r[2]] for r in EX['roads']]):
    if len(pts) < 2: continue
    ln = LineString(pts)
    for bidx in tree.query(ln):
        inside = ln.intersection(geoms[bidx]).length
        if inside > 3: crossings.append((ri, t, n, keys[bidx], round(inside, 1)))
for ri, t, n, k, L in crossings: issues.append(['road-through-building', k, f'road #{ri} ({t}{" " + n if n else ""}) runs {L} m inside'])
# 7: floating / sunk, measured in the page
page = json.load(open('qa/reports/fidelity-page.json', encoding='utf-8')) if os.path.exists('qa/reports/fidelity-page.json') else None
if page:
    for r in page['back']['floating']: issues.append(['floating', r[0], f'lowest point {r[1]} m'])
    for r in page['back']['sunk']: issues.append(['sunk', r[0], f'lowest point {r[1]} m'])
    for r in page['campus']['floating']: issues.append(['floating', 'campus ' + r[0], f'lowest point {r[1]} m'])
    for r in page['campus']['sunk']: issues.append(['sunk', 'campus ' + r[0], f'lowest point {r[1]} m'])
os.makedirs('qa/reports', exist_ok=True)
with open('qa/reports/back-fidelity.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f); w.writerow(['id', 'kind', 'level', 'reference', 'footprint_source', 'iou', 'centroid_offset_m', 'area_ratio', 'floors_drawn', 'height_source', 'roof', 'facade', 'has_shop', 'x', 'z']); w.writerows(rows)
with open('qa/reports/fidelity-issues.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f); w.writerow(['code', 'id', 'detail']); w.writerows(issues)
q = lambda v, p: sorted(v)[min(len(v) - 1, int(len(v) * p))] if v else None
summ = {'boxes': len(D['B']), 'kinds': dict(collections.Counter(F['k'])), 'added_footprints': len(EX['blds']),
        'levels': dict(collections.Counter(r[2] for r in rows)),
        'iou': {'n': len(ious), 'min': min(ious), 'median': q(ious, .5), 'p05': q(ious, .05)}, 'offset_m': {'median': q(offs, .5), 'p95': q(offs, .95), 'max': max(offs)},
        'area_ratio': {'p05': q(ratios, .05), 'median': q(ratios, .5), 'p95': q(ratios, .95)}, 'split_groups': len(split_iou), 'split_union_iou_median': q(split_iou, .5),
        'overlaps': len(overlaps), 'overlaps_over_10pct': sum(1 for o in overlaps if o[3] > .1), 'road_crossings': len(crossings),
        'issues': dict(collections.Counter(i[0] for i in issues)), 'page': page and {k: page[k] for k in ('errors',)} }
json.dump(summ, open('qa/reports/fidelity-summary.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
md = ['# Fidelity checks (generated by qa/fidelity_check.py)', '', '| check | result |', '|---|---|',
      f"| 1 footprint vs reference | {summ['iou']['n']} buildings with one reference: IoU min {summ['iou']['min']}, 5th pct {summ['iou']['p05']}, median {summ['iou']['median']} |",
      f"| 2 position | centroid offset median {summ['offset_m']['median']} m, 95th pct {summ['offset_m']['p95']} m, max {summ['offset_m']['max']} m (vs reference footprint, not vs a survey) |",
      f"| 3 size | area ratio 5th–95th pct {summ['area_ratio']['p05']}–{summ['area_ratio']['p95']}; {summ['split_groups']} shophouse rows split into units: union IoU median {summ['split_union_iou_median']} |",
      f"| 4/6 overlaps | {summ['overlaps']} pairs overlap > 1 m² ({summ['overlaps_over_10pct']} by more than 10% of the smaller) |",
      f"| 5 roads through buildings | {summ['road_crossings']} road/path pieces run > 3 m inside a building |",
      f"| 7 floating / sunk | back: {len(page['back']['floating']) if page else '?'} / {len(page['back']['sunk']) if page else '?'}; campus: {len(page['campus']['floating']) if page else '?'} / {len(page['campus']['sunk']) if page else '?'} |",
      f"| 8 incomplete data | heights: no source for any legacy box; {summ['levels']} |",
      '| 9 sources | qa/reports/back-fidelity.csv (one row per building) |', f"| 10 issues | qa/reports/fidelity-issues.csv: {summ['issues']} |"]
open('qa/reports/FIDELITY-CHECKS.md', 'w', encoding='utf-8').write('\n'.join(md) + '\n')
print(json.dumps(summ, ensure_ascii=False, indent=1))
