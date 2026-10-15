# Entrega a Claude · pasar el sistema funcionable a la interfaz Aura

> **Cómo usar este documento (Daniel):** pégalo completo en el chat donde se creó y funciona el Portal de Aprobación, y adjunta `aura-entrega.zip`. Ese chat es el que conoce el sistema real (los procesos de Claude, Metricool, HyperFrames). Este documento le explica qué hacer, en qué orden y qué no tocar.

---

## 0. Qué te pido, en una frase

Toma el sistema que ya funciona (el **Portal de Aprobación**, `https://claude.ai/artifact/XMD17H3RqwKYhjngNX8Uvg`) y haz que viva con la **interfaz nueva (Aura)**, **sin cambiar ningún proceso real, función, efecto, métrica ni estilo de edición**. Solo cambia la piel y el recorrido de la interfaz. Hazlo en un **artefacto nuevo** (un clon), y deja el Portal actual intacto para poder volver a él en cualquier momento.

## 1. Reglas que no se rompen

1. **No modifiques ni sobrescribas el Portal vivo.** Es el respaldo. Nadie lo actualiza hasta que Daniel lo diga.
2. **No cambies lo que Claude hace del otro lado**: agendar en Metricool, producir videos, exportar con HyperFrames, los pasos (`steps`) de cada pedido, los avisos. Aura escribe los mismos documentos; solo agrega campos opcionales (ver `CONTRATO-DE-DATOS.md`, marcados *(Aura)*).
3. **No toques** `app/js/engine/studio-engine.js` (modelo, reglas, catálogo y renderizador del Estudio: es copia literal del Portal; lo que se ve es lo que se exporta) ni `app/js/engine/pred.js` / `pred-data.js` (fórmula del predictor). Si el Portal vivo cambió esos motores después de la copia, el Portal vivo manda: re-copia el suyo.
4. **El Portal vivo manda sobre Aura** en cualquier diferencia de comportamiento de procesos reales. Aura se reconstruyó desde la especificación y los datos, no copiando el código del Portal. Corrige Aura, no el proceso.
5. **Sin ventas, comisiones ni dinero** en la plataforma. Solo redes sociales.
6. **Sin generar imágenes.** Esto es código.
7. **No apruebes videos reales para probar.** Aprobar escribe `requests/schedule_<cuenta>` y avisa a Claude, que agenda en Metricool. Prueba con datos copiados y mientras ninguna sesión de Claude esté mirando el artefacto nuevo (ver §4.5).
8. Daniel habla en voseo ("Elegí un video y editalo"). El preset `kt` ya lo hace (`App.say`).

## 2. Qué trae el zip y en qué orden leerlo

```
LEEME.md                         índice corto
plataforma/
  ENTREGA-A-CLAUDE.md            este documento
  MASTER-PROMPT.md               la especificación del producto (qué es y qué hace cada pantalla)
  DECISIONES.md                  lo que Daniel pidió cambiar después de probar la v1 y lo que NO hay que recrear
  MASTER-PLAN.md                 cómo se construyó, decisiones técnicas
  CONTRATO-DE-DATOS.md           las 20 colecciones, los documentos de requests y qué espera cada lado
  app/css/*.css                  UI: tokens, base, shell, una hoja por pantalla, Estudio, selector de modelo, celebración
  app/js/core/                   util, config (presets kt y lumen), state (colecciones), adapters/ (claude real, demo, simulador), theme, router, motion (morph líquido)
  app/js/engine/                 studio-engine.js (NO TOCAR), pred*.js (NO TOCAR), dna.js (Laboratorio)
  app/js/domain/                 select.js, actions.js (escrituras y avisos a Claude), library.js, trophies.js
  app/js/views/                  una por pantalla + jarvis.js, ai.js (modelo e intensidad), attach.js (adjuntos), celebrate.js
  app/dev/                       datos de demostración y video de ejemplo
  app/assets/AstonScript.ttf     la fuente Aston Script del Portal (ya va embebida en el build)
  tools/                         build.py, test.cjs (148 pruebas), shoot.cjs (capturas)
  dist/artifact.html             el artefacto ya compilado (CDN de GSAP y Google Fonts), listo para publicar
  capturas/                      pantallas clave de la interfaz actual (escritorio día/noche y teléfono)
respaldo/
  portal-de-aprobacion-<fecha>.html   instantánea del Portal vivo al momento de armar este zip (+ SHA256)
```

