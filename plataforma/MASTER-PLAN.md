# Master plan · Aura

> Este plan describe cómo se construyó la fase 0-8 (ver `DECISIONES.md` para lo que cambió después de probar esa versión — algunas cosas que este plan da por entregadas, como "Logros", se eliminaron a propósito y no hay que recrearlas).

## 1. Decisión de eficiencia (la pregunta de Daniel)

> "¿Tú creas todo el código y yo se lo paso al chat donde creamos la plataforma, o tú lo editas todo?"

**Lo más eficiente: yo lo construyo y lo publico todo aquí.** Razones:
- El código que importa (motor del Estudio, predictor, lógica de aprobar/agendar/Jarvis) ya está en el portal vivo; copiarlo literal evita regresiones. Pasarlo por otro chat obliga a re-explicar ~5 000 líneas y es donde se pierden detalles.
- Un solo hilo = un solo contexto. El otro chat solo necesita **`CONTRATO-DE-DATOS.md`** (qué colecciones lee y escribe la interfaz) si algún día quiere cambiar el lado de Claude (producción/render/agendado).
- Cambio al portal vivo **solo con tu visto bueno**: primero se publica como artefacto nuevo y privado (no toca nada), lo probás, y recién ahí se reemplaza `XMD17H…` (el artefacto vivo conserva sus datos y capacidades).

## 2. Arquitectura

```
plataforma/app/
  css/    tokens (día/noche) · base (vidrio, aura, botones) · shell · views · studio
  js/core/     util · state · adapters (claude | demo | simulador) · theme · router · motion (morph/goo)
  js/engine/   studio-engine.js (COPIA LITERAL del portal: Model, Rules, Lib, Renderer) · pred.js (PRED + puntaje)
  js/domain/   selectores (contenido asegurado, frase del día), logros, catálogo de biblioteca, pedidos
  js/views/    shell · hoy · aprobar · crear · biblioteca · laboratorio · metricas · logros · notas · ajustes · estudio · jarvis
  dev/         fixtures (datos de demo) · simulador de window.claude · página de pruebas
plataforma/tools/build.py   une todo en UN fragmento HTML (artefacto) + dist/index.html (autónomo)
```
- JS clásico (sin bundler), todo bajo `window.App`; plantillas de texto + `data-act` con un solo escuchador por vista. Cero dependencias salvo GSAP (solo lo usa el motor del Estudio) desde cdnjs.
- **Adaptador** con una sola interfaz (`connect, update, set, add, remove, upload, assetUrl, metrics, sample, tell, user`). Vistas y dominio nunca tocan `window.claude`.
- **Preset de espacio** (`App.config`) con KT y Lumen; la UI lee nombres, cuentas, formatos y objetivos de ahí.
- **Tokens día/noche** en `:root` y `[data-theme]`; manchas y vidrio los consumen; el cambio de tema es un View Transition circular.
- **Morph del orbe:** capa fija con filtro SVG `goo`, gota que viaja con cola (WAAPI, easing `linear()` con rebote) y fundido al panel real; respaldo sin goo para reduced-motion.

## 3. Fases (ejecutadas en orden, de una vez)

| # | Entrega | Verificación |
|---|---|---|
| 0 | Master prompt, plan, contrato | revisión de coherencia |
| 1 | Cimientos: tokens, base, shell, router, estado, adaptador demo, tema, orbe | captura día/noche, escritorio y teléfono |
| 2 | Hoy · Aprobar (lista, revisión, predictor, notas, atajos) | flujo aprobar → agendado en el simulador |
| 3 | Crear (pedido + subir videos) · Biblioteca · Laboratorio | subir archivo de prueba, usar estilo → Crear |
| 4 | Métricas · Logros · Notas · Ajustes | datos de demo y estados vacíos |
| 5 | Jarvis (morph, herramientas, modo local) | abrir/cerrar con cola, confirmación |
| 6 | Estudio (motor literal + piel nueva) | abrir un spec, reproducir, editar, deshacer, exportar |
| 7 | Simulador de `window.claude` (db/assets/user/mcp/sample/comments) | recorrer la app con el adaptador real |
| 8 | Capturas de todo (día y noche, escritorio y teléfono), commit, publicar artefacto privado | revisión visual por captura |

## 4. Reglas de construcción

1. Copiar literal lo que ya funciona (motor, predictor, escrituras a la base); lo nuevo es la piel y la estructura.
2. Nombres de colecciones y campos **sin cambios** → el portal vivo y el nuevo pueden convivir.
3. Todo texto de usuario en español claro (voseo no obligatorio; el preset define el registro).
4. Ninguna escritura sin `try/catch` y aviso; toda acción destructiva con Deshacer.
5. Nada de dinero. Si aparece un campo `affiliate`, se ignora.
6. Una pantalla = una frase + una acción principal.

## 5. Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| El almacén de artefactos limita archivos (~19 MB) | Aviso claro + pegar link; dividir en el plan SaaS con almacenamiento propio |
| `backdrop-filter` pesado en teléfonos viejos | Blur reducido en teléfono, manchas pausadas fuera de pantalla y con `prefers-reduced-motion` |
| View Transitions no disponibles | Respaldo FLIP/fundido; nada depende de ellas |
| Motor del Estudio depende de GSAP y de fuentes | GSAP desde cdnjs (versión fija); fuentes de Google; si fallan, el editor cae a modo simple con mensaje |
| No puedo probar Metricool/db/Claude reales desde aquí | Simulador fiel del contrato + la primera carga en el artefacto real es el último paso de verificación (checklist abajo) |

**Checklist de primera carga en el artefacto real:** 1) abre y muestra cuentas; 2) aprobar una versión escribe `videos/<id>` y `requests/schedule_*`; 3) subir un archivo pequeño en Crear devuelve `assetId`; 4) Métricas carga con Metricool; 5) Jarvis responde y navega; 6) abrir el Estudio de un video con spec.

## 6. De herramienta de Daniel a producto vendible (honesto)

Hoy el sistema es de **un solo espacio**: una base compartida del artefacto, la sesión de Claude de Daniel produce/renderiza/agenda, y Metricool está conectado a su cuenta. La interfaz ya queda lista para otros (preset, adaptador, cero KT en el código), pero **vender** exige backend real:
1. **Autenticación y espacios** (organización → cuentas → usuarios, roles: dueño, editor, revisor).
2. **Base multi espacio** (Postgres con seguridad por fila) detrás del mismo contrato de datos.
3. **Workers** que hagan lo que hoy hace la sesión de Claude: producir, renderizar (HyperFrames/ffmpeg), agendar.
4. **Metricool u otra API por OAuth** por cliente.
5. **Almacenamiento** de video con URLs firmadas y miniaturas; **cobro** (planes, uso).
6. Marca blanca (logo, colores del preset, dominio).
Orden recomendado: (a) piloto con 1–2 marcas amigas reusando este artefacto con presets; (b) backend mínimo con el contrato; (c) cobro.
