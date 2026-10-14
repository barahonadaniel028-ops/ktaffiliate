# Master prompt · Ronda 2 · Propuesta A · "Halo"

> Copiá todo este documento como primer mensaje a Claude (o a quien construya). Imágenes de referencia: `r2a-hoy.jpg`, `r2a-aprobar.jpg`, `r2a-morph.jpg`, `r2a-movil.jpg`.

## Tu rol y el listón

Sos un equipo senior de producto (diseño de interfaz, motion design, frontend y backend) construyendo un SaaS que se va a vender como una marca de US$100,000. Limpio, moderno, minimalista, con transiciones que se transforman de una pantalla a otra (morph) y animaciones que dan placer. Claridad antes que decoración: cada pantalla dice UNA cosa importante y ofrece UN botón principal. Lo demás espera.

## La idea

**Halo** es una habitación oscura con una sola luz cálida arriba. Todo flota en vidrio. Una píldora en la parte superior (el halo) es el corazón del sistema y se transforma según el momento: en reposo es el buscador y la puerta a Jarvis; al aprobar muestra el progreso ("Aprobando KT English · 12 de 70 · ≈ 9 min"); con `⌘K` o la voz se abre y se vuelve el asistente. La sensación: calma, foco, lujo silencioso.

## El producto (igual en las tres versiones)

Un sistema operativo para creadores, estudios y agencias que producen videos cortos (Reels, TikTok, Shorts) con ayuda de IA, los aprueban, los agendan, miden qué funciona y ven cuánto venden por afiliados. Es **multi-espacio y multi-marca**: cualquier persona o empresa crea su espacio, conecta sus cuentas y lo usa con su propia marca (marca blanca). El primer cliente real es **KT Media** (Daniel), con dos marcas: **KT Español** (@ktespanol) y **KT English** (@kevintrudeaubeststudent). Usá esos datos como datos de ejemplo, pero no dejes nada de KT escrito a fuego en el código: todo nombre, color, idioma, meta y regla sale de la configuración del espacio y de la marca.

### Jerarquía

`Espacio (cliente que paga) → Marcas (cada una con su idioma, color, cuentas y calendario) → Piezas (una idea de video) → Versiones (v1 a v4 de la misma pieza, con distinto gancho o estilo)`

Roles por espacio: **Dueño** (todo), **Editor** (sube, corrige notas, no ve dinero), **Aprobador / Cliente** (solo aprueba las marcas que se le asignan, por link sin cuenta si el plan lo permite), **IA productora** (Claude: produce, agenda y responde notas). Los permisos se aplican en el servidor, no solo escondiendo botones.

### Módulos (todos se pueden prender o apagar por espacio)

