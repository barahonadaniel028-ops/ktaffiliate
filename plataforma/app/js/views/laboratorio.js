/* Aura · Laboratorio: referencias, rondas de estilo (Me gusta / Quizás / No) y estilos en prueba. Lo aprobado pasa solo a la Biblioteca. */
(function () {
  "use strict";
  const App = window.App, S = App.S, UI = App.ui, sel = App.sel, { $, $$, esc, icon, plural, bytes } = App;
  UI.lab = UI.lab || { files: [], url: "", note: "", msg: "" };
  const TABS = [["ronda", "Ronda de estilo"], ["referencias", "Referencias"], ["estilos", "Estilos"]];
  const VERD = [["keep", "Me gusta", "check"], ["maybe", "Quizás", "help"], ["drop", "No", "x"]];
  const REF_STEPS = ["Guardada", "Enviada", "Analizada", "Estilo listo"];
  const curRound = () => S.expRounds.filter((r) => r.status !== "cerrada").sort((a, b) => String(b.created || "").localeCompare(String(a.created || "")))[0] || null;
  const roundCards = (r) => (r ? S.expCards.filter((c) => c.round === r.id).sort((a, b) => (a.order || 0) - (b.order || 0)) : []);
  const tabOf = (r) => (TABS.some((t) => t[0] === r.args[0]) ? r.args[0] : curRound() ? "ronda" : "referencias");
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return u; } };
  const refStep = (r) => (r.styleId ? 3 : r.analysis || r.status === "analizada" ? 2 : r.sent === false ? 0 : 1);

  function ronda() {
    const r = curRound(), cs = roundCards(r);
    if (!r) return `<div class="empty card lg"><span class="orb"></span><h3>No hay una ronda abierta</h3><p>Guarda referencias y Claude las analiza para armar la próxima ronda de estilos.</p><button class="btn pri" type="button" data-act="labtab" data-t="referencias">Guardar referencias</button></div>`;
    const done = cs.filter((c) => c.verdict).length, p = cs.length ? done / cs.length : 0;
    const cards = cs.map((c) => `<article class="xc lg" data-v="${esc(c.verdict || "")}"><div class="xc-demo">${App.demoHtml(c.demo)}${(c.demo || "").startsWith("s-") ? "" : `<button class="xc-rep" type="button" data-act="labrep" aria-label="Ver otra vez">${icon("refresh")}</button>`}</div>
      <div class="xc-b"><b>${esc(c.label || c.name || "Estilo")}</b>${c.desc ? `<small>${esc(c.desc)}</small>` : ""}
      <div class="verd" role="group" aria-label="Tu opinión">${VERD.map(([k, n, ic]) => `<button type="button" class="vd ${k}" data-act="labverd" data-id="${esc(c.id)}" data-v="${k}" aria-pressed="${c.verdict === k}">${icon(ic)}${n}</button>`).join("")}</div>
      <textarea class="xc-note" rows="2" maxlength="600" data-labnote="${esc(c.id)}" placeholder="¿Por qué? (opcional)" aria-label="Nota">${esc(c.note || "")}</textarea></div></article>`).join("");
    return `<div class="xprog lg"><div><b>Ronda ${esc(r.name || "")}</b><span class="muted"> · ${done} de ${cs.length} calificadas</span></div><div class="bar" style="--p:${Math.round(p * 100)}%"><i></i></div></div>
      <div class="xcs rise">${cards}</div>
      <section class="card lg overall"><div class="field"><label for="laboverall">Comentario general de la ronda</label><textarea id="laboverall" data-laboverall="${esc(r.id)}" rows="3" maxlength="1500" placeholder="Qué te gustó en conjunto, qué falta, qué probar después">${esc(r.overall || "")}</textarea></div>
        <p class="muted">${sel.unsentCount() ? "Tus calificaciones quedan como borrador y se envían con <b>Enviar cambios</b>." : done === cs.length ? "Ronda completa. Todo enviado." : "Califica cada estilo. Se guarda solo."}</p></section>`;
  }
  function refCard(r) {
    const draft = r.sent === false, step = refStep(r), a = r.analysis;
    const media = r.assetId ? `<video class="xr-v" src="${esc(App.adapter().assetUrl(r.assetId))}" controls playsinline muted preload="metadata"></video>` : r.url ? `<a class="btn sm" href="${esc(r.url)}" target="_blank" rel="noopener">${icon("out")}Abrir el link</a>` : "";
    const rows = a ? [["Resumen", a.resumen], ["Texto en pantalla", a.texto], ["Transiciones", a.transiciones], ["Animaciones", a.animaciones], ["Ritmo", a.ritmo], ["Colores", a.colores]].filter(([, v]) => v) : [];
    const how = a && Array.isArray(a.comoRecrear) && a.comoRecrear.length ? `<div class="how"><b>Cómo recrear el estilo</b><ul>${a.comoRecrear.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : "";
    return `<li class="xr lg" data-s="${draft ? "draft" : "sent"}"><div class="xrh"><span class="chip ${r.assetId ? "apricot" : ""}">${r.assetId ? "VIDEO" : "LINK"}</span><b>${esc(r.name || host(r.url))}</b><small class="faint">${r.created ? App.showDate(r.created) : ""}</small></div>
      <ol class="rsteps">${REF_STEPS.map((s, i) => `<li class="${i < step ? "done" : i === step ? "now" : ""}">${i === 0 && draft ? "Borrador" : s}</li>`).join("")}</ol>${media}${r.note ? `<p class="muted">${esc(r.note)}</p>` : ""}
      ${a ? `<dl class="xra">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>${how}${r.styleId ? `<a class="btn sm" href="#laboratorio/estilos">Ver el estilo que salió</a>` : ""}` : ""}
      ${draft ? `<div class="acts"><button class="btn sm ghost bad" type="button" data-act="labrefdel" data-id="${esc(r.id)}">Borrar</button></div>` : ""}</li>`;
  }
  const filesHtml = () => UI.lab.files.map((f, i) => `<li class="file" data-s="${f.state}"><span class="th">${icon("film")}</span><div class="fi"><b>${esc(f.name)}</b><small>${bytes(f.size)}${f.state === "err" ? ` · <span class="err">${esc(f.err)}</span>` : f.state === "done" ? " · Subido" : ""}</small>${f.state === "up" ? `<div class="bar" style="--p:${Math.round((f.progress || 0) * 100)}%"><i></i></div>` : ""}</div><span></span><button class="x" type="button" data-act="labfiledel" data-i="${i}" aria-label="Quitar">${icon("x")}</button></li>`).join("");
  function referencias() {
    const list = S.refs.slice().sort((a, b) => String(b.created || "").localeCompare(String(a.created || ""))), L = UI.lab;
    return `<div class="lab-grid"><section class="card lg"><div class="ch">${icon("link")}Guardar referencias<span class="sp"></span><span class="faint">archivos, links o los dos</span></div>
      <form id="labform" class="labform" novalidate><label class="drop" id="labdrop" for="labfile">${icon("upload")}<strong>Suelta tus videos aquí o toca para elegirlos</strong><span>Puedes elegir varios. Hasta 19 MB cada uno.</span><input id="labfile" type="file" accept="video/*" multiple hidden></label><ul class="files" id="labfiles">${filesHtml()}</ul>
        <div class="field"><label for="laburl">Links</label><textarea id="laburl" rows="3" placeholder="Pega uno o varios links, uno por línea (Instagram, TikTok, YouTube…)" spellcheck="false">${esc(L.url)}</textarea></div>
        <div class="field"><label for="labnote">¿Qué te gusta de esto? (opcional)</label><textarea id="labnote" rows="3" maxlength="1500" placeholder="El texto, las transiciones, la música, el ritmo, cómo se ve…">${esc(L.note)}</textarea></div>
        <div class="send"><button class="btn pri" type="submit" id="labsave">Guardar referencia</button><span class="status" id="labmsg" aria-live="polite">${esc(L.msg)}</span></div></form>
      <p class="hint">Todo queda como borrador y llega a Claude con <b>Enviar cambios</b>. Claude analiza texto, transiciones, animaciones y ritmo.</p></section>
      <section class="card lg"><div class="ch">${icon("book")}Tus referencias<span class="sp"></span><span class="faint">${list.length}</span></div>${list.length ? `<ul class="xrl">${list.map(refCard).join("")}</ul>` : `<div class="empty small"><span class="orb"></span><p>Todavía no guardaste ninguna.</p></div>`}</section></div>`;
  }
  function estilos() {
    const by = (s) => S.expStyles.filter((x) => x.status === s), mk = (x, acts) => `<article class="xs lg"><div class="xs-demo">${App.demoHtml(x.demo || "e-palabra-ancla")}</div><div class="xs-b"><b>${esc(x.name)}</b><small>${esc(x.description || x.desc || "")}</small><div class="acts">${acts}</div></div></article>`;
    const sec = (title, list, acts, empty) => `<section class="xsec"><h2 class="h-m">${title}<span class="faint"> ${list.length || ""}</span></h2>${list.length ? `<div class="xsg">${list.map((x) => mk(x, acts(x))).join("")}</div>` : `<p class="muted">${empty}</p>`}</section>`;
    return sec("En prueba", by("prueba"), (x) => `<button class="btn sm pri" type="button" data-act="labdecide" data-id="${esc(x.id)}" data-st="aprobado">${icon("check")}Aprobar</button><button class="btn sm ghost" type="button" data-act="labdecide" data-id="${esc(x.id)}" data-st="descartado">Descartar</button>`, "No hay estilos en prueba ahora.")
      + sec("Aprobados", by("aprobado"), (x) => `<a class="btn sm" href="#biblioteca">En la Biblioteca</a><button class="btn sm ghost" type="button" data-act="labdecide" data-id="${esc(x.id)}" data-st="prueba">Volver a prueba</button>`, "Cuando apruebes uno, aparece en la Biblioteca.")
      + sec("Descartados", by("descartado"), (x) => `<button class="btn sm ghost" type="button" data-act="labdecide" data-id="${esc(x.id)}" data-st="prueba">Recuperar</button>`, "Nada descartado.");
  }
  App.views.laboratorio = {
    title: "Laboratorio",
    render(r) {
      const t = tabOf(r), rd = curRound(), cs = roundCards(rd), done = cs.filter((c) => c.verdict).length;
      const tabs = TABS.map(([k, n]) => { const c = k === "ronda" ? (rd ? `${done}/${cs.length}` : "") : k === "referencias" ? S.refs.length || "" : sel.approvedStyles().length || ""; return `<button role="tab" type="button" class="${k === t ? "on" : ""}" aria-pressed="${k === t}" data-act="labtab" data-t="${k}">${n}${c ? `<b>${c}</b>` : ""}</button>`; }).join("");
      return `<div class="vhead"><div class="t"><span class="eyebrow">${esc(App.config.name)}</span><h1 class="h-l">Arma tu <em>estilo de video</em></h1><p class="muted">Prueba ideas sin tocar nada de lo agendado. Lo que apruebas aquí pasa a la <a href="#biblioteca"><u>Biblioteca</u></a>.</p></div></div>
        <ol class="how3 rise"><li><b>1</b><div><strong>Guarda referencias</strong><span>Links o videos que te gustan</span></div></li><li><b>2</b><div><strong>Claude las analiza</strong><span>Texto, transiciones y ritmo</span></div></li><li><b>3</b><div><strong>Pruebas y eliges</strong><span>Me gusta, Quizás o No</span></div></li></ol>
        <div class="tabs"><div class="seg lg" role="tablist">${tabs}</div></div>${t === "ronda" ? ronda() : t === "referencias" ? referencias() : estilos()}`;
    },
    bind(root, r) {
      App.observeDemos(root);
      $$("[data-labnote]", root).forEach((ta) => ta.addEventListener("input", App.debounce(() => { const c = S.expCards.find((x) => x.id === ta.dataset.labnote); if (c) App.act.setCardNote(c, ta.value); }, 700)));
      const ov = $("#laboverall", root); if (ov) ov.addEventListener("input", App.debounce(() => { const rd = S.expRounds.find((x) => x.id === ov.dataset.laboverall); if (rd) App.act.setOverall(rd, ov.value); }, 700));
      const f = $("#labform", root); if (!f) return;
      f.addEventListener("input", (e) => { if (e.target.id === "laburl") UI.lab.url = e.target.value; if (e.target.id === "labnote") UI.lab.note = e.target.value; });
      f.addEventListener("submit", save);
      const dz = $("#labdrop", root), inp = $("#labfile", root); inp.addEventListener("change", () => { addFiles(inp.files); inp.value = ""; });
      ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("over"); })); ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("over"); })); dz.addEventListener("drop", (e) => addFiles(e.dataTransfer.files));
    },
    update(kinds) { const a = document.activeElement; if (a && /^(INPUT|TEXTAREA)$/.test(a.tagName) && $("#main").contains(a)) return true; return false; },
  };
  const say = (t, k) => { UI.lab.msg = t; const el = $("#labmsg"); if (el) { el.textContent = t; el.dataset.k = k || ""; } };
  const paintFiles = () => { const ul = $("#labfiles"); if (ul) ul.innerHTML = filesHtml(); };
  function addFiles(list) {
    const ok = [...list].filter((f) => /^video\//.test(f.type) || /\.(mp4|mov|m4v|webm|mkv)$/i.test(f.name)), have = new Set(UI.lab.files.map((f) => f.name + f.size));
    ok.filter((f) => !have.has(f.name + f.size)).slice(0, 10 - UI.lab.files.length).forEach((file) => {
      const it = { file, name: file.name, size: file.size, state: "up", progress: 0 }; UI.lab.files.push(it);
      if (file.size > App.act.MAX_FILE) { it.state = "err"; it.err = "Pasa de 19 MB. Pega el link."; return; }
      App.act.upload(file, (p) => { it.progress = p; paintFiles(); }).then((r) => { it.id = r.id; it.state = "done"; paintFiles(); }).catch((e) => { it.state = "err"; it.err = App.act.uploadError(e); paintFiles(); });
    }); paintFiles();
  }
  async function save(e) {
    e.preventDefault(); const L = UI.lab, links = [...new Set(String(L.url).split(/[\s,]+/).filter((x) => /^https?:\/\/\S+$/i.test(x)))].slice(0, 20), ups = L.files.filter((f) => f.state === "done");
    if (L.files.some((f) => f.state === "up")) { say("Espera a que terminen de subir.", "warn"); return; }
    if (!links.length && !ups.length) { say(L.files.length ? "Ningún video entra en 19 MB. Pega los links." : "Pega links o elige videos.", "warn"); return; }
    $("#labsave").disabled = true; let n = 0;
    for (const u of ups) if (await App.act.addRefFile(u, L.note)) n++;
    for (const l of links) if (await App.act.addRefLink(l, L.note)) n++;
    UI.lab = { files: [], url: "", note: "", msg: n ? `${n} ${plural(n, "referencia guardada", "referencias guardadas")}. Se envían con Enviar cambios.` : "No se pudo guardar. Prueba de nuevo." }; App.render(true);
  }
  const A = App.acts;
  A.labtab = (el) => App.go("laboratorio/" + el.dataset.t);
  A.labverd = (el) => { const c = S.expCards.find((x) => x.id === el.dataset.id); if (!c) return; const v = c.verdict === el.dataset.v ? "" : el.dataset.v; c.verdict = v; App.act.setVerdict(c, v); App.render(true); };
  A.labrep = (el) => { const d = el.closest(".xc-demo").querySelector(".xd"); if (d) { d.classList.remove("live"); void d.offsetWidth; d.classList.add("live"); d.querySelectorAll("*").forEach((n) => { n.style.animation = "none"; void n.offsetWidth; n.style.animation = ""; }); } };
  A.labrefdel = async (el) => { const r = S.refs.find((x) => x.id === el.dataset.id); if (!r) return; await App.data.remove("refs", r.id); if (r.assetId) App.adapter().deleteAsset(r.assetId); App.toast("Referencia borrada."); };
  A.labfiledel = (el) => { const f = UI.lab.files.splice(+el.dataset.i, 1)[0]; if (f && f.id) App.adapter().deleteAsset(f.id); paintFiles(); };
  A.labdecide = (el) => { const s = S.expStyles.find((x) => x.id === el.dataset.id); if (s) App.act.decideStyle(s, el.dataset.st); };
})();
