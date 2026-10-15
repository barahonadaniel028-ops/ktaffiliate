"""Arma Aura en un solo archivo.
Uso:
  python3 plataforma/tools/build.py                 -> dist/index.html (autonomo, CDN) y dist/artifact.html (fragmento para artefacto)
  python3 plataforma/tools/build.py --local VENDOR   -> dist/index.html con fuentes y GSAP locales (pruebas sin internet)
  python3 plataforma/tools/build.py --demo           -> ademas dist/preview.html: fragmento de artefacto que arranca siempre en modo demostracion (vista previa privada)
El bloque oscuro de tokens.css (entre @DARK y @END) se repite bajo tres selectores: sistema oscuro, data-theme del anfitrion y data-aura="night".

IMPORTANTE al publicar dist/artifact.html como artefacto de claude.ai (Artifact tool, accion "publish"): las capacidades del visor
(db/assets/comments/downloads/mcp/sample/user) NO se declaran dentro de este HTML -- no existe un <meta> para eso en el contrato de
artefactos (ver skill artifact-capabilities). Se declaran aparte, en el parametro `capabilities` de esa llamada de publicacion. Si se
omite `downloads`, "Exportar" y "Descargar SRT" en el Estudio quedan sin hacer nada aunque el codigo este bien (ver DECISIONES.md #8).
Pasar en cada publicacion/republicacion de este artefacto:
  capabilities: {"db": {}, "assets": {}, "comments": {}, "downloads": True, "mcp": {"servers": [...Metricool...]}, "sample": {}, "user": {}}
Ver MASTER-PROMPT.md §5 para la lista completa (debe coincidir)."""
import base64, re, sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
app = root / "app"
dist = root / "dist"
dist.mkdir(exist_ok=True)
local = None
if "--local" in sys.argv:
    local = Path(sys.argv[sys.argv.index("--local") + 1]).resolve()

CSS = ["tokens", "base", "shell", "v-ai", "v-hoy", "v-aprobar", "v-crear", "v-biblioteca", "v-lab", "v-metricas", "v-cel", "v-notas", "studio"]
JS = ["core/util", "core/config", "core/state", "core/adapters/util", "core/adapters/claude", "core/adapters/demo", "core/theme", "core/router", "core/motion",
      "engine/studio-engine", "engine/dna", "engine/pred-data", "engine/pred",
      "domain/select", "domain/actions", "domain/library", "domain/trophies",
      "views/shell", "views/ai", "views/attach", "views/hoy", "views/jarvis", "views/aprobar-list", "views/aprobar-review", "views/crear", "views/crear-estilo", "views/crear-video", "views/biblioteca",
      "views/laboratorio", "views/metricas", "views/logros", "views/celebrate", "views/notas-ajustes", "views/estudio-core", "views/estudio-panels",
      "dev/fixtures", "dev/demo-video", "boot"]

# video de demostracion embebido: MP4 (Safari y la mayoria) y WebM (navegadores sin H.264). Se elige con canPlayType.
vid, vidw, vjs = app / "dev" / "demo.mp4", app / "dev" / "demo.webm", app / "dev" / "demo-video.js"
parts = ["/* Aura · video de demostracion embebido (8 s, 360x640) */", "(function () { var D = (window.AuraDemo = window.AuraDemo || {});"]
if vid.exists():
    parts.append('D.mp4 = "data:video/mp4;base64,%s";' % base64.b64encode(vid.read_bytes()).decode())
if vidw.exists():
    parts.append('D.webm = "data:video/webm;base64,%s";' % base64.b64encode(vidw.read_bytes()).decode())
parts.append('var v = document.createElement("video"); var mp4 = v.canPlayType && v.canPlayType(\'video/mp4; codecs="avc1.42E01E"\'); D.videoUrl = (mp4 || !D.webm) ? (D.mp4 || D.webm || "") : D.webm; })();')
vjs.write_text("\n".join(parts) + "\n")

# ---- css ----
css_parts = []
for name in CSS:
    t = (app / "css" / f"{name}.css").read_text()
    if name == "tokens":
        m = re.search(r"/\*@DARK\*/(.*?)/\*@END\*/", t, re.S)
        dark = m.group(1).strip("\n")
        t = t.replace(m.group(0), "")
        t += (
            "\n@media (prefers-color-scheme: dark) {\n  :root:not([data-theme=\"light\"]):not([data-aura=\"day\"]) {\n" + dark + "\n  }\n}\n"
            ":root[data-theme=\"dark\"]:not([data-aura=\"day\"]) {\n" + dark + "\n}\n"
            ":root[data-aura=\"night\"] {\n" + dark + "\n}\n"
            "::view-transition-old(root), ::view-transition-new(root) { animation: none; mix-blend-mode: normal; }\n"
            "::view-transition-old(shared), ::view-transition-new(shared) { animation-duration: .5s; animation-timing-function: cubic-bezier(.2,.9,.25,1); }\n"
        )
    css_parts.append(f"/* ===== {name} ===== */\n{t}")