1. **Hoy (inicio).** Saludo según la hora y el nombre. Una frase de estado ("Tres cosas necesitan tu mano hoy" o "Todo al día"). Lista de pendientes ordenada por urgencia (`ahora`, `hoy`, `semana`), cada uno con su acción directa y "Hecho" cuando lo cierra la persona. Indicadores clave con tendencia: comisión de 30 días contra la meta, vistas de 7 días, seguidores nuevos, días de contenido asegurado contra la meta. Resumen de cuentas, ventas en vivo, calendario corto, materia prima, nivel de trofeos, ronda del laboratorio y feedback abierto. Reloj y fecha en la zona horaria del espacio.
2. **Aprobación (bandeja y revisión).** Pestañas por estado: *Por aprobar*, *Agendados*, *Rechazados*. Las versiones se agrupan por pieza, con un punto de estado por versión. Cada versión: video 9:16, gancho, estilo de gancho, fecha de salida, si ya está en la herramienta de agenda (Metricool) o si la IA la está agendando o reemplazando. Veredicto **Aprobar / Quizás / Rechazar**, nota libre que se guarda sola, motivos rápidos de rechazo en chips. **Puntaje de viralidad** 0 a 100 con semáforo (70+ bueno, 45 a 69 regular, menos de 45 flojo), factores que suman y restan con su evidencia ("pasó 1,000 vistas en 14 de 31 ganchos con eso"), consejos separados en "lo podés hacer vos" y "lo ajusta la IA sola". **Superposición de zona segura de Instagram Reels** encendible. **Revisión a pantalla completa**: reproductor con línea de tiempo, código de tiempo preciso, notas ancladas a un cuadro (marcas en la línea de tiempo, abiertas y resueltas, con la respuesta de la IA debajo), edición de subtítulos palabra por palabra. Selección por lote (elegir las 4 de una pieza, aprobar o rechazar en lote) con **Deshacer**. Al terminar: "¿Terminaste de revisar?" con comentario general que se envía a la IA. Avisos: "6 aprobados todavía no están agendados", "2 rechazados siguen en el calendario".
3. **Calendario.** Próximos 14 días por marca: agendado, aprobado sin agendar, hueco. Días de contenido asegurado contra la meta de la marca y la fecha en que se corta. Próximas publicaciones con hora.
4. **Métricas.** Rango (7, 30, 90 días, todo), métrica elegida (vistas, interacciones, seguidores, guardados). Tarjetas de totales con variación, gráfico por día o por semana con promedio, ranking por popularidad (reels o piezas), "qué versión funciona" (v1 a v4 promediado), "qué estilo de gancho funciona", tabla por pieza con las 4 versiones, tabla de todas las publicaciones con búsqueda y orden por columna. Hora de última actualización y botón para actualizar.
5. **Ventas (afiliados).** Comisión acumulada, pagado, en camino, para cobrar, barras de comisión por día, últimas ventas (nombre recortado, producto, empresa, comisión, etiqueta "Nueva" las primeras horas), frescura del dato (ACTUALIZADO, DESACTUALIZADO, SIN DATOS) y "Pedir datos frescos". Meta mensual visible.
6. **Pedir video.** Formulario por marca (tema, referencia, estilo aprobado, versiones, urgencia), cola de pedidos con estado (en producción, para revisar, listo, bloqueado), reglas del sistema que se aplican siempre y piezas o skills que usa la IA al producir.
7. **Laboratorio.** Referencias (archivos y links, de a uno o varios), **rondas de estilo** con demo en movimiento por tarjeta y voto **Keep / Quizás / Drop** con comentario, comentario general de la ronda, y **estilos aprobados** que después aparecen al pedir un video. Nada de esto toca lo agendado.
8. **Trofeos.** Niveles con XP, cinco rangos (Bronce, Plata, Oro, Platino, Diamante), hitos de redes (seguidores, vistas, interacciones, reel más visto, reels publicados, vistas y seguidores de 7 días) y de dinero (comisión acumulada, pagada, de 30 días, venta más grande, ventas de 30 días). El dinero vale 8 veces más XP. Metas "jefe" (primera meta de $500 al mes, meta final de $30,000 al mes). Celebración de trofeos nuevos desde la última visita. Vista total o por marca.
9. **Materia prima.** Inventario de lo que hace falta para producir, con tipos que define cada espacio (en KT: teachers, reactions, intros por marca), con nivel bueno, bajo o vacío y nota.
10. **Feedback.** Pedir cambios por pieza, por versiones elegidas, por marca o de todo el sistema. Borradores que se juntan y se envían con **Enviar cambios**. Listas de enviadas abiertas y resueltas, con la respuesta de la IA.
11. **Asistente (Jarvis, nombre configurable).** Voz y texto, respuestas en voz encendibles, chips sugeridos ("¿Qué tengo pendiente?", "¿Cuánto contenido queda?", "¿Cómo van las ventas?", "Llevame a por aprobar de inglés"). Herramientas: navegar, proponer una aprobación (siempre con botón de confirmación, nunca aprueba solo), marcar un pendiente como hecho, pedir ventas frescas, dejar feedback como borrador, preguntarle algo a la IA productora. Máximo de turnos por conversación. Si no hay micrófono, explica cómo dictar con el teclado.
12. **Sistema y ajustes.** Cambiar de espacio, crear uno nuevo, invitar a un cliente a aprobar. Marcas (idioma, color, cuentas, meta de días, reglas, estilos). Conexiones (Instagram, TikTok, YouTube, Metricool, redes de afiliados, Google Drive, IA productora) con estado. Módulos encendibles. Equipo y roles. Marca blanca (logo, color de acento, nombre y voz del asistente, dominio propio). Plan y facturación.