Lee en este orden: `MASTER-PROMPT.md` → `DECISIONES.md` → `CONTRATO-DE-DATOS.md` → este documento → el código de la pantalla que vayas a verificar.

## 3. Cómo es Aura por dentro (qué es "solo UI" y qué es lógica)

- **Una sola página sin framework**: módulos de script clásicos bajo `window.App`, que `tools/build.py` une en `dist/artifact.html`. Cada pantalla es un archivo de `app/js/views/` + una hoja de `app/css/`.
- **La interfaz habla con un adaptador**, nunca con `window.claude` directo: `core/adapters/claude.js` (el real), `demo.js` (memoria con datos de ejemplo) y `simulador.js` (simula las 7 capacidades para las pruebas). El código que corre contra el artefacto real es el mismo que corre contra el simulador.
- **La lógica de negocio que Aura reescribió** vive en `app/js/domain/`: qué es "por aprobar", cuántos días de contenido quedan, qué se escribe al aprobar, qué entra en "Enviar cambios", cómo se normalizan las métricas de Metricool, cómo se crean pedidos. **Esa es la parte a contrastar con el Portal vivo.**
- **Presets**: todo lo propio de Daniel (cuentas, formatos, textos, voz) está en `app/js/core/config.js` (`kt`) y hay un segundo preset de prueba (`lumen`). `?preset=` cambia de espacio.
- **Estilo visual**: vidrio sobre una nube mórfica, día/noche, tipografía de sistema (SF/Inter), controles segmentados e interruptores, un solo botón principal por pantalla. El orbe de Jarvis se estira como gota y se vuelve el panel (`core/motion.js`).

## 4. Plan, en este orden

### 4.1 Respaldo (no cambia nada del vivo)

1. Lee el Portal vivo y compara su SHA256 con el de `respaldo/` (si cambió, la instantánea de tu lado es la que vale).
2. Exporta la base completa del Portal (cada una de las 20 colecciones de `CONTRATO-DE-DATOS.md`, con `ArtifactData` `list`) a archivos JSON en tu entorno.
3. Anota la lista **exacta** de capacidades que declara hoy el Portal (el código usa `db`, `user`, `mcp` con `metricool.getAnalyticsDataByMetrics`, `comments`, `assets`, `downloads` y `sample`).

### 4.2 Clon con la interfaz nueva

1. `python3 plataforma/tools/build.py` (sin `--local`) genera `plataforma/dist/artifact.html`. Publícalo como artefacto **nuevo** con título **Aura**.
2. Declara las **mismas capacidades que el Portal** y, además, `sample: {images: true}` (para ver imágenes adjuntas en Jarvis) y `downloads`. `mcp` solo para el servidor `metricool` y la herramienta `getAnalyticsDataByMetrics`.
3. Antes de dar nada por bueno, contéstame estas tres cosas (las necesitas saber tú, yo no las veo desde el repo): **(a)** ¿cómo guarda el Portal los videos y pósters (`videos/<id>.src`: `/_blob/<id>` de `assets`, otra cosa)? **(b)** ¿hay otros documentos o colecciones que el Portal use y no estén en `CONTRATO-DE-DATOS.md`? **(c)** ¿qué hace el Portal que no esté en la lista de §5?

### 4.3 Migrar datos y archivos (la base y los archivos son **por artefacto**)

Un artefacto nuevo nace con la base y el almacén de archivos vacíos. Para que Aura muestre lo real:

1. Copia cada colección del Portal al artefacto nuevo con `ArtifactData` (`list` del viejo, `batch` `set` al nuevo, respetando ids). Verifica con conteos por colección.
2. Los archivos (`/_blob/<id>`) también son por artefacto: cópialos con `Artifact` `publish` + `asset: true` + `from_url` + `asset_ids` (hasta 10 por llamada). Cada copia **trae un id nuevo**: reescribe en la base todas las referencias (`videos.src`/póster, `refs.assetId`, `requests.assets[].id`, `studio_versions.spec.base.asset`/`cutout` y los medios del Estudio).
3. La fuente **Aston Script ya va embebida** en el build; no hay que copiarla.
4. **Si migrar los archivos es impráctico** (muchos videos), usa el plan B, que también es reversible: guarda el HTML y la exportación de la base del paso 4.1 y **actualiza el Portal en su misma URL** con Aura (la base y los archivos no se tocan, porque Aura solo agrega campos opcionales). Volver atrás = republicar el HTML guardado. Díselo a Daniel antes de elegirlo: él pidió un clon.

### 4.4 Paridad, función por función

