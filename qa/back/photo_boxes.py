"""Boxes of back.html that carry a photo-based shop model (found from the POI indexes and name patterns the photo passes use).
They keep their geometry in the fidelity pass. Run on the ORIGINAL back.html (before inject_fidelity.py), from the repo root:
python qa/back/photo_boxes.py  -> qa/back/data/photo-boxes.json"""
import json, re
s = open('back.html', encoding='utf-8').read(); i = s.index('const D='); D = json.loads(s[i + 8:s.index('\n', i)].rstrip().rstrip(';'))
idx = set(int(x) for x in re.findall(r'D\.P\[(\d+)\]', s))
for g in re.findall(r'for\(const (?:pi|\[pi,kind\]) of \[([^\]]*\]?[^\]]*)\]', s):
    idx |= set(int(x) for x in re.findall(r'(?<![\w.])(\d+)(?=[,\]])', g))
idx |= set(int(m) for m in re.findall(r"\[\[(\d+),'", s))
pats = re.findall(r'match:/(.+?)/i?,', s) + re.findall(r're:/(.+?)/i?,', s) + re.findall(r'D\.P\.filter\(p=>/(.+?)/i?\.test\(p\.n\)\)', s)
rx = []
for n in pats:
    try: rx.append(re.compile(n, re.I))
    except re.error: pass
idx |= {k for k, p in enumerate(D['P']) if any(r.search(p['n']) for r in rx)}
boxes = sorted({D['P'][k]['b'] for k in idx if k < len(D['P']) and D['P'][k].get('b') is not None})
json.dump(boxes, open('qa/back/data/photo-boxes.json', 'w')); print('photo POIs', len(idx), 'boxes', len(boxes))
