#!/usr/bin/env python3
"""Builds the claude.ai Artifact version of the page as ONE self-contained file.

Why one file: an artifact is a private page opened inside a sandboxed iframe.
Phones (Safari, the Claude app) are strict about what such an iframe may fetch,
so a page that loads its CSS, JS and fonts as separate files can arrive without
styles, scripts or fonts. Here everything is inline: the stylesheets, the fonts
(as data URIs), the poster image, the scrollcraft engine, and the page code
bundled with three.js into one script. Nothing else is requested.

Usage: python3 build-artifact.py [source_dir] [out_file]
"""
import base64, mimetypes, pathlib, re, subprocess, sys

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
out = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else root / 'artifact' / 'index.html')
esbuild = pathlib.Path(__file__).resolve().parent / 'node_modules' / '.bin' / 'esbuild'

def data_uri(path):
    mime = mimetypes.guess_type(str(path))[0] or 'application/octet-stream'
    if path.suffix == '.woff2': mime = 'font/woff2'
    return 'data:%s;base64,%s' % (mime, base64.b64encode(path.read_bytes()).decode())

def inline_css(href):
    p = root / href
    css = p.read_text()
    def font(m):
        f = (p.parent / m.group(1)).resolve()
        return 'url("%s")' % data_uri(f)
    return re.sub(r'url\("([^"]+\.(?:woff2|woff|webp|png))"\)', font, css)

def bundle(entry):
    r = subprocess.run([str(esbuild), str(root / entry), '--bundle', '--format=iife', '--minify',
                        '--target=es2019', '--legal-comments=none', '--log-level=warning'],
                       capture_output=True, text=True, cwd=str(root))
    if r.returncode != 0:
        sys.stderr.write(r.stderr); sys.exit('esbuild failed')
    if r.stderr.strip(): sys.stderr.write(r.stderr)
    return r.stdout

def script(code):
    return '<script>' + code.replace('</script', '<\\/script') + '</script>'

src = (root / 'index.html').read_text()
head = re.search(r'<head>(.*?)</head>', src, re.S).group(1)
body = re.search(r'<body>(.*?)</body>', src, re.S).group(1)

title_tag = re.search(r'<title>.*?</title>', head).group(0)
head = head.replace(title_tag, '')
# The artifact keeps one stable name; the longer page title lives in the site.
title = '<title>CORTE Pack de edición</title>'
head = re.sub(r'<meta charset="utf-8">\s*', '', head)
head = re.sub(r'<meta name="viewport"[^>]*>\s*', '', head)
head = re.sub(r'<meta property="og:image"[^>]*>\s*', '', head)
head = re.sub(r'<link rel="preload"[^>]*>\s*', '', head)
head = re.sub(r'<script type="importmap">.*?</script>\s*', '', head, flags=re.S)

# stylesheets, in the order the page links them
hrefs = re.findall(r'<link rel="stylesheet" href="([^"]+)">', head)
css = '\n'.join(inline_css(h) for h in hrefs)
head = re.sub(r'<link rel="stylesheet" href="[^"]+">\s*', '', head)

# external scripts become inline: classic files as they are, the module as a bundle
def ext_script(m):
    attrs, srcpath = m.group(1), m.group(2)
    if 'type="module"' in attrs:
        return script(bundle(srcpath))
    return script((root / srcpath).read_text())
pattern = r'<script((?:\s+[^>]*?)?)\s+src="([^"]+)"[^>]*></script>'
head = re.sub(pattern, ext_script, head)
body = re.sub(pattern, ext_script, body)

# images referenced by the markup
def img(m):
    p = root / m.group(1)
    return 'src="%s"' % data_uri(p) if p.exists() else m.group(0)
body = re.sub(r'src="(assets/img/[^"]+)"', img, body)

doc = '\n'.join([
    title,
    '<meta name="claude:viewport-fit-sides" content="cover">',
    head.strip(),
    '<style>' + css + '</style>',
    body.strip(),
]) + '\n'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(doc)
print('wrote %s  %.0f KB' % (out, len(doc.encode()) / 1024))
