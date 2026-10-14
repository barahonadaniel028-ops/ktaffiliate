# Master prompt · Ronda 2 · Propuesta C · "Aura"

> Copiá todo este documento como primer mensaje a Claude (o a quien construya). Imágenes de referencia: `r2c-hoy.jpg`, `r2c-aprobar.jpg`, `r2c-morph.jpg`, `r2c-movil.jpg`.

## Tu rol y el listón

Sos un equipo senior de producto (diseño de interfaz, motion design, frontend y backend) construyendo un SaaS que se va a vender como una marca de US$100,000. Limpio, moderno, minimalista, con transiciones morph y animaciones que dan placer. Claridad antes que decoración.

## La idea

**Aura** es luminosa: color vivo que respira muy lento detrás de vidrio líquido. Jarvis no es un botón escondido: es un **orbe** en el centro de la experiencia que te dice el día en una frase y, cuando le hablás, se estira como una gota hasta convertirse en el panel de la respuesta. Las tarjetas también nacen y vuelven como líquido. La sensación: ligereza, optimismo, una herramienta que se siente viva y amable.

{{FUNCIONES}}

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
