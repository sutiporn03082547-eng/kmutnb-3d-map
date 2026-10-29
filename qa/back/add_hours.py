"""Put weekly opening hours, read from each place's Google Maps page, into the shops added on 2026-10-29 (SHOPS_ADDED in back.html).
usage (repo root): python qa/back/add_hours.py HOURS_JSON     (HOURS_JSON: {place_id: {rows: [[day, text, ...], ...]}})
Map format per day, Monday..Sunday: null = closed, "A" = open 24 h, [open, close] in minutes (close > 1440 = after midnight).
A day with two ranges (e.g. 10:00–14:00, 17:00–22:00) keeps first opening and last closing: the map shows one range per day.
Places whose page shows no hours table keep h = null. Raw text is saved in qa/back/data/shops-hours.json."""
import json, re, sys, collections
H = json.load(open(sys.argv[1], encoding='utf-8'))
DAY = {'จันทร์': 0, 'อังคาร': 1, 'พุธ': 2, 'พฤหัสบดี': 3, 'ศุกร์': 4, 'เสาร์': 5, 'อาทิตย์': 6}
def parse(text):
    t = text.replace(' ', ' ').strip()
    if '24 ชั่วโมง' in t: return 'A'
    if not t or t.startswith('ปิด'): return None
    rngs = re.findall(r'(\d{1,2})[:.](\d{2})\s*[–-]\s*(\d{1,2})[:.](\d{2})', t)
    if not rngs: return 'X'
    a = int(rngs[0][0]) * 60 + int(rngs[0][1]); b = int(rngs[-1][2]) * 60 + int(rngs[-1][3])
    if b <= a: b += 1440
    return [a, b]
s = open('back.html', encoding='utf-8', newline='').read()
k = s.index('const SHOPS_ADDED='); e = s.index('\n', k); line = s[k:e].rstrip('\r')
shops = json.loads(line[len('const SHOPS_ADDED='):].rstrip(';'))
stat = collections.Counter(); raw = {}; split = []
for p in shops:
    rows = [r for r in (H.get(p['pid']) or {}).get('rows', []) if r and r[0].startswith('วัน') and r[0][3:] in DAY]
    raw[p['pid']] = {'name': p['n'], 'rows': [r[:2] for r in rows]}
    if len(rows) < 7: stat['no hours on Google'] += 1; continue
    h = [None] * 7; bad = False
    for r in rows:
        v = parse(r[1]); d = DAY[r[0][3:]]
        if v == 'X': bad = True
        h[d] = v
        if v not in (None, 'A', 'X') and len(re.findall(r'\d{1,2}[:.]\d{2}\s*[–-]', r[1])) > 1: split.append(p['n'])
    if bad: stat['unreadable'] += 1; continue
    p['h'] = h; p['note'][1] = 'จาก Google Maps (ค้นเพิ่ม 29 ต.ค. 2026) · เวลาเปิด-ปิดจากหน้าร้านใน Google Maps'; stat['hours added'] += 1
cr = '\r' if s[e - 1] == '\r' else ''
s = s[:k] + 'const SHOPS_ADDED=' + json.dumps(shops, ensure_ascii=False, separators=(',', ':')) + ';' + cr + s[e:]
open('back.html', 'w', encoding='utf-8', newline='').write(s)
json.dump(raw, open('qa/back/data/shops-hours.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(dict(stat), 'days with two ranges merged:', sorted(set(split)))
