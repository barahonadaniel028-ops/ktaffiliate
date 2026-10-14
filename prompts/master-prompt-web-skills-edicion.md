# MASTER PROMPT: web premium para un pack de skills de edición de video para Claude

> **Cómo usar este archivo**
> 1. Abre Claude Code en una carpeta nueva para el proyecto, con los skills `scroll-craft` y `frontend-design` instalados.
> 2. Rellena la tabla de **Variables** (sección 2). Lo que dejes vacío queda como `[PLACEHOLDER]` visible en la web, nunca inventado.
> 3. Pon tus videos de muestra en `assets/raw/` con los nombres de la sección 10.
> 4. Pega todo desde la línea `=== INICIO DEL PROMPT ===` hasta el final.

=== INICIO DEL PROMPT ===

## 0. Rol y misión

Eres un director creativo y desarrollador front end senior. Vas a construir la landing page de venta de **[NOMBRE_PACK]**, un pack de skills de edición de video para Claude Code. Tiene que verse como una pieza de nivel Awwwards: premium, cinematográfica, con un objeto 3D que se transforma (*morph*) a lo largo del scroll y una interacción propia que nadie más tiene.

Usa el skill **`scroll-craft`** como método obligatorio, de principio a fin: Step 0 a Step 5, reglas duras, *taste floor* y verificación con capturas. Usa también **`frontend-design`** para la calidad estética. Este documento es el **brief del Step 0**, escrito bajo **delegación creativa explícita** del dueño. No vuelvas a entrevistar. Solo pregunta si falta una variable que bloquee la construcción, como el link de checkout.

Frases literales del dueño (van a `BRIEF.md` tal cual):
- "quiero que sea premium, front end, morph, con scroll craft el skill, super premium looking website"
- "no te inspires en el diseño de [la referencia] porque no es muy bueno, quiero que agarres la idea y el copy porque voy a vender un sistema parecido, pero que sea tu propio estilo super good looking"
- "inspirado un poco en el UI de tein.ai, y la animación que tiene"

---

## 1. Qué tomar de cada referencia (y qué NO)

### Referencia de oferta y copy: `https://editing.ajenepinnock.com/`
**Toma:** la oferta, la estructura de secciones en su orden y la lógica persuasiva de cada sección. La sección 7 de este prompt ya trae esa estructura con el copy adaptado al español.
**No tomes:** su diseño visual (fondo claro, Inter + Playfair, tarjetas en grid, eyebrows con puntito en cada sección), ni su texto palabra por palabra, ni su marca. El copy de la sección 7 está reescrito con voz propia. Mantenlo así.

### Referencia de UI y animación: `https://tein.ai/`
Ábrela en el navegador y recórrela entera, incluidos los estados intermedios del scroll. Antes de diseñar, anota en `BRIEF.md` tres a cinco observaciones con este formato:
`comportamiento observado → por qué funciona → principio que adapto`.
**Toma:** la sensación de movimiento (morph orgánico y continuo, suavidad, ritmo de las entradas de texto, cuánto aire hay alrededor del objeto). **No tomes:** su layout, sus colores, su objeto 3D ni su copy. El morph de esta web es propio (sección 6).

Si alguna de las dos URLs no carga en tu entorno, sigue con lo que trae este prompt y dilo en el reporte final.

---

## 2. Variables

| Variable | Valor |
|---|---|
| `[MARCA]` (wordmark del nav) | |
| `[NOMBRE_PACK]` | |
| `[N]` número de estilos | |
| `[N_CORTO]` / `[N_LARGO]` / `[N_HERRAMIENTAS]` | |
| `[PRECIO]` (pago único, USD) | |
| `[PRECIO_ANTES]` (solo si es un precio real que existió) | |
| `[URL_CHECKOUT]` | |
| `[DOMINIO]` | |
| `[IDIOMA]` | español (cambia todo el copy si es inglés) |
| `[SO_BASE]` (en qué sistema está hecho el pack) | Mac |
| `[HERRAMIENTAS_SETUP]` | Node, HyperFrames y ffmpeg |
| `[TRANSCRIPTOR]` y su costo real | |
| `[POLITICA_REEMBOLSO]` | |
| Precios de comparación: editor, apps (verificados, con mes y año) | |