Recorre la lista de §5 en el Portal vivo y en Aura, lado a lado, con datos reales copiados. Para cada fila: ¿hace lo mismo y escribe lo mismo? Si no, corrige Aura (casi siempre en `app/js/domain/` o en la vista) y deja una línea en `DECISIONES.md`. Corre `tools/test.cjs` después de cada tanda.

### 4.5 Cambiar el lado de producción (solo cuando la paridad esté verificada)

Hasta este paso el artefacto nuevo **no lo mira ninguna sesión de Claude**: lo que se escriba ahí no dispara nada (los avisos quedan guardados, `canSendToClaude` no estará `available`). Eso hace seguras las pruebas.

Cuando Daniel dé el visto bueno: apunta la sesión de producción al artefacto nuevo (que lea `requests/*` y `studio_requests/*` de **esa** base y esté suscrita a sus comentarios) y enséñale los campos nuevos opcionales: `model`/`effort` en cada pedido (**debe respetarlos** al elegir con qué modelo trabaja), `assets[]` en `requests/jarvis_*`, `requests/recreate_*` (Laboratorio) y `studio_requests`, y `refs.dna`/`refs.recipe` y `exp_styles.recipe` (Laboratorio). El resto del contrato no cambia.

### 4.6 Lo que Daniel pidió y falta (en este orden, dentro del clon)

La versión del zip ya tiene hechos: selector de **modelo e intensidad** (Sonnet 5.5 por defecto) en Jarvis, Estudio, Laboratorio, Crear y Ajustes; **adjuntar videos y archivos** en esos chats; **Hoy** con logros y analíticas arriba y una **celebración** al ganar logros nuevos; **Laboratorio** artístico (ADN de referencias y recreación en vivo); morph líquido consistente; orbe flotante; Estudio que no se traba; simulador completo. Además, la otra computadora de Daniel ya resolvió y **no hay que rehacer**:

- **Aprobar dentro de Estudio** (`DECISIONES.md` §2): ya no hay "Aprobar" en el menú. Rutas: `#estudio` (listado: por aprobar / agendados / rechazados), `#estudio/ver/<id>` (vista general: la revisión), `#estudio/editor/<id>` (editor). Un `#aprobar...` viejo entra a `#estudio...`.
- **Selector de cuentas** con menú propio, con el mismo vidrio que el selector de modelo (§6).
- **Predictor** simplificado: solo el círculo del puntaje y "¿Por qué este score?" cerrado, con 1 a 3 categorías; la fórmula no se tocó (§9).
- **Descargas** (Exportar, SRT, JSON): el código ya usa la capacidad `downloads`. Lo que falta es **declararla al publicar** (`downloads: true`) y comprobar de verdad que Exportar y SRT guardan el archivo; sin esa declaración no hacen nada.

Lo que **sigue pendiente**, en este orden y dentro del clon:

1. **Logros**: sin pestaña propia ni niveles/XP para visitar (`DECISIONES.md` §1; Daniel además pidió que **Hoy** muestre logros y analíticas apenas se entra). Hoy muestra analíticas y hitos al entrar, y al cruzar un hito aparece la celebración con el mismo morph (confeti, felicitación y frase motivacional). El código del zip todavía conserva la pantalla Logros en el menú y la celebración con medallas: adáptalo a esto.
2. **Biblioteca**: revisar los bugs que Daniel reportó sin detalle (§7); si no son evidentes en el código, pídele capturas.
3. **Crear conversacional** sobre la nube de Jarvis (§10): reemplaza el formulario de Crear completo; conserva el selector de modelo por pedido (Sonnet 5.5 por defecto).

### 4.7 Volver atrás

- **Plan clon**: el Portal original sigue intacto y funcional. Para volver, apunta la sesión de producción de nuevo a su base. No se perdió nada.
- **Plan B (en la misma URL)**: republica el HTML guardado en 4.1. La base no se tocó.

## 5. Lista de paridad (marca cada una contra el Portal vivo)