# fuente Aston Script: es la misma del Portal de Aprobacion (alla era un archivo subido al artefacto, /_blob/0b478836...). Va embebida
# para que el Estudio muestre lo mismo que se exporta y el artefacto no dependa del almacen de archivos del Portal viejo.
aston = app / "assets" / "AstonScript.ttf"
if aston.exists():
    css_parts.append("/* ===== AstonScript ===== */\n@font-face{font-family:'AstonScript';src:url(data:font/ttf;base64,%s) format('truetype');font-display:block}" % base64.b64encode(aston.read_bytes()).decode())
css = "\n".join(css_parts)

# ---- js ----
js = "\n".join(f"/* ===== {n} ===== */\n{(app / 'js' / f'{n}.js').read_text() if (app / 'js' / f'{n}.js').exists() else (app / f'{n}.js').read_text()}" for n in JS)
js = js.replace("</script", "<\\/script")

TITLE = "Aura"
FONTS_CDN = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Anton&family=Caveat:wght@500;700&display=swap" rel="stylesheet">'
GSAP_CDN = '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>'

def fragment(fonts, gsap):
    # Sin claude:viewport-fit-sides: ese meta solo corresponde si el shell tiene el margen lateral
    # seguro (env(safe-area-inset-left/right)) y hoy no lo tiene (solo --safe-t/--safe-b). Agregarlo
    # a secas prometeria algo que la hoja de estilos no cumple.
    return (
        f"<title>{TITLE}</title>\n"
        f"{fonts}\n<style>\n{css}\n</style>\n"
        '<div id="aura-root"></div>\n'
        f"{gsap}\n<script>\n{js}\n</script>\n"
    )

# artefacto (fragmento)
(dist / "artifact.html").write_text(fragment(FONTS_CDN, GSAP_CDN))

# vista previa: mismo fragmento, siempre con datos de demostracion y con el fondo de body tomado de un token (contrato de paginas)
if "--demo" in sys.argv:
    prev = fragment(FONTS_CDN, GSAP_CDN)
    prev = prev.replace("<style>\n", "<style>\nbody { background: var(--base); color: var(--ink); }\n", 1)
    prev = prev.replace("<script>\n", "<script>window.AURA_FORCE_DEMO = true;</script>\n<script>\n", 1)
    (dist / "preview.html").write_text(prev)

# pagina autonoma
if local:
    ff = []
    for fam, files in {"Anton": ["anton-latin-400-normal"], "Caveat": ["caveat-latin-500-normal", "caveat-latin-700-normal"], "Inter": ["inter-latin-300-normal", "inter-latin-400-normal", "inter-latin-500-normal", "inter-latin-600-normal", "inter-latin-700-normal"]}.items():
        for f in files:
            wt = re.search(r"-(\d{3})-", f).group(1)
            p = next(local.glob(f"fonts/*/files/{f}.woff2"))
            ff.append("@font-face{font-family:'%s';font-weight:%s;font-display:swap;src:url(data:font/woff2;base64,%s) format('woff2')}" % (fam, wt, base64.b64encode(p.read_bytes()).decode()))
    fonts = "<style>" + "".join(ff) + "</style>"
    gsap = "<script>" + (local / "gsap" / "dist" / "gsap.min.js").read_text().replace("</script", "<\\/script") + "</script>"
else:
    fonts, gsap = FONTS_CDN, GSAP_CDN
page = ("<!doctype html>\n<html lang=\"es\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\"><meta name=\"theme-color\" content=\"#eef2f0\">\n"
        + fragment(fonts, gsap).replace("<div id=\"aura-root\"></div>", "</head><body style=\"margin:0\"><div id=\"aura-root\"></div>") + "</body></html>\n")
(dist / ("index.html" if not local else "index.local.html")).write_text(page)
print("ok", {"artifact": (dist / "artifact.html").stat().st_size, "page": len(page)})
print("\nAl publicar dist/artifact.html como artefacto de claude.ai, pasar explicitamente (parametro `capabilities` del publish, NO va en el HTML):")
print('  capabilities: {"db": {}, "assets": {}, "comments": {}, "downloads": True, "mcp": {"servers": [...]}, "sample": {}, "user": {}}')
print("Si falta \"downloads\": true, Exportar y Descargar SRT en el Estudio no hacen nada (DECISIONES.md #8).")
