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

### 9. Panel del predictor de viralidad: demasiado largo y con jerga técnica — **NO tocar la fórmula, solo la piel**
Viendo la revisión de un video real, Daniel: *"la lista de su retroalimentacion es demasiado larga y con terminos raros, nombres de archivos, v1 'objeto' 'ritual' no tienen sentido, quizas para mi si, pero para otros no tiene sentido para nada."* `js/engine/pred.js` es una copia literal de la fórmula del portal (no se toca, regla #1 del `MASTER-PLAN.md`); el problema es solo cómo `aprobar-review.js` la muestra: hoy lista cada factor con su etiqueta cruda del modelo ("Objeto o ritual concreto (hoja, tinta, rutina, billetera)", "Promesa directa…") y su evidencia estadística completa ("13 de 29 con esto pasaron 1000 vistas…") siempre visible, todo junto.
Pedido: el círculo con el score (el "termómetro circular") queda como lo único visible por default. Debajo, un enlace tipo **"¿Por qué este score?"** que al abrirse muestra factores en categorías simples y reconocibles por cualquiera — Daniel dio de ejemplo: *"la iluminacion... la claridad del mensaje, el hook, los subtitulos, la estrctura del reel etc."* — no las etiquetas internas del modelo. Es trabajo de presentación: agrupar/traducir los `parts` que ya devuelve `scoreVideo()` a esas categorías, no cambiar cómo se calculan. **Estado: pedido, no implementado todavía.**

---

### 10. Crear: rediseño completo como flujo conversacional sobre la nube de Jarvis — **reemplaza el "Crear" de la v1 entero, no es un agregado**
Daniel pidió esto con mucho detalle; se transcribe cercano a lo textual porque la lógica de ramas importa. **No implementar todavía** — queda documentado para cuando se aborde la tarea #12. El "Crear" de dos modos descrito en `MASTER-PROMPT.md` §3 (Pedir con Claude / Subir videos) queda obsoleto y se reemplaza por esto.

**La pantalla entera es la nube.** No es un formulario con una nube de fondo: es literalmente el mismo componente líquido/mórfico de Jarvis, flotando, con una animación de entrada premium ("bien cool y premium"). Pregunta: **"¿Qué querés crear?"**. Dos caminos.

**Camino A — Nuevo estilo** (se conecta con lo que ya existe en Laboratorio → Referencias):
1. Pregunta: "¿Tenés referencias, links, videos o ideas sobre este estilo nuevo?"
   - **No** → mensaje tipo "Para crear un nuevo estilo necesitás tenerlas" (no se puede seguir sin material de referencia).
   - **Sí** → pantalla minimalista, un espacio en blanco: **"Subilo todo acá"** — zona de carga a la nube (videos, links, o ideas escritas). Texto de ayuda: "Cuanto más específico seas, mejor la calidad."
2. Estados de carga: "Subiendo…" → "Subido" (mismo tratamiento visual que el resto de la app).
3. Pregunta: **"¿Qué de estos videos o referencias te gustó?"** — la persona marca/resalta partes específicas que le gustaron (no es solo subir y listo).
4. Se envía todo.
5. Si el sistema no tiene ningún video ya subido con el que pueda probar/construir este estilo nuevo, pide que suba **cualquier video que se parezca** a lo que quiere crear.
6. Mensaje: **"Este proceso puede tomar un rato. En cuanto esté listo te aviso."**
7. Avisa cuando está listo.
8. El estilo nuevo **vive dentro de Laboratorio** (no es una sección aparte).

**Camino B — Nuevo video:**
1. Ventana: **"Elegí tu estilo o estilos preferidos"** — biblioteca completa de estilos para elegir, mismo lenguaje visual premium y consistente que el resto ("super nice looking, siempre mismo estilo").
2. Puede **combinar estilos**, o pedir **versiones distintas del mismo video, cada una en un estilo diferente** — son dos cosas distintas, ambas válidas.
3. Al elegir, la pestaña de estilos (la "biblioteca") desaparece y aparece el espacio para subir los videos a editar.
4. **Qué videos pide depende de los estilos elegidos** (condicional, no siempre lo mismo). Si un estilo necesita un video de intro Y uno de contenido después del hook, pide ambos. En general, lo que puede pedir vive dentro de estas categorías: **intro/hook · video normal (contenido) · B-roll** (si la persona tiene videos para superponer/usar durante ese estilo) **· reacción** (ej. formato "ktteacher": alguien reaccionando/explicando).
5. Formato aparte — **Long form** (podcasts u otro contenido largo): pide solo el video largo, y opcionalmente B-roll que la persona tenga para poner acorde a lo que se va diciendo.
6. Formato aparte — **Long form a short form**: pide solo el video (subida directa O pegar un link, incluso de YouTube). Una vez elegido el video, recién ahí se elige en qué estilo(s) generar los short forms resultantes.

"Y ya eso sería, por ahora" — Daniel puede seguir agregando más formatos/casos después; esto no es necesariamente la lista completa final.

---

## Cómo agregar una entrada nueva

Una entrada por ronda de feedback, fecha arriba. Para cada pedido: la cita textual de Daniel cuando la haya, qué reemplaza (si elimina o reestructura algo de una versión anterior, decirlo explícito y marcar **NO RECREAR** lo que corresponda), y el estado. No editar ni borrar entradas viejas — si una decisión se revierte más adelante, se agrega una entrada nueva que lo diga, no se reescribe la vieja.
