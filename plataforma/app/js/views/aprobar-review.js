/* Aura · Aprobar (revision): el video al centro, versiones a la izquierda, Jarvis y el predictor a la derecha, y la capsula de decision abajo.
   Notas por cuadro, zona segura, subtitulos por palabra, atajos A/Q/R, ←/→ versiones, espacio, N. Todo en una sola pantalla sin recargar el video. */
(function () {
  "use strict";
  const App = window.App, S = App.S, sel = App.sel, { $, $$, esc, icon, plural, ring, mmss } = App;
  let RV = null, vEl = null, raf = 0, loadTimer = 0, objUrl = "", triedBlob = false;
  const CAP_FONTS = [["aston", "Aston (especial)"], ["normal", "Normal"], ["cursive", "Cursiva"]];
  const CAP_COLORS = [["#FFFFFF", "Blanco"], ["#FFD84D", "Amarillo"], ["#4FD8FF", "Cian"], ["#5DFFB8", "Verde"], ["#FF6A5E", "Rojo"], ["#FFB54A", "Naranja"]];
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
          <div class="rv-tools"><button class="chip" type="button" data-act="rvsafe" id="rvsafebtn" aria-pressed="false">${icon("frame")}Zona segura</button><button class="chip" type="button" data-act="rvmute" id="rvmutebtn" aria-pressed="false">${icon("volume")}Sonido</button><a class="chip" id="rvstudio" href="#estudio">${icon("film")}Abrir en el Estudio</a></div></section>
        <aside class="rv-right" id="rvright" aria-label="Análisis"></aside></div></div>`;
  }

  // ---------- pintar paneles ----------
  function opinion(v, sibs) {
    const sc = sibs.map((x) => [x, App.pred.scoreVideo(x)]).filter((x) => x[1]);
    if (!App.pred.enabled()) return `Revisa el gancho, el audio y los subtítulos. Anota en el cuadro exacto lo que quieras cambiar y se lo paso a Claude con <b>Enviar cambios</b>.`;
    if (!sc.length) return "Este gancho todavía no tiene puntaje.";
    const mine = sc.find((x) => x[0].id === v.id), best = sc.slice().sort((a, b) => b[1].score - a[1].score)[0], worst = sc.slice().sort((a, b) => a[1].score - b[1].score)[0];
    if (!mine) return "Este gancho todavía no tiene puntaje.";
    if (best[0].id === v.id) return `<b>v${v.version} puede ser la mejor de la pieza</b>${sc.length > 1 ? ` (${mine[1].score}, contra ${worst[1].score} de v${worst[0].version})` : ""}. ${mine[1].tier === "green" ? "Se parece a lo que sí funcionó." : "Aun así tiene margen: mira los factores."}`;
    return `<b>v${v.version} sale en ${mine[1].score}</b>; v${best[0].version} lidera con ${best[1].score}. ${mine[1].fb.length ? "Lo que más ayudaría: " + esc(mine[1].fb[0]) : mine[1].fbClaude.length ? "Claude puede ajustarlo solo." : ""}`;
  }
  function paintLeft() {
    const v = V(); if (!v) return; const sibs = sel.siblings(v);
    const g = sel.groupByPiece(sel.pending(v.brand).concat([v]).filter((x, i, a) => a.indexOf(x) === i));
    $("#rvleft").innerHTML = `<p class="eyebrow">${esc(v.pieceName || v.piece)}</p><div class="vbs">${sibs.map((x) => {
      const r = App.pred.scoreVideo(x), st = x.status === "approved" ? "approved" : x.status === "rejected" ? "rejected" : x.status === "maybe" ? "maybe" : "", col = r ? App.pred.TIER_COLOR[r.tier] : "var(--ink3)";
      return `<button type="button" class="vb lg ${x.id === v.id ? "on" : ""} ${st}" data-act="rvver" data-id="${esc(x.id)}" aria-label="${esc(sel.label(x))}">${ring(r ? r.score / 100 : 0, 58, { r: 40, sw: 8, color: col, inner: `<b style="font:600 16px/1">${r ? r.score : "–"}</b>` })}<span><b>v${x.version}</b><small>${st === "approved" ? "Aprobada" : st === "rejected" ? "Rechazada" : st === "maybe" ? "Quizás" : x.fx ? esc(App.pred.FX_NAMES[x.fx] || x.fx) : "Por decidir"}</small></span></button>`; }).join("")}</div>
      <p class="muted vhook">${esc(v.hook || "")}</p>`;
  }
  function paintRight() {
    const v = V(); if (!v) return; const sibs = sel.siblings(v), r = App.pred.scoreVideo(v), notes = sel.notesOf(v);
    // circulo del score: unico visible por default. Los factores van agrupados en espanol llano detras de "¿Por qué este score?" (DECISIONES.md #9)
    const groups = r ? friendlyGroups(r.parts) : [];
    const groupsHtml = groups.map((g) => { const dn = Math.round(g.net), sign = dn > 0 ? "+" : dn < 0 ? "−" : "±"; return `<li data-k="${g.net >= 0 ? "pos" : "neg"}"><i>${g.net >= 0 ? "✓" : "!"}</i><div><b>${esc(g.title)}</b><small>${g.items.map((x) => esc(x.text)).join(" ")}</small></div><span>${sign}${Math.abs(dn)}</span></li>`; }).join("");
    const fix = r && (r.fb.length || r.fbClaude.length) ? `<div class="fixes"><b>${r.fb.length ? "Lo que puedes hacer" : "Lo ajusta Claude solo"}</b><ul>${(r.fb.length ? r.fb : r.fbClaude).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : "";
    const tags = App.config.tags.map((t) => `<button type="button" class="chip tg" data-act="rvtag" data-t="${esc(t)}" aria-pressed="${(v.tags || []).includes(t)}">${esc(t)}</button>`).join("");
    const noteRows = notes.map((n) => `<li class="${sel.closedNote(n) ? "done" : ""}"><button class="chip tcb" type="button" data-act="rvseek" data-t="${n.t || 0}">${esc(n.tc || mmss(n.t))}</button><span>${esc(n.text)}</span>${n.sent === false ? `<button class="x" type="button" data-act="rvnotedel" data-id="${esc(n.id)}" aria-label="Borrar nota">${icon("x")}</button>` : `<em class="chip ${sel.closedNote(n) ? "good" : ""}">${sel.closedNote(n) ? "Resuelta" : "Enviada"}</em>`}</li>`).join("");
    $("#rvright").innerHTML = `<div class="say"><div class="who"><span class="orb"></span><b>Jarvis</b></div><div class="msg lg">${opinion(v, sibs)}</div></div>
      ${r ? `<section class="factors"><div class="fh">${ring(r.score / 100, 64, { r: 40, sw: 8, color: App.pred.TIER_COLOR[r.tier], inner: `<b class="num" style="font:500 20px/1">${r.score}</b>` })}<div><b>${esc(App.pred.TIER_TXT[r.tier])}</b><small class="muted">Aprox. ${r.prob}% de chance de pasar ${App.config.viralThreshold} vistas</small></div></div>${groupsHtml || fix ? `<details class="why-toggle"><summary>¿Por qué este score?</summary><ul class="why">${groupsHtml}</ul>${fix}</details>` : ""}</section>` : ""}
      <section class="fb"><h4>Qué falla</h4><div class="tags">${tags}</div>
        <div class="field"><label for="rvfb">Cambio para esta versión</label><textarea id="rvfb" rows="2" maxlength="2000" placeholder="${esc(App.say("Qué querés que cambie. Queda guardado y se envía con Enviar cambios.", "Qué quieres que cambie. Queda guardado y se envía con Enviar cambios."))}">${esc(v.feedback || "")}</textarea><span class="hint" id="rvfbstat">${v.feedbackDirty ? "Guardado. Se envía con Enviar cambios." : ""}</span></div></section>
      <section class="notes"><h4>Notas por cuadro <small id="rvnotet">en <b class="num">${mmss(vEl ? vEl.currentTime : 0)}</b></small></h4>
        <form class="noteform" id="rvnoteform"><input id="rvnote" type="text" maxlength="600" placeholder="Anota en este cuadro (N)" autocomplete="off"><button class="btn sm pri" type="submit">Anotar</button></form>
        ${noteRows ? `<ul class="nl">${noteRows}</ul>` : '<p class="hint">Pausa en el momento exacto y escribe qué cambiar.</p>'}</section>
      <div id="rvcaps"></div>`;
    paintCaps(); paintMarks();
  }
  // ---------- subtitulos por palabra (misma logica que el portal) ----------
  const capSel = new Set();
  const capAllOn = () => App.store.get("cap-all", true) !== false;
  const capStyle = (v, i) => { const s = v.wordStyles && v.wordStyles[i]; return s && (s.font || s.color) ? s : null; };
  function capEff(v, i) { const st = capStyle(v, i), c = v.caps[i]; return { font: (st && st.font) || (c[3] ? "aston" : c[4] ? "cursive" : "normal"), color: (st && st.color) || "" }; }
  function paintCaps() {
    const host = $("#rvcaps"), v = V(); if (!host || !v) return;
    if (!v.caps || !v.caps.length) { host.innerHTML = `<section class="caps"><h4>Subtítulos</h4><p class="hint">La transcripción se carga cuando Claude rehace el video.</p></section>`; return; }
    const changed = v.wordStyles ? Object.values(v.wordStyles).filter((s) => s && (s.font || s.color)).length : 0;
    const words = v.caps.map((c, i) => { const e = capEff(v, i); return `<button type="button" class="cw ${e.font}${capSel.has(i) ? " sel" : ""}" data-act="rvcw" data-i="${i}"${e.color ? ` style="color:${esc(e.color)}"` : ""}>${esc(c[0])}</button>`; }).join(" ");
    const bar = capSel.size ? `<div class="capbar"><b>${capSel.size} ${plural(capSel.size, "palabra elegida", "palabras elegidas")}</b><div class="capg">${CAP_FONTS.map(([k, t]) => `<button class="chip" type="button" data-act="rvcapfont" data-k="${k}">${t}</button>`).join("")}</div><div class="capg">${CAP_COLORS.map(([h, t]) => `<button class="cwatch" type="button" data-act="rvcapcolor" data-h="${h}" style="background:${h}" aria-label="${t}"></button>`).join("")}<button class="chip" type="button" data-act="rvcapcolor" data-h="">Sin color</button></div><div class="capg"><button class="chip" type="button" data-act="rvcapreset">Quitar estilo</button><button class="chip" type="button" data-act="rvcapclear">Soltar</button></div></div>` : `<p class="hint">Toca palabras para elegirlas y darles fuente o color. Las Aston son las especiales.</p>`;
    host.innerHTML = `<section class="caps"><h4>Subtítulos <small>${changed ? changed + " " + plural(changed, "cambio", "cambios") + (v.wordStylesDirty ? ", sin enviar" : "") : ""}</small></h4>${bar}<div class="cws">${words}</div><label class="capall"><input type="checkbox" id="capall" ${capAllOn() ? "checked" : ""}> Aplicar a todas las versiones de esta pieza</label></section>`;
  }
  async function capApply(patch, reset) {
    const v = V(); if (!v || !v.caps || !capSel.size) return; const next = { ...(v.wordStyles || {}) };
    capSel.forEach((i) => { const cur = reset ? {} : { ...(next[i] || {}), ...patch }; Object.keys(cur).forEach((k) => { if (!cur[k]) delete cur[k]; }); next[i] = cur; });
    const targets = capAllOn() ? sel.siblings(v).filter((x) => !x.published && x.caps && x.caps.length === v.caps.length) : [v];
    await Promise.all(targets.map((x) => App.data.patchVideo(x, { wordStyles: next, wordStylesDirty: true }, true))); paintCaps(); App.updateSendBar(); paintOverlay();
  }
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
  function paintAll() { paintLeft(); paintRight(); paintDecide(); paintProgress(); const v = V(); if (v) { const a = $("#rvstudio"); if (a) a.href = "#estudio/" + encodeURIComponent(v.id); } }

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
    $("#rvtc").textContent = mmss(t) + (d ? " / " + mmss(d) : ""); const nt = $("#rvnotet b"); if (nt) nt.textContent = mmss(t);
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
    el.innerHTML = `<div class="rv-done"><span class="orb" style="width:96px;height:96px"></span><h1 class="h-xl">Todo <em>decidido</em></h1><p class="muted">${c.approved || 0} aprobadas · ${c.rejected || 0} rechazadas · ${c.maybe || 0} en duda. Claude agenda las aprobadas.</p><div class="acts"><a class="btn pri lg2" href="#hoy">Volver a Hoy</a><a class="btn lg2" href="#crear">Pedir un video</a><a class="btn lg2" href="#aprobar/agendados">Ver agendados</a></div></div>`;
    App.float(""); App.morph.sparkles(el.querySelector(".orb"), 6); RV.finished = true; cancelAnimationFrame(raf);
  }
  function switchTo(id) {
    RV.id = id; history.replaceState(null, "", "#aprobar/ver/" + encodeURIComponent(id)); App.route().args = ["ver", id]; App._reviewRoute = id; capSel.clear();
    const el = $("#rv"); if (el) el.dataset.id = id; if (vEl) vEl.pause(); loadVideo(); paintAll(); if (vEl) vEl.play().catch(() => {});
  }

  // ---------- acciones ----------
  const A = App.acts;
  A.rvback = () => App.go("aprobar");
  A.rvplay = () => { if (!vEl) return; if (vEl.paused) vEl.play().catch(() => {}); else vEl.pause(); };
  A.rvsafe = (el) => { const on = el.getAttribute("aria-pressed") !== "true"; el.setAttribute("aria-pressed", on); $("#rvsafe").hidden = !on; App.store.set("safe", on); };
  A.rvmute = (el) => { const on = el.getAttribute("aria-pressed") !== "true"; el.setAttribute("aria-pressed", on); vEl.muted = on; };
  A.rvver = (el) => { if (el.dataset.id !== RV.id) switchTo(el.dataset.id); };
  A.rvdecide = (el) => decide(el.dataset.st);
  A.rvseek = (el) => { if (vEl) { vEl.currentTime = +el.dataset.t || 0; vEl.pause(); } };
  A.rvpiece = (el) => { const v = V(); const groups = sel.groupByPiece(sel.pending(v.brand).concat(sel.siblings(v).filter((x) => !sel.isPending(x)))); const i = groups.findIndex((g) => g.piece === v.piece), n = groups[(i + +el.dataset.d + groups.length) % groups.length]; if (n) switchTo(n.vs[0].id); };
  A.rvtag = (el) => { const v = V(); const cur = new Set(v.tags || []); cur.has(el.dataset.t) ? cur.delete(el.dataset.t) : cur.add(el.dataset.t); el.setAttribute("aria-pressed", cur.has(el.dataset.t)); App.act.setFeedback(v, v.feedback || "", [...cur]); if (!(v.feedback || "").trim()) App.toast("Escribe también qué cambiar para que se envíe."); };
  A.rvnotedel = async (el) => { const n = S.notes.find((x) => x.id === el.dataset.id); if (n) { await App.act.removeNote(n); } };
  A.rvcw = (el) => { const i = +el.dataset.i; capSel.has(i) ? capSel.delete(i) : capSel.add(i); paintCaps(); };
  A.rvcapfont = (el) => capApply({ font: el.dataset.k });
  A.rvcapcolor = (el) => capApply({ color: el.dataset.h });
  A.rvcapreset = () => capApply({}, true);
  A.rvcapclear = () => { capSel.clear(); paintCaps(); };

  const fbSave = App.debounce(async () => { const v = V(); if (!v) return; const ta = $("#rvfb"); if (!ta) return; await App.act.setFeedback(v, ta.value, v.tags); const s = $("#rvfbstat"); if (s) s.textContent = ta.value.trim() ? "Guardado. Se envía con Enviar cambios." : ""; App.updateSendBar(); }, 600);

  // ---------- montaje ----------
  App.reviewView = {
    render(r) { return skeleton(r.args[1] || ""); },
    bind(root, r) {
      const id = r.args[1] || "", v = sel.video(id);
      if (!v) { root.innerHTML = `<div class="empty card lg"><span class="orb"></span><h3>No encuentro ese video</h3><a class="btn pri" href="#aprobar">Volver a la lista</a></div>`; return; }
      if (v.brand !== App.ui.brandId) sel.setBrand(v.brand);
      App.float('<div class="capsule lg" id="rvdecide" role="group" aria-label="Decisión"></div>');
      cancelAnimationFrame(raf); RV = { id, seen: new Set(), counts: {}, done: 0, total: sel.allPending().length }; vEl = $("#rvvideo", root);
      vEl.muted = false; vEl.addEventListener("play", () => setPlaying(true)); vEl.addEventListener("pause", () => setPlaying(false));
      vEl.addEventListener("loadeddata", () => { clearTimeout(loadTimer); vmsg(""); vEl.style.opacity = 1; paintMarks(); });
      vEl.addEventListener("error", () => { if (vEl.getAttribute("src")) blobFallback(V(), "error " + (vEl.error ? vEl.error.code : "?")); });
      const sc = $("#rvscrub", root); let drag = false; const at = (e) => { const b = sc.getBoundingClientRect(); seek(Math.max(0, Math.min(1, (e.clientX - b.left) / b.width))); };
      sc.addEventListener("pointerdown", (e) => { drag = true; sc.setPointerCapture(e.pointerId); at(e); }); sc.addEventListener("pointermove", (e) => { if (drag) at(e); }); sc.addEventListener("pointerup", () => { drag = false; });
      sc.addEventListener("keydown", (e) => { if (e.key === "ArrowRight" && e.shiftKey) vEl.currentTime += 1; });
      root.addEventListener("input", (e) => { if (e.target.id === "rvfb") fbSave(); });
      root.addEventListener("change", (e) => { if (e.target.id === "capall") { App.store.set("cap-all", e.target.checked); paintCaps(); } });
      root.addEventListener("submit", async (e) => { if (e.target.id !== "rvnoteform") return; e.preventDefault(); const inp = $("#rvnote"), t = inp.value.trim(); if (!t) return; vEl.pause(); inp.value = ""; await App.act.addNote(V(), vEl.currentTime || 0, t, V().tags); });
      if (App.store.get("safe", false)) { $("#rvsafebtn").setAttribute("aria-pressed", "true"); $("#rvsafe").hidden = false; }
      loadVideo(); paintAll(); raf = requestAnimationFrame(tick); vEl.play().catch(() => {});
    },
    // un cambio de ruta dentro de la revision (otra version) no reconstruye la pantalla
    routeChanged(r) {
      if (r.name !== "aprobar" || r.args[0] !== "ver" || !RV || RV.finished || !$("#rv")) return false;
      const id = r.args[1] || ""; if (id === RV.id) return true; if (sel.video(id)) { switchTo(id); return true; } return false;
    },
    update(kinds) {
      if (!RV || !$("#rv") || RV.finished) return false;
      if (!sel.video(RV.id)) return false;
      const ae = document.activeElement; if (ae && ae.id === "rvfb") { paintLeft(); paintDecide(); paintProgress(); return true; }
      if (ae && ae.id === "rvnote") { paintLeft(); paintDecide(); paintProgress(); return true; }
      paintAll(); return true;
    },
    key(e) {
      if (!RV || RV.finished) { if (e.key === "Escape") App.go("aprobar"); return; }
      const k = e.key.toLowerCase();
      if (k === "a") decide("approved"); else if (k === "q") decide("maybe"); else if (k === "r") decide("rejected");
      else if (k === " ") { e.preventDefault(); A.rvplay(); }
      else if (k === "arrowright" || k === "arrowleft") { const v = V(), sibs = sel.siblings(v), i = sibs.findIndex((x) => x.id === v.id), n = sibs[(i + (k === "arrowright" ? 1 : -1) + sibs.length) % sibs.length]; if (n && n.id !== v.id) switchTo(n.id); }
      else if (k === "n") { e.preventDefault(); const i = $("#rvnote"); if (i) { vEl.pause(); i.focus(); } }
      else if (k === "," || k === ".") { vEl.pause(); vEl.currentTime += (k === "." ? 1 : -1) / 30; }
      else if (k === "escape") App.go("aprobar");
    },
    teardown() { cancelAnimationFrame(raf); if (vEl) { try { vEl.pause(); } catch (x) { /* ya cerrado */ } } RV = null; },
  };
  App.views.aprobar = {
    title: "Aprobar", wide: true,
    render(r) { return r.args[0] === "ver" ? App.reviewView.render(r) : (App.reviewView.teardown(), App.listView.render(r)); },
    bind(root, r) { return r.args[0] === "ver" ? App.reviewView.bind(root, r) : App.listView.bind(root, r); },
    routeChanged(r) { return App.reviewView.routeChanged(r); },
    update(kinds) { return App.route().args[0] === "ver" ? App.reviewView.update(kinds) : false; },
    key(e) { if (App.route().args[0] === "ver") App.reviewView.key(e); },
  };
})();
