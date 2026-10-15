/* Aura · Estudio (nucleo). Editor de video sobre el MISMO motor del portal (StudioModel / StudioRules / StudioLib / StudioRenderer).
   Piel minimalista: el video al centro, un dock de herramientas debajo y un inspector que aparece solo cuando hace falta.
   Logica de edicion intacta: deshacer, guardado con revision, reglas, linea de tiempo con iman, seleccion y arrastre en el cuadro. */
(function () {
  "use strict";
  const App = window.App, S = App.S, sel = App.sel, { esc, icon, plural } = App;
  const E = (id) => document.getElementById(id);
  const SM = () => window.StudioModel, SRu = () => window.StudioRules, SRn = () => window.StudioRenderer;
  const ST = (App.st = { SE: null, MAX_VERSIONS: 7 });
  const fmtTc = (t) => { t = Math.max(0, t || 0); const m = Math.floor(t / 60), s = Math.floor(t % 60), f = Math.floor((t % 1) * 30); return `${m}:${App.pad(s)}<small>.${App.pad(f)}</small>`; };
  const fmtShort = (t) => `${Math.floor(t / 60)}:${App.pad(Math.floor(t % 60))}`;
  const isTyping = (e) => e.target && (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable);
  const nowIso = () => new Date().toISOString();
  Object.assign(ST, { E, fmtTc, fmtShort, nowIso });

  // ---------- datos ----------
  const ver = (vid) => S.studioVersions.find((x) => x.id === vid) || null;
  const trans = (pid) => S.studioTranscripts.find((x) => x.id === pid) || null;
  const hasSpec = (vid) => !!(ver(vid) && ver(vid).spec);
  const reqsOf = (vid) => S.studioRequests.filter((r) => r.videoId === vid).sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  const fbOf = (vid) => S.studioFeedback.filter((f) => f.videoId === vid);
  const isDone = (r) => r.status === "listo" || r.status === "error" || r.status === "cancelado";
  Object.assign(ST, { ver, trans, hasSpec, reqsOf, fbOf, isDone });
  ST.write = (coll, id, patch) => App.data.write(coll, id, patch);
  // pedido a Claude con su lista de pasos (la arma y la tilda Claude); le llega solo
  ST.ask = async (vid, kind, text, extra) => {
    const v = sel.video(vid), id = App.uid("req");
    const m = App.ai.stamp(), req = Object.assign({ videoId: vid, project: v ? v.piece : "", brand: v ? v.brand : "", kind, text, scope: "video", targets: [], status: "pedido", steps: [], at: nowIso(), by: S.userId || "", rev: (ver(vid) || {}).rev || 0, model: m.model, effort: m.effort }, extra || {});
    if (!req.assets || !req.assets.length) delete req.assets;
    if (!(await ST.write("studio_requests", id, req))) return null;
    const what = { export: "EXPORTAR", abrir: "ABRIR EN EL ESTUDIO", version: "NUEVA VERSIÓN" }[kind] || "CAMBIO";
    const detail = [`versión en studio_versions/${vid} rev ${req.rev}`, req.scope && req.scope !== "video" ? `alcance ${req.scope}${req.targets && req.targets.length ? " (" + req.targets.join(", ") + ")" : ""}` : "", req.at_time != null ? `parado en ${req.at_time}s` : "", req.export ? `formato ${req.export.format}${req.export.quality ? " calidad " + req.export.quality : ""}` : "", req.style ? `estilo ${req.style}` : "", req.assets ? `${req.assets.length} ${req.assets.length === 1 ? "archivo adjunto" : "archivos adjuntos"} (assetId en studio_requests/${id}.assets)` : ""].filter(Boolean).join(", ");
    App.data.tell(`PEDIDO DEL ESTUDIO (${what}) sobre ${v ? sel.label(v) : vid} (studio_requests/${id}; ${detail}): "${text}". Primero escribe la lista de pasos en \`steps\` (cada uno {id, text, status:"pendiente"}), después hazlos uno por uno actualizando el estado de cada paso (haciendo, hecho, error) y al final status "listo" con una respuesta corta en \`reply\`. Se ve en vivo. ${App.ai.tellNote(m)} Sin que te lo repita.`);
    return id;
  };

  // ---------- Estudio: listado (lo que antes era la pestaña "Aprobar") -> vista general -> editor completo. Ver DECISIONES.md #2. ----------
  // Listado = App.listView (por aprobar / agendados / rechazados, de aprobar-list.js) para TODOS los videos de la cuenta.
  // Click en una version -> vista general (App.reviewView, de aprobar-review.js): predictor, subtitulos, Jarvis opina, aprobar/rechazar/agendar.
  // Desde ahi, "Abrir en editor" -> #estudio/editor/<id> abre el editor completo (ST.open, mas abajo). El editor nunca es la pantalla de entrada.
  const GENERAL = new Set(["ver", "editor"]); // sub-rutas que muestran la vista general (App.reviewView) debajo (el editor se abre encima, superpuesto)
  App.views.estudio = {
    title: "Estudio", wide: true,
    render(r) { return GENERAL.has(r.args[0]) ? App.reviewView.render(r) : (App.reviewView.teardown(), App.listView.render(r)); },
    bind(root, r) { return GENERAL.has(r.args[0]) ? App.reviewView.bind(root, r) : App.listView.bind(root, r); },
    routeChanged(r) { return App.reviewView.routeChanged(r); },
    update(kinds) { return GENERAL.has(App.route().args[0]) ? App.reviewView.update(kinds) : false; },
    key(e) { if (GENERAL.has(App.route().args[0])) App.reviewView.key(e); },
  };
  App.studioRoute = function () {
    const r = App.route();
    // La vista general (App.reviewView) tiene su propio video en loop con requestAnimationFrame: si la persona se va
    // de "ver"/"editor" derecho a otra pantalla (un link directo, un tool de Jarvis, no el boton de volver) nunca pasa
    // por el render() que la desmonta. App.studioRoute ya corre en cada cambio de ruta, asi que es el lugar parejo
    // para desmontarla tambien -- si no, el tick() de esa vista sigue escribiendo sobre nodos que ya no existen.
    if (!(r.name === "estudio" && GENERAL.has(r.args[0]))) App.reviewView.teardown();
    const id = r.name === "estudio" && r.args[0] === "editor" ? r.args[1] : null;
    if (!id) { if (ST.SE) ST.close(true); return; }
    if (!sel.video(id)) return;
    if (!ST.SE || ST.SE.vid !== id) ST.open(id); else { E("st").hidden = false; ST.renderTop(); }
  };

  // ---------- el editor ----------
  const DOCK = [["texto", "Texto", "type"], ["fondo", "Fondos", "bg"], ["imagenes", "Imágenes", "photo"], ["transiciones", "Transiciones", "trans"], ["subtitulos", "Subtítulos", "captions"], ["sonido", "Sonido", "volume"], ["estilos", "Estilos", "sparkles"]];
  const DOCK2 = [["transcripcion", "Transcripción", "lines"], ["exportar", "Exportar", "download"]];
  ST.DOCK = DOCK; ST.DOCK2 = DOCK2;
  function shell() {
    return `<header class="st-top"><button class="iconbtn" id="st-back" type="button" aria-label="Volver al Estudio">${icon("chevleft")}</button>
        <div class="st-title"><b id="st-title"></b><small id="st-sub"></small></div><div class="st-vers" id="st-vers" role="group" aria-label="Versiones"></div><span class="sp"></span>
        <div class="st-hist"><button class="iconbtn sm ghost" id="st-undo" type="button" title="Deshacer (⌘Z)" aria-label="Deshacer">${icon("undo")}</button><button class="iconbtn sm ghost" id="st-redo" type="button" title="Rehacer (⇧⌘Z)" aria-label="Rehacer">${icon("redo")}</button></div>
        <button class="st-qa" id="st-qa" type="button" title="Calidad: reglas de diseño">${icon("shield")}<b id="st-rbadge">✓</b></button>
        <button class="st-status" id="st-status" type="button" aria-haspopup="menu"><i></i><span id="st-statustxt">Por decidir</span>${icon("chevdown")}</button>
        <button class="btn sm pri st-magic" id="st-ask-btn" type="button"><span class="orb"></span>Pedirle a Claude</button></header>
      <div class="st-body"><section class="st-canvas" aria-label="Vista previa"><div id="st-banner" class="st-bnr"></div>
          <div class="st-stagewrap" id="st-wrap"><div class="st-phone" id="st-phone"><div id="st-stage"></div><div class="st-hit" id="st-hit"></div><div class="st-sel" id="st-selbox"></div></div></div>
          <div class="st-play"><button class="st-pbtn" id="st-play" type="button" aria-label="Reproducir o pausar (Espacio)">${icon("play")}</button><span class="st-tc num" id="st-tc">0:00</span><span class="st-dur num" id="st-dur"></span><span class="sp"></span>
            <button class="iconbtn sm ghost" id="st-safe" type="button" aria-pressed="false" title="Zona segura de Instagram" aria-label="Zona segura">${icon("frame")}</button><button class="iconbtn sm ghost" id="st-mute" type="button" aria-pressed="false" title="Silencio" aria-label="Silencio">${icon("volume")}</button></div></section>
        <aside class="st-insp lg solid-glass" id="st-insp" aria-label="Inspector"><header class="st-ih"><b id="st-ititle"></b><span class="st-iacts" id="st-iacts"></span><button class="iconbtn sm ghost" id="st-iclose" type="button" aria-label="Cerrar">${icon("x")}</button></header><div class="st-pane" id="st-ipane"></div></aside></div>
      <nav class="st-dock lg" id="st-dock" aria-label="Herramientas">${DOCK.map(([k, n, ic]) => `<button type="button" data-tool="${k}" aria-pressed="false">${icon(ic)}<span>${n}</span></button>`).join("")}<i class="st-dsep"></i>${DOCK2.map(([k, n, ic]) => `<button type="button" data-tool="${k}" aria-pressed="false">${icon(ic)}<span>${n}</span></button>`).join("")}</nav>
      <section class="st-tl lg" id="st-tl" aria-label="Línea de tiempo"></section><div id="st-modal"></div><div class="st-menu" id="st-menu" hidden></div>`;
  }
  function ensureShell() {
    let el = E("st");
    if (!el) { el = document.createElement("div"); el.id = "st"; el.className = "stx"; el.hidden = true; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Estudio"); el.innerHTML = shell(); document.getElementById("stmount").appendChild(el); wireShell(); }
    return el;
  }
  const video = () => (ST.SE ? sel.video(ST.SE.vid) : null);
  ST.video = video;

  // GSAP se carga con un <script> bloqueante antes del bundle, asi que deberia estar listo siempre;
  // si por lo que sea todavia no lo esta, reintenta un rato corto en vez de rendirse al toque.
  ST.open = function (vid, _retries) {
    const v = sel.video(vid); if (!v) return;
    if (!window.StudioModel || !window.gsap) {
      if ((_retries || 0) < 20) { setTimeout(() => ST.open(vid, (_retries || 0) + 1), 150); return; }
      // Este aviso puede llegar tarde (hasta 3s de reintentos) y encontrar a la persona ya en otra pantalla: ir al
      // listado (nunca a la vista general de este video) para no reabrir de golpe una pantalla con video en loop
      // que ya no corresponde a donde esta parada.
      App.toast("El motor del Estudio no cargó. Revisa tu conexión y recarga."); App.go("estudio", { replace: true }); return;
    }
    if (ST.SE) teardown();
    const doc = ver(vid), spec = doc && doc.spec ? SM().clone(doc.spec) : null;
    ST.SE = { vid, spec, rev: doc ? doc.rev || 0 : 0, hist: SM().createHistory(100), sel: null, t: 0, zoom: 64, safe: false, muted: false, tool: null, trSide: "in", handle: null, dirty: false, qa: null, log: doc && doc.log ? doc.log.slice() : [], raf: 0, saveT: 0, ruleT: 0, openedAt: Date.now() };
    const el = ensureShell(); el.hidden = false; el.classList.remove("insp-open"); App.studioOpen = true; document.body.style.overflow = "hidden"; App.updateSendBar();
    el.animate([{ opacity: 0, transform: "scale(1.015)" }, { opacity: 1, transform: "none" }], { duration: 420, easing: "cubic-bezier(.16,1,.3,1)" });
    if (v.brand !== App.ui.brandId) sel.setBrand(v.brand);
    ST.renderTop(); ST.renderDock(); ST.renderInspector(); ST.renderBanner();
    // Nunca dejar la vista previa en blanco para siempre y sin ningun aviso: si tarda demasiado
    // (un asset que no carga, un video que nunca dispara loadedmetadata) se avisa con un boton
    // de reintentar en vez de quedar "trabado" sin ninguna señal.
    const openId = ST.SE.openedAt, stuck = setTimeout(() => {
      if (!ST.SE || ST.SE.openedAt !== openId) return;
      ST.renderBanner(`<span><b>Esto está tardando más de lo normal.</b> Puede ser el video o una fuente que no cargó.</span><button class="btn sm pri" id="st-retry" type="button">Reintentar</button>`);
      const r = E("st-retry"); if (r) r.onclick = () => ST.open(vid);
    }, 8000);
    (spec ? mountPreview() : mountLegacy()).then(() => { clearTimeout(stuck); fit(); ST.renderTimeline(); runRules(); seek(spec ? Math.min(1.2, spec.duration / 3) : 0); }).catch((e) => { clearTimeout(stuck); App.toast("No se pudo abrir la vista previa: " + (e && e.message ? e.message : e)); });
  };
  function teardown() { const SE = ST.SE; if (!SE) return; saveNow(); cancelAnimationFrame(SE.raf); try { if (SE.handle && SE.handle.destroy) SE.handle.destroy(); } catch (e) { /* ya cerrado */ } const s = E("st-stage"); if (s) s.innerHTML = ""; ST.SE = null; }
  ST.close = function (silent) {
    if (!ST.SE) return; const vid = ST.SE.vid; teardown(); const el = E("st"); if (el) el.hidden = true; App.studioOpen = false; document.body.style.overflow = ""; App.updateSendBar();
    // El editor nunca es la pantalla de entrada (DECISIONES.md #2): al cerrarlo se vuelve a la vista general de este
    // mismo video, no al listado -- es la pantalla "de abajo" real, no un salto a otro lado.
    if (!silent) App.go("estudio/ver/" + encodeURIComponent(vid));
  };
  ST.teardown = teardown;

  // ---------- vista previa ----------
  async function mountPreview() { const SE = ST.SE; SE.handle = await SRn().mount(E("st-stage"), SE.spec, { mode: "preview", assetUrl: (id) => App.adapter().assetUrl(id), safe: SE.safe, audio: true }); bindMedia(); }
  async function mountLegacy() {
    const SE = ST.SE, v = video(), vd = document.createElement("video"); vd.className = "legacy"; vd.playsInline = true; vd.preload = "auto"; vd.src = sel.src(v); const st = E("st-stage"); st.innerHTML = ""; st.appendChild(vd);
    SE.handle = { video: vd, cut: document.createElement("video"), seek() {}, rectOf() { return null; }, rebuild() {}, setSafe() {}, destroy() {}, scaleTo() {}, duration: 0 }; bindMedia();
    vd.addEventListener("loadedmetadata", () => { SE.handle.duration = vd.duration; ST.renderTimeline(); setDur(); });
  }
  const dur = () => { const SE = ST.SE; return (SE && (SE.spec ? SE.spec.duration : SE.handle && SE.handle.video.duration)) || 0; };
  const setDur = () => { const d = E("st-dur"); if (d) d.textContent = "/ " + fmtShort(dur()); };
  function bindMedia() {
    const h = ST.SE.handle, v = h.video; setDur();
    v.addEventListener("seeked", () => tick(v.currentTime, true)); v.addEventListener("ended", pause);
    v.addEventListener("play", () => { E("st-play").innerHTML = icon("pause"); E("st").classList.add("playing"); }); v.addEventListener("pause", () => { E("st-play").innerHTML = icon("play"); E("st").classList.remove("playing"); });
  }
  function fit() {
    const SE = ST.SE; if (!SE) return; const wrap = E("st-wrap"), ph = E("st-phone"), aw = wrap.clientWidth - 4, ah = wrap.clientHeight - 4; if (aw <= 0 || ah <= 0) return;
    const px = Math.max(150, Math.min(aw, Math.floor((ah * 9) / 16))); ph.style.width = px + "px"; ph.style.height = Math.round((px * 16) / 9) + "px";
    if (SE.handle && SE.handle.scaleTo && SE.spec) SE.handle.scaleTo(px); SE.px = px; renderSelection();
  }
  function play() { const SE = ST.SE; if (!SE || !SE.handle) return; const h = SE.handle; if (h.video.ended) seek(0); h.cut.currentTime = h.video.currentTime; h.video.play().catch(() => {}); if (SE.spec) h.cut.play().catch(() => {}); cancelAnimationFrame(SE.raf); const loop = () => { if (!ST.SE) return; tick(h.video.currentTime); if (!h.video.paused && !h.video.ended) SE.raf = requestAnimationFrame(loop); }; loop(); }
  function pause() { const SE = ST.SE; if (!SE || !SE.handle) return; SE.handle.video.pause(); SE.handle.cut.pause(); cancelAnimationFrame(SE.raf); }
  const toggle = () => { const SE = ST.SE; if (!SE || !SE.handle) return; SE.handle.video.paused ? play() : pause(); };
  function seek(t) { const SE = ST.SE; if (!SE || !SE.handle) return; const d = dur(); t = Math.max(0, Math.min(d || 1e9, t)); SE.handle.video.currentTime = t; if (SE.spec) SE.handle.cut.currentTime = t; tick(t, true); }
  function tick(t, force) {
    const SE = ST.SE; if (!SE) return; SE.t = t; const h = SE.handle;
    if (SE.spec) { h.seek(t); if (!h.cut.paused && Math.abs(h.cut.currentTime - t) > 0.12) h.cut.currentTime = t; }
    const tc = E("st-tc"); if (tc) tc.innerHTML = fmtTc(t);
    movePlayhead(); if (force || SE.sel) renderSelection(); if (ST.highlightTranscript) ST.highlightTranscript();
  }
  function renderSelection() {
    const SE = ST.SE, box = E("st-selbox"); if (!box) return; box.style.display = "none"; if (!SE || !SE.sel || !SE.handle || !SE.spec) return;
    const f = SM().findClip(SE.spec, SE.sel); if (!f || !(f.track.kind === "text" || f.track.kind === "media")) return; if (!(f.clip.t <= SE.t && SE.t < SM().clipEnd(f.clip) + 0.04)) return;
    const r = SE.handle.rectOf(SE.sel), k = (SE.px || 300) / SM().W; if (!r) return; Object.assign(box.style, { display: "block", left: r.x * k - 4 + "px", top: r.y * k - 4 + "px", width: r.w * k + 8 + "px", height: r.h * k + 8 + "px" });
  }
  Object.assign(ST, { fit, play, pause, toggle, seek, tick, renderSelection });

  // ---------- edicion: confirmar, deshacer, guardar ----------
  ST.commit = function (next, text, o) {
    const SE = ST.SE; if (!SE || !SE.spec || next === SE.spec) return; o = o || {};
    SE.hist.push(SE.spec); SE.spec = next; SE.dirty = true; if (text) SE.log = [{ at: nowIso(), text, by: "usuario" }, ...SE.log].slice(0, 40);
    SE.handle.rebuild(next); SE.handle.seek(SE.t); setDur(); afterEdit(o);
  };
  function afterEdit(o) { const SE = ST.SE; o = o || {}; ST.renderTimeline(); renderSelection(); saveState("saving"); clearTimeout(SE.saveT); SE.saveT = setTimeout(saveNow, 800); clearTimeout(SE.ruleT); SE.ruleT = setTimeout(runRules, 350); undoState(); if (!o.keepPanel) ST.renderInspector(); }
  function undo() { const SE = ST.SE; if (!SE || !SE.spec) return; const p = SE.hist.undo(SE.spec); if (!p) return; SE.spec = p; SE.dirty = true; SE.handle.rebuild(p); SE.handle.seek(SE.t); afterEdit(); App.toast("Deshecho."); }
  function redo() { const SE = ST.SE; if (!SE || !SE.spec) return; const p = SE.hist.redo(SE.spec); if (!p) return; SE.spec = p; SE.dirty = true; SE.handle.rebuild(p); SE.handle.seek(SE.t); afterEdit(); App.toast("Rehecho."); }
  function undoState() { const SE = ST.SE, u = E("st-undo"), r = E("st-redo"); if (u) u.disabled = !SE || !SE.spec || !SE.hist.canUndo(); if (r) r.disabled = !SE || !SE.spec || !SE.hist.canRedo(); }
  function saveState(s) { const e = E("st-sub"), v = video(); if (!e) return; e.dataset.s = s; e.textContent = `${v ? (sel.brandOf(v) || {}).name || "" : ""} · ${s === "saving" ? "guardando…" : s === "error" ? "no se pudo guardar" : "guardado"}`; }
  async function saveNow() {
    const SE = ST.SE; if (!SE || !SE.spec || !SE.dirty) return; clearTimeout(SE.saveT); const rev = SE.rev + 1, vid = SE.vid, spec = SE.spec;
    const ok = await ST.write("studio_versions", vid, { project: (video() || {}).piece || "", spec, rev, updatedAt: nowIso(), log: SE.log, by: "usuario" });
    if (!ST.SE || ST.SE.vid !== vid) return; if (ok) { SE.rev = rev; if (SE.spec === spec) SE.dirty = false; saveState("ok"); } else saveState("error");
  }
  ST.remoteChanged = function () {
    const SE = ST.SE; if (!SE || !SE.spec) return; const d = ver(SE.vid); if (!d || !d.spec || (d.rev || 0) <= SE.rev) return;
    if (SE.dirty) { ST.renderBanner(`Claude cambió esta versión mientras editabas. <button class="btn sm" id="st-adopt" type="button">Ver la de Claude</button>`); const b = E("st-adopt"); if (b) b.onclick = () => adopt(d); return; }
    adopt(d); App.toast("Claude actualizó esta versión. Ya la ves con los cambios.");
  };
  function adopt(d) { const SE = ST.SE; SE.spec = SM().clone(d.spec); SE.rev = d.rev || 0; SE.log = (d.log || []).slice(); SE.dirty = false; SE.hist.clear(); SE.handle.rebuild(SE.spec); SE.handle.seek(SE.t); ST.renderBanner(); afterEdit(); }
  Object.assign(ST, { undo, redo, saveNow, afterEdit, saveState });

  // ---------- calidad (reglas de diseno) ----------
  const speechSeconds = () => { const tr = trans((video() || {}).piece); return tr && tr.lines ? tr.lines.reduce((a, l) => a + Math.max(0, l.e - l.s), 0) : 0; };
  function runRules() {
    const SE = ST.SE; if (!SE) return; const b = E("st-rbadge"), q = E("st-qa"); if (!SE.spec) { if (b) b.textContent = "–"; return; }
    SE.qa = SRu().check(SE.spec, { speechSeconds: speechSeconds() }); if (!b) return;
    b.textContent = SE.qa.errors ? String(SE.qa.errors) : SE.qa.warns ? String(SE.qa.warns) : "✓"; q.dataset.s = SE.qa.errors ? "bad" : SE.qa.warns ? "warn" : "ok";
    q.title = SE.qa.errors || SE.qa.warns ? `${SE.qa.errors} para arreglar y ${SE.qa.warns} para mirar` : "Todo cumple las reglas de diseño";
    if (SE.tool === "calidad" || SE.tool === "exportar") ST.renderInspector();
  }
  ST.runRules = runRules;
  ST.modal = function (html) {
    const md = E("st-modal"); if (!html) { md.innerHTML = ""; return; } md.innerHTML = `<div class="st-modal" role="dialog" aria-modal="true"><div class="lg solid-glass">${html}</div></div>`;
    md.querySelectorAll("[data-st-close]").forEach((b) => b.addEventListener("click", () => { md.innerHTML = ""; })); md.querySelector(".st-modal").addEventListener("click", (e) => { if (e.target.classList.contains("st-modal")) md.innerHTML = ""; });
    const f = md.querySelector("input, textarea, button"); if (f) f.focus();
  };
  ST.renderBanner = function (html) {
    const SE = ST.SE, b = E("st-banner"); if (!b) return; const v = video();
    b.innerHTML = html ? `<div class="st-banner lg">${html}</div>` : SE && !SE.spec ? `<div class="st-banner lg"><span><b>Versión del motor anterior.</b> Puedes verla, pedir cambios y seguir los pasos de Claude. Para editarla a mano, ábrela en el editor completo.</span><button class="btn sm pri" id="st-open-full" type="button">Abrir en el editor</button></div>` : "";
    const o = E("st-open-full"); if (o) o.onclick = async () => { o.disabled = true; const id = await ST.ask(SE.vid, "abrir", `Pasa ${v ? sel.label(v) : ""} al editor completo (arma la especificación con su video base, transcripción, subtítulos y textos actuales).`); App.toast(id ? "Pedido enviado. Mira los pasos en Claude." : "No se pudo enviar el pedido."); ST.openTool("claude"); };
  };

  // ---------- barra superior ----------
  const STATUS = { pending: ["Por decidir", "var(--ink3)"], approved: ["Aprobada", "var(--up)"], maybe: ["Quizás", "var(--warn)"], rejected: ["Rechazada", "var(--down)"] };
  ST.renderTop = function () {
    const SE = ST.SE, v = video(); if (!v || !SE) return; E("st-title").textContent = v.pieceName || v.piece || "Video"; saveState(SE.dirty ? "saving" : "ok");
    const sibs = sel.siblings(v), st = STATUS[v.status || "pending"] || STATUS.pending;
    E("st-vers").innerHTML = sibs.map((x) => `<button class="st-vc" type="button" data-vid="${esc(x.id)}" data-s="${x.status || "pending"}" aria-current="${x.id === v.id}">v${x.version}</button>`).join("") + (sibs.length < ST.MAX_VERSIONS ? `<button class="st-vc add" type="button" id="st-addver" title="Pedir otra versión (hasta ${ST.MAX_VERSIONS})" aria-label="Nueva versión">${icon("plus")}</button>` : "");
    E("st-statustxt").textContent = st[0]; E("st-status").style.setProperty("--c", st[1]);
    E("st-safe").setAttribute("aria-pressed", String(SE.safe)); E("st-mute").setAttribute("aria-pressed", String(SE.muted)); undoState();
  };
  function statusMenu() {
    const m = E("st-menu"), v = video(); if (!m.hidden) { m.hidden = true; return; }
    const r = E("st-status").getBoundingClientRect();
    m.innerHTML = Object.entries(STATUS).map(([k, [n, c]]) => `<button type="button" data-st="${k}" aria-checked="${(v.status || "pending") === k}"><i style="background:${c}"></i>${n}${k === "approved" ? "<kbd>A</kbd>" : k === "maybe" ? "<kbd>Q</kbd>" : k === "rejected" ? "<kbd>R</kbd>" : ""}</button>`).join("");
    Object.assign(m.style, { top: r.bottom + 8 + "px", left: Math.max(8, Math.min(innerWidth - 228, r.right - 220)) + "px" }); m.hidden = false;
    m.animate([{ opacity: 0, transform: "translateY(-6px) scale(.96)" }, { opacity: 1, transform: "none" }], { duration: 240, easing: "cubic-bezier(.16,1,.3,1)" });
  }
  function setStatus(st) { const v = video(); if (!v) return; App.act.setStatus(v, st === "pending" ? "pending" : st); E("st-menu").hidden = true; ST.renderTop(); }
  ST.setStatus = setStatus;
  function wireShell() {
    const st = E("st");
    E("st-back").addEventListener("click", () => ST.close());
    E("st-undo").addEventListener("click", undo); E("st-redo").addEventListener("click", redo);
    E("st-qa").addEventListener("click", () => ST.openTool("calidad"));
    E("st-ask-btn").addEventListener("click", () => ST.openTool("claude", true));
    E("st-status").addEventListener("click", statusMenu);
    E("st-menu").addEventListener("click", (e) => { const b = e.target.closest("[data-st]"); if (b) setStatus(b.dataset.st); });
    E("st-play").addEventListener("click", toggle);
    E("st-safe").addEventListener("click", () => { const SE = ST.SE; SE.safe = !SE.safe; if (SE.handle && SE.handle.setSafe) SE.handle.setSafe(SE.safe); E("st-safe").setAttribute("aria-pressed", String(SE.safe)); });
    E("st-mute").addEventListener("click", () => { const SE = ST.SE; SE.muted = !SE.muted; SE.handle.video.muted = SE.muted; E("st-mute").setAttribute("aria-pressed", String(SE.muted)); E("st-mute").innerHTML = icon(SE.muted ? "mute" : "volume"); });
    E("st-vers").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; if (b.id === "st-addver") { ST.stylePicker("new"); return; } if (b.dataset.vid) App.go("estudio/editor/" + encodeURIComponent(b.dataset.vid), { replace: true }); });
    E("st-dock").addEventListener("click", (e) => { const b = e.target.closest("[data-tool]"); if (!b || b.disabled) return; const k = b.dataset.tool; ST.SE.tool === k ? ST.closeTool() : ST.openTool(k); });
    E("st-iclose").addEventListener("click", () => ST.closeTool());
    E("st-hit").addEventListener("pointerdown", hitDown);
    st.addEventListener("pointerdown", (e) => { if (!E("st-menu").hidden && !e.target.closest("#st-menu, #st-status")) E("st-menu").hidden = true; });
    let rzT = 0; window.addEventListener("resize", () => { fit(); clearTimeout(rzT); rzT = setTimeout(() => { if (ST.SE && ST.SE.fit !== false) ST.renderTimeline(); }, 160); }); if (window.ResizeObserver) new ResizeObserver(fit).observe(E("st-wrap"));
    document.addEventListener("keydown", key);
  }
  function key(e) {
    const SE = ST.SE, el = E("st"); if (!SE || !el || el.hidden) return; const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "k") return;
    if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (e.key === "Escape") { if (E("st-modal").innerHTML) { ST.modal(""); return; } if (!E("st-menu").hidden) { E("st-menu").hidden = true; return; } if (SE.sel) { ST.select(null); return; } if (SE.tool) { ST.closeTool(); return; } if (!isTyping(e)) ST.close(); return; }
    if (isTyping(e) || mod) return;
    const k = e.key.toLowerCase();
    if (e.key === " ") { e.preventDefault(); toggle(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); pause(); seek(SE.t - (e.shiftKey ? 1 : 1 / 30)); }
    else if (e.key === "ArrowRight") { e.preventDefault(); pause(); seek(SE.t + (e.shiftKey ? 1 : 1 / 30)); }
    else if (k === "s" && SE.sel && SE.spec) ST.commit(SM().splitClip(SE.spec, SE.sel, SE.t), "Corté un clip");
    else if (k === "d" && SE.sel && SE.spec) { const r = SM().duplicateClip(SE.spec, SE.sel); ST.commit(r.spec, "Dupliqué un clip"); if (r.id) ST.select(r.id); }
    else if ((e.key === "Delete" || e.key === "Backspace") && SE.sel && SE.spec) { e.preventDefault(); ST.commit(SM().removeClip(SE.spec, SE.sel), "Quité un clip"); ST.select(null); }
    else if (k === "a") setStatus("approved"); else if (k === "q") setStatus("maybe"); else if (k === "r") setStatus("rejected");
    else if (k === "t" && SE.spec) ST.openTool("texto");
  }

  // ---------- seleccion y arrastre en el cuadro ----------
  ST.select = function (id, seekTo) {
    const SE = ST.SE; if (!SE) return; SE.sel = id; if (id && seekTo && SE.spec) { const f = SM().findClip(SE.spec, id); if (f) { pause(); seek(f.clip.t + 0.05); } }
    if (id) SE.tool = "clip"; else if (SE.tool === "clip") SE.tool = null;
    ST.renderTimeline(); renderSelection(); ST.renderInspector(); ST.renderDock();
  };
  const stagePoint = (e) => { const r = E("st-phone").getBoundingClientRect(), k = SM().W / r.width; return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k }; };
  function pick(p) {
    const SE = ST.SE; if (!SE.spec) return null; const act = SM().activeAt(SE.spec, SE.t).filter((x) => x.track.kind === "text" || x.track.kind === "media").reverse();
    for (const x of act) { const r = SE.handle.rectOf(x.clip.id); if (r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return x.clip.id; } return null;
  }
  function hitDown(e) {
    const SE = ST.SE; if (!SE || !SE.spec) { toggle(); return; } const p = stagePoint(e), id = pick(p); if (!id) { if (SE.sel) ST.select(null); else toggle(); return; }
    if (SE.sel !== id) ST.select(id); const f = SM().findClip(SE.spec, id); if (!f) return; pause();
    const isText = f.track.kind === "text", o = isText ? { x: (f.clip.style || {}).x != null ? f.clip.style.x : 540, y: (f.clip.style || {}).y != null ? f.clip.style.y : 900 } : { x: (f.clip.box || {}).x || 0, y: (f.clip.box || {}).y || 0 };
    const start = SE.spec; let moved = false, raf = 0, last = null; e.target.setPointerCapture(e.pointerId);
    const apply = () => { raf = 0; if (!last) return; const nx = Math.round(o.x + (last.x - p.x)), ny = Math.round(o.y + (last.y - p.y)); const next = SM().updateClip(start, id, isText ? { style: { x: nx, y: ny } } : { box: { x: nx, y: ny } }); SE.spec = next; SE.handle.rebuild(next); SE.handle.seek(SE.t); renderSelection(); };
    const move = (ev) => { last = stagePoint(ev); if (Math.abs(last.x - p.x) + Math.abs(last.y - p.y) > 4) moved = true; if (moved && !raf) raf = requestAnimationFrame(apply); };
    const up = () => { e.target.removeEventListener("pointermove", move); e.target.removeEventListener("pointerup", up); if (raf) cancelAnimationFrame(raf); if (moved) { const fin = SE.spec; SE.spec = start; ST.commit(fin, isText ? "Moví un texto" : f.clip.type === "card" ? "Moví una tarjeta" : "Moví una imagen", { keepPanel: true }); } };
    e.target.addEventListener("pointermove", move); e.target.addEventListener("pointerup", up);
  }

  // ---------- linea de tiempo (limpia: iconos por pista, acciones solo con algo elegido) ----------
  const ROW = 30, LANE = { video: ["Video", "film"], background: ["Fondo", "bg"], text: ["Texto", "type"], subtitles: ["Subtítulos", "captions"], media: ["Imágenes", "photo"], sfx: ["Sonido", "volume"], notes: ["Notas", "note"] };
  function clipText(k, c) {
    if (k === "text") return c.text || "Texto"; if (k === "background") return { original: "Original", "black-glow": "Negro con luz", solid: "Color", gradient: "Degradado", photo: "Foto", anim: "Animación · " + ((c.props || {}).name || "") }[c.type] || "Fondo";
    if (k === "media") return c.type === "card" ? "Tarjeta · " + ((c.card || {}).kicker || "") : "Imagen"; return c.sfx || "whoosh";
  }
  ST.clipText = clipText;
  function pack(clips) {
    const rows = []; const out = clips.slice().sort((a, b) => a.t - b.t).map((c) => { let r = rows.findIndex((end) => end <= c.t + 0.001); if (r < 0) { r = rows.length; rows.push(0); } rows[r] = SM().clipEnd(c) + (c.d == null ? 0.3 : 0); return { c, r }; });
    return { items: out, n: Math.max(1, rows.length) };
  }
  function legacyLines(v) {
    const caps = (v && v.caps) || [], fps = (v && v.capFps) || 30, out = []; let cur = null;
    caps.forEach((w) => { const s = w[1] / fps, e = w[2] / fps; if (!cur || s - cur.e > 0.7 || cur.words >= 7) { cur = { s, e, text: "", words: 0 }; out.push(cur); } cur.text += (cur.text ? " " : "") + w[0]; cur.e = e; cur.words++; });
    return out;
  }
  ST.legacyLines = legacyLines;
  function laneDefs() {
    const SE = ST.SE, s = SE.spec, lanes = [], d = dur();
    lanes.push({ kind: "video", n: 1, items: [{ c: { id: "__video", t: 0, d }, r: 0, text: s ? "Video original" + (s.base && s.base.cutout ? " · persona recortada" : "") : "Video" }] });
    if (!s) { const lines = legacyLines(video()); lanes.push({ kind: "subtitles", n: 1, segs: lines.map((l) => [l.s, l.e, l.text]) }); lanes.push({ kind: "notes", n: 1, items: S.notes.filter((n) => n.video === SE.vid && typeof n.t === "number").map((n) => ({ c: { id: "note_" + n.id, t: n.t, d: 0.6 }, r: 0, text: n.text || "Nota" })) }); return lanes; }
    const bg = SM().trackOfKind(s, "background"), tx = s.tracks.filter((t) => t.kind === "text").flatMap((t) => t.clips), md = s.tracks.filter((t) => t.kind === "media").flatMap((t) => t.clips), sf = SM().trackOfKind(s, "sfx"), sb = SM().trackOfKind(s, "subtitles");
    const pk = (cl, k) => { const p = pack(cl); return { kind: k, n: p.n, items: p.items.map((x) => ({ c: x.c, r: x.r, text: clipText(k, x.c) })) }; };
    lanes.push(pk(bg ? bg.clips : [], "background")); lanes.push(pk(tx, "text")); lanes.push({ kind: "subtitles", n: 1, segs: sb ? sb.lines.map((l) => [l[0], l[1], l[2]]) : [] });
    lanes.push(pk(md, "media")); lanes.push({ kind: "sfx", n: 1, items: (sf ? sf.clips : []).map((c) => ({ c, r: 0, text: "" })) });
    return lanes;
  }
  ST.renderTimeline = function () {
    const SE = ST.SE, root = E("st-tl"); if (!root || !SE) return; const d = dur();
    if (!d) { root.innerHTML = `<div class="st-tlh"><span class="faint">Cargando el video…</span></div><div></div>`; return; }
    const lanes = laneDefs(), lanesH = lanes.reduce((a, ln) => a + ln.n * ROW, 0), stx = E("st");
    // la linea de tiempo mide lo que necesita (sin pistas cortadas) y, mientras no se haga zoom a mano, ocupa todo el ancho
    if (stx) stx.style.setProperty("--tl-h", Math.round(Math.max(150, Math.min(innerHeight * 0.38, 46 + 24 + lanesH + 14))) + "px");
    if (SE.fit !== false) { const avail = (root.clientWidth || innerWidth) - (innerWidth < 760 ? 34 : 44) - 70; if (avail > 100) SE.zoom = Math.max(18, Math.min(200, avail / d)); }
    const k = SE.zoom, width = Math.max(d * k + 60, 300), oldSc = root.querySelector(".st-scroll"), keepL = oldSc ? oldSc.scrollLeft : 0, keepT = oldSc ? oldSc.scrollTop : 0;
    const step = k >= 90 ? 1 : k >= 45 ? 2 : k >= 24 ? 5 : 10; let ticks = ""; for (let t = 0; t <= d; t += step) ticks += `<span class="st-tick" style="left:${t * k}px">${fmtShort(t)}</span>`;
    const laneHtml = lanes.map((ln) => {
      const h = ln.n * ROW; let inner = "";
      if (ln.segs) inner = ln.segs.map((g, i) => `<span class="st-sub-seg" data-seg="${i}" style="left:${g[0] * k}px;width:${Math.max(3, (g[1] - g[0]) * k - 2)}px" title="${esc(g[2])}"></span>`).join("");
      else inner = ln.items.map(({ c, r, text }) => { const kind = ln.kind, w = Math.max(c.d == null ? 12 : 8, (c.d == null ? 0.3 : c.d) * k), editable = kind !== "video" && kind !== "notes"; return `<div class="st-clip" data-id="${esc(c.id)}" data-k="${kind}" data-sel="${SE.sel === c.id ? 1 : 0}" style="left:${c.t * k}px;width:${w}px;top:${r * ROW + 4}px;height:${ROW - 8}px" ${text ? `title="${esc(text)}"` : ""}>${editable && kind !== "sfx" ? '<span class="h l"></span>' : ""}${kind === "sfx" ? "" : `<span class="tx">${esc(text)}</span>`}${editable && kind !== "sfx" ? '<span class="h r"></span>' : ""}</div>`; }).join("");
      return `<div class="st-lane" data-lane="${ln.kind}" style="height:${h}px;width:${width}px">${inner}</div>`;
    }).join("");
    const lbl = lanes.map((ln) => `<div class="st-lb" style="height:${ln.n * ROW}px" title="${LANE[ln.kind][0]}">${icon(LANE[ln.kind][1])}</div>`).join("");
    const selActs = SE.sel && SE.spec && SE.sel !== "subs" ? `<div class="st-selacts"><button class="iconbtn sm" id="st-split" type="button" title="Cortar en el cursor (S)" aria-label="Cortar">${icon("scissors")}</button><button class="iconbtn sm" id="st-dup" type="button" title="Duplicar (D)" aria-label="Duplicar">${icon("copy")}</button><button class="iconbtn sm bad" id="st-del" type="button" title="Borrar" aria-label="Borrar">${icon("trash")}</button></div>` : `<span class="st-tlhint">${SE.spec ? "Arrastra un clip para moverlo · estira sus bordes" : "Versión anterior: la línea de tiempo es de lectura"}</span>`;
    root.innerHTML = `<div class="st-tlh">${selActs}<span class="sp"></span><button class="iconbtn sm ghost" id="st-zout" type="button" aria-label="Alejar">${icon("minus")}</button><button class="iconbtn sm ghost" id="st-fit" type="button" title="Ajustar al ancho" aria-label="Ajustar">${icon("frame")}</button><button class="iconbtn sm ghost" id="st-zin" type="button" aria-label="Acercar">${icon("plus")}</button></div>
      <div class="st-tlw"><div class="st-lbls" id="st-lbls">${lbl}</div><div class="st-scroll" id="st-scroll"><div class="st-ruler" id="st-ruler" style="width:${width}px">${ticks}</div><div class="st-lane-area" style="width:${width}px">${laneHtml}<div class="st-head" id="st-head"></div></div></div></div>`;
    const sc = E("st-scroll"); sc.scrollLeft = keepL; sc.scrollTop = keepT; sc.addEventListener("scroll", () => { E("st-lbls").style.transform = `translateY(${-sc.scrollTop}px)`; });
    sc.addEventListener("wheel", (e) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); SE.fit = false; SE.zoom = Math.max(18, Math.min(200, SE.zoom * (e.deltaY < 0 ? 1.12 : 0.89))); ST.renderTimeline(); }, { passive: false });
    E("st-zin").addEventListener("click", () => { SE.fit = false; SE.zoom = Math.min(200, SE.zoom * 1.3); ST.renderTimeline(); });
    E("st-zout").addEventListener("click", () => { SE.fit = false; SE.zoom = Math.max(18, SE.zoom / 1.3); ST.renderTimeline(); });
    E("st-fit").addEventListener("click", () => { SE.fit = true; ST.renderTimeline(); });
    const sp = E("st-split"); if (sp) sp.addEventListener("click", () => ST.commit(SM().splitClip(SE.spec, SE.sel, SE.t), "Corté un clip"));
    const du = E("st-dup"); if (du) du.addEventListener("click", () => { const r = SM().duplicateClip(SE.spec, SE.sel); ST.commit(r.spec, "Dupliqué un clip"); if (r.id) ST.select(r.id); });
    const de = E("st-del"); if (de) de.addEventListener("click", () => { ST.commit(SM().removeClip(SE.spec, SE.sel), "Quité un clip"); ST.select(null); });
    E("st-ruler").addEventListener("pointerdown", rulerDown); sc.querySelector(".st-lane-area").addEventListener("pointerdown", laneDown); movePlayhead();
  };
  function movePlayhead() {
    const SE = ST.SE, h = E("st-head"); if (!h || !SE) return; h.style.transform = `translateX(${SE.t * SE.zoom}px)`;
    const sc = E("st-scroll"); if (sc && SE.handle && !SE.handle.video.paused) { const x = SE.t * SE.zoom; if (x > sc.scrollLeft + sc.clientWidth - 40 || x < sc.scrollLeft) sc.scrollLeft = Math.max(0, x - 80); }
  }
  function rulerDown(e) { const r = E("st-ruler"); pause(); const at = (ev) => (ev.clientX - r.getBoundingClientRect().left) / ST.SE.zoom; seek(at(e)); r.setPointerCapture(e.pointerId); const mv = (ev) => seek(at(ev)); const up = () => { r.removeEventListener("pointermove", mv); r.removeEventListener("pointerup", up); }; r.addEventListener("pointermove", mv); r.addEventListener("pointerup", up); }
  function snap(t, skipId) {
    const SE = ST.SE, pts = [0, SE.t, SE.spec ? SE.spec.duration : 0]; SM().allClips(SE.spec).forEach((x) => { if (x.clip.id !== skipId) { pts.push(x.clip.t); if (x.clip.d != null) pts.push(SM().clipEnd(x.clip)); } });
    const tol = 8 / SE.zoom; let best = t, bd = tol; pts.forEach((p) => { const d = Math.abs(p - t); if (d < bd) { bd = d; best = p; } }); return SM().q(best);
  }
  function laneDown(e) {
    const SE = ST.SE, seg = e.target.closest(".st-sub-seg");
    if (seg && SE) { const g = laneDefs().find((l) => l.kind === "subtitles"); if (g && g.segs[+seg.dataset.seg]) { pause(); seek(g.segs[+seg.dataset.seg][0] + 0.02); } ST.openTool(SE.spec ? "subtitulos" : "transcripcion"); return; }
    const el = e.target.closest(".st-clip"); if (!el) { const lane = e.target.closest(".st-lane"); if (lane) { pause(); seek((e.clientX - lane.getBoundingClientRect().left) / SE.zoom); } if (SE.sel) ST.select(null); return; }
    if (el.dataset.k === "video" || el.dataset.k === "notes") { pause(); seek(el.dataset.k === "notes" ? (S.notes.find((n) => "note_" + n.id === el.dataset.id) || {}).t || 0 : (e.clientX - el.parentElement.getBoundingClientRect().left) / SE.zoom); return; }
    if (!SE.spec) return; const id = el.dataset.id, f = SM().findClip(SE.spec, id); if (!f) return; if (SE.sel !== id) ST.select(id); pause();
    const live = () => E("st-tl").querySelector(`.st-clip[data-id="${CSS.escape(id)}"]`) || el, target = live();
    const mode = e.target.classList.contains("h") ? (e.target.classList.contains("l") ? "l" : "r") : "m", x0 = e.clientX, o = { t: f.clip.t, d: f.clip.d == null ? 0.3 : f.clip.d }, start = SE.spec; let moved = false, raf = 0, last = null;
    target.setPointerCapture(e.pointerId); target.classList.add("drag");
    const apply = () => { raf = 0; if (!last) return; const dt = (last - x0) / SE.zoom; let t = o.t, d = o.d;
      if (mode === "m") t = Math.max(0, Math.min(SE.spec.duration - 0.2, snap(o.t + dt, id)));
      else if (mode === "l") { const nt = Math.min(o.t + o.d - 0.2, Math.max(0, snap(o.t + dt, id))); d = o.d - (nt - o.t); t = nt; }
      else { const ne = Math.max(o.t + 0.2, Math.min(SE.spec.duration, snap(o.t + o.d + dt, id))); d = ne - o.t; }
      target.style.left = t * SE.zoom + "px"; if (f.clip.d != null) target.style.width = Math.max(8, d * SE.zoom) + "px";
      const next = SM().updateClip(start, id, f.clip.d == null || mode === "m" ? { t } : { t, d: SM().q(d) }); SE.spec = next; SE.handle.rebuild(next); SE.handle.seek(SE.t); renderSelection(); };
    const move = (ev) => { last = ev.clientX; if (Math.abs(last - x0) > 3) moved = true; if (moved && !raf) raf = requestAnimationFrame(apply); };
    const up = () => { target.removeEventListener("pointermove", move); target.removeEventListener("pointerup", up); target.classList.remove("drag"); if (raf) cancelAnimationFrame(raf); if (moved) { const fin = SE.spec; SE.spec = start; ST.commit(fin, mode === "m" ? "Moví un clip" : "Cambié la duración de un clip", { keepPanel: true }); } };
    target.addEventListener("pointermove", move); target.addEventListener("pointerup", up);
  }
  ST.snap = snap;

  // datos nuevos de las colecciones del Estudio
  ST.onData = function (kinds) {
    const SE = ST.SE; if (!SE) return false;
    if (kinds.has("studio_versions")) { if (SE.spec) ST.remoteChanged(); else if (hasSpec(SE.vid) && Date.now() - SE.openedAt > 4000) { const id = SE.vid; teardown(); ST.open(id); App.toast("Claude dejó listo el editor completo. Ya puedes editar a mano."); return true; } }
    if (kinds.has("studio_transcripts")) { ST.renderTimeline(); if (SE.tool === "transcripcion") ST.renderInspector(); }
    if (kinds.has("studio_requests") || kinds.has("studio_media_feedback")) ST.refreshPanes();
    if (kinds.has("downloads") && SE.tool === "exportar") ST.refreshPanes(); // la capacidad downloads puede resolver despues de abrir el panel
    ST.renderTop(); return true;
  };
})();
