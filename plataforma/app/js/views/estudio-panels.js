/* Aura · Estudio (paneles): biblioteca a la izquierda, ajustes / transcripcion / medios / Claude / exportar a la derecha, y selector de estilos. */
(function () {
  "use strict";
  const App = window.App, S = App.S, sel = App.sel, ST = App.st, { esc, icon, plural } = App, E = ST.E;
  const SM = () => window.StudioModel, SLib = () => window.StudioLib;
  const SE = () => ST.SE;
  const setIn = (path, val) => { const o = {}; let c = o; const p = path.split("."); p.forEach((k, i) => { c[k] = i === p.length - 1 ? val : {}; c = c[k]; }); return o; };
  const ago = (iso) => App.ago(iso);
  const transOpts = () => Object.entries(SLib().TRANSICIONES).map(([k, t]) => [k, t.name]);

  // ---------- campos del panel ----------
  const fNum = (label, path, v, min, max, step, unit) => `<div class="st-f"><label>${label}</label><div class="st-row"><input class="st-range" type="range" data-f="${path}" data-ty="num" min="${min}" max="${max}" step="${step || 1}" value="${v}"><input type="number" data-f="${path}" data-ty="num" min="${min}" max="${max}" step="${step || 1}" value="${v}" style="max-width:84px">${unit ? `<span class="fix">${unit}</span>` : ""}</div></div>`;
  const fSel = (label, path, v, opts) => `<div class="st-f"><label>${label}</label><select data-f="${path}" data-ty="str">${opts.map(([k, n]) => `<option value="${esc(k)}" ${String(v) === k ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></div>`;
  const fSeg = (label, path, v, opts) => `<div class="st-f"><span class="l">${label}</span><div class="st-seg" role="group">${opts.map(([k, n]) => `<button type="button" data-fs="${path}" data-val="${esc(k)}" aria-pressed="${String(v) === k}">${esc(n)}</button>`).join("")}</div></div>`;
  const fSwatch = (label, path, v) => `<div class="st-f"><span class="l">${label}</span><div class="st-sw">${SLib().COLORES.map(([k, n]) => { const css = SM().COLORS[k] || k; return `<button type="button" data-fs="${path}" data-val="${esc(k)}" aria-pressed="${v === k}" aria-label="${n}" title="${n}" style="background:${css}"></button>`; }).join("")}</div></div>`;
  const LBL = { "style.size": "el tamaño", "style.font": "la fuente", "style.color": "el color", text: "el texto", t: "el inicio", d: "la duración", "style.x": "la posición", "style.y": "la posición", "style.glow": "el brillo", "style.align": "la alineación", "style.maxW": "el ancho máximo", "style.spacing": "el espaciado", "card.size": "el tamaño de la tarjeta", "card.kicker": "el título de la tarjeta", "box.x": "la posición", "box.y": "la posición", "box.w": "el ancho", "box.h": "el alto", "box.rot": "la inclinación", "anim.in": "cómo entra", "anim.out": "cómo sale", in: "cómo entra", "in.type": "la transición de entrada", "out.type": "la transición de salida", "in.d": "la duración de la entrada", "out.d": "la duración de la salida", front: "si va delante o detrás de la persona", cutout: "el recorte de la persona" };
  function bindFields(pane, id, kind) {
    const apply = (path, val, text) => { const s = SE(); const next = kind === "subs" ? SM().setSubs(s.spec, setIn({}, path, val)) : SM().updateClip(s.spec, id, setIn({}, path, val)); ST.commit(next, text, { keepPanel: true }); };
    const lbl = (p) => LBL[p] || "un ajuste";
    pane.querySelectorAll("[data-f]").forEach((el) => el.addEventListener("input", () => { const ty = el.dataset.ty, val = ty === "num" ? parseFloat(el.value) : el.value; if (ty === "num" && Number.isNaN(val)) return; pane.querySelectorAll(`[data-f="${el.dataset.f}"]`).forEach((o) => { if (o !== el) o.value = el.value; }); apply(el.dataset.f, val, `Cambié ${lbl(el.dataset.f)}`); }));
    pane.querySelectorAll("[data-fs]").forEach((el) => el.addEventListener("click", () => { apply(el.dataset.fs, el.dataset.val === "true" ? true : el.dataset.val === "false" ? false : el.dataset.val, `Cambié ${lbl(el.dataset.fs)}`); ST.renderRight(); }));
  }
  const acts = () => `<div class="st-acts"><button class="btn sm" data-a="dup" type="button">${icon("copy")}Duplicar</button><button class="btn sm" data-a="split" type="button">${icon("scissors")}Cortar en el cursor</button><button class="btn sm bad" data-a="del" type="button">${icon("trash")}Borrar</button></div>`;
  function bindActs(pane, id) {
    pane.querySelectorAll("[data-a]").forEach((b) => b.addEventListener("click", () => { const a = b.dataset.a, s = SE(); if (a === "dup") { const r = SM().duplicateClip(s.spec, id); ST.commit(r.spec, "Dupliqué un clip"); if (r.id) ST.select(r.id); } else if (a === "split") ST.commit(SM().splitClip(s.spec, id, s.t), "Corté un clip"); else if (a === "del") { ST.commit(SM().removeClip(s.spec, id), "Quité un clip"); s.sel = null; ST.renderRight(); } }));
  }
  function logHtml(n) { const l = (SE().log || []).slice(0, n); return l.length ? `<ul class="st-log">${l.map((x) => `<li><span>${esc(x.text)}${x.by === "claude" ? " (Claude)" : ""}</span><time>${ago(x.at)}</time></li>`).join("")}</ul>` : `<p class="st-hint">Todavía no cambiaste nada.</p>`; }

  // ---------- pestañas de la derecha ----------
  ST.rightTabs = function () {
    const s = SE(), open = ST.reqsOf(s.vid).filter((r) => !ST.isDone(r)).length;
    return s.spec ? [["ajustes", "Ajustes", ""], ["transcripcion", "Transcripción", ""], ["medios", "Medios", ""], ["claude", "Claude", open ? String(open) : ""], ["exportar", "Exportar", ""]] : [["claude", "Claude", open ? String(open) : ""], ["transcripcion", "Transcripción", ""], ["exportar", "Exportar", ""]];
  };
  ST.renderRight = function () {
    const s = SE(); if (!s) return; const tabs = ST.rightTabs(); if (!tabs.some((t) => t[0] === s.rtab)) s.rtab = tabs[0][0]; App.store.set("st-rtab", s.rtab);
    E("st-rtabs").innerHTML = tabs.map(([k, n, c]) => `<button type="button" role="tab" data-rt="${k}" aria-selected="${s.rtab === k}">${n}${c ? `<b>${c}</b>` : ""}</button>`).join("");
    E("st-rtabs").querySelectorAll("[data-rt]").forEach((b) => b.addEventListener("click", () => { s.rtab = b.dataset.rt; ST.renderRight(); }));
    const pane = E("st-rpane"), keep = s.lastRt === s.rtab ? pane.scrollTop : 0; s.lastRt = s.rtab; ({ ajustes: paneAjustes, transcripcion: paneTranscripcion, medios: paneMedios, claude: paneClaude, exportar: paneExportar }[s.rtab])(pane); pane.scrollTop = keep;
  };
  ST.refreshPanes = function () {
    const s = SE(); if (!s) return;
    if (s.rtab === "claude" || s.rtab === "exportar") { const a = document.activeElement; if (a && a.closest && a.closest("#st-rpane") && /^(TEXTAREA|INPUT|SELECT)$/.test(a.tagName)) { renderRequestsOnly(); return; } ST.renderRight(); }
    ST.renderTop();
  };

  // ---------- Ajustes ----------
  function quickAdd(kind) {
    const s = SE(); if (kind === "subs") { s.sel = "subs"; ST.renderRight(); return; }
    const lib = kind === "text" ? SLib().TEXTOS.titulo : kind === "card" ? SLib().TEXTOS.tarjeta : SLib().FONDOS["black-glow"], clip = lib.make(SM().q(s.t), { face: s.spec.base && s.spec.base.face }), tr = kind === "card" ? "media" : kind === "bg" ? "bg" : "text";
    const r = SM().addClip(s.spec, tr, clip); ST.commit(r.spec, "Agregué " + (kind === "text" ? "un texto" : kind === "card" ? "una tarjeta" : "un fondo")); ST.select(r.id);
  }
  function paneAjustes(pane) {
    const s = SE(), sp = s.spec; if (!sp) { pane.innerHTML = ""; return; }
    if (s.sel === "subs") return paneSubs(pane);
    const f = s.sel ? SM().findClip(sp, s.sel) : null;
    if (!f) { pane.innerHTML = `<h3>Qué quieres hacer</h3><p class="st-hint">Toca un texto en el video o un clip en la línea de tiempo para cambiarlo. O agrega algo nuevo en el cursor (${ST.fmtTc(s.t)}):</p><div class="st-acts"><button class="btn" data-add="text" type="button">${icon("plus")}Texto</button><button class="btn" data-add="bg" type="button">${icon("plus")}Fondo</button><button class="btn" data-add="card" type="button">${icon("plus")}Tarjeta</button><button class="btn" data-add="subs" type="button">Subtítulos</button></div><h3>Lo último que cambiaste</h3>${logHtml(6)}`; pane.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", () => quickAdd(b.dataset.add))); return; }
    const c = f.clip, k = f.track.kind, st = c.style || {};
    const timing = `<h3>Cuándo</h3>${fNum("Empieza (s)", "t", +c.t.toFixed(2), 0, sp.duration, 0.05)}${c.d != null ? fNum("Dura (s)", "d", +c.d.toFixed(2), 0.2, sp.duration, 0.05) : ""}`;
    let html = "";
    if (k === "text") html = `<h3>Texto</h3><div class="st-f"><label for="st-ft">Lo que dice</label><textarea id="st-ft" data-f="text" data-ty="str" rows="2">${esc(c.text || "")}</textarea></div>${fSel("Fuente", "style.font", st.font || "Anton", SLib().FUENTES)}${fNum("Tamaño", "style.size", st.size || 100, 40, 320, 2, "px")}${fSwatch("Color", "style.color", st.color || "white")}${fSeg("Alineación", "style.align", st.align || "center", [["left", "Izquierda"], ["center", "Centro"], ["right", "Derecha"]])}${fSeg("Brillo", "style.glow", String(st.glow == null ? "soft" : st.glow), [["none", "Ninguno"], ["soft", "Suave"], ["neon", "Neón"]])}
      <h3>Cómo entra y sale</h3>${fSel("Entrada", "anim.in", (c.anim || {}).in || "cut", [["cut", "Corte seco"], ["pop", "Pop"], ["slide", "Deslizar"], ["fade", "Aparecer"], ["type", "Tecleado"]])}${fSel("Salida", "anim.out", (c.anim || {}).out || "cut", [["cut", "Corte seco"], ["fade", "Desaparecer"], ["slide", "Subir"]])}${timing}
      <details class="st-more"><summary>Más opciones</summary>${fNum("Posición horizontal", "style.x", st.x != null ? st.x : 540, 0, 1080, 2)}${fNum("Posición vertical", "style.y", st.y != null ? st.y : 900, 0, 1920, 2)}${fNum("Ancho máximo", "style.maxW", st.maxW || 808, 200, 1000, 4, "px")}${fNum("Espaciado", "style.spacing", st.spacing || 0, 0, 20, 1, "px")}</details>${acts()}`;
    else if (k === "background") html = `<h3>Fondo</h3>${fSel("Tipo", "__bgtype", c.type === "anim" ? "anim:" + ((c.props || {}).name || "ondas") : c.type, [["original", "Original (su habitación)"], ["black-glow", "Negro con luz"], ["gradient", "Degradado"], ["solid", "Color sólido"], ["photo", "Foto"], ["anim:ondas", "Animación: ondas"], ["anim:red", "Animación: red neuronal"], ["anim:rayos", "Animación: rayos"], ["anim:universo", "Animación: universo"]])}${fSeg("Recortar a la persona", "cutout", String(c.cutout !== false), [["true", "Sí"], ["false", "No"]])}
      <h3>Transición de entrada</h3>${fSel("Tipo", "in.type", (c.in || {}).type || "cut", transOpts())}${fNum("Dura (s)", "in.d", (c.in || {}).d != null ? c.in.d : 0.6, 0, 2, 0.1)}<h3>Transición de salida</h3>${fSel("Tipo", "out.type", (c.out || {}).type || "cut", transOpts())}${fNum("Dura (s)", "out.d", (c.out || {}).d != null ? c.out.d : 0.5, 0, 2, 0.1)}${timing}${acts()}`;
    else if (k === "media" && c.type === "card") { const cd = c.card || {}; html = `<h3>Tarjeta</h3><div class="st-f"><label>Título pequeño</label><input type="text" data-f="card.kicker" data-ty="str" value="${esc(cd.kicker || "")}"></div>${cd.variant === "columns" ? `<p class="st-hint">Las dos columnas se cambian pidiéndoselo a Claude.</p>` : `<div class="st-f"><label for="st-fl">Líneas (una por renglón)</label><textarea id="st-fl" rows="4">${esc((cd.lines || []).map((l) => l.text).join("\n"))}</textarea></div>`}${fNum("Tamaño del texto", "card.size", cd.size || 86, 40, 120, 2, "px")}${fNum("Posición vertical", "box.y", (c.box || {}).y || 0, 237, 1479, 2)}${fNum("Posición horizontal", "box.x", (c.box || {}).x || 0, 0, 900, 2)}${fSeg("Respecto a la persona", "front", String(c.front !== false), [["true", "Delante"], ["false", "Detrás"]])}${timing}${acts()}`; }
    else if (k === "media") html = `<h3>Imagen</h3>${fNum("Posición horizontal", "box.x", (c.box || {}).x || 0, 0, 1080, 2)}${fNum("Posición vertical", "box.y", (c.box || {}).y || 0, 0, 1920, 2)}${fNum("Ancho", "box.w", (c.box || {}).w || 300, 80, 1000, 2)}${fNum("Alto", "box.h", (c.box || {}).h || 300, 80, 1400, 2)}${fNum("Inclinación", "box.rot", (c.box || {}).rot || 0, -15, 15, 0.5, "°")}${fSel("Entra", "in", c.in || "pop", [["pop", "Pop"], ["slide", "Deslizar"], ["fade", "Aparecer"]])}${fSeg("Respecto a la persona", "front", String(c.front !== false), [["true", "Delante"], ["false", "Detrás"]])}${timing}<p class="st-hint">${c.src && c.src.license ? `Licencia: ${esc(c.src.license)}${c.src.author ? " · " + esc(c.src.author) : ""}` : ""}</p>${acts()}`;
    else html = `<h3>Sonido</h3><p class="st-hint">Un whoosh suave en una transición. Solo se permite este sonido, bajito.</p>${fNum("Momento (s)", "t", +c.t.toFixed(2), 0, sp.duration, 0.05)}${acts()}`;
    pane.innerHTML = html; bindFields(pane, c.id, "clip"); bindActs(pane, c.id);
    const bt = pane.querySelector('[data-f="__bgtype"]'); if (bt) { bt.removeAttribute("data-f"); bt.addEventListener("input", () => { const [ty, nm] = bt.value.split(":"); ST.commit(SM().updateClip(s.spec, c.id, ty === "anim" ? { type: "anim", props: { name: nm } } : { type: ty }), "Cambié el fondo"); }); }
    const fl = pane.querySelector("#st-fl"); if (fl) fl.addEventListener("input", () => { const old = (c.card || {}).lines || [], lines = fl.value.split("\n").map((t, i) => ({ text: t, at: (old[i] || {}).at != null ? old[i].at : 0.5 + i, hl: (old[i] || {}).hl })).filter((l) => l.text.trim()); ST.commit(SM().updateClip(s.spec, c.id, { card: { lines } }), "Cambié el texto de la tarjeta", { keepPanel: true }); });
  }
  function paneSubs(pane) {
    const s = SE(), tr = SM().trackOfKind(s.spec, "subtitles"), st = tr.style || {}, n = (tr.lines || []).length;
    pane.innerHTML = `<h3>Subtítulos</h3><p class="st-hint">Una sola línea, hasta 3 palabras, en la misma posición. ${n} frases.</p>${fNum("Tamaño", "style.size", st.size || 64, 56, 96, 2, "px")}${fNum("Posición vertical", "style.y", st.y || 880, 237, 1479, 2)}<div class="st-f"><label for="st-hero">Palabras especiales (Aston), separadas por coma</label><input id="st-hero" class="st-in" type="text" value="${esc((st.hero || []).join(", "))}"></div><div class="st-f"><label for="st-key">Palabras clave (amarillo), separadas por coma</label><input id="st-key" class="st-in" type="text" value="${esc((st.key || []).join(", "))}"></div><p class="st-hint">Para cambiar lo que dice, abre la pestaña Transcripción y edita la frase.</p>`;
    bindFields(pane, null, "subs");
    const list = (id, key) => E(id).addEventListener("input", (e) => ST.commit(SM().setSubs(s.spec, { style: { [key]: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) } }), key === "hero" ? "Cambié las palabras en Aston" : "Cambié las palabras clave", { keepPanel: true }));
    list("st-hero", "hero"); list("st-key", "key");
  }

  // ---------- Transcripcion ----------
  function transcriptLines() {
    const s = SE(), v = ST.video(), tr = v ? ST.trans(v.piece) : null;
    if (tr && tr.lines && tr.lines.length) return tr.lines.map((l) => ({ s: l.s, e: l.e, text: (s.tlang === "en" ? l.en : l.es) || l.es || l.en || "", other: s.tlang === "en" ? l.es : l.en })).sort((a, b) => a.s - b.s);
    return ST.legacyLines(v).map((l) => ({ s: l.s, e: l.e, text: l.text, other: "" }));
  }
  ST.transcriptLines = transcriptLines;
  function paneTranscripcion(pane) {
    const s = SE(), v = ST.video(), tr = v ? ST.trans(v.piece) : null, hasBoth = tr && tr.lines && tr.lines.some((l) => l.en) && tr.lines.some((l) => l.es), lines = transcriptLines(); if (!s.tlang) s.tlang = (s.spec && s.spec.lang) || "es";
    pane.innerHTML = `<h3>Lo que dice el video</h3><p class="st-hint">Toca una frase para ir a ese momento.${s.spec ? " Puedes corregir el texto: se actualiza en los subtítulos." : ""}</p>
      <div class="st-row" style="margin-bottom:10px"><input class="st-in" id="st-trq" type="text" placeholder="Buscar una palabra" aria-label="Buscar en la transcripción">${hasBoth ? `<span class="st-seg fix"><button type="button" data-tl="es" aria-pressed="${s.tlang === "es"}">ES</button><button type="button" data-tl="en" aria-pressed="${s.tlang === "en"}">EN</button></span>` : ""}</div>
      <div class="st-tr" id="st-trl">${lines.map((l, i) => `<div class="st-trl" data-i="${i}" data-s="${l.s}" data-e="${l.e}"><time>${ST.fmtShort(l.s)}</time><div><span ${s.spec && s.tlang === (s.spec.lang || "es") ? 'contenteditable="plaintext-only" spellcheck="false"' : ""} data-txt>${esc(l.text)}</span>${l.other ? `<small>${esc(l.other)}</small>` : ""}</div></div>`).join("") || '<div class="st-empty">Todavía no hay transcripción de este video.</div>'}</div>`;
    const q = E("st-trq"); q.addEventListener("input", () => { const t = q.value.trim().toLowerCase(); pane.querySelectorAll(".st-trl").forEach((r) => { r.style.display = !t || r.textContent.toLowerCase().includes(t) ? "" : "none"; }); });
    pane.querySelectorAll("[data-tl]").forEach((b) => b.addEventListener("click", () => { s.tlang = b.dataset.tl; ST.renderRight(); }));
    pane.querySelectorAll(".st-trl").forEach((r) => {
      r.addEventListener("click", (e) => { if (e.target.closest("[contenteditable]") && document.activeElement === e.target) return; ST.pause(); ST.seek(+r.dataset.s + 0.02); });
      const ed = r.querySelector("[contenteditable]"); if (ed) ed.addEventListener("input", () => { const sub = SM().trackOfKind(s.spec, "subtitles"), t0 = +r.dataset.s, ix = (sub.lines || []).findIndex((l) => Math.abs(l[0] - t0) < 0.05); if (ix < 0) return; const l2 = sub.lines.map((l, i) => (i === ix ? [l[0], l[1], ed.textContent] : l)); ST.commit(SM().setSubs(s.spec, { lines: l2 }), "Corregí una frase de los subtítulos", { keepPanel: true }); });
    });
  }
  ST.highlightTranscript = function () {
    const s = SE(); if (!s || s.rtab !== "transcripcion") return; let cur = null;
    document.querySelectorAll("#st-trl .st-trl").forEach((r) => { const on = s.t >= +r.dataset.s && s.t < +r.dataset.e; if (on !== (r.dataset.now === "1")) r.dataset.now = on ? "1" : "0"; if (on) cur = r; });
    if (cur && s.handle && !s.handle.video.paused) { const p = E("st-rpane"), top = cur.offsetTop - p.offsetTop; if (top < p.scrollTop || top > p.scrollTop + p.clientHeight - 60) p.scrollTop = top - 60; }
  };

  // ---------- Medios ----------
  function paneMedios(pane) {
    const s = SE(), items = [];
    SM().allClips(s.spec).forEach((x) => { const c = x.clip; if (x.track.kind === "media") items.push({ id: c.id, name: c.type === "card" ? "Tarjeta: " + ((c.card || {}).kicker || "") : (c.src && c.src.title) || "Imagen", t: c.t, d: c.d, asset: c.src && c.src.asset, lic: c.src && c.src.license, by: c.src && c.src.author }); else if (x.track.kind === "background" && (c.type === "photo" || c.type === "anim")) items.push({ id: c.id, name: c.type === "photo" ? "Foto de fondo" : "Animación: " + ((c.props || {}).name || ""), t: c.t, d: c.d, asset: c.type === "photo" ? (c.props || {}).asset : "", lic: (c.props || {}).license, by: (c.props || {}).author }); });
    const fb = ST.fbOf(s.vid);
    pane.innerHTML = `<h3>Lo que se usó en este video</h3><p class="st-hint">Marca 👍 lo que te gusta y 👎 lo que no. Claude cambia lo que marques con 👎.</p>${items.map((m) => { const f = fb.find((x) => x.clipId === m.id) || {}; return `<div class="st-md" data-id="${esc(m.id)}">${m.asset ? `<img src="${esc(App.adapter().assetUrl(m.asset))}" alt="">` : `<div class="ph">${m.name.startsWith("Anim") ? "✦" : "▭"}</div>`}<div><b>${esc(m.name)}</b><small>${ST.fmtShort(m.t)} a ${ST.fmtShort(m.t + (m.d || 0))}${m.lic ? " · " + esc(m.lic) : ""}${m.by ? " · " + esc(m.by) : ""}</small><div class="st-acts" style="margin:0"><button class="btn sm good" data-fv="keep" type="button" aria-pressed="${f.verdict === "keep"}">👍</button><button class="btn sm bad" data-fv="drop" type="button" aria-pressed="${f.verdict === "drop"}">👎</button><button class="btn sm ghost" data-goto type="button">Ver</button></div>${f.verdict === "drop" ? `<div class="st-f" style="margin:8px 0 0"><input class="st-in" type="text" data-note placeholder="¿Qué no te gusta? (opcional)" value="${esc(f.note || "")}"></div><p class="st-hint" style="margin:6px 0 0">${f.status === "hecho" ? "Claude ya lo cambió." : "Claude lo va a reemplazar."}</p>` : ""}</div></div>`; }).join("") || '<div class="st-empty">Este video todavía no usa imágenes ni animaciones.</div>'}<div class="st-acts"><button class="btn" id="st-more-media" type="button">Pedir más imágenes</button></div>`;
    pane.querySelectorAll(".st-md").forEach((r) => { const id = r.dataset.id;
      r.querySelectorAll("[data-fv]").forEach((b) => b.addEventListener("click", async () => { const cur = (fb.find((x) => x.clipId === id) || {}).verdict, v2 = cur === b.dataset.fv ? "" : b.dataset.fv; await mediaFeedback(s.vid, id, v2, ""); App.toast(v2 === "drop" ? "Anotado. Claude lo reemplaza." : v2 === "keep" ? "Anotado: te gusta." : "Quitaste tu marca."); ST.renderRight(); }));
      const g = r.querySelector("[data-goto]"); if (g) g.addEventListener("click", () => ST.select(id, true)); const n = r.querySelector("[data-note]"); if (n) n.addEventListener("change", () => mediaFeedback(s.vid, id, "drop", n.value)); });
    E("st-more-media").addEventListener("click", () => { s.rtab = "claude"; s.askText = "Busca y agrega más imágenes o animaciones que acompañen lo que se dice, sin saturar."; ST.renderRight(); });
  }
  async function mediaFeedback(vid, clipId, verdict, note) {
    const id = vid + "__" + clipId, v = sel.video(vid), ok = await ST.write("studio_media_feedback", id, { videoId: vid, clipId, verdict, note: note || "", status: verdict === "drop" ? "pedido" : "visto", at: ST.nowIso(), by: S.userId || "" });
    if (ok && verdict === "drop") App.data.tellSoon(`FEEDBACK DE IMAGEN en ${v ? sel.label(v) : vid}: 👎 al clip ${clipId}${note ? ` («${note}»)` : ""} (studio_media_feedback/${id}). Reemplázalo por otro y avisa en la lista de cambios.`);
    return ok;
  }

  // ---------- Claude: pedidos con lista de pasos ----------
  const STEP_ICON = { pendiente: "", haciendo: "…", hecho: "✓", error: "!" };
  const progress = (r) => { const st = r.steps || []; return st.length ? st.filter((x) => x.status === "hecho").length / st.length : r.status === "listo" ? 1 : 0; };
  const statusText = (r) => ({ pedido: "Pedido enviado", trabajando: "Claude está trabajando", listo: "Listo", error: "Hubo un problema", cancelado: "Cancelado" }[r.status] || r.status);
  function reqHtml(r) {
    const steps = r.steps || [], p = Math.round(progress(r) * 100), title = r.kind === "export" ? "Exportar: " + (r.text || "").slice(0, 80) : (r.text || "").slice(0, 140);
    return `<article class="st-req" data-rid="${esc(r.id)}"><header><b>${esc(title)}</b><small>${ago(r.at)}</small></header><span class="st-st" data-s="${esc(r.status)}">${esc(statusText(r))}</span>
      ${steps.length ? `<div class="bar" style="--p:${p}%"><i></i></div><ol class="st-steps">${steps.map((s) => `<li data-s="${esc(s.status || "pendiente")}"><span class="ic" aria-hidden="true">${STEP_ICON[s.status || "pendiente"] || ""}</span><span class="t">${esc(s.text)}${s.note ? `<small>${esc(s.note)}</small>` : ""}</span></li>`).join("")}</ol>` : r.status === "pedido" || r.status === "trabajando" ? `<p class="st-hint" style="margin:8px 0 0">Claude va a escribir la lista de pasos aquí en un momento.</p>` : ""}
      ${r.reply ? `<p class="st-hint" style="margin:10px 0 0"><b>Claude:</b> ${esc(r.reply)}</p>` : ""}${r.kind === "export" && r.result && r.result.asset ? `<div class="st-acts"><button class="btn pri sm" data-dl="${esc(r.result.asset)}" data-fn="${esc(r.result.name || "video")}" type="button">Descargar ${esc(r.result.name || "")}${r.result.sizeMB ? ` (${r.result.sizeMB} MB)` : ""}</button></div>` : ""}
      ${r.status === "error" ? `<div class="st-acts"><button class="btn sm" data-retry="${esc(r.id)}" type="button">Pedirlo de nuevo</button></div>` : ""}</article>`;
  }
  function renderRequestsOnly() { const box = E("st-reqs"); if (box) { box.innerHTML = ST.reqsOf(SE().vid).filter((r) => r.kind !== "export").map(reqHtml).join("") || '<div class="st-empty">Todavía no le pediste nada a Claude en este video.</div>'; bindReqs(box); } }
  function bindReqs(box) {
    box.querySelectorAll("[data-dl]").forEach((b) => b.addEventListener("click", () => download(b.dataset.dl, b.dataset.fn)));
    box.querySelectorAll("[data-retry]").forEach((b) => b.addEventListener("click", async () => { const r = S.studioRequests.find((x) => x.id === b.dataset.retry); if (!r) return; await ST.ask(SE().vid, r.kind, r.text, { scope: r.scope, export: r.export }); App.toast("Pedido enviado de nuevo."); }));
  }
  function paneClaude(pane) {
    const s = SE(), reqs = ST.reqsOf(s.vid).filter((r) => r.kind !== "export"), cs = s.sel && s.sel !== "subs" && s.spec ? SM().findClip(s.spec, s.sel) : null;
    pane.innerHTML = `<div class="st-ask"><h3>Pedirle un cambio a Claude</h3><p class="st-hint">Escríbelo como se lo dirías a una persona. Claude arma una lista de pasos y la ves aquí mientras la hace.</p><div class="st-f"><textarea id="st-ask-text" placeholder="Por ejemplo: pon una transición de iris cuando cambia el fondo" aria-label="Qué quieres cambiar">${esc(s.askText || "")}</textarea></div>
      <div class="st-f"><label for="st-ask-scope">Dónde</label><select id="st-ask-scope"><option value="video">En todo este video</option>${cs ? `<option value="clip">Solo en lo que tengo elegido (${esc(ST.clipText(cs.track.kind, cs.clip))})</option>` : ""}<option value="piece">En todas las versiones de esta pieza</option></select></div>
      <div class="st-chips">${SLib().EJEMPLOS_PEDIDO.map((t, i) => `<button type="button" data-ex="${i}">${esc(t)}</button>`).join("")}</div><div class="st-acts"><button class="btn pri" id="st-ask-go" type="button">Pedir a Claude</button></div></div>
      <h3>Lista de cambios${reqs.length ? ` (${reqs.length})` : ""}</h3><div id="st-reqs">${reqs.map(reqHtml).join("") || '<div class="st-empty">Todavía no le pediste nada a Claude en este video.</div>'}</div>${s.spec ? `<h3>Cambios hechos a mano</h3>${logHtml(8)}` : ""}`;
    const ta = E("st-ask-text"); ta.addEventListener("input", () => { s.askText = ta.value; });
    pane.querySelectorAll("[data-ex]").forEach((b) => b.addEventListener("click", () => { ta.value = SLib().EJEMPLOS_PEDIDO[+b.dataset.ex]; s.askText = ta.value; ta.focus(); }));
    E("st-ask-go").addEventListener("click", async () => { const text = ta.value.trim(); if (!text) { App.toast("Escribe qué quieres cambiar."); ta.focus(); return; } const scope = E("st-ask-scope").value, targets = scope === "clip" && cs ? [cs.clip.id] : [];
      const id = await ST.ask(s.vid, "cambio", text, { scope, targets, at_time: +s.t.toFixed(2) }); if (id) { s.askText = ""; App.toast("Pedido enviado. Mira la lista de pasos aquí abajo."); ST.renderRight(); } else App.toast("No se pudo enviar el pedido. Prueba de nuevo."); });
    bindReqs(E("st-reqs"));
  }

  // ---------- Exportar ----------
  const pad2 = (n, w) => String(n).padStart(w || 2, "0");
  const srtTime = (t) => { const ms = Math.round(Math.max(0, t) * 1000); return `${pad2(Math.floor(ms / 3600000))}:${pad2(Math.floor((ms % 3600000) / 60000))}:${pad2(Math.floor((ms % 60000) / 1000))},${pad2(ms % 1000, 3)}`; };
  const toSrt = (lines) => lines.map((l, i) => `${i + 1}\n${srtTime(l.s)} --> ${srtTime(l.e)}\n${String(l.text).trim()}\n`).join("\n");
  const fileBase = (v) => `${String(v.pieceName || v.piece || "video").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}-v${v.version}`;
  async function saveText(filename, text, okMsg) { const r = await App.adapter().download(filename, text); if (r === true) App.toast(okMsg || "Descarga lista."); else if (r !== "declined") App.toast("No se pudo descargar. Prueba de nuevo."); }
  async function download(asset, filename) {
    try { const url = App.adapter().assetUrl(asset), r = await fetch(url); if (!r.ok) throw new Error("http " + r.status); const blob = await r.blob(), ok = await App.adapter().download(filename, blob); if (ok === true) { App.toast("Descarga lista: " + filename); return; } window.open(url, "_blank", "noopener"); App.toast("Se abrió el archivo en otra pestaña. Guárdalo desde ahí."); } catch (e) { App.toast("No se pudo descargar. Prueba de nuevo."); }
  }
  function paneExportar(pane) {
    const s = SE(), v = ST.video(); if (!s.exp) s.exp = { fmt: "mp4-1080", q: "alta" }; const L = SLib(), f = L.EXPORT_FORMATOS.find((x) => x.id === s.exp.fmt) || L.EXPORT_FORMATOS[0], hasQ = (f.ext === "mp4" && !f.audio) || f.ext === "gif";
    const reqs = ST.reqsOf(s.vid).filter((r) => r.kind === "export"), subLines = transcriptLines().filter((l) => l.text), base = fileBase(v);
    pane.innerHTML = `<h3>Bajar ahora</h3><p class="st-hint">Sin esperar a Claude.</p><div class="st-acts" style="margin-top:0"><button class="btn" id="st-dl-prev" type="button" ${v && v.src ? "" : "disabled"}>Último video listo (MP4)</button><button class="btn" id="st-dl-srt" type="button" ${subLines.length ? "" : "disabled"}>Subtítulos (SRT)</button>${s.spec ? '<button class="btn" id="st-dl-json" type="button">Proyecto (JSON)</button>' : ""}</div>
      <p class="st-hint">El último video listo es el que Claude renderizó la última vez, en calidad liviana. Tus cambios se ven en la vista previa y salen en la exportación de abajo.</p>
      <h3>Exportar con calidad</h3><p class="st-hint">Claude lo arma desde los archivos originales con todos tus cambios y queda listo para bajar abajo. Tarda uno o dos minutos.</p>
      <div class="st-opts" role="radiogroup" aria-label="Formato">${L.EXPORT_FORMATOS.map((o) => `<div class="st-opt" role="radio" tabindex="0" aria-checked="${s.exp.fmt === o.id}" data-fmt="${o.id}"><i class="rd"></i><div><b>${esc(o.name)}${o.rec ? " · recomendado" : ""}</b><span>${esc(o.desc)}</span></div></div>`).join("")}</div>
      ${hasQ ? `<h3>Calidad</h3><div class="st-opts" role="radiogroup" aria-label="Calidad">${L.EXPORT_CALIDADES.map((o) => `<div class="st-opt" role="radio" tabindex="0" aria-checked="${s.exp.q === o.id}" data-q="${o.id}"><i class="rd"></i><div><b>${esc(o.name)}${o.rec ? " · recomendada" : ""}</b><span>${esc(o.desc)}</span></div></div>`).join("")}</div>` : ""}
      <div class="st-acts"><button class="btn pri" id="st-exp-go" type="button">Pedir exportación</button></div><h3>Exportaciones${reqs.length ? ` (${reqs.length})` : ""}</h3><div id="st-expreqs">${reqs.map(reqHtml).join("") || '<div class="st-empty">Todavía no pediste ninguna exportación de este video.</div>'}</div>`;
    const dp = E("st-dl-prev"); if (dp) dp.addEventListener("click", () => download(v.src, `${base}-ultimo-video.mp4`));
    const ds = E("st-dl-srt"); if (ds) ds.addEventListener("click", () => saveText(`${base}-subtitulos.srt`, toSrt(subLines), "Subtítulos listos."));
    const dj = E("st-dl-json"); if (dj) dj.addEventListener("click", () => saveText(`${base}-proyecto.json`, JSON.stringify(s.spec, null, 2), "Proyecto guardado."));
    const pick = (attr, key) => pane.querySelectorAll(`[${attr}]`).forEach((o) => { const go = () => { s.exp[key] = o.getAttribute(attr); ST.renderRight(); }; o.addEventListener("click", go); o.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }); });
    pick("data-fmt", "fmt"); pick("data-q", "q");
    E("st-exp-go").addEventListener("click", async () => { const q = L.EXPORT_CALIDADES.find((x) => x.id === s.exp.q), text = `${f.name}${hasQ ? " · calidad " + q.name.toLowerCase() : ""}${f.id === "gif" || f.id === "png" ? " · desde " + ST.fmtTc(s.t) : ""}`;
      const id = await ST.ask(s.vid, "export", text, { export: { format: f.id, ext: f.ext, w: f.w || 0, h: f.h || 0, audio: !!f.audio, quality: hasQ ? s.exp.q : "", at_time: +s.t.toFixed(2) } }); App.toast(id ? "Pedido enviado. Mira el avance aquí abajo." : "No se pudo enviar el pedido."); if (id) ST.renderRight(); });
    bindReqs(E("st-expreqs"));
  }

  // ---------- Biblioteca del Estudio (izquierda) ----------
  const LTABS = [["fondos", "Fondos"], ["texto", "Texto"], ["transiciones", "Transiciones"], ["imagenes", "Imágenes"], ["subs", "Subtítulos"], ["sonido", "Sonido"], ["estilos", "Estilos"]];
  const THUMB = { original: "▢", "black-glow": "◐", gradient: "◒", ondas: "∿", red: "⁂", rayos: "ϟ", universo: "✦", solid: "■", titulo: "Aa", amarillo: "Aa", aston: "𝒜a", etiqueta: "Ab", mano: "✎", tarjeta: "▤", versus: "⇄" };
  function styleCatalog() {
    const lab = S.expStyles.map((x) => ({ id: x.id, name: x.name || x.id, desc: x.description || "", approved: x.status === "aprobado" })), known = new Set(lab.map((x) => x.id));
    const extra = Object.entries(SLib().ESTILOS).filter(([k]) => !known.has(k)).map(([k, x]) => ({ id: k, name: x.name, desc: x.desc, approved: false }));
    return [...lab, ...extra].sort((a, b) => (b.approved - a.approved) || a.name.localeCompare(b.name));
  }
  ST.stylePicker = function (target) {
    const s = SE(), v = ST.video(), sibs = sel.siblings(v), free = ST.MAX_VERSIONS - sibs.length, n = sibs.length + 1, cat = styleCatalog(), isNew = target !== "this";
    if (isNew && free < 1) { App.toast(`Ya hay ${ST.MAX_VERSIONS} versiones de esta pieza. Es el máximo.`); return; }
    const grp = (title, list) => (list.length ? `<h4 class="st-gh">${title}</h4>` + list.map((x) => `<label class="st-chk"><input type="checkbox" value="${esc(x.id)}"><span><b>${esc(x.name)}</b><small>${esc(x.desc)}</small></span></label>`).join("") : "");
    ST.modal(`<h3>${isNew ? `Nueva versión (v${n} de ${ST.MAX_VERSIONS})` : "Estilos para esta versión"}</h3><p class="st-hint">Elige uno o varios. ${isNew ? "Cada versión puede tener un estilo distinto, o puedes mezclar varios en una sola." : "Claude los combina en esta versión y ves la lista de pasos."}</p>
      <div class="st-chklist" id="st-nv-list">${grp("Aprobados", cat.filter((x) => x.approved))}${grp("En prueba (todavía sin votar)", cat.filter((x) => !x.approved))}</div>
      <div class="st-f" id="st-nv-modewrap" hidden><span class="l">Con varios estilos</span><div class="st-seg" role="group"><button type="button" data-mode="combo" aria-pressed="true">Mezclarlos en una versión</button>${isNew ? `<button type="button" data-mode="separate" aria-pressed="false">Una versión por estilo</button>` : ""}</div></div>
      <div class="st-f"><label for="st-nv-note">Indicaciones (opcional)</label><textarea id="st-nv-note" placeholder="Por ejemplo: más animación, otro título, sin fotos"></textarea></div><div class="st-acts"><button class="btn pri" id="st-nv-go" type="button" disabled>${isNew ? "Pedir la versión" : "Aplicar estilos"}</button><button class="btn" data-st-close type="button">Cancelar</button></div>`);
    const list = E("st-nv-list"), go = E("st-nv-go"), wrap = E("st-nv-modewrap"); let mode = "combo";
    const picked = () => [...list.querySelectorAll("input:checked")].map((i) => i.value), sync = () => { const k = picked().length; go.disabled = !k; wrap.hidden = k < 2; };
    list.addEventListener("change", sync); wrap.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => { mode = b.dataset.mode; wrap.querySelectorAll("[data-mode]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }));
    go.addEventListener("click", async () => {
      const ids = picked(); if (!ids.length) return; const names = ids.map((i) => (cat.find((x) => x.id === i) || {}).name || i), note = E("st-nv-note").value.trim(), piece = v.pieceName || v.piece; ST.modal(""); let text, extra;
      if (!isNew) { text = `Aplica a esta versión ${ids.length > 1 ? "la combinación de los estilos" : "el estilo"} «${names.join("» + «")}».${note ? " Indicaciones: " + note : ""}`; extra = { styles: ids, styleNames: names, mode: "combo", scope: "video" }; }
      else if (ids.length > 1 && mode === "separate") { const take = Math.min(ids.length, free), nums = Array.from({ length: take }, (_, i) => n + i); text = `Arma ${take} versiones nuevas de ${piece} (${nums.map((x) => "v" + x).join(", ")}), cada una con su propio estilo: ${names.slice(0, take).map((x, i) => `v${nums[i]} «${x}»`).join(", ")}, a partir de esta versión.${note ? " Indicaciones: " + note : ""}`; extra = { styles: ids.slice(0, take), styleNames: names.slice(0, take), mode: "separate", newVersions: nums }; }
      else { text = `Arma la versión v${n} de ${piece} con ${ids.length > 1 ? "la combinación de los estilos" : "el estilo"} «${names.join("» + «")}» a partir de esta versión.${note ? " Indicaciones: " + note : ""}`; extra = { styles: ids, styleNames: names, mode: "combo", newVersion: n }; }
      const rid = await ST.ask(s.vid, isNew ? "version" : "cambio", text, extra); App.toast(rid ? "Pedido enviado. Síguelo en la pestaña Claude." : "No se pudo enviar el pedido."); s.rtab = "claude"; ST.renderRight();
    });
  };
  function libUse(kind, id) {
    const s = SE(), L = SLib();
    if (kind === "subs") { ST.commit(SM().setSubs(s.spec, { style: L.SUBS[id].style }), "Cambié el estilo de subtítulos"); return; }
    const lib = kind === "fondo" ? L.FONDOS[id] : L.TEXTOS[id]; if (!lib) return; const tr = kind === "fondo" ? "bg" : lib.track || "text", clip = lib.make(SM().q(s.t), { face: s.spec.base && s.spec.base.face });
    if (clip.d != null) clip.d = Math.min(clip.d, Math.max(0.5, s.spec.duration - clip.t)); const r = SM().addClip(s.spec, tr, clip); ST.commit(r.spec, "Agregué " + lib.name.toLowerCase()); ST.select(r.id);
  }
  ST.renderLeft = function () {
    const s = SE(); if (!s) return; E("st-ltabs").innerHTML = LTABS.map(([k, n]) => `<button type="button" role="tab" data-lt="${k}" aria-selected="${s.ltab === k}">${n}</button>`).join("");
    E("st-ltabs").querySelectorAll("[data-lt]").forEach((b) => b.addEventListener("click", () => { s.ltab = b.dataset.lt; ST.renderLeft(); }));
    const pane = E("st-lpane"), L = SLib();
    if (!s.spec) { pane.innerHTML = `<div class="st-empty">La biblioteca se usa en el editor completo. Pide que se abra ahí (arriba, en el aviso).</div>`; return; }
    const item = (id, n, d, kind) => `<button class="st-li" type="button" data-kind="${kind}" data-id="${id}"><span class="st-th">${THUMB[id] || "•"}</span><span><b>${esc(n)}</b><span>${esc(d)}</span></span></button>`, tab = s.ltab; let html = "";
    if (tab === "fondos") html = `<p class="st-hint">Toca uno para agregarlo en el cursor (${ST.fmtTc(s.t)}).</p><div class="st-lib">${Object.entries(L.FONDOS).map(([k, x]) => item(k, x.name, x.desc, "fondo")).join("")}</div>`;
    else if (tab === "texto") html = `<p class="st-hint">Toca uno para agregarlo en el cursor (${ST.fmtTc(s.t)}).</p><div class="st-lib">${Object.entries(L.TEXTOS).map(([k, x]) => item(k, x.name, x.desc, "texto")).join("")}</div>`;
    else if (tab === "transiciones") html = `<p class="st-hint">Elige un fondo en la línea de tiempo y toca cómo entra o cómo sale.</p><div class="st-lib">${Object.entries(L.TRANSICIONES).map(([k, x]) => `<div class="st-li" style="grid-template-columns:1fr"><span><b>${esc(x.name)}</b><span>${esc(x.desc)}</span><span class="st-acts"><button class="btn sm" data-tr="in:${k}" type="button">Entrada</button><button class="btn sm" data-tr="out:${k}" type="button">Salida</button></span></span></div>`).join("")}</div>`;
    else if (tab === "imagenes") html = `<p class="st-hint">Claude busca fotos libres (Wikimedia, bancos gratis) y las pone sin tapar nada. Escribe qué quieres ver.</p><div class="st-f"><textarea id="st-img-q" placeholder="Por ejemplo: retrato de Nikola Tesla, las pirámides de Egipto"></textarea></div><div class="st-acts"><button class="btn pri" id="st-img-go" type="button">Pedir imagen</button></div>`;
    else if (tab === "subs") html = `<p class="st-hint">Cómo se ven los subtítulos de todo el video.</p><div class="st-lib">${Object.entries(L.SUBS).map(([k, x]) => item(k, x.name, x.desc, "subs")).join("")}</div><div class="st-acts"><button class="btn" id="st-open-subs" type="button">Más ajustes de subtítulos</button></div>`;
    else if (tab === "sonido") html = `<p class="st-hint">Solo se permite un whoosh suave, bajito, en las transiciones.</p><div class="st-acts" style="margin-top:0"><button class="btn pri" id="st-whoosh" type="button">Poner whoosh en cada transición</button><button class="btn" id="st-nowhoosh" type="button">Quitar todos los sonidos</button></div>`;
    else { const cat = styleCatalog(), card = (x) => `<div class="st-li" style="grid-template-columns:1fr"><span><b>${esc(x.name)}</b><span>${esc(x.desc)}</span><span class="st-acts"><button class="btn sm" data-style="${esc(x.id)}" data-sn="${esc(x.name)}" type="button">Aplicar a esta versión</button><button class="btn sm ghost" data-newv="${esc(x.id)}" type="button">Versión nueva</button></span></span></div>`;
      html = `<p class="st-hint">Un estilo cambia el aspecto de toda la versión. Puedes elegir uno, mezclar varios o armar una versión por estilo.</p><div class="st-acts" style="margin-top:0"><button class="btn pri" id="st-pick-many" type="button">Elegir varios estilos</button></div><h4 class="st-gh">Aprobados</h4><div class="st-lib">${cat.filter((x) => x.approved).map(card).join("") || '<div class="st-empty">Todavía no hay estilos aprobados.</div>'}</div><h4 class="st-gh">En prueba</h4><div class="st-lib">${cat.filter((x) => !x.approved).map(card).join("")}</div>`; }
    pane.innerHTML = html;
    pane.querySelectorAll(".st-li[data-kind]").forEach((b) => b.addEventListener("click", () => libUse(b.dataset.kind, b.dataset.id)));
    pane.querySelectorAll("[data-tr]").forEach((b) => b.addEventListener("click", () => { const [side, type] = b.dataset.tr.split(":"), f = s.sel ? SM().findClip(s.spec, s.sel) : null; if (!f || f.track.kind !== "background") { App.toast("Primero elige un fondo en la línea de tiempo."); return; } ST.commit(SM().updateClip(s.spec, f.clip.id, { [side]: { type, d: ((f.clip[side] || {}).d != null ? f.clip[side].d : 0.5) || 0.5 } }), `Puse ${L.TRANSICIONES[type].name} en la ${side === "in" ? "entrada" : "salida"}`); }));
    pane.querySelectorAll("[data-style]").forEach((b) => b.addEventListener("click", async () => { const id = await ST.ask(s.vid, "cambio", `Cambia esta versión al estilo «${b.dataset.sn}».`, { styles: [b.dataset.style], styleNames: [b.dataset.sn], mode: "combo", scope: "video" }); App.toast(id ? "Pedido enviado. Síguelo en la pestaña Claude." : "No se pudo enviar."); s.rtab = "claude"; ST.renderRight(); E("st").classList.add("panel-open"); }));
    pane.querySelectorAll("[data-newv]").forEach((b) => b.addEventListener("click", () => ST.stylePicker("new")));
    const pm = E("st-pick-many"); if (pm) pm.addEventListener("click", () => ST.stylePicker("this"));
    const ig = E("st-img-go"); if (ig) ig.addEventListener("click", async () => { const q = E("st-img-q").value.trim(); if (!q) { App.toast("Escribe qué imagen quieres."); return; } const id = await ST.ask(s.vid, "cambio", `Busca una imagen libre de derechos para: ${q}. Ponla como recuadro que entra y sale, dentro de la zona segura y sin tapar nada.`, { scope: "video", at_time: +s.t.toFixed(2) }); App.toast(id ? "Pedido enviado. Síguelo en la pestaña Claude." : "No se pudo enviar."); s.rtab = "claude"; ST.renderRight(); });
    const os = E("st-open-subs"); if (os) os.addEventListener("click", () => { s.sel = "subs"; s.rtab = "ajustes"; ST.renderRight(); E("st").classList.add("panel-open"); });
    const wh = E("st-whoosh"); if (wh) wh.addEventListener("click", () => { let sp = s.spec; const sf = SM().trackOfKind(sp, "sfx"); (SM().trackOfKind(sp, "background") || { clips: [] }).clips.forEach((c) => { [["in", c.t], ["out", SM().clipEnd(c) - 0.45]].forEach(([side, t]) => { if (((c[side] || {}).type || "cut") !== "cut" && !(sf.clips || []).some((x) => Math.abs(x.t - t) < 0.3)) sp = SM().addClip(sp, "sfx", { t: SM().q(Math.max(0, t - 0.1)), sfx: "whoosh" }).spec; }); }); ST.commit(sp, "Puse whoosh en las transiciones"); });
    const nw = E("st-nowhoosh"); if (nw) nw.addEventListener("click", () => { const o = SM().clone(s.spec); SM().trackOfKind(o, "sfx").clips = []; ST.commit(o, "Quité los sonidos"); });
  };
})();