**Regla de números:** cada cifra visible en la web tiene que ser real y verificable. Si no lo es, queda como `[PLACEHOLDER]` y no se anima con contador. Los precios de apps de terceros se comprueban en sus páginas oficiales y se fechan en la nota al pie.

---

## 3. Brief (las 8 preguntas de scroll-craft, respondidas)

1. **Vibe en cinco palabras:** sala de montaje a medianoche. Precisión, silencio, una sola luz roja de REC, ritmo de corte.
   **Referencias de otros medios:** el montaje de *Whiplash* (el corte como ritmo y tensión), el *grade* de *Blade Runner 2049* (niebla, grafito, una única fuente de color) y una mesa de montaje Steenbeck (un objeto físico, preciso, hecho para cortar película).
2. **Recorrido del visitante:** ve el producto funcionando (estilos en video) → entiende lo que hoy le cuesta editar → recorre los estilos y elige uno → entiende que son suyos y los puede cambiar → ve cómo funciona → resuelve sus dudas (qué necesita, precio, FAQ) → compra.
3. **Curva de energía:** apertura intensa y cinematográfica. Baja y se vuelve clara y fría en el costo. Sube al máximo en los estilos. Descansa en "hazlos tuyos" y "cómo funciona". Queda calma y luminosa en el precio. Cierra firme y oscura.
4. **Curva emocional y el pico:** ver 3.1. **El momento que tienen que recordar:** elegir un estilo y ver cómo **toda la página se re-edita** en ese estilo.
5. **Lo que esta web hace y ninguna otra:** la página es material editable. El visitante le aplica un estilo de edición y la web cambia delante de él (sección 5).
6. **Familia estética:** premium-minimal cinematográfico: oscuro, una sola luz de acento, mucho aire, y un corte duro a un fondo claro en el precio. No es "dark mode genérico": cada decisión sale de la sala de montaje.
7. **¿Un mundo continuo o escenas?** Escenas distintas. Cada costura entre secciones es una **transición de montaje con nombre** (sección 4). Nada de un solo vuelo de cámara continuo.
8. **Assets:** videos de muestra reales de cada estilo (los pone el dueño), una grabación de pantalla real del flujo y una placa de fondo fotográfica generada para el hero (sección 10).

### 3.1 Curva emocional (escríbela en `BRIEF.md` antes de la tabla de devices)

| Acto | Sentimiento | Qué lo causa en pantalla |
|---|---|---|
| Hero | Asombro | Una cinta de película enredada flota entre reels reales que se reproducen en profundidad |
| Costo | Incomodidad lúcida | Las barras de 12 meses crecen y la del pack apenas existe |
| Estilos (**PICO**) | Control, deseo | Eliges un estilo y la página entera se re-edita |
| Hazlos tuyos | Alivio | La cinta se separa en hebras y se trenza en una sola: combinar estilos |
| Cómo funciona | Confianza | Grabación real del flujo, avanzada con la rueda del ratón |
| Por qué / Lo que necesitas | Claridad | Frases grandes y una lista que se tacha sola |
| Precio | Calma | Corte duro a fondo claro, como una hoja de exportación |
| Cierre | Decisión | La cinta se cierra en un loop perfecto y la placa de render muestra tu estilo |

**Frase para contarle a alguien:** "Es la web donde eliges un estilo de edición y toda la página se re-edita delante de ti."

---

## 4. Gramática de página: "Sala de montaje" (gramática nueva, con nombre)

Justifica en el reporte por qué las otras ocho de `scroll-craft` no encajaban. La idea corta: es una venta con argumento (no es solo catálogo), tiene un catálogo dentro (no es filmic puro) y su tema es literalmente el montaje.

- **Navegación:** una barra de *timecode*. A la izquierda el wordmark `[MARCA]`, en el centro un timecode `00:00:00:00` que representa la posición en la página, a la derecha el CTA. Al hacer clic en el timecode se abre el **Bin**: un diálogo accesible con las secciones listadas como clips (miniatura, nombre y punto de entrada), que salta a cada una. Al bajar, la barra se compacta (de 64 a 52 px), toma `--surface` con un *hairline* inferior y nunca esconde el CTA.
- **Secuencia:** cada costura entre secciones es una transición de montaje distinta, de 0,6 viewport-heights como máximo:

| Costura | Transición | Cómo se ve |
|---|---|---|
| Hero → Costo | J-cut | El titular del costo entra antes de que termine de salir el hero |
| Costo → Estilos | Match cut | La barra diminuta del pack (acento) se convierte en el *playhead* de la pista de estilos, en la misma posición |
| Estilos → Hazlos tuyos | Corte en acción | La cinta sale de cuadro en movimiento y entra separada en hebras |
| Hazlos tuyos → Cómo funciona | Corte seco | Sin transición. Entra la grabación |
| Cómo funciona → Por qué | L-cut | La última línea del paso 4 se queda mientras entran las frases nuevas |
| Por qué → Necesitas | Wipe | Una línea de cuchilla (1 px, acento) barre con `clip-path` |
| Necesitas → Precio | Flash a blanco | Corte duro a fondo claro (`drift` con dos paradas) |
| FAQ → Cierre | Smash cut a negro | Vuelta instantánea al fondo oscuro de la placa de render |

- **Hero:** el objeto morph como sujeto, entre reels reales en profundidad. El titular queda entre planos.
- **Cierre:** una **placa de render final** que hereda el estilo elegido.
- **Prohíbe:** indicadores de "scroll", contadores `01 / 06`, eyebrow en cada sección (máximo uno cada tres), vidrio o blur decorativo, texto con gradiente, glow o neón, degradados violeta-azul de "IA", la paleta crema y latón, cursor personalizado, guiones largos visibles, más de un `scrub`, copy centrado en todas las secciones, tarjetas idénticas como estructura, y video de stock presentado como trabajo real.

---

## 5. Movimiento firma: "El Grade"

Una sola interacción propia, programada en el código de la página y no en el motor de `scroll-craft`, que queda intacto.

- En la sección de estilos, elegir un estilo (clic, Enter o tap) **aplica su *grade* a toda la página**. Pone `data-estilo="<id>"` en `<html>` y cambia tres cosas a la vez:
  1. **El material y el movimiento de la cinta 3D:** temperatura del borde, rugosidad, velocidad y amplitud del ruido.
  2. **El tratamiento de los titulares H2 que vienen después,** tomado de un set cerrado de cuatro que imitan subtítulos de edición: `acento` (una palabra grande en acento y el resto ajustado alrededor), `palabra` (entran palabra por palabra), `apilado` (frases clave apiladas) y `limpio` (sin efecto). Cada estilo del catálogo apunta a uno de los cuatro.
  3. **El ritmo de las costuras:** rápido o pausado, dentro del rango de 0,3 a 0,6 viewport-heights.
- **El acento no cambia de color.** Es la luz de REC de toda la página. El grade cambia el carácter, no la marca.
- La elección se ve en la barra del nav ("Grade: Fitted Captions"), se guarda en `?estilo=<id>` y en `localStorage` (con try/catch, la página funciona sin él), llega a la placa del cierre y se añade al `[URL_CHECKOUT]` como parámetro UTM.
- Con *reduced motion* el grade se aplica sin animar. Sin JavaScript, la página se lee completa con el tratamiento `limpio`.

---

## 6. El morph: "La Cinta"

Es lo que traduce la animación de tein.ai a este producto. Es un objeto con significado, no una esfera genérica: **una cinta de película que empieza enredada (material crudo) y se ordena hasta ser una línea de tiempo**. "Lo disperso se vuelve orden" es la historia del producto.

**Técnica:** Three.js `0.160.0` importado como módulo ES desde jsDelivr, con la versión fijada.
- La geometría es una tira plana, no un tubo: unos 400 segmentos de largo por 2 de ancho, con su forma calculada en CPU en cada frame a partir de una `CatmullRomCurve3` de 12 a 16 puntos de control. Son unos 800 vértices, barato de mover.
- Los estados de forma son conjuntos de puntos de control con una semilla fija, interpolados con easing: `nudo` (enredada), `hilo` (recta y fina), `pista` (horizontal, la línea de tiempo), `trenza` (tres hebras que se unen) y `loop` (lazo cerrado y perfecto).
- Encima va un desplazamiento con ruido simplex de amplitud `uCaos` (0 a 1) y un giro de la tira a lo largo de su eje.
- El *fragment shader* dibuja las perforaciones de película en los bordes y fotogramas tenues en el centro. En el estado `pista` los fotogramas muestran miniaturas reales de los estilos (un atlas de texturas).
- El material es obsidiana: casi negro, especular suave con `RoomEnvironment` como mapa de entorno y un borde fresnel muy fino en el color de acento. Nada iridiscente, nada arcoíris.
- Con puntero fino, el tramo de cinta más cercano al cursor se curva hacia él con un muelle suave. Es aditivo: táctil y teclado ven la composición completa.

