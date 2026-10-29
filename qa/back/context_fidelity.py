"""Bring back-context.json (the light back-of-campus layer drawn by index.html) in line with the fidelity pass in back.html:
P boxes are drawn from their real footprint (same floor count as back.html, still an estimate), G boxes (no footprint data)
are left out because this layer cannot show them as placeholders. Run from the repo root after inject_fidelity.py."""
import json, re
s = open('back.html', encoding='utf-8').read()
D = json.loads(re.search(r'const D=(\{.*?\});\r?\n', s).group(1)); F = json.loads(re.search(r'const FID=(\{.*?\});\r?\n', s).group(1))
idx = open('index.html', encoding='utf-8').read(); BOUND = json.loads(re.search(r'const BOUNDARY=(\[\[.*?\]\]);', idx).group(1))
def inp(x, z, p=BOUND):
    c = False; j = len(p) - 1
    for i in range(len(p)):
        xi, zi = p[i]; xj, zj = p[j]
        if (zi > z) != (zj > z) and x < (xj - xi) * (z - zi) / (zj - zi) + xi: c = not c
        j = i
    return c
C = json.load(open('back-context.json', encoding='utf-8'))
r1 = lambda v: round(v, 1)
kept = [i for i, b in enumerate(D['B']) if not inp(b[0], b[1])]
assert len(kept) == len(C['boxes']), (len(kept), len(C['boxes']))
boxes, polys, n = [], [], {'P': 0, 'G': 0}
for i, row in zip(kept, C['boxes']):
    k = F['k'][i]
    if k == 'G': n['G'] += 1; continue
    if k == 'P': n['P'] += 1; polys.append([D['B'][i][5], [[r1(x), r1(z)] for x, z in F['poly'][str(i)]]]); continue
    boxes.append(row)
C['boxes'] = boxes; C['polys'] = C['polys'] + polys
C['about'] += (' Fidelity pass 2026-10-29: boxes whose real footprint is not a rectangle are drawn from that footprint (in polys, floor count'
               ' still an estimate); boxes with no footprint data behind them are left out.')
json.dump(C, open('back-context.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(n, 'boxes', len(boxes), 'polys', len(C['polys']))
