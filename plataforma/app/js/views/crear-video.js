/* Aura · Crear → "Un video nuevo" (camino B de DECISIONES.md #10). Elegís estilo(s) de la Biblioteca (combinarlos
   o pedir una version distinta por cada uno), o un formato aparte (Long form / Long form a short form), y
   subís solo el material que ese camino necesita. Termina en un pedido (requests/new_<ts>, kind "new_video"),
   igual que Claude ya conocía. Subir archivos usa App.attach (mismo "+" y fichas con progreso que el resto
   de la plataforma), una instancia por categoría de material. */
(function () {
  "use strict";
  const App = window.App, sel = App.sel, UI = App.ui, { $, $$, esc, icon, toast } = App;
  const Q = {
    formato: "¿Qué querés armar?",
    estilos: "Elegí tu estilo o estilos preferidos.",
    material: "¿Qué material tenés para este estilo?",
    materialLong: "Subí el video largo. El B-roll es opcional, si tenés algo para poner acorde a lo que se va diciendo.",
    fuente: "Subí el video o pegá el link (puede ser de YouTube).",
  };
  const FORMAT_LABEL = { corto: "Reels con tu estilo", long: "Long form", long2short: "Long form a short form" };
  const CAT_LABEL = { intro: "Intro / hook", normal: "Video normal (contenido)", broll: "B-roll", reaccion: "Reacción (alguien reaccionando o explicando)" };
  // Qué video pide depende del estilo elegido. Esta tabla es una decisión propia (no viene de DECISIONES.md):
  // mapea cada estilo YA existente en la Biblioteca (StudioLib) a lo que razonablemente necesita grabar. Un
  // estilo sin entrada acá pide solo "normal" (el contenido de base). B-roll y Reacción siempre quedan
  // ofrecidos como opcionales, para cualquier estilo (documentado en el reporte para que Daniel la ajuste).
  const STYLE_NEEDS = { "ensayo-combo": ["intro", "normal"] };
  const fresh = () => ({ format: null, step: "formato", trail: [], styles: [], styleMode: "combinar", att: {}, linksText: "", notes: "", sourceMode: "file", sourceLink: "", srcAtt: null, err: "" });
  UI.crear.video = UI.crear.video || fresh();
  const ST = () => UI.crear.video;
  const attOf = (cat) => (ST().att[cat] = ST().att[cat] || App.attach.make());
  const srcAtt = () => (ST().srcAtt = ST().srcAtt || App.attach.make());

  function resolveStyleId(raw) {
    if (!raw) return "";
    const hit = App.lib.catalog().filter((i) => i.type === "estilos").find((i) => i.id === raw || i.styleId === raw);
    return hit ? hit.id : "";
  }
  function arriveWith(pre) {
    const st = fresh(), sid = resolveStyleId(pre.style);
    if (sid) {
      const name = (App.lib.catalog().find((i) => i.id === sid) || {}).name || "";
      st.format = "corto"; st.styles = [sid]; st.step = "material";
      st.trail.push({ who: "ai", html: `<p>${esc(Q.formato)}</p>` }, { who: "me", html: esc(FORMAT_LABEL.corto + ".") }, { who: "ai", html: `<p>${esc(Q.estilos)}</p>` }, { who: "me", html: esc(`Usar «${name}».`) });
    } else if (pre.notes) {
      // llego algo de la Biblioteca que no es un estilo (una transicion, un texto, un sonido...): no hay nada que
      // preseleccionar, pero la nota no se pierde — queda cargada para cuando el pedido pida notas para Claude.
      toast(pre.notes.slice(0, 160));
    }
    st.notes = pre.notes || "";
    UI.crear.video = st;
  }

  function stepTo(step, say) { App.crear.advanceStep(() => { if (say) ST().trail.push(...say); ST().step = step; ST().err = ""; }); return true; }
  function prevOf(st) {
    if (st.step === "material") return st.format === "corto" ? "estilos" : "formato";
    if (st.step === "estilos") return st.format === "long2short" ? "fuente" : "formato";
    if (st.step === "fuente") return "formato";
    return null;
  }
  function back() {
    const st = ST(); if (st.step === "sending" || st.step === "sent") return false;
    const p = prevOf(st); if (!p) return false;
    if (st.trail.length >= 2) st.trail.splice(-2); // deshace el par {ai, me} que el paso actual empujo al llegar
    return stepTo(p);
  }
  function restart() { App.crear.advanceStep(() => { UI.crear.video = fresh(); }); }

  // ---------- paso: formato ----------
  function formatoView() {
    const body = `<div class="crear-paths v3">
      <button class="crear-path" type="button" data-act="crvformat" data-f="corto">${icon("sparkles")}<b>${esc(FORMAT_LABEL.corto)}</b><span>Elegís estilo(s) de la Biblioteca y subís lo que hay que editar.</span></button>
      <button class="crear-path" type="button" data-act="crvformat" data-f="long">${icon("play")}<b>${esc(FORMAT_LABEL.long)}</b><span>Un video largo (podcast u otro contenido), con B-roll opcional.</span></button>
      <button class="crear-path" type="button" data-act="crvformat" data-f="long2short">${icon("scissors")}<b>${esc(FORMAT_LABEL.long2short)}</b><span>Subís un video largo y lo convertimos en varios cortos.</span></button>
    </div>`;
    return App.crear.cloud({ status: "nuevo video", back: true, trail: ST().trail.concat([{ who: "ai", html: `<p>${esc(Q.formato)}</p>` }]), body });
  }

  // ---------- paso: estilos (compartido por "corto" y "long2short") ----------
  function styleNeeds(id) { const it = App.lib.catalog().find((x) => x.id === id); return (it && STYLE_NEEDS[it.studioId]) || []; }
  function neededCats() {
    const st = ST();
    if (st.format === "long") return { required: ["normal"], optional: ["broll"] };
    const req = new Set(["normal"]); st.styles.forEach((id) => styleNeeds(id).forEach((n) => req.add(n)));
    return { required: [...req], optional: ["broll", "reaccion"].filter((c) => !req.has(c)) };
  }
  function styleGallery() {
    const items = App.lib.catalog().filter((i) => i.type === "estilos");
    if (!items.length) return `<div class="empty small"><span class="orb"></span><p>Todavía no tenés estilos aprobados.</p><a class="btn sm" href="#crear/estilo">Crear un estilo nuevo</a></div>`;
    const cur = ST().styles;
    return `<div class="lib-grid crsty-grid">${items.map((it) => `<div class="lib-card crsty ${cur.includes(it.id) ? "on" : ""}" role="checkbox" tabindex="0" aria-checked="${cur.includes(it.id)}" data-act="crvsty" data-id="${esc(it.id)}"><div class="lib-demo">${App.demoHtml(it.demo)}</div><div class="lib-meta"><b>${esc(it.name)}</b><small>${esc(it.desc || "")}</small></div><span class="selmark">${icon("check")}</span></div>`).join("")}</div>`;
  }
  function styleModeHtml() {
    if (ST().styles.length < 2) return "";
    const m = ST().styleMode || "combinar";
    return `<div class="tabs"><div class="seg" role="radiogroup" aria-label="Cómo combinar los estilos">
      <button type="button" role="radio" aria-checked="${m === "combinar"}" class="${m === "combinar" ? "on" : ""}" data-act="crvmode" data-m="combinar">${icon("mix")}Combinar en un video</button>
      <button type="button" role="radio" aria-checked="${m === "versiones"}" class="${m === "versiones" ? "on" : ""}" data-act="crvmode" data-m="versiones">${icon("layers")}Una versión por estilo</button></div></div>`;
  }
  function estilosView() {
    const body = styleGallery() + styleModeHtml() + (ST().err ? `<p class="status err">${esc(ST().err)}</p>` : "");
    return App.crear.cloud({ status: "elegí el estilo", back: true, trail: ST().trail.concat([{ who: "ai", html: `<p>${esc(Q.estilos)}</p>` }]), body,
      chips: [{ act: "crvcontinue", label: "Continuar", icon: "arrow", pri: true }] });
  }

  // ---------- paso: material (categorías de upload) ----------
  function materialRow(cat, required) {
    const label = ST().format === "long" && cat === "normal" ? "Video largo" : CAT_LABEL[cat] || cat;
    return `<div class="field span2"><span class="l">${esc(label)}${required ? "" : " (opcional)"}</span>
      <div class="atbox" id="crvatt-${cat}">${attOf(cat).chips()}<div class="atdrop sm">${attOf(cat).btn()}<span>Soltá los videos acá, pegalos o tocá el más</span></div></div></div>`;
  }
  function materialView() {
    const { required, optional } = neededCats(), st = ST();
    const body = `${required.map((c) => materialRow(c, true)).join("")}${optional.map((c) => materialRow(c, false)).join("")}
      <div class="field span2"><label for="crvlinks">Links (opcional)</label><textarea id="crvlinks" rows="2" placeholder="Uno por línea">${esc(st.linksText)}</textarea></div>
      <div class="field span2"><label for="crvnotes">Notas para Claude (opcional)</label><textarea id="crvnotes" rows="2" placeholder="Cualquier detalle: qué evitar, cómo debe sentirse">${esc(st.notes)}</textarea></div>
      ${st.err ? `<p class="status err">${esc(st.err)}</p>` : ""}`;
    return App.crear.cloud({ status: "subí el material", back: true, trail: ST().trail.concat([{ who: "ai", html: `<p>${esc(st.format === "long" ? Q.materialLong : Q.material)}</p>` }]), body,
      chips: [{ act: "crvcontinue", label: "Enviar pedido", icon: "send", pri: true }] });
  }

  // ---------- paso: fuente (long2short) ----------
  function fuenteView() {
    const st = ST(), mode = st.sourceMode || "file";
    const body = `<div class="tabs"><div class="seg" role="radiogroup" aria-label="Cómo lo traés">
        <button type="button" role="radio" aria-checked="${mode === "file"}" class="${mode === "file" ? "on" : ""}" data-act="crvsrcmode" data-m="file">${icon("upload")}Subir archivo</button>
        <button type="button" role="radio" aria-checked="${mode === "link"}" class="${mode === "link" ? "on" : ""}" data-act="crvsrcmode" data-m="link">${icon("link")}Pegar link</button></div></div>
      ${mode === "file"
        ? `<div class="atbox" id="crvsrcatt">${srcAtt().chips()}<div class="atdrop">${srcAtt().btn()}<span>Soltá el video acá, pegalo o tocá el más — puede ser largo</span></div></div>`
        : `<div class="field"><label for="crvsrclink">Link del video</label><input id="crvsrclink" type="url" placeholder="Incluso de YouTube" value="${esc(st.sourceLink || "")}"></div>`}
      ${st.err ? `<p class="status err">${esc(st.err)}</p>` : ""}`;
    return App.crear.cloud({ status: "el video de origen", back: true, trail: ST().trail.concat([{ who: "ai", html: `<p>${esc(Q.fuente)}</p>` }]), body,
      chips: [{ act: "crvcontinue", label: "Continuar", icon: "arrow", pri: true }] });
  }

  // ---------- enviado ----------
  function sentView() {
    const st = ST();
    const body = st.step === "sending" ? `<p class="hint">Enviando…</p>` : `<div class="empty small"><span class="orb"></span><p>Pedido enviado. Lo vas a ver en <a href="#estudio">Estudio</a> cuando esté listo para revisar.</p></div><button class="btn" type="button" data-act="crvrestart">Pedir otro video</button>`;
    return App.crear.cloud({ status: st.step === "sending" ? "enviando…" : "en marcha", busy: st.step === "sending", trail: ST().trail, body });
  }

  function render() {
    const s = ST().step;
    if (s === "estilos") return estilosView();
    if (s === "material") return materialView();
    if (s === "fuente") return fuenteView();
    if (s === "sending" || s === "sent") return sentView();
    return formatoView();
  }

  // ---------- continuar / enviar ----------
  function continueFrom(step) {
    const st = ST();
    if (step === "fuente") {
      if ((st.sourceMode || "file") === "link") {
        const url = String(st.sourceLink || "").trim();
        if (!/^https?:\/\/\S+$/i.test(url)) { st.err = "Pegá un link válido."; App.render(true); return; }
        stepTo("estilos", [{ who: "ai", html: `<p>${esc(Q.fuente)}</p>` }, { who: "me", html: "Pegué el link." }]);
      } else {
        if (!srcAtt().items.some((i) => i.state === "done")) { st.err = "Subí el video, o cambiá a pegar un link."; App.render(true); return; }
        stepTo("estilos", [{ who: "ai", html: `<p>${esc(Q.fuente)}</p>` }, { who: "me", html: "Subí el video." }]);
      }
      return;
    }
    if (step === "estilos") {
      if (!st.styles.length) { st.err = "Elegí al menos un estilo."; App.render(true); return; }
      const names = st.styles.map((id) => (App.lib.catalog().find((i) => i.id === id) || {}).name).filter(Boolean);
      if (st.format === "long2short") { send(); return; }
      stepTo("material", [{ who: "ai", html: `<p>${esc(Q.estilos)}</p>` }, { who: "me", html: esc(names.join(" + ") + ".") }]);
      return;
    }
    if (step === "material") { send(); }
  }
  async function send() {
    const st = ST();
    const anyBusy = Object.values(st.att).some((a) => a.busy()) || srcAtt().busy();
    if (anyBusy) { st.err = "Esperá a que terminen de subir los videos."; App.render(true); return; }
    if (st.format === "corto" || st.format === "long") {
      const { required } = neededCats(), missing = required.filter((c) => !attOf(c).items.some((i) => i.state === "done"));
      if (missing.length) { st.err = `Falta subir: ${missing.map((c) => CAT_LABEL[c] || c).join(", ")}.`; App.render(true); return; }
    }
    if (st.format === "long2short" && (st.sourceMode || "file") === "file" && !srcAtt().items.some((i) => i.state === "done")) { st.err = "Subí el video."; App.render(true); return; }
    const rollbackStep = st.format === "long2short" ? "estilos" : "material";
    App.crear.advanceStep(() => { st.step = "sending"; });
    const links = String(st.linksText || "").split(/\n+/).map((x) => x.trim()).filter((x) => /^https?:\/\/\S+$/i.test(x));
    const assets = [];
    Object.entries(st.att).forEach(([cat, a]) => a.take().forEach((f) => assets.push({ id: f.id, name: f.name, size: f.size, purpose: cat })));
    if (st.format === "long2short" && (st.sourceMode || "file") === "file") srcAtt().take().forEach((f) => assets.push({ id: f.id, name: f.name, size: f.size, purpose: "fuente" }));
    const styleNames = st.styles.map((id) => (App.lib.catalog().find((i) => i.id === id) || {}).name).filter(Boolean);
    const body = {
      brand: sel.brand().id, videoFormat: st.format, styles: st.styles, styleMode: st.styles.length > 1 ? (st.styleMode || "combinar") : "",
      topic: styleNames.length ? "Video con " + styleNames.join(" + ") : (st.notes || "").slice(0, 120),
      notes: st.notes || "", assets, links, sourceLink: st.format === "long2short" && (st.sourceMode || "file") === "link" ? st.sourceLink.trim() : "",
    };
    const res = await App.act.createRequest(body);
    if (!res) { toast("No se pudo enviar el pedido. Prueba de nuevo."); App.crear.advanceStep(() => { st.step = rollbackStep; }); return; }
    UI.crear.ai = {}; // el modelo elegido valia solo para este pedido; el proximo arranca en el de siempre
    App.crear.advanceStep(() => { st.step = "sent"; });
    toast(res.told ? "Pedido enviado. Claude ya lo sabe y empieza." : "Guardado. Claude lo lee en cuanto haya una sesión abierta.");
  }

  // ---------- eventos ----------
  function bind(root) {
    $$('[id^="crvatt-"]', root).forEach((dz) => attOf(dz.id.replace("crvatt-", "")).bind(dz));
    const sdz = $("#crvsrcatt", root); if (sdz) srcAtt().bind(sdz);
    const sl = $("#crvsrclink", root); if (sl) sl.addEventListener("input", () => { ST().sourceLink = sl.value; });
    const lk = $("#crvlinks", root); if (lk) lk.addEventListener("input", () => { ST().linksText = lk.value; });
    const nt = $("#crvnotes", root); if (nt) nt.addEventListener("input", () => { ST().notes = nt.value; });
  }

  App.crearVideo = { render, bind, back, arriveWith };
  const A = App.acts;
  A.crvformat = (el) => {
    const f = el.dataset.f, st = ST(); st.format = f;
    const next = f === "long" ? "material" : f === "long2short" ? "fuente" : "estilos";
    stepTo(next, [{ who: "ai", html: `<p>${esc(Q.formato)}</p>` }, { who: "me", html: esc(FORMAT_LABEL[f] + ".") }]);
  };
  A.crvsty = (el) => { const id = el.dataset.id, st = ST(), i = st.styles.indexOf(id); if (i >= 0) st.styles.splice(i, 1); else st.styles.push(id); App.render(true); };
  A.crvmode = (el) => { ST().styleMode = el.dataset.m; App.render(true); };
  A.crvsrcmode = (el) => { ST().sourceMode = el.dataset.m; ST().err = ""; App.render(true); };
  A.crvcontinue = () => continueFrom(ST().step);
  A.crvrestart = () => restart();
})();
