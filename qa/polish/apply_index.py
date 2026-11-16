"""Patch index.html with the polish block (share button, #b=<id> links).
usage: python qa/polish/apply_index.py   (run from the repository root; refuses to run twice)"""
import io

s = io.open('index.html', encoding='utf-8', newline='').read()
blk = io.open('qa/polish/index-polish.html', encoding='utf-8', newline='').read().replace('\r\n', '\n')
assert 'polish-v1' not in s, 'already applied'
nl = '\r\n' if '\r\n' in s else '\n'
i = s.rindex('</body>')
io.open('index.html', 'w', encoding='utf-8', newline='').write(s[:i] + blk.replace('\n', nl) + s[i:])
print('ok', 'CRLF' if nl == '\r\n' else 'LF')
