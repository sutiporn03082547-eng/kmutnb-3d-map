"""Patch back.html with the polish block (card order, quick chips, share link, loading screen, link-preview tags).
usage: python qa/polish/apply_back.py   (run from the repository root; refuses to run twice)"""
import io

s = io.open('back.html', encoding='utf-8', newline='').read()
blk = io.open('qa/polish/back-polish.html', encoding='utf-8', newline='').read().replace('\r\n', '\n')
assert 'polish-v1' not in s, 'already applied'
nl = '\r\n' if '\r\n' in s else '\n'

# 1) polish block goes last, after every other script
i = s.rindex('</body>')
s = s[:i] + blk.replace('\n', nl) + s[i:]

# 2) head: valid viewport-fit value, tags for link previews
old = '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cut">'
assert s.count(old) == 1
s = s.replace(old, nl.join([
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
    '<meta name="description" content="แผนที่ 3D ย่านหลัง มจพ. ซอยวงศ์สว่าง 11: ร้านอาหาร คาเฟ่ หอพัก ร้านสะดวกซื้อ ที่จอดรถ พร้อมเวลาเปิด-ปิด">',
    '<meta name="theme-color" content="#111720">',
    '<meta property="og:type" content="website">',
    '<meta property="og:title" content="หลัง มจพ. 3D">',
    '<meta property="og:description" content="หาร้านอาหาร คาเฟ่ หอพัก และที่จอดรถหลัง มจพ. ดูว่าร้านไหนเปิดอยู่ตอนนี้">',
    '<meta property="og:image" content="og.png">',
    '<meta name="twitter:card" content="summary_large_image">']))

# 3) loading screen: on from the first paint, off when the loading note goes away (first frame drawn)
old = '<canvas id="c" tabindex="0"'
assert s.count(old) == 1
s = s.replace(old, '<script>/* polish: loading screen until the first frame */document.body.classList.add("pl-loading");'
              'setTimeout(()=>document.body.classList.remove("pl-loading"),90000);</script>' + nl + old)
old = 'if(note){note.remove();note=null;}'
print('loading-note hooks:', s.count(old))
assert s.count(old) >= 1
s = s.replace(old, old + 'document.body.classList.remove("pl-loading");')
io.open('back.html', 'w', encoding='utf-8', newline='').write(s)
print('ok', 'CRLF' if nl == '\r\n' else 'LF')