**Estados por sección:**

| Sección | Forma | `uCaos` | Nota |
|---|---|---|---|
| Hero | `nudo` | 0,85 | Respira despacio y pasa por delante y por detrás de los reels |
| Costo | `hilo` | 0,35 | Se tensa y sigue a la barra del pack |
| Estilos (pico) | `pista` | 0,05 | Recta bajo el monitor, con fotogramas visibles. El grade cambia su material |
| Hazlos tuyos | `trenza` | 0,30 | Tres hebras que se unen en una |
| Cómo funciona | fuera de cuadro | | Manda la grabación |
| Cierre | `loop` | 0 | Se cierra en un lazo perfecto: el corte final |

**Rendimiento y respaldo:**
- DPR máximo de 1,75 en escritorio y 1,25 en móvil.
- El render se pausa fuera de pantalla (IntersectionObserver) y con `document.hidden`. Sin `preserveDrawingBuffer`.
- Three.js se carga después del LCP.
- Haz *posters* exactos (escritorio y móvil) renderizados de la escena final. Se usan sin WebGL y con *reduced motion*.

---

## 7. Estructura y copy, sección por sección

Este es el orden de la referencia y el copy final en `[IDIOMA]`. Ajusta cualquier promesa a lo que tu pack hace de verdad. Una sola etiqueta de CTA en toda la página: **"Consigue el pack"**.

### 7.0 Nav (timecode)
`[MARCA]` · `00:00:00:00` · botón **Consigue el pack ↗**

### 7.1 Hero · device: `parallax` por capas + WebGL + puntero
Contrato de capas (escríbelo en `BRIEF.md` y respétalo):

| Plano | Asset | Movimiento propio | Regla |
|---|---|---|---|
| Fondo lejano | Placa fotográfica de sala de montaje oscura: monitores desenfocados, una luz práctica cálida | El mínimo | Sin texto ni sujeto duplicado |
| Medio | Cinco reels 9:16 reales en reproducción, a distintas profundidades | Moderado, con parallax de puntero | 2 px de radio, nada de vidrio |
| Sujeto | La Cinta (WebGL) | Respira y se enreda | Pasa por delante y por detrás de los reels: oclusión real |
| Primer plano | Un fragmento de cinta o un reel muy cercano y desenfocado | El mayor, contenido | Cruza por delante del titular sin tapar las palabras clave |
| Atmósfera | Bruma y grano | Deriva lenta | No lava el contraste del texto |

Para que haya oclusión real entre reels y cinta, renderiza los reels como planos con `VideoTexture` dentro de la escena. El H1 es HTML entre el canvas de fondo y un canvas o capa de primer plano.

Copy (máximo cuatro elementos de texto):
- **H1:** Edita tus videos con Claude en *[N] estilos* que ya funcionan.
- **Subtítulo (19 palabras):** Sueltas un video crudo, eliges el estilo y Claude hace el corte, los subtítulos, los gráficos y el render.
- **CTA:** Consigue el pack → · enlace secundario: Ver los [N] estilos ↓ (ancla `#estilos`)
- **Microcopy junto al CTA:** $[PRECIO] una vez. Tuyo para siempre.
- **Línea de salida del hero** (aparece cuando los reels se asientan al bajar): Tu material. Tu marca. Un estilo que ya funciona.

### 7.2 Costo · device: `pin` + `count` (solo con cifras reales)
- **H2:** Lo que te cuesta *editar* hoy
- Tres filas tipo libro contable, no tarjetas:
  1. **Contratar un editor:** Un pago fijo, mes tras mes. → $[EDITOR_MIN] a $[EDITOR_MAX]+ al mes
  2. **Apilar apps de edición:** Una suscripción por app, y casi todos usan dos o tres. Chips: [App 1 · $/mes] [App 2 · $/mes] [App 3 · $/mes] [App 4 · $/mes] → $[APP_MIN] a $[APP_MAX] al mes, cada una
  3. **[NOMBRE_PACK]:** Un solo pago. Después, solo el plan de Claude que quizá ya tienes. → $[PRECIO] una vez
