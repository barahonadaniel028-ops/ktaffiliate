# Pasar Aura a un sitio web real (fuera de un artefacto de claude.ai)

**Respuesta corta:** sí, y la parte de la interfaz es la fácil. La parte que hay que construir es el *backend* que hoy te presta claude.ai sin que lo veas.

## Qué ya está listo para la web

- `dist/index.html` (`python3 tools/build.py`) es **una página autónoma**: HTML + CSS + JS en un solo archivo (GSAP y fuentes por CDN, o locales con `--local`). Se sube a cualquier hosting estático (Netlify, Vercel, Cloudflare Pages, S3…) y abre. Es exactamente lo que corre dentro del artefacto, sin cambios.
- **Las pantallas nunca tocan `window.claude`.** Lo dice el primer comentario de `app/js/core/state.js`: las vistas leen `App.S` y llaman a `App.data.*` / `App.act.*`. El único lugar que habla con claude.ai es `app/js/core/adapters/` (y `boot.js`, que elige el adaptador). Cambiar de claude.ai a un servidor propio es **escribir un adaptador nuevo**, no reescribir la interfaz.
- Hay tres adaptadores que cumplen la misma interfaz: `claude.js` (artefacto real), `demo.js` (datos de ejemplo en memoria) y `simulador.js` (finge `window.claude` para las pruebas). Un cuarto, `web.js`, sería el de tu servidor. Las 195+ pruebas ya ejercitan el contrato contra el simulador, así que sirven como red de seguridad del adaptador nuevo.
- Todo se guarda como **documentos en colecciones** (`CONTRATO-DE-DATOS.md`: 20 colecciones). Cualquier base de documentos o Postgres con JSONB encaja.
- En una web real, **la cámara y el micrófono (Grabar, teleprompter) funcionan mejor**: con HTTPS el navegador las pide normalmente; dentro de un artefacto el visor puede bloquearlas.

## La interfaz del adaptador (lo que `web.js` tiene que implementar)

```
connect(emit)            // por cada colección: emit(nombre, docs[]) al cargar y en cada cambio (tiempo real: websocket / SSE / polling)
update(col, id, parche)  set(col, id, cuerpo)  add(col, cuerpo) -> id  remove(col, id)
upload(file) -> {id, name, size, url}   assetUrl(id)   deleteAsset(id)
metrics(brand, {from, to, metrics}) -> {payload, at}   hasMetrics()
sample()                 // -> función sample(input, opts) con .json(), o null  (Jarvis, Grabar)
canTell() / tell(texto)  // "avisarle a Claude" que hay trabajo nuevo
userId()   canWrite()
download(nombre, datos)  hasDownloads()
```

## Qué reemplaza a cada capacidad de claude.ai

| Hoy (artefacto) | Para qué lo usa Aura | En un sitio real necesitás |
|---|---|---|
| `db` | Todo el estado: videos, pedidos, notas, estilos, métricas, progreso | Una base de datos + una API con tiempo real. Lo más corto: Supabase o Firebase/Firestore (documentos + suscripciones + reglas). |
| `user` | Quién es la persona y si puede escribir | Login (Supabase Auth, Clerk, Auth0…) y roles (quien solo mira no escribe). |
| `assets` (tope 19-20 MB) | Subir videos, referencias, grabaciones | Almacenamiento de objetos (S3, R2, Supabase Storage) con URLs firmadas y **subida por partes** para videos grandes. |
| `mcp` → Metricool | Métricas de redes | Llamadas a la API de Metricool **desde el servidor** (la clave nunca va al navegador) + caché en `metrics` / `evolution`. |
| `comments.sendToClaude` | "Avisarle a Claude": hoy una sesión de Claude lee `requests/*` y trabaja (agenda en Metricool, produce videos, exporta con HyperFrames, escribe `steps`) | Una **cola de trabajos + un worker** que corra Claude (API o Agent SDK) cuando llega un pedido. Es la pieza más grande: hoy la hace una persona-Claude abriendo una sesión. |
| `sample` | Jarvis, ideas y guiones de Grabar | Un endpoint propio que llame a la API de Claude (con streaming y límite por usuario). **Nunca** la clave en el navegador. |
| `downloads` | Exportar, descargar SRT/MP4/grabaciones | Nada: en una web normal `<a download>` funciona (el adaptador demo ya lo hace). |

## Qué es fácil y qué es trabajo

- **Fácil (días):** hosting estático, dominio, `web.js` contra una base ya existente, login, subida de archivos, descargas.
- **Medio:** tiempo real consistente (el `connect(emit)` espera un snapshot completo por colección), reglas de acceso por rol, el proxy de `sample`, importar los datos reales del Portal vivo con el contrato de `CONTRATO-DE-DATOS.md`.
- **Grande:** el *lado producción* (worker que ejecuta los pedidos: agendar en Metricool, producir y exportar videos). Hoy es Claude trabajando en una sesión; en una web hay que automatizarlo. Esto no es de la interfaz: es el sistema real del Portal. El Portal vivo manda en cualquier diferencia de proceso (`ENTREGA-A-CLAUDE.md`, regla 4).
- **Cuidado:** secretos (Metricool, Claude) solo en el servidor; reglas de la base para que nadie lea datos de otra cuenta; costos de IA por usuario; los pasos del Estudio/HyperFrames necesitan render del lado servidor.

## Orden sugerido

1. Publicar `dist/index.html` en hosting estático en modo demo (ya funciona; sirve para mostrar y probar diseño).
2. Elegir base + auth + storage (una sola plataforma tipo Supabase o Firebase resuelve las tres) y escribir `adapters/web.js` con la interfaz de arriba. Correr `node tools/test.cjs` apuntando al adaptador nuevo.
3. Migrar los datos del Portal vivo (copia, nunca sobrescribirlo) y probar con una cuenta real **sin aprobar videos reales** (aprobar agenda en Metricool).
4. Metricool por el servidor; luego el proxy de `sample`.
5. El worker de pedidos (lo más grande), empezando por un solo tipo (`schedule_<cuenta>`) y sumando el resto.

## Lo que NO cambia al pasar a la web

La interfaz, las animaciones, el contrato de datos, las pruebas, el preset de espacio (`App.config`), el motor del Estudio y el predictor (copias literales del Portal). Si algo se rompe al conectar, casi seguro está en el adaptador o en el backend, no en las pantallas.
