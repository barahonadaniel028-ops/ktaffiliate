"""Junta en una sola imagen (hoja de contactos) los cuadros que graba tools/frames.cjs entre dos tiempos.
Uso: python3 tools/sheet.py <carpeta> <salida.png> <desde_ms> <hasta_ms> [columnas]   (requiere Pillow)"""
import sys, glob, re
from PIL import Image, ImageDraw
d, out, a, b = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]); cols = int(sys.argv[5]) if len(sys.argv) > 5 else 5
sel = [(int(re.search(r"_(\d+)\.jpg", f).group(1)), f) for f in sorted(glob.glob(d + "/f*.jpg"))]
sel = [x for x in sel if a <= x[0] <= b]
if not sel: sys.exit("sin cuadros en ese rango")
w, h = Image.open(sel[0][1]).size; rows = (len(sel) + cols - 1) // cols
sheet = Image.new("RGB", (cols * w, rows * h), "white")
for i, (t, f) in enumerate(sel):
    im = Image.open(f).convert("RGB"); dr = ImageDraw.Draw(im); dr.rectangle([0, 0, 60, 16], fill="black"); dr.text((3, 2), f"{t}ms", fill="white")
    sheet.paste(im, ((i % cols) * w, (i // cols) * h))
sheet.save(out); print(len(sel), "cuadros ->", out, sheet.size)
