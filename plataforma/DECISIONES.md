# Decisiones · Aura

Registro de qué cambió respecto de la primera versión (fases 0-8 del `MASTER-PLAN.md`) y por qué. `MASTER-PROMPT.md` ya refleja estos cambios en el texto de la especificación — este archivo es el historial y el porqué, para que quien implemente no deshaga una decisión tomada a propósito ni recree algo que se eliminó a propósito.

Cómo leer este archivo: cada entrada dice **qué pedimos**, **qué estado tiene** (pedido / en curso / implementado) y, cuando aplica, **qué NO hay que recrear**.

---

## 2026-10-14 — Ronda de feedback sobre la v1 (fases 0-8)

Daniel probó el artefacto publicado al final de la fase 8 (modo demo) y pidió estos cambios:

### 1. Eliminar "Logros" como sección propia — **NO RECREAR una pestaña "Logros"**
La v1 tenía una sección de nav completa con niveles (Bronce→Diamante), XP, 5 medallas y una pantalla para "ver el próximo". Daniel: *"eliminemos lo de logros no hace falta en estos momentos"*. Reemplazo: los hitos de redes (vistas, seguidores, likes, guardados) viven dentro de **Métricas**, sin pantalla propia. Cuando se cruza un número específico, al abrir la app aparece una **celebración puntual** (no una pantalla a visitar): mismo branding y misma transición (morph) que el resto de la plataforma, con confeti, mensaje de felicitación/reconocimiento por el trabajo y una frase motivacional/inspiracional. Se guarda qué hitos ya se celebraron para no repetir. Ver `MASTER-PROMPT.md` §1 y §3 (dentro de "Métricas"). **Estado: implementado** (e6a04e4, más el confeti): se eliminó `logros.js`, la ruta, el nav y la tarjeta de Hoy; un `#logros` viejo redirige a Métricas. Al abrir la app (Hoy) o entrar a Métricas, un hito nuevo dispara la celebración puntual con el mismo morph, **confeti en los colores de la marca**, felicitación por el trabajo y una frase motivacional. **Pendiente de decidir con Daniel:** la celebración todavía muestra "+XP" y una página de "subiste de nivel" heredadas de Logros; el pedido original hablaba solo de hitos (vistas, seguidores, likes, guardados).

Si en el futuro alguien lee el plan original (`MASTER-PLAN.md` fase 4, que todavía menciona "Logros" como entrega de esa fase) y lo toma como pendiente de construir: no lo es. Esta decisión lo reemplaza.

### 2. Fusionar "Aprobar" dentro de "Estudio" — **NO RECREAR "Aprobar" como pestaña de nav propia**
La v1 tenía "Aprobar" y "Estudio" como dos secciones de nav separadas. Daniel: *"haz que lo de aprobar viva dentro de la pestaña 'estudio', ahi veo todos los videos ya creados, y al hacer click puedo entrar y ver un poco general y ya aparece ahi un boton sobre abrir en editor, esa es la forma en la que puedo legar a editor, en ese flujo."* Nuevo flujo, todo dentro de "Estudio":
1. **Listado** — todos los videos creados (lo que antes era "Por aprobar · Agendados · Rechazados").
2. **Vista general** — al entrar a uno: la pantalla de revisión que ya existía (predictor, Jarvis opina, subtítulos, aprobar/rechazar/agendar).
3. **Editor completo** — solo se llega con el botón "Abrir en editor" desde la vista general. El editor nunca es la pantalla de entrada a Estudio.
Ver `MASTER-PROMPT.md` §3 ("Estudio — listado y revisión") y §6. **Estado: implementado** (5cd488a, 45fe8fd): "Aprobar" ya no está en el nav ni en las rutas; un `#aprobar…` viejo entra a `#estudio` en su lugar. Estudio es el listado, la vista general es la revisión, y "Abrir en el editor" es la única puerta al editor completo.

