/* Aura · catalogo de la Biblioteca. Une el catalogo del motor del Estudio (siempre disponible) con los estilos que se aprobaron en el Laboratorio.
   Cada elemento: { id, type, name, desc, when, demo, source, rules } */
(function () {
  "use strict";
  const App = window.App, S = App.S;
  const TYPES = [["todo", "Todo", "grid"], ["estilos", "Estilos", "sparkles"], ["transiciones", "Transiciones", "layers"], ["textos", "Textos", "type"], ["fondos", "Fondos", "image"], ["subtitulos", "Subtítulos", "note"], ["sonidos", "Sonidos", "volume"], ["referencias", "Referencias", "link"]];
  const WHEN = {
    estilos: { "titular-amarillo": "Para la idea central del video, una frase corta que se tiene que leer sí o sí.", "palabra-ancla": "Cuando hay una palabra que carga todo el mensaje.", "fondo-recortado": "Para dar presencia a la persona sobre un fondo limpio.", "ensayo-combo": "Videos explicativos largos con muchas ideas.", "panel-explicativo": "Cuando necesitas desglosar un concepto en pasos.", ranking: "Para listas con niveles o comparaciones.", "texto-nativo": "Look de red social, sin producción visible.", "caja-blanca": "Una versión distinta de la pieza para que no se lea como copia." },
    transiciones: { iris: "Para entrar a un fondo nuevo desde la cara.", zoom: "Para dar énfasis en una frase fuerte.", wipe: "Cambio de tema o de sección.", slide: "Cuando una idea empuja a la siguiente.", flash: "Golpe de ritmo en el corte.", blur: "Pasaje suave entre escenas.", cut: "Lo más limpio: cuando el ritmo ya lo da el audio." },
  };
  const TEXT_ANIM = [["pop", "Aparece con rebote", "Cada palabra salta al entrar. Da energía."], ["slide", "Sube deslizando", "Las palabras suben una tras otra. Limpio y legible."], ["typed", "Máquina de escribir", "El texto se escribe solo. Para datos y citas."], ["fade", "Difuminado suave", "Entra desde el desenfoque. Calmado, elegante."], ["karaoke", "Karaoke", "Cada palabra se enciende al decirse."], ["glitch", "Glitch", "Un temblor digital. Úsalo con poca frecuencia."]];
  const SOUNDS = [["click", "Clic", "Toque seco para botones y cambios pequeños."], ["whoosh", "Barrido", "Para acompañar una transición o un deslizamiento."], ["impact", "Impacto", "Golpe grave para una frase fuerte."], ["pop", "Pop", "Burbuja corta para que aparezca un texto."], ["ding", "Campanita", "Aviso positivo: un dato, un logro."]];
  const TRANS_DEMO = { iris: "iris", zoom: "punch", wipe: "wipe", slide: "slide", flash: "flash", blur: "blur", cut: "cut" };

  function catalog() {
    const L = window.StudioLib, out = [];
    if (L) {
      Object.entries(L.ESTILOS).forEach(([k, v]) => out.push({ id: "estilo:" + k, type: "estilos", name: v.name, desc: v.desc, when: WHEN.estilos[k] || "", demo: "e-" + k, source: "estudio", studioId: k }));
      Object.entries(L.TRANSICIONES).forEach(([k, v]) => out.push({ id: "transicion:" + k, type: "transiciones", name: v.name, desc: v.desc, when: WHEN.transiciones[k] || "", demo: "x-" + (TRANS_DEMO[k] || "cut"), source: "estudio", studioId: k }));
      Object.entries(L.TEXTOS).forEach(([k, v]) => out.push({ id: "texto:" + k, type: "textos", name: v.name, desc: v.desc, when: "Al agregar texto en el Estudio.", demo: "tx-" + k, source: "estudio", studioId: k }));
      Object.entries(L.FONDOS).forEach(([k, v]) => out.push({ id: "fondo:" + k, type: "fondos", name: v.name, desc: v.desc, when: "Detrás de la persona recortada.", demo: "bg-" + k, source: "estudio", studioId: k }));
      Object.entries(L.SUBS).forEach(([k, v]) => out.push({ id: "subs:" + k, type: "subtitulos", name: v.name, desc: v.desc, when: "Subtítulos automáticos de todo el video.", demo: "sub-" + k, source: "estudio", studioId: k }));
    }
    TEXT_ANIM.forEach(([k, n, d]) => out.push({ id: "anim:" + k, type: "textos", name: n, desc: d, when: "Animación de entrada del texto.", demo: "t-" + k, source: "laboratorio" }));
    SOUNDS.forEach(([k, n, d]) => out.push({ id: "sonido:" + k, type: "sonidos", name: n, desc: d, when: "Pista de sonido del Estudio.", demo: "s-" + k, source: "laboratorio" }));
    // estilos propios aprobados en el Laboratorio (no repetir los que ya estan arriba)
    S.expStyles.filter((s) => s.status === "aprobado").forEach((s) => {
      const type = ({ transicion: "transiciones", texto: "textos", fondo: "fondos", subtitulos: "subtitulos", sonido: "sonidos" })[s.kind] || "estilos";
      out.push({ id: "lab:" + s.id, type, name: s.name, desc: s.description || s.desc || "", when: s.when || "", demo: s.demo || "e-palabra-ancla", source: "laboratorio", styleId: s.id, approvedAt: s.decidedAt });
    });
    S.libraryItems.forEach((s) => out.push({ id: "custom:" + s.id, type: s.type || "estilos", name: s.name, desc: s.desc || "", when: s.when || "", demo: s.demo || "e-palabra-ancla", source: "propio", styleId: s.id }));
    S.refs.forEach((r) => out.push({ id: "ref:" + r.id, type: "referencias", name: r.name || (r.url ? r.url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40) : "Referencia"), desc: r.note || "", when: "", demo: r.assetId ? "v-" + r.assetId : "ref-link", source: "referencia", ref: r }));
    return out;
  }
  App.lib = { TYPES, catalog, TEXT_ANIM, SOUNDS, TRANS_DEMO, countByType: () => { const c = {}; catalog().forEach((i) => { c[i.type] = (c[i.type] || 0) + 1; }); return c; } };
})();
