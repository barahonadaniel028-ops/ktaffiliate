/* Aura · Crear → "Grabar" (DECISIONES.md #19): el acompañante para grabar los mejores videos. Es una conversación dentro de la misma nube de Crear
   (App.crear.cloud + advanceStep, como crear-video.js) que termina en el teleprompter propio (teleprompter.js):
     ¿Ya tenés ideas? ── Todavía no ──> 21 ideas (o las tuyas) ─> elegís una ─> "contame todo" (micrófono o texto) ─> guion ─> aprobar / pedir cambios ─> teleprompter
                       └─ Sí ─────────> decís todas tus ideas ─> un guion por idea (comparar) ─> elegís ─> (aprobar) ─> teleprompter
                       └─ Entrevista ─> tema ─> preguntas entre los dos (editables) ─> segundos por pregunta ─> teleprompter (modo entrevista)
   Contrato con crear.js (igual que crearEstilo / crearVideo): App.crearGrabar.render() / bind(root) / back() (true = manejó su paso atrás).
   Todo el "pensar" vive en App.grabarAI (más abajo): prueba primero con Claude (App.adapter().sample(), SOLO tras un botón apretado, una vez, sin reintentos)
   y, si no hay IA o falla, cae a reglas locales que igual dan un resultado bueno. Nada acá toca window.claude directo. */