- **Bloque "12 meses, lado a lado"**: las barras crecen con el scroll (`--sc-p`, `transform: scaleX`).
  - Editor a $[X]/mes → $[12·X]
  - Tres apps, ~$[Y]/mes → $[12·Y]
  - *Y sigues editando tú.*
  - El pack, un solo pago → $[PRECIO] (la barra mínima, en acento, que hace el *match cut* con la sección siguiente)
- **Nota al pie:** El total del pack no incluye tu plan de Claude ni la transcripción de pago. Precios de apps según sus páginas oficiales en [MES AÑO]; cambian seguido. El rango del editor es un pago típico de freelance. Revisa cada proveedor.

### 7.3 Estilos `#estilos` · **PICO** · device: `pan` sobre un monitor fijo + movimiento firma
La sección con más recorrido de scroll de toda la página, con margen visible. La sección anterior es más tranquila.
- **H2:** [N] estilos. *Elige uno,* o úsalos todos.
- **Composición:** un **monitor** grande (el preview del estilo activo, en su formato real 9:16 o 16:9) y debajo una **pista de línea de tiempo** con todos los estilos como clips. El scroll mueve la pista en horizontal y el playhead en acento recorre los clips. El clip bajo el playhead se reproduce en el monitor. Clic, Enter o tap aplica **El Grade**.
- **Hover-scrub:** con el puntero encima de un clip, la posición horizontal del cursor recorre su video, como en un editor profesional. Táctil: tap para reproducir.
- **"Ver todos"** convierte la pista en una cuadrícula accesible (y es la vista por defecto con *reduced motion*).
- **Grupos**, con un esquema de etiqueta idéntico para todos (nombre · formato · una línea factual, como cartela de museo, sin persuasión):
  - **Formato corto (9:16)** · [N_CORTO] estilos
  - **Formato largo y clips (16:9)** · [N_LARGO] estilos
  - **Herramientas que trabajan con los estilos** · [N_HERRAMIENTAS] herramientas
- **Tabla de estilos** (rellénala con los tuyos; las filas son el formato esperado):

| id | Nombre | Formato | Línea | Tratamiento de titular |
|---|---|---|---|---|
| `business-reels` | Business Reels | 9:16 | Pantalla completa, pantalla dividida y animación, cambiando en cada corte. | `apilado` |
| `fitted-captions` | Fitted Captions | 9:16 | Una palabra grande en acento y el resto ajustado alrededor. | `acento` |
| `personal-reels` | Personal Reels | 9:16 | Cortes rápidos, tu propio B-roll, subtítulos de una palabra. | `palabra` |
| … | … | … | … | … |

- **Nota bajo la pista:** Los ejemplos usan un presentador de muestra. Tus ediciones usan tu material, tus colores y tus tipografías.

### 7.4 Hazlos tuyos · device: `reveal` (wipes con `clip-path`)
- **H2:** Un punto de partida, *no una caja cerrada*
- **Intro:** Los [N] estilos son donde empiezas. Son skills normales y son tuyos, así que Claude puede cambiarlos contigo.
- Cuatro bloques en composición asimétrica, no un grid de cuatro tarjetas iguales:
  - **Ajusta un estilo.** ¿Te gusta un estilo pero quieres otros subtítulos, colores o ritmo? Se lo dices a Claude y actualiza el skill para todas las ediciones siguientes.
  - **Combina estilos.** Los subtítulos de uno, el layout de otro y los gráficos de un tercero. Claude junta lo que te gusta en un estilo que es solo tuyo. *(Aquí la cinta se trenza.)*
  - **Crea estilos nuevos.** Usa los [N] como ejemplos que funcionan y pide a Claude un estilo nuevo a partir de tus videos de referencia.
  - **Ahorra tu uso.** Dejar un estilo bien desde cero son rondas y rondas de prompts, renders y correcciones, y cada ronda gasta tus límites de Claude. Estos skills ya pasaron por eso. Tu uso se va en tus videos, no en construir el editor.
- **Remate:** No compras [N] plantillas fijas. Compras [N] puntos de partida probados.

