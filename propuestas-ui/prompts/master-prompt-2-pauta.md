# Master prompt · Versión 2 · "Pauta" (editorial clara)

> Copiá todo este documento como primer mensaje a Claude (o a quien construya). Es la especificación completa: producto, funciones, modelo de interfaz, sistema de diseño, pantallas de compu y de teléfono, y criterios de aceptación. Las imágenes de referencia son `p2-home.jpg`, `p2-review.jpg`, `p2-system.jpg`, `p2-mobile.jpg` y `p2-mobile2.jpg`.

## Tu rol

Sos un equipo senior de producto (diseño de interfaz, ingeniería frontend y backend) construyendo un SaaS que se va a vender. El listón es una herramienta de US$100,000: premium, minimalista, clara, rápida y agradable de abrir todos los días. Cada pantalla tiene una idea principal y una acción principal. Lo demás espera su turno.

## La idea de esta versión

**Pauta** cuenta el negocio como un diario bien diseñado. En vez de un tablero lleno de cajas, abre con un titular que resume el día en una frase ("Buenas noches, Daniel. Entraron $96 hoy y te esperan 70 videos.") y después baja en secciones con aire: la plata, las cuentas, lo que hay para revisar, lo que viene. Fondo claro plateado, tinta casi negra, un solo azul cobalto, una serif editorial para titulares y cifras. La sensación buscada: claridad, calma, confianza. Es la versión más fácil de vender a creadores que no son técnicos y a sus clientes.

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

- **Marco de la app (compu):** barra superior de 76 px, sin barra lateral. Contenido centrado de 1,200 px de ancho. Secciones separadas por un título serif con una línea fina debajo, nunca por cajas apiladas.
- **Barra superior:** marca del producto (o la del cliente en marca blanca), selector de espacio en una píldora (logo, nombre, menú con espacios y marcas), navegación en texto con la sección activa como píldora blanca: Hoy, Revisar (contador en cobalto), Calendario, Números, Laboratorio, Logros, Notas. A la derecha: buscar, píldora "Preguntale a Jarvis ⌘K" con el orbe, avatar.
- **Jerarquía de lectura:** titular → lo urgente → la plata → las cuentas → para revisar → contenido asegurado y logros → materia prima, laboratorio y notas. Cada bloque responde una pregunta.
- **Revisar = mesa de luz:** se compara una pieza a la vez con sus 4 versiones lado a lado, y un panel derecho donde el asistente explica cuál conviene y por qué. Se aprueba la pieza entera de un golpe ("Aprobar v1 y v2").
- **Teléfono:** barra de pestañas flotante tipo píldora (Hoy, Revisar, orbe de Jarvis al centro, Números, Logros). Revisar con una versión por pantalla y deslizamiento horizontal entre v1 y v4. Jarvis como conversación con burbujas y tarjeta de confirmación.

## Sistema de diseño (tokens exactos)

```css
:root {
  --canvas: #f1f2f4;  --surface: #ffffff;  --sunk: #f6f7f9;  --tint: #e9ebef;
  --hair: rgba(13,16,21,.08);  --hair2: rgba(13,16,21,.14);
  --ink: #0d1015;  --ink2: #4a5262;  --ink3: #8c94a3;
  --accent: #2233ff;  --accent-soft: rgba(34,51,255,.07);
  --up: #0e8a5a;  --down: #d8443b;  --warn: #b97a06;   /* semántica, siempre con su fondo suave */
  --brand-es: #e8742a;  --brand-en: #7c5cfa;            /* vienen de la marca, son configurables */
  --serif: "Instrument Serif", Georgia, serif;
  --sans: "Instrument Sans", system-ui, sans-serif;
  --e1: 0 1px 2px rgba(13,16,21,.05), 0 0 0 1px var(--hair);
  --e2: 0 1px 2px rgba(13,16,21,.04), 0 12px 32px -14px rgba(20,28,60,.18), 0 0 0 1px var(--hair);
}
```

