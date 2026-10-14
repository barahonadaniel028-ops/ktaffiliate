# Builds the claude.ai Artifact version of the page: same files, but the
# document shell is supplied by the host, so the page starts at <title>.
import re, pathlib
src = pathlib.Path('index.html').read_text()
head = re.search(r'<head>(.*?)</head>', src, re.S).group(1)
body = re.search(r'<body>(.*?)</body>', src, re.S).group(1)
head = re.sub(r'<meta charset="utf-8">\s*', '', head)
head = re.sub(r'<meta name="viewport"[^>]*>\s*', '', head)
title = re.search(r'<title>.*?</title>', head).group(0)
head = head.replace(title, '')
boot = """<script>document.documentElement.lang = 'es'; document.documentElement.dataset.trat = 'limpio';</script>"""
out = '<title>CORTE Pack de edición</title>\n' + boot + '\n' + head.strip() + '\n' + body.strip() + '\n'
pathlib.Path('artifact').mkdir(exist_ok=True)
pathlib.Path('artifact/index.html').write_text(out)
print(len(out))