### 3. El editor queda trabado al abrirlo desde Aprobar — bug real, no solo de la fase 8
Al probar el artefacto publicado (claude.ai, no el sandbox de la sesión que lo construyó), abrir el editor desde la revisión se traba. La sesión que publicó la fase 8 había anotado que el Estudio fallaba *en su propio sandbox* por GSAP/cdnjs bloqueado ahí, y asumió que en claude.ai funcionaría. Esto se reporta directamente en el artefacto real, así que **esa asunción puede ser incorrecta, o hay un bug distinto específico al camino Aprobar → Estudio**. Investigar de cero, no asumir que es el mismo problema de red ya anotado. **Estado: mitigado, causa exacta sin confirmar** (d1f89db). Desde el sandbox no se puede reproducir en claude.ai (cdnjs bloqueado). Lo que sí se encontró: el motor precargaba la fuente `AstonScript` con `document.fonts.load()` sin que existiera su `@font-face`, lo que podía dejar `rebuild()` sin ejecutarse nunca y la vista previa en blanco sin ningún aviso (la fuente ya viene embebida en el build final). Se agregó un límite de 2,5 s a esa precarga, reintento si GSAP todavía no cargó, y un aviso con botón "Reintentar" si el montaje tarda más de 8 s. **Confirmar abriendo el editor en el artefacto real.**

### 4. Jarvis: el morph no es fluido, no se siente como la nube líquida, y las transiciones son inconsistentes
Daniel, primero: *"hay un bug al abrir el jarvis o esa nube morphica, no es fluido"*; después, viendo una primera corrección: *"es meramente circular pero al inicio habiamos quedado que era algo como una nube morphica que se mueve, como un liquido, ese tipo de movimiento, y parece que esta flotando"*. Dos problemas distintos:
- **Rendimiento real**: `clip-path` animado sobre un panel con `backdrop-filter` activo (recalcula el blur del fondo en cada cuadro de la animación) y el filtro SVG `goo` corriendo sobre el viewport completo en vez de sobre el área real del vuelo.
- **Lenguaje visual**: el reveal (`bloom`/`wilt`) es un círculo geométrico que crece — no lee como la misma nube mórfica/líquida del fondo (`App.aura`). Tiene que sentirse como la MISMA sustancia, no como una forma geométrica plana ni algo que flota suelto.
- **Consistencia**: abrir Jarvis, cerrarlo, navegar pidiéndoselo ("llevame a..."), mostrarle algo y abrir el chat deben usar exactamente el mismo movimiento. Hoy navegar desde Jarvis dispara el morph Y el fundido propio de cambio de pantalla al mismo tiempo (dos sistemas sin coordinar), y usa un cierre distinto al de abrir/cerrar normal.
Pedido explícito: *"que sea siempre smooth con el mismo movimiento y transicion, supr smooth"*. **Estado: implementado** (d1f89db): el filtro goo ya no corre sobre todo el viewport, el vidrio se apaga mientras el `clip-path` se anima, el reveal rebasa y asienta (spring) y la misma gota que aterriza se derrama, y abrir/cerrar/navegar usan el mismo vuelo (`App._morphNav` evita el segundo fundido). La sensación de fluidez solo se puede juzgar a ojo: si todavía no se siente líquido, ajustar tiempos en `js/core/motion.js` (`fly` con `spread`, `bloom`).

### 5. Jarvis: presencia flotante persistente en todas las vistas
Daniel: *"me gustaria que ese jarvis flotante siga aunque sea pequeño, en todas las ventanas"*. Hoy el orbe solo vive como botón dentro de la barra superior/tabbar. Pedido: una presencia mínima (chica) del orbe, siempre visible/accesible, en cualquier pantalla — no solo integrada a la barra de navegación. **Estado: implementado** (d1f89db): `#jvfab`, orbe flotante fijo abajo a la derecha, por encima del editor a pantalla completa; se aparta de la barra de "cambios sin enviar" y en teléfono lo cubre el orbe del tabbar.

### 6. El selector de cuenta/marca no respeta el branding
El `<select>` nativo del selector de cuenta (barra superior) muestra el estilo del sistema operativo al abrirse (ver captura del reporte), rompiendo el lenguaje visual del resto de la app. Reemplazar por un menú propio con los mismos tokens/vidrio que el resto de la interfaz. **Estado: implementado** (c92f28e): botón `#brandbtn` con menú propio; ya no hay `<select>` nativo.