- **Por qué serif:** el producto se presenta como una publicación diaria del negocio; la serif editorial (Instrument Serif) lleva titulares y cifras grandes, y su cursiva en cobalto marca lo importante dentro del titular. Todo lo que se toca (botones, etiquetas, tablas, formularios) va en Instrument Sans. Dos familias, nunca tres.
- **Escala:** titular 76/1.0 (40 en teléfono), cifra estrella 120 (54 en teléfono), títulos de sección 34, cifras de cuenta 52, cifras secundarias 26–30, cuerpo 14.5, etiquetas 12.5. Números con `tabular-nums`.
- **Un solo acento (cobalto):** sección activa, acción principal de aprobar, línea de la comisión, cursiva del titular. El botón primario neutro es negro tinta. Verde y rojo solo para variaciones y estados.
- **Superficies:** tarjetas blancas de radio 20 con sombra `--e1`; el bloque de la plata usa `--e2` porque es el pico de la página. Botones y píldoras redondeados por completo. Miniaturas de video con radio 14 y sombra baja.
- **Espaciado** en base 4, secciones separadas por 64 px, más aire arriba de cada título que debajo.
- **Movimiento:** solo `transform` y `opacity`, 160–220 ms, `cubic-bezier(.23,1,.32,1)`. Las cifras grandes cuentan desde el valor anterior en 600 ms la primera vez del día. Movimiento reducido: sin conteo.
- **Prohibido:** degradés en texto, brillos, tarjetas idénticas como estructura de página, más de un acento, la crema con dorado de manual, emojis como iconos (set de trazo 1.6 px).

## Componentes

Titular con cursiva de acento, lista de urgentes (punto de color, título, detalle, botón redondo; el primero en negro), bloque de plata (cifra 120, tres cifras secundarias, gráfico de área con línea de meta punteada y etiqueta, barra de meta, ventas recientes en línea), columna de cuenta (monograma con color de la marca, tres cifras serif con píldora de variación, sparkline ancha, **nota del asistente** en cursiva serif con filete del color de la marca, mejor reel), hoja de contactos (miniaturas 9:16 con píldora de puntaje y cantidad de versiones), tira de 14 días (sólido agendado, contorno aprobado, rayado rojo hueco), estante de medallas (desbloqueadas a color, bloqueadas en gris), anillo de nivel, columna de versión (encabezado con tipo de gancho y puntaje serif coloreado, video, botones ✕ · reloj · ✓), tabla comparativa de factores (● sí, ○ no), píldora de selector de espacio, asistente de alta por pasos, vista previa en vivo en marco de navegador, tarjeta de plan (la destacada en negro), hoja inferior de espacios en teléfono, burbujas de chat y tarjeta de confirmación.

## Pantallas de compu

1. **Hoy.** Fecha y hora pequeñas, titular de tres líneas con dos cifras en cursiva cobalto, y a la derecha "Lo que necesita tu mano" (3 urgentes). Bloque de la plata a lo ancho. "Las cuentas" en dos columnas tipo diario separadas por una línea vertical, cada una con su nota del asistente. "Para revisar" como hoja de contactos de 6 piezas con "Revisar los 70". Fila de dos: contenido asegurado (tira de 14 días por marca) y logros (nivel + estante). Fila de tres: materia prima, laboratorio, notas.
2. **Revisar (mesa de luz).** Pieza 4 de 18, título serif, datos de salida, selector Comparar / Una por una / Zona segura. Cuatro columnas de versión; la recomendada lleva la etiqueta del asistente; las elegidas quedan con anillo cobalto y tilde; la descartada se apaga. Panel derecho: "Jarvis compara" en serif, tabla de factores por versión, notas por cuadro, "Aprobar v1 y v2" (cobalto) y "Rechazar v4 y seguir". Tira inferior con las piezas siguientes (hechas en verde con tilde) y atajos.
3. **Alta de una marca nueva (producto vendible).** Asistente de 5 pasos (Cuenta, Marca, Conexiones, Módulos, Listo) con el paso 2 abierto: nombre, idioma, logo, color de acento, nombre y voz del asistente, cuenta principal conectada, meta de días de contenido. A la derecha, **vista previa en vivo** del portal del cliente con su color, su logo y su asistente ("Preguntale a Nora"), en su dominio. Debajo, planes: Creador, Estudio (destacado), Agencia, con lo que incluye cada uno.
4. También: Calendario, Números, Laboratorio, Logros, Notas, Pedir video y Ajustes con el mismo lenguaje (titular serif, secciones con línea fina, tarjetas blancas solo cuando agrupan).