(function () {
  "use strict";
  const App = window.App, S = App.S, sel = App.sel, UI = App.ui, { $, $$, esc, icon, toast } = App;
  UI.crear = UI.crear || {};

  const N_IDEAS = 21, Q_DEFAULT = 6, Q_MAX = 12, MINE_MAX = 6, SECS = [10, 15, 20, 30, 45, 60], SECS_DEFAULT = 30, SECS_MIN = 5, SECS_MAX = 300, WPS = 2.5; // 150 palabras por minuto
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const words = (s) => String(s || "").match(/[\p{L}\p{N}'’$%]+/gu) || [];
  const nWords = (s) => words(s).length;
  const uniq = (a) => [...new Set(a)];
  const cap1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const low1 = (s) => (s && !/^[\p{Lu}\d]{2,}/u.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s); // "Tinta invisible" -> "tinta invisible", pero "SPF" se queda
  const seeded = (seed) => { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }; // el mismo generador que usa el resto de la demo
  const shuffle = (arr, rnd) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "video";
  const secondsOf = (nw) => Math.max(5, Math.round(nw / WPS / 5) * 5);
  const clock = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  const defineMeta = (data, meta) => { try { Object.defineProperty(data, "meta", { value: meta, enumerable: false, configurable: true }); } catch (e) { /* congelado: sin meta */ } return data; };

  // =====================================================================================================================================
  // 1) LO QUE SABEMOS DE LA CUENTA (para que las ideas no sean genéricas)
  // =====================================================================================================================================
  const stripV = (s) => String(s || "").replace(/\s*[·\-–]\s*v\d+$/i, "").replace(/[.:;,!?]+$/, "").trim();
  // Tema, tono y lo que ya rindió de la cuenta activa. No hay un campo "nicho": se deduce de las piezas que ya produjo, sus ganchos aprobados, sus pedidos
  // y la descripción del asistente del espacio (App.config.jarvis.persona). Es lo que se le manda a Claude y lo que usa el generador local.
  function brandCtx(brand) {
    const b = brand && brand.id ? (S.brands.find((x) => x.id === brand.id) || brand) : sel.brand(), lang = b.lang === "en" ? "en" : "es";
    const mine = S.videos.filter((v) => v.brand === b.id);
    const piezas = uniq(mine.map((v) => stripV(v.pieceName || v.piece)).filter(Boolean)).slice(0, 12);
    const aprobados = mine.filter((v) => v.status === "approved" || v.published);
    const ganchos = uniq(aprobados.map((v) => (App.pred ? App.pred.hookText(v) : String(v.hook || "")).trim()).filter(Boolean)).slice(0, 8);
    let mejor = "", mejorPuntaje = null;
    try { const g = sel.igOf(b), row = g && g.top ? sel.enrich(b, [g.top])[0] : null; if (row && row.m) mejor = stripV(row.m.name || row.m.piece); } catch (e) { /* sin metricas todavia */ }
    if (!mejor && App.pred && App.pred.enabled()) { // sin métricas de Instagram: la pieza cuyo gancho mejor puntúa en el predictor
      try { const by = new Map(); aprobados.forEach((v) => { const k = v.piece; (by.get(k) || by.set(k, []).get(k)).push(v); }); let best = null; by.forEach((vs) => { const gs = App.pred.groupScore(vs); if (gs && (!best || gs.avg > best.avg)) best = { avg: gs.avg, name: stripV(vs[0].pieceName || vs[0].piece) }; }); if (best) { mejor = best.name; mejorPuntaje = best.avg; } } catch (e) { /* sin predictor */ }
    }
    const pedidos = S.requests.filter((r) => r.brand === b.id && r.topic).map((r) => String(r.topic).slice(0, 90)).slice(-5);
    return { id: b.id, nombre: b.name, usuario: b.handle || "", red: b.network || "instagram", lang, tono: App.config.voice === "vos" ? "cercano, directo" : "cercano, claro", espacio: App.config.jarvis.persona, piezas, ganchos, mejor, mejorPuntaje, pedidos,
      predictor: !!(App.pred && App.pred.enabled()) };
  }

  // =====================================================================================================================================
  // 2) REGLAS LOCALES (sin IA): 21 ideas, estructurar lo que dijo la persona, retoques simples y preguntas de entrevista
  // =====================================================================================================================================
  // Plantillas [categoría, título, gancho]. Los ganchos son SIEMPRE una promesa directa ("Esto es...", "Así...") y sin signos de pregunta: es lo
  // que mejor rindió en los datos del predictor (pred.js: "los ganchos con promesa pasan las 1000 vistas; ninguna pregunta lo hizo").
  // Las frases funcionan con temas sin artículo ("tinta invisible") y con artículo ("el retinol"): solo usan "sobre/con/para", nunca "de {t}".
  const TPL = {
    es: [
      ["mito", "El mito más grande sobre {t}", "Esto es lo que te mintieron sobre {t}."],
      ["error", "El error que casi todos cometen con {t}", "Esto es lo que casi todos hacen mal con {t}."],
      ["lista", "{n} cosas que nadie te dice sobre {t}", "Esto es lo que nadie te cuenta sobre {t}."],
      ["rapido", "{t} en 30 segundos", "Esto es todo lo que necesitas saber sobre {t}, en 30 segundos."],
      ["historia", "Mi historia con {t}", "Esto es lo que aprendí después de un año con {t}."],
      ["reto", "Probé {t} durante 7 días", "Esto fue lo que pasó cuando probé {t} durante 7 días seguidos."],
      ["faq", "La pregunta que más me hacen sobre {t}", "Esto es lo que más me preguntan sobre {t}, y te lo respondo ahora."],
      ["rutina", "Mi rutina con {t}, paso a paso", "Así uso {t} todos los días, paso a paso."],
      ["cero", "Lo que haría distinto si empezara de cero con {t}", "Si empezara hoy con {t}, haría solo esto."],
      ["reaccion", "Lo que dice internet sobre {t}", "Esto es lo que dice internet sobre {t} y por qué no siempre es cierto."],
      ["necesitas", "Lo único que necesitas para empezar con {t}", "Esto es lo único que necesitas para empezar con {t}."],
      ["vs", "{t}: lo que todos hacen vs lo que funciona", "Esto es lo que todos hacen con {t} y lo que de verdad funciona."],
      ["secreto", "El detalle sobre {t} que casi nadie nota", "Este es el detalle sobre {t} que cambia el resultado."],
      ["detras", "Detrás de cámaras con {t}", "Así es por dentro mi trabajo con {t}."],
      ["principiante", "Guía rápida para principiantes: {t}", "Esto es lo básico que debes saber sobre {t} si empiezas hoy."],
      ["antes", "Antes y después: {t}", "Esto es lo que cambió cuando empecé con {t}."],
      ["regla", "La regla de oro con {t}", "Esta es la única regla que sigo con {t}."],
      ["pasos", "{t} en {n} pasos", "Así lo hago: {t} en {n} pasos simples."],
      ["yo", "Lo que le diría a mi yo de hace un año sobre {t}", "Esto es lo que le diría a mi yo del pasado sobre {t}."],
      ["dudas", "Respondo sus dudas sobre {t}", "Esto es lo que me preguntaron sobre {t} esta semana."],
      ["porque", "Por qué cambié mi forma de ver {t}", "Esto es lo que me hizo cambiar de opinión sobre {t}."],
      ["checklist", "Checklist rápido sobre {t}", "Guarda este checklist sobre {t} para tenerlo a mano."],
      ["tendencia", "Lo que está pasando con {t} ahora mismo", "Esto es lo que cambió con {t} este mes y casi nadie lo notó."],
      ["caso", "Un ejemplo real con {t}", "Mira este ejemplo real con {t}, paso a paso."],
      { b: 1, c: "parte2", t: "Parte 2 de «{b}»", h: "Muchos pidieron la segunda parte de «{b}», así que aquí está." },
      { b: 1, c: "parte2", t: "Lo que no te conté en «{b}»", h: "Esto es lo que me faltó decir en «{b}»." },
      { b: 1, c: "parte2", t: "«{b}» explicado de otra forma", h: "Esta es otra forma, más simple, de entender «{b}»." },
    ],
    en: [
      ["mito", "The biggest myth about {t}", "This is what they got wrong about {t}."],
      ["error", "The mistake almost everyone makes with {t}", "This is what most people get wrong with {t}."],
      ["lista", "{n} things nobody tells you about {t}", "This is what nobody tells you about {t}."],
      ["rapido", "{t} in 30 seconds", "This is everything you need to know about {t}, in 30 seconds."],
      ["historia", "My story with {t}", "This is what I learned after a year with {t}."],
      ["reto", "I tried {t} for 7 days", "This is what happened when I tried {t} for 7 days straight."],
      ["faq", "The question I get most about {t}", "This is what people ask me most about {t}, answered."],
      ["rutina", "My routine with {t}, step by step", "This is how I use {t} every day, step by step."],
      ["cero", "What I would do differently starting over with {t}", "If I started with {t} today, I would do only this."],
      ["reaccion", "What the internet says about {t}", "This is what the internet says about {t} and why it is not always true."],
      ["necesitas", "All you need to start with {t}", "This is all you need to get started with {t}."],
      ["vs", "{t}: what everyone does vs what works", "This is what everyone does with {t} and what actually works."],
      ["secreto", "The detail about {t} almost nobody notices", "This is the detail about {t} that changes the result."],
      ["detras", "Behind the scenes with {t}", "This is what my work with {t} looks like from the inside."],
      ["principiante", "A quick beginner guide: {t}", "This is the basics of {t} if you are starting today."],
      ["antes", "Before and after: {t}", "This is what changed when I started with {t}."],
      ["regla", "The golden rule with {t}", "This is the only rule I follow with {t}."],
      ["pasos", "{t} in {n} steps", "Here is how I do it: {t} in {n} simple steps."],
      ["yo", "What I would tell my past self about {t}", "This is what I would tell my past self about {t}."],
      ["dudas", "Answering your questions about {t}", "This is what you asked me about {t} this week."],
      ["porque", "Why I changed how I see {t}", "This is what made me change my mind about {t}."],
      ["checklist", "A quick checklist for {t}", "Save this checklist for {t} so you have it handy."],
      ["tendencia", "What is happening with {t} right now", "This is what changed with {t} this month and few noticed."],
      ["caso", "A real example with {t}", "Look at this real example with {t}, step by step."],
      { b: 1, c: "parte2", t: "Part 2 of «{b}»", h: "Many of you asked for part two of «{b}», so here it is." },
      { b: 1, c: "parte2", t: "What I left out of «{b}»", h: "This is what I forgot to say in «{b}»." },
      { b: 1, c: "parte2", t: "«{b}» explained differently", h: "This is another, simpler way to understand «{b}»." },
    ],
  };
  // "por qué puede funcionar", siempre en español (es para la persona que graba, no para el público)
  const WHY = {
    mito: "Los mitos generan comentarios: la gente corrige o confirma.", error: "Un error común engancha porque nadie quiere cometerlo.", lista: "Una lista con número promete un final claro y se mira hasta el final.",
    rapido: "Un tiempo concreto baja la barrera: se ve completo.", historia: "Una historia en primera persona crea cercanía con quien te sigue.", reto: "Un reto con días da un antes y un después fácil de seguir.",
    faq: "Responde algo que ya se preguntan: es contenido con demanda.", rutina: "Mostrar el proceso paso a paso se guarda y se comparte.", cero: "Un consejo de experiencia se guarda para usarlo después.",
    reaccion: "Partir de lo que ya se dice en internet da contexto y debate.", necesitas: "Promete simplicidad: lo único que hace falta.", vs: "Comparar lo común con lo que funciona deja una enseñanza clara.",
    secreto: "Un detalle poco conocido da curiosidad sin explicar de más.", detras: "El detrás de cámaras muestra a la persona, no solo el resultado.", principiante: "Le habla a quien recién llega: la audiencia más grande.",
    antes: "Un antes y un después se entiende en segundos.", regla: "Una sola regla es fácil de recordar y de compartir.", pasos: "Una cantidad de pasos concreta ordena el video.",
    yo: "Mirar atrás con humildad conecta y se siente honesto.", dudas: "Contestar dudas reales refuerza a la comunidad.", porque: "Contar un cambio de opinión da credibilidad.",
    checklist: "Un checklist se guarda y se vuelve a usar.", tendencia: "Lo que cambió hoy tiene urgencia: se mira ya.", caso: "Un ejemplo real vale más que la explicación.",
    parte2: "Es lo que mejor funcionó en esta cuenta: una continuación aprovecha esa audiencia.",
  };
  const PRED_NOTE = " Gancho de promesa directa, lo que mejor rindió en los datos.";
  // temas propios de cada cuenta del demo + comodines por idioma; las piezas reales de la cuenta van primero
  const EXTRA = {
    "kt-es": ["la rutina de la mañana", "escribir a mano", "empezar un proyecto", "la hoja en blanco", "planear el día"],
    "kt-en": ["the morning routine", "writing by hand", "starting a project", "the blank page", "planning the day"],
    "lumen-skin": ["the night routine", "SPF", "the cleanser step", "retinol", "hydration"],
    "lumen-piel": ["la rutina de noche", "el protector solar", "el paso del limpiador", "el retinol", "la hidratación"],
    "lumen-lab": ["niacinamide", "vitamin C", "ingredient labels", "the skin barrier", "retinol"],
  };
  const GENERIC = {
    es: ["los primeros pasos", "los errores de principiante", "las herramientas básicas", "los hábitos que funcionan", "el proceso completo", "las preguntas frecuentes", "los resultados reales", "las reglas simples"],
    en: ["the first steps", "beginner mistakes", "the basic tools", "habits that work", "the whole process", "common questions", "real results", "simple rules"],
  };
  function topicsOf(ctx) {
    const mine = ctx.piezas.map((p) => low1(p)), extra = (EXTRA[ctx.id] || []).concat(GENERIC[ctx.lang]);
    const seen = new Set(), out = [];
    mine.concat(extra).forEach((t) => { const k = norm(t); if (t && !seen.has(k)) { seen.add(k); out.push(t); } });
    return out.slice(0, 16);
  }
  // Exactamente `n` ideas, siempre las mismas para la misma ronda y distintas en cada ronda (la semilla incluye la ronda y se evita lo ya mostrado).
  function localIdeas(ctx, n, round, avoid) {
    const lang = ctx.lang === "en" ? "en" : "es", tpls = TPL[lang].filter((t) => !t.b || ctx.mejor), T = topicsOf(ctx), rnd = seeded(App.hash(ctx.id + "#" + (round || 0)));
    const avoided = new Set((avoid || []).map(norm));
    const pairs = []; tpls.forEach((tp) => (tp.b ? [ctx.mejor] : T).forEach((t) => pairs.push([tp, t])));
    const mk = (tp, t) => {
      const num = [3, 5, 7][Math.floor(rnd() * 3)], c = tp.c || tp[0], tt = tp.t || tp[1], hh = tp.h || tp[2], fill = (s) => s.replace(/\{t\}/g, t).replace(/\{b\}/g, t).replace(/\{n\}/g, num);
      const why = c === "parte2" ? WHY.parte2 + (ctx.mejor ? ` («${ctx.mejor}»)` : "") : WHY[c] + (ctx.predictor ? PRED_NOTE : "");
      return { cat: c, topic: t, titulo: cap1(fill(tt)), gancho: fill(hh), por_que: why };
    };
    const order = shuffle(pairs, rnd), out = [], titles = new Set();
    // varias pasadas con límites cada vez más flojos por tema y por categoría: primero variedad, y si no alcanza, completa
    const passes = [[2, 2], [3, 3], [5, 5], [99, 99]];
    for (const skipAvoided of [true, false]) {
      for (const [maxT, maxC] of passes) {
        const byT = {}, byC = {}; out.forEach((i) => { byT[i.topic] = (byT[i.topic] || 0) + 1; byC[i.cat] = (byC[i.cat] || 0) + 1; });
        for (const [tp, t] of order) {
          if (out.length >= n) break;
          const it = mk(tp, t), k = norm(it.titulo);
          if (titles.has(k) || (skipAvoided && avoided.has(k)) || (byT[it.topic] || 0) >= maxT || (byC[it.cat] || 0) >= maxC) continue;
          titles.add(k); byT[it.topic] = (byT[it.topic] || 0) + 1; byC[it.cat] = (byC[it.cat] || 0) + 1; out.push(it);
        }
        if (out.length >= n) break;
      }
      if (out.length >= n) break;
    }
    return out.slice(0, n).map((i) => ({ titulo: i.titulo, gancho: i.gancho, por_que: i.por_que }));
  }

  // ---------- estructurar lo que dijo la persona (sin inventar nada: se usan SUS palabras) ----------
  const FILLER = { es: /\b(?:eh+|ehm+|mm+|hmm+|osea|o sea|digamos|como que)\b[,]?\s*/gi, en: /\b(?:um+|uh+|erm+|you know|i mean|kind of|sort of)\b[,]?\s*/gi };
  const LEAD = { es: /^(?:y|e|pero|entonces|bueno|pues|o sea|osea)[,\s]+/i, en: /^(?:and|so|well|okay|ok|but)[,\s]+/i };
  const CTA_RX = /(s[ií]gueme|seguime|s[ií]gueme|sigue|guarda|gu[aá]rdalo|guardalo|comparte|comp[aá]rtelo|compartilo|comenta|comenten|suscr[ií]b|follow|save|share|comment|subscribe)/i;
  const CTA_DEFAULT = { es: "Si esto te sirvió, guárdalo y sígueme para más.", en: "If this helped, save it and follow for more." };
  const CTA_ALT = { es: ["Cuéntame en los comentarios qué opinas.", "Compártelo con alguien que lo necesite.", "Sígueme para ver la segunda parte.", "Guárdalo para cuando lo necesites."], en: ["Tell me in the comments what you think.", "Share it with someone who needs it.", "Follow me for part two.", "Save it for when you need it."] };
  const HOOK_RX = /(esto es|así|asi|nadie|secreto|error|mito|por qu[eé]|nunca|siempre|[uú]nico|this is|here is|nobody|secret|mistake|myth|never|always|only|stop)/i;

  function tidy(c, lang) {
    let t = String(c).replace(FILLER[lang], " ").replace(/\s+/g, " ").trim();
    t = t.replace(LEAD[lang], "").replace(/\s+([,.;:!?])/g, "$1").replace(/[,;:\s]+$/, "").trim();
    if (!t) return "";
    t = cap1(t);
    return /[.!?…]$/.test(t) ? t : t + ".";
  }
  // la dictación no trae puntuación: se corta por frases, y las muy largas en los conectores (y, pero, porque...) para que cada trozo se lea de un tirón
  function chunkLong(p, lang) {
    const toks = p.split(/\s+/); if (toks.length <= 24) return [p];
    const brk = lang === "en" ? /^(and|but|because|so|then|also)$/i : /^(y|pero|porque|entonces|luego|después|despues|además|ademas)$/i, out = []; let cur = [];
    toks.forEach((w) => {
      if (cur.length >= 26 || (cur.length >= 12 && (brk.test(w) || /[,;:]$/.test(cur[cur.length - 1])))) { out.push(cur.join(" ")); cur = []; }
      cur.push(w);
    });
    if (cur.length) out.push(cur.join(" "));
    if (out.length > 1 && nWords(out[out.length - 1]) < 4) { const last = out.pop(); out[out.length - 1] += " " + last; }
    return out;
  }
  function sentences(text, lang) {
    const t = String(text || "").replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/([.!?…]+)\s+/g, "$1\n").trim(); if (!t) return [];
    const out = []; t.split(/\n+/).forEach((p) => chunkLong(p.trim(), lang).forEach((c) => { c = tidy(c, lang); if (nWords(c) >= 2) out.push(c); }));
    return out;
  }
  function hookScore(s, i) {
    const w = nWords(s); let sc = 0;
    sc += w >= 5 && w <= 12 ? 4 : w <= 16 ? 2 : -3;
    if (/\d/.test(s)) sc += 2; if (HOOK_RX.test(s)) sc += 3; if (/\?/.test(s)) sc -= 3; if (CTA_RX.test(s)) sc -= 4; if (i === 0) sc += 1;
    return sc;
  }
  // el gancho no puede pasar de 16 palabras (son los primeros 3 segundos): se corta en la primera coma o conector y el resto pasa al desarrollo
  function trimHook(s) {
    const w = s.replace(/[.!?…]+$/, "").split(/\s+/); if (w.length <= 16) return { hook: s, rest: "" };
    let cut = w.findIndex((x, i) => i >= 5 && i <= 14 && /[,;:]$/.test(x)); if (cut < 0) cut = 11;
    const hook = w.slice(0, cut + 1).join(" ").replace(/[,;:]+$/, "") + ".", rest = cap1(w.slice(cut + 1).join(" ")).replace(/[.!?…]*$/, "") + ".";
    return { hook, rest: nWords(rest) >= 3 ? rest : "" };
  }
  function finishScript(s) {
    s.beats = (s.beats || []).map((x) => String(x || "").trim()).filter(Boolean);
    s.hook = String(s.hook || "").trim(); s.cierre = String(s.cierre || "").trim();
    s.texto = [s.hook].concat(s.beats, [s.cierre]).filter(Boolean).join("\n\n");
    s.palabras = nWords(s.texto); s.segundos = secondsOf(s.palabras);
    return s;
  }
  function localScript(idea, raw, lang) {
    lang = lang === "en" ? "en" : "es";
    const all = sentences(raw, lang), ideaHook = idea && idea.gancho ? String(idea.gancho) : "";
    let last = all.length > 1 && CTA_RX.test(all[all.length - 1]) ? all.pop() : "", hook = "", rest = "", fromIdea = false;
    let bi = -1, bs = -99; all.forEach((s, i) => { const sc = hookScore(s, i); if (sc > bs) { bs = sc; bi = i; } });
    if (bi >= 0 && bs >= 3) { const t = trimHook(all.splice(bi, 1)[0]); hook = t.hook; rest = t.rest; }
    else if (ideaHook) { hook = ideaHook; fromIdea = true; }
    else if (all.length) { const t = trimHook(all.shift()); hook = t.hook; rest = t.rest; }
    const body = (rest ? [rest] : []).concat(all), beats = []; let cur = "", n = 0;
    body.forEach((s) => { if (cur && (nWords(cur + " " + s) > 26 || n >= 2)) { beats.push(cur); cur = ""; n = 0; } cur = cur ? cur + " " + s : s; n++; });
    if (cur) beats.push(cur);
    const titulo = idea && idea.titulo ? String(idea.titulo) : cap1(words(hook).slice(0, 7).join(" "));
    const sc = { titulo, hook, beats, cierre: last || CTA_DEFAULT[lang], cierreSugerido: !last, hookDeLaIdea: fromIdea, thin: nWords(raw) < 25 };
    return finishScript(sc);
  }
  // varias ideas, una por línea / numeradas / separadas con "siguiente idea" (lo que queda al dictar)
  function splitIdeas(text) {
    const t = String(text || "").replace(/\r/g, "").replace(/\b(?:siguiente idea|otra idea|next idea|idea siguiente)\b[:,.]?/gi, "\n");
    const lines = t.split(/\n+/).map((l) => l.replace(/^\s*(?:[-•*·]|\d+\s*[.)\-:])\s*/, "").trim()).filter((l) => nWords(l) >= 2);
    return lines.map((l) => { const first = l.split(/(?<![\d])[.!?…:]\s|\s[-–—]\s/)[0] || l; return { titulo: cap1(words(first).slice(0, 10).join(" ").replace(/[.,;:]+$/, "")), text: l }; });
  }

  // ---------- retoques simples sin IA ("más corto", "más directo", "otro gancho", "otro cierre") ----------
  const HEDGE = { es: /\b(?:básicamente|basicamente|en realidad|la verdad(?: es que)?|literalmente|prácticamente|practicamente|simplemente|realmente)\b[,]?\s*/gi, en: /\b(?:basically|actually|really|literally|honestly|simply|just)\b[,]?\s*/gi };
  function localRevise(sc, instruction, lang) {
    lang = lang === "en" ? "en" : "es";
    const q = norm(instruction), cur = finishScript({ ...sc, beats: sc.beats.slice() }), before = cur.texto, out = { ...cur, beats: cur.beats.slice() };
    let note = "";
    const firstSentence = (b) => sentences(b, lang)[0] || b;
    if (/\b(corto|breve|resum|acort|menos largo|short|trim|brief)/.test(q)) {
      if (out.beats.length > 1) { const keep = Math.max(1, Math.ceil(out.beats.length * 0.6)); out.beats = out.beats.slice(0, keep).map(firstSentence); }
      else if (out.beats.length === 1) out.beats = [firstSentence(out.beats[0])];
      note = "Lo acorté a lo esencial";
    } else if (/\b(directo|relleno|al grano|punch|conciso|filler|tight)/.test(q)) {
      const strip = (s) => tidy(s.replace(HEDGE[lang], " "), lang);
      out.beats = out.beats.map(strip).filter((b) => nWords(b) >= 2); out.hook = strip(out.hook) || out.hook;
      note = "Saqué el relleno";
    } else if (/\b(gancho|hook|arranque|inicio|empiez|empezar|abrir)/.test(q)) {
      const pool = out.beats.map((b) => sentences(b, lang)).flat().filter((s) => s !== out.hook), alt = pool.map((s, i) => [s, hookScore(s, i + 1)]).sort((a, b) => b[1] - a[1])[0];
      if (alt && alt[0]) {
        const t = trimHook(alt[0]); out.beats = [out.hook].concat(out.beats.map((b) => b.split(/\s+/).join(" ")).filter((b) => b !== alt[0]).map((b) => b.replace(alt[0], "").trim()).filter((b) => nWords(b) >= 2));
        out.hook = t.hook; note = "Probé otro gancho con algo que dijiste";
      }
    } else if (/\b(cierre|cta|final|llamado|call to action|ending)/.test(q)) {
      const alts = CTA_ALT[lang].filter((c) => c !== out.cierre), pick = alts[App.hash(out.cierre + out.hook) % alts.length];
      out.cierre = pick; out.cierreSugerido = true; note = "Cambié el cierre";
    }
    finishScript(out);
    if (out.texto === before) return defineMeta(out, { ai: false, applied: false, note: "Sin IA conectada no puedo hacer ese cambio. Probá con «más corto», «más directo», «otro gancho» u «otro cierre», o editá el guion a mano." });
    return defineMeta(out, { ai: false, applied: true, note: `Sin IA conectada: ${note.toLowerCase()} con una regla simple.` });
  }

  // ---------- preguntas de entrevista ----------
  // verbos en pasado o condicional (iguales en voseo y tuteo) y sin depender de quién pregunta: sirven para cualquier entrevistado
  const Q_TPL = {
    es: { open: ["¿Qué es {t}, explicado como si tuviera diez años?", "¿Cómo empezaste con {t}?", "¿Por qué te importa {t}?"],
      mid: ["¿Cuál es el mayor mito sobre {t}?", "¿Qué error comete casi todo el mundo con {t}?", "¿Qué le dirías a alguien que recién empieza con {t}?", "¿Qué cambió en tu vida cuando te tomaste en serio {t}?", "¿Qué herramienta o hábito recomendarías para {t}?", "¿Cuál fue tu mayor tropiezo con {t} y qué aprendiste?", "¿Qué haría distinto alguien con experiencia en {t}?", "¿Cómo sabrías que {t} está funcionando?", "¿Qué te sorprendió más de {t}?", "¿Qué pregunta te gustaría que te hicieran sobre {t}?"],
      close: ["Para cerrar: ¿qué es lo único que debería recordar quien nos ve sobre {t}?", "Para terminar: ¿qué primer paso daría hoy quien quiera empezar con {t}?"] },
    en: { open: ["What is {t}, explained as if I were ten years old?", "How did you get started with {t}?", "Why does {t} matter to you?"],
      mid: ["What is the biggest myth about {t}?", "What mistake does almost everyone make with {t}?", "What would you tell someone just starting with {t}?", "What changed for you once you took {t} seriously?", "Which tool or habit would you recommend for {t}?", "What was your biggest stumble with {t}, and what did you learn?", "What would an experienced person do differently with {t}?", "How would you know {t} is working?", "What surprised you most about {t}?", "What question do you wish people asked you about {t}?"],
      close: ["To close: what is the one thing viewers should remember about {t}?", "To finish: what first step should someone take today to start with {t}?"] },
  };
  function localQuestions(topic, n, round, avoid, lang) {
    lang = lang === "en" ? "en" : "es"; n = Math.max(1, Math.min(Q_MAX, n || Q_DEFAULT));
    const T = Q_TPL[lang], t = String(topic || "").trim().replace(/[.?!]+$/, "") || (lang === "en" ? "this topic" : "este tema"), rnd = seeded(App.hash(norm(t) + "#q" + (round || 0)));
    const have = new Set((avoid || []).map(norm)), fill = (s) => s.replace(/\{t\}/g, t), fresh = (list) => shuffle(list.map(fill), rnd).filter((q) => !have.has(norm(q)));
    const out = [];
    if (!(avoid && avoid.length)) { const o = fresh(T.open)[0]; if (o) out.push(o); }
    const mids = fresh(T.mid), closer = !(avoid && avoid.length) ? fresh(T.close)[0] : null, want = n - out.length - (closer ? 1 : 0);
    out.push(...mids.slice(0, Math.max(0, want)));
    if (closer) out.push(closer);
    if (out.length < n) fresh(T.open.concat(T.close)).filter((q) => !out.includes(q)).slice(0, n - out.length).forEach((q) => out.push(q));
    return out.slice(0, n);
  }

  // =====================================================================================================================================
  // 3) IA (Claude vía App.adapter().sample()) con caída a lo local
  // =====================================================================================================================================
  const BLOCKED = ["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed", "no_sample"];
  const LANG_NAME = { es: "español", en: "inglés" };
  // cuando la IA no estuvo (o falló) se avisa con una nota chica: qué pasó + que se usó la versión base
  const reasonOf = (e) => { const c = e && e.code; return BLOCKED.includes(c) ? "Sin IA conectada" : c === "rate_limited" ? "Llegaste al límite de uso de la IA por ahora" : c === "cancelled" || c === "skipped" ? "Salteaste la IA" : "La IA no pudo responder bien"; };
  const aborted = (signal) => Object.assign(new Error("cancelled"), { code: "cancelled", signal });
  function raceAbort(p, signal) {
    if (!signal) return Promise.resolve(p);
    if (signal.aborted) return Promise.reject(aborted());
    return new Promise((res, rej) => { const on = () => rej(aborted()); signal.addEventListener("abort", on, { once: true }); Promise.resolve(p).then((v) => { signal.removeEventListener("abort", on); res(v); }, (e) => { signal.removeEventListener("abort", on); rej(e); }); });
  }
  function parseJson(text) {
    let t = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    try { return JSON.parse(t); } catch (e) { /* puede venir con texto alrededor */ }
    const a = Math.min(...["[", "{"].map((c) => { const i = t.indexOf(c); return i < 0 ? Infinity : i; })), z = Math.max(t.lastIndexOf("]"), t.lastIndexOf("}"));
    if (isFinite(a) && z > a) return JSON.parse(t.slice(a, z + 1));
    throw Object.assign(new Error("bad_json"), { code: "bad_json" });
  }
  // UNA llamada, sin reintentos. Se llama solo desde un botón. sample.json si existe; si no, sample() y se lee el JSON a mano (el simulador y el modo demo no traen .json)
  async function askClaude(prompt, o) {
    const sample = await raceAbort(App.adapter().sample(), o && o.signal);
    if (!sample) throw Object.assign(new Error("no_sample"), { code: "no_sample" });
    const opts = Object.assign({ cache: false }, App.ai.opts("draft")); if (o && o.signal) opts.signal = o.signal;
    if (typeof sample.json === "function") return sample.json(prompt, opts);
    const r = await sample(prompt, opts); return parseJson(r && r.text);
  }
  const ctxForPrompt = (ctx) => JSON.stringify({ cuenta: ctx.nombre, usuario: ctx.usuario, red: ctx.red, idioma: LANG_NAME[ctx.lang], tono: ctx.tono, sobre_el_espacio: ctx.espacio, piezas_que_ya_produjo: ctx.piezas, ganchos_aprobados: ctx.ganchos, lo_que_mejor_funciono: ctx.mejor || null, pedidos_recientes: ctx.pedidos });
  const pStr = (v, max) => (typeof v === "string" ? v.trim().slice(0, max || 400) : "");
  const listOf = (v, keys) => { if (Array.isArray(v)) return v; for (const k of keys) if (v && Array.isArray(v[k])) return v[k]; return null; };

  function scriptFromAI(v, idea, lang) {
    if (!v || typeof v !== "object") return null;
    const hook = pStr(v.hook || v.gancho, 240), beatsRaw = listOf(v, ["desarrollo", "beats", "bloques", "puntos"]), cierre = pStr(v.cierre || v.cta || v.closing, 240);
    const beats = (beatsRaw || []).map((b) => pStr(typeof b === "string" ? b : b && (b.texto || b.text), 500)).filter(Boolean);
    if (!hook || !beats.length) return null;
    return finishScript({ titulo: pStr(v.titulo || v.title, 120) || (idea && idea.titulo) || cap1(words(hook).slice(0, 7).join(" ")), hook, beats, cierre: cierre || CTA_DEFAULT[lang], cierreSugerido: !cierre, thin: false });
  }

  const AI = {
    ctx: brandCtx,
    local: { ideas: localIdeas, script: localScript, revise: localRevise, questions: localQuestions, scripts: (ideas, lang) => ideas.map((i) => localScript(i, i.text || i.titulo, lang)) },
    // devuelven datos planos (un arreglo / un guion); el resultado trae `.meta` NO enumerable: { ai: usó Claude, note: aviso chico si cayó a lo local }
    async ideas(brand, n, o) {
      o = o || {}; n = n || N_IDEAS; const ctx = brand && brand.piezas ? brand : brandCtx(brand), round = o.round || 0, avoid = o.avoid || [];
      const fallback = (why, partial) => { const base = localIdeas(ctx, n, round, avoid.concat((partial || []).map((i) => i.titulo))); const list = (partial || []).concat(base).slice(0, n); return defineMeta(list, { ai: !!(partial && partial.length), note: partial && partial.length ? "Completé las que faltaban con ideas base." : `${why}: usé ideas base.` }); };
      try {
        const prompt = `Eres un productor de contenido para redes sociales. Propone ideas de videos cortos (Reels / TikTok) que la persona grabará a cámara, hablando.
CUENTA (JSON): ${ctxForPrompt(ctx)}
TAREA: propone EXACTAMENTE ${n} ideas distintas entre sí, pensadas para ESTA cuenta (su tema, su tono y lo que ya le funcionó). Que se puedan grabar sin producción compleja.
Reglas:
- "titulo": nombre corto de la idea (máximo 10 palabras), en ${LANG_NAME[ctx.lang]}.
- "gancho": la primera frase que se dice en los primeros 3 segundos, en ${LANG_NAME[ctx.lang]}. Una promesa directa (por ejemplo "Esto es lo que...", "Así..."), de 5 a 12 palabras y SIN signos de pregunta.
- "por_que": una frase corta, en español, que explique por qué puede funcionar en esta cuenta.
- Varía los formatos: mito, error común, paso a paso, historia personal, respuesta a una duda, reto, comparación, continuación de lo que mejor funcionó.
${avoid.length ? "- NO repitas ni te parezcas a estas ideas que ya se mostraron: " + JSON.stringify(avoid.slice(-60)) + "\n" : ""}Responde SOLO con un arreglo JSON de ${n} objetos {"titulo": string, "gancho": string, "por_que": string}. Sin texto antes ni después.`;
        const v = await askClaude(prompt, o), arr = listOf(v, ["ideas", "items", "videos"]);
        if (!arr) throw Object.assign(new Error("bad_shape"), { code: "bad_shape" });
        const seen = new Set(avoid.map(norm)), list = [];
        arr.forEach((i) => { const t = pStr(i && (i.titulo || i.title), 120), k = norm(t); if (!t || seen.has(k)) return; seen.add(k); list.push({ titulo: t, gancho: pStr(i.gancho || i.hook, 200), por_que: pStr(i.por_que || i.porque || i.why, 260) }); });
        if (!list.length) throw Object.assign(new Error("bad_shape"), { code: "bad_shape" });
        if (list.length >= n) return defineMeta(list.slice(0, n), { ai: true, note: "" });
        return fallback("", list);
      } catch (e) { return fallback(reasonOf(e)); }
    },
    async script(idea, rawText, o) {
      o = o || {}; const ctx = brandCtx(), lang = o.lang || ctx.lang, raw = String(rawText || "").trim();
      try {
        const prompt = `Eres un guionista de videos cortos para redes. Convierte lo que dijo la persona en un guion para leer en un teleprompter y grabar a cámara.
CUENTA (JSON): ${ctxForPrompt(ctx)}
IDEA: ${JSON.stringify({ titulo: idea && idea.titulo, gancho_propuesto: idea && idea.gancho })}
LO QUE DIJO LA PERSONA (transcripción, puede traer muletillas y no traer puntuación):
"""${raw.slice(0, 6000)}"""
Reglas:
- Conserva sus palabras, su estilo y sus ejemplos tanto como puedas. Ordena, corta repeticiones y muletillas. NO inventes datos ni anécdotas que no dijo.
- Escribe en ${LANG_NAME[lang]}.
- "hook": UNA sola frase para los primeros 3 segundos (máximo 12 palabras), una promesa directa, sin signo de pregunta. Si ella dijo algo mejor, úsalo.
- "desarrollo": de 2 a 6 bloques cortos (1 o 2 frases cada uno) en el orden en que mejor se entienden.
- "cierre": un llamado a la acción corto (guardar, seguir, comentar).
Responde SOLO con un objeto JSON: {"titulo": string, "hook": string, "desarrollo": [string], "cierre": string}. Sin texto antes ni después.`;
        const sc = scriptFromAI(await askClaude(prompt, o), idea, lang); if (!sc) throw Object.assign(new Error("bad_shape"), { code: "bad_shape" });
        sc.thin = nWords(raw) < 25; return defineMeta(sc, { ai: true, note: "" });
      } catch (e) { return defineMeta(localScript(idea, raw, lang), { ai: false, note: `${reasonOf(e)}: ordené tu guion con reglas simples (tus mismas palabras).` }); }
    },
    // varias ideas en UNA sola consulta (flujo "ya tengo ideas"): un guion por cada una
    async scripts(ideas, o) {
      o = o || {}; const ctx = brandCtx(), lang = o.lang || ctx.lang;
      try {
        const prompt = `Eres un guionista de videos cortos para redes. La persona tiene ${ideas.length} ideas (con lo que contó de cada una). Arma UN guion por idea para leer en un teleprompter y grabar a cámara.
CUENTA (JSON): ${ctxForPrompt(ctx)}
IDEAS: ${JSON.stringify(ideas.map((i, k) => ({ n: k + 1, titulo: i.titulo, lo_que_dijo: String(i.text || "").slice(0, 2000) })))}
Reglas: conserva sus palabras y su estilo, no inventes datos; escribe en ${LANG_NAME[lang]}; "hook" = una frase para los primeros 3 segundos (máximo 12 palabras, promesa directa, sin pregunta); "desarrollo" = de 1 a 6 bloques cortos; "cierre" = llamado a la acción corto.
Responde SOLO con un arreglo JSON, en el mismo orden, de ${ideas.length} objetos {"titulo": string, "hook": string, "desarrollo": [string], "cierre": string}. Sin texto antes ni después.`;
        const arr = listOf(await askClaude(prompt, o), ["guiones", "scripts", "items"]); if (!arr || arr.length < ideas.length) throw Object.assign(new Error("bad_shape"), { code: "bad_shape" });
        const out = ideas.map((i, k) => { const sc = scriptFromAI(arr[k], i, lang); if (!sc) throw Object.assign(new Error("bad_shape"), { code: "bad_shape" }); sc.thin = nWords(i.text) < 25; return sc; });
        return defineMeta(out, { ai: true, note: "" });
      } catch (e) { return defineMeta(ideas.map((i) => localScript(i, i.text || i.titulo, lang)), { ai: false, note: `${reasonOf(e)}: ordené cada idea con reglas simples (tus mismas palabras).` }); }
    },
    async revise(script, instruction, o) {
      o = o || {}; const ctx = brandCtx(), lang = o.lang || ctx.lang;
      try {
        const prompt = `Eres un guionista de videos cortos para redes. Aplica el cambio que pide la persona a este guion (para teleprompter), sin inventar datos y conservando sus palabras donde no haga falta tocarlas.
GUION ACTUAL (JSON): ${JSON.stringify({ titulo: script.titulo, hook: script.hook, desarrollo: script.beats, cierre: script.cierre })}
CAMBIO PEDIDO: ${JSON.stringify(String(instruction || "").slice(0, 400))}
Escribe en ${LANG_NAME[lang]}. El "hook" sigue siendo una frase de máximo 12 palabras, sin signo de pregunta.
Responde SOLO con el guion completo ya cambiado como JSON: {"titulo": string, "hook": string, "desarrollo": [string], "cierre": string}. Sin texto antes ni después.`;
        const sc = scriptFromAI(await askClaude(prompt, o), script, lang); if (!sc) throw Object.assign(new Error("bad_shape"), { code: "bad_shape" });
        return defineMeta(sc, { ai: true, applied: true, note: "" });
      } catch (e) { const r = localRevise(script, instruction, lang), m = r.meta || {}; return defineMeta(r, { ai: false, applied: m.applied, note: m.applied ? m.note.replace(/^Sin IA conectada/, reasonOf(e)) : `${reasonOf(e)}. ${m.note.replace(/^Sin IA conectada no puedo/, "No puedo")}` }); }
    },
    async questions(topic, n, o) {
      o = o || {}; n = Math.max(1, Math.min(Q_MAX, n || Q_DEFAULT)); const ctx = brandCtx(), lang = o.lang || ctx.lang, avoid = o.avoid || [];
      try {
        const prompt = `Eres un productor de entrevistas para video. Propone ${n} preguntas para una entrevista corta, que se mostrarán de a una en un teleprompter.
CUENTA (JSON): ${ctxForPrompt(ctx)}
TEMA DE LA ENTREVISTA: ${JSON.stringify(String(topic || "").slice(0, 200))}
Reglas: preguntas abiertas (no de sí o no), cada una de máximo 22 palabras, en ${LANG_NAME[lang]}; la primera abre fácil y la última cierra con algo para recordar. Usa verbos en pasado o condicional para que sirvan para cualquier entrevistado.
${avoid.length ? "No repitas estas: " + JSON.stringify(avoid.slice(-20)) + "\n" : ""}Responde SOLO con un arreglo JSON de ${n} textos. Sin texto antes ni después.`;
        const arr = listOf(await askClaude(prompt, o), ["preguntas", "questions", "items"]); if (!arr) throw Object.assign(new Error("bad_shape"), { code: "bad_shape" });
        const have = new Set(avoid.map(norm)), list = []; arr.forEach((q) => { const t = pStr(typeof q === "string" ? q : q && (q.pregunta || q.question || q.texto), 300); if (t && !have.has(norm(t))) { have.add(norm(t)); list.push(t); } });
        if (list.length < Math.min(3, n)) throw Object.assign(new Error("bad_shape"), { code: "bad_shape" });
        return defineMeta(list.slice(0, n), { ai: true, note: "" });
      } catch (e) { return defineMeta(localQuestions(topic, n, o.round || 0, avoid, lang), { ai: false, note: `${reasonOf(e)}: usé preguntas base.` }); }
    },
  };
  App.grabarAI = AI;

  // =====================================================================================================================================
  // 4) ESTADO Y PASOS (la conversación)
  // =====================================================================================================================================
  const fresh = () => ({ step: "ask", hist: [], trail: [], mode: "", busy: "", err: "", note: "",
    ideas: [], seen: [], round: 0, pick: null, ownText: "", raw: "", rawFor: "", script: null, approved: false, revOpen: false, revText: "", editing: false, editText: "",
    mineText: "", cmp: [], cmpSel: -1, topic: "", qs: [], qRound: 0, secs: SECS_DEFAULT, listening: false, micDenied: false, result: null, lastTP: null, lang: "" });
  UI.crear.grabar = UI.crear.grabar || fresh();
  const ST = () => UI.crear.grabar;
  const ai = (t) => ({ who: "ai", html: `<p>${esc(t)}</p>` }), me = (t) => ({ who: "me", html: esc(t) });
  const Y = (a, b) => App.say(a, b);
  const hereNow = () => { const r = App.route(); return r.name === "crear" && r.args[0] === "grabar"; };
  const langOfBrand = () => (sel.brand().lang === "en" ? "en" : "es");

  // qué le dice la nube a la persona en cada paso (la pregunta actual, debajo de lo ya hablado)
  const PROMPT = {
    ask: () => Y("¿Ya tenés ideas para grabar?", "¿Ya tienes ideas para grabar?"),
    ideas: (st) => Y(`Acá van ${N_IDEAS} ideas pensadas para ${sel.brand().name}. Elegí tu ganadora, o sumá las tuyas.`, `Aquí van ${N_IDEAS} ideas pensadas para ${sel.brand().name}. Elige tu ganadora, o suma las tuyas.`),
    develop: (st) => Y(`Contame todo sobre «${st.pick ? st.pick.titulo : "tu idea"}». Hablá libre, que yo lo ordeno.`, `Cuéntame todo sobre «${st.pick ? st.pick.titulo : "tu idea"}». Habla libre, que yo lo ordeno.`),
    script: () => Y("Este es tu guion. Revisalo: ¿lo aprobás?", "Este es tu guion. Revísalo: ¿lo apruebas?"),
    ready: () => Y("Guion aprobado. Cuando quieras, grabamos con el teleprompter.", "Guion aprobado. Cuando quieras, grabamos con el teleprompter."),
    done: (st) => (st.result && st.result.recorded ? "Listo, quedó grabado. ¿Qué hacemos con eso?" : "Terminaste. ¿Qué sigue?"),
    mine: () => Y("Contame tus ideas, todas juntas. Una por línea, o dictalas y separalas diciendo «siguiente idea».", "Cuéntame tus ideas, todas juntas. Una por línea, o dícialas y sepáralas diciendo «siguiente idea»."),
    compare: (st) => Y(`Armé ${st.cmp.length} ${st.cmp.length === 1 ? "guion" : "guiones"}. Elegí el que querés grabar.`, `Armé ${st.cmp.length} ${st.cmp.length === 1 ? "guion" : "guiones"}. Elige el que quieres grabar.`),
    topic: () => "¿Sobre qué tema es la entrevista?",
    questions: (st) => Y(`Estas son las preguntas que se me ocurren sobre «${st.topic}». Editalas, borralas, reordenalas o sumá las tuyas.`, `Estas son las preguntas que se me ocurren sobre «${st.topic}». Edítalas, bórralas, reordénalas o suma las tuyas.`),
    seconds: () => "¿Cuántos segundos por pregunta? Va una por vez, bien despacio.",
  };
  const STATUS = { ask: "grabar", ideas: `${N_IDEAS} ideas`, develop: "tu idea", script: "el guion", ready: "listo para grabar", done: "grabado", mine: "tus ideas", compare: "tus guiones", topic: "entrevista", questions: "las preguntas", seconds: "el tiempo" };
  const BUSY_TXT = { ideas: ["Pensando ideas para tu cuenta…", "Usar ideas base"], script: ["Ordenando lo que contaste en un guion…", "Usar el orden simple"], scripts: ["Armando un guion por cada idea…", "Usar el orden simple"], revise: ["Aplicando tu cambio…", "Saltar la IA"], questions: ["Pensando las preguntas…", "Usar preguntas base"] };

  // ---------- piezas ----------
  function btn(o) {
    const d = o.data ? Object.entries(o.data).map(([k, v]) => ` data-${k}="${esc(v)}"`).join("") : "";
    return `<button type="${o.type || "button"}" class="btn${o.pri ? " pri" : ""}${o.ghost ? " ghost" : ""}${o.sm ? " sm" : ""}"${o.act ? ` data-act="${o.act}"` : ""}${o.id ? ` id="${o.id}"` : ""}${d}${o.disabled ? " disabled" : ""}${o.aria ? ` aria-label="${esc(o.aria)}"` : ""}>${o.icon ? icon(o.icon) : ""}${esc(o.label)}</button>`;
  }
  const acts = (list) => `<div class="gr-acts">${list.filter(Boolean).map(btn).join("")}</div>`;
  const noteHtml = (st) => (st.note ? `<p class="gr-note" role="status">${icon("info")}<span>${esc(st.note)}</span></p>` : "");
  const errHtml = (st) => (st.err ? `<p class="status err" role="alert">${esc(st.err)}</p>` : "");
  function thinking(st) {
    const [t, skip] = BUSY_TXT[st.busy] || ["Pensando…", "Saltar la IA"];
    return `<div class="gr-think" role="status" aria-live="polite"><span class="typing" aria-hidden="true"><i></i><i></i><i></i></span><div><b>Pensando…</b><small>${esc(t)}</small></div></div>${acts([{ act: "grskip", label: skip, ghost: true, icon: "arrow" }])}`;
  }
  // el micrófono: una gota (nunca un círculo perfecto) que respira mientras escucha. Sin reconocimiento de voz (o sin permiso) se cae a escribir, con el mismo flujo
  const SRCtor = () => window.SpeechRecognition || window.webkitSpeechRecognition;
  function micHtml(st, target) {
    if (!SRCtor() || st.micDenied) return `<p class="gr-hint">${icon("info")}<span>${esc(st.micDenied ? Y("No tengo permiso para usar el micrófono. Escribilo acá abajo y seguimos igual.", "No tengo permiso para usar el micrófono. Escríbelo aquí abajo y seguimos igual.") : Y("Este navegador no dicta por voz. Escribilo acá abajo y seguimos igual (también sirve el dictado de tu teclado).", "Este navegador no dicta por voz. Escríbelo aquí abajo y seguimos igual (también sirve el dictado de tu teclado)."))}</span></p>`;
    return `<div class="gr-mic-wrap"><button type="button" class="gr-mic${st.listening ? " on" : ""}" id="grmic" data-act="grmic" data-target="${target}" aria-pressed="${st.listening}" aria-label="${st.listening ? "Parar de escuchar" : "Hablar"}">${icon("mic")}</button><p class="gr-mic-l" id="grmicl" aria-live="polite">${esc(st.listening ? Y("Te escucho… tocá para parar", "Te escucho… toca para parar") : Y("Tocá y contame", "Toca y cuéntame"))}</p></div>`;
  }

  // ---------- pasos ----------
  function askView(st) {
    return acts([{ act: "grstart", data: { v: "si" }, label: Y("Sí, ya tengo ideas", "Sí, ya tengo ideas"), icon: "check", pri: true }, { act: "grstart", data: { v: "no" }, label: "Todavía no", icon: "x" }, { act: "grstart", data: { v: "ent" }, label: "Quiero hacer una entrevista", icon: "mic" }])
      + `<p class="gr-hint">${icon("camera")}<span>${esc(Y("Te acompaño de punta a punta: ideas, guion y teleprompter para grabar.", "Te acompaño de principio a fin: ideas, guion y teleprompter para grabar."))}</span></p>`;
  }
  function ideaRow(it, i, st) {
    const on = st.pick && st.pick.id === it.id;
    return `<li><button type="button" class="gr-idea${on ? " on" : ""}" role="radio" aria-checked="${!!on}" data-act="grpick" data-id="${esc(it.id)}" style="--i:${Math.min(i, 12)}"><span class="n">${i + 1}</span><span class="t"><b>${esc(it.titulo)}${it.own ? ` <span class="chip">Tuya</span>` : ""}</b>${it.gancho ? `<em>“${esc(it.gancho)}”</em>` : ""}${it.por_que ? `<small>${esc(it.por_que)}</small>` : ""}</span><span class="mk" aria-hidden="true">${icon("check")}</span></button></li>`;
  }
  function ideasView(st) {
    if (st.busy) return thinking(st);
    return `${noteHtml(st)}<form class="gr-own" id="grownform" autocomplete="off"><input type="text" id="grown" maxlength="140" placeholder="${esc(Y("O escribí tu propia idea…", "O escribe tu propia idea…"))}" aria-label="Tu propia idea" value="${esc(st.ownText)}"><button type="submit" class="btn sm" aria-label="Agregar idea">${icon("plus")}Agregar</button></form>
      <p class="gr-count"><span id="grcount">${st.ideas.length}</span> ideas · ${esc(Y("tocá una para elegirla", "toca una para elegirla"))}</p>
      <ul class="gr-ideas" role="radiogroup" aria-label="Ideas para grabar">${st.ideas.map((it, i) => ideaRow(it, i, st)).join("")}</ul>
      ${acts([{ act: "grdev", id: "grdevbtn", label: st.pick ? `Desarrollar «${st.pick.titulo.length > 28 ? st.pick.titulo.slice(0, 27) + "…" : st.pick.titulo}»` : "Elegí una idea para desarrollarla", icon: "wand", pri: true, disabled: !st.pick }, { act: "grmore", label: `Dame otras ${N_IDEAS}`, icon: "refresh", ghost: true }])}`;
  }
  function developView(st) {
    const p = st.pick;
    return `${p ? `<div class="gr-idea-pill"><b>${esc(p.titulo)}</b>${p.gancho ? `<em>“${esc(p.gancho)}”</em>` : ""}</div>` : ""}${micHtml(st, "grraw")}
      <div class="field"><label for="grraw">${esc(Y("Lo que contás (se escribe solo mientras hablás; podés corregirlo)", "Lo que cuentas (se escribe solo mientras hablas; puedes corregirlo)"))}</label><textarea id="grraw" rows="7" placeholder="${esc(Y("Contame todo: qué querés decir, ejemplos, por qué importa…", "Cuéntame todo: qué quieres decir, ejemplos, por qué importa…"))}">${esc(st.raw)}</textarea></div>
      ${errHtml(st)}${acts([{ act: "grscript", label: "Ordenar mi guion", icon: "wand", pri: true }])}`;
  }
  function scriptCard(sc) {
    return `<article class="gr-script" aria-label="Guion"><header><h3>${esc(sc.titulo)}</h3><div class="gr-meta"><span class="chip">${icon("clock")}≈ ${esc(clock(sc.segundos))}</span><span class="chip">${sc.palabras} palabras</span>${sc.thin ? `<span class="chip warn">Idea corta</span>` : ""}</div></header>
      <section><span class="gr-lab">Gancho · primeros 3 segundos</span><p class="gr-hook">${esc(sc.hook)}</p></section>
      <section><span class="gr-lab">Desarrollo</span><ol class="gr-beats">${sc.beats.map((b) => `<li>${esc(b)}</li>`).join("")}</ol></section>
      <section><span class="gr-lab">Cierre${sc.cierreSugerido ? " · sugerido" : ""}</span><p>${esc(sc.cierre)}</p></section></article>`;
  }
  function scriptView(st) {
    if (st.busy) return thinking(st);
    const sc = st.script; if (!sc) return `<p class="gr-hint">${icon("info")}<span>No hay guion todavía.</span></p>`;
    const quick = [[Y("Hacelo más corto", "Hazlo más corto"), "más corto"], ["Más directo", "más directo"], ["Otro gancho", "otro gancho"], ["Otro cierre", "otro cierre"]];
    const revise = st.revOpen ? `<form class="gr-rev" id="grrevform" autocomplete="off"><div class="gr-quick" role="group" aria-label="Cambios rápidos">${quick.map(([l, q]) => `<button type="button" class="chip" data-act="grquick" data-q="${esc(q)}">${esc(l)}</button>`).join("")}</div>
      <div class="gr-own"><input type="text" id="grrev" maxlength="300" placeholder="${esc(Y("Ej.: hacelo más corto, más directo…", "Ej.: hazlo más corto, más directo…"))}" aria-label="Qué cambio querés" value="${esc(st.revText)}"><button type="submit" class="btn sm pri">Aplicar</button></div></form>` : "";
    const edit = st.editing ? `<div class="field gr-edit"><label for="gredit">Guion completo (el primer párrafo es el gancho y el último el cierre; separá con una línea en blanco)</label><textarea id="gredit" rows="10">${esc(st.editText)}</textarea></div>${acts([{ act: "gredone", label: "Listo, usar este texto", icon: "check", pri: true }, { act: "grscript", label: "Cancelar", ghost: true, data: { cancel: "1" } }])}` : scriptCard(sc);
    const thin = sc.thin && !st.editing ? `<p class="gr-hint">${icon("info")}<span>${esc(Y("Es una idea corta: para un guion más rico, contame más con tu voz.", "Es una idea corta: para un guion más rico, cuéntame más con tu voz."))}</span></p>` : "";
    return `${noteHtml(st)}${edit}${thin}${st.editing ? "" : revise}${st.editing ? "" : acts([{ act: "grapprove", label: "Aprobar guion", icon: "check", pri: true }, { act: "grchanges", label: "Pedir cambios", icon: "wand", ghost: true, aria: st.revOpen ? "Cerrar pedir cambios" : "Pedir cambios" }, { act: "gredit", label: "Editar a mano", icon: "lines", ghost: true }, sc.thin ? { act: "grtellmore", label: "Contar más", icon: "mic", ghost: true } : null, { act: "grbackscript", label: "Volver", icon: "chevleft", ghost: true }])}`;
  }
  function readyView(st) {
    const sc = st.script;
    return `${sc ? `<div class="gr-ready"><span class="chip good">${icon("check")}Aprobado</span><b>${esc(sc.titulo)}</b><small>≈ ${esc(clock(sc.segundos))} · ${sc.palabras} palabras</small><p class="gr-hook">${esc(sc.hook)}</p></div>` : ""}
      <p class="gr-hint">${icon("info")}<span>${esc(Y("Se abre el teleprompter a pantalla completa. Si tu navegador te lo permite, también te graba con la cámara.", "Se abre el teleprompter a pantalla completa. Si tu navegador lo permite, también te graba con la cámara."))}</span></p>
      ${acts([{ act: "grrec", label: "Grabar ahora", icon: "camera", pri: true }, { act: "grbackscript", label: "Volver al guion", icon: "chevleft", ghost: true }])}`;
  }
  function doneView(st) {
    const r = st.result || {}, f = r.recorded, ad = App.adapter(), canDl = !ad || !ad.hasDownloads || ad.hasDownloads();
    const dur = r.durationMs ? `<span class="chip">${icon("clock")}${esc(clock(r.durationMs / 1000))}</span>` : "";
    const again = st.mode === "entrevista" ? "Otro tema" : "Otra idea";
    const lines = f ? `<div class="gr-done"><span class="chip good">${icon("check")}Grabado</span>${dur}<span class="chip">${icon("film")}${esc(f.name || "grabación")}${f.size ? " · " + esc(App.bytes(f.size)) : ""}</span></div>`
      : `<div class="gr-done"><span class="chip good">${icon("check")}Terminado</span>${dur}</div><p class="gr-hint">${icon("info")}<span>${esc(Y("No quedó un archivo grabado desde acá. Si grabaste con la cámara de tu celular, subilo en «Un video nuevo».", "No quedó un archivo grabado desde aquí. Si grabaste con la cámara de tu celular, súbelo en «Un video nuevo»."))}</span></p>`;
    return lines + acts([
      f ? { act: "grsend", label: "Mandarlo a «Un video nuevo»", icon: "film", pri: true } : { act: "grsend", label: "Subir mi grabación en «Un video nuevo»", icon: "upload", pri: true },
      f && canDl ? { act: "grdl", label: "Descargar la grabación", icon: "download", ghost: true } : null,
      { act: "grrerec", label: "Grabar de nuevo", icon: "camera", ghost: true }, { act: "grnext", label: again, icon: "refresh", ghost: true }, { act: "grfinish", label: "Terminar", icon: "check", ghost: true }]);
  }
  function mineView(st) {
    return `${micHtml(st, "grmine")}<div class="field"><label for="grmine">${esc(Y("Tus ideas (una por línea; podés sumar el detalle de cada una)", "Tus ideas (una por línea; puedes sumar el detalle de cada una)"))}</label><textarea id="grmine" rows="8" placeholder="${esc("1. " + Y("Por qué dejé de usar el despertador", "Por qué dejé de usar el despertador") + "\n2. …")}">${esc(st.mineText)}</textarea></div>${errHtml(st)}${acts([{ act: "grmine", label: "Armar mis guiones", icon: "wand", pri: true }])}`;
  }
  function compareView(st) {
    if (st.busy) return thinking(st);
    const sel0 = st.cmpSel;
    return `${noteHtml(st)}<ul class="gr-cmps" role="radiogroup" aria-label="Guiones">${st.cmp.map((c, i) => `<li><button type="button" class="gr-cmp${sel0 === i ? " on" : ""}" role="radio" aria-checked="${sel0 === i}" data-act="grcmp" data-i="${i}" style="--i:${Math.min(i, 8)}"><span class="n">${i + 1}</span><span class="t"><b>${esc(c.script.titulo)}</b><em>“${esc(c.script.hook)}”</em><small>≈ ${esc(clock(c.script.segundos))} · ${c.script.beats.length} ${c.script.beats.length === 1 ? "bloque" : "bloques"}${c.script.thin ? " · idea corta" : ""}</small></span><span class="mk" aria-hidden="true">${icon("check")}</span></button></li>`).join("")}</ul>
      ${acts([{ act: "grcmpgo", id: "grcmpgo", label: "Revisar este guion", icon: "check", pri: true, disabled: sel0 < 0 }, { act: "grcmpmore", id: "grcmpmore", label: "Contar más sobre esta", icon: "mic", ghost: true, disabled: sel0 < 0 }])}`;
  }
  function topicView(st) {
    const sug = uniq(brandCtx().piezas.map(cap1)).slice(0, 4);
    return `<div class="field"><label for="grtopic">Tema</label><input type="text" id="grtopic" maxlength="140" autocomplete="off" placeholder="${esc(Y("Ej.: cómo empezar a escribir a mano", "Ej.: cómo empezar a escribir a mano"))}" value="${esc(st.topic)}"></div>
      ${sug.length ? `<div class="gr-sugs" role="group" aria-label="Temas sugeridos"><span class="gr-lab">${esc(Y("O elegí uno de tu cuenta", "O elige uno de tu cuenta"))}</span>${sug.map((t) => `<button type="button" class="chip" data-act="grtopicpick" data-t="${esc(t)}">${esc(t)}</button>`).join("")}</div>` : ""}
      ${errHtml(st)}${acts([{ act: "grqs", label: "Armar las preguntas juntos", icon: "sparkles", pri: true }])}`;
  }
  function questionsView(st) {
    if (st.busy) return thinking(st);
    const n = st.qs.length;
    return `${noteHtml(st)}<p class="gr-count"><span id="grqcount">${n}</span> ${n === 1 ? "pregunta" : "preguntas"}</p>
      <ol class="gr-qs">${st.qs.map((q, i) => `<li class="gr-q" style="--i:${Math.min(i, 8)}"><span class="n">${i + 1}</span><textarea class="gr-qi" rows="2" data-i="${i}" maxlength="300" aria-label="Pregunta ${i + 1}">${esc(q)}</textarea><div class="gr-qb"><button type="button" class="iconbtn" data-act="grqup" data-i="${i}" aria-label="Subir la pregunta ${i + 1}" ${i === 0 ? "disabled" : ""}>${icon("chevup")}</button><button type="button" class="iconbtn" data-act="grqdn" data-i="${i}" aria-label="Bajar la pregunta ${i + 1}" ${i === n - 1 ? "disabled" : ""}>${icon("chevdown")}</button><button type="button" class="iconbtn" data-act="grqdel" data-i="${i}" aria-label="Borrar la pregunta ${i + 1}">${icon("trash")}</button></div></li>`).join("")}</ol>
      ${errHtml(st)}${acts([{ act: "grqnext", label: "Seguir: elegir los segundos", icon: "arrow", pri: true }, { act: "grqadd", label: "Agregar una pregunta", icon: "plus", ghost: true, disabled: n >= Q_MAX }, { act: "grqmore", label: "Sugerime más", icon: "sparkles", ghost: true, disabled: n >= Q_MAX }])}`;
  }
  const secsTotal = (st) => st.qs.filter((q) => q.trim()).length * st.secs;
  const secsSummary = (st) => { const n = st.qs.filter((q) => q.trim()).length; return `${n} ${n === 1 ? "pregunta" : "preguntas"} × ${st.secs} s ≈ ${clock(secsTotal(st))} en total`; };
  function secondsView(st) {
    return `<div class="gr-secs" role="radiogroup" aria-label="Segundos por pregunta">${SECS.map((s) => `<button type="button" class="chip gr-sec${st.secs === s ? " on" : ""}" role="radio" aria-checked="${st.secs === s}" data-act="grsecs" data-s="${s}">${s} s</button>`).join("")}</div>
      <div class="field gr-cust"><label for="grcust">Otro valor (en segundos, de ${SECS_MIN} a ${SECS_MAX})</label><input type="number" id="grcust" inputmode="numeric" min="${SECS_MIN}" max="${SECS_MAX}" step="1" value="${SECS.includes(st.secs) ? "" : st.secs}" placeholder="${st.secs}"></div>
      <p class="gr-sum" id="grsum">${esc(secsSummary(st))}</p>${acts([{ act: "grstartint", label: "Empezar la entrevista", icon: "camera", pri: true }])}`;
  }

  const VIEWS = { ask: askView, ideas: ideasView, develop: developView, script: scriptView, ready: readyView, done: doneView, mine: mineView, compare: compareView, topic: topicView, questions: questionsView, seconds: secondsView };
  // si se salió a medio "pensando" y la consulta ya no existe, se limpia: sin esto quedaría una pantalla vacía esperando para siempre
  function sanitize(st) {
    if (st.busy && !ctl) {
      st.busy = "";
      const has = { ideas: st.ideas.length, script: st.script, compare: st.cmp.length, questions: st.qs.length }[st.step];
      if (has === 0 || has === null) { const h = st.hist.pop(); if (h) { st.step = h.step; st.trail.length = Math.min(st.trail.length, h.trail); } }
    }
  }
  function render() {
    const st = ST(); sanitize(st);
    const step = VIEWS[st.step] ? st.step : "ask", view = VIEWS[step];
    const busy = !!st.busy || st.listening, prompt = (PROMPT[step] || PROMPT.ask)(st);
    return App.crear.cloud({ status: st.busy ? "pensando…" : STATUS[step] || "grabar", back: true, busy, trail: st.trail.slice(-4).concat([ai(prompt)]), body: `<div class="gr" data-step="${step}"${st.busy ? ' data-busy="1"' : ""}>${view(st)}</div>` });
  }

  // =====================================================================================================================================
  // 5) MOVIMIENTO ENTRE PASOS, "PENSANDO…" Y MICRÓFONO
  // =====================================================================================================================================
  const move = (mutate) => new Promise((res) => App.crear.advanceStep(() => { mutate(); res(); })); // la misma gota que el resto de Crear; resuelve cuando el paso nuevo ya está dibujado
  function go(step, say, mutate) {
    const st = ST(); micStop();
    return move(() => { st.hist.push({ step: st.step, trail: st.trail.length }); if (say) st.trail.push(...say); st.step = step; st.err = ""; st.busy = ""; if (mutate) mutate(st); });
  }
  // volver a un paso por el que ya se pasó (p. ej. "Otra idea" desde el final): deshace la historia hasta ahí
  function rewindTo(step, mutate) {
    const st = ST(); micStop();
    return move(() => { while (st.hist.length && st.step !== step) { const h = st.hist.pop(); st.step = h.step; st.trail.length = Math.min(st.trail.length, h.trail); } st.step = step; st.busy = ""; st.err = ""; if (mutate) mutate(st); });
  }
  let ctl = null; // la única consulta a la IA en vuelo
  function cancelPending() { if (ctl) { clearTimeout(ctl.timer); try { ctl.ac.abort(); } catch (e) { /* ya terminada */ } ctl = null; } }
  function newCtl() { cancelPending(); const ac = new AbortController(); ctl = { ac, timer: setTimeout(() => { try { ac.abort(); } catch (e) { /* nada */ } }, 150000) }; return ctl; }
  // Una consulta: muestra "Pensando…" (con Saltar), la lanza UNA vez y aplica el resultado. `enter` devuelve la promesa de la pantalla "pensando".
  // Si la persona vuelve atrás o se va, el resultado se descarta (st.req cambió). Un mínimo de ~0,6 s para que la gota no parpadee cuando la respuesta es inmediata.
  async function think(kind, enter, call, apply) {
    const st = ST(), tok = ++st.req, c = newCtl(), t0 = Date.now();
    const shown = enter(st, kind); let data = null;
    try { data = await call(c.ac.signal); } catch (e) { data = null; }
    await shown;
    const rest = App.reduceMotion() ? 0 : 600 - (Date.now() - t0); if (rest > 0) await sleep(rest);
    if (st !== ST() || tok !== st.req) return;
    if (ctl === c) { clearTimeout(c.timer); ctl = null; }
    await move(() => { st.busy = ""; apply(st, data); });
  }
  const busyEnter = (kind) => (st) => move(() => { st.busy = kind; st.err = ""; });
  const metaOf = (data) => (data && data.meta) || { ai: false, note: "" };
  Object.defineProperty(fresh, "req", { value: 0 });

  // ---------- micrófono: Web Speech API como el de Jarvis, con respaldo a escribir ----------
  let rec = null, micWant = false, micBase = "", micFinal = "", micAt = 0, micTarget = "", micState = null;
  const joinSp = (a, b) => (a && b ? a + (/\s$/.test(a) ? "" : " ") + b : a || b || "");
  function paintMic() {
    const st = micState || ST(), b = $("#grmic"), l = $("#grmicl"), o = $(".crear-cloud .jh .orb");
    if (b) { b.classList.toggle("on", st.listening); b.setAttribute("aria-pressed", String(st.listening)); b.setAttribute("aria-label", st.listening ? "Parar de escuchar" : "Hablar"); }
    if (l) l.textContent = st.listening ? Y("Te escucho… tocá para parar", "Te escucho… toca para parar") : Y("Tocá y contame", "Toca y cuéntame");
    if (o) o.classList.toggle("fast", !!st.listening);
    if (App.aura && hereNow()) App.aura.mood(st.listening ? "listen" : "focus");
  }
  function paintTranscript(interim) {
    const st = micState, ta = $("#" + micTarget); if (!st) return;
    const full = joinSp(joinSp(micBase, micFinal), interim ? interim.trim() : "");
    st[micTarget === "grmine" ? "mineText" : "raw"] = full;
    if (ta) { ta.value = full; ta.scrollTop = ta.scrollHeight; }
  }
  function micStop() {
    micWant = false; const st = micState; if (rec) { try { rec.stop(); } catch (e) { /* ya detenido */ } }
    if (st && st.listening) { st.listening = false; paintMic(); }
  }
  function micToggle(target) {
    if (rec) { micStop(); return; }
    const st = ST(), Ctor = SRCtor(); if (!Ctor) { st.micDenied = false; App.render(true); return; }
    const ta = $("#" + target);
    try {
      const r = new Ctor(); r.lang = (st.lang || langOfBrand()) === "en" ? "en-US" : "es-ES"; r.interimResults = true; r.continuous = true;
      micState = st; micTarget = target; micBase = ta ? ta.value : (target === "grmine" ? st.mineText : st.raw); micFinal = ""; micWant = true; micAt = Date.now();
      r.onresult = (ev) => {
        let interim = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) { const t = ev.results[i][0].transcript; if (ev.results[i].isFinal) micFinal = joinSp(micFinal, t.trim()); else interim += t; }
        paintTranscript(interim);
      };
      r.onerror = (ev) => { if (/not-allowed|service-not-allowed|audio-capture/.test(ev.error)) { micWant = false; st.micDenied = true; } };
      r.onend = () => {
        // Chrome corta el dictado continuo solo tras unos segundos de silencio: si la persona sigue queriendo hablar se reabre (una vez por corte, y nunca en bucle)
        if (micWant && Date.now() - micAt > 1200 && rec === r) { try { micAt = Date.now(); r.start(); return; } catch (e) { /* no se pudo reabrir */ } }
        const denied = st.micDenied; rec = null; micWant = false; st.listening = false; paintMic();
        if (denied && ST() === st && hereNow()) App.render(true); // sin permiso: la pantalla cambia a "escribilo acá"
      };
      rec = r; st.listening = true; paintMic(); r.start();
    } catch (e) { rec = null; micWant = false; st.listening = false; st.micDenied = true; App.render(true); }
  }

  // ---------- teleprompter ----------
  function markDone(detail) {
    try { const p = App.onboarding && App.onboarding.markDone && App.onboarding.markDone("grabar"); if (p && p.catch) p.catch(() => {}); } catch (e) { /* el progreso se guarda cuando se pueda */ }
    try { window.dispatchEvent(new CustomEvent("aura:grabado", { detail })); } catch (e) { /* sin CustomEvent */ }
  }
  function finishTP(st, res, args) {
    res = res && typeof res === "object" ? res : {};
    const rec0 = res.recorded || null, detail = { mode: res.mode || args.mode, durationMs: +res.durationMs || 0, recorded: !!rec0 };
    st.result = { recorded: rec0, durationMs: detail.durationMs, mode: detail.mode, title: args.title };
    if (res.cancelled !== true) markDone(detail); // "terminar o cerrar" llegan igual: solo se descarta si el teleprompter avisa que se canceló
    if (ST() !== st || !hereNow()) return; // se fue a otra pantalla mientras grababa: el logro ya quedó marcado, no hay nada que dibujar
    if (st.step === "done") { App.render(true); return; }
    go("done", [me(st.mode === "entrevista" ? "Empezar la entrevista." : "Grabar ahora.")]);
  }
  function openTP(args) {
    const st = ST(), tp = App.teleprompter;
    if (!tp || typeof tp.open !== "function") { toast("El teleprompter no está disponible ahora."); return; }
    micStop(); cancelPending(); st.lastTP = args;
    let fired = false;
    tp.open(Object.assign({}, args, { onDone: (res) => { if (fired) return; fired = true; finishTP(st, res, args); } }));
  }
  const scriptArgs = (st) => ({ mode: "script", title: st.script.titulo, text: st.script.texto });
  const interviewArgs = (st) => ({ mode: "interview", title: st.topic, questions: st.qs.map((q) => q.trim()).filter(Boolean), secondsPerQuestion: st.secs });

  // =====================================================================================================================================
  // 6) ACCIONES
  // =====================================================================================================================================
  const A = App.acts;
  let uidN = 0;
  const withIds = (list) => list.map((i) => Object.assign({ id: "i" + ++uidN }, i));

  function runIdeas(regen) {
    const st = ST(), round = regen ? st.round + 1 : 0, own = st.ideas.filter((i) => i.own), avoid = st.seen.slice();
    const enter = regen ? busyEnter("ideas") : (s) => go("ideas", [ai(PROMPT.ask()), me("Todavía no.")], (x) => { x.busy = "ideas"; x.mode = "nuevo"; x.ideas = []; x.pick = null; x.round = 0; x.seen = []; x.note = ""; });
    return think("ideas", enter, (signal) => AI.ideas(brandCtx(), N_IDEAS, { round, avoid, signal }), (s, data) => {
      const meta = metaOf(data), items = withIds(Array.isArray(data) ? data : []);
      s.ideas = own.concat(items); s.round = round; s.pick = null; s.note = meta.note; s.seen = uniq(s.seen.concat(items.map((i) => i.titulo)));
    });
  }
  A.grstart = (el) => {
    const st = ST(), v = el.dataset.v;
    if (v === "no") { runIdeas(false); return; }
    if (v === "si") go("mine", [ai(PROMPT.ask()), me(Y("Sí, ya tengo ideas.", "Sí, ya tengo ideas."))], (s) => { s.mode = "tengo"; });
    else go("topic", [ai(PROMPT.ask()), me("Quiero hacer una entrevista.")], (s) => { s.mode = "entrevista"; });
    void st;
  };
  A.grmore = () => { if (!ST().busy) runIdeas(true); };
  A.grskip = () => { if (ctl) { try { ctl.ac.abort(); } catch (e) { /* nada */ } } };
  A.grpick = (el) => {
    const st = ST(), it = st.ideas.find((i) => i.id === el.dataset.id); if (!it) return;
    st.pick = it;
    $$(".gr-idea").forEach((b) => { const on = b.dataset.id === it.id; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); });
    const go0 = $("#grdevbtn"); if (go0) { go0.disabled = false; const t = it.titulo.length > 28 ? it.titulo.slice(0, 27) + "…" : it.titulo; go0.lastChild.textContent = `Desarrollar «${t}»`; }
  };
  function addOwn() {
    const st = ST(), inp = $("#grown"), t = (inp ? inp.value : st.ownText).trim(); if (!t) { if (inp) inp.focus(); return; }
    const it = { id: "i" + ++uidN, titulo: cap1(t.slice(0, 140)), gancho: "", por_que: "Tu idea: la podemos desarrollar con lo que cuentes.", own: true };
    st.ownText = ""; st.ideas.unshift(it); st.pick = it; App.render(true);
    const list = $(".gr-ideas"); if (list) list.scrollTop = 0;
  }
  A.grdev = () => {
    const st = ST(); if (!st.pick) return;
    go("develop", [ai(PROMPT.ideas(st)), me(`«${st.pick.titulo}»`)], (s) => { if (s.rawFor !== s.pick.id) { s.raw = ""; s.rawFor = s.pick.id; s.script = null; s.approved = false; } s.lang = s.lang || langOfBrand(); });
  };
  A.grmic = (el) => micToggle(el.dataset.target || "grraw");
  A.grscript = (el) => {
    const st = ST();
    if (el && el.dataset && el.dataset.cancel) { st.editing = false; App.render(true); return; }
    const raw = (st.raw || "").trim();
    if (nWords(raw) < 4) { st.err = Y("Contame un poco más: hablá o escribí al menos una o dos frases.", "Cuéntame un poco más: habla o escribe al menos una o dos frases."); App.render(true); return; }
    micStop();
    think("script", (s) => go("script", [ai(PROMPT.develop(s)), me(Y("Listo, eso es todo lo que quería contar.", "Listo, eso es todo lo que quería contar."))], (x) => { x.busy = "script"; x.script = null; x.approved = false; x.revOpen = false; x.editing = false; x.note = ""; }),
      (signal) => AI.script(st.pick, raw, { signal, lang: st.lang }), (s, data) => { s.script = data; s.note = metaOf(data).note; });
  };
  A.grapprove = () => { const st = ST(); if (!st.script) return; go("ready", [ai(PROMPT.script()), me("Aprobado.")], (s) => { s.approved = true; }); };
  A.grchanges = () => { const st = ST(); st.revOpen = !st.revOpen; App.render(true); if (st.revOpen) setTimeout(() => { const i = $("#grrev"); if (i) i.focus({ preventScroll: true }); }, 30); };
  function revise(instruction) {
    const st = ST(), t = String(instruction || "").trim(); if (!t) { const i = $("#grrev"); if (i) i.focus(); return; }
    think("revise", (s) => move(() => { s.busy = "revise"; s.revOpen = false; s.err = ""; }), (signal) => AI.revise(st.script, t, { signal, lang: st.lang }), (s, data) => {
      const m = metaOf(data); s.trail.push(me(t)); s.trail.push(ai(m.applied === false ? "No pude hacer ese cambio." : "Listo, ajusté el guion."));
      if (m.applied !== false) { s.script = data; s.approved = false; } s.note = m.note; s.revText = "";
    });
  }
  A.grquick = (el) => revise(el.dataset.q);
  A.gredit = () => { const st = ST(); st.editing = true; st.editText = st.script.texto; App.render(true); };
  A.gredone = () => {
    const st = ST(), paras = String(st.editText || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean); if (!paras.length) { st.editing = false; App.render(true); return; }
    const lang = st.lang || langOfBrand(), sc = { ...st.script };
    if (paras.length === 1) { const ss = sentences(paras[0], lang); sc.hook = ss[0] || paras[0]; sc.beats = ss.slice(1); sc.cierre = ""; }
    else if (paras.length === 2) { sc.hook = paras[0]; sc.beats = []; sc.cierre = paras[1]; }
    else { sc.hook = paras[0]; sc.beats = paras.slice(1, -1); sc.cierre = paras[paras.length - 1]; }
    sc.cierreSugerido = false; sc.thin = false; st.script = finishScript(sc); st.editing = false; st.approved = false; st.note = ""; App.render(true);
  };
  A.grbackscript = () => { App.crearGrabar.back(); };
  A.grtellmore = () => { const st = ST(); if (!st.pick) st.pick = { id: "x", titulo: st.script.titulo, gancho: st.script.hook }; rewindTo("develop", (s) => { s.raw = s.raw || ""; }); };
  A.grrec = () => { const st = ST(); if (st.script) openTP(scriptArgs(st)); };
  A.grrerec = () => { const st = ST(); if (st.lastTP) openTP(st.lastTP); };
  A.grnext = () => {
    const st = ST(), target = st.mode === "entrevista" ? "topic" : st.mode === "tengo" ? "compare" : "ideas";
    rewindTo(target, (s) => { s.result = null; s.script = s.mode === "nuevo" ? null : s.script; s.approved = false; s.pick = s.mode === "nuevo" ? null : s.pick; if (s.mode === "entrevista") { s.qs = []; s.topic = ""; } if (s.mode === "nuevo") { s.raw = ""; s.rawFor = ""; } });
  };
  A.grfinish = () => { App.crear.advanceNav("crear"); App.crear.advanceStep; setTimeout(() => { UI.crear.grabar = fresh(); }, 600); };
  A.grdl = async () => {
    const r = ST().result, f = r && r.recorded; if (!f) return;
    const ext = /mp4/.test(f.type || "") ? "mp4" : "webm", name = f.name || `grabacion-${slug(r.title)}-${App.dayKey(new Date())}.${ext}`;
    let ok = false; try { ok = await App.adapter().download(name, f); } catch (e) { ok = false; }
    if (ok === true) toast("Descarga lista: " + name); else if (ok !== "declined") toast("No se pudo descargar. Probá de nuevo.");
  };
  // La grabación pasa a ser material de un pedido nuevo: se arma el estado de «Un video nuevo» y se sube por el mismo camino que cualquier archivo
  // (App.attach → App.act.upload), en la categoría "Video normal". Sin archivo, solo se lleva a esa pantalla con la nota.
  A.grsend = () => {
    const st = ST(), r = st.result || {}, f = r.recorded;
    if (!App.crearVideo || !App.crearVideo.arriveWith) { App.crear.advanceNav("crear/video"); return; }
    App.crearVideo.arriveWith({});
    const v = UI.crear.video; v.notes = `Grabado con Grabar${r.title ? ": " + r.title : ""}.`;
    if (f) {
      try {
        const file = f instanceof File ? f : new File([f], f.name || `grabacion-${slug(r.title)}.${/mp4/.test(f.type || "") ? "mp4" : "webm"}`, { type: f.type || "video/webm" });
        const a = App.attach.make(); v.att.normal = a; a.add([file]);
        toast("Tu grabación quedó como «Video normal». Elegí el estilo y seguí.");
      } catch (e) { toast("No pude adjuntar la grabación. Subila a mano en «Un video nuevo»."); }
    } else toast("Subí tu grabación en «Un video nuevo».");
    App.crear.advanceNav("crear/video");
  };

  // ---------- "ya tengo ideas" ----------
  A.grmine = () => {
    const st = ST(), ideas = splitIdeas(st.mineText).slice(0, MINE_MAX);
    if (!ideas.length) { st.err = Y("Escribí o dictá al menos una idea (una por línea).", "Escribe o dicta al menos una idea (una por línea)."); App.render(true); return; }
    micStop(); const extra = splitIdeas(st.mineText).length > MINE_MAX;
    think("scripts", (s) => go("compare", [ai(PROMPT.mine()), me(ideas.length === 1 ? "Te dejé mi idea." : `Te dejé ${ideas.length} ideas.`)], (x) => { x.busy = "scripts"; x.cmp = []; x.cmpSel = -1; x.note = ""; }),
      (signal) => AI.scripts(ideas, { signal, lang: st.lang || langOfBrand() }), (s, data) => {
        const meta = metaOf(data); s.cmp = (Array.isArray(data) ? data : []).map((sc, i) => ({ idea: { id: "m" + i, titulo: ideas[i].titulo, text: ideas[i].text }, script: sc }));
        s.cmpSel = s.cmp.length === 1 ? 0 : -1; s.note = [meta.note, extra ? `Tomé las primeras ${MINE_MAX} ideas.` : ""].filter(Boolean).join(" ");
      });
  };
  A.grcmp = (el) => {
    const st = ST(), i = +el.dataset.i; st.cmpSel = i;
    $$(".gr-cmp").forEach((b, k) => { b.classList.toggle("on", k === i); b.setAttribute("aria-checked", String(k === i)); });
    ["grcmpgo", "grcmpmore"].forEach((id) => { const b = $("#" + id); if (b) b.disabled = false; });
  };
  A.grcmpgo = () => { const st = ST(), c = st.cmp[st.cmpSel]; if (!c) return; go("script", [ai(PROMPT.compare(st)), me(`«${c.script.titulo}»`)], (s) => { s.pick = { id: c.idea.id, titulo: c.script.titulo, gancho: c.script.hook }; s.script = c.script; s.approved = false; s.revOpen = false; s.editing = false; s.note = ""; }); };
  A.grcmpmore = () => {
    const st = ST(), c = st.cmp[st.cmpSel]; if (!c) return;
    go("develop", [ai(PROMPT.compare(st)), me(`Quiero contar más sobre «${c.script.titulo}».`)], (s) => { s.pick = { id: c.idea.id, titulo: c.script.titulo, gancho: c.script.hook }; s.raw = c.idea.text; s.rawFor = c.idea.id; s.script = null; s.approved = false; s.lang = s.lang || langOfBrand(); });
  };

  // ---------- entrevista ----------
  A.grtopicpick = (el) => { const st = ST(), i = $("#grtopic"); st.topic = el.dataset.t; if (i) { i.value = st.topic; i.focus({ preventScroll: true }); } };
  A.grqs = () => {
    const st = ST(), topic = (st.topic || "").trim();
    if (nWords(topic) < 1 || topic.length < 3) { st.err = Y("Contame el tema en unas palabras.", "Cuéntame el tema en unas palabras."); App.render(true); const i = $("#grtopic"); if (i) i.focus(); return; }
    st.topic = topic;
    think("questions", (s) => go("questions", [ai(PROMPT.topic()), me(topic)], (x) => { x.busy = "questions"; x.qs = []; x.qRound = 0; x.note = ""; x.lang = x.lang || langOfBrand(); }),
      (signal) => AI.questions(topic, Q_DEFAULT, { signal, lang: st.lang || langOfBrand() }), (s, data) => { s.qs = (Array.isArray(data) ? data : []).slice(); s.note = metaOf(data).note; });
  };
  A.grqmore = () => {
    const st = ST(); if (st.qs.length >= Q_MAX) return; const want = Math.min(3, Q_MAX - st.qs.length), have = st.qs.filter((q) => q.trim());
    think("questions", busyEnter("questions"), (signal) => AI.questions(st.topic, want, { signal, round: st.qRound + 1, avoid: have, lang: st.lang || langOfBrand() }), (s, data) => {
      s.qRound++; const extra = (Array.isArray(data) ? data : []).filter((q) => !s.qs.some((x) => norm(x) === norm(q))); s.qs = s.qs.concat(extra).slice(0, Q_MAX); s.note = metaOf(data).note;
    });
  };
  const qmove = (i, d) => { const st = ST(), j = i + d; if (j < 0 || j >= st.qs.length) return; [st.qs[i], st.qs[j]] = [st.qs[j], st.qs[i]]; App.render(true); const t = $$(".gr-qi")[j]; if (t) t.focus({ preventScroll: true }); };
  A.grqup = (el) => qmove(+el.dataset.i, -1);
  A.grqdn = (el) => qmove(+el.dataset.i, 1);
  A.grqdel = (el) => { const st = ST(); st.qs.splice(+el.dataset.i, 1); App.render(true); };
  A.grqadd = () => { const st = ST(); if (st.qs.length >= Q_MAX) return; st.qs.push(""); App.render(true); const t = $$(".gr-qi"); if (t.length) t[t.length - 1].focus(); };
  A.grqnext = () => {
    const st = ST(), qs = st.qs.map((q) => q.trim()).filter(Boolean);
    if (!qs.length) { st.err = Y("Dejá al menos una pregunta.", "Deja al menos una pregunta."); App.render(true); return; }
    go("seconds", [ai(PROMPT.questions(st)), me(`${qs.length} ${qs.length === 1 ? "pregunta" : "preguntas"}.`)], (s) => { s.qs = qs; });
  };
  function paintSecs() {
    const st = ST(); $$(".gr-sec").forEach((b) => { const on = +b.dataset.s === st.secs; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); });
    const sum = $("#grsum"); if (sum) sum.textContent = secsSummary(st);
  }
  A.grsecs = (el) => { const st = ST(), c = $("#grcust"); st.secs = +el.dataset.s; if (c) c.value = ""; paintSecs(); };
  A.grstartint = () => {
    const st = ST(), a = interviewArgs(st); if (!a.questions.length) { go("questions"); return; }
    go("done", null, (s) => { void s; }).then; // (no se usa: el paso "done" lo agrega finishTP al terminar)
    openTP(a);
  };
  A.grrestart = () => { cancelPending(); micStop(); App.crear.advanceStep(() => { UI.crear.grabar = fresh(); }); };

  // =====================================================================================================================================
  // 7) BACK, BIND Y LIMPIEZA AL SALIR
  // =====================================================================================================================================
  function back() {
    const st = ST(); if (!st.hist.length) return false;
    const h = st.hist.pop(); st.req++; cancelPending(); micStop();
    App.crear.advanceStep(() => { st.trail.length = Math.min(st.trail.length, h.trail); st.step = h.step; st.busy = ""; st.err = ""; st.editing = false; });
    return true;
  }
  function bind(root) {
    const st = ST(), log = $(".crear-cloud .log", root); if (log) log.scrollTop = log.scrollHeight;
    const on = (sel0, ev, fn) => { const el = $(sel0, root); if (el) el.addEventListener(ev, fn); return el; };
    on("#grraw", "input", (e) => { st.raw = e.target.value; if (rec && micTarget === "grraw") { micBase = e.target.value; micFinal = ""; } });
    on("#grmine", "input", (e) => { st.mineText = e.target.value; if (rec && micTarget === "grmine") { micBase = e.target.value; micFinal = ""; } });
    on("#gredit", "input", (e) => { st.editText = e.target.value; });
    on("#grown", "input", (e) => { st.ownText = e.target.value; });
    on("#grownform", "submit", (e) => { e.preventDefault(); addOwn(); });
    on("#grrev", "input", (e) => { st.revText = e.target.value; });
    on("#grrevform", "submit", (e) => { e.preventDefault(); revise(st.revText); });
    on("#grtopic", "input", (e) => { st.topic = e.target.value; });
    on("#grtopic", "keydown", (e) => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); A.grqs(); } });
    $$(".gr-qi", root).forEach((t) => t.addEventListener("input", () => { st.qs[+t.dataset.i] = t.value; const n = $("#grqcount"); if (n) n.textContent = st.qs.filter((q) => q.trim()).length; }));
    on("#grcust", "input", (e) => { const n = Math.round(+e.target.value); if (n >= SECS_MIN && n <= SECS_MAX) { st.secs = n; paintSecs(); } });
    on("#grcust", "blur", (e) => { const n = Math.round(+e.target.value); if (e.target.value && !(n >= SECS_MIN && n <= SECS_MAX)) { e.target.value = ""; } });
  }
  // al salir de Grabar se corta el micrófono y la consulta; y si se había terminado una sesión, la próxima vez arranca limpia
  App.on((ks) => {
    if (!ks.has("route")) return;
    if (hereNow()) return;
    micStop(); cancelPending();
    const st = ST(); st.req++; if (st.step === "done") UI.crear.grabar = fresh();
  });

  App.crearGrabar = { render, bind, back };
})();