| Área | Qué debe hacer igual |
|---|---|
| **Hoy** | Frase del día (días de contenido, "con N aprobados hoy llegas a…"); pendientes de Daniel (`home/todo`, "Hecho" escribe `home/done`); por aprobar; pedidos en curso con pasos; redes 7 días; contenido asegurado por cuenta |
| **Estudio (antes Aprobar)** | `#estudio`: Por aprobar / Agendados / Rechazados; piezas con versiones v1–v4 y puntaje; elegir varias y aprobar/rechazar en lote con **Deshacer**; revisión: notas por segundo, zona segura, estilos por palabra en subtítulos (a todas las versiones), etiquetas de problema, predictor, atajos A/Q/R, siguiente/anterior; de la vista general se pasa al editor con "Abrir en editor" |
| **Aprobar = agendar** | `videos/<id>` pasa a `approved` + `decidedAt`; se reescribe `requests/schedule_<cuenta>` completo (`schedule[]` y `remove[]`); un solo aviso; rechazar un agendado queda "por quitar" |
| **Notas / Enviar cambios** | Bandeja de lo no enviado con Deshacer por elemento; **Enviar cambios** escribe un solo `requests/changes_<ts>`, marca todo enviado y avisa una vez |
| **Crear** | Pedir con Claude y Subir videos; formatos, versiones, música, estilo, fecha; intros y teachers libres (`system/status`); subida con progreso (19 MB máx.) y links; cola de pedidos con pasos y cancelar |
| **Biblioteca** | Estilos, transiciones, textos, fondos, subtítulos, sonidos y referencias; "Usar en un video nuevo" |
| **Laboratorio** | Ronda (Me gusta / Quizás / No + nota + comentario general), referencias (subir/links), estilos en prueba → aprobados pasan a la Biblioteca |
| **Métricas** | `mcp.callTool("metricool","getAnalyticsDataByMetrics",…)`; copia en `metrics/<blogId>` y `evolution/<blogId>`; total/cuenta, 7/30/90 días, mejores reels, ritmo de publicación, mejor hora; "dato guardado hace…" sin conexión |
| **Hitos/logros** | Solo redes; se guarda cuáles ya vio (`home/trophies`) |
| **Estudio** | Abrir el spec de un video; editar texto/fondos/imágenes/transiciones/subtítulos/sonido; deshacer/rehacer; guardado automático en `studio_versions` con `rev`; aviso si Claude cambió la versión mientras editabas; reglas de calidad con arreglo; versiones v1–v4; pedidos a Claude con pasos en vivo; exportar (formatos y calidad), SRT y JSON |
| **Jarvis** | ⌘K; conversación con herramientas (`go_to`, `propose_approval` siempre con confirmación, `mark_todo_done`, `open_studio`, `new_request`, `leave_feedback`, `ask_claude`); voz; modo local sin `sample` |
| **Ajustes** | Tema auto/día/noche, zona segura, subtítulos en todas las versiones, voz, modelo e intensidad, cuentas, conexión, modo demostración, exportar JSON |
| **Efectos** | Nube mórfica de fondo, morph líquido del orbe, transición circular del tema, entrada escalonada de cada pantalla, "reducir movimiento" respetado |

## 6. Lo que NUNCA se probó contra lo real

Todo se verificó contra el **simulador** y la **demostración** (148 pruebas, `tools/test.cjs`), no contra tu base, tu Metricool ni tus sesiones de Claude. Sin comprobar contra lo real: la forma exacta de cada documento que escribe el Portal, el comportamiento de `comments.sendToClaude`, las respuestas reales de Metricool, el rendimiento fluido en un teléfono real (en el sandbox solo hay render por software), los permisos reales de `assets`/`downloads` y que `sample` acepte `model`/`effort`/imágenes en tu cuenta (si no puede usar el modelo pedido, responde el nivel equivalente y Jarvis lo avisa).

## 7. Cómo construir y probar

```bash
python3 plataforma/tools/build.py                        # -> dist/artifact.html (CDN) y dist/index.html
python3 plataforma/tools/build.py --local <vendor>       # sin internet (fuentes y GSAP locales) -> dist/index.local.html
cd plataforma && npm install                             # playwright-core para las pruebas
NODE_PATH=$(npm root -g) node tools/test.cjs             # 148 pruebas (necesita Chromium)
node tools/shoot.cjs --all --out capturas/_tmp           # capturas de todas las pantallas
```
`?demo=1` abre la plataforma con datos de ejemplo; `?preset=lumen` cambia de espacio; `?nocel=1` apaga el aviso automático de logros (para pruebas).

## 8. Al terminar, entrégale a Daniel

1. El enlace del artefacto **nuevo** y confirmación explícita de que el **Portal original quedó intacto**.
2. Conteos antes/después de la migración por colección y de archivos copiados.
3. La lista de §5 con resultado de cada fila (hace lo mismo / difiere y se corrigió / pendiente).
4. Lo que no pudiste comprobar y por qué.
5. Una línea con cómo volver atrás.
