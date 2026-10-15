/* Aura · "Empieza aquí" (DECISIONES.md #18). Los primeros pasos para conocer Aura: es lo primero que se ve al abrir el portal por primera vez
   y no se quita del primer lugar del menu hasta completar los 6 (cuando se completan baja solo al final, sigue ahi para repasarlo).
   Contrato que usan el nav (shell.js/router.js), el arranque (boot.js), Hoy y las demas funciones:
     App.onboarding.pending()   -> true mientras falte algun paso (el nav pone "Empieza aquí" primero; boot.js abre #empieza la primera vez)
     App.onboarding.progress()  -> {done, total}
     App.onboarding.isDone(id) / markDone(id) / reset()
     App.onboarding.unmark(id)  -> deshace un paso (el "Deshacer" del aviso)
     App.onboarding.next()      -> el proximo paso sin hacer (o null)
     App.onboarding.hoyCard()   -> la tarjeta chica de Hoy mientras falten pasos ("" si no)
   Los pasos (ids): jarvis · estilo · grabar · pedido · revisar · metricas. Otras funciones llaman markDone(id) cuando pasa algo (Grabar llama
   markDone("grabar") al terminar de grabar), pero NO se depende de eso: aca mismo se detecta solo, escuchando rutas, datos y Jarvis (ver detect()).
   El progreso se guarda en la base (home/onboarding, S.onboardDoc) y, como respaldo, en el navegador (App.store "onboard"); se leen los dos y se unen. */
