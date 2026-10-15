/* Aura · Estudio (inspector). Un solo panel contextual: muestra la herramienta elegida en el dock (con mosaicos visuales de la Biblioteca)
   o los ajustes del clip elegido. Lo esencial a la vista; lo demas en "Más ajustes". */
(function () {
  "use strict";
  const App = window.App, S = App.S, sel = App.sel, ST = App.st, { esc, icon } = App, E = ST.E;
  const SM = () => window.StudioModel, SLib = () => window.StudioLib;
  const SE = () => ST.SE;
  const setIn = (obj, path, val) => { const o = {}; let c = o; const p = path.split("."); p.forEach((k, i) => { c[k] = i === p.length - 1 ? val : {}; c = c[k]; }); return o; };
  const transOpts = () => Object.entries(SLib().TRANSICIONES).map(([k, t]) => [k, t.name]);
  const TDEMO = { iris: "iris", zoom: "punch", wipe: "wipe", slide: "slide", flash: "flash", blur: "blur", cut: "cut" };
  const TITLES = { texto: "Texto", fondo: "Fondos", imagenes: "Imágenes", transiciones: "Transiciones", subtitulos: "Subtítulos", sonido: "Sonido", estilos: "Estilos", transcripcion: "Transcripción", claude: "Claude", exportar: "Exportar", calidad: "Calidad" };
  const LEGACY_OK = new Set(["transcripcion", "claude", "exportar"]);

  // ---------- abrir / cerrar herramientas ----------
  ST.openTool = function (name, focus) {
    const s = SE(); if (!s) return; if (!s.spec && !LEGACY_OK.has(name) && name !== "calidad") name = "claude";
    if (name !== "clip") { s.sel = null; ST.renderSelection(); ST.renderTimeline(); }
    s.tool = name; ST.renderInspector(); ST.renderDock();
    if (focus) setTimeout(() => { const t = E("st-ask-text"); if (t) t.focus(); }, 380);
  };
  ST.closeTool = function () { const s = SE(); if (!s) return; s.tool = null; if (s.sel) { s.sel = null; ST.renderSelection(); ST.renderTimeline(); } ST.renderInspector(); ST.renderDock(); };
  ST.renderDock = function () {
    const s = SE(), d = E("st-dock"); if (!s || !d) return;
    d.querySelectorAll("[data-tool]").forEach((b) => { const k = b.dataset.tool; b.setAttribute("aria-pressed", String(s.tool === k)); b.disabled = !s.spec && !LEGACY_OK.has(k); });
    const open = !!s.tool; E("st").classList.toggle("insp-open", open);
  };
  ST.renderRight = () => ST.renderInspector(); // compatibilidad
  ST.renderInspector = function () {
    const s = SE(); if (!s) return; const pane = E("st-ipane"), title = E("st-ititle"), acts = E("st-iacts");
    ST.renderDock(); if (!s.tool) { pane.innerHTML = ""; acts.innerHTML = ""; return; }
    const keep = s.lastTool === s.tool ? pane.scrollTop : 0, fresh = s.lastTool !== s.tool; s.lastTool = s.tool;
    acts.innerHTML = "";
    if (s.tool === "clip") paneClip(pane, title, acts);
    else { title.textContent = TITLES[s.tool] || ""; ({ texto: toolTexto, fondo: toolFondo, imagenes: paneMedios, transiciones: toolTrans, subtitulos: paneSubs, sonido: toolSonido, estilos: toolEstilos, transcripcion: paneTranscripcion, claude: paneClaude, exportar: paneExportar, calidad: paneCalidad }[s.tool] || (() => {}))(pane); }
    pane.scrollTop = keep;
    if (fresh) { pane.classList.remove("fresh"); void pane.offsetWidth; pane.classList.add("fresh"); }
    App.observeDemos && App.observeDemos(pane);
  };
  ST.refreshPanes = function () {
    const s = SE(); if (!s) return;
    if (s.tool === "claude" || s.tool === "exportar") { const a = document.activeElement; if (a && a.closest && a.closest("#st-ipane") && /^(TEXTAREA|INPUT|SELECT)$/.test(a.tagName)) { renderRequestsOnly(); return; } ST.renderInspector(); }
    ST.renderTop();
  };

  // ---------- campos ----------
  const fNum = (label, path, v, min, max, step, unit) => `<div class="st-f"><label>${label}<output>${v}${unit || ""}</output></label><input class="st-range" type="range" data-f="${path}" data-ty="num" data-unit="${unit || ""}" min="${min}" max="${max}" step="${step || 1}" value="${v}"></div>`;
  const fSel = (label, path, v, opts) => `<div class="st-f"><label>${label}</label><select data-f="${path}" data-ty="str">${opts.map(([k, n]) => `<option value="${esc(k)}" ${String(v) === k ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></div>`;
  const fSeg = (label, path, v, opts) => `<div class="st-f"><span class="l">${label}</span><div class="st-seg" role="group">${opts.map(([k, n]) => `<button type="button" data-fs="${path}" data-val="${esc(k)}" aria-pressed="${String(v) === k}">${esc(n)}</button>`).join("")}</div></div>`;
  const fSwatch = (label, path, v) => `<div class="st-f"><span class="l">${label}</span><div class="st-sw">${SLib().COLORES.map(([k, n]) => { const css = SM().COLORS[k] || k; return `<button type="button" data-fs="${path}" data-val="${esc(k)}" aria-pressed="${v === k}" aria-label="${n}" title="${n}" style="background:${css}"></button>`; }).join("")}</div></div>`;
  const FONT_CSS = { Anton: '"Anton", Impact, sans-serif', Inter: '"Inter", system-ui, sans-serif', Caveat: '"Caveat", cursive', Aston: '"AstonScript", "Caveat", cursive' };
  const fFonts = (path, v) => `<div class="st-f"><span class="l">Fuente</span><div class="st-fonts">${SLib().FUENTES.map(([k, n]) => `<button type="button" data-fs="${path}" data-val="${esc(k)}" aria-pressed="${v === k}" title="${esc(n)}"><b style="font-family:${FONT_CSS[k] || "inherit"}">Aa</b><small>${esc(n.split(" (")[0])}</small></button>`).join("")}</div></div>`;
  const LBL = { "style.size": "el tamaño", "style.font": "la fuente", "style.color": "el color", text: "el texto", t: "el inicio", d: "la duración", "style.x": "la posición", "style.y": "la posición", "style.glow": "el brillo", "style.align": "la alineación", "style.maxW": "el ancho máximo", "style.spacing": "el espaciado", "card.size": "el tamaño de la tarjeta", "card.kicker": "el título de la tarjeta", "box.x": "la posición", "box.y": "la posición", "box.w": "el ancho", "box.h": "el alto", "box.rot": "la inclinación", "anim.in": "cómo entra", "anim.out": "cómo sale", in: "cómo entra", "in.type": "la transición de entrada", "out.type": "la transición de salida", "in.d": "la duración de la entrada", "out.d": "la duración de la salida", front: "si va delante o detrás de la persona", cutout: "el recorte de la persona" };
  function bindFields(pane, id, kind) {
    const apply = (path, val, text, keep) => { const s = SE(); const next = kind === "subs" ? SM().setSubs(s.spec, setIn({}, path, val)) : SM().updateClip(s.spec, id, setIn({}, path, val)); ST.commit(next, text, { keepPanel: keep }); };
    pane.querySelectorAll("[data-f]").forEach((el) => el.addEventListener("input", () => { const ty = el.dataset.ty, val = ty === "num" ? parseFloat(el.value) : el.value; if (ty === "num" && Number.isNaN(val)) return; const out = el.parentElement.querySelector("output"); if (out) out.textContent = el.value + (el.dataset.unit || ""); apply(el.dataset.f, val, `Cambié ${LBL[el.dataset.f] || "un ajuste"}`, true); }));
    pane.querySelectorAll("[data-fs]").forEach((el) => el.addEventListener("click", () => { pane.querySelectorAll(`[data-fs="${el.dataset.fs}"]`).forEach((x) => x.setAttribute("aria-pressed", String(x === el))); apply(el.dataset.fs, el.dataset.val === "true" ? true : el.dataset.val === "false" ? false : el.dataset.val, `Cambié ${LBL[el.dataset.fs] || "un ajuste"}`, true); }));
  }
  function logHtml(n) { const l = (SE().log || []).slice(0, n); return l.length ? `<ul class="st-log">${l.map((x) => `<li><span>${esc(x.text)}${x.by === "claude" ? " · Claude" : ""}</span><time>${App.ago(x.at)}</time></li>`).join("")}</ul>` : `<p class="st-hint">Todavía no cambiaste nada.</p>`; }
  const tile = (attr, demo, name, sub) => `<button class="st-tile" type="button" ${attr}><span class="st-tdemo">${App.demoHtml(demo, { mini: true })}</span><b>${esc(name)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</button>`;
  const at = () => App.mmss(SE().t);

  // ---------- herramientas ----------
  function libUse(kind, id) {
    const s = SE(), L = SLib();
    if (kind === "subs") { ST.commit(SM().setSubs(s.spec, { style: L.SUBS[id].style }), "Cambié el estilo de subtítulos", { keepPanel: true }); App.toast("Subtítulos: " + L.SUBS[id].name); return; }
    const lib = kind === "fondo" ? L.FONDOS[id] : L.TEXTOS[id]; if (!lib) return; const tr = kind === "fondo" ? "bg" : lib.track || "text", clip = lib.make(SM().q(s.t), { face: s.spec.base && s.spec.base.face });
    if (clip.d != null) clip.d = Math.min(clip.d, Math.max(0.5, s.spec.duration - clip.t)); const r = SM().addClip(s.spec, tr, clip); ST.commit(r.spec, "Agregué " + lib.name.toLowerCase()); ST.select(r.id);
  }
  function toolTexto(pane) {
    const L = SLib(), s = SE(), here = SM().activeAt(s.spec, s.t).filter((x) => x.track.kind === "text");
    pane.innerHTML = `<p class="st-hint">Toca un estilo y se agrega en <b>${at()}</b>.${here.length ? "" : ""}</p><div class="st-tiles">${Object.entries(L.TEXTOS).map(([k, x]) => tile(`data-add="texto" data-id="${k}"`, "tx-" + k, x.name)).join("")}</div>
      ${here.length ? `<div class="st-acts"><button class="btn sm" type="button" data-pick="${esc(here[0].clip.id)}">${icon("type")}Editar el texto en pantalla</button></div>` : ""}`;
    pane.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", () => libUse("texto", b.dataset.id)));
    pane.querySelectorAll("[data-pick]").forEach((b) => b.addEventListener("click", () => ST.select(b.dataset.pick)));
  }
  function toolFondo(pane) {
    const L = SLib();
    pane.innerHTML = `<p class="st-hint">Toca un fondo y se agrega en <b>${at()}</b>, detrás de la persona.</p><div class="st-tiles">${Object.entries(L.FONDOS).map(([k, x]) => tile(`data-add="fondo" data-id="${k}"`, "bg-" + k, x.name)).join("")}</div>`;
    pane.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", () => libUse("fondo", b.dataset.id)));
  }
  function bgTarget() { const s = SE(); const f = s.sel ? SM().findClip(s.spec, s.sel) : null; if (f && f.track.kind === "background") return f; const a = SM().activeAt(s.spec, s.t).find((x) => x.track.kind === "background"); return a || null; }
  function toolTrans(pane) {
    const s = SE(), L = SLib(), f = bgTarget(), side = s.trSide || "in", cur = f ? ((f.clip[side] || {}).type || "cut") : null;
    pane.innerHTML = `<div class="st-seg wide" role="group"><button type="button" data-side="in" aria-pressed="${side === "in"}">Al entrar</button><button type="button" data-side="out" aria-pressed="${side === "out"}">Al salir</button></div>
      <p class="st-hint">${f ? `Se aplica al fondo <b>${esc(ST.clipText("background", f.clip))}</b> (${App.mmss(f.clip.t)} a ${App.mmss(SM().clipEnd(f.clip))}).` : "No hay un fondo en este momento. Agrega uno en <b>Fondos</b>."}</p>
      <div class="st-tiles">${Object.entries(L.TRANSICIONES).map(([k, x]) => tile(`data-tr="${k}" aria-pressed="${cur === k}" ${f ? "" : "disabled"}`, "x-" + (TDEMO[k] || "cut"), x.name)).join("")}</div>`;
    pane.querySelectorAll("[data-side]").forEach((b) => b.addEventListener("click", () => { s.trSide = b.dataset.side; ST.renderInspector(); }));
    pane.querySelectorAll("[data-tr]").forEach((b) => b.addEventListener("click", () => { const t = bgTarget(); if (!t) return; const type = b.dataset.tr; ST.commit(SM().updateClip(s.spec, t.clip.id, { [side]: { type, d: ((t.clip[side] || {}).d != null ? t.clip[side].d : 0.5) || 0.5 } }), `Puse ${L.TRANSICIONES[type].name} ${side === "in" ? "al entrar" : "al salir"}`, { keepPanel: false }); ST.pause(); ST.seek(Math.max(0, (side === "in" ? t.clip.t : SM().clipEnd(t.clip) - 0.6) - 0.15)); ST.play(); }));
  }
  function toolSonido(pane) {
    const s = SE(), sf = SM().trackOfKind(s.spec, "sfx"), list = (sf ? sf.clips : []);
    pane.innerHTML = `<p class="st-hint">Un whoosh suave y bajito en las transiciones. Es el único sonido permitido.</p><div class="st-acts" style="margin-top:0"><button class="btn sm pri" id="st-whoosh" type="button">${icon("volume")}Poner en cada transición</button>${list.length ? `<button class="btn sm ghost" id="st-nowhoosh" type="button">Quitar todos</button>` : ""}</div>
      ${list.length ? `<h3>En este video</h3><div class="st-chiplist">${list.map((c) => `<button class="chip" type="button" data-sfx="${esc(c.id)}">${icon("volume")}${App.mmss(c.t)}</button>`).join("")}</div>` : ""}`;
    E("st-whoosh").addEventListener("click", () => { let sp = s.spec; const sfx = SM().trackOfKind(sp, "sfx"); (SM().trackOfKind(sp, "background") || { clips: [] }).clips.forEach((c) => { [["in", c.t], ["out", SM().clipEnd(c) - 0.45]].forEach(([side, t]) => { if (((c[side] || {}).type || "cut") !== "cut" && !(sfx.clips || []).some((x) => Math.abs(x.t - t) < 0.3)) sp = SM().addClip(sp, "sfx", { t: SM().q(Math.max(0, t - 0.1)), sfx: "whoosh" }).spec; }); }); ST.commit(sp, "Puse whoosh en las transiciones"); });
    const nw = E("st-nowhoosh"); if (nw) nw.addEventListener("click", () => { const o = SM().clone(s.spec); SM().trackOfKind(o, "sfx").clips = []; ST.commit(o, "Quité los sonidos"); });
    pane.querySelectorAll("[data-sfx]").forEach((b) => b.addEventListener("click", () => ST.select(b.dataset.sfx, true)));
  }
  function styleCatalog() {
    const lab = S.expStyles.map((x) => ({ id: x.id, name: x.name || x.id, desc: x.description || "", approved: x.status === "aprobado", demo: x.demo || (x.recipe ? "r-" + x.id : "e-palabra-ancla") })), known = new Set(lab.map((x) => x.id));
    const extra = Object.entries(SLib().ESTILOS).filter(([k]) => !known.has(k)).map(([k, x]) => ({ id: k, name: x.name, desc: x.desc, approved: false, demo: "e-" + k }));
    return [...lab, ...extra].sort((a, b) => (b.approved - a.approved) || a.name.localeCompare(b.name));
  }
  function toolEstilos(pane) {
    const s = SE(), cat = styleCatalog();
    const card = (x) => `<div class="st-style"><span class="st-tdemo">${App.demoHtml(x.demo, { mini: true })}</span><div><b>${esc(x.name)}</b><small>${esc(x.desc)}</small><span class="st-acts"><button class="btn sm" data-style="${esc(x.id)}" data-sn="${esc(x.name)}" type="button">Aplicar</button><button class="btn sm ghost" data-newv type="button">Versión nueva</button></span></div></div>`;
    pane.innerHTML = `<p class="st-hint">Un estilo cambia el aspecto de toda la versión. Claude lo aplica y ves los pasos.</p><div class="st-acts" style="margin-top:0"><button class="btn sm" id="st-pick-many" type="button">${icon("mix")}Mezclar varios estilos</button></div>
      <h3>Aprobados</h3><div class="st-styles">${cat.filter((x) => x.approved).map(card).join("") || '<div class="st-empty">Aún no hay estilos aprobados. Créalos en el Laboratorio.</div>'}</div><h3>Para probar</h3><div class="st-styles">${cat.filter((x) => !x.approved).map(card).join("")}</div>`;
    pane.querySelectorAll("[data-style]").forEach((b) => b.addEventListener("click", async () => { const id = await ST.ask(s.vid, "cambio", `Cambia esta versión al estilo «${b.dataset.sn}».`, { styles: [b.dataset.style], styleNames: [b.dataset.sn], mode: "combo", scope: "video" }); App.toast(id ? "Pedido enviado. Síguelo en Claude." : "No se pudo enviar."); ST.openTool("claude"); }));
    pane.querySelectorAll("[data-newv]").forEach((b) => b.addEventListener("click", () => ST.stylePicker("new")));
    E("st-pick-many").addEventListener("click", () => ST.stylePicker("this"));
  }

  // ---------- ajustes del clip elegido (lo esencial a la vista) ----------
  function paneClip(pane, title, acts) {
    const s = SE(), sp = s.spec, f = s.sel ? SM().findClip(sp, s.sel) : null;
    if (!f) { s.tool = null; ST.renderInspector(); return; }
    const c = f.clip, k = f.track.kind, st = c.style || {};
    title.textContent = { text: "Texto", background: "Fondo", media: c.type === "card" ? "Tarjeta" : "Imagen", sfx: "Sonido" }[k] || "Clip";
    acts.innerHTML = `<button class="iconbtn sm ghost" data-a="split" type="button" title="Cortar en el cursor (S)" aria-label="Cortar">${icon("scissors")}</button><button class="iconbtn sm ghost" data-a="dup" type="button" title="Duplicar (D)" aria-label="Duplicar">${icon("copy")}</button><button class="iconbtn sm ghost bad" data-a="del" type="button" title="Borrar" aria-label="Borrar">${icon("trash")}</button>`;
    acts.querySelectorAll("[data-a]").forEach((b) => b.addEventListener("click", () => { const a = b.dataset.a; if (a === "dup") { const r = SM().duplicateClip(s.spec, c.id); ST.commit(r.spec, "Dupliqué un clip"); if (r.id) ST.select(r.id); } else if (a === "split") ST.commit(SM().splitClip(s.spec, c.id, s.t), "Corté un clip"); else { ST.commit(SM().removeClip(s.spec, c.id), "Quité un clip"); ST.select(null); } }));
    const timing = `${fNum("Empieza", "t", +c.t.toFixed(2), 0, sp.duration, 0.05, " s")}${c.d != null ? fNum("Dura", "d", +c.d.toFixed(2), 0.2, sp.duration, 0.05, " s") : ""}`;
    let html = "";
    if (k === "text") html = `<div class="st-f"><label for="st-ft">Lo que dice</label><textarea id="st-ft" data-f="text" data-ty="str" rows="2">${esc(c.text || "")}</textarea></div>${fFonts("style.font", st.font || "Anton")}${fNum("Tamaño", "style.size", st.size || 100, 40, 320, 2, " px")}${fSwatch("Color", "style.color", st.color || "white")}
      ${fSeg("Entra", "anim.in", (c.anim || {}).in || "cut", [["pop", "Pop"], ["slide", "Desliza"], ["fade", "Aparece"], ["type", "Teclea"], ["cut", "Corte"]])}
      <details class="st-more"><summary>Más ajustes</summary>${fSeg("Alineación", "style.align", st.align || "center", [["left", "Izq."], ["center", "Centro"], ["right", "Der."]])}${fSeg("Brillo", "style.glow", String(st.glow == null ? "soft" : st.glow), [["none", "Ninguno"], ["soft", "Suave"], ["neon", "Neón"]])}${fSeg("Sale", "anim.out", (c.anim || {}).out || "cut", [["fade", "Desaparece"], ["slide", "Sube"], ["cut", "Corte"]])}${fNum("Horizontal", "style.x", st.x != null ? st.x : 540, 0, 1080, 2)}${fNum("Vertical", "style.y", st.y != null ? st.y : 900, 0, 1920, 2)}${fNum("Ancho máximo", "style.maxW", st.maxW || 808, 200, 1000, 4, " px")}${fNum("Espaciado", "style.spacing", st.spacing || 0, 0, 20, 1, " px")}${timing}</details>`;
    else if (k === "background") { const curT = c.type === "anim" ? "anim:" + ((c.props || {}).name || "ondas") : c.type; const kinds = [["original", "original"], ["black-glow", "black-glow"], ["gradient", "gradient"], ["solid", "solid"], ["anim:ondas", "ondas"], ["anim:red", "red"], ["anim:rayos", "rayos"], ["anim:universo", "universo"]];
      html = `<div class="st-f"><span class="l">Tipo</span><div class="st-tiles small">${kinds.map(([v, d]) => tile(`data-bg="${v}" aria-pressed="${curT === v}"`, "bg-" + d, (SLib().FONDOS[d] || {}).name ? SLib().FONDOS[d].name.replace("Animación: ", "") : d)).join("")}</div></div>
        ${fSeg("Recortar a la persona", "cutout", String(c.cutout !== false), [["true", "Sí"], ["false", "No"]])}${fSel("Al entrar", "in.type", (c.in || {}).type || "cut", transOpts())}${fSel("Al salir", "out.type", (c.out || {}).type || "cut", transOpts())}
        <details class="st-more"><summary>Más ajustes</summary>${fNum("Duración de la entrada", "in.d", (c.in || {}).d != null ? c.in.d : 0.6, 0, 2, 0.1, " s")}${fNum("Duración de la salida", "out.d", (c.out || {}).d != null ? c.out.d : 0.5, 0, 2, 0.1, " s")}${timing}</details>`; }
    else if (k === "media" && c.type === "card") { const cd = c.card || {}; html = `<div class="st-f"><label>Título pequeño</label><input type="text" data-f="card.kicker" data-ty="str" value="${esc(cd.kicker || "")}"></div>${cd.variant === "columns" ? `<p class="st-hint">Las dos columnas se cambian pidiéndoselo a Claude.</p>` : `<div class="st-f"><label for="st-fl">Líneas (una por renglón)</label><textarea id="st-fl" rows="3">${esc((cd.lines || []).map((l) => l.text).join("\n"))}</textarea></div>`}${fNum("Tamaño del texto", "card.size", cd.size || 86, 40, 120, 2, " px")}${fSeg("Respecto a la persona", "front", String(c.front !== false), [["true", "Delante"], ["false", "Detrás"]])}<details class="st-more"><summary>Más ajustes</summary>${fNum("Vertical", "box.y", (c.box || {}).y || 0, 237, 1479, 2)}${fNum("Horizontal", "box.x", (c.box || {}).x || 0, 0, 900, 2)}${timing}</details>`; }
    else if (k === "media") html = `${fNum("Ancho", "box.w", (c.box || {}).w || 300, 80, 1000, 2, " px")}${fNum("Inclinación", "box.rot", (c.box || {}).rot || 0, -15, 15, 0.5, "°")}${fSeg("Entra", "in", c.in || "pop", [["pop", "Pop"], ["slide", "Desliza"], ["fade", "Aparece"]])}${fSeg("Respecto a la persona", "front", String(c.front !== false), [["true", "Delante"], ["false", "Detrás"]])}<details class="st-more"><summary>Más ajustes</summary>${fNum("Horizontal", "box.x", (c.box || {}).x || 0, 0, 1080, 2)}${fNum("Vertical", "box.y", (c.box || {}).y || 0, 0, 1920, 2)}${fNum("Alto", "box.h", (c.box || {}).h || 300, 80, 1400, 2, " px")}${timing}</details>${c.src && c.src.license ? `<p class="st-hint">Licencia: ${esc(c.src.license)}${c.src.author ? " · " + esc(c.src.author) : ""}</p>` : ""}`;
    else html = `<p class="st-hint">Un whoosh suave en una transición.</p>${fNum("Momento", "t", +c.t.toFixed(2), 0, sp.duration, 0.05, " s")}`;
    pane.innerHTML = html; bindFields(pane, c.id, "clip");
    pane.querySelectorAll("[data-bg]").forEach((b) => b.addEventListener("click", () => { const [ty, nm] = b.dataset.bg.split(":"); pane.querySelectorAll("[data-bg]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); ST.commit(SM().updateClip(s.spec, c.id, ty === "anim" ? { type: "anim", props: { name: nm } } : { type: ty }), "Cambié el fondo", { keepPanel: true }); }));
    const fl = pane.querySelector("#st-fl"); if (fl) fl.addEventListener("input", () => { const old = (c.card || {}).lines || [], lines = fl.value.split("\n").map((t, i) => ({ text: t, at: (old[i] || {}).at != null ? old[i].at : 0.5 + i, hl: (old[i] || {}).hl })).filter((l) => l.text.trim()); ST.commit(SM().updateClip(s.spec, c.id, { card: { lines } }), "Cambié el texto de la tarjeta", { keepPanel: true }); });
  }
  function paneSubs(pane) {
    const s = SE(), L = SLib(), tr = SM().trackOfKind(s.spec, "subtitles"), st = tr.style || {}, n = (tr.lines || []).length;
    pane.innerHTML = `<p class="st-hint">Una sola línea, hasta 3 palabras, siempre en el mismo lugar. ${n} frases.</p><div class="st-tiles">${Object.entries(L.SUBS).map(([k, x]) => tile(`data-subs="${k}"`, "sub-" + k, x.name)).join("")}</div>
      ${fNum("Tamaño", "style.size", st.size || 64, 56, 96, 2, " px")}${fNum("Altura", "style.y", st.y || 880, 237, 1479, 2)}
      <details class="st-more"><summary>Palabras especiales</summary><div class="st-f"><label for="st-hero">En Aston (especiales), separadas por coma</label><input id="st-hero" type="text" value="${esc((st.hero || []).join(", "))}"></div><div class="st-f"><label for="st-key">En amarillo (clave), separadas por coma</label><input id="st-key" type="text" value="${esc((st.key || []).join(", "))}"></div></details>
      <p class="st-hint">Para cambiar lo que dicen, usa <a href="#" data-goto-tr>Transcripción</a>.</p>`;
    bindFields(pane, null, "subs");
    pane.querySelectorAll("[data-subs]").forEach((b) => b.addEventListener("click", () => libUse("subs", b.dataset.subs)));
    const list = (id, key) => E(id).addEventListener("input", (e) => ST.commit(SM().setSubs(s.spec, { style: { [key]: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) } }), key === "hero" ? "Cambié las palabras en Aston" : "Cambié las palabras clave", { keepPanel: true }));
    list("st-hero", "hero"); list("st-key", "key");
    pane.querySelector("[data-goto-tr]").addEventListener("click", (e) => { e.preventDefault(); ST.openTool("transcripcion"); });
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
    pane.innerHTML = `<div class="st-row"><input id="st-trq" type="search" placeholder="Buscar una palabra" aria-label="Buscar en la transcripción">${hasBoth ? `<span class="st-seg fix"><button type="button" data-tl="es" aria-pressed="${s.tlang === "es"}">ES</button><button type="button" data-tl="en" aria-pressed="${s.tlang === "en"}">EN</button></span>` : ""}</div>
      <p class="st-hint">Toca una frase para ir a ese momento.${s.spec ? " Corrige el texto y se actualizan los subtítulos." : ""}</p>
      <div class="st-tr" id="st-trl">${lines.map((l, i) => `<div class="st-trl" data-i="${i}" data-s="${l.s}" data-e="${l.e}"><time>${ST.fmtShort(l.s)}</time><div><span ${s.spec && s.tlang === (s.spec.lang || "es") ? 'contenteditable="plaintext-only" spellcheck="false"' : ""} data-txt>${esc(l.text)}</span>${l.other ? `<small>${esc(l.other)}</small>` : ""}</div></div>`).join("") || '<div class="st-empty">Todavía no hay transcripción de este video.</div>'}</div>`;
    const q = E("st-trq"); q.addEventListener("input", () => { const t = q.value.trim().toLowerCase(); pane.querySelectorAll(".st-trl").forEach((r) => { r.style.display = !t || r.textContent.toLowerCase().includes(t) ? "" : "none"; }); });
    pane.querySelectorAll("[data-tl]").forEach((b) => b.addEventListener("click", () => { s.tlang = b.dataset.tl; ST.renderInspector(); }));
    pane.querySelectorAll(".st-trl").forEach((r) => {
      r.addEventListener("click", (e) => { if (e.target.closest("[contenteditable]") && document.activeElement === e.target) return; ST.pause(); ST.seek(+r.dataset.s + 0.02); });
      const ed = r.querySelector("[contenteditable]"); if (ed) ed.addEventListener("input", () => { const sub = SM().trackOfKind(s.spec, "subtitles"), t0 = +r.dataset.s, ix = (sub.lines || []).findIndex((l) => Math.abs(l[0] - t0) < 0.05); if (ix < 0) return; const l2 = sub.lines.map((l, i) => (i === ix ? [l[0], l[1], ed.textContent] : l)); ST.commit(SM().setSubs(s.spec, { lines: l2 }), "Corregí una frase de los subtítulos", { keepPanel: true }); });
    });
  }
  ST.highlightTranscript = function () {
    const s = SE(); if (!s || s.tool !== "transcripcion") return; let cur = null;
    document.querySelectorAll("#st-trl .st-trl").forEach((r) => { const on = s.t >= +r.dataset.s && s.t < +r.dataset.e; if (on !== (r.dataset.now === "1")) r.dataset.now = on ? "1" : "0"; if (on) cur = r; });
    if (cur && s.handle && !s.handle.video.paused) { const p = E("st-ipane"), top = cur.offsetTop - p.offsetTop; if (top < p.scrollTop || top > p.scrollTop + p.clientHeight - 60) p.scrollTop = top - 60; }
  };

  // ---------- Imagenes (lo que se uso, con 👍 / 👎) ----------
  function paneMedios(pane) {
    const s = SE(), items = [];
    SM().allClips(s.spec).forEach((x) => { const c = x.clip; if (x.track.kind === "media") items.push({ id: c.id, name: c.type === "card" ? "Tarjeta · " + ((c.card || {}).kicker || "") : (c.src && c.src.title) || "Imagen", t: c.t, d: c.d, asset: c.src && c.src.asset, lic: c.src && c.src.license }); else if (x.track.kind === "background" && (c.type === "photo" || c.type === "anim")) items.push({ id: c.id, name: c.type === "photo" ? "Foto de fondo" : "Animación · " + ((c.props || {}).name || ""), t: c.t, d: c.d, asset: c.type === "photo" ? (c.props || {}).asset : "", lic: (c.props || {}).license }); });
    const fb = ST.fbOf(s.vid);
    pane.innerHTML = `<div class="st-ask"><label class="st-f"><span class="l">¿Qué imagen quieres ver?</span><textarea id="st-img-q" rows="2" placeholder="Por ejemplo: retrato de Nikola Tesla, las pirámides de Egipto"></textarea></label><div class="st-acts" style="margin-top:0"><button class="btn sm pri" id="st-img-go" type="button">${icon("sparkles")}Que Claude la busque</button></div><p class="st-hint">Fotos libres (Wikimedia, bancos gratis), puestas sin tapar nada.</p></div>
      <h3>En este video</h3>${items.map((m) => { const f = fb.find((x) => x.clipId === m.id) || {}; return `<div class="st-md" data-id="${esc(m.id)}">${m.asset ? `<img src="${esc(App.adapter().assetUrl(m.asset))}" alt="">` : `<div class="ph">${icon(m.name.startsWith("Anim") ? "sparkles" : "photo")}</div>`}<div><b>${esc(m.name)}</b><small>${ST.fmtShort(m.t)} a ${ST.fmtShort(m.t + (m.d || 0))}${m.lic ? " · " + esc(m.lic) : ""}</small><div class="st-acts" style="margin:0"><button class="btn sm ghost" data-fv="keep" type="button" aria-pressed="${f.verdict === "keep"}">👍</button><button class="btn sm ghost" data-fv="drop" type="button" aria-pressed="${f.verdict === "drop"}">👎</button><button class="btn sm ghost" data-goto type="button">Ver</button></div>${f.verdict === "drop" ? `<input type="text" data-note placeholder="¿Qué no te gusta? (opcional)" value="${esc(f.note || "")}">` : ""}</div></div>`; }).join("") || '<div class="st-empty">Este video todavía no usa imágenes ni animaciones.</div>'}`;
    pane.querySelectorAll(".st-md").forEach((r) => { const id = r.dataset.id;
      r.querySelectorAll("[data-fv]").forEach((b) => b.addEventListener("click", async () => { const cur = (fb.find((x) => x.clipId === id) || {}).verdict, v2 = cur === b.dataset.fv ? "" : b.dataset.fv; await mediaFeedback(s.vid, id, v2, ""); App.toast(v2 === "drop" ? "Anotado. Claude la reemplaza." : v2 === "keep" ? "Anotado: te gusta." : "Quitaste tu marca."); ST.renderInspector(); }));
      const g = r.querySelector("[data-goto]"); if (g) g.addEventListener("click", () => ST.select(id, true)); const n = r.querySelector("[data-note]"); if (n) n.addEventListener("change", () => mediaFeedback(s.vid, id, "drop", n.value)); });
    E("st-img-go").addEventListener("click", async () => { const q = E("st-img-q").value.trim(); if (!q) { App.toast("Escribe qué imagen quieres."); return; } const id = await ST.ask(s.vid, "cambio", `Busca una imagen libre de derechos para: ${q}. Ponla como recuadro que entra y sale, dentro de la zona segura y sin tapar nada.`, { scope: "video", at_time: +s.t.toFixed(2) }); App.toast(id ? "Pedido enviado. Síguelo en Claude." : "No se pudo enviar."); ST.openTool("claude"); });
  }
  async function mediaFeedback(vid, clipId, verdict, note) {
    const id = vid + "__" + clipId, v = sel.video(vid), ok = await ST.write("studio_media_feedback", id, { videoId: vid, clipId, verdict, note: note || "", status: verdict === "drop" ? "pedido" : "visto", at: ST.nowIso(), by: S.userId || "" });
    if (ok && verdict === "drop") App.data.tellSoon(`FEEDBACK DE IMAGEN en ${v ? sel.label(v) : vid}: 👎 al clip ${clipId}${note ? ` («${note}»)` : ""} (studio_media_feedback/${id}). Reemplázalo por otro y avisa en la lista de cambios.`);
    return ok;
  }

  // ---------- Claude: pedidos con lista de pasos ----------
  const STEP_ICON = { pendiente: "", haciendo: "…", hecho: "✓", error: "!" };
  const progress = (r) => { const st = r.steps || []; return st.length ? st.filter((x) => x.status === "hecho").length / st.length : r.status === "listo" ? 1 : 0; };
  const statusText = (r) => ({ pedido: "Enviado", trabajando: "Trabajando", listo: "Listo", error: "Hubo un problema", cancelado: "Cancelado" }[r.status] || r.status);
  function reqHtml(r) {
    const steps = r.steps || [], p = Math.round(progress(r) * 100), title = r.kind === "export" ? "Exportar · " + (r.text || "").slice(0, 80) : (r.text || "").slice(0, 140);
    return `<article class="st-req" data-rid="${esc(r.id)}" data-s="${esc(r.status)}"><header><span class="st-st" data-s="${esc(r.status)}">${esc(statusText(r))}</span><small>${App.ago(r.at)}</small></header><b>${esc(title)}</b>
      ${steps.length ? `<div class="bar" style="--p:${p}%"><i></i></div><ol class="st-steps">${steps.map((s) => `<li data-s="${esc(s.status || "pendiente")}"><span class="ic" aria-hidden="true">${STEP_ICON[s.status || "pendiente"] || ""}</span><span class="t">${esc(s.text)}${s.note ? `<small>${esc(s.note)}</small>` : ""}</span></li>`).join("")}</ol>` : r.status === "pedido" || r.status === "trabajando" ? `<p class="st-hint" style="margin:0">Claude escribe la lista de pasos aquí en un momento.</p>` : ""}
      ${r.reply ? `<p class="st-reply">${esc(r.reply)}</p>` : ""}${r.kind === "export" && r.result && r.result.asset ? `<div class="st-acts"><button class="btn pri sm" data-dl="${esc(r.result.asset)}" data-fn="${esc(r.result.name || "video")}" type="button">${icon("download")}Descargar${r.result.sizeMB ? ` (${r.result.sizeMB} MB)` : ""}</button></div>` : ""}
      ${r.status === "error" ? `<div class="st-acts"><button class="btn sm" data-retry="${esc(r.id)}" type="button">Pedirlo de nuevo</button></div>` : ""}</article>`;
  }
  function renderRequestsOnly() { const box = E("st-reqs"); if (box) { box.innerHTML = ST.reqsOf(SE().vid).filter((r) => r.kind !== "export").map(reqHtml).join("") || '<div class="st-empty">Todavía no le pediste nada a Claude en este video.</div>'; bindReqs(box); } }
  function bindReqs(box) {
    box.querySelectorAll("[data-dl]").forEach((b) => b.addEventListener("click", () => download(b.dataset.dl, b.dataset.fn)));
    box.querySelectorAll("[data-retry]").forEach((b) => b.addEventListener("click", async () => { const r = S.studioRequests.find((x) => x.id === b.dataset.retry); if (!r) return; await ST.ask(SE().vid, r.kind, r.text, { scope: r.scope, export: r.export }); App.toast("Pedido enviado de nuevo."); }));
  }
  function paneClaude(pane) {
    const s = SE(), reqs = ST.reqsOf(s.vid).filter((r) => r.kind !== "export"), cs = s.sel && s.sel !== "subs" && s.spec ? SM().findClip(s.spec, s.sel) : null;
    const att = (s.att = s.att || App.attach.make());
    pane.innerHTML = `<div class="st-ask"><div class="st-askbox">${att.chips()}<textarea id="st-ask-text" rows="3" placeholder="Pídelo como se lo dirías a una persona" aria-label="Qué quieres cambiar">${esc(s.askText || "")}</textarea><div class="st-askbar">${att.btn()}${App.ai.pillHtml("global")}<span class="sp"></span><button class="go" id="st-ask-go" type="button" aria-label="Pedir a Claude">${icon("arrow")}</button></div></div>
      <label class="st-f"><span class="l">Dónde</span><select id="st-ask-scope"><option value="video">En todo este video</option>${cs ? `<option value="clip">Solo en lo elegido (${esc(ST.clipText(cs.track.kind, cs.clip))})</option>` : ""}<option value="piece">En todas las versiones de la pieza</option></select></label></div>
      <h3>Pedidos${reqs.length ? ` · ${reqs.length}` : ""}</h3><div id="st-reqs">${reqs.map(reqHtml).join("") || '<div class="st-empty">Todavía no le pediste nada a Claude en este video.</div>'}</div>${s.spec ? `<h3>Tus cambios</h3>${logHtml(6)}` : ""}`;
    att.bind(pane.querySelector(".st-askbox"));
    const ta = E("st-ask-text"); ta.addEventListener("input", () => { s.askText = ta.value; });
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); E("st-ask-go").click(); } });
    E("st-ask-go").addEventListener("click", async () => {
      if (att.busy()) { App.toast("Espera a que terminen de subir los archivos."); return; }
      const hasFiles = att.items.some((x) => x.state === "done"), text = ta.value.trim() || (hasFiles ? "Usa lo que te adjunto." : "");
      if (!text) { App.toast("Escribe qué quieres cambiar."); ta.focus(); return; }
      const scope = E("st-ask-scope").value, targets = scope === "clip" && cs ? [cs.clip.id] : [], assets = App.act.assetsOf(att.take());
      const id = await ST.ask(s.vid, "cambio", text, { scope, targets, at_time: +s.t.toFixed(2), assets }); if (id) { s.askText = ""; App.toast("Pedido enviado. Mira los pasos aquí abajo."); ST.renderInspector(); } else App.toast("No se pudo enviar el pedido. Prueba de nuevo."); });
    bindReqs(E("st-reqs"));
  }

  // ---------- Calidad ----------
  function qaList(q, compact) {
    return `<div class="st-rules">${q.findings.map((f, i) => `<div class="st-rl" data-l="${f.level}"><span>${f.level === "error" ? "✕" : "!"}</span><span>${esc(f.msg)}</span>${f.fix ? `<button class="btn sm" data-st-fix="${i}" type="button">Arreglar</button>` : f.clipId ? `<button class="btn sm ghost" data-st-goto="${esc(f.clipId)}" type="button">Ver</button>` : "<span></span>"}</div>`).join("") || (compact ? "" : `<div class="st-rl ok"><span>✓</span><span>Zona segura, tamaños, subtítulos de una línea, idioma y sonido: todo bien.</span><span></span></div>`)}</div>`;
  }
  function bindQa(pane, q) {
    pane.querySelectorAll("[data-st-fix]").forEach((b) => b.addEventListener("click", () => { ST.commit(window.StudioRules.applyFix(SE().spec, q.findings[+b.dataset.stFix]), "Arreglé una regla"); ST.runRules(); }));
    pane.querySelectorAll("[data-st-goto]").forEach((b) => b.addEventListener("click", () => ST.select(b.dataset.stGoto, true)));
    const all = pane.querySelector("[data-st-fixall]"); if (all) all.addEventListener("click", () => { let sp = SE().spec; q.findings.filter((f) => f.fix).forEach((f) => { sp = window.StudioRules.applyFix(sp, f); }); ST.commit(sp, "Arreglé las reglas automáticas"); ST.runRules(); });
  }
  function paneCalidad(pane) {
    const s = SE(); if (!s.spec) { pane.innerHTML = `<p class="st-hint">Esta versión es del motor anterior: ábrela en el editor completo y se revisa sola.</p>`; return; }
    const q = s.qa || window.StudioRules.check(s.spec, {}), fixable = q.findings.filter((f) => f.fix);
    pane.innerHTML = `<div class="st-qahead" data-s="${q.errors ? "bad" : q.warns ? "warn" : "ok"}">${icon("shield")}<div><b>${q.errors || q.warns ? `${q.errors} para arreglar · ${q.warns} para mirar` : "Todo cumple"}</b><small>Las reglas de diseño de la marca, revisadas en cada cambio.</small></div></div>${qaList(q)}${fixable.length ? `<div class="st-acts"><button class="btn pri sm" data-st-fixall type="button">Arreglar lo automático (${fixable.length})</button></div>` : ""}`;
    bindQa(pane, q);
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
    const reqs = ST.reqsOf(s.vid).filter((r) => r.kind === "export"), subLines = transcriptLines().filter((l) => l.text), base = fileBase(v), q = s.spec ? (s.qa || window.StudioRules.check(s.spec, {})) : null;
    // la capacidad `downloads` puede no estar declarada al publicar el artefacto (DECISIONES.md #8): si no esta, no mostramos los botones activos para que fallen sin aviso.
    const A = App.adapter(), dlOk = !A || !A.hasDownloads || A.hasDownloads();
    pane.innerHTML = `${q && (q.errors || q.warns) ? `<div class="st-qahead" data-s="${q.errors ? "bad" : "warn"}">${icon("shield")}<div><b>Antes de exportar: ${q.errors + q.warns} ${q.errors + q.warns === 1 ? "detalle" : "detalles"}</b><small><a href="#" data-qa>Revisar y arreglar</a></small></div></div>` : ""}
      <div class="st-opts" role="radiogroup" aria-label="Formato">${L.EXPORT_FORMATOS.map((o) => `<div class="st-opt" role="radio" tabindex="0" aria-checked="${s.exp.fmt === o.id}" data-fmt="${o.id}"><i class="rd"></i><div><b>${esc(o.name)}${o.rec ? " · recomendado" : ""}</b><span>${esc(o.desc)}</span></div></div>`).join("")}</div>
      ${hasQ ? `<h3>Calidad</h3><div class="st-seg wide" role="radiogroup">${L.EXPORT_CALIDADES.map((o) => `<button type="button" data-q="${o.id}" aria-pressed="${s.exp.q === o.id}">${esc(o.name)}</button>`).join("")}</div>` : ""}
      <div class="st-acts"><button class="btn pri" id="st-exp-go" type="button">${icon("download")}Exportar con calidad</button></div><p class="st-hint">Claude lo arma desde los originales con todos tus cambios. Tarda uno o dos minutos y aparece aquí listo para bajar.</p>
      <h3>Bajar ahora</h3>${dlOk ? "" : `<p class="st-hint">Este artefacto no tiene habilitada la descarga directa. Pídele a Claude el video o los subtítulos desde "Exportar con calidad" arriba.</p>`}<div class="st-acts" style="margin-top:0"><button class="btn sm ghost" id="st-dl-prev" type="button" ${v && v.src && dlOk ? "" : "disabled"} title="${dlOk ? "" : "Descarga no disponible en este artefacto"}">Último video (MP4)</button><button class="btn sm ghost" id="st-dl-srt" type="button" ${subLines.length && dlOk ? "" : "disabled"} title="${dlOk ? "" : "Descarga no disponible en este artefacto"}">Subtítulos (SRT)</button>${s.spec ? `<button class="btn sm ghost" id="st-dl-json" type="button" ${dlOk ? "" : "disabled"} title="${dlOk ? "" : "Descarga no disponible en este artefacto"}">Proyecto (JSON)</button>` : ""}</div>
      ${reqs.length ? `<h3>Exportaciones · ${reqs.length}</h3>` : ""}<div id="st-expreqs">${reqs.map(reqHtml).join("")}</div>`;
    const qa = pane.querySelector("[data-qa]"); if (qa) qa.addEventListener("click", (e) => { e.preventDefault(); ST.openTool("calidad"); });
    const dp = E("st-dl-prev"); if (dp) dp.addEventListener("click", () => download(v.src, `${base}-ultimo-video.mp4`));
    const ds = E("st-dl-srt"); if (ds) ds.addEventListener("click", () => saveText(`${base}-subtitulos.srt`, toSrt(subLines), "Subtítulos listos."));
    const dj = E("st-dl-json"); if (dj) dj.addEventListener("click", () => saveText(`${base}-proyecto.json`, JSON.stringify(s.spec, null, 2), "Proyecto guardado."));
    pane.querySelectorAll("[data-fmt]").forEach((o) => { const go = () => { s.exp.fmt = o.dataset.fmt; ST.renderInspector(); }; o.addEventListener("click", go); o.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }); });
    pane.querySelectorAll("[data-q]").forEach((o) => o.addEventListener("click", () => { s.exp.q = o.dataset.q; ST.renderInspector(); }));
    E("st-exp-go").addEventListener("click", async () => { const qq = L.EXPORT_CALIDADES.find((x) => x.id === s.exp.q), text = `${f.name}${hasQ ? " · calidad " + qq.name.toLowerCase() : ""}${f.id === "gif" || f.id === "png" ? " · desde " + App.mmss(s.t) : ""}`;
      const id = await ST.ask(s.vid, "export", text, { export: { format: f.id, ext: f.ext, w: f.w || 0, h: f.h || 0, audio: !!f.audio, quality: hasQ ? s.exp.q : "", at_time: +s.t.toFixed(2) } }); App.toast(id ? "Pedido enviado. El avance aparece aquí." : "No se pudo enviar el pedido."); if (id) ST.renderInspector(); });
    bindReqs(E("st-expreqs"));
  }

  // ---------- elegir estilos para una version (nueva o esta) ----------
  ST.stylePicker = function (target) {
    const s = SE(), v = ST.video(), sibs = sel.siblings(v), free = ST.MAX_VERSIONS - sibs.length, n = sibs.length + 1, cat = styleCatalog(), isNew = target !== "this";
    if (isNew && free < 1) { App.toast(`Ya hay ${ST.MAX_VERSIONS} versiones de esta pieza. Es el máximo.`); return; }
    const grp = (title, list) => (list.length ? `<h4 class="st-gh">${title}</h4>` + list.map((x) => `<label class="st-chk"><input type="checkbox" value="${esc(x.id)}"><span><b>${esc(x.name)}</b><small>${esc(x.desc)}</small></span></label>`).join("") : "");
    ST.modal(`<h3>${isNew ? `Nueva versión · v${n}` : "Estilos para esta versión"}</h3><p class="st-hint">Elige uno o varios. ${isNew ? "Cada versión puede tener un estilo distinto o mezclar varios." : "Claude los combina y ves la lista de pasos."}</p>
      <div class="st-chklist" id="st-nv-list">${grp("Aprobados", cat.filter((x) => x.approved))}${grp("Para probar", cat.filter((x) => !x.approved))}</div>
      <div class="st-f" id="st-nv-modewrap" hidden><span class="l">Con varios estilos</span><div class="st-seg" role="group"><button type="button" data-mode="combo" aria-pressed="true">Mezclarlos</button>${isNew ? `<button type="button" data-mode="separate" aria-pressed="false">Una versión por estilo</button>` : ""}</div></div>
      <div class="st-f"><label for="st-nv-note">Indicaciones (opcional)</label><textarea id="st-nv-note" rows="2" placeholder="Por ejemplo: más animación, otro título, sin fotos"></textarea></div><div class="st-acts"><button class="btn" data-st-close type="button">Cancelar</button><button class="btn pri" id="st-nv-go" type="button" disabled>${isNew ? "Pedir la versión" : "Aplicar"}</button></div>`);
    const list = E("st-nv-list"), go = E("st-nv-go"), wrap = E("st-nv-modewrap"); let mode = "combo";
    const picked = () => [...list.querySelectorAll("input:checked")].map((i) => i.value), sync = () => { const k = picked().length; go.disabled = !k; wrap.hidden = k < 2; };
    list.addEventListener("change", sync); wrap.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => { mode = b.dataset.mode; wrap.querySelectorAll("[data-mode]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }));
    go.addEventListener("click", async () => {
      const ids = picked(); if (!ids.length) return; const names = ids.map((i) => (cat.find((x) => x.id === i) || {}).name || i), note = E("st-nv-note").value.trim(), piece = v.pieceName || v.piece; ST.modal(""); let text, extra;
      if (!isNew) { text = `Aplica a esta versión ${ids.length > 1 ? "la combinación de los estilos" : "el estilo"} «${names.join("» + «")}».${note ? " Indicaciones: " + note : ""}`; extra = { styles: ids, styleNames: names, mode: "combo", scope: "video" }; }
      else if (ids.length > 1 && mode === "separate") { const take = Math.min(ids.length, free), nums = Array.from({ length: take }, (_, i) => n + i); text = `Arma ${take} versiones nuevas de ${piece} (${nums.map((x) => "v" + x).join(", ")}), cada una con su propio estilo: ${names.slice(0, take).map((x, i) => `v${nums[i]} «${x}»`).join(", ")}, a partir de esta versión.${note ? " Indicaciones: " + note : ""}`; extra = { styles: ids.slice(0, take), styleNames: names.slice(0, take), mode: "separate", newVersions: nums }; }
      else { text = `Arma la versión v${n} de ${piece} con ${ids.length > 1 ? "la combinación de los estilos" : "el estilo"} «${names.join("» + «")}» a partir de esta versión.${note ? " Indicaciones: " + note : ""}`; extra = { styles: ids, styleNames: names, mode: "combo", newVersion: n }; }
      const rid = await ST.ask(s.vid, isNew ? "version" : "cambio", text, extra); App.toast(rid ? "Pedido enviado. Síguelo en Claude." : "No se pudo enviar el pedido."); ST.openTool("claude");
    });
  };
})();
