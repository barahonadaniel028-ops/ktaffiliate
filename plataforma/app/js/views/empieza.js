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
  // cada uno lleva a la persona DIRECTO al lugar (href, o act si hay que abrir algo como Jarvis); `desc` es una sola frase de para que sirve;
  // `did` es lo mismo en pasado (para el aviso "¡Paso listo!"; el pretérito es igual con vos que con tú).
  const STEPS = [
    { id: "jarvis", icon: "sparkles", title: say("Conocé a Jarvis", "Conoce a Jarvis"), did: "Conociste a Jarvis", desc: say("Es tu asistente: preguntale lo que quieras o pedile que te lleve a cualquier pantalla.", "Es tu asistente: pregúntale lo que quieras o pídele que te lleve a cualquier pantalla."), cta: "Hablar con Jarvis", act: "esjarvis", href: "#hoy" },
    { id: "estilo", icon: "book", title: say("Mirá tus estilos", "Mira tus estilos"), did: "Miraste tus estilos", desc: "En la Biblioteca y el Laboratorio están los estilos que le dan su look a tus videos.", cta: "Ver los estilos", href: "#biblioteca" },
    { id: "grabar", icon: "camera", title: say("Grabá tu primer video", "Graba tu primer video"), did: "Grabaste tu primer video", desc: say("Con el teleprompter el guion se mueve solo mientras hablás a la cámara.", "Con el teleprompter el guion se mueve solo mientras hablas a la cámara."), cta: "Ir a Grabar", href: "#crear/grabar" },
    { id: "pedido", icon: "wand", title: say("Pedí tu primer video", "Pide tu primer video"), did: "Pediste tu primer video", desc: say("Contale a Claude qué querés y lo produce por vos.", "Cuéntale a Claude qué quieres y lo produce por ti."), cta: "Pedir un video", href: "#crear" },
    { id: "revisar", icon: "film", title: say("Aprobá o rechazá un video", "Aprueba o rechaza un video"), did: "Revisaste un video", desc: say("Vos decidís qué sale a tus redes: aprobar es dejarlo agendado.", "Tú decides qué sale a tus redes: aprobar es dejarlo agendado."), cta: "Abrir el Estudio", href: "#estudio" },
    { id: "metricas", icon: "chart", title: say("Mirá cómo te va", "Mira cómo te va"), did: "Miraste cómo te va", desc: "Vistas, seguidores y logros de tus redes, todo en un solo lugar.", cta: "Ver Métricas", href: "#metricas" },
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
  // `o.toast`: true = avisa siempre (lo marco la persona a mano: el aviso trae "Deshacer"); si no, avisa solo cuando no esta mirando esta pantalla
  // (alli ya se ve el paso girar y brillar). El aviso espera a que no haya Jarvis/editor abiertos para no taparlos.
  async function markDone(id, o) {
    if (!stepOf(id) || isDone(id)) return false;
    const finishing = wouldFinish(id), d = doc(), toast = !!(o && o.toast);
    justDone.add(id);
    const p = save({ ...d, steps: { ...d.steps, [id]: App.stamp() } });
    if (finishing) finale(); else { pulseNav(); if (!(o && o.quiet)) whenFree(() => { if (isDone(id) && (toast || App.route().name !== "empieza")) doneToast(id); }); }
    await p; return true;
  }
  function doneToast(id) { const s = stepOf(id), P = progress(); if (s) App.toast(`¡Paso listo! ${s.did} (${P.done} de ${P.total}).`, () => unmark(id), 7000); }
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
  // Si todavia no se sabe quien es la persona (la capacidad "user" llega despues de conectar) no se puede decir "suyo": cuentan solo los pedidos que aparecen
  // despues de abrir la pantalla, que son los de esta sesion.
  function checkRequests() {
    if (isDone("pedido") || !S.ready.requests) return;
    const since = doc().resetAt || "", demo = S.mode === "demo", isNew = (r) => !(reqBase && reqBase.has(r.id));
    const theirs = (r) => (demo ? isNew(r) && r.by === S.userId : S.userId ? r.by === S.userId : isNew(r));
    const mine = S.requests.filter((r) => (r.kind === "new_video" || r.kind === "new_style") && (!since || String(r.at || "") > since) && theirs(r));
    // un pedido viejo (de antes de abrir hoy el portal) se cuenta sin aviso: no hace falta decirle "¡Paso listo!" por algo que hizo hace semanas
    if (mine.length) markDone("pedido", { quiet: !mine.some((r) => fresh(r.at)) });
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
  // de mas de 5 s: abrirlo y cerrarlo enseguida no cuenta) se cuenta aca. Se envuelve onDone sin cambiar nada de lo que devuelve App.teleprompter.open.
  function hookTeleprompter() {
    const T = App.teleprompter; if (!T || typeof T.open !== "function" || T.open.__empieza) return;
    const orig = T.open;
    T.open = function (o) {
      o = o || {}; const user = o.onDone;
      return orig.call(T, Object.assign({}, o, { onDone(res) { if (res && (res.recorded || res.durationMs >= 5000)) markDone("grabar"); if (user) return user.apply(this, arguments); } }));
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
  const ringArgs = (p) => { const C = 2 * Math.PI * 42; return `${(C * p).toFixed(1)} ${C.toFixed(1)}`; }; // 42 = el radio con el que se dibuja el anillo grande (ring() de util.js)
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
      justDone = new Set(); // la pantalla se dibuja ya con los estados al dia: lo que se completo estando en otra pantalla no hace falta festejarlo ahora
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
    markDone(id, { toast: true }); // el aviso trae "Deshacer" (si era el ultimo paso, en su lugar viene el festejo)
    // el foco pasa al boton principal del paso que sigue (el "Ya lo hice" que se toco desaparece); y en el telefono, donde la lista es larga,
    // ese paso se acerca solo si quedo fuera de vista
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const n = $('.es-li[data-state="next"]'); if (!n) return;
      const c = $(".es-cta", n); if (c) try { c.focus({ preventScroll: true }); } catch (e) { /* sin foco */ }
      const r = n.getBoundingClientRect(); if (r.top > innerHeight - 140 || r.bottom < 90) n.scrollIntoView({ block: "center", behavior: App.reduceMotion() ? "auto" : "smooth" });
    }));
  };
  A.esreset = () => { const prev = doc(); reset(); App.toast("Listo, volvimos a empezar.", () => save(prev), 8000); };

  // ---------- el festejo al terminar ----------
  // Un momento propio (no el de los hitos de celebrate.js): la gota sale del orbe, florece una tarjeta de vidrio con la medalla, confeti y una felicitacion
  // con una frase para seguir. Mientras tanto "Empieza aquí" ya bajo al final del menu (se ve el deslizamiento al cerrar).
  const PRAISE = ["¡Lo lograste!", "¡Buen trabajo!", "¡Excelente!"];
  const MOTIVATE = ["Lo que viene es lo mejor: un video a la vez, tu cuenta va a crecer.", "Con constancia, cada pieza que se publica suma.", "Ya está todo a mano: ahora lo importante es la constancia."];
  let fin = null;
  // el festejo espera un momento: en la propia pantalla, a que se vea girar el ultimo paso; y en Hoy/Metricas, a que pase (o no) el aviso de hitos de celebrate.js (1,1 s), para no apilarse
  function finale() { const r = App.route().name; setTimeout(() => whenFree(showFinale), r === "empieza" ? 900 : r === "hoy" || r === "metricas" ? 1700 : 300); }
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
  // Hoy se repinta entero con cualquier cambio de datos (sus graficos llevan ids al azar), asi que la tarjeta no necesita actualizarse sola: se dibuja
  // con el estado de ese momento y desaparece sola cuando ya no queda ningun paso.
  function hoyCard() {
    if (!pending()) return "";
    const P = progress(), nx = nextStep();
    return `<a class="es-hoy lg" href="#empieza" aria-label="${esc(`Empieza aquí: ${P.done} de ${P.total} pasos. ${P.done ? "Seguir con" : "Empezar con"} ${nx.title}`)}">${ring(P.done / P.total, 52, { r: 40, sw: 8, inner: `<b class="num es-hoy-n">${P.done}<small>/${P.total}</small></b>` })}<span class="es-hoy-t"><b>Empieza <em>aquí</em></b><span>${esc((P.done ? "Siguiente" : "Primer paso") + ": " + nx.title)}</span></span><span class="btn sm pri es-hoy-go">${P.done ? "Seguir" : "Empezar"}${icon("arrow")}</span></a>`;
  }

  App.onboarding = { STEPS, doc, isDone, progress, pending, markDone, unmark, reset, next: nextStep, hoyCard };
})();
