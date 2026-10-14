# Master prompt · Versión 1 · "Mando" (Obsidiana)

> Copiá todo este documento como primer mensaje a Claude (o a quien construya). Es la especificación completa: producto, funciones, modelo de interfaz, sistema de diseño, pantallas de compu y de teléfono, y criterios de aceptación. Las imágenes de referencia son `p1-home.jpg`, `p1-review.jpg`, `p1-system.jpg`, `p1-mobile.jpg` y `p1-mobile2.jpg`.

## Tu rol

Sos un equipo senior de producto (diseño de interfaz, ingeniería frontend y backend) construyendo un SaaS que se va a vender. El listón es una herramienta de US$100,000: premium, minimalista, rápida, sin decoración que no trabaje, y que se sienta bien usarla todos los días. Cada pantalla tiene una acción principal clara. Si algo no ayuda a decidir o a actuar, sale.

## La idea de esta versión

**Mando** es un centro de mando oscuro y silencioso para quien opera muchas piezas por día. El modelo de interfaz es el de las mejores herramientas de trabajo profundo (bandeja de entrada + triage + paleta de comandos): todo cabe en una pantalla, todo se puede hacer con el teclado, y una sola luz de color (lima) marca lo que se puede tocar y lo que sube. La sensación buscada: control total, calma, velocidad.

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

- **Marco de la app (compu):** barra lateral fija de 248 px + barra superior de 64 px + contenido con 44 px de margen lateral. Contenido con ancho máximo de 1,200 px dentro de pantallas grandes.
- **Barra lateral:** selector de espacio arriba (logo del cliente, nombre, plan y cantidad de marcas, menú desplegable con todos los espacios, "Crear un espacio nuevo" e "Invitar a un cliente"). Debajo, buscador que abre la paleta (`⌘K`). Navegación: Hoy, Bandeja (contador en lima si hay pendientes), Calendario, Métricas, Ventas, Laboratorio, Trofeos, Feedback. Grupo **Marcas** con punto de color y contador por marca, y "Agregar marca". Abajo: tarjeta del asistente (orbe, nombre, campo "¿Cómo van las ventas?" con micrófono) y fila de la persona con estado de sincronización.
- **Las marcas son un filtro, no una sección aparte.** La bandeja es una sola; se filtra por marca. Así se aprueba todo en un solo flujo.
- **Paleta de comandos (`⌘K`) = asistente:** el mismo campo busca, navega y le habla a Jarvis. Escribir "aprobar inglés" ofrece la acción; escribir una pregunta la responde Jarvis en el mismo panel.
- **Triage:** pantalla de foco de tres columnas: cola (320 px) · escenario con el video (flexible) · inspector (392 px), con barra de acciones fija abajo.
- **Teléfono:** barra de pestañas flotante de 5 posiciones (Hoy, Bandeja, Jarvis al centro como orbe, Ventas, Trofeos). Triage a pantalla completa con deslizamiento. Jarvis a pantalla completa con orbe y onda de voz.

## Sistema de diseño (tokens exactos)

```css
:root {
  --canvas: #09090b;  --surface: #111114;  --raised: #18181c;  --sunk: #0c0c0e;
  --hair: rgba(255,255,255,.07);  --hair2: rgba(255,255,255,.11);  --edge: rgba(255,255,255,.06);
  --ink: #ededf0;  --ink2: #a3a3ad;  --ink3: #6c6c78;
  --accent: #d4ff3f;  --accent-ink: #0d1003;  --accent-soft: rgba(212,255,63,.10);
  --down: #ff6b6b;  --warn: #f2c14e;          /* rechazo y urgencia; positivo = acento */
  --brand-es: #ff8a3d;  --brand-en: #6e9bff;  /* vienen de la marca, son configurables */
  --r: 10px;  --r-lg: 14px;  --r-xl: 18px;
  --font: "Geist", system-ui, sans-serif;  --mono: "Geist Mono", ui-monospace, monospace;
}
```

