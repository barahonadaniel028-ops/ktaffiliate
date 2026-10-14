/* Aura · adjuntar videos y archivos en cualquier chat (Jarvis, Estudio, Laboratorio). Un boton "+", fichas con progreso y la subida con la capacidad de archivos.
   Uso: const att = App.attach.make(); html = att.chips() + att.btn(); att.bind(root); al enviar: att.take() -> [{id, name, size, type, kind, file}] */
(function () {
  "use strict";
  const App = window.App, { $, $$, esc, icon, bytes } = App;
  const VIDEO = /\.(mp4|mov|m4v|webm|mkv)$/i, IMAGE = /\.(png|jpe?g|webp|gif|heic|avif)$/i, DOC = /\.(pdf|csv|md|json|txt|srt|vtt)$/i;
  const ACCEPT = "video/*,image/*,.pdf,.csv,.md,.json,.txt,.srt,.vtt";
  const MAX_ITEMS = 6;
  const kindOf = (f) => (/^video\//.test(f.type) || VIDEO.test(f.name) ? "video" : /^image\//.test(f.type) || IMAGE.test(f.name) ? "imagen" : "archivo");
  const okFile = (f) => /^(video|image)\//.test(f.type) || VIDEO.test(f.name) || IMAGE.test(f.name) || DOC.test(f.name);
  const short = (s) => (s.length > 22 ? s.slice(0, 14) + "…" + s.slice(-6) : s);
  let n = 0;

  function thumb(it) {
    if (it.kind === "imagen" && it.url) return `<img src="${esc(it.url)}" alt="">`;
    if (it.kind === "video" && it.url) return `<video src="${esc(it.url)}#t=0.1" muted playsinline preload="metadata"></video>${icon("film")}`;
    return icon(it.kind === "imagen" ? "photo" : "note");
  }
  function chipHtml(it, i, live) {
    const sub = it.state === "err" ? esc(it.err || "No se pudo subir") : it.state === "up" ? Math.round((it.progress || 0) * 100) + "%" : esc(bytes(it.size));
    return `<span class="achip" data-s="${it.state}" data-k="${it.kind}" title="${esc(it.name)}"><span class="ath">${thumb(it)}</span><span class="atn"><b>${esc(short(it.name))}</b><small>${sub}</small></span>${live ? `<button type="button" class="atx" data-att-x="${i}" aria-label="Quitar ${esc(it.name)}">${icon("x")}</button><i class="atp" style="transform:scaleX(${Math.max(0.1, it.progress || 0).toFixed(3)})"></i>` : ""}</span>`;
  }

  function make(o) {
    o = o || {}; const c = { items: [], root: null, onChange: o.onChange || (() => {}) };
    c.chips = () => `<div class="atts" data-att-chips ${c.items.length ? "" : "hidden"}>${c.items.map((it, i) => chipHtml(it, i, true)).join("")}</div>`;
    c.btn = (cls) => `<button type="button" class="attbtn ${cls || ""}" data-att-btn aria-label="Adjuntar videos o archivos" title="Adjuntar videos o archivos">${icon("plus")}</button><input type="file" data-att-in multiple hidden accept="${ACCEPT}">`;
    c.paint = () => { const el = c.root && $("[data-att-chips]", c.root); if (el) { el.innerHTML = c.items.map((it, i) => chipHtml(it, i, true)).join(""); el.hidden = !c.items.length; } c.onChange(c); };
    c.busy = () => c.items.some((x) => x.state === "up");
    c.add = (list) => {
      const files = [...(list || [])]; if (!files.length) return;
      const bad = files.filter((f) => !okFile(f)); if (bad.length) App.toast("Ese tipo de archivo no se puede subir. Usa video, imagen, PDF o texto.");
      files.filter(okFile).slice(0, Math.max(0, MAX_ITEMS - c.items.length)).forEach((file) => {
        const it = { id: "a" + ++n, file, name: file.name, size: file.size, type: file.type || "", kind: kindOf(file), state: "up", progress: 0, url: URL.createObjectURL(file), assetId: "" };
        c.items.push(it);
        if (file.size > App.act.MAX_FILE) { it.state = "err"; it.err = "Pasa de 19 MB"; return; }
        App.act.upload(file, (p) => { it.progress = p; c.paint(); }).then((r) => { it.assetId = r.id; it.state = "done"; it.progress = 1; c.paint(); }).catch((e) => { it.state = "err"; it.err = App.act.uploadError(e).replace(/\.$/, ""); c.paint(); });
      });
      if (c.items.length >= MAX_ITEMS && files.filter(okFile).length > 1) App.toast(`Hasta ${MAX_ITEMS} archivos por mensaje.`);
      c.paint();
    };
    c.remove = (i) => { const it = c.items.splice(i, 1)[0]; if (it && it.url) setTimeout(() => URL.revokeObjectURL(it.url), 400); c.paint(); };
    // al enviar: lo que ya subio (id del archivo en la plataforma); lo que fallo o sigue subiendo no va
    c.take = () => { const done = c.items.filter((x) => x.state === "done").map((x) => ({ id: x.assetId, name: x.name, size: x.size, type: x.type, kind: x.kind, file: x.file, url: x.url })); c.items = c.items.filter((x) => x.state === "up"); c.paint(); return done; };
    c.clear = () => { c.items.forEach((x) => x.url && URL.revokeObjectURL(x.url)); c.items = []; c.paint(); };
    c.bind = (root) => {
      c.root = root; const inp = $("[data-att-in]", root), btn = $("[data-att-btn]", root);
      if (btn && inp) { btn.addEventListener("click", () => inp.click()); inp.addEventListener("change", () => { c.add(inp.files); inp.value = ""; }); }
      root.addEventListener("click", (e) => { const x = e.target.closest("[data-att-x]"); if (x && root.contains(x)) c.remove(+x.dataset.attX); });
      let depth = 0; const on = (v) => root.classList.toggle("att-over", v);
      root.addEventListener("dragenter", (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes("Files")) { e.preventDefault(); depth++; on(true); } });
      root.addEventListener("dragover", (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes("Files")) e.preventDefault(); });
      root.addEventListener("dragleave", () => { if (--depth <= 0) { depth = 0; on(false); } });
      root.addEventListener("drop", (e) => { if (e.dataTransfer && e.dataTransfer.files.length) { e.preventDefault(); depth = 0; on(false); c.add(e.dataTransfer.files); } });
      root.addEventListener("paste", (e) => { const fs = e.clipboardData && e.clipboardData.files; if (fs && fs.length) { e.preventDefault(); c.add(fs); } });
      c.paint();
    };
    return c;
  }
  // fichas fijas para mostrar lo enviado dentro de una burbuja
  const sentHtml = (items) => (items && items.length ? `<div class="atts sent">${items.map((it) => chipHtml(Object.assign({ state: "done" }, it), 0, false)).join("")}</div>` : "");
  App.attach = { make, sentHtml, ACCEPT, kindOf };
})();
