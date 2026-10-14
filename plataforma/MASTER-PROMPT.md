# Master prompt · Aura (plataforma de redes sociales para marcas)

> Este documento es la fuente de verdad del producto. Quien construya (Claude u otro equipo) lo lee completo y no inventa nada que no esté aquí. El plan de ejecución está en `MASTER-PLAN.md` y los datos exactos en `CONTRATO-DE-DATOS.md`.

## 1. Qué es

**Aura** es el lugar donde una marca o creador decide, produce y mide su contenido de redes sociales, con un asistente (Jarvis) que vive en un orbe. Reemplaza al "Portal de Aprobación" de Instagram de Daniel y se puede reutilizar con otras marcas cambiando solo la configuración del espacio de trabajo (nombre, cuentas, formatos de producción, idioma).

Una promesa: **abrís y sabés en una frase cómo vas y qué sigue.** Un botón principal por pantalla. Todo lo demás espera.

### Lo que SÍ es
Redes sociales: aprobar videos, pedir y subir videos nuevos, biblioteca de estilos aprobados, laboratorio de estilos, métricas de Instagram, logros por hitos de redes, notas y cambios para Claude, y un estudio de edición.

### Lo que NO es (decisión de Daniel)
**Sin ventas, comisiones, afiliados ni dinero.** Nada de Stripe ni cifras financieras. Los logros son solo de redes (seguidores, vistas, interacciones, reels, rachas). La pestaña "Números" se llama **Métricas**.

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

## 3. Mapa de la plataforma (todas las secciones)

| Sección | Para qué | Acción principal |
|---|---|---|
| **Hoy** | La frase del día + lo que sigue | Empezar a aprobar |
| **Aprobar** | Cola de videos por pieza y versión; agendados; rechazados | Aprobar |
| **Crear** | Pedir videos nuevos y **subir videos** (crudos, clips, referencias) | Enviar pedido |
| **Biblioteca** | Estilos, transiciones, textos, fondos, subtítulos y sonidos ya aprobados | Usar en un video nuevo |
| **Laboratorio** | Rondas de estilo (Me gusta / Quizás / No), referencias, estilos en prueba | Calificar |
| **Métricas** | Redes por cuenta y total: vistas, seguidores, interacciones, mejores reels, ritmo de publicación | Actualizar |
| **Logros** | Trofeos y niveles por hitos de redes | Ver el próximo |
| **Notas** | Bandeja de notas y cambios pendientes + **Enviar cambios** a Claude | Enviar cambios |
| **Estudio** | Editor de video (ver §6), se abre sobre cualquier video | Guardar / Exportar |
| **Ajustes** | Espacio de trabajo, cuentas, tema, voz de Jarvis, zona segura, modo demo | — |
| **Jarvis** | Asistente en el orbe, disponible en toda pantalla | Preguntar / pedir |

### Hoy
Orbe grande + saludo con mini onda + frase del día (300/56 px, lo importante en 500 con resaltado damasco) calculada de datos reales, p. ej. "Inglés se queda sin contenido el jueves. Con 5 aprobados hoy llegás al 20." Cápsulas: **Empezar a aprobar (n)** · Pedir un video · Abrir el Estudio. Campo "Preguntale a Jarvis" con micrófono. Tarjetas de vidrio: *Contenido asegurado* (días por cuenta, barras), *Por aprobar* (tira de videos con puntaje), *Redes 7 días* (vistas, seguidores, interacciones con curva), *Pedidos en curso* (Claude trabajando, con avance), *Pendientes de Daniel* (lista con urgencia), *Logros* (nivel, XP, 5 medallas), *Laboratorio* (ronda abierta).