### Datos (entidades mínimas)

`Workspace, Brand, Account (red social), Integration, Member(role), Piece, Version(status, hook, hookStyle, score, scheduledAt, inScheduler, publishedAt, metrics), FrameNote(versionId, t, text, status, reply), CaptionWord, Request(video pedido), Rule, Style(status: prueba|aprobado), Reference, StyleRound, StyleVote, AffiliateSnapshot(totals, period, conversions[]), RawMaterial(type, count, level), Task(urgency, link, dismissable), Feedback(scope, status, reply), Trophy(seenAt), Level`. Todo lleva `workspaceId` y se filtra por espacio en el servidor.

### Reglas de contenido

- Español rioplatense con voseo ("Aprobá", "Tocá", "Escribí"), cálido y directo. Inglés completo como segundo idioma de la interfaz.
- Sin raya larga (em dash) en ningún texto visible: usá punto, coma, dos puntos o paréntesis.
- Números reales o ningún número. Si falta el dato: estado vacío que dice qué hacer, nunca un número inventado.
- Cada acción tiene un solo nombre en toda la app ("Aprobar", no "Aprobar" en un lado y "Dar OK" en otro).
- Nombres de clientes de ventas siempre recortados (María G.).

## Modelo de interfaz

- **Sin barra lateral pesada.** Un riel flotante de vidrio a la izquierda (56 px, solo iconos, el activo en luz cálida, contador de pendientes en la bandeja). Arriba: cliente y marcas a la izquierda, el halo al centro, fecha en mono y avatar a la derecha.
- **Inicio = una frase y un botón.** Saludo pequeño con un punto de estado, una frase de 60 px que dice lo más importante del día ("Inglés se queda sin contenido el jueves. Con 5 aprobados hoy llegás al 20."), una tarjeta de acción con un abanico de 5 videos (el del medio al frente, los demás rotados y en profundidad) y el botón "Empezar a aprobar ↵". Debajo, tres cifras sin cajas (comisión con curva, vistas, contenido asegurado). A la derecha, en voz baja: "Después" (3 pendientes), la última venta y el nivel.
- **Aprobar = escenario.** El video al centro (9:16, 392×697) con un resplandor ambiental tomado de sus colores; versiones a la izquierda como tarjetas de vidrio; a la derecha el puntaje enorme (112 px, peso 300, en luz cálida), los factores y las notas por cuadro; abajo un dock flotante: Rechazar `R` · Quizás `Q` · **Aprobar v2 `A`**. Una línea de 2 px arriba de todo marca el progreso.
- **Teléfono:** la isla dinámica hace de halo (muestra "12 de 70" y el puntaje mientras aprobás, y se expande en Jarvis). Barra de pestañas flotante de vidrio con el orbe al centro.

## Sistema de diseño

```css
:root {
  --bg: #0a0b0e;  --bg2: #0f1115;
  --stroke: rgba(255,255,255,.075);  --stroke2: rgba(255,255,255,.13);
  --ink: #f3f2ef;  --ink2: #a7a9b0;  --ink3: #6b6e78;
  --light: #f1dcb5;  --light-ink: #1c150a;   /* la unica luz: accion principal, activo, puntaje */
  --up: #8be3bf;  --down: #ff8f84;  --warn: #f3c77a;
  --font: "Geist", system-ui, sans-serif;  --mono: "Geist Mono", ui-monospace, monospace;
}
```

- **Fondo:** halo radial cálido arriba (`radial-gradient(520px 260px at 50% -40px, rgba(241,220,181,.20), transparent)`), anillos concéntricos casi invisibles y grano al 5%.
- **Vidrio:** `linear-gradient(180deg, rgba(255,255,255,.075), rgba(255,255,255,.025))`, `backdrop-filter: blur(28px) saturate(1.2)`, 1 px de luz arriba, sombra larga y negra. Radios: 22 píldoras, 30 tarjetas, 28 video.
- **Tipo:** Geist 300–600. Frase principal 60/1.02 con tracking -0.045em; cifras 40 con tracking -0.045em; puntaje 112 peso 300. Mono solo para fecha, códigos de tiempo y atajos.
- **Un solo acento** (la luz cálida). Nada de neón ni brillos en el texto.