## Pantallas de teléfono

1. **Hoy:** selector de espacio en píldora + avatar, titular de dos líneas con la cifra en cursiva, tarjeta de 3 urgentes, tarjeta de comisión con la curva al pie.
2. **Revisar:** pieza y título serif, video grande con etiquetas de versión y puntaje, puntos de v1 a v4, ✕ · **Aprobar v1** · nota. Deslizar a los lados cambia de versión; deslizar hacia arriba pasa a la pieza siguiente.
3. **Jarvis:** conversación con burbujas (respuesta en serif, con mini cifras), tarjeta de confirmación, chips sugeridos, campo "Escribí o hablale" con micrófono cobalto.
4. **Números:** selector de marca, cifras de 7 días con sparkline, "qué versión funciona" en barras.
5. **Logros:** nivel, medallas de la semana con su rango, camino a $30,000 al mes.
6. **Espacios:** hoja inferior con espacios y sus marcas (con contadores), crear un espacio nuevo.

## Atajos de teclado

`⌘K` buscar y preguntarle al asistente · `G` luego `H/R/C/N/L/O` para ir a cada sección · en Revisar: `1–4` elegir versión, `A` aprobar las elegidas, `R` rechazar, `Q` quizás, `Espacio` reproducir, `N` nota en el cuadro, `→` pieza siguiente, `⌘Z` deshacer · `?` ayuda.

## Estados que tienen que existir

Vacíos que dicen qué hacer y con un titular amable ("Nada para revisar. Pedí un video nuevo o descansá."), esqueletos del mismo tamaño que el contenido, error con reintento, dato viejo con "Pedir datos frescos", sin permiso por rol, sin micrófono (explica el dictado), primera vez del espacio (el titular invita a conectar la primera cuenta). **Deshacer** por 8 segundos en toda acción en lote.

## Responsive

≥1280: diseño descrito. 1024–1279: contenido a 960 px, hoja de contactos de 4. 768–1023: navegación en menú, columnas de cuentas apiladas, mesa de luz de 2 columnas con desplazamiento. <768: experiencia de teléfono propia (titular a 40 px, cifras a 54, pestañas abajo). Objetivos táctiles de 44 px. Respetá `safe-area-inset`.

## Accesibilidad

Contraste 4.5:1 en texto y 3:1 en controles (verificá el cobalto sobre blanco y el gris `--ink3` solo para texto secundario grande o etiquetas), foco visible cobalto con 2 px de separación, todo operable con teclado, `aria-live` para avisos y para el asistente, subtítulos en los videos, movimiento reducido respetado.

## Stack sugerido

Next.js (App Router) + TypeScript, Tailwind con estos tokens, Radix UI, Framer Motion, TanStack Query, Postgres con seguridad por fila por `workspaceId`, video con streaming HLS y miniaturas por cuadro, colas para los pedidos a la IA, Stripe para planes y facturación, temas por espacio guardados como tokens (acento, logo, nombre del asistente) y aplicados como variables CSS en el servidor para que la marca blanca no parpadee.

## Criterios de aceptación

- La pantalla Hoy se entiende en 5 segundos: el titular dice cuánto entró y cuánto hay para revisar.
- Comparar y resolver una pieza de 4 versiones toma menos de 15 segundos.
- Un cliente nuevo crea su espacio con su marca, su color y su asistente en menos de 5 minutos, viendo el resultado en vivo mientras lo arma.
- Ningún texto de KT queda escrito en el código.
- Lighthouse 95+ en rendimiento y accesibilidad; la hoja de contactos carga miniaturas progresivas sin saltos de diseño.
- Se ve y funciona igual de bien en compu y en teléfono, con pantallas pensadas para cada uno.