### 7. Varios bugs en Biblioteca
Reportados sin detalle específico ("varios bugs"). Hay que investigar el código y el comportamiento para encontrar los más evidentes; si no son evidentes desde el código, hay que pedirle a Daniel detalle o capturas antes de inventar una causa. **Estado: investigado, un bug claro arreglado** (6699a04): "Probar en el Estudio" no hacía nada; ahora muestra la tarjeta "Probando «estilo»" en el listado de Estudio apuntando a la herramienta correcta. No se encontraron otros bugs claros: si Daniel ve más, necesitamos el paso exacto o una captura.

### 8. Descargas no funcionan en el artefacto publicado
"Exportar" y "Descargar SRT" no hacen nada en `dist/artifact.html` tal como se publicó en la fase 8: a esa vista le falta declarar la capacidad `downloads` del visor de artefactos (no es un bug del código de la app). **Estado: implementado y publicado** (bb2466b, a0e0689). Faltaba además un segundo hueco: el artefacto publicado corre en modo demostración, cuyo `download()` usaba un `<a download>` que el iframe bloquea; ahora el adaptador demo guarda por `claude.use("downloads")` cuando existe (helper compartido `saveViaCapability`). La capacidad solo acepta una lista cerrada de extensiones y **`.srt` no está en ella**: un SRT se ofrece como `.srt.txt` (hay que renombrarlo). El artefacto se republicó con `capabilities: {downloads: true}` únicamente; NO se declararon `db`, `mcp`, `sample` etc. (conectarían datos reales y Metricool, y eso se decide al pasar al portal real). **Confirmar haciendo clic en Exportar en el artefacto real.**

