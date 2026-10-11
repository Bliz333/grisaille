# inline every <script src="js/..."> into one self-contained page: dist/index.html (what Cloudflare Pages serves); an optional argument writes a second copy
import re, os, sys
root = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(root, 'index.html'), encoding='utf8').read()
def inline(m):
    src = m.group(1)
    code = open(os.path.join(root, src), encoding='utf8').read()
    assert '</script' not in code, src
    return f'<script>/* {src} */\n{code}\n</script>'
out, n = re.subn(r'<script src="(js/[^"]+)"></script>', inline, html)
assert n >= 13, n
os.makedirs(os.path.join(root, 'dist'), exist_ok=True)
for p in [os.path.join(root, 'dist', 'index.html'), sys.argv[1] if len(sys.argv) > 1 else None]:
    if p: open(p, 'w', encoding='utf8').write(out); print(p, len(out))