### Aprobar
Tres pestañas: **Por aprobar · Agendados · Rechazados**. Selector de cuenta. Cada pieza agrupa sus versiones (v1…v4) como cápsulas con anillo de puntaje del predictor. Pantalla de revisión: video en marco de vidrio con resplandor ambiental tomado del poster, barra de progreso con notas por cuadro (nota anclada al segundo), zona segura de Instagram (interruptor), subtítulos por palabra editables (estilos por palabra), etiquetas de problema (Hook, Subtítulos, Intro, Música, Audio, Cara tapada, Otro), predictor de viralidad con factores explicables y evidencia propia, y a la derecha Jarvis opina ("v2 puede ser la mejor de la pieza…"). Cápsula inferior: **Rechazar · Quizás · Aprobar vN**; atajos `A/Q/R`, `←/→` versión, `Espacio`, `N` nota, `⌘Z` deshacer. **Aprobar = agendar** (escribe `requests/schedule_<cuenta>` y avisa a Claude); rechazar un video ya agendado lo marca para quitar de Metricool. Selección múltiple en lote. Estado "triage": cuenta de piezas hechas / total, tiempo estimado.

### Crear (importantísimo)
Dos modos en una sola pantalla, con la cápsula de modo arriba:
1. **Pedir con Claude:** cuenta, cuántas piezas, formato (lista que viene de la configuración del espacio: p. ej. ktvideos6, Especial Vox), tema o idea, hooks propios (uno por línea), versiones (4/3/1), música, **estilo de la Biblioteca** (selector con vista previa), notas, fecha deseada. Avisa si falta materia prima (intros/teachers libres) y ofrece alternativas. Cola de pedidos con estado (Pedido · En producción · Listo para revisar · Terminado · Bloqueado · Cancelado) y avance por pasos.
2. **Subir videos:** zona de arrastrar y soltar (y botón/cámara en teléfono) para videos crudos, clips B-roll, intros, teachers o una referencia; también pegar links. Cada archivo muestra miniatura, nombre, tamaño y barra de subida; se elige para qué es (*Crudo para editar · Clip para usar · Intro · Referencia de estilo*) y a qué pedido se adjunta. Tope y avisos claros (p. ej. 19 MB por archivo en el almacén de artefactos; si es más grande, pegar link). Al enviar, el pedido incluye los `assetId` y Claude los toma.
Ambos terminan en un pedido (`requests/new_<ts>`) y un aviso a Claude.

### Biblioteca
Catálogo único y ordenado de **lo aprobado**: *Estilos* (de `exp_styles` con estado aprobado, con su demo animada), *Transiciones*, *Textos*, *Fondos*, *Subtítulos*, *Sonidos* (del catálogo `StudioLib` del Estudio) y *Referencias* (links y videos guardados). Búsqueda, filtros por tipo, vista previa viva (hover/tap), ficha con "qué hace / cuándo usarlo / reglas que lo tocan" y dos acciones: **Usar en un video nuevo** (abre Crear con ese estilo elegido) y **Probar en el Estudio**. Los estilos nuevos aprobados en el Laboratorio aparecen solos.

### Laboratorio
Tres pestañas: **Ronda** (tarjetas con demo animada; Me gusta / Quizás / No con nota; progreso; comentario general; los cambios sin enviar quedan en Notas), **Referencias** (pegar links o subir videos; estados Guardada → Enviada → Analizada → Estilo listo), **Estilos** (en prueba / aprobados / descartados; aprobar pasa a la Biblioteca).

### Métricas
Solo redes. Selector Total / cuenta. Rango 7/30 días. Tarjetas grandes: vistas, seguidores (neto, ganados, perdidos), interacciones, alcance, reels publicados. Curva de evolución, tabla de **mejores reels** (nombre de pieza, vistas, interacciones, fecha), **ritmo de publicación** (agendados por día y hueco de contenido), mejor hora para publicar. Datos de Metricool (`IGRE*` y evolución); si no hay conexión, últimos datos guardados con la marca "dato guardado hace…". Sin dinero.

### Logros
Definiciones por hitos de redes: seguidores, vistas de reels (150 días), interacciones, reel más visto, reels publicados, vistas en 7 días, seguidores nuevos en 7 días, **racha de días con contenido**. Niveles Bronce, Plata, Oro, Platino, Diamante; XP; por cuenta o total; "próximos 3"; celebración al desbloquear (medalla con rebote, 4 destellos, vibración corta) y compartir. Solo se guarda cuáles vio Daniel (`home/trophies`).

