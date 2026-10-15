/* Aura · Estudio - vista general (antes "Aprobar"): el video al centro, versiones a la izquierda y a la derecha solo lo que
   hace falta para decidir: "Abrir en editor manual", el score (y "¿Por qué este score?", que solo se abre con un clic) y un chat
   minimo "¿Qué ajustarías?" (DECISIONES.md #11). Sin notas por cuadro ni subtitulos aqui: eso vive en el editor. La capsula de
   decision va abajo; atajos A/Q/R, ←/→ versiones y espacio. Todo en una sola pantalla sin recargar el video. Se entra aca desde el
   listado de Estudio; "Abrir en editor" lleva al editor completo (estudio-core.js, App.views.estudio). Ver DECISIONES.md #2. */
(function () {
  "use strict";
  const App = window.App, S = App.S, sel = App.sel, { $, $$, esc, icon, plural, ring, mmss } = App;
  let RV = null, vEl = null, raf = 0, loadTimer = 0, objUrl = "", triedBlob = false;
  // estado de lo que se esta escribiendo en el chat (sobrevive a los repintados de datos; se limpia al cambiar de video)
  let whyOpen = false, pick = new Set(), draft = "";
  const ADJ = () => [(App.config.tags && App.config.tags[0]) || "Hook", "Subtítulos", "Intro", "Video", "Animaciones", "Música", "Audio", "Otro"];
  const V = () => (RV ? sel.video(RV.id) : null);

  // ---------- predictor: traduce los "parts" crudos de scoreVideo() a categorias simples (DECISIONES.md #9) ----------
  // No toca pred.js ni la formula: solo agrupa y renombra en espanol llano lo que ya calculo scoreVideo(). El predictor
  // de hoy solo mide el texto del gancho y que tan distinta es esta version de sus hermanas -- no hay datos de iluminacion
  // o subtitulos que agrupar, asi que esas categorias no aparecen (no se inventan datos que el modelo no produce).
  const FACTOR_GROUPS = [
    { key: "claridad", title: "Claridad del mensaje" },
    { key: "evitar", title: "Qué evitar en el gancho" },
    { key: "nueva", title: "Qué tan nueva se ve esta versión" },
  ];
  const FACTOR_MAP = {
    "Largo ideal": ["claridad", "El gancho tiene el largo justo para leerse rápido."],
    "Largo justo": ["claridad", "El gancho entra en dos líneas, al límite."],
    "Muy largo": ["claridad", "El gancho es muy largo: no entra cómodo en dos líneas."],
    "Muy corto": ["claridad", "El gancho es muy corto: casi no promete nada."],
    "Palabras simples (ninguna de 11 letras o más)": ["claridad", "Usa palabras simples, fáciles de entender rápido."],
    "Rompe una creencia (no, nunca, nadie, deja de)": ["claridad", "Rompe una creencia (no, nunca, nadie), algo que suele atrapar."],
    "Pregunta directa con signo de interrogación": ["evitar", "Termina en pregunta: en los datos, eso no funcionó."],
    "Le habla al espectador con 'tú/vos/you'": ["evitar", "Le habla directo a la persona (tú/vos/you)."],
    "Nombra a Kevin Trudeau en el gancho": ["evitar", "Nombra a Kevin Trudeau en el gancho."],
    "Anuncio de evento (join, free, reto, gratis)": ["evitar", "Suena a anuncio de evento o promoción."],
    "Cliché de ley de atracción (tus palabras crean tu realidad)": ["evitar", "Usa una frase muy repetida de autoayuda."],
    "Palabra muy repetida": ["nueva", "Repite una palabra que ya usaste en muchos ganchos."],
    "Se ve distinta a las otras versiones": ["nueva", "Se ve distinta a las otras versiones de la pieza."],
    "Se parece demasiado a las otras versiones": ["nueva", "Se parece mucho a otra versión de esta pieza."],
    "Intro repetido en otra pieza": ["nueva", "Este intro ya se usó en otra pieza."],
  };
  const factorOf = (label) => {
    if (FACTOR_MAP[label]) return FACTOR_MAP[label];
    if (/^Promesa directa/.test(label)) return ["claridad", "Abre con una promesa directa."];
    if (/^Objeto o ritual concreto/.test(label)) return ["claridad", "Usa un objeto o dato bien concreto."];
    if (/^Tiempo o cifra concreta/.test(label)) return ["claridad", "Da un tiempo o una cifra concreta."];
    return ["claridad", label]; // factor nuevo sin traducir todavia: no lo escondemos, pero avisa en consola para agregarlo
  };
  function friendlyGroups(parts) {
    const byKey = {};
    parts.forEach((p) => { const [key, text] = factorOf(p.label); (byKey[key] = byKey[key] || []).push({ text, pts: p.pts }); });
    return FACTOR_GROUPS.map((g) => { const items = byKey[g.key] || []; if (!items.length) return null; return { title: g.title, net: items.reduce((a, x) => a + x.pts, 0), items }; }).filter(Boolean);
  }
  const safeSvg = () => { const P = (window.StudioModel && StudioModel.SAFE) || [[91, 237], [990, 237], [990, 997], [899, 997], [899, 1650], [366, 1650], [366, 1479], [91, 1479]]; return `<svg class="safe" viewBox="0 0 1080 1920" preserveAspectRatio="none" aria-hidden="true"><path fill-rule="evenodd" d="M0 0H1080V1920H0Z M${P.map((p) => p.join(" ")).join(" L")}Z" fill="rgba(0,0,0,.5)"/><path d="M${P.map((p) => p.join(" ")).join(" L")}Z" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="4" stroke-dasharray="14 10"/></svg>`; };

  // ---------- esqueleto (no cambia mientras se revisa; los paneles se pintan aparte) ----------
  function skeleton(id) {
    return `<div class="rv" id="rv" data-id="${esc(id)}">
      <div class="rv-top"><button class="iconbtn" type="button" data-act="rvback" aria-label="Volver a la lista">${icon("chevleft")}</button><div class="rv-prog"><div class="bar" id="rvbar" style="--p:0%"><i></i></div><span id="rvprogtxt" class="muted"></span></div><div class="rv-nav"><button class="iconbtn" type="button" data-act="rvpiece" data-d="-1" aria-label="Pieza anterior">${icon("chevup")}</button><button class="iconbtn" type="button" data-act="rvpiece" data-d="1" aria-label="Pieza siguiente">${icon("chevdown")}</button></div></div>
      <div class="rv-grid"><aside class="rv-left" id="rvleft" aria-label="Versiones"></aside>
        <section class="rv-center" aria-label="Video"><div class="glow" aria-hidden="true"></div>
          <div class="frame lg" data-shared-target><div class="screen" id="rvscreen"><div class="still" id="rvstill"></div><video id="rvvideo" playsinline preload="auto" loop></video><div class="ov" id="rvov"></div><div class="vmsg" id="rvmsg" hidden></div><div class="safewrap" id="rvsafe" hidden>${safeSvg()}</div><button class="playhit" type="button" data-act="rvplay" aria-label="Reproducir o pausar"></button></div>
            <div class="ctrl"><button class="iconbtn sm" type="button" data-act="rvplay" id="rvplaybtn" aria-label="Reproducir">${icon("play")}</button><div class="scrub" id="rvscrub" role="slider" aria-label="Posición del video" tabindex="0"><i class="fill" id="rvfill"></i><span id="rvmarks"></span><b class="knob" id="rvknob"></b></div><span class="tc num" id="rvtc">0:00</span></div></div>
          <div class="rv-tools"><button class="chip" type="button" data-act="rvsafe" id="rvsafebtn" aria-pressed="false">${icon("frame")}Zona segura</button><button class="chip" type="button" data-act="rvmute" id="rvmutebtn" aria-pressed="false">${icon("volume")}Sonido</button><a class="chip" id="rvstudio" href="#estudio">${icon("film")}Abrir en editor</a></div></section>
        <aside class="rv-right" id="rvright" aria-label="Análisis"></aside></div></div>`;
  }

  // ---------- pintar paneles ----------
  function paintLeft() {
    const v = V(); if (!v) return; const sibs = sel.siblings(v);
    const g = sel.groupByPiece(sel.pending(v.brand).concat([v]).filter((x, i, a) => a.indexOf(x) === i));
    $("#rvleft").innerHTML = `<p class="eyebrow">${esc(v.pieceName || v.piece)}</p><div class="vbs">${sibs.map((x) => {
      const r = App.pred.scoreVideo(x), st = x.status === "approved" ? "approved" : x.status === "rejected" ? "rejected" : x.status === "maybe" ? "maybe" : "", col = r ? App.pred.TIER_COLOR[r.tier] : "var(--ink3)";
      return `<button type="button" class="vb lg ${x.id === v.id ? "on" : ""} ${st}" data-act="rvver" data-id="${esc(x.id)}" aria-label="${esc(sel.label(x))}">${ring(r ? r.score / 100 : 0, 58, { r: 40, sw: 8, color: col, inner: `<b style="font:600 16px/1">${r ? r.score : "–"}</b>` })}<span><b>v${x.version}</b><small>${st === "approved" ? "Aprobada" : st === "rejected" ? "Rechazada" : st === "maybe" ? "Quizás" : x.fx ? esc(App.pred.FX_NAMES[x.fx] || x.fx) : "Por decidir"}</small></span></button>`; }).join("")}</div>
      <p class="muted vhook">${esc(v.hook || "")}</p>`;
  }
  function paintRight() {
    const v = V(); if (!v) return; const r = App.pred.scoreVideo(v);
    // lo unico que se ve por default: el boton del editor, el score y el chat. Las razones detras de "¿Por qué este score?" (DECISIONES.md #9/#11)
    const groups = r ? friendlyGroups(r.parts) : [];
    const why = groups.map((g) => { const dn = Math.round(g.net), sign = dn > 0 ? "+" : dn < 0 ? "−" : "±"; return `<li data-k="${g.net >= 0 ? "pos" : "neg"}"><i>${g.net >= 0 ? "✓" : "!"}</i><div><b>${esc(g.title)}</b><small>${g.items.map((x) => esc(x.text)).join(" ")}</small></div><span>${sign}${Math.abs(dn)}</span></li>`; }).join("");
    const fixes = r && (r.fb.length || r.fbClaude.length) ? `<div class="fixes"><b>${r.fb.length ? "Cómo mejorarlo" : "Esto lo ajusta Claude solo"}</b><ul>${(r.fb.length ? r.fb : r.fbClaude).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : "";
    const lines = (v.feedback || "").split(/\n+/).filter(Boolean), tg = v.tags || [];
    const thread = lines.length ? `<div class="rvthread">${lines.map((t, i) => `<div class="rvme">${i === 0 && tg.length ? `<small>${tg.map(esc).join(" · ")}</small>` : ""}<p>${esc(t)}</p></div>`).join("")}<p class="rvack">${v.feedbackDirty ? App.say("Anotado. Se lo paso a Claude con «Enviar cambios».", "Anotado. Se lo paso a Claude con «Enviar cambios».") : "Enviado a Claude."}</p></div>` : "";
    $("#rvright").innerHTML = `<a class="btn rvmanual" id="rvmanual" href="#estudio/editor/${encodeURIComponent(v.id)}">${icon("film")}Abrir en editor manual</a>
      ${r ? `<section class="rvscore"><div class="rvring" aria-label="Score ${r.score} de 100">${ring(r.score / 100, 132, { r: 44, sw: 7, color: App.pred.TIER_COLOR[r.tier], inner: `<b class="num rvn">${r.score}</b>` })}</div>
        ${why || fixes ? `<button class="rvwhy" type="button" data-act="rvwhy" aria-expanded="${whyOpen}" aria-controls="rvwhybox">¿Por qué este score?${icon("chevdown")}</button>
        <div class="rvwhybox${whyOpen ? " open" : ""}" id="rvwhybox"><div class="rvwhyin"><ul class="why">${why}</ul>${fixes}</div></div>` : ""}</section>` : ""}
      <section class="rvchat" aria-label="Pedir ajustes"><h4 class="rvq">¿Qué ajustarías?</h4>
        <div class="tags" role="group" aria-label="Qué ajustarías">${ADJ().map((t) => `<button type="button" class="chip tg" data-act="rvadj" data-t="${esc(t)}" aria-pressed="${pick.has(t)}">${esc(t)}</button>`).join("")}</div>
        ${thread}
        <form class="rvcomp" id="rvchat"><textarea id="rvfb" rows="2" maxlength="2000" aria-label="Detalles del ajuste" placeholder="${esc(App.say("Contame los detalles", "Cuéntame los detalles"))}">${esc(draft)}</textarea><button class="rvsend" type="submit" aria-label="Enviar ajuste">${icon("arrow")}</button></form></section>`;
    paintMarks();
  }
  // ---------- subtitulos por palabra (misma logica que el portal) ----------
  // el texto del video (gancho y palabras de subtitulos) se pinta sobre el video; el estilo por palabra se edita en el editor
  const capStyle = (v, i) => { const s = v.wordStyles && v.wordStyles[i]; return s && (s.font || s.color) ? s : null; };
  function capEff(v, i) { const st = capStyle(v, i), c = v.caps[i]; return { font: (st && st.font) || (c[3] ? "aston" : c[4] ? "cursive" : "normal"), color: (st && st.color) || "" }; }
  function paintMarks() {
    const m = $("#rvmarks"), v = V(); if (!m || !v) return; const d = (vEl && vEl.duration) || v.duration || 0;
    m.innerHTML = d ? sel.notesOf(v).map((n) => `<i class="mk" style="left:${Math.min(100, ((n.t || 0) / d) * 100)}%" title="${esc(n.text)}"></i>`).join("") : "";
  }
  function paintDecide() {
    const v = V(); if (!v) return; const st = v.status;
    $("#rvdecide").innerHTML = `<button class="btn lg2 bad" type="button" data-act="rvdecide" data-st="rejected">${icon("x")}Rechazar<kbd>R</kbd></button><button class="btn lg2 mid" type="button" data-act="rvdecide" data-st="maybe">${icon("help")}Quizás<kbd>Q</kbd></button><button class="btn lg2 pri" type="button" data-act="rvdecide" data-st="approved">${icon("check")}${st === "approved" ? "Aprobada" : "Aprobar v" + v.version}<kbd>A</kbd></button>`;
  }
  function paintProgress() {
    const total = Math.max(RV.total, sel.allPending().length + RV.done), done = RV.done;
    $("#rvbar").style.setProperty("--p", Math.round((total ? done / total : 0) * 100) + "%");
    const groups = sel.groupByPiece(sel.pending(V().brand)), idx = groups.findIndex((g) => g.piece === V().piece);
    $("#rvprogtxt").textContent = `${done} de ${total} ${plural(total, "video decidido", "videos decididos")}${idx >= 0 ? " · pieza " + (idx + 1) + " de " + groups.length : ""}`;
  }
  function paintOverlay() {
    const v = V(), ov = $("#rvov"); if (!v || !ov) return; const t = vEl ? vEl.currentTime : 0;
    let html = "";
    if (t < 3.6 && v.hook) html = `<div class="hookcap">${App.capHtml(v.hook, 12)}</div>`;
    else if (v.caps && v.caps.length) { const f = Math.floor(t * (v.capFps || 30)); const i = v.caps.findIndex((c) => f >= c[1] && f < c[2]); if (i >= 0) { const e = capEff(v, i); html = `<div class="wordcap ${e.font}"${e.color ? ` style="color:${esc(e.color)}"` : ""}>${esc(v.caps[i][0])}</div>`; } }
    ov.innerHTML = html;
  }
  function paintAll() { paintLeft(); paintRight(); paintDecide(); paintProgress(); const v = V(); if (v) { const a = $("#rvstudio"); if (a) a.href = "#estudio/editor/" + encodeURIComponent(v.id); } }

  // ---------- video ----------
  const vmsg = (h) => { const m = $("#rvmsg"); if (m) { m.hidden = !h; m.innerHTML = h || ""; } };
  function loadVideo() {
    const v = V(); if (!v || !vEl) return; clearTimeout(loadTimer); triedBlob = false; if (objUrl) { URL.revokeObjectURL(objUrl); objUrl = ""; }
    const still = $("#rvstill"), poster = v.posterData || v.poster; still.innerHTML = poster && /^(data:|https?:|\/)/.test(poster) ? `<img src="${esc(poster)}" alt="">` : App.still(v.tone || App.toneOf(v.piece || v.id), App.hash(v.id) % 2 ? "r" : "l");
    vEl.style.opacity = 0; const src = sel.src(v);
    if (!src) { vmsg(""); return; }
    vmsg("Cargando el video…"); vEl.src = src; vEl.load(); loadTimer = setTimeout(() => { if (vEl.readyState < 1) blobFallback(v, "sin respuesta en 7 s"); }, 7000);
  }
  async function blobFallback(v, why) {
    if (triedBlob) { vmsg(`<b>No se pudo reproducir este video.</b><span>${esc(why)}</span>`); return; } triedBlob = true; vmsg("Cargando el video de otra forma…");
    try { const r = await fetch(sel.src(v)); if (!r.ok) throw new Error("HTTP " + r.status); const b = await r.blob(); objUrl = URL.createObjectURL(new Blob([b], { type: "video/mp4" })); vEl.src = objUrl; vEl.load(); } catch (e) { vmsg(`<b>No se pudo reproducir este video.</b><span>${esc(String(e.message || e))}</span>`); App.data.diag("video_failed", { why, id: v.id }); }
  }
  function tick() {
    if (!vEl || !RV) return; const d = vEl.duration || 0, t = vEl.currentTime || 0;
    if (d) { const p = (t / d) * 100; $("#rvfill").style.width = p + "%"; $("#rvknob").style.left = p + "%"; }
    $("#rvtc").textContent = mmss(t) + (d ? " / " + mmss(d) : ""); 
    paintOverlay(); raf = requestAnimationFrame(tick);
  }
  function setPlaying(on) { const b = $("#rvplaybtn"); if (b) b.innerHTML = icon(on ? "pause" : "play"); const s = $("#rvscreen"); if (s) s.classList.toggle("playing", on); }
  function seek(frac) { if (vEl && vEl.duration) vEl.currentTime = Math.max(0, Math.min(vEl.duration - 0.05, frac * vEl.duration)); }

  // ---------- decisiones y avance ----------
  function nextCandidate() {
    const v = V(); const pend = sel.allPending().filter((x) => !RV.seen.has(x.id) && x.id !== v.id); if (!pend.length) return null;
    const same = pend.filter((x) => x.brand === v.brand && x.piece === v.piece).sort((a, b) => a.version - b.version); if (same.length) return (same.find((x) => x.version > v.version) || same[0]);
    const g = sel.groupByPiece(pend.filter((x) => x.brand === v.brand)); return (g[0] || sel.groupByPiece(pend)[0]).vs[0];
  }
  function decide(st) {
    const v = V(); if (!v) return; RV.seen.add(v.id); RV.counts[st] = (RV.counts[st] || 0) + 1; if (st !== "maybe" || true) RV.done++;
    App.act.setStatus(v, st); const nx = nextCandidate();
    if (nx) switchTo(nx.id); else finish();
  }
  function finish() {
    const c = RV.counts, el = $("#rv"); if (!el) return; if (vEl) vEl.pause();
    el.innerHTML = `<div class="rv-done"><span class="orb" style="width:96px;height:96px"></span><h1 class="h-xl">Todo <em>decidido</em></h1><p class="muted">${c.approved || 0} aprobadas · ${c.rejected || 0} rechazadas · ${c.maybe || 0} en duda. Claude agenda las aprobadas.</p><div class="acts"><a class="btn pri lg2" href="#hoy">Volver a Hoy</a><a class="btn lg2" href="#crear">Pedir un video</a><a class="btn lg2" href="#estudio/agendados">Ver agendados</a></div></div>`;
    App.float(""); App.morph.sparkles(el.querySelector(".orb"), 6); RV.finished = true; cancelAnimationFrame(raf);
  }
  // inEditor: el editor esta abierto encima y la persona cambio de version desde sus pestanas v1/v2/v3. La ruta sigue siendo
  // #estudio/editor/<id> (el editor se queda abierto y solo cambia de version): no se reescribe a "ver" ni se pone a sonar el
  // video de abajo. Solo se mantiene al dia la vista general, que es la pantalla a la que se vuelve al cerrar el editor.
  function switchTo(id, inEditor) {
    RV.id = id; whyOpen = false; pick = new Set(); draft = "";
    if (!inEditor) { history.replaceState(null, "", "#estudio/ver/" + encodeURIComponent(id)); App.route().args = ["ver", id]; App._reviewRoute = id; }
    const el = $("#rv"); if (el) el.dataset.id = id; if (vEl) vEl.pause(); loadVideo(); paintAll(); if (vEl && !inEditor) vEl.play().catch(() => {});
  }

  // ---------- acciones ----------
  const A = App.acts;
  A.rvback = () => App.go("estudio");
  A.rvplay = () => { if (!vEl) return; if (vEl.paused) vEl.play().catch(() => {}); else vEl.pause(); };
  A.rvsafe = (el) => { const on = el.getAttribute("aria-pressed") !== "true"; el.setAttribute("aria-pressed", on); $("#rvsafe").hidden = !on; App.store.set("safe", on); };
  A.rvmute = (el) => { const on = el.getAttribute("aria-pressed") !== "true"; el.setAttribute("aria-pressed", on); vEl.muted = on; };
  A.rvver = (el) => { if (el.dataset.id !== RV.id) switchTo(el.dataset.id); };
  A.rvdecide = (el) => decide(el.dataset.st);
  A.rvpiece = (el) => { const v = V(); const groups = sel.groupByPiece(sel.pending(v.brand).concat(sel.siblings(v).filter((x) => !sel.isPending(x)))); const i = groups.findIndex((g) => g.piece === v.piece), n = groups[(i + +el.dataset.d + groups.length) % groups.length]; if (n) switchTo(n.vs[0].id); };
  A.rvwhy = (el) => { whyOpen = !whyOpen; el.setAttribute("aria-expanded", String(whyOpen)); const b = $("#rvwhybox"); if (b) b.classList.toggle("open", whyOpen); };
  A.rvadj = (el) => { const t = el.dataset.t; pick.has(t) ? pick.delete(t) : pick.add(t); el.setAttribute("aria-pressed", String(pick.has(t))); };
  // el chat: lo que se manda queda como el cambio de esta version (feedback) y viaja con "Enviar cambios", igual que antes; cada mensaje nuevo se suma
  async function sendAdjust() {
    const v = V(), ta = $("#rvfb"); if (!v || !ta) return; const text = ta.value.trim(), tags = [...pick];
    if (!text && !tags.length) { ta.focus(); return; }
    const line = text || "Ajustar: " + tags.join(", ") + ".", prev = (v.feedback || "").trim();
    pick = new Set(); draft = "";
    await App.act.setFeedback(v, prev ? prev + "\n" + line : line, Array.from(new Set((v.tags || []).concat(tags))));
    App.updateSendBar(); paintRight(); const nt = $("#rvfb"); if (nt) nt.focus();
  }

  // ---------- montaje ----------
  App.reviewView = {
    render(r) { return skeleton(r.args[1] || ""); },
    bind(root, r) {
      const id = r.args[1] || "", v = sel.video(id);
      if (!v) { root.innerHTML = `<div class="empty card lg"><span class="orb"></span><h3>No encuentro ese video</h3><a class="btn pri" href="#estudio">Volver a la lista</a></div>`; return; }
      if (v.brand !== App.ui.brandId) sel.setBrand(v.brand);
      App.float('<div class="capsule lg" id="rvdecide" role="group" aria-label="Decisión"></div>');
      cancelAnimationFrame(raf); whyOpen = false; pick = new Set(); draft = ""; RV = { id, seen: new Set(), counts: {}, done: 0, total: sel.allPending().length }; vEl = $("#rvvideo", root);
      vEl.muted = false; vEl.addEventListener("play", () => setPlaying(true)); vEl.addEventListener("pause", () => setPlaying(false));
      vEl.addEventListener("loadeddata", () => { clearTimeout(loadTimer); vmsg(""); vEl.style.opacity = 1; paintMarks(); });
      vEl.addEventListener("error", () => { if (vEl.getAttribute("src")) blobFallback(V(), "error " + (vEl.error ? vEl.error.code : "?")); });
      const sc = $("#rvscrub", root); let drag = false; const at = (e) => { const b = sc.getBoundingClientRect(); seek(Math.max(0, Math.min(1, (e.clientX - b.left) / b.width))); };
      sc.addEventListener("pointerdown", (e) => { drag = true; sc.setPointerCapture(e.pointerId); at(e); }); sc.addEventListener("pointermove", (e) => { if (drag) at(e); }); sc.addEventListener("pointerup", () => { drag = false; });
      sc.addEventListener("keydown", (e) => { if (e.key === "ArrowRight" && e.shiftKey) vEl.currentTime += 1; });
      root.addEventListener("input", (e) => { if (e.target.id === "rvfb") draft = e.target.value; });
      root.addEventListener("keydown", (e) => { if (e.target.id === "rvfb" && e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendAdjust(); } });
      root.addEventListener("submit", (e) => { if (e.target.id !== "rvchat") return; e.preventDefault(); sendAdjust(); });
      if (App.store.get("safe", false)) { $("#rvsafebtn").setAttribute("aria-pressed", "true"); $("#rvsafe").hidden = false; }
      loadVideo(); paintAll(); raf = requestAnimationFrame(tick); vEl.play().catch(() => {});
    },
    // un cambio de ruta dentro de la revision (otra version) no reconstruye la pantalla
    routeChanged(r) {
      if (r.name !== "estudio" || (r.args[0] !== "ver" && r.args[0] !== "editor") || !RV || RV.finished || !$("#rv")) return false;
      const id = r.args[1] || ""; if (id === RV.id) return true; if (sel.video(id)) { switchTo(id, r.args[0] === "editor"); return true; } return false;
    },
    update(kinds) {
      if (!RV || !$("#rv") || RV.finished) return false;
      if (!sel.video(RV.id)) return false;
      const ae = document.activeElement; if (ae && ae.id === "rvfb") { paintLeft(); paintDecide(); paintProgress(); return true; } // escribiendo en el chat: no se le repinta el campo debajo
      paintAll(); return true;
    },
    key(e) {
      if (!RV || RV.finished) { if (e.key === "Escape") App.go("estudio"); return; }
      const k = e.key.toLowerCase();
      if (k === "a") decide("approved"); else if (k === "q") decide("maybe"); else if (k === "r") decide("rejected");
      else if (k === " ") { e.preventDefault(); A.rvplay(); }
      else if (k === "arrowright" || k === "arrowleft") { const v = V(), sibs = sel.siblings(v), i = sibs.findIndex((x) => x.id === v.id), n = sibs[(i + (k === "arrowright" ? 1 : -1) + sibs.length) % sibs.length]; if (n && n.id !== v.id) switchTo(n.id); }
      else if (k === "," || k === ".") { vEl.pause(); vEl.currentTime += (k === "." ? 1 : -1) / 30; }
      else if (k === "escape") App.go("estudio");
    },
    teardown() { cancelAnimationFrame(raf); if (vEl) { try { vEl.pause(); } catch (x) { /* ya cerrado */ } } RV = null; },
  };
  // El dispatcher de la pantalla (listado / vista general / editor) vive en App.views.estudio, ver estudio-core.js --
  // "Aprobar" ya no es una vista propia (DECISIONES.md #2): esto solo expone App.reviewView para que ese dispatcher lo use.
})();
