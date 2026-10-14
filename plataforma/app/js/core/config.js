/* Aura · presets de espacio de trabajo. Todo lo propio de una marca vive aqui (cuentas, formatos, tono, metas).
   El resto de la interfaz lee App.config y no menciona a ninguna marca. Se elige con ?preset=lumen o en Ajustes. */
(function () {
  "use strict";
  const App = window.App;
  const PRESETS = {
    kt: {
      id: "kt", name: "Portal KT", short: "KT", tagline: "Aprobación de contenido para Instagram", owner: "Daniel", voice: "vos", tz: -6, lang: "es",
      brands: [
        { id: "kt-es", name: "KT Español", handle: "@ktespanol", blogId: "6632330", color: "#0f6b6c", order: 1, lang: "es", network: "instagram" },
        { id: "kt-en", name: "KT English", handle: "@kevintrudeaubeststudent", blogId: "6683289", color: "#e0764a", order: 2, lang: "en", network: "instagram" },
      ],
      formats: [["ktvideos6", "Intro hook + Teacher a pantalla completa"], ["especial", "Especial con cutaways estilo Vox (Teacher + Reaction)"], ["ktvideos5", "Split-screen Teacher + Reaction"]],
      intros: [["nuevo-mio", "Voy a grabar un intro nuevo"], ["higgsfield", "Generarlo con Higgsfield (muestro el clip antes)"], ["reusar", "Reusar uno que ya existe (solo con permiso)"]],
      versionsOpts: [["4", "4 versiones: tres hooks y caja blanca"], ["3", "3 hooks"], ["1", "1 sola"]],
      musicOpts: [["intro", "Nuestra solo en el intro"], ["none", "Sin música"]],
      tags: ["Hook", "Subtítulos", "Intro", "Música", "Audio", "Cara tapada", "Otro"],
      rawLabels: { teacher: "Teachers libres", intro: "Intros libres" }, hasTeacher: true,
      runwayTarget: 20, runwayWarn: 5, viralThreshold: 1000,
      jarvis: { persona: "el asistente del portal de Daniel. Daniel maneja dos cuentas de Instagram de Kevin Trudeau (KT Español y KT English); el portal sirve para aprobar videos, ver cuánto contenido queda y los resultados de Instagram", chips: ["¿Qué tengo pendiente?", "¿Cuánto contenido queda?", "¿Cómo van las redes?", "Llevame a aprobar de inglés"] },
      features: { studio: true, lab: true, library: true, predictor: true },
    },
    lumen: {
      id: "lumen", name: "Lumen Studio", short: "LU", tagline: "Contenido de redes para tu marca", owner: "Sofía", voice: "tu", tz: -5, lang: "es",
      brands: [
        { id: "lumen-skin", name: "Lumen Skin", handle: "@lumen.skin", blogId: "100001", color: "#0f6b6c", order: 1, lang: "en", network: "instagram" },
        { id: "lumen-piel", name: "Lumen Piel", handle: "@lumen.piel", blogId: "100002", color: "#d9693f", order: 2, lang: "es", network: "instagram" },
        { id: "lumen-lab", name: "Lumen Lab", handle: "@lumenlab", blogId: "100003", color: "#7d5fb5", order: 3, lang: "en", network: "tiktok" },
      ],
      formats: [["voz", "Reel con voz en off"], ["antes-despues", "Antes y después"], ["testimonio", "Testimonio de cliente"], ["tutorial", "Tutorial paso a paso"]],
      intros: [["nuevo", "Grabar un gancho nuevo"], ["stock", "Usar material de archivo"]],
      versionsOpts: [["3", "3 ganchos distintos"], ["2", "2 ganchos"], ["1", "1 sola versión"]],
      musicOpts: [["trend", "Audio en tendencia"], ["suave", "Música suave"], ["none", "Sin música"]],
      tags: ["Gancho", "Subtítulos", "Producto", "Música", "Audio", "Iluminación", "Otro"],
      rawLabels: { teacher: "Presentadores libres", intro: "Ganchos libres" }, hasTeacher: false,
      runwayTarget: 14, runwayWarn: 4, viralThreshold: 1000,
      jarvis: { persona: "la asistente de Lumen Studio, que gestiona el contenido de redes de tres cuentas de cuidado de la piel", chips: ["¿Qué tengo pendiente?", "¿Cuánto contenido queda?", "¿Cómo van las redes?", "Llévame a Crear"] },
      features: { studio: true, lab: true, library: true, predictor: false },
    },
  };
  const pick = () => { try { const q = new URLSearchParams(location.search).get("preset"); if (q && PRESETS[q]) return q; } catch (e) { /* sin url */ } return App.store.get("preset", "kt"); };
  App.PRESETS = PRESETS;
  App.config = PRESETS[pick()] || PRESETS.kt;
  App.setPreset = (id) => { if (PRESETS[id]) { App.store.set("preset", id); location.reload(); } };
  // voseo o tuteo en las pocas frases que hablan directo a la persona
  App.say = (vos, tu) => (App.config.voice === "vos" ? vos : tu);
})();
