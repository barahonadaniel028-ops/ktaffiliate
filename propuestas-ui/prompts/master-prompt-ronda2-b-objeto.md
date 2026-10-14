# Master prompt · Ronda 2 · Propuesta B · "Objeto"

> Copiá todo este documento como primer mensaje a Claude (o a quien construya). Imágenes de referencia: `r2b-hoy.jpg`, `r2b-aprobar.jpg`, `r2b-morph.jpg`, `r2b-movil.jpg`.

## Tu rol y el listón

Sos un equipo senior de producto (diseño de interfaz, motion design, frontend y backend) construyendo un SaaS que se va a vender como una marca de US$100,000. Limpio, moderno, minimalista, con transiciones morph y animaciones que dan placer. Claridad antes que decoración.

## La idea

**Objeto** trata el portal como un aparato de diseño industrial bien hecho: carcasa gris cálida, caras blancas, tinta negra y **un solo punto naranja** para lo que se toca. Medidores con aguja para las metas, barras de segmentos para los días de contenido, teclas con recorrido real que bajan al tocarlas. Todo es preciso, táctil y silencioso. La sensación: confianza, orden, el placer de un objeto que funciona perfecto.

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

- **Barra superior:** logotipo con el punto naranja y el nombre del cliente en mono; al centro un selector segmentado (Hoy, Aprobar con contador naranja, Números, Ventas, Logros, Laboratorio) con la opción activa como tecla levantada; a la derecha fecha y hora en mono y una **perilla** que es Jarvis (con su LED).
- **Inicio = tablero de paneles** en una grilla de 12 columnas con 16 px de separación: panel grande "Ahora · urgente" (titular de 52 px, tira de 6 videos con puntaje, teclas "Empezar ↵" y "Ver todas V"); panel de comisión (cifra de 92 px peso 300, **medidor con aguja** al 83% de la meta, tres cifras debajo); fila de tres paneles chicos: contenido asegurado (14 segmentos por marca: sólido agendado, contorno aprobado, rayado rojo hueco), vistas de 7 días con curva, logros con nivel y barra de XP de 20 segmentos.
- **Aprobar = mesa de comparación:** las 4 versiones de una pieza lado a lado, cada una con su puntaje grande coloreado, un medidor horizontal y tres teclas (✕ · reloj · ✓). La elegida lleva un anillo naranja; la descartada se apaga a gris. Panel derecho: "Jarvis compara", tabla de factores (● sí, ○ no) y notas por cuadro. Pie: progreso de piezas en segmentos y teclas "Rechazar v4 R" y "**Aprobar v1 y v2 A**".
- **Teléfono:** paneles apilados; aprobar como pila de tarjetas con sello ("APROBAR") al deslizar y teclas abajo; Jarvis como perilla con onda de voz, medidor y confirmación. Barra inferior tipo selector físico.

## Sistema de diseño

```css
:root {
  --body: #e9e9e4;  --bezel: #dcdcd6;  --face: #fbfbf9;  --face2: #f3f3ef;
  --line: rgba(20,20,18,.09);  --line2: rgba(20,20,18,.16);
  --ink: #111110;  --ink2: #5d5e5a;  --ink3: #9a9b95;
  --dot: #ff4f00;      /* el unico acento: lo que se toca y la meta */
  --up: #138a52;  --down: #d43b2a;  --warn: #c98a00;
  --font: "Albert Sans", system-ui, sans-serif;  --mono: "IBM Plex Mono", ui-monospace, monospace;
}
```

- **Paneles:** cara `--face`, radio 22, borde de 1 px, luz blanca arriba y sombra corta. Un tornillo decorativo solo en el panel principal.
- **Teclas:** naranja con degradé vertical, sombra inferior sólida de 4 px (`0 4px 0 #b83600`) que desaparece al presionar (baja 2 px). Teclas blancas con la misma física. Etiqueta del atajo en un recuadro mono.
- **Tipo:** Albert Sans 300–700 (cifras grandes en 300 con tracking -0.06em), IBM Plex Mono 11 px en mayúsculas con tracking 0.08em para etiquetas.
- **Indicadores:** LED de 8 px con halo suave para estados (rojo urgente, verde en vivo, naranja Jarvis).

## Sistema de movimiento

- **Mecánico, sin rebote:** arranca firme y frena suave, como una bandeja bien engrasada (`cubic-bezier(.3,0,.1,1)`). Tecla 90 ms, pliegue 200 ms, morph 520 ms.
- **Morph número → página (la firma):** al tocar la comisión, el panel se levanta 4 px y se enciende un borde naranja (0 ms); los otros paneles se pliegan hacia abajo y la comisión ocupa todo el aparato (200 ms); el medidor se convierte en el gráfico de barras, que crece desde la base (380 ms); las ventas entran desde la derecha de a una, con 40 ms entre cada una (520 ms). El número es el mismo elemento de punta a punta: `view-transition-name: comision`.
- **Agujas y segmentos:** la aguja del medidor gira hasta su valor con una leve sobrecarrera; los segmentos de días se encienden de izquierda a derecha con 20 ms entre cada uno.
- **Sonido opcional:** clic suave al presionar teclas (apagable en ajustes, apagado por defecto en el teléfono).
- **Movimiento reducido:** sin pliegues ni agujas en movimiento, solo cambios de opacidad.

## Pantallas

**Compu:** Hoy, Aprobar (mesa), Ventas (destino del morph: cifra de 132 px, proyección "a tu ritmo, el viernes", gráfico de 30 días con línea de ritmo, acumulado, pagado, en camino y lista de ventas), más Números, Logros, Laboratorio, Notas y Ajustes con el mismo sistema de paneles.

**Teléfono:** Hoy (panel urgente, comisión con medidor, dos paneles chicos, barra inferior), Aprobar (pila de tarjetas con sello al deslizar, teclas grandes), Jarvis (perilla, onda, frase, medidor, confirmación, teclado · micrófono · cerrar).

## Atajos

`⌘K` perilla/Jarvis · `↵` empezar · `1–4` elegir versión · `A` aprobar elegidas · `R` rechazar · `Q` quizás · `→` pieza siguiente · `⌘Z` deshacer.

## Estados, accesibilidad y responsive

Vacíos con LED apagado y una frase de qué hacer; esqueletos con la forma de cada panel; error con LED rojo y reintento. Contraste 4.5:1, foco visible naranja con 2 px de separación, teclas operables con teclado y lector de pantalla, `aria-live` para avisos. Breakpoints: ≥1280 grilla de 12, 1024 de 8, 768 de 4 con paneles apilados, <768 experiencia de teléfono.

## Stack sugerido

Next.js + TypeScript, Tailwind con estos tokens, Radix UI, View Transitions API con respaldo de Framer Motion (`layoutId`), SVG propio para medidores y barras, TanStack Query, Postgres multi espacio con seguridad por fila.

## Criterios de aceptación

- Cada panel se lee en menos de 2 segundos sin leer etiquetas largas.
- El morph número → página corre a 60 fps y el número nunca desaparece ni se duplica.
- Comparar y resolver una pieza de 4 versiones toma menos de 15 segundos.
- Se ve y funciona igual de bien en compu y en teléfono.
