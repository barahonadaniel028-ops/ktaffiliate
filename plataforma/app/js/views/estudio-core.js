/* Aura · Estudio (nucleo): editor de video sobre el MISMO motor del portal (StudioModel / StudioRules / StudioLib / StudioRenderer).
   Piel nueva de vidrio; misma logica de edicion: deshacer, guardado con revision, reglas, linea de tiempo con iman, seleccion y arrastre en el cuadro. */
(function () {
  "use strict";
  const App = window.App, S = App.S, sel = App.sel, { esc, icon, plural } = App;
  const E = (id) => document.getElementById(id);
  const SM = () => window.StudioModel, SRu = () => window.StudioRules, SLib = () => window.StudioLib, SRn = () => window.StudioRenderer;
  const ST = (App.st = { SE: null, MAX_VERSIONS: 7 });
  const fmtTc = (t) => { t = Math.max(0, t || 0); const m = Math.floor(t / 60), s = Math.floor(t % 60), f = Math.floor((t % 1) * 30); return `${App.pad(m)}:${App.pad(s)}:${App.pad(f)}`; };
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
    const v = sel.video(vid), id = App.uid("req"), SE = ST.SE;
    const req = Object.assign({ videoId: vid, project: v ? v.piece : "", brand: v ? v.brand : "", kind, text, scope: "video", targets: [], status: "pedido", steps: [], at: nowIso(), by: S.userId || "", rev: (ver(vid) || {}).rev || 0 }, extra || {});
    if (!(await ST.write("studio_requests", id, req))) return null;
    const what = { export: "EXPORTAR", abrir: "ABRIR EN EL ESTUDIO", version: "NUEVA VERSIÓN" }[kind] || "CAMBIO";
    const detail = [`versión en studio_versions/${vid} rev ${req.rev}`, req.scope && req.scope !== "video" ? `alcance ${req.scope}${req.targets && req.targets.length ? " (" + req.targets.join(", ") + ")" : ""}` : "", req.at_time != null ? `parado en ${req.at_time}s` : "", req.export ? `formato ${req.export.format}${req.export.quality ? " calidad " + req.export.quality : ""}` : "", req.style ? `estilo ${req.style}` : ""].filter(Boolean).join(", ");
    App.data.tell(`PEDIDO DEL ESTUDIO (${what}) sobre ${v ? sel.label(v) : vid} (studio_requests/${id}; ${detail}): "${text}". Primero escribe la lista de pasos en \`steps\` (cada uno {id, text, status:"pendiente"}), después hazlos uno por uno actualizando el estado de cada paso (haciendo, hecho, error) y al final status "listo" con una respuesta corta en \`reply\`. Se ve en vivo. Sin que te lo repita.`);
    return id;
  };

  // ---------- inicio del Estudio: lista de videos ----------
  App.views.estudio = {
    title: "Estudio", wide: true,
    render(r) {
      const b = sel.brand(), groups = sel.groupByPiece(S.videos.filter((v) => v.brand === b.id && !v.published && !v.demo));
      const head = `<div class="vhead"><div class="t"><span class="eyebrow">${esc(b.name)}</span><h1 class="h-l">${App.say("Elegí un video y <em>editalo</em>", "Elige un video y <em>edítalo</em>")}</h1><p class="muted">Textos, fondos, transiciones y subtítulos con vista previa exacta: lo que ves es lo que se exporta. Claude te ayuda con lo que pidas.</p></div></div>`;
      if (!groups.length) return head + `<div class="empty card lg"><span class="orb"></span><h3>No hay videos para editar</h3><p>Cuando haya piezas en ${esc(b.name)} aparecen aquí.</p><a class="btn pri" href="#crear">Pedir un video</a></div>`;
      return head + `<div class="st-home rise">${groups.map((g) => `<section class="card lg"><div class="ch"><b>${esc(g.name)}</b><span class="sp"></span><span class="faint">${g.vs.length} ${plural(g.vs.length, "versión", "versiones")}</span></div><div class="st-vrow">${g.vs.map((v) => {
        const act = reqsOf(v.id).filter((q) => !isDone(q)).length, spec = hasSpec(v.id);
        return `<a class="st-vc2" href="#estudio/${encodeURIComponent(v.id)}" data-go="estudio/${encodeURIComponent(v.id)}">${App.vidThumb(v, { cap: false, style: "width:100%;aspect-ratio:9/16" })}<span class="vn">v${v.version}</span>${act ? `<span class="chip apricot w">Claude · ${act}</span>` : spec ? `<span class="chip good w">Editor completo</span>` : `<span class="chip w">Revisar</span>`}</a>`; }).join("")}</div></section>`).join("")}</div>`;
    },
    update(kinds) { return false; },
  };
  // la ruta #estudio/<id> abre el editor encima; salir del estudio lo cierra
  App.studioRoute = function () {
    const r = App.route(), id = r.name === "estudio" ? r.args[0] : null;
    if (!id) { if (ST.SE) ST.close(true); return; }
    if (!sel.video(id)) return;
    if (!ST.SE || ST.SE.vid !== id) ST.open(id); else { E("st").hidden = false; ST.renderTop(); }
  };

  // ---------- montar el editor ----------
  function shell() {
    return `<header class="st-top lg"><button class="iconbtn" id="st-back" type="button" aria-label="Volver al Estudio">${icon("chevleft")}</button><h2 id="st-title"></h2><div class="st-vers" id="st-vers" role="group" aria-label="Versiones"></div><span class="sp"></span>
      <span class="st-save" id="st-save" data-s="ok" role="status">Guardado</span>
      <button class="iconbtn sm" id="st-undo" type="button" title="Deshacer (⌘Z)" aria-label="Deshacer">${icon("undo")}</button><button class="iconbtn sm" id="st-redo" type="button" title="Rehacer (⇧⌘Z)" aria-label="Rehacer">${icon("redo")}</button>
      <button class="btn sm" id="st-rules" type="button">${icon("shield")}Reglas <span class="st-badge ok" id="st-rbadge">✓</span></button>
      <button class="btn sm st-libbtn" id="st-lib-btn" type="button">${icon("book")}Biblioteca</button>
      <button class="btn sm" id="st-ask-btn" type="button">${icon("sparkles")}Pedirle a Claude</button><button class="btn sm" id="st-exp-btn" type="button">${icon("download")}Exportar</button>
      <span class="st-appr" id="st-appr" role="group" aria-label="Decisión"></span></header>
      <div class="st-body"><aside class="st-left lg" aria-label="Biblioteca del Estudio"><nav class="st-tabs" id="st-ltabs" role="tablist"></nav><div class="st-pane" id="st-lpane"></div></aside>
        <section class="st-center" aria-label="Vista previa"><div id="st-banner" class="st-bnr"></div><div class="st-stagewrap" id="st-wrap"><div class="st-phone" id="st-phone"><div id="st-stage"></div><div class="st-hit" id="st-hit"></div><div class="st-sel" id="st-selbox"></div></div></div>
          <div class="st-tools lg"><button class="iconbtn sm" id="st-play" type="button" aria-label="Reproducir o pausar (Espacio)">${icon("play")}</button><button class="iconbtn sm" id="st-prev" type="button" aria-label="Un cuadro atrás">${icon("chevleft")}</button><button class="iconbtn sm" id="st-next" type="button" aria-label="Un cuadro adelante">${icon("chevron")}</button>
            <input class="st-scrub" id="st-scrub" type="range" min="0" max="1" step="0.01" value="0" aria-label="Posición del video"><span class="st-tc num" id="st-tc">00:00:00</span>
            <button class="chip tgl" id="st-safe" type="button" aria-pressed="false">${icon("frame")}Zona segura</button><button class="chip tgl" id="st-mute" type="button" aria-pressed="false">${icon("mute")}Silencio</button></div></section>
        <aside class="st-right lg" aria-label="Panel"><nav class="st-tabs" id="st-rtabs" role="tablist"></nav><div class="st-pane" id="st-rpane"></div></aside></div>
      <section class="st-tl lg" id="st-tl" aria-label="Línea de tiempo"></section>
      <nav class="st-dock lg" id="st-dock" aria-label="Acciones del Estudio"><button type="button" data-dk="lib">${icon("book")}<span>Biblioteca</span></button><button type="button" data-dk="panel">${icon("settings")}<span>Ajustes</span></button><button type="button" data-dk="claude">${icon("sparkles")}<span>Claude</span></button><button type="button" data-dk="rules">${icon("shield")}<span>Reglas</span></button><button type="button" data-dk="exp">${icon("download")}<span>Exportar</span></button><button type="button" data-dk="decide">${icon("check")}<span>Decidir</span></button></nav><div id="st-modal"></div>`;
  }
  function ensureShell() {
    let el = E("st");
    if (!el) { el = document.createElement("div"); el.id = "st"; el.className = "stx"; el.hidden = true; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Estudio"); el.innerHTML = shell(); document.getElementById("stmount").appendChild(el); wireShell(); }
    return el;
  }
  const video = () => (ST.SE ? sel.video(ST.SE.vid) : null);
  ST.video = video;

  ST.open = function (vid) {
    const v = sel.video(vid); if (!v) return;
    if (!window.StudioModel || !window.gsap) { App.toast("El motor del Estudio no cargó. Revisa tu conexión y recarga."); App.go("estudio", { replace: true }); return; }
    if (ST.SE) teardown();
    const doc = ver(vid), spec = doc && doc.spec ? SM().clone(doc.spec) : null;
    ST.SE = { vid, spec, rev: doc ? doc.rev || 0 : 0, hist: SM().createHistory(100), sel: null, t: 0, zoom: 60, safe: false, muted: false, rtab: App.store.get("st-rtab", "ajustes"), ltab: "fondos", handle: null, dirty: false, qa: null, log: doc && doc.log ? doc.log.slice() : [], mode: spec ? "spec" : "legacy", raf: 0, saveT: 0, ruleT: 0, openedAt: Date.now() };
    ensureShell(); E("st").hidden = false; E("st").classList.remove("lib-open", "panel-open"); App.studioOpen = true; document.body.style.overflow = "hidden"; App.updateSendBar();
    if (v.brand !== App.ui.brandId) sel.setBrand(v.brand);
    ST.renderTop(); ST.renderRight(); ST.renderLeft(); ST.renderBanner();
    (spec ? mountPreview() : mountLegacy()).then(() => { fit(); ST.renderTimeline(); runRules(); seek(0); }).catch((e) => { App.toast("No se pudo abrir la vista previa: " + (e && e.message ? e.message : e)); });
  };
  function teardown() { const SE = ST.SE; if (!SE) return; saveNow(); cancelAnimationFrame(SE.raf); try { if (SE.handle && SE.handle.destroy) SE.handle.destroy(); } catch (e) { /* ya cerrado */ } const s = E("st-stage"); if (s) s.innerHTML = ""; ST.SE = null; }
  ST.close = function (silent) {
    if (!ST.SE) return; teardown(); const el = E("st"); if (el) el.hidden = true; App.studioOpen = false; document.body.style.overflow = ""; App.updateSendBar();
    if (!silent) App.go("estudio");
  };
  ST.teardown = teardown;

  // ---------- vista previa ----------
  async function mountPreview() { const SE = ST.SE; SE.handle = await SRn().mount(E("st-stage"), SE.spec, { mode: "preview", assetUrl: (id) => App.adapter().assetUrl(id), safe: SE.safe, audio: true }); bindMedia(); }
  async function mountLegacy() {
    const SE = ST.SE, v = video(), vd = document.createElement("video"); vd.className = "legacy"; vd.playsInline = true; vd.preload = "auto"; vd.src = sel.src(v); const st = E("st-stage"); st.innerHTML = ""; st.appendChild(vd);
    SE.handle = { video: vd, cut: document.createElement("video"), seek() {}, rectOf() { return null; }, rebuild() {}, setSafe() {}, destroy() {}, scaleTo() {}, duration: 0 }; bindMedia();
    vd.addEventListener("loadedmetadata", () => { SE.handle.duration = vd.duration; ST.renderTimeline(); E("st-scrub").max = vd.duration; });
  }
  function bindMedia() {
    const SE = ST.SE, h = SE.handle, v = h.video; E("st-scrub").max = (SE.spec ? SE.spec.duration : v.duration) || 1;
    v.addEventListener("seeked", () => tick(v.currentTime, true)); v.addEventListener("ended", pause);
    v.addEventListener("play", () => { E("st-play").innerHTML = icon("pause"); }); v.addEventListener("pause", () => { E("st-play").innerHTML = icon("play"); });
  }
  function fit() {
    const SE = ST.SE; if (!SE) return; const wrap = E("st-wrap"), ph = E("st-phone"), aw = wrap.clientWidth - 4, ah = wrap.clientHeight - 4; if (aw <= 0 || ah <= 0) return;
    const px = Math.max(150, Math.min(aw, Math.floor((ah * 9) / 16))); ph.style.width = px + "px"; ph.style.height = Math.round((px * 16) / 9) + "px";
    if (SE.handle && SE.handle.scaleTo && SE.spec) SE.handle.scaleTo(px); SE.px = px; renderSelection();
  }
  function play() { const SE = ST.SE; if (!SE || !SE.handle) return; const h = SE.handle; if (h.video.ended) seek(0); h.cut.currentTime = h.video.currentTime; h.video.play().catch(() => {}); if (SE.spec) h.cut.play().catch(() => {}); cancelAnimationFrame(SE.raf); const loop = () => { if (!ST.SE) return; tick(h.video.currentTime); if (!h.video.paused && !h.video.ended) SE.raf = requestAnimationFrame(loop); }; loop(); }
  function pause() { const SE = ST.SE; if (!SE || !SE.handle) return; SE.handle.video.pause(); SE.handle.cut.pause(); cancelAnimationFrame(SE.raf); }
  const toggle = () => { const SE = ST.SE; if (!SE || !SE.handle) return; SE.handle.video.paused ? play() : pause(); };
  function seek(t) { const SE = ST.SE; if (!SE || !SE.handle) return; const dur = (SE.spec ? SE.spec.duration : SE.handle.video.duration) || 0; t = Math.max(0, Math.min(dur || 1e9, t)); SE.handle.video.currentTime = t; if (SE.spec) SE.handle.cut.currentTime = t; tick(t, true); }
  function tick(t, force) {
    const SE = ST.SE; if (!SE) return; SE.t = t; const h = SE.handle;
    if (SE.spec) { h.seek(t); if (!h.cut.paused && Math.abs(h.cut.currentTime - t) > 0.12) h.cut.currentTime = t; }
    const sc = E("st-scrub"); if (sc && !sc.matches(":active")) sc.value = t; const tc = E("st-tc"); if (tc) tc.textContent = fmtTc(t);
    movePlayhead(); if (force || SE.sel) renderSelection(); if (ST.highlightTranscript) ST.highlightTranscript();
  }
  function renderSelection() {
    const SE = ST.SE, box = E("st-selbox"); if (!box) return; box.style.display = "none"; if (!SE || !SE.sel || !SE.handle || !SE.spec) return;
    const f = SM().findClip(SE.spec, SE.sel); if (!f || !(f.track.kind === "text" || f.track.kind === "media")) return; if (!(f.clip.t <= SE.t && SE.t < SM().clipEnd(f.clip) + 0.04)) return;
    const r = SE.handle.rectOf(SE.sel), k = (SE.px || 300) / SM().W; if (!r) return; Object.assign(box.style, { display: "block", left: r.x * k - 3 + "px", top: r.y * k - 3 + "px", width: r.w * k + 6 + "px", height: r.h * k + 6 + "px" });
  }
  Object.assign(ST, { fit, play, pause, toggle, seek, tick, renderSelection });

  // ---------- edicion: confirmar, deshacer, guardar ----------
  ST.commit = function (next, text, o) {
    const SE = ST.SE; if (!SE || !SE.spec || next === SE.spec) return; o = o || {};
    SE.hist.push(SE.spec); SE.spec = next; SE.dirty = true; if (text) SE.log = [{ at: nowIso(), text, by: "usuario" }, ...SE.log].slice(0, 40);
    SE.handle.rebuild(next); SE.handle.seek(SE.t); E("st-scrub").max = next.duration; afterEdit(o);
  };
  function afterEdit(o) { const SE = ST.SE; o = o || {}; ST.renderTimeline(); renderSelection(); saveState("saving"); clearTimeout(SE.saveT); SE.saveT = setTimeout(saveNow, 800); clearTimeout(SE.ruleT); SE.ruleT = setTimeout(runRules, 350); undoState(); if (!o.keepPanel) ST.renderRight(); }
  function undo() { const SE = ST.SE; if (!SE || !SE.spec) return; const p = SE.hist.undo(SE.spec); if (!p) return; SE.spec = p; SE.dirty = true; SE.handle.rebuild(p); SE.handle.seek(SE.t); afterEdit(); App.toast("Deshecho."); }
  function redo() { const SE = ST.SE; if (!SE || !SE.spec) return; const p = SE.hist.redo(SE.spec); if (!p) return; SE.spec = p; SE.dirty = true; SE.handle.rebuild(p); SE.handle.seek(SE.t); afterEdit(); App.toast("Rehecho."); }
  function undoState() { const SE = ST.SE, u = E("st-undo"), r = E("st-redo"); if (u) u.disabled = !SE || !SE.spec || !SE.hist.canUndo(); if (r) r.disabled = !SE || !SE.spec || !SE.hist.canRedo(); }
  function saveState(s) { const e = E("st-save"); if (!e) return; e.dataset.s = s; e.textContent = s === "saving" ? "Guardando…" : s === "error" ? "No se pudo guardar" : "Guardado"; }
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
  Object.assign(ST, { undo, redo, saveNow, afterEdit });

  // ---------- reglas de diseno ----------
  const speechSeconds = () => { const tr = trans((video() || {}).piece); return tr && tr.lines ? tr.lines.reduce((a, l) => a + Math.max(0, l.e - l.s), 0) : 0; };
  function runRules() {
    const SE = ST.SE; if (!SE) return; const b = E("st-rbadge"); if (!SE.spec) { if (b) { b.textContent = "–"; b.className = "st-badge ok"; } return; }
    SE.qa = SRu().check(SE.spec, { speechSeconds: speechSeconds() }); if (!b) return;
    b.textContent = SE.qa.errors ? String(SE.qa.errors) : SE.qa.warns ? String(SE.qa.warns) : "✓"; b.className = "st-badge" + (SE.qa.errors ? "" : SE.qa.warns ? " warn" : " ok");
  }
  ST.modal = function (html) {
    const md = E("st-modal"); if (!html) { md.innerHTML = ""; return; } md.innerHTML = `<div class="st-modal" role="dialog" aria-modal="true"><div class="lg solid-glass">${html}</div></div>`;
    md.querySelectorAll("[data-st-close]").forEach((b) => b.addEventListener("click", () => { md.innerHTML = ""; })); md.querySelector(".st-modal").addEventListener("click", (e) => { if (e.target.classList.contains("st-modal")) md.innerHTML = ""; });
    const f = md.querySelector("button, input, textarea"); if (f) f.focus();
  };
  function rulesModal() {
    const SE = ST.SE;
    if (!SE || !SE.spec) { ST.modal(`<h3>Reglas de diseño</h3><p class="st-hint">Este video se hizo con el motor anterior, así que no se puede revisar a mano. Pásalo al editor completo y se revisa solo.</p><div class="st-acts"><button class="btn" data-st-close type="button">Cerrar</button></div>`); return; }
    runRules(); const q = SE.qa, fixable = q.findings.filter((f) => f.fix);
    ST.modal(`<h3>Reglas de diseño</h3><p class="st-hint">${q.ok && !q.warns ? "Todo cumple. Puedes renderizar tranquilo." : `${q.errors} para arreglar y ${q.warns} para mirar.`}</p>
      <div class="st-rules">${q.findings.map((f, i) => `<div class="st-rl" data-l="${f.level}"><span>${f.level === "error" ? "✕" : "!"}</span><span>${esc(f.msg)}</span>${f.fix ? `<button class="btn sm" data-st-fix="${i}" type="button">Arreglar</button>` : f.clipId ? `<button class="btn sm ghost" data-st-goto="${esc(f.clipId)}" type="button">Ver</button>` : "<span></span>"}</div>`).join("") || `<div class="st-rl"><span>✓</span><span>Zona segura, tamaños, subtítulos de una línea, idioma y sonido: todo bien.</span><span></span></div>`}</div>
      <div class="st-acts">${fixable.length ? `<button class="btn pri" data-st-fixall type="button">Arreglar todo lo automático (${fixable.length})</button>` : ""}<button class="btn" data-st-close type="button">Cerrar</button></div>`);
    const md = E("st-modal");
    md.querySelectorAll("[data-st-fix]").forEach((b) => b.addEventListener("click", () => { ST.commit(SRu().applyFix(SE.spec, q.findings[+b.dataset.stFix]), "Arreglé una regla"); rulesModal(); }));
    md.querySelectorAll("[data-st-goto]").forEach((b) => b.addEventListener("click", () => { ST.modal(""); ST.select(b.dataset.stGoto, true); }));
    const all = md.querySelector("[data-st-fixall]"); if (all) all.addEventListener("click", () => { let s = SE.spec; q.findings.filter((f) => f.fix).forEach((f) => { s = SRu().applyFix(s, f); }); ST.commit(s, "Arreglé las reglas automáticas"); rulesModal(); });
  }
  ST.renderBanner = function (html) {
    const SE = ST.SE, b = E("st-banner"); if (!b) return; const v = video();
    b.innerHTML = html ? `<div class="st-banner lg">${html}</div>` : SE && !SE.spec ? `<div class="st-banner lg"><b>Hecho con el motor anterior.</b> Aquí puedes ver el video, pedirle cambios a Claude y seguir su lista de pasos. Para editarlo a mano al instante, pide que lo pase al editor completo. <button class="btn sm pri" id="st-open-full" type="button">Abrir en el editor completo</button></div>` : "";
    const o = E("st-open-full"); if (o) o.onclick = async () => { o.disabled = true; const id = await ST.ask(SE.vid, "abrir", `Pasa ${v ? sel.label(v) : ""} al editor completo (arma la especificación con su video base, transcripción, subtítulos y textos actuales).`); App.toast(id ? "Pedido enviado. Mira la lista de pasos en la pestaña Claude." : "No se pudo enviar el pedido."); SE.rtab = "claude"; ST.renderRight(); };
  };

  // ---------- barra superior ----------
  ST.renderTop = function () {
    const SE = ST.SE, v = video(); if (!v || !SE) return; E("st-title").textContent = v.pieceName || v.piece || "Video";
    const sibs = sel.siblings(v), s = v.status || "pending";
    E("st-vers").innerHTML = sibs.map((x) => `<button class="st-vc" type="button" data-vid="${esc(x.id)}" data-s="${x.status || "pending"}" aria-current="${x.id === v.id}">v${x.version}<i></i></button>`).join("") + (sibs.length < ST.MAX_VERSIONS ? `<button class="st-vc" type="button" id="st-addver" title="Pedir otra versión (hasta ${ST.MAX_VERSIONS})">+</button>` : "");
    E("st-appr").innerHTML = [["approved", "Aprobar", "good", "check"], ["maybe", "Quizás", "mid", "help"], ["rejected", "Rechazar", "bad", "x"]].map(([k, t, c, ic]) => `<button class="btn sm ${c}" type="button" data-appr="${k}" aria-pressed="${s === k}" title="${t}">${icon(ic)}<span>${t}</span></button>`).join("");
    E("st-safe").setAttribute("aria-pressed", String(SE.safe)); E("st-mute").setAttribute("aria-pressed", String(SE.muted)); undoState();
  };
  function wireShell() {
    const st = E("st");
    E("st-back").addEventListener("click", () => ST.close());
    E("st-undo").addEventListener("click", undo); E("st-redo").addEventListener("click", redo); E("st-rules").addEventListener("click", rulesModal);
    E("st-lib-btn").addEventListener("click", () => { st.classList.toggle("lib-open"); st.classList.remove("panel-open"); });
    E("st-ask-btn").addEventListener("click", () => { ST.SE.rtab = "claude"; ST.renderRight(); st.classList.add("panel-open"); const t = E("st-ask-text"); if (t) t.focus(); });
    E("st-exp-btn").addEventListener("click", () => { ST.SE.rtab = "exportar"; ST.renderRight(); st.classList.add("panel-open"); });
    E("st-play").addEventListener("click", toggle); E("st-prev").addEventListener("click", () => { pause(); seek(ST.SE.t - 1 / 30); }); E("st-next").addEventListener("click", () => { pause(); seek(ST.SE.t + 1 / 30); });
    E("st-scrub").addEventListener("input", (e) => { pause(); seek(+e.target.value); });
    E("st-safe").addEventListener("click", () => { const SE = ST.SE; SE.safe = !SE.safe; if (SE.handle && SE.handle.setSafe) SE.handle.setSafe(SE.safe); E("st-safe").setAttribute("aria-pressed", String(SE.safe)); });
    E("st-mute").addEventListener("click", () => { const SE = ST.SE; SE.muted = !SE.muted; SE.handle.video.muted = SE.muted; E("st-mute").setAttribute("aria-pressed", String(SE.muted)); });
    E("st-vers").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; if (b.id === "st-addver") { ST.stylePicker("new"); return; } if (b.dataset.vid) App.go("estudio/" + encodeURIComponent(b.dataset.vid), { replace: true }); });
    E("st-appr").addEventListener("click", (e) => { const b = e.target.closest("[data-appr]"), v = video(); if (!b || !v) return; App.act.setStatus(v, v.status === b.dataset.appr ? "pending" : b.dataset.appr); ST.renderTop(); });
    E("st-hit").addEventListener("pointerdown", hitDown);
    E("st-dock").addEventListener("click", (e) => {
      const b = e.target.closest("[data-dk]"); if (!b) return; const k = b.dataset.dk, SE = ST.SE;
      if (k === "lib") { st.classList.toggle("lib-open"); st.classList.remove("panel-open"); }
      else if (k === "panel") { SE.rtab = SE.spec ? "ajustes" : "claude"; ST.renderRight(); st.classList.toggle("panel-open"); st.classList.remove("lib-open"); }
      else if (k === "claude") { SE.rtab = "claude"; ST.renderRight(); st.classList.add("panel-open"); st.classList.remove("lib-open"); }
      else if (k === "exp") { SE.rtab = "exportar"; ST.renderRight(); st.classList.add("panel-open"); st.classList.remove("lib-open"); }
      else if (k === "rules") rulesModal();
      else if (k === "decide") { const v = video(); ST.modal(`<h3>Decisión sobre v${v.version}</h3><p class="st-hint">${esc(sel.label(v))}. Aprobar es dejarla agendada.</p><div class="st-acts" style="flex-direction:column">${[["approved", "Aprobar", "good", "check"], ["maybe", "Quizás", "mid", "help"], ["rejected", "Rechazar", "bad", "x"]].map(([st2, t, c, ic]) => `<button class="btn lg2 ${c}" type="button" data-dec="${st2}">${icon(ic)}${t}</button>`).join("")}<button class="btn ghost" data-st-close type="button">Cancelar</button></div>`); E("st-modal").querySelectorAll("[data-dec]").forEach((x) => x.addEventListener("click", () => { App.act.setStatus(v, x.dataset.dec); ST.modal(""); ST.renderTop(); })); }
    });
    st.addEventListener("pointerdown", (e) => { if (!e.target.closest(".st-left, .st-right, .st-dock, .st-top, .st-modal")) st.classList.remove("lib-open", "panel-open"); });
    window.addEventListener("resize", fit); if (window.ResizeObserver) new ResizeObserver(fit).observe(E("st-wrap"));
    document.addEventListener("keydown", key);
  }
  function key(e) {
    const SE = ST.SE, el = E("st"); if (!SE || !el || el.hidden) return; const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "k") return;
    if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (e.key === "Escape") { if (E("st-modal").innerHTML) { ST.modal(""); return; } if (SE.sel) { ST.select(null); return; } if (!isTyping(e)) ST.close(); return; }
    if (isTyping(e) || mod) return;
    if (e.key === " ") { e.preventDefault(); toggle(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); pause(); seek(SE.t - (e.shiftKey ? 1 : 1 / 30)); }
    else if (e.key === "ArrowRight") { e.preventDefault(); pause(); seek(SE.t + (e.shiftKey ? 1 : 1 / 30)); }
    else if ((e.key === "s" || e.key === "S") && SE.sel && SE.spec) ST.commit(SM().splitClip(SE.spec, SE.sel, SE.t), "Corté un clip");
    else if ((e.key === "d" || e.key === "D") && SE.sel && SE.spec) { const r = SM().duplicateClip(SE.spec, SE.sel); ST.commit(r.spec, "Dupliqué un clip"); if (r.id) ST.select(r.id); }
    else if ((e.key === "Delete" || e.key === "Backspace") && SE.sel && SE.spec) { e.preventDefault(); ST.commit(SM().removeClip(SE.spec, SE.sel), "Quité un clip"); ST.select(null); }
  }

  // ---------- seleccion y arrastre en el cuadro ----------
  ST.select = function (id, seekTo) {
    const SE = ST.SE; if (!SE) return; SE.sel = id; if (id && seekTo && SE.spec) { const f = SM().findClip(SE.spec, id); if (f) { pause(); seek(f.clip.t + 0.05); } }
    if (id && SE.rtab !== "ajustes") SE.rtab = "ajustes"; ST.renderTimeline(); renderSelection(); ST.renderRight(); if (id) E("st").classList.add("panel-open");
  };
  const stagePoint = (e) => { const r = E("st-phone").getBoundingClientRect(), k = SM().W / r.width; return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k }; };
  function pick(p) {
    const SE = ST.SE; if (!SE.spec) return null; const act = SM().activeAt(SE.spec, SE.t).filter((x) => x.track.kind === "text" || x.track.kind === "media").reverse();
    for (const x of act) { const r = SE.handle.rectOf(x.clip.id); if (r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return x.clip.id; } return null;
  }
  function hitDown(e) {
    const SE = ST.SE; if (!SE || !SE.spec) return; const p = stagePoint(e), id = pick(p); if (!id) { if (SE.sel) ST.select(null); return; }
    if (SE.sel !== id) ST.select(id); const f = SM().findClip(SE.spec, id); if (!f) return; pause();
    const isText = f.track.kind === "text", o = isText ? { x: (f.clip.style || {}).x != null ? f.clip.style.x : 540, y: (f.clip.style || {}).y != null ? f.clip.style.y : 900 } : { x: (f.clip.box || {}).x || 0, y: (f.clip.box || {}).y || 0 };
    const start = SE.spec; let moved = false, raf = 0, last = null; e.target.setPointerCapture(e.pointerId);
    const apply = () => { raf = 0; if (!last) return; const nx = Math.round(o.x + (last.x - p.x)), ny = Math.round(o.y + (last.y - p.y)); const next = SM().updateClip(start, id, isText ? { style: { x: nx, y: ny } } : { box: { x: nx, y: ny } }); SE.spec = next; SE.handle.rebuild(next); SE.handle.seek(SE.t); renderSelection(); };
    const move = (ev) => { last = stagePoint(ev); if (Math.abs(last.x - p.x) + Math.abs(last.y - p.y) > 4) moved = true; if (moved && !raf) raf = requestAnimationFrame(apply); };
    const up = () => { e.target.removeEventListener("pointermove", move); e.target.removeEventListener("pointerup", up); if (raf) cancelAnimationFrame(raf); if (moved) { const fin = SE.spec; SE.spec = start; ST.commit(fin, isText ? "Moví un texto" : f.clip.type === "card" ? "Moví una tarjeta" : "Moví una imagen"); } };
    e.target.addEventListener("pointermove", move); e.target.addEventListener("pointerup", up);
  }

  // ---------- linea de tiempo ----------
  const ROW = 32, KIND_LABEL = { video: "Video", background: "Fondo", text: "Texto", subtitles: "Subtítulos", media: "Imágenes", sfx: "Sonido", notes: "Notas" };
  function clipText(k, c) {
    if (k === "text") return c.text || "Texto"; if (k === "background") return { original: "Fondo original", "black-glow": "Negro con luz", solid: "Color", gradient: "Degradado", photo: "Foto", anim: "Animación: " + ((c.props || {}).name || "") }[c.type] || "Fondo";
    if (k === "media") return c.type === "card" ? "Tarjeta: " + ((c.card || {}).kicker || "") : "Imagen"; return c.sfx || "whoosh";
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
    const SE = ST.SE, s = SE.spec, lanes = [], dur = s ? s.duration : (SE.handle && SE.handle.video.duration) || 0;
    lanes.push({ kind: "video", label: "Video", n: 1, items: [{ c: { id: "__video", t: 0, d: dur }, r: 0, text: s ? "Video original" + (s.base && s.base.cutout ? " + recorte de persona" : "") : "Video" }] });
    if (!s) { const lines = legacyLines(video()); lanes.push({ kind: "subtitles", label: "Subtítulos", n: 1, segs: lines.map((l) => [l.s, l.e, l.text]) }); lanes.push({ kind: "notes", label: "Notas", n: 1, items: S.notes.filter((n) => n.video === SE.vid && typeof n.t === "number").map((n) => ({ c: { id: "note_" + n.id, t: n.t, d: 0.6 }, r: 0, text: n.text || "Nota" })) }); return lanes; }
    const bg = SM().trackOfKind(s, "background"), tx = s.tracks.filter((t) => t.kind === "text").flatMap((t) => t.clips), md = s.tracks.filter((t) => t.kind === "media").flatMap((t) => t.clips), sf = SM().trackOfKind(s, "sfx"), sb = SM().trackOfKind(s, "subtitles");
    const pk = (cl, k) => { const p = pack(cl); return { kind: k, label: KIND_LABEL[k], n: p.n, items: p.items.map((x) => ({ c: x.c, r: x.r, text: clipText(k, x.c) })) }; };
    lanes.push(pk(bg ? bg.clips : [], "background")); lanes.push(pk(tx, "text")); lanes.push({ kind: "subtitles", label: "Subtítulos", n: 1, segs: sb ? sb.lines.map((l) => [l[0], l[1], l[2]]) : [], sel: "subs" });
    lanes.push(pk(md, "media")); lanes.push({ kind: "sfx", label: "Sonido", n: 1, items: (sf ? sf.clips : []).map((c) => ({ c, r: 0, text: "" })) });
    return lanes;
  }
  ST.renderTimeline = function () {
    const SE = ST.SE, root = E("st-tl"); if (!root || !SE) return; const dur = (SE.spec ? SE.spec.duration : (SE.handle && SE.handle.video.duration)) || 0;
    if (!dur) { root.innerHTML = `<div class="st-tlh">Cargando el video…</div><div></div>`; return; }
    const k = SE.zoom, lanes = laneDefs(), width = Math.max(dur * k + 60, 300), oldSc = root.querySelector(".st-scroll"), keepL = oldSc ? oldSc.scrollLeft : 0, keepT = oldSc ? oldSc.scrollTop : 0;
    const step = k >= 90 ? 1 : k >= 45 ? 2 : k >= 24 ? 5 : 10; let ticks = ""; for (let t = 0; t <= dur; t += step) ticks += `<span class="st-tick" style="left:${t * k}px">${fmtShort(t)}</span>`;
    const laneHtml = lanes.map((ln) => {
      const h = ln.n * ROW; let inner = "";
      if (ln.segs) inner = ln.segs.map((g, i) => `<span class="st-sub-seg" data-seg="${i}" style="left:${g[0] * k}px;width:${Math.max(3, (g[1] - g[0]) * k - 1)}px" title="${esc(g[2])}"></span>`).join("");
      else inner = ln.items.map(({ c, r, text }) => { const kind = ln.kind, w = Math.max(c.d == null ? 14 : 8, (c.d == null ? 0.3 : c.d) * k), editable = kind !== "video" && kind !== "notes"; return `<div class="st-clip" data-id="${esc(c.id)}" data-k="${kind}" data-sel="${SE.sel === c.id ? 1 : 0}" style="left:${c.t * k}px;width:${w}px;top:${r * ROW + 3}px;height:${ROW - 6}px" ${text ? `title="${esc(text)}"` : ""}>${editable && kind !== "sfx" ? '<span class="h l"></span>' : ""}${kind === "sfx" ? "" : esc(text)}${editable && kind !== "sfx" ? '<span class="h r"></span>' : ""}</div>`; }).join("");
      return `<div class="st-lane" data-lane="${ln.kind}" style="height:${h}px;width:${width}px">${inner}</div>`;
    }).join("");
    const lbl = lanes.map((ln) => `<div class="st-lb" style="height:${ln.n * ROW}px">${ln.label}</div>`).join(""), dis = SE.spec ? "" : "disabled";
    root.innerHTML = `<div class="st-tlh"><button class="btn sm" id="st-split" type="button" ${dis} title="Cortar el clip elegido en el cursor (S)">${icon("scissors")}Cortar</button><button class="btn sm" id="st-dup" type="button" ${dis} title="Duplicar (D)">${icon("copy")}Duplicar</button><button class="btn sm bad" id="st-del" type="button" ${dis}>${icon("trash")}Borrar</button><span class="sp"></span><span class="st-tlhint">${SE.spec ? "Arrastra los clips · estira los bordes" : "Video del motor anterior: la línea de tiempo es de lectura"}</span><span class="zl">Zoom</span><input type="range" id="st-zoom" min="18" max="180" value="${k}" aria-label="Zoom de la línea de tiempo"><button class="btn sm ghost" id="st-fit" type="button">Ajustar</button></div>
      <div class="st-tlw"><div class="st-lbls" id="st-lbls">${lbl}</div><div class="st-scroll" id="st-scroll"><div class="st-ruler" id="st-ruler" style="width:${width}px">${ticks}</div><div class="st-lane-area" style="width:${width}px">${laneHtml}<div class="st-head" id="st-head"></div></div></div></div>`;
    const sc = E("st-scroll"); sc.scrollLeft = keepL; sc.scrollTop = keepT; sc.addEventListener("scroll", () => { E("st-lbls").style.transform = `translateY(${-sc.scrollTop}px)`; });
    E("st-zoom").addEventListener("input", (e) => { SE.zoom = +e.target.value; ST.renderTimeline(); });
    E("st-fit").addEventListener("click", () => { SE.zoom = Math.max(18, Math.min(180, Math.floor((E("st-scroll").clientWidth - 40) / dur))); ST.renderTimeline(); });
    E("st-split").addEventListener("click", () => { if (SE.sel) ST.commit(SM().splitClip(SE.spec, SE.sel, SE.t), "Corté un clip"); });
    E("st-dup").addEventListener("click", () => { if (!SE.sel) return; const r = SM().duplicateClip(SE.spec, SE.sel); ST.commit(r.spec, "Dupliqué un clip"); if (r.id) ST.select(r.id); });
    E("st-del").addEventListener("click", () => { if (SE.sel) { ST.commit(SM().removeClip(SE.spec, SE.sel), "Quité un clip"); SE.sel = null; ST.renderRight(); } });
    E("st-ruler").addEventListener("pointerdown", rulerDown); sc.querySelector(".st-lane-area").addEventListener("pointerdown", laneDown); movePlayhead();
  };
  function movePlayhead() {
    const SE = ST.SE, h = E("st-head"); if (!h || !SE) return; h.style.left = SE.t * SE.zoom + "px";
    const sc = E("st-scroll"); if (sc && SE.handle && !SE.handle.video.paused) { const x = SE.t * SE.zoom; if (x > sc.scrollLeft + sc.clientWidth - 40 || x < sc.scrollLeft) sc.scrollLeft = Math.max(0, x - 80); }
  }
  function rulerDown(e) { const r = E("st-ruler"); pause(); const at = (ev) => (ev.clientX - r.getBoundingClientRect().left) / ST.SE.zoom; seek(at(e)); r.setPointerCapture(e.pointerId); const mv = (ev) => seek(at(ev)); const up = () => { r.removeEventListener("pointermove", mv); r.removeEventListener("pointerup", up); }; r.addEventListener("pointermove", mv); r.addEventListener("pointerup", up); }
  function selOnly(id) { const SE = ST.SE; SE.sel = id; document.querySelectorAll(".st-clip").forEach((c) => { c.dataset.sel = c.dataset.id === id ? "1" : "0"; }); renderSelection(); ST.renderRight(); }
  function snap(t, skipId) {
    const SE = ST.SE, pts = [0, SE.t, SE.spec ? SE.spec.duration : 0]; SM().allClips(SE.spec).forEach((x) => { if (x.clip.id !== skipId) { pts.push(x.clip.t); if (x.clip.d != null) pts.push(SM().clipEnd(x.clip)); } });
    const tol = 8 / SE.zoom; let best = t, bd = tol; pts.forEach((p) => { const d = Math.abs(p - t); if (d < bd) { bd = d; best = p; } }); return SM().q(best);
  }
  function laneDown(e) {
    const SE = ST.SE, seg = e.target.closest(".st-sub-seg");
    if (seg && SE) { if (SE.spec) { SE.rtab = "transcripcion"; ST.renderRight(); } const g = laneDefs().find((l) => l.kind === "subtitles"); if (g && g.segs[+seg.dataset.seg]) { pause(); seek(g.segs[+seg.dataset.seg][0] + 0.02); } return; }
    const el = e.target.closest(".st-clip"); if (!el) { if (e.target.classList.contains("st-lane") && SE.sel) selOnly(null); return; }
    if (el.dataset.k === "video" || el.dataset.k === "notes") { pause(); seek((el.dataset.k === "notes" ? (S.notes.find((n) => "note_" + n.id === el.dataset.id) || {}).t : SE.t) || 0); return; }
    if (!SE.spec) return; const id = el.dataset.id, f = SM().findClip(SE.spec, id); if (!f) return; selOnly(id); pause();
    const mode = e.target.classList.contains("h") ? (e.target.classList.contains("l") ? "l" : "r") : "m", x0 = e.clientX, o = { t: f.clip.t, d: f.clip.d == null ? 0.3 : f.clip.d }, start = SE.spec; let moved = false, raf = 0, last = null;
    el.setPointerCapture(e.pointerId); el.style.cursor = "grabbing";
    const apply = () => { raf = 0; if (!last) return; const dt = (last - x0) / SE.zoom; let t = o.t, d = o.d;
      if (mode === "m") t = Math.max(0, Math.min(SE.spec.duration - 0.2, snap(o.t + dt, id)));
      else if (mode === "l") { const nt = Math.min(o.t + o.d - 0.2, Math.max(0, snap(o.t + dt, id))); d = o.d - (nt - o.t); t = nt; }
      else { const ne = Math.max(o.t + 0.2, Math.min(SE.spec.duration, snap(o.t + o.d + dt, id))); d = ne - o.t; }
      el.style.left = t * SE.zoom + "px"; if (f.clip.d != null) el.style.width = Math.max(8, d * SE.zoom) + "px";
      const next = SM().updateClip(start, id, f.clip.d == null || mode === "m" ? { t } : { t, d: SM().q(d) }); SE.spec = next; SE.handle.rebuild(next); SE.handle.seek(SE.t); renderSelection(); };
    const move = (ev) => { last = ev.clientX; if (Math.abs(last - x0) > 3) moved = true; if (moved && !raf) raf = requestAnimationFrame(apply); };
    const up = () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.style.cursor = ""; if (raf) cancelAnimationFrame(raf); if (moved) { const fin = SE.spec; SE.spec = start; ST.commit(fin, mode === "m" ? "Moví un clip" : "Cambié la duración de un clip"); } };
    el.addEventListener("pointermove", move); el.addEventListener("pointerup", up);
  }
  ST.rulesModal = rulesModal; ST.snap = snap;

  // datos nuevos de las colecciones del Estudio
  ST.onData = function (kinds) {
    const SE = ST.SE; if (!SE) return false;
    if (kinds.has("studio_versions")) { if (SE.spec) ST.remoteChanged(); else if (hasSpec(SE.vid) && Date.now() - SE.openedAt > 4000) { const id = SE.vid; teardown(); ST.open(id); App.toast("Claude dejó listo el editor completo. Ya puedes editar a mano."); return true; } }
    if (kinds.has("studio_transcripts")) { ST.renderTimeline(); if (SE.rtab === "transcripcion") ST.renderRight(); }
    if (kinds.has("studio_requests") || kinds.has("studio_media_feedback")) ST.refreshPanes();
    ST.renderTop(); return true;
  };
})();