### 7.5 Cómo funciona · device: `scrub` (el único de la página)
- **H2:** Te guía en *cada paso*
- **Media:** una grabación de pantalla **real** del flujo (instalar → Claude revisa el equipo → entrevista → video crudo → preview → notas → render), codificada con `encode.sh` del skill. Los pasos aparecen como cues sobre la grabación, anclados en esquinas alternas.
  1. **Instala tus skills.** Instala Claude Code y descomprime los skills en tu carpeta de skills.
  2. **Deja que Claude te guíe.** La primera vez que usas un skill, Claude revisa tu computadora y te dice exactamente qué instalar, en orden.
  3. **Hazlo tuyo.** Te entrevista una pregunta a la vez: colores, tipografías, cómo grabas, dónde guardas tus archivos. Mándale dos o tres videos de referencia y adapta el estilo a ti.
  4. **Suelta. Dirige. Renderiza.** Sueltas un video crudo y dices «edítalo como business reel». Recibes una vista previa, das notas en tu idioma y renderiza el final.
- Los números de paso sí se muestran, porque aquí la secuencia es información.

### 7.6 Por qué · device: `pin` + `kinetic` (líneas)
- **H2:** Por qué una plantilla le gana a *la página en blanco*
- Cuatro frases a escala grande, una tras otra, sin tarjetas:
  - Empiezas con un estilo que ya funciona.
  - Lo haces tuyo y sigues construyendo encima.
  - Dejas de pagar cada mes por ediciones que puedes dirigir tú.
  - Te saltas la prueba y error cara. *(debajo, en tamaño de texto:)* Las pruebas ya están hechas, así que no quemas uso ni créditos averiguando cómo se ve una buena edición.

### 7.7 Lo que necesitas · device: `reveal` (cada ítem se tacha al entrar)
- **H2:** Lo que *necesitas*
- **Una computadora Mac o Windows.** Hecho en [SO_BASE]. En Windows, Claude revisa tu equipo y te dice qué instalar.
- **Claude Code con un plan de pago de Claude.** Tu suscripción de Claude va aparte.
- **Las herramientas gratis que instala el setup:** [HERRAMIENTAS_SETUP].
- **Un transcriptor.** [TRANSCRIPTOR, costo real por hora de audio], o la opción local gratis.
- **Nota:** Las tipografías, la música y el material son tuyos.

### 7.8 Precio · device: `drift` (flash a blanco: corte duro a fondo claro)
Es una "hoja de exportación": fondo claro, tipografía oscura y un único bloque de precio, no tres columnas.
- **H2:** Un solo pago. *Tuyo para siempre.*
- **Etiqueta:** Precio de lanzamiento
- **H3:** El pack completo: los [N] estilos
- **Precio:** $[PRECIO] ~~$[PRECIO_ANTES]~~ (el tachado solo si ese precio existió de verdad)
- Pago único. Sin suscripción.
- **Incluye:** [N] skills de edición · Entrevista guiada de configuración · Flujo de vista previa y notas · Actualizaciones de estos estilos · Edita, combina y amplía cada skill como quieras · Te ahorra el uso y los créditos de construir un estilo desde cero
- **CTA:** Consigue el pack → (a `[URL_CHECKOUT]` con `?estilo=`)
- **Letra pequeña:** Producto digital. [POLITICA_REEMBOLSO]. Tu plan de Claude se compra aparte.

### 7.9 FAQ · device: `flow` + `in` (sigue en fondo claro)
- **H2:** Antes de *empezar*
- Acordeón nativo `<details>/<summary>`, accesible y animado solo con `transform`/`opacity`. Las respuestas son borradores: confírmalas o corrígelas.
  - **¿Necesito saber programar?** No. Le hablas a Claude en tu idioma y el setup te guía paso a paso.
  - **¿Funciona en Windows?** Sí. Está hecho en [SO_BASE]. En Windows, Claude revisa tu equipo y te dice qué instalar.
  - **¿Claude está incluido?** No. Necesitas un plan de pago de Claude, que se compra aparte.
  - **¿Gasta mucho de mi uso de Claude?** [Respuesta real basada en tus pruebas.]
  - **¿Puedo cambiar los estilos?** Sí. Son skills tuyos: puedes ajustarlos, combinarlos o crear nuevos con Claude.
  - **¿Mis ediciones se verán como los ejemplos?** Siguen la misma estructura, con tu material, tus colores y tus tipografías.
  - **¿Hay reembolso?** [POLITICA_REEMBOLSO]