- **Un solo acento.** El lima es para la acción principal, lo positivo y el estado activo. Nada más se pinta de lima. El color de cada marca solo aparece en puntos, avatares y líneas de su gráfico.
- **Tipografía:** Geist para todo, Geist Mono solo para datos (códigos de tiempo, contadores, atajos, etiquetas de estado). Escala: 36/30 títulos de página (600, tracking -0.035em), 15–16 títulos de bloque (600), 14 cuerpo, 12.5 secundario, 11–12 mono. Números con `font-variant-numeric: tabular-nums` y tracking negativo en los grandes (34–46 px).
- **Espaciado** en base 4: 4, 8, 12, 16, 20, 24, 32, 44. Más aire arriba de un título que abajo.
- **Profundidad:** superficies con 1 px de luz en el borde superior (`inset 0 1px 0 var(--edge)`), sombras con desplazamiento y desenfoque teñidas al fondo, grano de 4% sobre el lienzo para que el negro no se vea plano. Tres niveles de elevación, no más.
- **Bordes:** líneas de 1 px `--hair`. Radios: 8–10 controles, 14 paneles, 18 tarjetas de teléfono, 22 barra de pestañas.
- **Movimiento:** solo `transform` y `opacity`; 120–180 ms en hover, 200 ms en paneles, curva `cubic-bezier(.23,1,.32,1)`. Presionar = `scale(.97)`. Lo nuevo entra desde `scale(.95)` + opacidad 0. Con movimiento reducido, solo opacidad.
- **Prohibido:** texto con degradé, brillos de neón alrededor del texto, tarjetas anidadas, grillas de tarjetas idénticas como estructura, más de un acento, emojis como iconos (usá un set de iconos de trazo 1.6 px, estilo Lucide).

## Componentes

Botón (primario lima con atajo en `kbd`, secundario, fantasma), `kbd`, chip de estado mono (`URGENTE`, `HOY`, `EN VIVO`, `NUEVA`), delta (▲ lima / ▼ rojo sobre fondo suave), indicador con sparkline de borde a borde, anillo de progreso, barra de meta de 4 px, celda de calendario (barra sólida = agendado, contorno = aprobado sin agendar, rayado rojo punteado = hueco), fila de tarea (icono de prioridad, título, chip, detalle, miniaturas apiladas, acción), fila de venta, fila de cuenta en tabla, chip de versión (`v1` a `v4` con color por estado), pestaña de versión con puntaje, reproductor 9:16 con zona segura y botones de Instagram, línea de tiempo de cuadros con marcas de notas, nota por cuadro con respuesta, interruptor, conexión con estado, menú de espacios, tarjeta de trofeo con medalla, barra de pestañas flotante, hoja inferior.

## Pantallas de compu

1. **Hoy.** Saludo de 36 px + frase de estado + reloj en mono a la derecha. Bloque **Ahora** con las tres tareas que más mueven el negocio (la primera resaltada, con miniaturas apiladas y botón "Empezar triage ↵"). Franja de 4 indicadores en un solo bloque con divisores (comisión 30 días con meta, vistas 7 días, seguidores nuevos, contenido asegurado). Dos columnas: calendario de contenido de 14 días + "Próximo en salir" + alerta de corte | ventas en vivo (acumulado grande, pagado/en camino/para cobrar, barras de 30 días, últimas ventas). Tabla de Instagram a lo ancho con tendencia, mejor reel y una explicación del asistente ("English cayó porque no publica desde el 9 oct"). Fila final de cuatro: progreso de trofeos, materia prima, laboratorio, feedback.
2. **Triage.** Barra superior con volver, marca, progreso "12 de 70 · ≈ 9 min" y orden (puntaje alto primero, más viejos, por pieza). Cola con piezas y chips de versión. Escenario con pestañas de versión (tipo de gancho + puntaje), video con zona segura, línea de tiempo con marcas, controles (zona segura, subtítulos, velocidad). Inspector: anillo de puntaje + explicación, factores con barras, notas por cuadro con composer anclado al tiempo actual (`N`). Barra de acciones: Rechazar `R`, Quizás `Q`, Aprobar `A` (grande, lima), atajos de ayuda a la izquierda.
3. **Ajustes del espacio.** Selector de espacios abierto, navegación de ajustes, pestañas (General, Marcas, Conexiones, Módulos, Equipo, Marca blanca, Plan). Tres columnas: marcas + conexiones | módulos con interruptores | equipo con roles + marca blanca (color, nombre y voz del asistente, dominio propio). "Ver como cliente" y "Guardar cambios" arriba. Al pie: "Hecho con Mando" (se puede ocultar en el plan Agencia).
4. También: Calendario (mes y 14 días), Métricas, Ventas, Pedir video, Laboratorio, Trofeos y Feedback como páginas completas con el mismo marco, reutilizando los mismos componentes.

