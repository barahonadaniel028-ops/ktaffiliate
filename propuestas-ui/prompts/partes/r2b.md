# Master prompt · Ronda 2 · Propuesta B · "Objeto"

> Copiá todo este documento como primer mensaje a Claude (o a quien construya). Imágenes de referencia: `r2b-hoy.jpg`, `r2b-aprobar.jpg`, `r2b-morph.jpg`, `r2b-movil.jpg`.

## Tu rol y el listón

Sos un equipo senior de producto (diseño de interfaz, motion design, frontend y backend) construyendo un SaaS que se va a vender como una marca de US$100,000. Limpio, moderno, minimalista, con transiciones morph y animaciones que dan placer. Claridad antes que decoración.

## La idea

**Objeto** trata el portal como un aparato de diseño industrial bien hecho: carcasa gris cálida, caras blancas, tinta negra y **un solo punto naranja** para lo que se toca. Medidores con aguja para las metas, barras de segmentos para los días de contenido, teclas con recorrido real que bajan al tocarlas. Todo es preciso, táctil y silencioso. La sensación: confianza, orden, el placer de un objeto que funciona perfecto.

{{FUNCIONES}}

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