### 7.10 Cierre · device: `pin` corto + puntero (smash cut a negro)
Es la **placa de render final**: vuelve al fondo oscuro, la cinta se cierra en `loop` y una barra de render llega al 100 % al entrar la sección. Se resuelve y se queda quieta. No se desvanece en un footer.
- **H2:** Tu próximo video. *Un mejor punto de partida.*
- **Texto:** [N] estilos probados. Tu material. Tu dirección.
- **Línea heredada:** Estilo elegido: **[nombre del estilo]** · cambiar (vuelve a `#estilos`). Si no eligió ninguno: "Todos los estilos incluidos".
- **CTA:** Consigue el pack →

### 7.11 Footer
© 2026 [MARCA] · [DOMINIO] ↗ · Términos · Privacidad

**Comprobación de variedad** (reglas de scroll-craft): hay 9 familias de device distintas, ninguna repetida en secciones contiguas, un solo `scrub` y un solo `count`. El pico tiene el mayor recorrido. Evita que el total caiga en la franja de 6-7 actos con 13,6-13,8 vh. Esta página tiene más actos y no necesita relleno.

---

## 8. Sistema de diseño

### Color (tokens de scroll-craft más los del fondo claro)
```css
:root {
  --sc-canvas: #0B0C0E;   /* grafito casi negro, nunca #000 */
  --sc-surface: #15171A;
  --sc-ink: #EEEAE2;      /* hueso */
  --sc-ink-soft: #9D998F; /* tintado, no gris plano */
  --sc-accent: #FF4A1C;   /* luz de REC: playhead, CTA, barra del pack */
  --sc-accent-ink: #160803;
  --hairline: rgb(238 234 226 / 0.10);
  --sc-font-display: "Archivo", system-ui, sans-serif;
  --sc-font-text: "Geist", system-ui, sans-serif;
}
.ground--light { /* precio y FAQ */
  --sc-canvas: #E7E7E2; --sc-surface: #F2F2EE;
  --sc-ink: #111214; --sc-ink-soft: #55555A;
  --sc-accent: #D2380F; /* mismo tono, otra luminosidad */
  --sc-accent-ink: #FFF6F2;
  color: var(--sc-ink); /* repite color: si no, el texto no se re-tinta */
}
```
Mide el contraste en el render: cuerpo 4,5:1 como mínimo, texto grande y controles 3:1.

### Tipografía
- **Display:** Archivo, eje de anchura 115-125, peso 600-750, tracking -0,035em en tamaños grandes. El énfasis va en *Archivo itálica*, nunca una serif metida a la fuerza.
- **Texto:** Geist 400/500, 17 px, interlineado 1,6, medida máxima de 62ch. Sobre fondo oscuro, sube un punto el peso y el tracking.
- **Números y timecode:** Geist con `font-variant-numeric: tabular-nums`.
- `text-wrap: balance` en titulares y `pretty` en párrafos. Display máximo de unos 6,5rem en el hero. En pantallas de menos de 700 px el hero baja un escalón.

### Forma y superficie
- Radio de 2 px en media, 4 px en botones y nada de píldoras salvo los chips de precio.
- Líneas *hairline* de 1 px, como en la interfaz de un editor. Grano SVG estático al 4 %.
- Sombras con offset y desenfoque reales, nunca halos de color.
- Iconos de Lucide, con el mismo trazo en todos.

### Movimiento
```css
--ease-cut: cubic-bezier(.16, 1, .3, 1);   /* entradas */
--ease-roll: cubic-bezier(.65, 0, .35, 1); /* transiciones */
--dur-1: 160ms; --dur-2: 320ms; --dur-3: 640ms; --dur-4: 960ms;
```
Anima solo `transform`, `opacity` y `clip-path`. Nunca `transition: all`.

### Microinteracciones
- **Botón primario:** fondo de acento. En hover, un "relleno de render" de izquierda a derecha con `clip-path` (320 ms) y la flecha avanza 3 px. `:focus-visible` con un anillo de 2 px y 3 px de separación.
- **Enlaces:** el subrayado se dibuja con `clip-path`.
- **Clips de estilo:** hover-scrub (sección 7.3).

---

## 9. Móvil (composición propia, no una versión encogida)
- **Hero:** el titular arriba, tres reels en lugar de cinco, la cinta más pequeña y con menos ruido, y *posters* en vertical.
- **Pista de estilos:** se vuelve un carrusel táctil con `scroll-snap` y el monitor queda arriba.
- **Nav:** wordmark, botón del Bin y CTA. Áreas táctiles de 44 px como mínimo.
- Comprueba 390×844 y 360×640. El titular entero siempre visible.