## Pantallas de teléfono

1. **Hoy:** saludo en dos líneas + avatar, tarjeta con las 3 tareas (fila con chevron), 4 indicadores en grilla 2×2 con sparkline, última venta.
2. **Triage:** video a pantalla completa, progreso por versión arriba (4 segmentos) y "12/70", chip de puntaje y marca, botones grandes Rechazar · **Aprobar** · Quizás; deslizar a la derecha aprueba, a la izquierda rechaza, mantener presionado abre notas.
3. **Jarvis:** orbe grande, onda de voz, la respuesta en texto grande, tarjeta de acción con confirmación ("¿Pido 5 videos nuevos?" Ahora no / Pedirlos), botones teclado · micrófono · cerrar.
4. **Ventas:** segmentado 7/30/todo, acumulado de 46 px, barras, tres cifras, meta con proyección ("a tu ritmo, la pasás el viernes"), últimas ventas.
5. **Trofeos:** anillo de nivel, trofeos de la semana con medalla por rango, camino a la meta final ($500 → $5K → $30K), próximos trofeos.
6. **Laboratorio:** ronda con progreso, demo del estilo, descripción, Drop / Quizás / Keep, dictar comentario.

## Atajos de teclado

`⌘K` paleta y asistente · `⌘J` hablar · `G` luego `H/B/C/M/V/L/T/F` para ir a cada sección · en bandeja `J/K` moverse, `↵` abrir · en triage `A` aprobar, `Q` quizás, `R` rechazar, `←/→` versión, `Espacio` pausa, `,`/`.` cuadro a cuadro, `N` nota en el cuadro, `S` zona segura, `⇧A` aprobar todas las versiones de la pieza, `⌘Z` deshacer · `?` ayuda.

## Estados que tienen que existir

Vacío con instrucción ("No hay videos rechazados. Si rechazás uno, queda acá con el motivo"), carga con esqueletos del mismo tamaño que el contenido, error con reintento, sin conexión (cola local que se envía al volver), dato viejo (chip DESACTUALIZADO + botón), permiso de micrófono denegado (explica el dictado del teclado), sin permiso por rol (explica quién puede). Toda acción destructiva o en lote tiene **Deshacer** por 8 segundos en un aviso abajo.

## Responsive

≥1280: marco completo. 1024–1279: barra lateral colapsada a iconos (72 px), inspector del triage como panel deslizable. 768–1023: barra lateral oculta tras botón, triage en dos columnas. <768: experiencia de teléfono descrita arriba (no es la de compu achicada). Objetivos táctiles de 44 px mínimo. Respetá `safe-area-inset`.

## Accesibilidad

Contraste 4.5:1 en texto y 3:1 en controles y foco, foco visible en lima con 2 px de separación, todo operable con teclado, `aria-live` para avisos y para el asistente, reproductor con subtítulos, movimiento reducido respetado.

## Stack sugerido

Next.js (App Router) + TypeScript, Tailwind con estos tokens como variables, Radix UI para primitivas accesibles, Framer Motion para transiciones, TanStack Query para datos, Postgres con seguridad por fila por `workspaceId` (Supabase o similar), almacenamiento de video con streaming HLS y miniaturas por cuadro, colas para pedidos a la IA, Web Speech API con alternativa de servidor para la voz. Integraciones detrás de una capa de conectores para poder sumar redes y plataformas de afiliados sin tocar la interfaz.

## Criterios de aceptación

- Aprobar las 4 versiones de una pieza con teclado toma menos de 10 segundos.
- La pantalla Hoy responde "qué hago ahora" sin desplazarse en una pantalla de 1440×900.
- Crear un espacio nuevo con su marca, su color y su asistente toma menos de 5 minutos y no requiere tocar código.
- Ningún texto de KT queda escrito en el código: cambiar de espacio cambia nombres, colores, idioma y metas.
- Lighthouse 95+ en rendimiento y accesibilidad en compu; la bandeja abre en menos de 1 s con 200 versiones.
- Se ve y funciona igual de bien en compu y en teléfono, con versiones de pantalla pensadas para cada uno.
