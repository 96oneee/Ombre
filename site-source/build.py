"""Builds site/index.html from site-source/store.src.html.

Run from the repository root:  python3 site-source/build.py
The source keeps the logo as __WM__ / __MK__ placeholders; the build inlines
site/img/wordmark.svg and site/img/mark.svg as data URIs.
"""
import base64, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
s = (root / "site-source/store.src.html").read_text()
s = s.replace('href="#product?beige"', 'href="#product"').replace('href="#product?blue"', 'href="#product"')
for key, name in [("__WM__", "wordmark"), ("__MK__", "mark")]:
    data = base64.b64encode((root / f"site/img/{name}.svg").read_bytes()).decode()
    s = s.replace(key, "data:image/svg+xml;base64," + data)
head = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
        '<title>Ombre · Square beach shade, delivered in Lebanon</title>\n'
        '<meta name="description" content="Ombre, a square folding beach shade in Beige and Blue. $80, delivered anywhere in Lebanon, cash on delivery.">\n'
        '</head>\n<body>\n')
(root / "site/index.html").write_text(head + s + "\n</body>\n</html>\n")
print("site/index.html built")
