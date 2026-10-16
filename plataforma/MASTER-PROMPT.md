# Master prompt · Aura (plataforma de redes sociales para marcas)

> Este documento es la fuente de verdad del producto. Quien construya (Claude u otro equipo) lo lee completo y no inventa nada que no esté aquí. El plan de ejecución está en `MASTER-PLAN.md` y los datos exactos en `CONTRATO-DE-DATOS.md`. **Antes de tocar nada, leer también `DECISIONES.md`**: registra qué cambió respecto de la primera versión y por qué — en particular, qué se eliminó a propósito y no hay que recrear.

## 1. Qué es

**Aura** es el lugar donde una marca o creador decide, produce y mide su contenido de redes sociales, con un asistente (Jarvis) que vive en un orbe. Reemplaza al "Portal de Aprobación" de Instagram de Daniel y se puede reutilizar con otras marcas cambiando solo la configuración del espacio de trabajo (nombre, cuentas, formatos de producción, idioma).

Una promesa: **abrís y sabés en una frase cómo vas y qué sigue.** Un botón principal por pantalla. Todo lo demás espera.

### Lo que SÍ es
Redes sociales: aprobar videos, pedir y subir videos nuevos, biblioteca de estilos aprobados, laboratorio de estilos, métricas de Instagram con celebraciones por hito, notas y cambios para Claude, y un estudio de edición.

