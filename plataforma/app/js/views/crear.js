/* Aura · Crear: pedir videos nuevos a Claude y subir material (videos crudos, clips, intros, referencias). Un solo pedido, dos puntos de partida. */
(function () {
  "use strict";
  const App = window.App, S = App.S, sel = App.sel, UI = App.ui, { $, $$, esc, icon, plural, bytes } = App;
  UI.draft = UI.draft || {}; UI.files = UI.files || [];
  const STATUS = { pedido: ["Pedido", ""], produccion: ["En producción", "apricot"], revisar: ["Listo para revisar", "good"], listo: ["Terminado", "good"], bloqueado: ["Bloqueado", "bad"], cancelado: ["Cancelado", ""] };
  const PURPOSES = () => [["crudo", "Crudo para editar"], ["clip", "Clip para usar (B-roll)"], ["intro", "Intro"], ...(App.config.hasTeacher ? [["teacher", "Teacher"]] : []), ["referencia", "Referencia de estilo"]];
  const mode = (r) => (r.args[0] === "subir" ? "subir" : "pedir");
  const D = () => UI.draft;
  const opts = (list, cur) => list.map(([k, t]) => `<option value="${esc(k)}" ${String(cur) === String(k) ? "selected" : ""}>${esc(t)}</option>`).join("");

  function styleStrip() {
    const items = sel.approvedStyles().map((s) => ({ id: s.id, name: s.name, demo: s.demo || "e-palabra-ancla" })).concat(App.lib.catalog().filter((i) => i.type === "estilos" && i.source === "estudio").map((i) => ({ id: i.id, name: i.name, demo: i.demo })));
    const cur = D().style || "";
    return `<div class="stylestrip" role="radiogroup" aria-label="Estilo"><div class="sty ${cur === "" ? "on" : ""}" role="radio" tabindex="0" aria-checked="${cur === ""}" data-act="crstyle" data-id=""><span class="sty-demo plain">${icon("sparkles")}</span><b>El de siempre</b></div>${items.map((s) => `<div class="sty ${cur === s.id ? "on" : ""}" role="radio" tabindex="0" aria-checked="${cur === s.id}" data-act="crstyle" data-id="${esc(s.id)}"><span class="sty-demo">${App.demoHtml ? App.demoHtml(s.demo, { mini: true }) : ""}</span><b>${esc(s.name)}</b></div>`).join("")}</div>`;
  }
  function filesHtml() {
    return UI.files.map((f, i) => `<li class="file" data-s="${f.state}"><span class="th">${f.thumb ? `<img src="${f.thumb}" alt="">` : icon("film")}</span>
      <div class="fi"><b>${esc(f.name)}</b><small>${bytes(f.size)}${f.state === "err" ? ` · <span class="err">${esc(f.err)}</span>` : f.state === "done" ? " · Subido" : ""}</small>${f.state === "up" || f.state === "wait" ? `<div class="bar" style="--p:${Math.round((f.progress || 0) * 100)}%"><i></i></div>` : ""}</div>
      <label class="sr" for="fp${i}">Para qué es</label><select id="fp${i}" class="mini" data-change="crpurpose" data-i="${i}">${opts(PURPOSES(), f.purpose)}</select>
      <button class="x" type="button" data-act="crfiledel" data-i="${i}" aria-label="Quitar ${esc(f.name)}">${icon("x")}</button></li>`).join("");
  }
  function dropzone(big) {
    return `<label class="drop ${big ? "big" : ""}" id="crdrop" for="crfile">${icon("upload")}<strong>${App.say("Soltá tus videos acá o tocá para elegirlos", "Suelta tus videos aquí o toca para elegirlos")}</strong><span>Crudos, clips, intros o referencias. Hasta 19 MB cada uno. Más pesado: pega el link abajo.</span>
      <input id="crfile" type="file" accept="video/*,image/*" multiple hidden></label><ul class="files" id="crfiles">${filesHtml()}</ul>`;
  }
  function rawTiles(b) {
    const sys = S.system || {}, bs = (sys.brands || {})[b.id] || {}, L = App.config.rawLabels, open = sel.newRequests(b.id).filter((r) => !["listo", "cancelado"].includes(r.status)).length;
    const t = (n, v, sub, warn) => `<div class="tile lg"><span>${n}</span><b ${warn ? 'style="color:var(--warn)"' : ""}>${esc(v)}</b><small>${esc(sub || "")}</small></div>`;
    return `<div class="tiles">${t(L.intro, bs.introsFree ?? "—", bs.introsNote || "sin usar en esta cuenta", (bs.introsFree ?? 1) === 0)}${App.config.hasTeacher ? t(L.teacher, sys.teachersFree ?? "—", sys.teachersNote || "según el registro") : ""}${t("Pedidos abiertos", String(open), "esperando a Claude")}</div>`;
  }
  function queue(b) {
    const list = sel.newRequests(b.id);
    const rows = list.map((r) => { const s = STATUS[r.status || "pedido"] || [r.status, ""], steps = r.steps || [], done = steps.filter((x) => x.status === "hecho").length, p = steps.length ? done / steps.length : r.status === "listo" ? 1 : r.status === "produccion" ? 0.4 : 0.06;
      return `<li class="rq"><div class="rqh"><span class="chip ${s[1]}">${esc(s[0])}</span><b>${esc((r.topic || (r.hooks || [])[0] || (r.assets || []).length + " archivos").slice(0, 70))}</b><span class="faint">${r.at ? App.ago(r.at) : ""}</span></div>
        <div class="rqm muted">${r.count || 1} ${plural(r.count || 1, "pieza", "piezas")}${r.format ? " · " + esc((App.config.formats.find((f) => f[0] === r.format) || [0, r.format])[1]) : ""}${(r.assets || []).length ? ` · ${(r.assets || []).length} ${plural((r.assets || []).length, "archivo", "archivos")}` : ""}${(r.links || []).length ? ` · ${(r.links || []).length} links` : ""}</div>
        ${r.status !== "cancelado" ? `<div class="bar" style="--p:${Math.round(p * 100)}%"><i></i></div>` : ""}${steps.length ? `<ol class="steps">${steps.map((x) => `<li data-s="${esc(x.status)}"><i></i>${esc(x.text || x.label || "")}</li>`).join("")}</ol>` : ""}
        ${r.reply ? `<p class="reply">${esc(r.reply)}</p>` : ""}${(r.status || "pedido") === "pedido" ? `<button class="btn sm ghost" type="button" data-act="crcancel" data-id="${esc(r.id)}">Cancelar pedido</button>` : ""}</li>`; }).join("");
    return `<section class="card lg"><div class="ch">${icon("wand")}Cola de pedidos<span class="sp"></span><span class="faint">${list.length}</span></div>${rows ? `<ul class="rqs">${rows}</ul>` : `<div class="empty small"><span class="orb"></span><p>Todavía no pediste nada para ${esc(b.name)}.</p></div>`}</section>`;
  }

  App.views.crear = {
    title: "Crear",
    render(r) {
      const b = sel.brand(), m = mode(r), d = D(), sys = (S.system || {}).brands || {}, blocked = ((sys[b.id] || {}).introsFree ?? 1) === 0 && App.config.hasTeacher;
      const head = `<div class="vhead"><div class="t"><span class="eyebrow">${esc(b.name)}</span><h1 class="h-l">${m === "pedir" ? App.say("Contale a Claude <em>qué video</em> querés", "Cuéntale a Claude <em>qué video</em> quieres") : App.say("Subí tu <em>material</em> y Claude lo edita", "Sube tu <em>material</em> y Claude lo edita")}</h1><p class="muted">Todo termina en un pedido. Claude lo produce y lo deja en <b>Por aprobar</b>.</p></div></div>
        <div class="tabs"><div class="seg lg" role="tablist"><button role="tab" type="button" class="${m === "pedir" ? "on" : ""}" aria-pressed="${m === "pedir"}" data-act="crmode" data-m="pedir">${icon("wand")}Pedir con Claude</button><button role="tab" type="button" class="${m === "subir" ? "on" : ""}" aria-pressed="${m === "subir"}" data-act="crmode" data-m="subir">${icon("upload")}Subir videos</button></div></div>`;
      const idea = `<div class="field span2"><label for="crtopic">Tema o idea</label><textarea id="crtopic" data-draft="topic" placeholder="Qué tiene que decir el video, qué quieres que sienta quien lo ve, o un ejemplo que te gustó">${esc(d.topic || "")}</textarea></div>
        <div class="field span2"><label for="crhooks">Ganchos que ya tienes en mente</label><textarea id="crhooks" data-draft="hooks" rows="3" placeholder="Uno por línea. Si lo dejas vacío, Claude propone y te los muestra">${esc(d.hooks || "")}</textarea></div>`;
      const common = `<div class="field"><label for="crcount">Cuántas piezas</label><input id="crcount" type="number" min="1" max="10" data-draft="count" value="${esc(d.count || 1)}"></div>
        <div class="field"><label for="crformat">Formato</label><select id="crformat" data-draft="format">${opts(App.config.formats, d.format || App.config.formats[0][0])}</select></div>
        ${App.config.hasTeacher ? `<div class="field"><label for="crteacher">Teacher</label><input id="crteacher" type="text" data-draft="teacher" placeholder="Vacío: Claude elige uno libre" value="${esc(d.teacher || "")}"></div>` : ""}
        <div class="field"><label for="crintro">Intro</label><select id="crintro" data-draft="intro">${opts(App.config.intros, d.intro || App.config.intros[0][0])}</select></div>
        <div class="field"><label for="crver">Versiones</label><select id="crver" data-draft="versions">${opts(App.config.versionsOpts, d.versions || App.config.versionsOpts[0][0])}</select></div>
        <div class="field"><label for="crmusic">Música</label><select id="crmusic" data-draft="music">${opts(App.config.musicOpts, d.music || App.config.musicOpts[0][0])}</select></div>
        <div class="field"><label for="crdue">Para cuándo (opcional)</label><input id="crdue" type="date" data-draft="due" value="${esc(d.due || "")}"></div>`;
      const form = `<form class="card lg crform" id="crform" novalidate>
        ${blocked ? `<div class="banner"><b>Atención:</b> no hay ${esc(App.config.rawLabels.intro.toLowerCase())} en ${esc(b.name)}. Elige grabar uno nuevo o generarlo.</div>` : ""}
        ${m === "subir" ? `<div class="field span2"><span class="l">Material</span>${dropzone(true)}</div>` : ""}
        <div class="fgrid">${m === "pedir" ? idea : ""}
          <div class="field span2"><span class="l">Estilo</span>${styleStrip()}<span class="hint">Los estilos aprobados salen de la <a href="#biblioteca">Biblioteca</a>.</span></div>${common}
          ${m === "pedir" ? `<div class="field span2"><span class="l">Material (opcional)</span>${dropzone(false)}</div>` : ""}
          <div class="field span2"><label for="crlinks">Links (opcional)</label><textarea id="crlinks" data-draft="links" rows="2" placeholder="Pega uno o varios links, uno por línea (Instagram, TikTok, YouTube, Drive…)">${esc(d.links || "")}</textarea></div>
          <div class="field span2"><label for="crnotes">Notas para Claude</label><textarea id="crnotes" data-draft="notes" rows="2" placeholder="Cualquier detalle: qué evitar, referencias, cómo debe sentirse">${esc(d.notes || "")}</textarea></div></div>
        <div class="send"><button class="btn pri lg2" type="submit" id="crsend">Enviar pedido</button><span class="status" id="crstatus" aria-live="polite"></span></div></form>`;
      return head + `<div class="crear-grid">${form}<aside class="crear-side">${rawTiles(b)}${queue(b)}</aside></div>`;
    },
    bind(root) {
      const form = $("#crform", root); if (!form) return;
      form.addEventListener("submit", send);
      form.addEventListener("input", (e) => { const k = e.target.dataset && e.target.dataset.draft; if (k) D()[k] = e.target.value; });
      const dz = $("#crdrop", root), inp = $("#crfile", root);
      if (inp) inp.addEventListener("change", () => { addFiles(inp.files); inp.value = ""; });
      if (dz) { ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("over"); })); ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("over"); })); dz.addEventListener("drop", (e) => addFiles(e.dataTransfer.files)); }
    },
    update(kinds) { if (kinds.has("requests") || kinds.has("system") || kinds.has("exp_styles")) return false; return true; },
  };
  App.views.crear.update = (kinds) => { const a = document.activeElement; if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && $("#main").contains(a)) { refreshSide(); return true; } return false; };
  function refreshSide() { const side = $(".crear-side"); if (!side) return; side.innerHTML = rawTiles(sel.brand()) + queue(sel.brand()); }

  // ---------- archivos ----------
  function thumbOf(file) {
    return new Promise((res) => {
      if (/^image\//.test(file.type)) { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(""); r.readAsDataURL(file); return; }
      try { const u = URL.createObjectURL(file), v = document.createElement("video"); v.muted = true; v.playsInline = true; v.preload = "metadata"; v.src = u;
        const done = (x) => { URL.revokeObjectURL(u); res(x); }; v.onloadeddata = () => { v.currentTime = Math.min(0.4, (v.duration || 1) / 2); }; v.onseeked = () => { try { const c = document.createElement("canvas"); c.width = 90; c.height = 160; const g = c.getContext("2d"), r = Math.max(90 / v.videoWidth, 160 / v.videoHeight); g.drawImage(v, (90 - v.videoWidth * r) / 2, (160 - v.videoHeight * r) / 2, v.videoWidth * r, v.videoHeight * r); done(c.toDataURL("image/jpeg", 0.7)); } catch (e) { done(""); } }; v.onerror = () => done(""); setTimeout(() => done(""), 4000);
      } catch (e) { res(""); }
    });
  }
  const paintFiles = () => { const ul = $("#crfiles"); if (ul) ul.innerHTML = filesHtml(); };
  async function addFiles(list) {
    const ok = [...list].filter((f) => /^(video|image)\//.test(f.type) || /\.(mp4|mov|m4v|webm|mkv|jpg|jpeg|png|webp)$/i.test(f.name)), have = new Set(UI.files.map((f) => f.name + f.size));
    for (const file of ok.filter((f) => !have.has(f.name + f.size)).slice(0, 12 - UI.files.length)) {
      const item = { file, name: file.name, size: file.size, purpose: App.route().args[0] === "subir" ? "crudo" : "clip", state: "wait", progress: 0 }; UI.files.push(item); paintFiles();
      thumbOf(file).then((t) => { item.thumb = t; paintFiles(); });
      if (file.size > App.act.MAX_FILE) { item.state = "err"; item.err = "Pasa de 19 MB. Pega el link."; paintFiles(); continue; }
      item.state = "up"; paintFiles();
      App.act.upload(file, (p) => { item.progress = p; paintFiles(); }).then((r) => { item.id = r.id; item.state = "done"; item.progress = 1; paintFiles(); }).catch((e) => { item.state = "err"; item.err = App.act.uploadError(e); paintFiles(); });
    }
    if (!ok.length && list.length) App.toast("Ese tipo de archivo no sirve. Sube videos o imágenes.");
  }
  async function send(e) {
    e.preventDefault(); const st = $("#crstatus"), d = D(), b = sel.brand(), m = mode(App.route());
    const hooks = String(d.hooks || "").split("\n").map((x) => x.trim()).filter(Boolean), links = String(d.links || "").split(/[\s,]+/).filter((x) => /^https?:\/\/\S+$/i.test(x)), ups = UI.files.filter((f) => f.state === "done");
    if (UI.files.some((f) => f.state === "up")) { st.textContent = "Espera a que terminen de subir los archivos."; return; }
    if (!String(d.topic || "").trim() && !hooks.length && !ups.length && !links.length) { st.textContent = m === "subir" ? "Sube al menos un video o pega un link." : "Escribe al menos el tema, un gancho o adjunta material."; return; }
    $("#crsend").disabled = true; st.textContent = "Enviando…";
    const res = await App.act.createRequest({ brand: b.id, source: m === "subir" ? "material" : "idea", topic: String(d.topic || "").trim(), hooks, count: Math.max(1, Math.min(10, +d.count || 1)), format: d.format || App.config.formats[0][0], teacher: d.teacher || "", intro: d.intro || App.config.intros[0][0], versions: +(d.versions || App.config.versionsOpts[0][0]), music: d.music || App.config.musicOpts[0][0], style: d.style || "", due: d.due || "", notes: String(d.notes || "").trim(), links, assets: ups.map((f) => ({ id: f.id, name: f.name, size: f.size, purpose: f.purpose })) });
    $("#crsend").disabled = false;
    if (!res) { st.textContent = "No se pudo enviar el pedido. Prueba de nuevo."; return; }
    UI.draft = {}; UI.files = []; App.toast(res.told ? "Pedido enviado. Claude ya lo sabe y empieza." : "Pedido guardado. Claude lo lee en cuanto haya una sesión abierta."); App.render(true);
  }
  const A = App.acts;
  A.crmode = (el) => App.go("crear" + (el.dataset.m === "subir" ? "/subir" : ""));
  A.crstyle = (el) => { D().style = el.dataset.id; $$(".sty").forEach((s) => { const on = s.dataset.id === el.dataset.id; s.classList.toggle("on", on); s.setAttribute("aria-checked", on); }); };
  A.crpurpose = (el) => { const f = UI.files[+el.dataset.i]; if (f) f.purpose = el.value; };
  A.crfiledel = (el) => { const f = UI.files.splice(+el.dataset.i, 1)[0]; if (f && f.id) App.adapter().deleteAsset(f.id); paintFiles(); };
  A.crcancel = async (el) => { const r = S.requests.find((x) => x.id === el.dataset.id); if (r) { await App.act.cancelRequest(r); App.toast("Pedido cancelado."); } };
})();