## Sistema de movimiento

- **Curva única:** resorte con rebote leve (`stiffness 0.2, damping 0.9` o `cubic-bezier(.2,.9,.25,1)`). Salida 140 ms, morph 360 ms. Lo grande tarda más que lo chico.
- **Morph tarjeta → aprobar (la firma de esta propuesta):** al tocar la tarjeta de acción se hunde 1.5% y su borde se enciende (0 ms); la tarjeta crece hasta ocupar la escena mientras el resto se aleja 14 px y se desenfoca 6 px (180 ms); el video del frente queda al centro y las versiones entran desde la izquierda, el inspector desde la derecha (360 ms); el halo cambia de buscador a progreso en el mismo movimiento. Implementalo con **View Transitions API** (`document.startViewTransition` + `view-transition-name` en la tarjeta, el video y el halo) y un respaldo FLIP con Web Animations para navegadores sin soporte.
- **Morph halo → Jarvis:** la píldora se estira hasta un panel de 680 px con la pregunta, la respuesta, tres cifras y la tarjeta de confirmación. El fondo se oscurece y desenfoca 14 px. `Esc` la devuelve a su lugar con el mismo camino al revés.
- **Microinteracciones:** botones `scale(.97)` al presionar; números que cuentan desde el valor anterior (600 ms) la primera vez del día; la curva de comisión se dibuja de izquierda a derecha; el orbe respira (escala 1 → 1.04 cada 4 s) y late más rápido cuando escucha.
- **Movimiento reducido:** solo opacidad, sin desplazamientos ni desenfoques.

## Pantallas

**Compu:** Inicio, Aprobar (escenario), Jarvis (halo abierto), más Calendario, Números, Ventas, Laboratorio, Logros, Notas y Ajustes con el mismo lenguaje: una frase arriba, una acción, todo lo demás en voz baja.

**Teléfono:** Inicio (frase de 34 px, abanico de 3 videos, botón "Aprobar 60 versiones", dos cifras, última venta), Aprobar (video a pantalla completa, isla con progreso, puntos de versión, Rechazar · **Aprobar v2** · Quizás, deslizar para decidir), Jarvis (la isla crece hasta ocupar la parte de arriba: orbe, onda de voz, respuesta, confirmación, chips sugeridos, teclado · micrófono · cerrar).

## Atajos

`⌘K` halo/Jarvis · `↵` empezar a aprobar · `A/Q/R` decidir · `←/→` versión · `Espacio` pausa · `N` nota en el cuadro · `⌘Z` deshacer · `Esc` cerrar.

## Estados, accesibilidad y responsive

Vacíos con una frase amable y una acción; esqueletos con el mismo vidrio; error con reintento; dato viejo marcado. Contraste 4.5:1 (cuidado con `--ink3` sobre negro: solo para texto secundario), foco visible en luz cálida, `aria-live` para el halo y el asistente, todo operable con teclado. Breakpoints: ≥1280 completo, 1024 riel compacto, 768 riel abajo, <768 experiencia de teléfono propia.

## Stack sugerido

Next.js + TypeScript, Tailwind con estos tokens, Radix UI, View Transitions API con respaldo de Framer Motion (`layoutId` para los elementos compartidos), TanStack Query, Postgres multi espacio con seguridad por fila, video HLS con miniaturas por cuadro.

## Criterios de aceptación

- El inicio se entiende en 3 segundos y tiene un solo botón principal.
- El morph tarjeta → aprobar corre a 60 fps en una MacBook Air y en un iPhone de 3 años.
- Aprobar una versión con teclado toma menos de 2 segundos.
- Nada parpadea al cambiar de pantalla: todo elemento compartido viaja, ninguno reaparece.
- Se ve y funciona igual de bien en compu y en teléfono.
