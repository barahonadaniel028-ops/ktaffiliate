# Continuar Aura desde otra computadora

Todo el trabajo de Aura está en GitHub. Esta guía es para traerlo a otra máquina y seguir donde quedamos.

## Dónde está cada cosa

| Qué | Repositorio | Rama | Carpeta |
|---|---|---|---|
| **Aura** (plataforma de redes sociales, UI) | `barahonadaniel028-ops/ktaffiliate` | `claude/brave-bardeen-9jz94n` | `plataforma/` |
| **CORTE** (landing "scroll-craft", solo prototipo de diseño) | `barahonadaniel028-ops/ktaffiliate` | `claude/blissful-davinci-i4xtnq` | `scrollcraft/builds/corte/` |

`main` y `claude/sweet-thompson-gy6joc` no tienen este trabajo (no se hizo ningún Pull Request ni merge a propósito).

```bash
git clone https://github.com/barahonadaniel028-ops/ktaffiliate.git
cd ktaffiliate
git checkout claude/brave-bardeen-9jz94n      # Aura
# git checkout claude/blissful-davinci-i4xtnq # CORTE
cd plataforma
npm install                                   # solo trae playwright-core, para las pruebas y las capturas
```

## Leer primero (en este orden)

1. `DECISIONES.md` — historial de cada pedido de Daniel, con sus palabras, qué estado tiene y **qué NO recrear** (la pestaña Logros, la pestaña Aprobar, el Crear de dos modos, la bandeja de Notas…). Entradas 1-10 = primera ronda, 11-17 = segunda (17 = Jarvis líquido), 18-20 = tercera (Empieza aquí, Grabar, Teleprompter).
2. `MASTER-PROMPT.md` — la especificación completa y al día (el "qué es Aura").
3. `ENTREGA-A-CLAUDE.md` y `CONTRATO-DE-DATOS.md` — cómo se conecta a datos reales (base del artefacto, Metricool).
4. `PASAR-A-WEB.md` — cómo llevar Aura a un sitio web real fuera de claude.ai (qué ya funciona, qué hay que construir en el backend y en qué orden).
5. `MASTER-PLAN.md` — el plan por fases de la v1 (ojo: menciona cosas que ya se eliminaron; manda `DECISIONES.md`).

## Armar, probar y ver

Aura es JS clásico bajo `window.App` (sin bundler); `tools/build.py` junta `app/js` y `app/css` en un solo HTML.

```bash
python3 tools/build.py                 # dist/index.html (CDN) y dist/artifact.html (fragmento para artefacto)
python3 tools/build.py --demo          # además dist/preview.html: arranca siempre en modo demostración (el que se publica en claude.ai)
python3 tools/build.py --local VENDOR  # dist/index.local.html con GSAP y fuentes locales (sin internet) — lo que usan las pruebas
node tools/test.cjs                    # ~740 pruebas: 200 de la app + las de Empieza aquí (111), Grabar (194) y teleprompter (235), que corren al final; tarda ~12 min; necesita index.local.html
```

`VENDOR` es una carpeta con `gsap/dist/gsap.min.js` y `fonts/<paquete>/files/*.woff2` (paquetes `@fontsource` de anton, caveat, inter y onest):

```bash
mkdir -p /tmp/vendor/fonts && cd /tmp/vendor && npm init -y >/dev/null && npm i gsap @fontsource/anton @fontsource/caveat @fontsource/inter @fontsource/onest
mkdir -p gsap fonts && cp -r node_modules/gsap/* gsap/ && for f in anton caveat inter onest; do cp -r node_modules/@fontsource/$f fonts/$f; done
```

En el sandbox de Claude Code el Chromium está en `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`; en tu máquina, `CHROME=/ruta/a/chrome` o deja que Playwright use el suyo (`npx playwright install chromium`).

Para ver la app: abrí `dist/index.local.html?demo=1&preset=kt` en el navegador (o `dist/preview.html`, que ya arranca en demo). Rutas: `#hoy #crear #biblioteca #laboratorio #metricas #notas #estudio #ajustes`.

## Publicar el artefacto en claude.ai

El que está publicado: https://claude.ai/artifact/RDUjuwAXSMj9Ssbr6GRn6m (versión 5, con los arreglos de teléfono).
Se publica `dist/preview.html` (después de `python3 tools/build.py --demo`) con la herramienta Artifact **pasando `capabilities: {"downloads": true}`** — sin eso Exportar y Descargar SRT no hacen nada (DECISIONES.md #8). No se declararon `db`, `mcp`, `sample` etc. a propósito: eso se decide al pasar al portal real.

## Herramientas para movimiento y capturas (`tools/`)

- `test.cjs` — la suite completa (la app y, al final, `test-empieza.cjs`, `test-grabar.cjs`, `test-teleprompter.cjs`, que también se pueden correr solas). `lib-test.cjs` — ayudas compartidas.
- `shoot.cjs` — capturas de las pantallas.
- `perf-jarvis.cjs` — mide cuánto tarda cada cuadro al abrir/cerrar Jarvis; con variantes (`base,nogoo,nobd,…`) para saber qué es lo caro. El navegador de pruebas no tiene GPU: sirve para ordenar causas, no para saber los fps reales.
- `frames.cjs` + `sheet.py` — graban la animación cuadro por cuadro (sin ffmpeg) y arman una hoja de contactos para revisarla a ojo.

## Qué falta confirmar (solo se puede en el artefacto real, no en el sandbox)

- Que la animación de Jarvis se sienta fluida en tu navegador. Se rehízo entera (DECISIONES #17: un solo reloj, cuerpo de elipses y barras, sin `clip-path` ni `filter`); el navegador de pruebas no tiene GPU, así que solo se midió y se miró cuadro por cuadro (`tools/frames.cjs` + `sheet.py`). Si aún no se siente líquida, mandar un video corto de pantalla: con eso se ajusta `app/js/core/motion.js`.
- Grabar y el teleprompter dentro del artefacto de claude.ai: la cámara y el micrófono pueden estar bloqueados por el iframe (no hay una capacidad para pedirlos). El teleprompter funciona igual sin cámara (solo lee el guion), y en un sitio web propio con HTTPS la cámara se pide normal. Las ideas/guiones con IA usan la capacidad `sample` (hay que declararla al publicar; si no, usa el generador local).
- Que el editor abra bien desde Estudio y que **Exportar** descargue (DECISIONES.md #3 y #8).

## Pendientes / ideas abiertas

- Crear, camino B: la tabla `STYLE_NEEDS` de `app/js/views/crear-video.js` (qué videos pide cada estilo) es una decisión propia: hoy solo "Ensayo visual combo" pide intro + contenido; B-roll y reacción son opcionales para cualquier estilo. Ajustar con Daniel.
- Si se agregan hitos nuevos (`app/js/domain/trophies.js`), recordar que los ya cruzados aparecen una vez como "nuevos" en cuentas con datos viejos.
- En teléfono, la barra "cambios sin enviar" y la cápsula Rechazar/Quizás/Aprobar se apilan sobre el tabbar en la revisión de un video: funciona, pero es lo más apretado de la interfaz móvil.
