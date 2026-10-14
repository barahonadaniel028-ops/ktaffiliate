# CORTE · landing page

La página de venta del pack de estilos de edición para Claude Code, hecha con el skill `scroll-craft`. Es HTML, CSS y JS estáticos, sin paso de compilación.

## Verla en local

```bash
npx http-server -p 4510 -c-1 .
# abre http://localhost:4510
```

Hay que servirla: si abres `index.html` con doble clic (`file://`), los módulos JS no cargan.

## Qué cambiar antes de lanzar

| Qué | Dónde |
|---|---|
| Link de pago | `js/main.js`, `CONFIG.checkout`. Mientras esté vacío, los botones llevan a la sección de precio. Cuando lo pongas, el botón agrega `?estilo=<id>` con el estilo que eligió el visitante. |
| Precio ($67) | `index.html`: busca `$67` y `>67<` (hero, tabla de costo, barra de 12 meses, hoja de precio). La barra del pack lleva `style="--v:0.0056"` en el mismo archivo, que es precio ÷ 12,000. |
| Nombres, textos y formato de los estilos | `js/animatic.js`, lista `STYLES`, y los botones `.clip` en `index.html` (mismo `data-style`). |
| Videos reales de cada estilo | En `js/animatic.js`, agrega `video: 'assets/samples/<id>.mp4'` al estilo (mp4 H.264, sin audio, de 6 a 8 s). El monitor y la placa final lo reproducen en lugar del animatic. |
| Política de reembolso | `index.html`, última pregunta del FAQ y la letra pequeña del precio. |
| Precios de apps de la comparación | `index.html`, sección `#costo`. Son precios de lista publicados en octubre de 2026: verifícalos antes de lanzar. |

## Publicarla

Es un sitio estático: en Vercel, crea un proyecto desde este repo con **Root Directory** `scrollcraft/builds/corte` y sin comando de build.

`artifact/` es la versión para un Artifact de claude.ai (sin la envoltura `<html>`). Se regenera con `python3 build-artifact.py`.

## Verificación

```bash
npm i                      # instala playwright-core
SCROLLCRAFT_CHROME=<ruta a Chrome> node <skill>/scripts/shoot.mjs --url http://localhost:4510 --out lab/shots
```

Revisa la hoja de contactos (`lab/shots/sheet.png`), la versión móvil (`--width 390 --height 844`) y la de movimiento reducido (`--reduced-motion`).

## Estructura

- `index.html`: las diez escenas, en orden.
- `css/corte.css`: tokens, escenas, transiciones y tratamientos de El Grade.
- `js/main.js`: orquestación del scroll, El Grade, bin, transiciones.
- `js/ribbon.js`: La Cinta (Three.js), los reels del hero y el polvo.
- `js/animatic.js`: los animatics de los 18 estilos y herramientas.
- `scrollcraft.js`, `scrollcraft.css`: el motor de `scroll-craft`, copiado sin cambios.
- `BRIEF.md`: brief, curva emocional, gramática y partitura de la página.
