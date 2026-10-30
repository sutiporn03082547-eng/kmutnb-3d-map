"""Building QA checklist for every campus building in index.html, with two separate scores.
Inputs (all in the repo): qa/reports/buildings.csv (audit.mjs: OSM comparison, floors, model extent), qa/reports/campus-ms-check.json
(Microsoft footprints vs outline), qa/reports/imagery-review.json (a person's reading of imagery, dated), qa/reports/fidelity-page.json
(floating/sunk measured in the page), window.CAMPUS_FID in index.html (evidence levels), qa/rebuild/*.js (what was rebuilt).
usage (repo root): python qa/building_checklist.py  -> qa/reports/building-checklist.csv and the table in qa/reports/building-checklist.md

Checklist (Y = yes, N = no, ? = cannot tell from the evidence held):
 1 footprint agrees with a reference (OSM IoU >= 0.8, or recorded coordinate evidence)
 2 parts / massing agree with imagery (review ok or fixed)            3 height: floor count has a source (OSM levels / photo)
 4 floor count confirmed by OSM                                       5 roof agrees with imagery (no roof issue in the review)
 6 extensions / wings modelled where imagery shows them              7 links between parts modelled (63 only has one)
 8 model checked against a photo (photo reference on the entry)      9 position on map agrees (outline matches OSM/Microsoft, no offset found)
10 parts still estimated (listed)
Data completeness score (how much evidence exists, 0-100): footprint source 25, floor source 25, imagery reviewed 20, photo 20, position check 10.
Model accuracy score (how well the model matches that evidence, 0-100): footprint agreement 30, parts vs imagery 30, roof vs imagery 20,
not floating/sunk 10, model stays near its outline 10. Neither score rewards looks. A building rebuilt from imagery gets 22/30 for parts
and 15/20 for roof (dimensions read off imagery, roof rise estimated). 'ok' means no disagreement was found, not that it is surveyed."""
import csv, json, re, glob
rows = {r['id']: r for r in csv.DictReader(open('qa/reports/buildings.csv', encoding='utf-8-sig'))}
ms = json.load(open('qa/reports/campus-ms-check.json'))
rev = json.load(open('qa/reports/imagery-review.json', encoding='utf-8'))['review']
page = json.load(open('qa/reports/fidelity-page.json', encoding='utf-8'))
sunk = {r[0] for r in page['campus']['sunk']} | {r[0] for r in page['campus']['floating']}
s = open('index.html', encoding='utf-8').read(); FID = json.loads(re.search(r'window\.CAMPUS_FID=(\{.*?\});', s).group(1))
rebuilt = set()
for f in glob.glob('qa/rebuild/b*.js'):
    t = open(f, encoding='utf-8').read(); rebuilt |= set(re.findall(r"R\.(?:rebuild|addRoof)\('([^']+)'", t))
ROOF_WORDS = ('roof',)
out = []
for id, r in rows.items():
    if r['flat'] == 'true': continue
    f = r['sourceFlags']; iou = float(r['osmIoU'] or 0); st, note = rev.get(id, ['not reviewed', ''])
    c1 = 'Y' if iou >= 0.8 or 'coordinateEvidence' in f else ('N' if st == 'issue' and ('position' in note or 'outline' in note) else '?')
    c2 = 'Y' if st in ('ok', 'fixed') else ('N' if st == 'issue' else '?')
    c3 = 'Y' if r['osmLevels'] or 'photo' in f else 'N'
    c4 = 'Y' if r['osmLevels'] and r['osmLevels'] == r['lv'] else ('N' if r['osmLevels'] else '?')
    roof_issue = st == 'issue' and 'roof' in note
    c5 = 'N' if roof_issue else ('Y' if st in ('ok', 'fixed') else '?')
    c6 = 'Y' if st in ('ok', 'fixed') else ('?' if st == 'uncertain' else 'N')
    c7 = 'Y' if id == '63' else '-'
    c8 = 'Y' if 'photo' in f else 'N'
    pos_issue = st == 'issue' and ('north-east of the outline' in note or 'trees inside' in note)
    msc = ms.get(id, {}).get('cover')
    c9 = 'N' if pos_issue else ('Y' if iou >= 0.8 or (msc and msc >= 0.6) else '?')
    est = []
    if c3 != 'Y' or c4 != 'Y': est.append('floor count')
    if id in rebuilt or st != 'ok': est.append('roof shape / rise' if id in rebuilt else 'parts and roof')
    if c8 == 'N': est.append('facade')
    data = (25 if (iou >= 0.8 or 'coordinateEvidence' in f) else 12 if (msc or 'est(' in f) else 0) + (25 if r['osmLevels'] else 15 if 'photo' in f else 0) \
         + (20 if id in rev else 0) + (20 if 'photo' in f else 0) + (10 if (msc is not None or iou) else 0)
    fx = st == 'fixed'  # rebuilt from imagery: parts and roof rise read off imagery to ~1-2 m, so less than full credit
    acc = round(30 * min(1, max(iou, msc or 0) / 0.9)) + ({'Y': 30, '?': 15, 'N': 0}[c2] if not fx else 22) + ({'Y': 20, '?': 10, 'N': 0}[c5] if not fx else 15) \
        + (0 if id in sunk else 10) + (10 if float(r['modelOverhang'] or 0) < 5 else 0)
    if pos_issue: acc = min(acc, 40)
    out.append([id, r['lv'], FID.get(id, ['?'])[0], c1, c2, c3, c4, c5, c6, c7, c8, c9, '; '.join(est), data, acc, st, 'rebuilt' if id in rebuilt else '', note])
out.sort(key=lambda x: (x[14], x[13]))
H = ['id', 'floors', 'level', '1 footprint', '2 parts', '3 floor src', '4 floors OSM', '5 roof', '6 wings', '7 links', '8 photo', '9 position', '10 still estimated', 'data score', 'model score', 'imagery review', 'changed now', 'note']
with open('qa/reports/building-checklist.csv', 'w', newline='', encoding='utf-8-sig') as fh: w = csv.writer(fh); w.writerow(H); w.writerows(out)
md = ['| ' + ' | '.join(H[:17]) + ' |', '|' + '---|' * 17] + ['| ' + ' | '.join(str(v) for v in o[:17]) + ' |' for o in out]
open('qa/reports/building-checklist.md', 'w', encoding='utf-8').write('\n'.join(md) + '\n')
print(len(out), 'buildings; lowest model scores:', [(o[0], o[14]) for o in out[:10]])