### Notas
Bandeja con lo que está sin enviar (notas por cuadro, feedback por video, cambios de subtítulos, referencias, calificaciones de ronda, comentarios generales), con **Deshacer** por elemento y el botón **Enviar cambios**, que marca todo como enviado y avisa a Claude una sola vez. Historial de enviadas y resueltas.

### Estudio y Ajustes
Ver §6 y §7.

## 4. Jarvis

- Capacidad `sample` con herramientas: `go_to`, `propose_approval` (siempre con botón de confirmación), `mark_todo_done`, `leave_feedback`, `ask_claude` (para trabajo real: producir, rehacer, agendar, Metricool, Higgsfield), `open_studio`, `new_request`. Sin `request_sales_refresh` ni datos de ventas.
- Hablá en español claro, 1 a 3 frases, solo con datos del resumen (`jvBrief`); nunca decir que algo está hecho si solo se pidió.
- Panel nacido del orbe: conversación, chips sugeridos, tarjeta de confirmación, entrada por voz (Web Speech) y respuesta hablada opcional. Errores amables (límite de uso, sesión vencida, sin permiso).
- Sin la capacidad: modo local por reglas (responde pendientes, contenido, navega) para que el orbe siempre sirva.

## 5. Datos y conexión

Capacidades de artefacto: `db`, `assets`, `comments`, `downloads`, `mcp` (metricool), `sample`, `user`. Mismas colecciones que hoy (no se migra nada): `brands, videos, notes, metrics, evolution, refs, exp_styles, exp_rounds, exp_cards, home, requests, system, rounds, schedule, versions, transcripts, feedback, submissions, diag`. **Ya no se lee** `affiliate`. Detalle campo por campo en `CONTRATO-DE-DATOS.md`.

La interfaz habla con un **adaptador** (Claude real / memoria de demostración / simulador de pruebas). Ninguna vista llama a `window.claude` directo.

## 6. Estudio (recreado, mismo motor)

Misma lógica y mismo renderizador que hoy (modelo puro, reglas de calidad, catálogo, `StudioRenderer` con GSAP; lo que se ve es lo que se exporta, 1080×1920 a 30 fps), con una piel nueva minimalista de vidrio:
- **Arriba:** volver, nombre de la pieza, versiones (v1…v4 con punto de estado), guardado, deshacer/rehacer, reglas (n), Pedirle a Claude, Exportar.
- **Izquierda – Biblioteca del Estudio:** Fondos · Texto · Transiciones · Imágenes · Subtítulos · Sonido · Estilos. Un toque agrega al cursor.
- **Centro:** teléfono con el video, selección en el cuadro (arrastrar texto/medios), zona segura, play/pausa, barra, código de tiempo, silenciar.
- **Derecha:** Ajustes del elemento · Transcripción (editable, clic salta) · Medios · Claude (pedidos con pasos) · Exportar (formatos y calidad, SRT, copia).
- **Abajo:** línea de tiempo con pistas (fondo, medios, texto, subtítulos, sonido, notas), regla, cabezal, arrastrar/estirar/dividir/duplicar con imán, zoom.
- Atajos: `Espacio`, `←/→` cuadro, `Shift` ×10, `S` dividir, `D` duplicar, `Del`, `⌘Z/⇧⌘Z`, `N` nota.
- En teléfono: vista previa grande, línea de tiempo plegable, panel inferior deslizable (hoja) con las mismas pestañas.
- Si una versión aún no tiene especificación: modo simple (video y transcripción) con el botón "Abrir en el editor completo" (le pide a Claude armar el spec).

## 7. Multi espacio (para vender)

Todo lo propio de Daniel vive en un **preset de espacio** (`App.config`): nombre del espacio, cuentas (id, nombre, @, blogId, color, idioma), formatos de producción, etiquetas de problema, materia prima, textos de Jarvis, objetivos de logros. Se entrega el preset **KT** y un segundo preset **Lumen** (marca ficticia, otro idioma y otras cuentas) para probar que la interfaz no depende de KT. Ver `MASTER-PLAN.md` §6 para lo que falta para ser un SaaS real (autenticación, tenencia, cobro, workers, OAuth de Metricool).

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