### 9. Panel del predictor de viralidad: demasiado largo y con jerga técnica — **NO tocar la fórmula, solo la piel**
Viendo la revisión de un video real, Daniel: *"la lista de su retroalimentacion es demasiado larga y con terminos raros, nombres de archivos, v1 'objeto' 'ritual' no tienen sentido, quizas para mi si, pero para otros no tiene sentido para nada."* `js/engine/pred.js` es una copia literal de la fórmula del portal (no se toca, regla #1 del `MASTER-PLAN.md`); el problema es solo cómo `aprobar-review.js` la muestra: hoy lista cada factor con su etiqueta cruda del modelo ("Objeto o ritual concreto (hoja, tinta, rutina, billetera)", "Promesa directa…") y su evidencia estadística completa ("13 de 29 con esto pasaron 1000 vistas…") siempre visible, todo junto.
Pedido: el círculo con el score (el "termómetro circular") queda como lo único visible por default. Debajo, un enlace tipo **"¿Por qué este score?"** que al abrirse muestra factores en categorías simples y reconocibles por cualquiera — Daniel dio de ejemplo: *"la iluminacion... la claridad del mensaje, el hook, los subtitulos, la estrctura del reel etc."* — no las etiquetas internas del modelo. Es trabajo de presentación: agrupar/traducir los `parts` que ya devuelve `scoreVideo()` a esas categorías, no cambiar cómo se calculan. **Estado: implementado** (fb17351): el círculo con el score es lo único visible; los factores agrupados en español llano van detrás de "¿Por qué este score?". `pred.js` no se tocó.

---

### 10. Crear: rediseño completo como flujo conversacional sobre la nube de Jarvis — **reemplaza el "Crear" de la v1 entero, no es un agregado**
Daniel pidió esto con mucho detalle; se transcribe cercano a lo textual porque la lógica de ramas importa. **Estado: implementado** (95ed970): `crear.js` (la nube y la pregunta "¿Qué querés crear?"), `crear-estilo.js` (camino A) y `crear-video.js` (camino B, incluido long form y long form a short form), con pruebas. El "Crear" de dos modos descrito en `MASTER-PROMPT.md` §3 (Pedir con Claude / Subir videos) queda obsoleto y se reemplaza por esto.

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

## 2026-10-15 — Segunda ronda (feedback sobre la v2 publicada)

Daniel probó el artefacto de la ronda anterior y pidió lo siguiente. Esta ronda **corrige o precisa** a la anterior; las entradas 1-10 de arriba siguen siendo el historial y no se reescriben.

### 11. Logros: la pestaña no vuelve, pero SÍ se ven dentro de Métricas — **precisa la #1**
Daniel: *"logros te dije que se quedara dentro de metricas"*. La #1 se había cumplido solo a medias: se eliminó la pestaña pero dentro de Métricas ya no se veía ningún logro (solo la celebración puntual). Ahora Métricas termina con una sección **"Logros"**: una tarjeta por hito (seguidores, vistas de reels, **likes**, **guardados**, interacciones, reel más visto, reels publicados, vistas y seguidores de 7 días, racha) con la medalla del escalón alcanzado, el valor, la barra hasta el siguiente escalón y lo que falta; "Nuevo" y un botón "Ver lo nuevo" cuando hay hitos sin celebrar. Se agregaron `likes` y `saved` a los hitos (`domain/trophies.js`); la celebración al abrir la app sigue igual. **Se quitó el "+XP" y la página de "subiste de nivel"** de la celebración (era el punto abierto de la #1): solo felicita y motiva. **NO RECREAR una pestaña "Logros" en el nav ni una pantalla con niveles/XP.** **Estado: implementado.**

### 12. Notas: de bandeja de borradores a una nube que pregunta cómo mejorar
Daniel: *"notas, que sea mas como la bola jarvis flotante, como liquido te he dicho que no es exactamente siempre circular, que sea un movimiento flotante, high end, premium, que dice: ¿Cómo puedo mejorar tu experiencia aquí? Simple. Solo un espacio blanco con eso flotando y un espacio para escribir. Y una vez enviado dice: recibido. ¿Hay algo más? Hasta que ya no haya nada más dice, muchas gracias, haremos lo mejor por mejorar tu experiencia."* Reemplaza la pantalla Notas entera (bandeja "Sin enviar / Nota rápida / Enviadas / Resueltas"): ahora es solo la nube (contorno que se deforma, flota, entra desde el orbe de Jarvis con `App.morph.arrive`), la pregunta y un campo. Enviar → "**Recibido.** ¿Hay algo más?"; "Eso es todo" (o escribir "no"/"nada") → "Muchas gracias, haremos lo mejor por mejorar tu experiencia." Cada mensaje se manda a Claude en el acto como `requests/experiencia_<ts>` (`App.act.sendExperience`). La barra "cambios sin enviar" ahora también se ve en Notas y el rail ya no marca un número en Notas. **NO RECREAR** la bandeja de borradores en esta pantalla: los cambios sin enviar se manejan desde esa barra. **Estado: implementado.**

### 13. Revisión de un video: panel derecho mínimo — **reemplaza lo que describía la #9 para esa vista**
Daniel (con captura de "Notas por cuadro" y "Subtítulos"): *"a la hora de abrir un video quiero elimines todo eso que te he enviado en la captura de pantalla, quiero que a la par del video, en el lado derecho solo salga: el score, un texto que dice porque este score que si lo apreto se abre todas las razones, entendibles y claras, y formas en las que se puede mejorar. SOLO SE ABRE SI HAGO CLICK. luego hay un chat que solo dice: ¿qué ajustarías? y hay una opcion de seleccionar diferentes ya sea hook, subtitulo, intro, video, animaciones, etc, puedo seleccionar varias si quiero y luego en chat la persona puede dar detalles, minimalista, mantener esas highend animations. y luego un boton arriba de score, que dice: abrir en editor manual y ya eso lleva al editor."* Y después: *"se queda esto de abrir en editor me gusta"* (los botones Zona segura · Sonido · **Abrir en editor** bajo el video). Hecho en `aprobar-review.js`: se eliminaron de esta vista las notas por cuadro, los subtítulos por palabra, "Jarvis opina" y "Qué falla"; quedan el botón "Abrir en editor manual", el score circular, "¿Por qué este score?" (cerrado siempre; el estado abierto sobrevive a los repintados) y el chat "¿Qué ajustarías?" (chips de selección múltiple + detalle; lo que se manda queda como el cambio de esa versión y viaja con "Enviar cambios"). Los dos botones al editor se quedan. **NO RECREAR** notas por cuadro ni subtítulos en la vista general: esas herramientas viven en el editor. Arreglo menor: dentro de un anillo, `.in` (estilo de campos de texto) lo dibujaba como una caja. **Estado: implementado.**

### 14. Editor: cambiar de versión sin salir; sin sugerencias bajo el chat
Daniel: *"en editor cuando le doy a v1, v2, v3, etc, que se quede en el editor, que pase a la otra version pero en el mismo editor"* y *"cuando se abre esto de dile a claude, elimina esas sugerencias debajo del chat"*. Causa del primero: el cambio de ruta `estudio/editor/<id>` lo atendía la vista general, que lo reescribía a `estudio/ver/<id>` y el editor se cerraba. Ahora `switchTo(id, inEditor)` deja la ruta en `editor` (la vista general de abajo solo se mantiene al día) y `ST.open` no reanima todo el editor al cambiar de versión. Se quitaron los chips de `EJEMPLOS_PEDIDO` de "Pedirle a Claude". **Estado: implementado.**

### 15. Jarvis: la animación de abrir/cerrar seguía sin ser fluida — causa encontrada y medida
Daniel: *"La animacion con la que entra y sale el jarvis cuando le doy click a la bolita esta buggeada, no es smoooth."* La corrección de la #4 había mirado `clip-path`, pero medido (cuadros por segundo en un navegador sin GPU, que exagera pero ordena las causas) lo caro era otra cosa:
- **`backdrop-filter`** del vidrio de TODA la pantalla (rail, barra, tarjetas) y del velo: se recalcula en cada cuadro mientras algo se mueve encima. Con el velo abierto y un orbe que respira, la pantalla bajaba a ~12 fps. → Modo liviano `#aura-root.mo` (`App.morph.lite`): mientras Jarvis abre/está abierto/cierra/lleva a otro lado, el vidrio de abajo no desenfoca; el velo **ya no desenfoca nunca** (dos capas del mismo tinte).
- **Filtro SVG `goo`** sobre una caja del tamaño del recorrido entero. → La caja ahora es chica (~500 px), centrada en la gota, y **viaja con ella** (solo `transform`); la estela se calcula muestreando la velocidad de la gota (se estira al ir rápido y se reabsorbe al frenar).
- **Bolita blanca clavada** durante el cierre: `wilt` dejaba el panel como un punto de vidrio (`opacity .85`, `fill: forwards`, que gana a cualquier `opacity` inline) mientras la gota ya viajaba. → ahora se desvanece justo donde nace la gota.
Resultado medido: abrir pasó de ~150 ms a ~35-45 ms por cuadro; con Jarvis abierto y quieto, de ~87 ms a 16 ms (60 fps) en el mismo entorno. **Aun así solo se puede confirmar a ojo en el artefacto real**: si todavía se siente brusco, el siguiente candidato es el `clip-path` de `bloom` (se anima en el hilo principal; en Chrome reciente se compone, en Safari no) — ver `App.morph.bloom`. **Estado: implementado, confirmar en el artefacto real.**

### 16. Crear: lo que faltaba respecto de lo pedido en la #10
Daniel: *"La seccion de crear aun no esta como te lo pedi especificamente."* Auditado contra su mensaje original: el camino A (estilo nuevo) ya cumplía; faltaba que **la pantalla fuera de verdad la nube**, el texto de carga y el orden del camino B. Ahora: la raíz es una gota líquida (contorno que se deforma, flota, se pausa cuando vas a tocar algo) con "¿Qué querés crear?" y las dos opciones; entra con la gota que sale del orbe de Jarvis y florece (`App.morph.arrive`, compartido con Notas), y las manchas del fondo se juntan detrás (`App.aura.mood`). Las fichas de carga dicen **"Subiendo… NN%"** y luego **"Subido · tamaño"**. El camino B **arranca directo en "Elegí tu estilo o estilos preferidos"** (antes había un paso previo para elegir formato); **Long form** y **Long form a short form** son formatos aparte a un toque, arriba de la biblioteca (long form: solo el video largo + B-roll opcional; long form a short form: el video —archivo o link, incluso de YouTube— y recién ahí los estilos de los cortos). **Estado: implementado.**

---

## Cómo agregar una entrada nueva

Una entrada por ronda de feedback, fecha arriba. Para cada pedido: la cita textual de Daniel cuando la haya, qué reemplaza (si elimina o reestructura algo de una versión anterior, decirlo explícito y marcar **NO RECREAR** lo que corresponda), y el estado. No editar ni borrar entradas viejas — si una decisión se revierte más adelante, se agrega una entrada nueva que lo diga, no se reescribe la vieja.
