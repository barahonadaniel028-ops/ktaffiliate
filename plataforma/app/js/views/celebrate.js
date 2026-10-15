/* Aura · celebracion de logros. Cuando llega un logro o un nivel nuevo, la gota sale del orbe, florece una tarjeta de vidrio y la medalla cae con rebote,
   con anillos y destellos. Un logro por pagina (los de "todas las cuentas" primero) y, al final, la subida de nivel. Al cerrar se marca como visto. */
(function () {
  "use strict";
  const App = window.App, S = App.S, { $, $$, esc, icon, fmt } = App, T = App.trophies;
  const done = new Set(), NOCEL = /[?&]nocel\b/.test(location.search); // ?nocel=1 apaga el aviso automatico (para pruebas)
  let cur = null, timer = 0, prevTone = "base";

  // Reconocimiento por el trabajo + una frase motivacional, ademas del dato en si (DECISIONES.md #1: la celebracion tiene que
  // felicitar, no solo informar). Una de cada una, elegida de forma estable por hito para que no cambie si se vuelve a pintar.
  const PRAISE = ["¡Buen trabajo!", "¡Así se hace!", "¡Excelente!", "¡Vas muy bien!", "¡Se nota el esfuerzo!"];
  const MOTIVATE = ["Cada pieza que aprobás suma para la próxima marca.", "Lo que sembraste ya está dando resultado.", "El trabajo constante es el que mueve estos números.", "Seguí así: lo que viene va a ser todavía mejor.", "Las redes crecen con constancia, y la tuya se nota."];
  const pick = (arr, seed) => arr[Math.abs(String(seed).split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % arr.length];

  const slideItem = (it) => {
    const col = T.TIERS[it.tier][1];
    return `<div class="cel-slide" style="--m:${col}"><div class="cel-hero"><i class="cel-blob b1"></i><i class="cel-blob b2"></i><i class="cel-blob b3"></i><i class="cel-ring"></i><i class="cel-ring r2"></i><span class="medal cel-medal" style="--m:${col}">${icon(it.def.icon)}</span></div>
      <span class="eyebrow">${it.brand ? esc(it.brand) + " · " : ""}Hito nuevo</span>
      <h2 class="cel-t">${pick(PRAISE, it.id)} Llegaste a ${esc(it.line)}.</h2>
      <span class="cel-tier"><i></i>${esc(T.TIERS[it.tier][0])}</span>
      <p class="cel-p">${it.extra ? `Y ${it.extra === 1 ? "uno más" : it.extra + " más"} en el camino. ` : ""}${pick(MOTIVATE, it.id + "m")}</p>
      <span class="cel-xp" data-xp="${it.xp}">+${it.xp} XP</span></div>`;
  };
  const slideLevel = (lv) => `<div class="cel-slide level" style="--m:#ffcf6e"><div class="cel-hero"><i class="cel-blob b1"></i><i class="cel-blob b2"></i><i class="cel-blob b3"></i><i class="cel-ring"></i><i class="cel-ring r2"></i><div class="lvbadge cel-badge"><b class="num" data-from="${lv.from}" data-to="${lv.to}">${lv.from}</b><small>NIVEL</small></div></div>
      <span class="eyebrow">Subiste de nivel</span><h2 class="cel-t">${pick(PRAISE, lv.to)} Ahora eres nivel ${lv.to}.</h2>
      <span class="cel-tier"><i></i>${fmt(lv.xp)} XP en total</span>
      <div class="bar big cel-bar" style="--p:${Math.round(Math.min(1, Math.max(0, lv.ratio)) * 100)}%"><i></i></div>
      <p class="cel-p">Faltan ${fmt(lv.left)} XP para el nivel ${lv.to + 1}. Cada hito de tus redes suma.</p></div>`;

  function ensureWrap() {
    let w = $("#celwrap"); if (w) return w;
    w = document.createElement("div"); w.className = "jv-wrap cel-wrap"; w.id = "celwrap";
    w.innerHTML = `<div class="veil" data-celclose></div><section class="jv cel lg solid-glass" id="cel" role="dialog" aria-modal="true" aria-labelledby="celtitle"><div class="inner"><div class="cel-slides" id="celslides" aria-live="polite"></div><div class="cel-foot"><div class="cel-dots" id="celdots" aria-hidden="true"></div><button class="btn pri" type="button" id="celnext">Siguiente</button></div></div></section>`;
    (document.getElementById("aura-root") || document.body).appendChild(w);
    w.addEventListener("click", (e) => { if (e.target.closest("[data-celclose]")) close(); if (e.target.closest("#celnext")) next(); });
    w.addEventListener("keydown", (e) => { if (!cur) return; if (e.key === "ArrowRight") { e.preventDefault(); next(true); } else if (e.key === "ArrowLeft") { e.preventDefault(); go(Math.max(0, cur.i - 1)); } else if (e.key === "Escape") { e.stopPropagation(); close(); } });
    return w;
  }
  function countUp(el, from, to, ms, fmtFn) {
    if (!el) return; if (App.reduceMotion() || from === to) { el.textContent = fmtFn(to); return; }
    const t0 = performance.now(); (function f(t) { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = fmtFn(Math.round(from + (to - from) * e)); if (k < 1) requestAnimationFrame(f); })(t0);
  }
  function go(i) {
    if (!cur) return; cur.i = i; const slides = $$(".cel-slide", cur.wrap), last = i === slides.length - 1;
    slides.forEach((sl, k) => { sl.toggleAttribute("data-on", k === i); sl.toggleAttribute("data-past", k < i); });
    $$(".cel-dots i", cur.wrap).forEach((d, k) => d.classList.toggle("on", k === i));
    const btn = $("#celnext", cur.wrap); btn.textContent = last ? "¡Genial!" : "Siguiente"; btn.focus({ preventScroll: true });
    const sl = slides[i], hero = $(".cel-hero", sl); if (hero) App.morph.sparkles(hero, sl.classList.contains("level") ? 12 : 9);
    App.morph.confetti(cur.wrap, sl.classList.contains("level") ? 110 : i === 0 ? 90 : 60); // confeti en cada pagina: el hito nuevo se festeja de verdad
    const xp = $(".cel-xp", sl); if (xp) countUp(xp, 0, +xp.dataset.xp, 900, (n) => "+" + n + " XP");
    const lb = $(".cel-badge b", sl); if (lb) countUp(lb, +lb.dataset.from, +lb.dataset.to, 1100, String);
    const bar = $(".cel-bar", sl); if (bar) { bar.classList.remove("go"); void bar.offsetWidth; bar.classList.add("go"); }
    const tt = $(".cel-t", sl); if (tt) { tt.id = "celtitle"; }
  }
  function next(quiet) { if (!cur) return; const n = $$(".cel-slide", cur.wrap).length; if (cur.i < n - 1) go(cur.i + 1); else if (!quiet) close(); }

  async function show(data) {
    if (cur) return false; const real = !data; data = data || T.fresh(); if (!data) return false;
    const slides = data.items.slice(0, 5).map(slideItem); if (data.level) slides.push(slideLevel(data.level));
    if (!slides.length) return false;
    const wrap = ensureWrap(), panel = $("#cel", wrap), from = $$(".orb[data-orb]").find((o) => o.offsetParent) || null;
    $("#celslides", wrap).innerHTML = slides.join(""); $("#celdots", wrap).innerHTML = slides.map(() => "<i></i>").join(""); $("#celdots", wrap).hidden = slides.length < 2;
    if (data.items.length > 5) { const more = $$(".cel-p", wrap).slice(-1)[0]; if (more && !data.level) more.insertAdjacentHTML("beforeend", ` Y ${data.items.length - 5} hitos más en Métricas.`); }
    cur = { data, i: 0, wrap, panel, from, real }; if (real) done.add(data.ids.slice().sort().join("|"));
    const a = App.aura.el(); prevTone = (a && a.dataset.tone) || "base"; App.aura.tone("gold"); App.aura.mood("focus", { x: innerWidth / 2, y: innerHeight * 0.42 });
    await App.morph.open(from, wrap, panel); if (cur) go(0);
    return true;
  }
  async function close() {
    if (!cur) return; const c = cur; cur = null;
    if (c.real && c.data.ids.length) T.markSeen(c.data.ids);
    App.aura.mood(null); App.aura.tone(prevTone);
    await App.morph.close(c.from, c.wrap, c.panel);
  }
  // se mira al abrir la app (Hoy es la pantalla de entrada) o al entrar a Metricas, donde viven los hitos sin pantalla propia
  // (DECISIONES.md #1); y cuando llegan datos nuevos estando ahi. En otras pantallas el riel avisa con una marca, sin interrumpir.
  function check() {
    if (NOCEL || cur || App.studioOpen || (App.jarvis && App.jarvis.isOpen())) return;
    const r = App.route().name; if (r !== "hoy" && r !== "metricas") return;
    const f = T.fresh(); if (!f || done.has(f.ids.slice().sort().join("|"))) return;
    clearTimeout(timer); timer = setTimeout(() => { const n = App.route().name; if (!cur && !App.studioOpen && (n === "hoy" || n === "metricas") && !(App.jarvis && App.jarvis.isOpen())) show(); }, 1100);
  }
  // para probar la animacion (modo demostracion): usa tus logros mas altos y una subida de nivel de mentira, sin marcar nada como visto
  function sample() {
    const cs = T.cards(), top = cs.total.filter((c) => c.got > 0).sort((x, y) => y.tier - x.tier || y.ratio - x.ratio).slice(0, 2), lv = T.level(T.totalXp(cs));
    return { items: top.map((c) => ({ id: c.id, group: "total", brand: "", key: c.key, def: c.def, step: c.steps[c.got - 1], tier: c.tier, extra: 0, xp: 5, ids: [], line: T.UNIT[c.key] ? T.UNIT[c.key](c.steps[c.got - 1]) : fmt(c.steps[c.got - 1]) })), ids: [], xp: 10, level: { from: Math.max(1, lv.level - 1), to: lv.level, xp: lv.xp, ratio: lv.ratio, left: lv.to - lv.xp }, now: lv };
  }
  App.celebrate = { show, close, check, sample, isOpen: () => !!cur };
  App.acts.celebrate = () => App.celebrate.show();
  App.acts.celebratetest = () => App.celebrate.show(sample());
})();
