/* Aura · datos de demostracion. Se generan relativos a hoy para que el Inicio, las Metricas y el contenido asegurado siempre se vean vivos.
   Misma forma que las colecciones reales (ver CONTRATO-DE-DATOS.md). Se usan en modo demo y para "Cargar datos de demostracion". */
(function () {
  "use strict";
  const D = (window.AuraDemo = window.AuraDemo || {});
  const DAY = 864e5, pad = (n) => String(n).padStart(2, "0");
  const MON = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const ymd = (t) => { const d = new Date(t); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  const stampTs = (t) => { const d = new Date(t); return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + "00"; };
  const stampDay = (t) => { const d = new Date(t); return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()); };
  const seeded = (n) => { let s = n; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; };
  const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // piezas por preset: [nombre, ganchos por version]
  const CATALOG = {
    kt: {
      "kt-es": { lang: "es", pending: [["Tinta invisible", ["Esto es lo que nadie te dice de la tinta invisible", "Así escribes un mensaje que solo tú puedes leer", "Una hoja, una vela y 30 minutos cambian todo", "¿Sabías que una hoja guarda un secreto?"]], ["La regla de los 30 minutos", ["Esto es lo que hago cada mañana en 30 minutos", "Cómo ordeno mi día antes de que alguien me escriba", "30 minutos que valen más que tu semana"]], ["El hábito de dos dólares", ["Así convertí $2 en un hábito que me paga cada mes", "Con $2 al día construyes algo que nadie te quita"]]], approved: [["El ritual del domingo", 3], ["Dinero sin ruido", 2], ["Tu primer cliente", 4]], rejected: [["Pausa creativa", 2]] },
      "kt-en": { lang: "en", pending: [["The blank page", ["This is how I beat the blank page in 5 minutes", "Say this out loud before you write anything", "The one sentence that starts every great idea", "Why your first draft should be terrible"]], ["Morning ritual", ["Here is why I never check my phone before 9", "This is how I start every morning", "Do this before the world wakes up"]], ["One sheet rule", ["Here is the one sheet rule that changed my business", "One sheet of paper, one decision, every day"]]], approved: [["The quiet hour", 3], ["Small numbers", 2]], rejected: [["Coffee talk", 2]] },
    },
    lumen: {
      "lumen-skin": { lang: "en", pending: [["Glow routine", ["This is the 3 step routine behind my glow", "Here is why your skin looks tired by noon", "Stop doing this to your cleanser"]], ["Sunscreen myths", ["Here is what nobody tells you about SPF 50", "SPF mistakes that age you faster"]]], approved: [["Night serum", 3], ["Barrier repair", 2]], rejected: [["Clay mask", 2]] },
      "lumen-piel": { lang: "es", pending: [["Rutina de brillo", ["Esta es la rutina de 3 pasos que me dio brillo", "Así dejé de tener la piel opaca al mediodía"]], ["Mitos del protector", ["Esto es lo que nadie te dice del protector solar", "Errores con el SPF que te envejecen"]]], approved: [["Suero de noche", 3]], rejected: [["Mascarilla de arcilla", 2]] },
      "lumen-lab": { lang: "en", pending: [["Ingredient lab", ["This is what niacinamide actually does", "Here is how retinol really works in 4 weeks"]]], approved: [["Lab notes", 2]], rejected: [] },
    },
  };
  const TONES = ["amber", "ocean", "sage", "rose", "smoke", "teal", "gold", "dusk"];
  const CAPS_EN = "this is how I start every morning before the world wakes up and everything changes".split(" "), CAPS_ES = "así empiezo cada mañana antes de que el mundo despierte y todo cambie".split(" ");

  function build(presetId) {
    const cfg = (window.App && App.PRESETS && App.PRESETS[presetId]) || { brands: [] }, cat = CATALOG[presetId] || CATALOG.kt, now = Date.now();
    const out = { videos: {}, schedule: {}, metrics: {}, evolution: {}, notes: {}, requests: {}, refs: {}, exp_styles: {}, exp_rounds: {}, exp_cards: {}, home: {}, system: {}, studio_versions: {}, studio_transcripts: {}, studio_requests: {}, studio_media_feedback: {} };
    const rnd = seeded(presetId === "kt" ? 7 : 11);
    const mkCaps = (lang, fps) => { const w = lang === "es" ? CAPS_ES : CAPS_EN; let f = 0; return w.map((x, i) => { const s = f, e = f + 9 + Math.floor(rnd() * 9); f = e + 2; return [x, s, e, i % 7 === 3 ? 1 : 0, i % 5 === 1 ? 1 : 0]; }); };
    const slotDay = (b, i) => { const t = now + (i + 0.4) * DAY, d = new Date(t); return { ymd: ymd(t), label: `${d.getDate()} ${MON[d.getMonth()]}`, time: i % 2 ? "12:30" : "18:00" }; };
    cfg.brands.forEach((b, bi) => {
      const c = cat[b.id]; if (!c) return; let day = 0;
      // por aprobar
      c.pending.forEach(([name, hooks], pi) => hooks.forEach((hook, vi) => {
        const id = `${b.id}_${slug(name)}_v${vi + 1}`, sd = slotDay(b, 6 + pi + bi);
        out.videos[id] = { brand: b.id, piece: slug(name), pieceName: name, version: vi + 1, hook, caps: mkCaps(c.lang), capFps: 30, src: "demo-video", tone: TONES[(pi * 3 + vi + bi * 2) % TONES.length], status: (pi === 0 && vi === 2) ? "maybe" : "pending", date: sd.ymd, scheduled: `${sd.label} ${sd.time}`, order: pi + 1, fx: vi === 1 ? "zoom" : vi === 2 ? "mirror" : undefined, round: 1, duration: 8, tags: [] };
        if (out.videos[id].fx === undefined) delete out.videos[id].fx;
      }));
      // aprobados y agendados (algunos ya en Metricool)
      c.approved.forEach(([name, n], ai) => { for (let vi = 0; vi < n; vi++) {
        const id = `${b.id}_${slug(name)}_v${vi + 1}`, sd = slotDay(b, ai * 2 + 1 + bi);
        out.videos[id] = { brand: b.id, piece: slug(name), pieceName: name, version: vi + 1, hook: (c.lang === "es" ? ["Esto lo cambia todo", "Así lo hago yo", "Lo que nadie te dice", "Hazlo antes del lunes"] : ["This changes everything", "Here is how I do it", "What nobody tells you", "Do this before Monday"])[vi % 4], caps: mkCaps(c.lang), capFps: 30, src: "demo-video", tone: TONES[(ai + vi + bi) % TONES.length], status: "approved", decidedAt: new Date(now - (ai + 1) * 3600e3).toISOString(), inMetricool: ai === 0 || ai === 1, date: sd.ymd, scheduled: `${sd.label} ${sd.time}`, order: 20 + ai, round: 1, duration: 8 };
      } });
      c.rejected.forEach(([name, n], ri) => { for (let vi = 0; vi < n; vi++) { const id = `${b.id}_${slug(name)}_v${vi + 1}`; out.videos[id] = { brand: b.id, piece: slug(name), pieceName: name, version: vi + 1, hook: c.lang === "es" ? "Un gancho que no funcionó" : "A hook that did not work", caps: mkCaps(c.lang), src: "demo-video", tone: "smoke", status: "rejected", decidedAt: new Date(now - 86400e3).toISOString(), inMetricool: ri === 0 && vi === 0, date: ymd(now + 3 * DAY), scheduled: "", order: 40, round: 1, duration: 8 }; } });
      // agenda de los proximos dias (cuenta 1 con mas contenido que la 2)
      const slots = {}, days = bi === 0 ? 11 : bi === 1 ? 4 : 7;
      for (let i = 0; i < days; i++) { const t = now + (i + 0.3) * DAY, k = ymd(t); [["12:30", 0], ["18:00", 1]].forEach(([tm, j]) => { if (bi === 1 && j === 1 && i % 2) return; const appr = c.approved[(i + j) % Math.max(1, c.approved.length)]; slots[`${k}T${tm}`] = { piece: appr ? slug(appr[0]) : "pieza", v: 1 + ((i + j) % 3), name: appr ? appr[0] : "Pieza", hook: "" }; }); }
      out.schedule[b.id] = { slots };
      // Metricool: reels de los ultimos 100 dias + evolucion de 35 dias
      const rows = [], n = 46 + bi * 8;
      for (let i = 0; i < n; i++) { const t = now - (i * 2.1 + rnd() * 1.4) * DAY, v = Math.round(Math.pow(rnd(), 2.6) * 21000 + 400 + (bi === 0 ? 500 : 150)), likes = Math.round(v * (0.03 + rnd() * 0.04)), cm = Math.round(likes * (0.04 + rnd() * 0.05)), reach = Math.round(v * (0.62 + rnd() * 0.2)), sv = Math.round(likes * (0.2 + rnd() * 0.3)), sh = Math.round(likes * (0.1 + rnd() * 0.25)); rows.push([stampTs(t), "", `https://instagram.com/reel/demo${bi}${i}`, v, likes, cm, reach, sv, sh]); }
      out.metrics[b.blogId] = { updated: new Date(now - 3600e3 * 2).toISOString(), rows };
      const evo = [], base = bi === 0 ? 4100 : 1650; let fol = base;
      for (let i = 34; i >= 0; i--) { const t = now - i * DAY, g = Math.round(6 + rnd() * 16 + (i < 8 ? 8 : 0)), l = Math.round(2 + rnd() * 5), vw = Math.round(300 + rnd() * 1700 + (i < 8 ? 1300 : 0) + (bi === 0 ? 400 : 0)); fol += g - l; evo.push([fol, g, l, vw, Math.round(vw * (0.05 + rnd() * 0.04)), Math.round(vw * 0.7), stampDay(t)]); }
      out.evolution[b.blogId] = { updated: new Date(now - 3600e3 * 2).toISOString(), metrics: ["IGEV01", "IGEV43", "IGEV44", "IGEV05", "IGEV38", "IGEV06"], rows: evo };
    });
    const b0 = cfg.brands[0], first = b0 && Object.entries(out.videos).find(([, v]) => v.brand === b0.id && v.status !== "approved" && v.status !== "rejected");
    const firstId = first && first[0], first2 = first && Object.keys(out.videos).find((k) => k.startsWith(first[1].brand + "_" + first[1].piece) && k !== firstId);
    // notas y pedidos
    if (firstId) { out.notes.n1 = { video: firstId, brand: b0.id, piece: first[1].piece, round: 1, t: 2.4, tc: "0:02", text: "El gancho entra un poco tarde: cortar medio segundo del inicio.", tags: ["Hook"], status: "open", sent: false, by: "demo-user", created: new Date(now - 3600e3).toISOString(), scope: "video" };
      out.notes.n2 = { video: firstId, brand: b0.id, piece: first[1].piece, round: 1, t: 5.1, tc: "0:05", text: "Subtítulo tapado por el botón de Instagram.", tags: ["Subtítulos"], status: "open", sent: true, sentAt: new Date(now - 7200e3).toISOString(), by: "demo-user", created: new Date(now - 9000e3).toISOString(), scope: "video" };
      out.notes.n3 = { scope: "general", brand: "", title: "Todo el espacio", text: "Probar títulos más cortos en los primeros 2 segundos en todas las piezas.", tags: [], status: "open", sent: true, by: "demo-user", created: new Date(now - 86400e3).toISOString() };
      out.notes.n4 = { video: firstId, brand: b0.id, piece: first[1].piece, round: 1, t: 1.2, tc: "0:01", text: "Música muy alta en el intro.", tags: ["Música"], status: "fixed", sent: true, reply: "Bajé la música 6 dB en el intro.", by: "demo-user", created: new Date(now - 4 * DAY).toISOString(), scope: "video" }; }
    if (b0) {
      out.requests.new_demo1 = { kind: "new_video", brand: b0.id, blogId: b0.blogId, at: new Date(now - 2 * 3600e3).toISOString(), by: "demo-user", status: "produccion", topic: "Tres errores al empezar una rutina de mañana", hooks: [], count: 2, format: cfg.formats[0][0], versions: 4, music: cfg.musicOpts[0][0], steps: [{ id: "s1", text: "Escribir los 4 ganchos", status: "hecho" }, { id: "s2", text: "Grabar o elegir material", status: "hecho" }, { id: "s3", text: "Editar con el estilo elegido", status: "haciendo" }, { id: "s4", text: "Subir a Por aprobar", status: "pendiente" }], assets: [], links: [] };
      out.requests.new_demo2 = { kind: "new_video", brand: (cfg.brands[1] || b0).id, blogId: (cfg.brands[1] || b0).blogId, at: new Date(now - 26 * 3600e3).toISOString(), by: "demo-user", status: "revisar", topic: "La regla de una sola hoja", hooks: ["Here is the one sheet rule"], count: 1, format: cfg.formats[0][0], versions: 3, reply: "Listo: 3 versiones en Por aprobar.", steps: [{ id: "a", text: "Producción", status: "hecho" }, { id: "b", text: "Subida", status: "hecho" }], assets: [{ id: "0".repeat(32), name: "intro-crudo.mp4", size: 9400000, purpose: "crudo" }] };
      out.requests.new_demo3 = { kind: "new_video", brand: b0.id, blogId: b0.blogId, at: new Date(now - 600e3).toISOString(), by: "demo-user", status: "pedido", topic: "Respuesta a la pregunta más repetida de la semana", hooks: [], count: 1, format: cfg.formats[0][0], versions: 3, steps: [], assets: [], links: [] };
    }
    // referencias, estilos y ronda de laboratorio
    out.refs.r1 = { kind: "link", url: "https://www.instagram.com/reel/demoReferencia1/", assetId: "", name: "", note: "Me gusta cómo entran las palabras clave y el ritmo de los cortes.", status: "analizada", sent: true, created: new Date(now - 3 * DAY).toISOString(), analysis: { resumen: "Reel de 22 s con texto grande centrado y cortes cada 1.8 s.", texto: "Una palabra enorme por idea, en mayúsculas y amarillo.", transiciones: "Cortes secos y un flash blanco en los cambios de tema.", animaciones: "Entrada con rebote en cada palabra.", ritmo: "Rápido: ~33 cortes por minuto.", colores: "Fondo oscuro, amarillo y blanco.", comoRecrear: ["Texto Anton al centro con brillo suave", "Flash de 4 cuadros en cada cambio de idea", "Entrada con pop de 0.18 s"] }, styleId: "st_titular" };
    out.refs.r2 = { kind: "link", url: "https://www.tiktok.com/@demo/video/123456789", assetId: "", name: "", note: "El panel con tres pasos.", status: "enviada", sent: true, created: new Date(now - 1 * DAY).toISOString() };
    out.refs.r3 = { kind: "file", url: "", assetId: "demo-video", name: "referencia-ritmo.mp4", note: "Quiero este ritmo en el intro.", status: "nueva", sent: false, created: new Date(now - 3600e3).toISOString() };
    out.exp_styles.st_titular = { name: "Titular amarillo con brillo", description: "Una frase corta, enorme y amarilla en el centro. La idea que tiene que leerse sí o sí.", status: "aprobado", kind: "estilo", demo: "e-titular-amarillo", when: "Para la idea central del video.", decidedAt: new Date(now - 5 * DAY).toISOString() };
    out.exp_styles.st_flash = { name: "Flash en el cambio de tema", description: "Un destello blanco de cuatro cuadros cuando cambia la idea.", status: "aprobado", kind: "transicion", demo: "x-flash", when: "Golpe de ritmo en el corte.", decidedAt: new Date(now - 4 * DAY).toISOString() };
    out.exp_styles.st_karaoke = { name: "Subtítulo karaoke", description: "Cada palabra se enciende al decirse.", status: "aprobado", kind: "subtitulos", demo: "t-karaoke", when: "Videos explicativos con voz clara.", decidedAt: new Date(now - 2 * DAY).toISOString() };
    out.exp_styles.st_ding = { name: "Campanita en los datos", description: "Un ding suave cuando aparece una cifra.", status: "aprobado", kind: "sonido", demo: "s-ding", when: "Cuando sale un dato.", decidedAt: new Date(now - DAY).toISOString() };
    out.exp_styles.st_panel = { name: "Panel de tres pasos", description: "Tarjeta oscura con tres pasos numerados.", status: "prueba", kind: "estilo", demo: "e-panel-explicativo" };
    out.exp_styles.st_glitch = { name: "Glitch en el gancho", description: "Un temblor digital al abrir.", status: "prueba", kind: "texto", demo: "t-glitch" };
    out.exp_styles.st_typed = { name: "Máquina de escribir", description: "El texto se escribe solo.", status: "descartado", kind: "texto", demo: "t-typed", decidedAt: new Date(now - 6 * DAY).toISOString() };
    out.exp_rounds.rd1 = { name: "7", status: "abierta", created: new Date(now - 2 * DAY).toISOString(), overall: "", overallDirty: false };
    [["t-pop", "Aparece con rebote", "Cada palabra salta al entrar.", "keep"], ["t-slide", "Sube deslizando", "Las palabras suben una tras otra.", "maybe"], ["t-fade", "Difuminado suave", "Entra desde el desenfoque.", ""], ["x-wipe", "Barrido", "Un cambio de tema limpio.", ""], ["x-punch", "Zoom de golpe", "Empuja la frase fuerte.", "drop"], ["s-whoosh", "Barrido de aire", "Acompaña una transición.", ""]].forEach(([demo, label, desc, verdict], i) => { out.exp_cards["c" + i] = { round: "rd1", order: i, demo, label, desc, verdict, note: verdict === "maybe" ? "Funciona, pero un poco lento." : "", dirty: !!verdict, styleId: "" }; });
    // pendientes, sistema y logros
    out.home.todo = { items: [{ id: "t_grabar", urgency: "week", title: "Grabar el intro de la próxima semana", detail: "Hay 1 intro libre en la cuenta principal." }, { id: "t_revisar", urgency: "today", title: "Revisar la propuesta de estilo del Laboratorio", detail: "Dos estilos esperan tu decisión.", dismissable: true }] };
    out.home.done = {};
    out.system.status = { teachersFree: 7, teachersNote: "según el registro de presentadores", brands: Object.fromEntries(cfg.brands.map((b, i) => [b.id, { introsFree: i === 1 ? 0 : 3, introsNote: i === 1 ? "todos usados" : "listos para usar" }])), updated: new Date(now).toISOString(), rules: [], skills: [] };
    // Estudio: especificaciones para editar de verdad
    const SMo = window.StudioModel, SLb = window.StudioLib;
    if (SMo && SLb && firstId) {
      const mk = (vid, v, lang) => {
        let s = SMo.newSpec({ duration: 8, lang, base: { asset: "demo-video", cutout: "", audio: false, focus: { x: 540, y: 1250 }, face: { top: 190, chin: 760 } } });
        const add = (tr, clip) => { s = SMo.addClip(s, tr, clip).spec; };
        add("bg", SLb.FONDOS.gradient.make(0, {})); s.tracks[0].clips[0].d = 8; s.tracks[0].clips[0].cutout = false;
        const t = SLb.TEXTOS.titulo.make(0.6, { face: { chin: 760 } }); t.text = (v.hook || "").split(" ").slice(0, 3).join(" ").toUpperCase(); t.d = 3; add("text", t);
        const a = SLb.TEXTOS.aston.make(3.6, { face: { chin: 760 } }); a.text = lang === "es" ? "mañana" : "morning"; a.d = 2; add("text", a);
        const c = SLb.TEXTOS.tarjeta.make(5.2, { face: { chin: 760 } }); c.d = 2.4; add("media", c);
        add("sfx", { t: 0.55, sfx: "whoosh" });
        const words = (v.caps || []).slice(0, 14).map((w) => w[0]); const lines = []; for (let i = 0; i < words.length; i += 3) lines.push([+(i * 0.5).toFixed(2), +(i * 0.5 + 1.4).toFixed(2), words.slice(i, i + 3).join(" ")]);
        s = SMo.setSubs(s, { lines, style: { font: "Inter", size: 64, y: 1450, hero: [], key: [] } });
        return { project: v.piece, spec: s, rev: 1, updatedAt: new Date(now - 3600e3).toISOString(), log: [{ at: new Date(now - 3600e3).toISOString(), text: "Armé el editor con el texto del gancho", by: "claude" }], by: "claude" };
      };
      [firstId, first2].filter(Boolean).forEach((id) => { out.studio_versions[id] = mk(id, out.videos[id], (out.videos[id].brand.endsWith("en") || (cat[out.videos[id].brand] || {}).lang === "en") ? "en" : "es"); });
      const lg = (cat[b0.id] || {}).lang || "es", words = (lg === "es" ? CAPS_ES : CAPS_EN);
      out.studio_transcripts[first[1].piece] = { lines: [0, 1, 2, 3].map((i) => ({ s: i * 2, e: i * 2 + 1.9, es: CAPS_ES.slice(i * 3, i * 3 + 4).join(" "), en: CAPS_EN.slice(i * 3, i * 3 + 4).join(" ") })) };
      out.studio_requests.sr1 = { videoId: firstId, project: first[1].piece, brand: b0.id, kind: "cambio", text: "Agrega una transición de iris cuando cambia el fondo", scope: "video", targets: [], status: "trabajando", steps: [{ id: "1", text: "Revisar el fondo actual", status: "hecho" }, { id: "2", text: "Poner iris de 0.6 s en la entrada", status: "haciendo" }, { id: "3", text: "Revisar las reglas de diseño", status: "pendiente" }], at: new Date(now - 600e3).toISOString(), by: "demo-user", rev: 1 };
      out.studio_requests.sr2 = { videoId: firstId, project: first[1].piece, brand: b0.id, kind: "cambio", text: "Pon las palabras clave en amarillo", scope: "video", targets: [], status: "listo", reply: "Listo: las palabras clave van en amarillo.", steps: [{ id: "1", text: "Marcar palabras clave", status: "hecho" }, { id: "2", text: "Aplicar color", status: "hecho" }], at: new Date(now - 5 * 3600e3).toISOString(), by: "demo-user", rev: 1 };
      void words;
    }
    return out;
  }
  D.seed = build;
  // filas de Metricool para el adaptador de demostracion (cuando se pide actualizar)
  D.metricRows = (brand, evo) => { const s = build(App.config.id); const m = evo ? s.evolution : s.metrics; return (m[brand.blogId] || { rows: [] }).rows; };
  // demo: deja casi todos los logros como vistos para celebrar solo dos nuevos
  D.seedTrophies = function () {
    if (!window.App || !App.trophies || App.S.trophyDoc) return;
    const T = App.trophies, cs = T.cards(), ids = T.all(cs).flatMap((c) => c.ids); if (!ids.length) return;
    const keep = ids.filter((i) => /^total:(streak|weekFollowers|best):/.test(i)).slice(-2), at = App.stamp();
    App.S.trophyDoc = { baseline: at, seen: Object.fromEntries(ids.filter((i) => !keep.includes(i)).map((i) => [i, at])) }; App.data.set("home", "trophies", App.S.trophyDoc); App.emit("home");
  };
})();