---

## 10. Assets

| Archivo | Qué es | Origen |
|---|---|---|
| `assets/raw/estilos/<id>.mp4` | Un loop de 6 a 8 s por estilo, sin audio, en su formato | Del dueño (salidas reales de cada skill) |
| `assets/raw/flujo.mp4` | Grabación de pantalla real del flujo completo | Del dueño |
| `assets/hero-plate.webp` | Placa de sala de montaje oscura | Generada (kie.ai según `scroll-craft`, o Higgsfield si está conectado), revisada a ojo |
| `assets/poster-hero-{desktop,mobile}.webp` | *Posters* de la escena WebGL | Renderizados desde la escena final |
| `assets/og.png` | Imagen para compartir, 1200×630 | Renderizada desde el hero |

- **Loops de estilos:** 720p, mp4 (H.264) + webm, entre 1,5 y 2,5 Mbps, `preload="none"` hasta que estén cerca de la vista, siempre con *poster*.
- **Grabación del flujo:** con `encode.sh` (GOP denso para el scrub) en versión de escritorio y de móvil.
- Si falta un video de estilo, muestra su *poster* con la etiqueta "Muestra próximamente". Nunca uses stock haciéndolo pasar por resultado real.

---

## 11. Stack técnico
- HTML semántico estático, con `index.html`, `scrollcraft.js` y `scrollcraft.css` (el motor, copiado tal cual y sin editar), `page.css` y `page.js` (la Cinta, El Grade, el Bin, el hover-scrub y las costuras).
- Three.js `0.160.0` vía `https://cdn.jsdelivr.net/npm/three@0.160.0/`.
- Fuentes de Google Fonts: Archivo y Geist.
- No uses Lenis salvo que la verificación demuestre que no rompe los pins ni el scrub. Si hay conflicto, gana el motor.
- Metadatos: `lang` según `[IDIOMA]`, title, description, Open Graph y Twitter con `og.png`.
- Despliegue estático en Vercel.
- Presupuesto: LCP por debajo de 2,5 s en un móvil medio con 4G. El *poster* del hero es el candidato a LCP. El JS propio por debajo de 60 KB gzip. Three.js carga de forma diferida.

---

## 12. Accesibilidad y estados
- Un solo `<h1>` y una jerarquía real. Cada sección con `aria-labelledby`. Cada video con un `aria-label` del tipo "Muestra del estilo X, video sin sonido".
- Todo se puede usar con teclado: el Bin es un `<dialog>` con el foco atrapado y Escape para cerrar. La pista de estilos es navegable con flechas y el foco lleva el clip a la vista.
- `prefers-reduced-motion`: sin scrub (se muestra un fotograma clave por paso), la Cinta como *poster* estático, la pista como cuadrícula, costuras como cortes simples y el grade sin animación.
- Sin WebGL: *posters* exactos, nunca un canvas vacío.
- Sin JavaScript: todo el copy y todos los enlaces de compra funcionan.

---

## 13. Verificación (Step 5 de scroll-craft, sin atajos)
1. Corre `shoot.mjs` en escritorio, en móvil (390×844) y con *reduced motion*. Lee la hoja de contactos y los fotogramas con problemas.
2. Recorre el pico con al menos tres estilos aplicados y comprueba que cambian **las tres cosas** del grade, que el cierre lo hereda y que el link de checkout lleva `?estilo=`.
3. Haz el *feel check*: recorre la página en frío, escribe una palabra por acto y compárala con la curva de la sección 3.1. Si no coinciden, la que está mal es la página.
4. Comprueba la consola sin errores, ninguna petición fallida, el contraste medido sobre lo compuesto, el orden del foco y que no haya scroll horizontal en 360 px.
5. Repite el fingerprint gate de scroll-craft contra tu registro y añade la fila al terminar.

## 14. Entregables y reporte
- La carpeta del build con `BRIEF.md` (incluidas las observaciones de tein.ai), la web, los assets y las capturas de verificación.
- Un reporte corto con:
  - la gramática y por qué perdieron las otras ocho
  - el movimiento firma
  - el resultado del fingerprint gate
  - la curva emocional prevista contra la sentida
  - la tabla de devices
  - qué generaste
  - qué verificaste y qué no (por ejemplo, un iPhone real)
  - la lista de `[PLACEHOLDER]` que siguen abiertos

=== FIN DEL PROMPT ===