(function () {
  "use strict";
  const App = window.App, S = App.S, { $, $$, esc, icon, ring, plural } = App, say = App.say, owner = App.config.owner;

  // ---------- los pasos ----------
  // cada uno lleva a la persona DIRECTO al lugar (href, o act si hay que abrir algo como Jarvis); `desc` es una sola frase de para que sirve.
  const STEPS = [
    { id: "jarvis", icon: "sparkles", title: say("Conocé a Jarvis", "Conoce a Jarvis"), desc: say("Es tu asistente: preguntale lo que quieras o pedile que te lleve a cualquier pantalla.", "Es tu asistente: pregúntale lo que quieras o pídele que te lleve a cualquier pantalla."), cta: "Abrir a Jarvis", act: "esjarvis", href: "#hoy" },
    { id: "estilo", icon: "book", title: say("Mirá tus estilos", "Mira tus estilos"), desc: "En la Biblioteca y el Laboratorio están los estilos que le dan su look a tus videos.", cta: "Ver los estilos", href: "#biblioteca" },
    { id: "grabar", icon: "camera", title: say("Grabá tu primer video", "Graba tu primer video"), desc: say("Con el teleprompter el guion se mueve solo mientras hablás a la cámara.", "Con el teleprompter el guion se mueve solo mientras hablas a la cámara."), cta: "Ir a Grabar", href: "#crear/grabar" },
    { id: "pedido", icon: "wand", title: say("Pedí tu primer video", "Pide tu primer video"), desc: say("Contale a Claude qué querés y lo produce por vos.", "Cuéntale a Claude qué quieres y lo produce por ti."), cta: "Pedir un video", href: "#crear" },
    { id: "revisar", icon: "film", title: say("Aprobá o rechazá un video", "Aprueba o rechaza un video"), desc: say("Vos decidís qué sale a tus redes: aprobar es dejarlo agendado.", "Tú decides qué sale a tus redes: aprobar es dejarlo agendado."), cta: "Abrir el Estudio", href: "#estudio" },
    { id: "metricas", icon: "chart", title: say("Mirá cómo te va", "Mira cómo te va"), desc: "Vistas, seguidores y logros de tus redes, todo en un solo lugar.", cta: "Ver Métricas", href: "#metricas" },
  ];
  const stepOf = (id) => STEPS.find((s) => s.id === id) || null;

  // ---------- estado: base + respaldo local, unidos ----------
  // Se leen los dos y se juntan (un paso hecho en cualquiera de los dos cuenta): si la base no deja escribir o la escritura falla, lo hecho en este
  // navegador no se pierde al recargar. `resetAt` es la marca de "Volver a ver los pasos": lo anterior a esa marca ya no vale.
  function doc() {
    const a = S.onboardDoc, b = App.store.get("onboard", null);
    if (!a && !b) return { steps: {} };
    const cut = [a && a.resetAt, b && b.resetAt].filter(Boolean).sort().pop() || "", steps = {};
    [a, b].forEach((d) => d && Object.entries(d.steps || {}).forEach(([id, at]) => { if (at && String(at) >= cut && !(steps[id] && steps[id] > at)) steps[id] = at; }));
    return cut ? { steps, resetAt: cut } : { steps };
  }
  const isDone = (id) => !!(doc().steps || {})[id];
  const progress = () => ({ done: STEPS.filter((s) => isDone(s.id)).length, total: STEPS.length });
  const pending = () => progress().done < progress().total;
  const nextStep = () => STEPS.find((s) => !isDone(s.id)) || null;
  const wouldFinish = (id) => !!stepOf(id) && !isDone(id) && !STEPS.some((s) => s.id !== id && !isDone(s.id));

  // ---------- movimiento del menu al cambiar el orden (Empieza aquí sube o baja) ----------
  // Se anota donde estaba cada item del riel ANTES de que el menu se repinte y, ya repintado, cada uno se desliza desde su lugar anterior (FLIP,
  // solo transform): "Empieza aquí" baja al final planeando en vez de saltar. Se corre en el cuadro siguiente al aviso, cuando boot.js ya repinto.
  const afterChrome = (fn) => requestAnimationFrame(fn);
  const railRects = () => { const m = {}; $$("#rail .nv").forEach((a) => { m[a.dataset.nav] = a.getBoundingClientRect().top; }); return m; };
  function flip(before) {
    if (App.reduceMotion()) return;
    $$("#rail .nv").forEach((a) => {
      const was = before[a.dataset.nav]; if (was == null || !a.animate) return;
      const dy = was - a.getBoundingClientRect().top; if (Math.abs(dy) < 2) return;
      a.style.zIndex = "2"; const done = () => { a.style.zIndex = ""; };
      a.animate([{ transform: `translateY(${dy.toFixed(1)}px)` }, { transform: "none" }], { duration: 900, easing: App.morph.OUT }).finished.then(done, done);
    });
  }
  // un pulso en el icono del menu cuando avanzas un paso desde otra pantalla (sin avisos que tapen lo que estas haciendo)
  function pulseNav() {
    if (App.reduceMotion()) return;
    afterChrome(() => $$('[data-nav="empieza"] .ic').forEach((ic) => { if (ic.animate) ic.animate([{ transform: "scale(1)" }, { transform: "scale(1.5) rotate(-8deg)" }, { transform: "scale(.94)" }, { transform: "scale(1)" }], { duration: 800, easing: App.morph.spring }); }));
  }

  let justDone = new Set(); // pasos que se acaban de completar por la persona (para animar la tarjeta; lo que llega de la base solo cambia de estado)
  async function save(next) {
    const wasPending = pending(), before = railRects();
    S.onboardDoc = next; App.store.set("onboard", next);
    App.emit("home"); // el riel/barra se reordenan, Hoy cambia su tarjeta y esta pantalla se actualiza
    if (wasPending !== pending()) afterChrome(() => flip(before));
    try { if (App.adapter() && App.adapter().canWrite && App.adapter().canWrite()) await App.data.set("home", "onboarding", next); } catch (e) { /* el respaldo local ya quedo */ }
  }
  async function markDone(id) {
    if (!stepOf(id) || isDone(id)) return false;
    const finishing = wouldFinish(id), d = doc();
    justDone.add(id);
    const p = save({ ...d, steps: { ...d.steps, [id]: App.stamp() } });
    if (finishing) finale(); else pulseNav();
    await p; return true;
  }
  async function unmark(id) {
    if (!isDone(id)) return false;
    const d = doc(), steps = { ...d.steps }; delete steps[id]; justDone.delete(id);
    await save({ ...d, steps }); return true;
  }
  const reset = () => { justDone = new Set(); return save({ steps: {}, resetAt: App.stamp() }); };

  // esperar a que no haya otra cosa en pantalla (Jarvis, la celebracion de hitos, el editor) antes de mostrar un festejo
  const busy = () => !!((App.jarvis && App.jarvis.isOpen && App.jarvis.isOpen()) || (App.celebrate && App.celebrate.isOpen && App.celebrate.isOpen()) || App.studioOpen || $("#jvwrap.open"));
  function whenFree(fn, tries) { if (!busy() || (tries || 0) > 80) { fn(); return; } setTimeout(() => whenFree(fn, (tries || 0) + 1), 600); }

  // ---------- deteccion automatica ----------
  // Otras funciones pueden llamar markDone(id), pero aca se detecta solo para no depender de ellas.
  let reqBase = null, vidSnap = null, jvObs = null, jvTimer = 0;
  const fresh = (t) => { const ms = Date.parse(t); return Number.isFinite(ms) && Math.abs(Date.now() - ms) < 60000; };
  // pedido: un pedido de video o de estilo creado por esta persona. En demostracion los pedidos de ejemplo ya vienen en la memoria: solo cuentan los nuevos.
  // Con la base real cuenta cualquiera suyo (si ya pidio videos antes, ya lo hizo); despues de "Volver a ver los pasos" solo los posteriores a esa marca.
  function checkRequests() {
    if (isDone("pedido") || !S.userId || !S.ready.requests) return;
    const since = doc().resetAt || "", demo = S.mode === "demo";
    if (S.requests.some((r) => (r.kind === "new_video" || r.kind === "new_style") && r.by === S.userId && !(demo && reqBase && reqBase.has(r.id)) && (!since || String(r.at || "") > since))) markDone("pedido");
  }
  // revisar: un video que cambia a aprobado o rechazado AHORA (decidedAt reciente) y que ya estaba cargado: no cuentan los que ya venian decididos ni los que llegan nuevos
  function checkVideos(changed) {
    if (!S.ready.videos) return;
    if (!vidSnap) { vidSnap = new Map(S.videos.map((v) => [v.id, v.status || "pending"])); return; }
    if (!changed) return;
    let hit = false;
    S.videos.forEach((v) => { const now = v.status || "pending", was = vidSnap.get(v.id); if (was !== undefined && was !== now && (now === "approved" || now === "rejected") && fresh(v.decidedAt)) hit = true; vidSnap.set(v.id, now); });
    if (hit) markDone("revisar");
  }
  // jarvis: se mira la capa de Jarvis (sin tocar jarvis.js). Cuenta cuando el panel ya aterrizo ("shown"): asi el repintado que sigue a marcar el paso no
  // le cambia el orbe de origen en pleno vuelo; si por algo no llega a "shown" se cuenta igual a los 2 s.
  function hookJarvis() {
    if (jvObs) return; const w = $("#jvwrap"); if (!w) return;
    jvObs = new MutationObserver(() => {
      if (!w.classList.contains("open")) { clearTimeout(jvTimer); jvTimer = 0; return; }
      if (w.classList.contains("shown")) { clearTimeout(jvTimer); jvTimer = 0; markDone("jarvis"); }
      else if (!jvTimer) jvTimer = setTimeout(() => { jvTimer = 0; if (w.classList.contains("open")) markDone("jarvis"); }, 2000);
    });
    jvObs.observe(w, { attributes: true, attributeFilter: ["class"] });
  }
  // grabar: la funcion Grabar llama markDone("grabar") o emite "aura:grabado"; ademas, si el teleprompter termina con una grabacion (o una lectura
  // de mas de 4 s) se cuenta aca. Se envuelve onDone sin cambiar nada de lo que devuelve App.teleprompter.open.
  function hookTeleprompter() {
    const T = App.teleprompter; if (!T || typeof T.open !== "function" || T.open.__empieza) return;
    const orig = T.open;
    T.open = function (o) {
      o = o || {}; const user = o.onDone;
      return orig.call(T, Object.assign({}, o, { onDone(res) { if (res && (res.recorded || res.durationMs >= 4000)) markDone("grabar"); if (user) return user.apply(this, arguments); } }));
    };
    T.open.__empieza = true;
  }
  window.addEventListener("aura:grabado", () => markDone("grabar"));

  function detect(ks) {
    if (!S.ready) return;
    hookJarvis(); hookTeleprompter();
    if (ks.has("route")) { const r = App.route().name; if (r === "biblioteca" || r === "laboratorio") markDone("estilo"); else if (r === "metricas") markDone("metricas"); }
    if (S.ready.requests) { if (!reqBase) reqBase = new Set(S.requests.map((r) => r.id)); if (ks.has("requests") || ks.has("connected")) checkRequests(); }
    checkVideos(ks.has("videos"));
    if (ks.has("grabado")) markDone("grabar");
  }
  App.on(detect);

  // ---------- la pantalla ----------
  const leadFor = (P) => {
    const left = P.total - P.done;
    if (!left) return say(`¡Terminaste, ${owner}! Ya conocés lo más importante de Aura.`, `¡Terminaste, ${owner}! Ya conoces lo más importante de Aura.`);
    if (!P.done) return say(`${P.total} pasos cortos para conocer Aura. Hacelos en el orden que quieras y a tu ritmo.`, `${P.total} pasos cortos para conocer Aura. Hazlos en el orden que quieras y a tu ritmo.`);
    if (left === 1) return say("¡Último paso! Ya casi lo tenés.", "¡Último paso! Ya casi lo tienes.");
    if (P.done === 1) return "¡Buen comienzo! Sigamos con el siguiente.";
    return `Vas muy bien. Te ${plural(left, "falta", "faltan")} ${left} ${plural(left, "paso", "pasos")}.`;
  };
  const cta = (s, cls, again) => {
    const inner = `${icon(s.icon)}<span class="c-go">${esc(s.cta)}</span>${again ? `<span class="c-again">${icon("arrow")}Volver a verlo</span>` : ""}`;
    return s.act ? `<button class="btn ${cls}" type="button" data-act="${s.act}">${inner}</button>` : `<a class="btn ${cls}" href="${s.href}">${inner}</a>`;
  };
  function nextBlock() {
    const nx = nextStep(), P = progress();
    if (!nx) return `<div class="es-next" data-k="all"><a class="btn pri lg2" href="#hoy">${icon("home")}Ir a Hoy</a><button class="es-quiet" type="button" data-act="esreset">${icon("refresh")}Volver a ver los pasos</button></div>`;
    return `<div class="es-next" data-k="${nx.id}"><span class="es-nx-k">${P.done ? "Tu siguiente paso" : "Para empezar"}</span><b class="es-nx-t">${esc(nx.title)}</b>${cta(nx, "pri lg2")}</div>`;
  }
  const ringArgs = (p) => { const C = 2 * Math.PI * 42; return `${(C * p).toFixed(1)} ${C.toFixed(1)}`; };
  function cloudHtml() {
    const P = progress();
    return `<section class="es-cloud" id="escloud" aria-labelledby="esh1"><span class="es-liq" aria-hidden="true"><i></i><i></i><i></i></span>
      <div class="es-in"><span class="eyebrow">Primeros pasos</span><h1 class="h-l" id="esh1">Empieza <em>aquí</em></h1>
        <div class="es-ringwrap" role="img" aria-label="${P.done} de ${P.total} pasos completados">${ring(P.done / P.total, 176, { r: 42, sw: 6, inner: `<span class="orb es-orb" aria-hidden="true"></span>` })}<span class="es-ok" aria-hidden="true">${icon("check")}</span></div>
        <p class="es-count" aria-live="polite"><b class="num" data-es="done">${P.done}</b> de <span data-es="total">${P.total}</span> pasos</p>
        <p class="es-lead" data-es="lead">${esc(leadFor(P))}</p>
        ${nextBlock()}</div></section>`;
  }
  function stepHtml(s, i) {
    const nx = nextStep(), st = isDone(s.id) ? "done" : nx && nx.id === s.id ? "next" : "todo";
    return `<li class="es-li" data-step="${s.id}" data-state="${st}" ${st === "next" ? 'aria-current="step"' : ""}><span class="es-badge" aria-hidden="true"><b class="n">${i + 1}</b>${icon("check")}</span>
      <div class="es-card card lg"><div class="es-top"><h3 class="es-t">${esc(s.title)}</h3><span class="chip es-tag es-tag-next">Siguiente</span><span class="chip good es-tag es-tag-done">${icon("check")}Hecho</span></div>
        <p class="es-d">${esc(s.desc)}</p>
        <div class="es-acts">${cta(s, "es-cta" + (st === "next" ? " pri" : st === "done" ? " ghost" : ""), true)}<button class="es-quiet es-skip" type="button" data-act="esmark" data-id="${s.id}">Ya lo hice</button></div></div></li>`;
  }

  // pone la pantalla al dia SIN repintarla (asi los giros, el anillo y los destellos no se cortan): estados de las tarjetas, anillo, textos y el paso siguiente
  function paint() {
    const es = $(".es"); if (!es) return false;
    const P = progress(), nx = nextStep();
    es.dataset.complete = nx ? "0" : "1";
    STEPS.forEach((s) => {
      const li = $(`.es-li[data-step="${s.id}"]`, es); if (!li) return;
      const st = isDone(s.id) ? "done" : nx && nx.id === s.id ? "next" : "todo", was = li.dataset.state; if (was === st) return;
      li.dataset.state = st; if (st === "next") li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
      const c = $(".es-cta", li); if (c) { c.classList.toggle("pri", st === "next"); c.classList.toggle("ghost", st === "done"); }
      if (st === "done" && justDone.has(s.id)) { justDone.delete(s.id); whenFree(() => celebrateStep(li)); }
    });
    const rv = $(".ring-val", es); if (rv) rv.style.strokeDasharray = ringArgs(P.done / P.total);
    const rw = $(".es-ringwrap", es); if (rw) rw.setAttribute("aria-label", `${P.done} de ${P.total} pasos completados`);
    const d = $('[data-es="done"]', es); if (d && d.textContent !== String(P.done)) { d.textContent = P.done; swapIn(d); }
    const lead = $('[data-es="lead"]', es), txt = leadFor(P); if (lead && lead.textContent !== txt) { lead.textContent = txt; swapIn(lead); }
    const nb = $(".es-next", es), key = nx ? nx.id : "all"; if (nb && nb.dataset.k !== key) { nb.outerHTML = nextBlock(); swapIn($(".es-next", es)); }
    return true;
  }
  function swapIn(el) { if (!el || App.reduceMotion() || !el.animate) return; el.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 560, easing: App.morph.OUT }); }
  function celebrateStep(li) {
    if (!li.isConnected) return;
    li.classList.add("just"); setTimeout(() => li.classList.remove("just"), 1500);
    const b = $(".es-badge", li); if (b) App.morph.sparkles(b, 7);
    const rw = $(".es-ringwrap"); if (rw && rw.animate && !App.reduceMotion()) rw.animate([{ transform: "scale(1)" }, { transform: "scale(1.06)" }, { transform: "scale(.99)" }, { transform: "scale(1)" }], { duration: 900, easing: App.morph.spring });
  }

  let esIn = false; // la gota de entrada (arrive) es una sola vez por sesion: las siguientes visitas entran con el fundido normal de pantalla
  App.views.empieza = {
    title: "Empieza aquí",
    render() {
      return `<div class="es" data-complete="${pending() ? 0 : 1}"><div class="es-hero"><div class="es-float">${cloudHtml()}</div></div>
        <ol class="es-list rise" aria-label="Pasos para empezar">${STEPS.map(stepHtml).join("")}</ol></div>`;
    },
    bind(root) {
      const c = $("#escloud", root); App.aura.tone("warm");
      // la primera vez de la sesion la nube nace en el orbe de Jarvis (la gota vuela y florece, igual que Crear y Notas); las demas entra con la pantalla
      if (c && !esIn) { esIn = true; App.morph.arrive(c); }
    },
    update() { return paint(); }, // true: boot.js solo repinta el riel/barra; el resto ya lo hizo paint()
  };

  // ---------- acciones ----------
  const A = App.acts;
  A.esjarvis = () => { if (App.jarvis && App.jarvis.open) App.jarvis.open(); };
  A.esmark = (el) => {
    const id = el.dataset.id, s = stepOf(id); if (!s || isDone(id)) return;
    const finishing = wouldFinish(id); markDone(id);
    if (!finishing) App.toast(`Listo: ${s.title}.`, () => unmark(id), 6000);
    // en el telefono la lista es larga: el paso que sigue se acerca solo si quedo fuera de vista
    requestAnimationFrame(() => requestAnimationFrame(() => { const n = $('.es-li[data-state="next"]'); if (!n) return; const r = n.getBoundingClientRect(); if (r.top > innerHeight - 140 || r.bottom < 90) n.scrollIntoView({ block: "center", behavior: App.reduceMotion() ? "auto" : "smooth" }); }));
  };
  A.esreset = () => { const prev = doc(); reset(); App.toast("Listo, volvimos a empezar.", () => save(prev), 8000); };

  // ---------- el festejo al terminar ----------
  // Un momento propio (no el de los hitos de celebrate.js): la gota sale del orbe, florece una tarjeta de vidrio con la medalla, confeti y una felicitacion
  // con una frase para seguir. Mientras tanto "Empieza aquí" ya bajo al final del menu (se ve el deslizamiento al cerrar).
  const PRAISE = ["¡Lo lograste!", "¡Buen trabajo!", "¡Excelente!"];
  const MOTIVATE = ["Lo que viene es lo mejor: un video a la vez, tu cuenta va a crecer.", "Con constancia, cada pieza que se publica suma.", "Ya está todo a mano: ahora lo importante es la constancia."];
  let fin = null;
  function finale() { whenFree(showFinale); }
  function showFinale() {
    if (fin) return;
    const root = $("#aura-root") || document.body, k = App.hash(owner || "") % PRAISE.length, prevFocus = document.activeElement, a = App.aura.el(), prevTone = (a && a.dataset.tone) || "base";
    const wrap = document.createElement("div"); wrap.className = "es-fin-wrap"; wrap.id = "esfin";
    wrap.innerHTML = `<div class="es-fin-veil" data-act="esfinclose"></div><section class="es-fin lg solid-glass" role="dialog" aria-modal="true" aria-labelledby="esfint">
      <div class="es-fin-hero"><i></i><i></i><i></i><span class="es-fin-orb"><span class="orb" aria-hidden="true"></span><span class="es-fin-ok" aria-hidden="true">${icon("check")}</span></span></div>
      <span class="eyebrow">Primeros pasos completos</span>
      <h2 class="es-fin-t" id="esfint">${PRAISE[k]} ${esc(say("Ya conocés Aura.", "Ya conoces Aura."))}</h2>
      <p class="es-fin-p">${esc(`Completaste los ${STEPS.length} pasos, ${owner}. ${MOTIVATE[k]}`)}</p>
      <p class="es-fin-note">«Empieza aquí» pasó al final del menú. ${esc(say("Cuando quieras, volvé a verlo.", "Cuando quieras, vuelve a verlo."))}</p>
      <button class="btn pri" type="button" data-act="esfinclose" id="esfinok">¡Genial!</button></section>`;
    root.appendChild(wrap);
    const panel = $(".es-fin", wrap), hero = $(".es-fin-hero", wrap), btn = $("#esfinok", wrap);
    fin = { wrap, prevFocus, prevTone };
    App.aura.tone("gold"); App.aura.mood("focus", { x: innerWidth / 2, y: innerHeight * 0.42 });
    requestAnimationFrame(() => wrap.classList.add("in"));
    const burst = () => { if (!fin || fin.wrap !== wrap) return; App.morph.confetti(wrap, 110); App.morph.sparkles(hero, 10); };
    if (App.morph.arrive(panel, { ms: 820, endSize: 140 })) { const t0 = Date.now(), iv = setInterval(() => { if (!panel.classList.contains("arr-pre") || Date.now() - t0 > 3200) { clearInterval(iv); burst(); } }, 60); } else burst();
    btn.focus({ preventScroll: true });
    fin.key = (e) => { if (e.key === "Escape") { e.stopPropagation(); closeFinale(); } else if (e.key === "Tab") { e.preventDefault(); btn.focus({ preventScroll: true }); } };
    document.addEventListener("keydown", fin.key, true);
  }
  function closeFinale() {
    if (!fin) return; const f = fin; fin = null; document.removeEventListener("keydown", f.key, true);
    App.aura.mood(null); App.aura.tone(f.prevTone);
    const panel = $(".es-fin", f.wrap), end = () => { f.wrap.remove(); try { if (f.prevFocus && f.prevFocus.isConnected) f.prevFocus.focus({ preventScroll: true }); } catch (e) { /* sin foco */ } };
    f.wrap.classList.remove("in");
    if (App.reduceMotion() || !panel || !panel.animate) { end(); return; }
    panel.animate([{ opacity: 1, transform: "translate(-50%, -50%) scale(1)" }, { opacity: 0, transform: "translate(-50%, calc(-50% + 14px)) scale(.97)" }], { duration: 300, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" }).finished.then(end, end);
  }
  A.esfinclose = () => closeFinale();

  // ---------- la tarjeta chica de Hoy mientras falten pasos ----------
  function hoyCard() {
    if (!pending()) return "";
    const P = progress(), nx = nextStep();
    return `<a class="es-hoy lg" href="#empieza" aria-label="Empieza aquí: ${P.done} de ${P.total} pasos. ${esc(P.done ? "Seguir con" : "Empezar con")} ${esc(nx.title)}">
      ${ring(P.done / P.total, 52, { r: 40, sw: 8, inner: `<b class="num es-hoy-n">${P.done}<small>/${P.total}</small></b>` })}
      <span class="es-hoy-t"><b>Empieza <em>aquí</em></b><span>${P.done ? "Siguiente" : "Primer paso"}: ${esc(nx.title)}</span></span>
      <span class="btn sm pri es-hoy-go">${P.done ? "Seguir" : "Empezar"}${icon("arrow")}</span></a>`;
  }

  App.onboarding = { STEPS, doc, isDone, progress, pending, markDone, unmark, reset, next: nextStep, hoyCard };
})();
