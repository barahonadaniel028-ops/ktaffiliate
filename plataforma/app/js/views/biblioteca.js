/* Aura · Biblioteca: todo lo aprobado en un solo lugar (estilos, transiciones, textos, fondos, subtitulos, sonidos y referencias) con vista previa viva. */
(function () {
  "use strict";
  const App = window.App, S = App.S, UI = App.ui, sel = App.sel, { $, $$, esc, icon } = App;
  const LINE = "this is how I start every morning";
  let audio = null;

  // ---------- demos en movimiento (CSS puro y WebAudio, sin videos) ----------
  function words(txt) { return txt.split(" ").map((w, i) => `<span style="--i:${i}">${esc(w)}</span>`).join(" "); }
  const STYLE_MOCK = {
    "titular-amarillo": `<div class="m-yel"><b>ESTO CAMBIA</b><b>TODO</b></div>`,
    "palabra-ancla": `<div class="m-anchor"><small>la única palabra que importa es</small><b>AHORA</b><small>y nadie te lo dice</small></div>`,
    "fondo-recortado": `<div class="m-cut"><span class="fig"></span><b>Tú, sobre un fondo limpio</b></div>`,
    "ensayo-combo": `<div class="m-essay"><i>Dato</i><p>Lo que <mark>funciona</mark> casi nunca es lo que parece.</p></div>`,
    "panel-explicativo": `<div class="m-panel"><i>3 pasos</i><p><b>1</b>Escoge una idea</p><p><b>2</b>Dila en una frase</p><p><b>3</b>Repite cada día</p></div>`,
    ranking: `<div class="m-rank"><p><b>S</b><i style="width:92%"></i></p><p><b>A</b><i style="width:70%"></i></p><p><b>B</b><i style="width:46%"></i></p><p><b>C</b><i style="width:24%"></i></p></div>`,
    "texto-nativo": `<div class="m-native">así empiezo cada mañana, sin excusas</div>`,
    "caja-blanca": `<div class="m-box"><b>Una frase que se lee en un segundo</b></div>`,
  };
  const TXT_MOCK = {
    titulo: `<div class="t-title">TU TÍTULO</div>`, amarillo: `<div class="t-title yel">TU TÍTULO</div>`, aston: `<div class="t-aston">palabra especial</div>`, etiqueta: `<div class="t-label">ETIQUETA</div>`,
    mano: `<div class="t-hand">a mano, con calma</div>`, tarjeta: `<div class="t-card"><i>Dato</i><b>7 de cada 10</b><span>pasan de las mil vistas</span></div>`, versus: `<div class="t-vs"><p>Antes<b>lento</b></p><p>Ahora<b>rápido</b></p></div>`,
  };
  const BG_MOCK = {
    original: `<span class="fig big"></span>`, "black-glow": `<span class="bgglow"></span><span class="fig big dark"></span>`, gradient: `<span class="bggrad"></span><span class="fig big dark"></span>`,
    ondas: `<svg class="bgsvg waves" viewBox="0 0 90 130" preserveAspectRatio="none"><path d="M0 70 Q22 50 45 70 T90 70" /><path d="M0 85 Q22 65 45 85 T90 85" /><path d="M0 100 Q22 80 45 100 T90 100" /></svg>`,
    red: `<svg class="bgsvg net" viewBox="0 0 90 130"><g stroke="currentColor" stroke-width=".7" fill="none"><path d="M12 20 L40 45 L70 25 L55 80 L20 90 L40 45 M55 80 L78 110 M20 90 L30 118"/></g><g fill="currentColor"><circle cx="12" cy="20" r="2.4"/><circle cx="40" cy="45" r="2.8"/><circle cx="70" cy="25" r="2.4"/><circle cx="55" cy="80" r="2.8"/><circle cx="20" cy="90" r="2.4"/><circle cx="78" cy="110" r="2"/><circle cx="30" cy="118" r="2"/></g></svg>`,
    rayos: `<svg class="bgsvg bolt" viewBox="0 0 90 130"><path d="M52 6 L30 62 H48 L36 124 L68 52 H48 Z" fill="currentColor"/></svg>`, universo: `<span class="stars"></span><span class="planet"></span>`, solid: `<span class="bgsolid"></span><span class="fig big dark"></span>`,
  };
  function demoHtml(key, o) {
    o = o || {}; const [kind, ...rest] = String(key || "").split("-"), name = rest.join("-"), mini = o.mini ? " mini" : "";
    if (kind === "t") return `<div class="xd xd-text${mini}" data-d="${esc(name)}" aria-hidden="true"><div class="xd-bg"></div><p class="xd-line">${words(LINE)}</p></div>`;
    if (kind === "x") return `<div class="xd xd-tr${mini}" data-d="${esc(name)}" aria-hidden="true"><div class="xd-a"><i>ESCENA A</i></div><div class="xd-b"><i>ESCENA B</i></div><div class="xd-fx"></div></div>`;
    if (kind === "s") return `<div class="xd xd-snd${mini}">${o.mini ? `<span class="xd-play">${icon("play")}</span>` : `<button class="xd-play" type="button" data-act="libsound" data-n="${esc(name)}" aria-label="Escuchar">${icon("play")}</button>`}<div class="xd-wave" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--h:${20 + ((i * 37) % 70)}%"></i>`).join("")}</div></div>`;
    if (kind === "e") return `<div class="xd xd-mock${mini}" data-m="${esc(name)}" aria-hidden="true"><div class="xd-bg"></div>${STYLE_MOCK[name] || STYLE_MOCK["palabra-ancla"]}</div>`;
    if (kind === "tx") return `<div class="xd xd-mock tx${mini}" data-m="${esc(name)}" aria-hidden="true"><div class="xd-bg"></div>${TXT_MOCK[name] || TXT_MOCK.titulo}</div>`;
    if (kind === "bg") return `<div class="xd xd-mock bg${mini}" data-m="${esc(name)}" aria-hidden="true">${BG_MOCK[name] || BG_MOCK.original}</div>`;
    if (kind === "sub") return `<div class="xd xd-mock sub${mini}" data-m="${esc(name)}" aria-hidden="true"><div class="xd-bg"></div><div class="sub-line">${name === "pequena" ? "" : ""}<span>so</span> <span class="k">this</span> <span>is</span></div></div>`;
    if (kind === "r") return App.recipeMini ? App.recipeMini(name, o) : `<div class="xd xd-mock${mini}"><div class="xd-bg"></div></div>`;
    if (kind === "v") return `<div class="xd xd-vid${mini}"><video src="${esc(App.adapter().assetUrl(name))}" controls loop muted playsinline preload="metadata"></video></div>`;
    return `<div class="xd xd-mock${mini}"><div class="xd-bg"></div>${icon("link")}</div>`;
  }
  App.demoHtml = demoHtml;
  function sound(name) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try {
      audio = audio || new AC(); if (audio.state === "suspended") audio.resume(); const ctx = audio, t = ctx.currentTime;
      const tone = (type, f0, f1, dur, vol) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02); };
      const noise = (dur, vol, f0, f1) => { const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = buf; f.type = "bandpass"; f.Q.value = 1.1; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f).connect(g).connect(ctx.destination); s.start(t); };
      if (name === "click") { tone("square", 2200, 700, 0.05, 0.12); noise(0.04, 0.2, 3000, 3000); } else if (name === "whoosh") noise(0.55, 0.55, 250, 5000);
      else if (name === "impact") { tone("sine", 140, 38, 0.55, 0.9); noise(0.18, 0.45, 900, 150); } else if (name === "pop") tone("sine", 420, 1100, 0.12, 0.45); else if (name === "ding") { tone("sine", 1318, 0, 0.9, 0.3); tone("sine", 1975, 0, 0.7, 0.14); }
    } catch (e) { /* sin audio en esta vista */ }
  }
  App.playSound = sound;

  // ---------- vista ----------
  const typeOf = (r) => (App.lib.TYPES.some((t) => t[0] === r.args[0]) ? r.args[0] : "todo");
  const SRC_LABEL = { estudio: "Del Estudio", laboratorio: "Aprobado en el Laboratorio", propio: "Propio", referencia: "Referencia" };
  function card(it) {
    return `<div class="lib-card lg" role="button" tabindex="0" data-act="libopen" data-id="${esc(it.id)}" aria-label="${esc(it.name)}"><div class="lib-demo">${demoHtml(it.demo)}</div><div class="lib-meta"><b>${esc(it.name)}</b><small>${esc(it.desc || SRC_LABEL[it.source] || "")}</small></div><span class="chip lib-src">${esc(SRC_LABEL[it.source] || "")}</span></div>`;
  }
  App.views.biblioteca = {
    title: "Biblioteca",
    render(r) {
      const type = typeOf(r), q = norm(UI.libq || ""), all = App.lib.catalog(), counts = {}; all.forEach((i) => { counts[i.type] = (counts[i.type] || 0) + 1; });
      let items = all.filter((i) => (type === "todo" || i.type === type) && (!q || norm(i.name + " " + i.desc + " " + i.when).includes(q)));
      const chips = App.lib.TYPES.map(([k, n, ic]) => `<button class="chip fil ${k === type ? "on" : ""}" type="button" role="tab" aria-selected="${k === type}" data-act="libtype" data-k="${k}">${icon(ic)}${n}<b>${k === "todo" ? all.length : counts[k] || 0}</b></button>`).join("");
      return `<div class="vhead"><div class="t"><span class="eyebrow">${esc(App.config.name)}</span><h1 class="h-l">Todo lo que ya <em>aprobaste</em></h1><p class="muted">Estilos, transiciones, textos, fondos, subtítulos y sonidos listos para usar en un video nuevo o en el Estudio.</p></div>
        <div class="r"><label class="searchbox lg">${icon("search")}<input id="libq" type="search" placeholder="Buscar en la Biblioteca" value="${esc(UI.libq || "")}" aria-label="Buscar en la Biblioteca"></label></div></div>
        <div class="filters" role="tablist">${chips}</div>
        ${items.length ? `<div class="lib-grid rise" id="libgrid">${items.map(card).join("")}</div>` : `<div class="empty card lg"><span class="orb"></span><h3>${q ? "Nada coincide con tu búsqueda" : "Todavía no hay nada aquí"}</h3><p>${q ? "Prueba con otra palabra." : "Cuando apruebes estilos en el Laboratorio, aparecen aquí solos."}</p><a class="btn pri" href="#laboratorio">Ir al Laboratorio</a></div>`}`;
    },
    bind(root) {
      const q = $("#libq", root); if (q) q.addEventListener("input", App.debounce(() => { UI.libq = q.value; App.render(true); const n = $("#libq"); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 220));
      observe(root);
    },
    update() { return false; },
  };
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  function observe(root) {
    if (!("IntersectionObserver" in window)) { $$(".xd", root).forEach((e) => e.classList.add("live")); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle("live", e.isIntersecting)), { rootMargin: "80px" });
    $$(".xd", root).forEach((e) => io.observe(e));
  }
  App.observeDemos = observe;

  // ---------- ficha ----------
  const A = App.acts;
  A.libtype = (el) => App.go("biblioteca" + (el.dataset.k === "todo" ? "" : "/" + el.dataset.k));
  A.libsound = (el, e) => { e.stopPropagation(); sound(el.dataset.n); el.classList.add("on"); setTimeout(() => el.classList.remove("on"), 600); };
  A.libopen = (el) => {
    const it = App.lib.catalog().find((x) => x.id === el.dataset.id); if (!it) return;
    const rules = it.studioId && window.StudioLib && StudioLib.ESTILOS[it.studioId] ? (StudioLib.ESTILOS[it.studioId].kinds || []) : [];
    const m = App.modal(`<div class="ficha"><div class="fdemo">${demoHtml(it.demo)}</div><div class="fbody"><span class="eyebrow">${esc((App.lib.TYPES.find((t) => t[0] === it.type) || [0, it.type])[1])} · ${esc(SRC_LABEL[it.source] || "")}</span><h3>${esc(it.name)}</h3><p class="muted">${esc(it.desc || "")}</p>
      ${it.when ? `<div class="when"><b>Cuándo usarlo</b><p>${esc(it.when)}</p></div>` : ""}${it.ref && it.ref.url ? `<p><a class="btn sm" href="${esc(it.ref.url)}" target="_blank" rel="noopener">${icon("out")}Abrir el link</a></p>` : ""}
      <div class="acts"><button class="btn ghost" data-close type="button">Cerrar</button>${it.type === "referencias" ? "" : `<button class="btn" type="button" data-act="libstudio" data-id="${esc(it.id)}">${icon("film")}Probar en el Estudio</button><button class="btn pri" type="button" data-act="libuse" data-id="${esc(it.id)}">${icon("plus")}Usar en un video nuevo</button>`}</div></div></div>`);
    App.observeDemos(m.el); m.el.classList.add("wide");
  };
  A.libuse = (el) => { const it = App.lib.catalog().find((x) => x.id === el.dataset.id); if (!it) return; UI.draft = UI.draft || {}; UI.draft.style = it.styleId || (it.type === "estilos" ? it.id : UI.draft.style || ""); UI.draft.notes = ((UI.draft.notes || "") + (UI.draft.notes ? "\n" : "") + `Usar «${it.name}» (${it.type}).`).trim(); $$(".modal-wrap").forEach((w) => w.remove()); App.go("crear"); App.toast(`«${it.name}» agregado al pedido.`); };
  A.libstudio = (el) => { $$(".modal-wrap").forEach((w) => w.remove()); App.ui.libTry = el.dataset.id; App.go("estudio"); };
})();