### Lo que NO es (decisión de Daniel)
**Sin ventas, comisiones, afiliados ni dinero.** Nada de Stripe ni cifras financieras. La pestaña "Números" se llama **Métricas**. **No hay una pestaña "Logros"** (ver `DECISIONES.md` #1 y #13): los logros de redes (seguidores, vistas, likes, guardados, interacciones…) viven **dentro de Métricas** como una sección visible al final de esa pantalla, y además se celebran como un momento puntual al abrir la app. Sin niveles ni XP.

## 2. Estilo (híbrido: estructura de Mando + color de Aura)

- **Estructura de Mando:** barra lateral estrecha (iconos + nombre) a la izquierda, barra superior con selector de cuenta, búsqueda/Jarvis `⌘K`, tema y avatar; contenido en una columna principal clara; panel de contexto a la derecha solo cuando aporta (aprobar, estudio). En teléfono: barra de pestañas inferior de vidrio con el orbe al centro.
- **Color de Aura:** perla, teal profundo, damasco, rosa, menta y arena; vidrio líquido; manchas de color que respiran muy lento detrás.
- **Día y noche.** Dos juegos de tokens completos. Modo `Auto` (sigue al sistema), `Día`, `Noche`. El cambio es un morph (View Transitions con un círculo que se expande desde el botón), nunca un parpadeo. Ambos conservan el orbe, el vidrio y las manchas; la noche es teal casi negro con las mismas manchas a menor intensidad y texto perla.
- **Minimalista y fácil.** Una frase grande por pantalla, una acción principal en tinta (en noche: perla), todo lo demás en voz baja. Español claro, sin jerga. Tipografía Onest (una sola familia; el Estudio usa además Anton/Caveat/Inter solo dentro del video).
- **Contraste:** el texto nunca va sobre el fondo de color; siempre sobre vidrio opaco suficiente. 4.5:1 en día y noche. Foco visible de 2 px con separación.

### El orbe (la firma)
Esfera con degradé cónico teal/menta/durazno/damasco/rosa que respira. Está en el Inicio (grande), en la barra superior y en la barra del teléfono (pequeño). **Se estira como una gota y se convierte en lo que pedís:**
1. Tocás el orbe o `⌘K`: respira rápido (0 ms).
2. Se estira hacia el destino con una cola (filtro SVG "goo": desenfoque + umbral de alfa) mientras el resto se atenúa (160 ms).
3. Se aplana y toma la forma del panel (320 ms). El vidrio se aclara.
4. El contenido llega 160 ms después de la forma, línea por línea (480 ms).
5. Al cerrar, el panel vuelve a ser gota y regresa al orbe.
El mismo morph lleva al orbe a la pantalla que pedís ("llevame a aprobar") y a la tarjeta de confirmación. Con "reducir movimiento": fundido simple, sin cola.

**Una sola transición, siempre.** Abrir Jarvis, cerrarlo, navegar a otra pantalla pidiéndoselo, mostrarle algo y abrir el chat usan exactamente el mismo movimiento (la gota líquida + el florecido). Nunca una pantalla propia de fundido/deslizamiento compitiendo con el morph al mismo tiempo: si Jarvis está llevando al visitante a algún lado, es el morph el que dueño de esa transición, no el cambio de vista por su cuenta. El florecido (`bloom`/`wilt`) no es un círculo geométrico perfecto: lee como la misma nube líquida/mórfica del fondo, con el mismo lenguaje orgánico, no como un reveal plano ni algo que "flota" suelto en el aire.

**Presencia mínima permanente.** El orbe de Jarvis (chico) está siempre visible y accesible en cualquier pantalla, no solo como botón dentro de la barra superior/tabbar — es una presencia flotante propia.

## 3. Mapa de la plataforma (todas las secciones)

| Sección | Para qué | Acción principal |
|---|---|---|
| **Empieza aquí** | Los 6 primeros pasos para conocer Aura. Primera del menú mientras falte alguno; al terminar baja al final y sigue ahí | Seguir con el paso que toca |
| **Hoy** | La frase del día + lo que sigue | Empezar a aprobar |
| **Crear** | Pedir videos nuevos y **subir videos** (crudos, clips, referencias) | Enviar pedido |
| **Biblioteca** | Estilos, transiciones, textos, fondos, subtítulos y sonidos ya aprobados | Usar en un video nuevo |
| **Laboratorio** | Rondas de estilo (Me gusta / Quizás / No), referencias, estilos en prueba | Calificar |
| **Métricas** | Redes por cuenta y total: vistas, seguidores, interacciones, mejores reels, ritmo de publicación, y celebración cuando se cruza un hito | Actualizar |
| **Notas** | Una nube flotante que pregunta "¿Cómo puedo mejorar tu experiencia aquí?" y un espacio para escribir; cada mensaje va a Claude en el acto | Escribir y enviar |
| **Estudio** | Listado de todos los videos. Entrar a uno abre una vista general (revisar, aprobar, agendar — lo que antes era "Aprobar"); desde ahí, "Abrir en editor" lleva al editor completo (ver §6) | Aprobar / Editar |
| **Ajustes** | Espacio de trabajo, cuentas, tema, voz de Jarvis, zona segura, modo demo | — |
| **Jarvis** | Asistente en el orbe, disponible en toda pantalla | Preguntar / pedir |

### Empieza aquí
Lo primero que se ve al abrir el portal por primera vez (sin hash en la URL), y **primer item del menú hasta completar los seis pasos**; al completarlos baja sola al final del menú y se queda ahí (nunca desaparece). Ver `DECISIONES.md` #18. Una nube de vidrio —la misma materia que Crear, Notas y Jarvis, que nace del orbe— con el anillo de avance **"N de 6 pasos"** alrededor del orbe, y al lado la línea de pasos: cada tarjeta lleva número (o visto), título, una sola frase de para qué sirve, un botón principal que lleva directo al lugar y «Ya lo hice»; el próximo paso sin hacer queda resaltado. Los pasos (ids `jarvis · estilo · grabar · pedido · revisar · metricas`): **conocer a Jarvis**, **mirar los estilos** (Biblioteca o Laboratorio), **grabar el primer video** (Crear → Grabar con el teleprompter), **pedir el primer video**, **aprobar o rechazar un video** y **mirar las Métricas**. Cada uno se completa **solo** al hacerlo (se detecta por rutas, datos y la capa de Jarvis) o con `App.onboarding.markDone(id)` desde otra función. Al completar el último: celebración (confeti, felicitación por el nombre, frase motivadora) y el menú la baja al final. Terminada, la pantalla muestra los pasos hechos con «Volver a verlo» y **«Volver a ver los pasos»** (reinicia). Mientras falten pasos, **Hoy** muestra arriba una tarjeta compacta con el avance. El progreso vive en `home/onboarding` (con respaldo en el navegador).

### Hoy
Orbe grande + saludo con mini onda + frase del día (300/56 px, lo importante en 500 con resaltado damasco) calculada de datos reales, p. ej. "Inglés se queda sin contenido el jueves. Con 5 aprobados hoy llegás al 20." Cápsulas: **Empezar a aprobar (n)** · Pedir un video · Abrir el Estudio. Campo "Preguntale a Jarvis" con micrófono. Tarjetas de vidrio: *Contenido asegurado* (días por cuenta, barras), *Por aprobar* (tira de videos con puntaje), *Redes 7 días* (vistas, seguidores, interacciones con curva), *Pedidos en curso* (Claude trabajando, con avance), *Pendientes de Daniel* (lista con urgencia), *Laboratorio* (ronda abierta).

### Estudio — listado y revisión (reemplaza a la antigua pestaña "Aprobar", ver `DECISIONES.md`)
Ya no existe una sección "Aprobar" aparte: este es el flujo de entrada al Estudio, y es donde vive todo lo que antes hacía esa pestaña. Tres vistas dentro de Estudio: **Por aprobar · Agendados · Rechazados**. Selector de cuenta. Cada pieza agrupa sus versiones (v1…v4) como cápsulas con anillo de puntaje del predictor — este es el *listado de todos los videos creados*. Click en una versión entra a la **vista general**: video en marco de vidrio con resplandor ambiental tomado del poster, barra de progreso, y debajo del video **Zona segura · Sonido · Abrir en editor**. A la derecha, y SOLO esto (DECISIONES.md #11): arriba un botón **"Abrir en editor manual"**; el **score** en un círculo; el texto **"¿Por qué este score?"**, que solo se abre con un clic y muestra las razones en categorías llanas (claridad del mensaje, qué evitar en el gancho, qué tan nueva se ve…) con cómo mejorarlo; y un chat mínimo **"¿Qué ajustarías?"** con opciones de selección múltiple (Hook, Subtítulos, Intro, Video, Animaciones, Música, Audio, Otro) y un espacio para dar detalles. Nada de notas por cuadro, subtítulos, Jarvis opina ni "Qué falla" en esta vista (eso vive en el editor). Cápsula inferior: **Rechazar · Quizás · Aprobar vN**; atajos `A/Q/R`, `←/→` versión, `Espacio`, `⌘Z` deshacer. **Aprobar = agendar** (escribe `requests/schedule_<cuenta>` y avisa a Claude); rechazar un video ya agendado lo marca para quitar de Metricool. Selección múltiple en lote. Estado "triage": cuenta de piezas hechas / total, tiempo estimado. Desde esta vista general, un botón **"Abrir en editor"** es la única puerta al editor completo (§6) — el editor nunca se abre directo desde ningún otro lado de la plataforma.

### Crear (importantísimo)
**Reemplaza por completo al "Crear" de la v1** (que tenía dos modos, "Pedir con Claude" y "Subir videos"): no hay que recrearlos. Ver `DECISIONES.md` #10 y #16. **La pantalla entera es una nube**: la misma materia líquida/mórfica de Jarvis (contorno que se deforma y nunca es un círculo perfecto, flota suave y se queda quieta cuando vas a tocar algo, el fondo se junta detrás), que entra con una animación premium —la gota sale del orbe de Jarvis, vuela y florece— y pregunta **"¿Qué querés crear?"** con dos caminos. Todo es minimalista, conversacional y con el mismo vidrio que Jarvis.

**Camino A — Un estilo nuevo** (se conecta con Laboratorio → Referencias; el estilo resultante **vive en Laboratorio**, no es una sección aparte):
1. "¿Tenés referencias, links, videos o ideas sobre este estilo nuevo?" — **No** → "Para crear un nuevo estilo necesitás tenerlas" (no se puede seguir sin material). **Sí** → un espacio en blanco: **"Subilo todo acá"** (videos, links o ideas escritas) con la ayuda "cuanto más específico seas, mejor la calidad".
2. Las fichas de carga dicen **"Subiendo… NN%"** y luego **"Subido · tamaño"**.
3. "¿Qué de estos videos o referencias te gustó?" — se marca qué gustó de cada una.
4. Si el sistema no tiene ningún video con el que probar el estilo, pide **cualquier video que se parezca** a lo que se quiere crear.
5. "Este proceso puede tomar un rato. En cuanto esté listo te aviso." Y avisa cuando está listo.

**Camino B — Un video nuevo:** arranca **directo en "Elegí tu estilo o estilos preferidos"** (la biblioteca completa de estilos). Se pueden **combinar** estilos en un video o pedir **versiones distintas del mismo video, una por estilo** (son dos cosas distintas). Al elegir, la biblioteca desaparece y aparece el espacio para subir lo que se va a editar; **qué videos pide depende de los estilos elegidos** (categorías: intro/hook · video normal · B-roll · reacción, p. ej. formato "ktteacher"). Dos formatos aparte, a un toque arriba de la biblioteca: **Long form** (podcasts u otro contenido largo: pide solo el video largo y, opcional, B-roll para poner acorde a lo que se dice) y **Long form a short form** (pide solo el video, subido o con un link, incluso de YouTube; recién ahí se eligen los estilos de los cortos).
Los pedidos en curso (video y estilo) se listan abajo con su estado (Pedido · En producción · Listo para revisar · Terminado · Bloqueado · Cancelado). Ambos caminos terminan en un pedido (`requests/new_<ts>`) y un aviso a Claude.

### Biblioteca
Catálogo único y ordenado de **lo aprobado**: *Estilos* (de `exp_styles` con estado aprobado, con su demo animada), *Transiciones*, *Textos*, *Fondos*, *Subtítulos*, *Sonidos* (del catálogo `StudioLib` del Estudio) y *Referencias* (links y videos guardados). Búsqueda, filtros por tipo, vista previa viva (hover/tap), ficha con "qué hace / cuándo usarlo / reglas que lo tocan" y dos acciones: **Usar en un video nuevo** (abre Crear con ese estilo elegido) y **Probar en el Estudio**. Los estilos nuevos aprobados en el Laboratorio aparecen solos.

### Laboratorio
Tres pestañas: **Ronda** (tarjetas con demo animada; Me gusta / Quizás / No con nota; progreso; comentario general; los cambios sin enviar quedan en la barra "cambios sin enviar" de abajo), **Referencias** (pegar links o subir videos; estados Guardada → Enviada → Analizada → Estilo listo), **Estilos** (en prueba / aprobados / descartados; aprobar pasa a la Biblioteca).

### Métricas
Solo redes. Selector Total / cuenta. Rango 7/30 días. Tarjetas grandes: vistas, seguidores (neto, ganados, perdidos), interacciones, alcance, reels publicados. Curva de evolución, tabla de **mejores reels** (nombre de pieza, vistas, interacciones, fecha), **ritmo de publicación** (agendados por día y hueco de contenido), mejor hora para publicar. Datos de Metricool (`IGRE*` y evolución); si no hay conexión, últimos datos guardados con la marca "dato guardado hace…". Sin dinero.

**Hitos (reemplaza a la antigua sección "Logros", ver `DECISIONES.md`: no recrear una pantalla aparte).** Definiciones por número específico cruzado: vistas, seguidores, interacciones, likes o guardados (por cuenta o total). Se ven como una sección **"Logros" al final de Métricas** (medalla, valor, avance y lo que falta para el siguiente escalón; "Nuevo" en los recién cruzados); no hay pestaña propia ni niveles/XP. Cuando al abrir la app un hito nuevo quedó cruzado desde la última vez, aparece una **celebración puntual** con el mismo branding y la misma transición (morph) que el resto de la plataforma — nunca un componente visual aparte — con confeti, un mensaje de felicitación/reconocimiento por el trabajo hecho y una frase motivacional, y se cierra volviendo a Métricas. Qué hitos ya se celebraron se guarda (p. ej. `home/trophies`) para no repetir la misma celebración dos veces.

### Notas
Pantalla mínima (DECISIONES.md #12): solo una **nube líquida que flota** (la misma materia que Jarvis, contorno que se deforma, nunca un círculo perfecto) con la pregunta **"¿Cómo puedo mejorar tu experiencia aquí?"** y un espacio para escribir. Al enviar dice **"Recibido. ¿Hay algo más?"** y deja escribir otra; cuando la persona dice que no hay más ("Eso es todo" o escribe "no") dice **"Muchas gracias, haremos lo mejor por mejorar tu experiencia."** Cada mensaje se manda a Claude en el momento (`requests/experiencia_<ts>`). La lista de cambios sin enviar (videos, referencias, subtítulos, rondas) ya no vive acá: se ve y se manda desde la barra "cambios sin enviar" de abajo, que está en todas las pantallas.

### Ajustes
Ver §7. (El editor del Estudio está descrito en §6; su listado y vista general están arriba, en "Estudio — listado y revisión".)

## 4. Jarvis

- Capacidad `sample` con herramientas: `go_to`, `propose_approval` (siempre con botón de confirmación), `mark_todo_done`, `leave_feedback`, `ask_claude` (para trabajo real: producir, rehacer, agendar, Metricool, Higgsfield), `open_studio`, `new_request`. Sin `request_sales_refresh` ni datos de ventas.
- Hablá en español claro, 1 a 3 frases, solo con datos del resumen (`jvBrief`); nunca decir que algo está hecho si solo se pidió.
- Panel nacido del orbe: conversación, chips sugeridos, tarjeta de confirmación, entrada por voz (Web Speech) y respuesta hablada opcional. Errores amables (límite de uso, sesión vencida, sin permiso).
- Sin la capacidad: modo local por reglas (responde pendientes, contenido, navega) para que el orbe siempre sirva.

## 5. Datos y conexión

Capacidades de artefacto: `db`, `assets`, `comments`, `downloads`, `mcp` (metricool), `sample`, `user`. Mismas colecciones que hoy (no se migra nada): `brands, videos, notes, metrics, evolution, refs, exp_styles, exp_rounds, exp_cards, home, requests, system, rounds, schedule, versions, transcripts, feedback, submissions, diag`. **Ya no se lee** `affiliate`. Detalle campo por campo en `CONTRATO-DE-DATOS.md`.

La interfaz habla con un **adaptador** (Claude real / memoria de demostración / simulador de pruebas). Ninguna vista llama a `window.claude` directo.

## 6. Estudio (recreado, mismo motor)

Se llega acá SOLO desde el botón "Abrir en editor" de la vista general descrita en §3 (listado de videos → vista general → editor). Nunca es la pantalla con la que arranca la sección Estudio. Misma lógica y mismo renderizador que hoy (modelo puro, reglas de calidad, catálogo, `StudioRenderer` con GSAP; lo que se ve es lo que se exporta, 1080×1920 a 30 fps), con una piel nueva minimalista de vidrio:
- **Arriba:** volver, nombre de la pieza, versiones (v1…v4 con punto de estado; **cambiar de versión se queda en el editor**, no vuelve a la vista general), guardado, deshacer/rehacer, reglas (n), Pedirle a Claude, Exportar.
- **Izquierda – Biblioteca del Estudio:** Fondos · Texto · Transiciones · Imágenes · Subtítulos · Sonido · Estilos. Un toque agrega al cursor.
- **Centro:** teléfono con el video, selección en el cuadro (arrastrar texto/medios), zona segura, play/pausa, barra, código de tiempo, silenciar.
- **Derecha:** Ajustes del elemento · Transcripción (editable, clic salta) · Medios · Claude (pedidos con pasos; el chat "Pedirle a Claude" no trae sugerencias de ejemplo debajo) · Exportar (formatos y calidad, SRT, copia).
- **Abajo:** línea de tiempo con pistas (fondo, medios, texto, subtítulos, sonido, notas), regla, cabezal, arrastrar/estirar/dividir/duplicar con imán, zoom.
- Atajos: `Espacio`, `←/→` cuadro, `Shift` ×10, `S` dividir, `D` duplicar, `Del`, `⌘Z/⇧⌘Z`, `N` nota.
- En teléfono: vista previa grande, línea de tiempo plegable, panel inferior deslizable (hoja) con las mismas pestañas.
- Si una versión aún no tiene especificación: modo simple (video y transcripción) con el botón "Abrir en el editor completo" (le pide a Claude armar el spec).

## 7. Multi espacio (para vender)

Todo lo propio de Daniel vive en un **preset de espacio** (`App.config`): nombre del espacio, cuentas (id, nombre, @, blogId, color, idioma), formatos de producción, etiquetas de problema, materia prima, textos de Jarvis, objetivos de hitos (para las celebraciones de Métricas, ver §3). Se entrega el preset **KT** y un segundo preset **Lumen** (marca ficticia, otro idioma y otras cuentas) para probar que la interfaz no depende de KT. Ver `MASTER-PLAN.md` §6 para lo que falta para ser un SaaS real (autenticación, tenencia, cobro, workers, OAuth de Metricool).

## 8. Estados, accesibilidad y responsive

Vacíos con una frase y una acción; esqueletos de vidrio; error con reintento; dato viejo marcado. Todo operable con teclado, `aria-live` para toasts y Jarvis, `prefers-reduced-motion` respetado, objetivos táctiles ≥ 44 px. Breakpoints: ≥1280 completo, 1024 riel compacto, 768 riel abajo, <768 experiencia de teléfono propia (barra inferior con orbe, hojas inferiores, video a pantalla completa en Aprobar).

## 9. Criterios de aceptación

- La frase del día responde "cómo voy y qué sigue" sin leer nada más. Un solo botón principal por pantalla.
- Aprobar una versión con teclado toma menos de 2 segundos; comparar y resolver una pieza de 4 versiones, menos de 15.
- El morph orbe → panel y el cambio día/noche corren a 60 fps; nada parpadea.
- Crear permite subir un video y enviarlo en menos de 30 segundos.
- Cada sección de §3 existe, funciona en demo y se ve igual de bien en compu y teléfono, en día y en noche.
- Cero rastros de ventas/dinero. Cero referencias directas a KT fuera del preset.
- Mismo motor del Estudio: una especificación abierta en Aura se exporta idéntica a la de hoy.
