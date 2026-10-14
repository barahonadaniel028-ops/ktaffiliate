# Decisiones · Aura

Registro de qué cambió respecto de la primera versión (fases 0-8 del `MASTER-PLAN.md`) y por qué. `MASTER-PROMPT.md` ya refleja estos cambios en el texto de la especificación — este archivo es el historial y el porqué, para que quien implemente no deshaga una decisión tomada a propósito ni recree algo que se eliminó a propósito.

Cómo leer este archivo: cada entrada dice **qué pedimos**, **qué estado tiene** (pedido / en curso / implementado) y, cuando aplica, **qué NO hay que recrear**.

---

## 2026-10-14 — Ronda de feedback sobre la v1 (fases 0-8)

Daniel probó el artefacto publicado al final de la fase 8 (modo demo) y pidió estos cambios:

### 1. Eliminar "Logros" como sección propia — **NO RECREAR una pestaña "Logros"**
La v1 tenía una sección de nav completa con niveles (Bronce→Diamante), XP, 5 medallas y una pantalla para "ver el próximo". Daniel: *"eliminemos lo de logros no hace falta en estos momentos"*. Reemplazo: los hitos de redes (vistas, seguidores, likes, guardados) viven dentro de **Métricas**, sin pantalla propia. Cuando se cruza un número específico, al abrir la app aparece una **celebración puntual** (no una pantalla a visitar): mismo branding y misma transición (morph) que el resto de la plataforma, con confeti, mensaje de felicitación/reconocimiento por el trabajo y una frase motivacional/inspiracional. Se guarda qué hitos ya se celebraron para no repetir. Ver `MASTER-PROMPT.md` §1 y §3 (dentro de "Métricas"). **Estado: pedido, no implementado todavía.**

Si en el futuro alguien lee el plan original (`MASTER-PLAN.md` fase 4, que todavía menciona "Logros" como entrega de esa fase) y lo toma como pendiente de construir: no lo es. Esta decisión lo reemplaza.

### 2. Fusionar "Aprobar" dentro de "Estudio" — **NO RECREAR "Aprobar" como pestaña de nav propia**
La v1 tenía "Aprobar" y "Estudio" como dos secciones de nav separadas. Daniel: *"haz que lo de aprobar viva dentro de la pestaña 'estudio', ahi veo todos los videos ya creados, y al hacer click puedo entrar y ver un poco general y ya aparece ahi un boton sobre abrir en editor, esa es la forma en la que puedo legar a editor, en ese flujo."* Nuevo flujo, todo dentro de "Estudio":
1. **Listado** — todos los videos creados (lo que antes era "Por aprobar · Agendados · Rechazados").
2. **Vista general** — al entrar a uno: la pantalla de revisión que ya existía (predictor, Jarvis opina, subtítulos, aprobar/rechazar/agendar).
3. **Editor completo** — solo se llega con el botón "Abrir en editor" desde la vista general. El editor nunca es la pantalla de entrada a Estudio.
Ver `MASTER-PROMPT.md` §3 ("Estudio — listado y revisión") y §6. **Estado: pedido, no implementado todavía.**

### 3. El editor queda trabado al abrirlo desde Aprobar — bug real, no solo de la fase 8
Al probar el artefacto publicado (claude.ai, no el sandbox de la sesión que lo construyó), abrir el editor desde la revisión se traba. La sesión que publicó la fase 8 había anotado que el Estudio fallaba *en su propio sandbox* por GSAP/cdnjs bloqueado ahí, y asumió que en claude.ai funcionaría. Esto se reporta directamente en el artefacto real, así que **esa asunción puede ser incorrecta, o hay un bug distinto específico al camino Aprobar → Estudio**. Investigar de cero, no asumir que es el mismo problema de red ya anotado. **Estado: en investigación.**

### 4. Jarvis: el morph no es fluido, no se siente como la nube líquida, y las transiciones son inconsistentes
Daniel, primero: *"hay un bug al abrir el jarvis o esa nube morphica, no es fluido"*; después, viendo una primera corrección: *"es meramente circular pero al inicio habiamos quedado que era algo como una nube morphica que se mueve, como un liquido, ese tipo de movimiento, y parece que esta flotando"*. Dos problemas distintos:
- **Rendimiento real**: `clip-path` animado sobre un panel con `backdrop-filter` activo (recalcula el blur del fondo en cada cuadro de la animación) y el filtro SVG `goo` corriendo sobre el viewport completo en vez de sobre el área real del vuelo.
- **Lenguaje visual**: el reveal (`bloom`/`wilt`) es un círculo geométrico que crece — no lee como la misma nube mórfica/líquida del fondo (`App.aura`). Tiene que sentirse como la MISMA sustancia, no como una forma geométrica plana ni algo que flota suelto.
- **Consistencia**: abrir Jarvis, cerrarlo, navegar pidiéndoselo ("llevame a..."), mostrarle algo y abrir el chat deben usar exactamente el mismo movimiento. Hoy navegar desde Jarvis dispara el morph Y el fundido propio de cambio de pantalla al mismo tiempo (dos sistemas sin coordinar), y usa un cierre distinto al de abrir/cerrar normal.
Pedido explícito: *"que sea siempre smooth con el mismo movimiento y transicion, supr smooth"*. **Estado: en curso.**

### 5. Jarvis: presencia flotante persistente en todas las vistas
Daniel: *"me gustaria que ese jarvis flotante siga aunque sea pequeño, en todas las ventanas"*. Hoy el orbe solo vive como botón dentro de la barra superior/tabbar. Pedido: una presencia mínima (chica) del orbe, siempre visible/accesible, en cualquier pantalla — no solo integrada a la barra de navegación. **Estado: pedido, no implementado todavía.**

### 6. El selector de cuenta/marca no respeta el branding
El `<select>` nativo del selector de cuenta (barra superior) muestra el estilo del sistema operativo al abrirse (ver captura del reporte), rompiendo el lenguaje visual del resto de la app. Reemplazar por un menú propio con los mismos tokens/vidrio que el resto de la interfaz. **Estado: pedido, no implementado todavía.**

### 7. Varios bugs en Biblioteca
Reportados sin detalle específico ("varios bugs"). Hay que investigar el código y el comportamiento para encontrar los más evidentes; si no son evidentes desde el código, hay que pedirle a Daniel detalle o capturas antes de inventar una causa. **Estado: en investigación.**

### 8. Descargas no funcionan en el artefacto publicado
"Exportar" y "Descargar SRT" no hacen nada en `dist/artifact.html` tal como se publicó en la fase 8: a esa vista le falta declarar la capacidad `downloads` del visor de artefactos (no es un bug del código de la app). **Estado: en curso.**

---

## Cómo agregar una entrada nueva

Una entrada por ronda de feedback, fecha arriba. Para cada pedido: la cita textual de Daniel cuando la haya, qué reemplaza (si elimina o reestructura algo de una versión anterior, decirlo explícito y marcar **NO RECREAR** lo que corresponda), y el estado. No editar ni borrar entradas viejas — si una decisión se revierte más adelante, se agrega una entrada nueva que lo diga, no se reescribe la vieja.
