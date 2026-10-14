# Master prompt · Ronda 2 · Propuesta C · "Aura"

> Copiá todo este documento como primer mensaje a Claude (o a quien construya). Imágenes de referencia: `r2c-hoy.jpg`, `r2c-aprobar.jpg`, `r2c-morph.jpg`, `r2c-movil.jpg`.

## Tu rol y el listón

Sos un equipo senior de producto (diseño de interfaz, motion design, frontend y backend) construyendo un SaaS que se va a vender como una marca de US$100,000. Limpio, moderno, minimalista, con transiciones morph y animaciones que dan placer. Claridad antes que decoración.

## La idea

**Aura** es luminosa: color vivo que respira muy lento detrás de vidrio líquido. Jarvis no es un botón escondido: es un **orbe** en el centro de la experiencia que te dice el día en una frase y, cuando le hablás, se estira como una gota hasta convertirse en el panel de la respuesta. Las tarjetas también nacen y vuelven como líquido. La sensación: ligereza, optimismo, una herramienta que se siente viva y amable.

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

- **Barra superior de vidrio:** cliente a la izquierda, navegación en cápsula al centro (la sección activa en tinta oscura, contador de Aprobar en damasco), fecha y avatar a la derecha.
- **Inicio = conversación + tarjetas.** Columna izquierda: el orbe (132 px), "Buenas noches, Daniel" con una mini onda de voz, la frase del día en 56 px peso 300 con lo importante en 500 y un resaltado damasco ("Entraron **$96** hoy. Inglés necesita ‹5 videos› antes del jueves."), acciones en cápsulas (la principal en tinta con el contador) y el campo "Preguntale a Jarvis" con micrófono. Columna derecha: tarjetas de vidrio líquido en mosaico (comisión con anillo de meta en degradé teal → damasco, para aprobar con 3 videos, contenido asegurado por marca, logros con nivel, barra de XP y estante de 5 medallas).
- **Aprobar = video con conversación.** Video al centro en un marco de vidrio, con un resplandor cálido tomado de sus colores; a la izquierda las versiones como cápsulas con anillo de puntaje (la actual en tinta); a la derecha Jarvis opina en una burbuja ("v2 puede ser la mejor de la pieza...") y debajo los factores; abajo una cápsula de vidrio con Rechazar · Quizás · **Aprobar v2**. Progreso arriba con barra en degradé.
- **Teléfono:** orbe arriba, frase, cápsulas de acción, tarjetas; aprobar con video a pantalla completa, versiones como burbujas a la derecha y cápsula de vidrio abajo; logros con celebración (medalla grande, destellos, próxima meta, compartir).

## Sistema de diseño

```css
:root {
  --base: #eef2f0;
  --ink: #0d1b1d;  --ink2: #4b5b5d;  --ink3: #8a9799;
  --teal: #0f6b6c;  --apricot: #ffad85;  --rose: #f7a6bd;  --sand: #f3dcb2;  --mint: #a9e6d3;
  --up: #0f8a5f;  --down: #d9473a;  --warn: #c28400;
  --font: "Onest", system-ui, sans-serif;
}
```

- **Fondo vivo:** 4 o 5 manchas grandes (teal profundo, damasco, rosa, menta, arena) con `filter: blur(70px)`, que se desplazan muy lento (un ciclo cada 40 s). Nada de violeta a azul.
- **Vidrio líquido:** `linear-gradient(160deg, rgba(255,255,255,.66), rgba(255,255,255,.34))`, `backdrop-filter: blur(30px) saturate(1.6)`, borde especular blanco arriba, reflejo diagonal sutil y sombra teñida de teal. Radios: 22–30 tarjetas, cápsulas redondeadas por completo, 40 el marco del video.
- **El orbe:** esfera con degradé cónico (teal, menta, durazno, damasco, rosa), brillo especular arriba a la izquierda y sombra interna; respira y gira el degradé muy lento.
- **Tipo:** Onest. Frases grandes en 300 con lo importante en 500; cifras en 300 con tracking -0.055em. Una sola familia.
- **Color con criterio:** el acento de acción es la tinta oscura; el damasco marca lo destacado (contadores, resaltados); teal y damasco juntos solo en anillos y barras de progreso.

## Sistema de movimiento

- **Física de gota:** resorte con rebote visible y tensión superficial. La forma se mueve primero y el contenido llega 160 ms después. Gota 320 ms; contenido 160 ms; fondo 40 s por ciclo.
- **Morph orbe → panel (la firma):** tocás el orbe o decís "Jarvis" y respira más rápido (0 ms); la gota se estira hacia el centro mientras el resto se desenfoca (160 ms); se aplana y toma la forma del panel (320 ms); el vidrio se aclara y la respuesta aparece línea por línea (480 ms). Se logra con un filtro SVG de "goo" (desenfoque + umbral de alfa) sobre las formas durante la transición, y con `view-transition-name` para el contenido. Al cerrar, el panel vuelve a ser gota y regresa al orbe.
- **Tarjetas:** al tocar una tarjeta, se estira hacia su pantalla con el mismo líquido; los números cuentan; los anillos se llenan desde las 12.
- **Celebraciones:** al desbloquear un trofeo, la medalla cae con rebote, gira media vuelta y suelta 4 destellos; vibración corta en el teléfono.
- **Movimiento reducido:** el fondo queda quieto, sin gota (fundido simple), sin destellos.

## Pantallas

**Compu:** Inicio, Aprobar, Jarvis abierto, más Números, Ventas, Logros, Laboratorio, Notas y Ajustes con tarjetas de vidrio sobre el mismo fondo vivo.

**Teléfono:** Inicio (orbe, frase, cápsulas, comisión con anillo, contenido asegurado, barra de pestañas con el orbe al centro), Aprobar (video completo, burbujas de versión, cápsula de decisión, progreso arriba), Logros (celebración del trofeo nuevo con próxima meta y "Compartir el logro").

## Atajos

`⌘K` o "Jarvis" para hablar · `↵` acción principal · `A/Q/R` decidir · `←/→` versión · `Esc` cerrar el panel.

## Estados, accesibilidad y responsive

Vacíos donde Jarvis dice qué hacer en una frase; esqueletos de vidrio que respiran; error con reintento. **Contraste:** el texto nunca va directo sobre el fondo de color, siempre sobre vidrio con suficiente opacidad (verificá 4.5:1 en las zonas teal); foco visible en tinta con 2 px de separación; `aria-live` para el asistente. Breakpoints: ≥1280 dos columnas, 1024 tarjetas debajo de la conversación, <768 experiencia de teléfono propia.

## Stack sugerido

Next.js + TypeScript, Tailwind con estos tokens, Radix UI, Framer Motion (resortes y `layoutId`) más View Transitions API, filtro SVG de goo para los morph líquidos, canvas o CSS para el fondo vivo (pausado fuera de pantalla), TanStack Query, Postgres multi espacio con seguridad por fila.

## Criterios de aceptación

- La frase del día responde "cómo voy y qué hago" sin leer nada más.
- El morph orbe → panel corre a 60 fps y el fondo vivo no baja de 60 fps ni calienta el teléfono (se pausa en segundo plano).
- Todo texto cumple 4.5:1 sobre su vidrio en cualquier posición del fondo.
- Se ve y funciona igual de bien en compu y en teléfono.
