/* Aura · Crear → "Un estilo nuevo" (camino A de DECISIONES.md #10). Junta referencias (videos, links o ideas
   escritas), marca qué les gustó, se asegura de tener al menos un video para probar el estilo, y lo manda:
   el estilo nuevo lo arma Claude en exp_styles (estado "prueba") y aparece solo en Laboratorio.
   Subir archivos usa App.attach (mismo "+" y fichas con progreso que Jarvis/Estudio/Laboratorio), no un
   dropzone propio: es el componente de adjuntos ya establecido en esta sesión. */
(function () {
  "use strict";
  const App = window.App, UI = App.ui, { $, $$, esc, icon, toast } = App;
  const Q = {
    ask: "¿Tenés referencias, links, videos o ideas sobre este estilo nuevo?",
    upload: "Subilo todo acá.",
    liked: "¿Qué de estos videos o referencias te gustó?",
  };
  const ORDER = ["ask", "upload", "liked"];
  const fresh = () => ({ step: "ask", trail: [], att: null, gateAtt: null, items: [], linksText: "", ideaText: "", notes: "", err: "" });
  UI.crear.estilo = UI.crear.estilo || fresh();
  const ST = () => UI.crear.estilo;
  const att = () => (ST().att = ST().att || App.attach.make());
  const gateAtt = () => (ST().gateAtt = ST().gateAtt || App.attach.make());

  function stepTo(step, say) {
    App.crear.advanceStep(() => { if (say) ST().trail.push(...say); ST().step = step; ST().err = ""; });
    return true;
  }
  function back() {
    const st = ST();
    // cada paso hacia adelante empuja un par {ai, me} a la bitacora; volver deshace ese mismo par para no repetir la pregunta
    const undo = () => { if (st.trail.length >= 2) st.trail.splice(-2); };
    if (st.step === "denied") { undo(); return stepTo("ask"); }
    const i = ORDER.indexOf(st.step);
    if (i > 0) { undo(); return stepTo(ORDER[i - 1]); }
    return false;
  }
  function restart() { App.crear.advanceStep(() => { UI.crear.estilo = fresh(); }); }

  // ---------- pasos ----------
  function askView() {
    return App.crear.cloud({ status: "nuevo estilo", back: true,
      trail: ST().trail.concat([{ who: "ai", html: `<p>${esc(Q.ask)}</p>` }]),
      chips: [{ act: "cresAsk", data: { v: "si" }, label: "Sí, tengo", icon: "check", pri: true }, { act: "cresAsk", data: { v: "no" }, label: "Todavía no", icon: "x" }] });
  }
  function deniedView() {
    return App.crear.cloud({ status: "hace falta material", back: true,
      trail: ST().trail.concat([{ who: "ai", html: `<p>Para crear un nuevo estilo necesitás tenerlas. Guardá algún video, link o idea que te guste y volvé a intentarlo.</p>` }]) });
  }
  function uploadView() {
    const st = ST();
    const body = `
      <p class="hint">Cuanto más específico seas, mejor la calidad.</p>
      <div class="atbox" id="cresatt">${att().chips()}<div class="atdrop">${att().btn()}<span>Soltá tus videos acá, pegalos o tocá el más</span></div></div>
      <div class="field"><label for="creslinks">Links (opcional)</label><textarea id="creslinks" rows="2" placeholder="Uno por línea: Instagram, TikTok, YouTube…">${esc(st.linksText)}</textarea></div>
      <div class="field"><label for="cresidea">O escribí una idea (opcional)</label><textarea id="cresidea" rows="2" placeholder="Qué te gustaría que tenga este estilo">${esc(st.ideaText)}</textarea></div>
      ${st.err ? `<p class="status err">${esc(st.err)}</p>` : ""}`;
    return App.crear.cloud({ status: "subí tu material", back: true,
      trail: ST().trail.concat([{ who: "ai", html: `<p>${esc(Q.upload)}</p>` }]), body,
      chips: [{ act: "crescontinue", label: "Continuar", icon: "arrow", pri: true }] });
  }
  function likedRow(it, i) {
    if (it.kind === "idea") return `<li class="crlike idea"><span class="chip">${icon("type")}Idea</span><p>${esc(it.text)}</p></li>`;
    const label = it.kind === "file" ? it.name : it.url;
    return `<li class="crlike"><span class="chip ${it.kind === "file" ? "apricot" : ""}">${icon(it.kind === "file" ? "film" : "link")}${it.kind === "file" ? "Video" : "Link"}</span><b>${esc(label)}</b>
      <label class="sr" for="creslk${i}">Qué te gustó de esto</label><input id="creslk${i}" type="text" maxlength="300" placeholder="¿Qué te gustó de esto? (opcional)" value="${esc(it.liked || "")}" data-liked="${i}"></li>`;
  }
  function likedView() {
    const st = ST(), hasVideo = st.items.some((i) => i.kind === "file");
    const body = `<ul class="crlikes">${st.items.map(likedRow).join("")}</ul>
      ${!hasVideo ? `<div class="banner">Para poder probar el estilo necesito al menos un video. Subí cualquiera que se parezca a lo que querés crear.
        <div class="atbox" id="cresgate">${gateAtt().chips()}<div class="atdrop sm">${gateAtt().btn()}<span>Subir un video</span></div></div></div>` : ""}
      <div class="field"><label for="cresnotes">Notas para Claude (opcional)</label><textarea id="cresnotes" rows="2" placeholder="Cualquier detalle más sobre cómo querés que se sienta">${esc(st.notes || "")}</textarea></div>
      ${st.err ? `<p class="status err">${esc(st.err)}</p>` : ""}`;
    return App.crear.cloud({ status: "qué te gustó", back: true,
      trail: ST().trail.concat([{ who: "ai", html: `<p>${esc(Q.liked)}</p>` }]), body,
      chips: [{ act: "cressend", label: "Enviar", icon: "send", pri: true }] });
  }
  function sentView() {
    const st = ST();
    const body = st.step === "sending" ? `<p class="hint">Enviando…</p>` : `<div class="empty small"><span class="orb fast"></span><p>En cuanto esté listo, te aviso.</p></div><button class="btn" type="button" data-act="crrestart">Crear otro estilo</button>`;
    return App.crear.cloud({ status: st.step === "sending" ? "enviando…" : "en marcha", busy: st.step === "sending",
      trail: ST().trail.concat([{ who: "ai", html: `<p>Este proceso puede tomar un rato. En cuanto esté listo te aviso.</p>` }]), body });
  }
  function render() {
    const s = ST().step;
    if (s === "denied") return deniedView();
    if (s === "upload") return uploadView();
    if (s === "liked") return likedView();
    if (s === "sending" || s === "sent") return sentView();
    return askView();
  }

  // ---------- enviar ----------
  async function send() {
    const st = ST();
    if (att().busy() || gateAtt().busy()) { st.err = "Esperá a que terminen de subir los videos."; App.render(true); return; }
    const gateDone = gateAtt().items.filter((x) => x.state === "done");
    if (!st.items.some((i) => i.kind === "file") && !gateDone.length) { st.err = "Subí un video que se parezca a lo que querés crear."; App.render(true); return; }
    gateDone.forEach((it) => st.items.push({ kind: "file", id: it.assetId, name: it.name, size: it.size, liked: "" }));
    App.crear.advanceStep(() => { st.step = "sending"; });
    const refIds = [];
    for (const it of st.items) {
      let id = null;
      try {
        if (it.kind === "file") id = await App.act.addRefFile({ id: it.id, name: it.name, size: it.size }, it.liked || "");
        else if (it.kind === "link") id = await App.act.addRefLink(it.url, it.liked || "");
        else if (it.kind === "idea") id = await App.act.addRefIdea(it.text, it.text);
      } catch (e) { id = null; }
      if (id) { await App.act.sendRefNow(id); refIds.push(id); }
    }
    if (!refIds.length) { toast("No se pudo guardar el material. Prueba de nuevo."); App.crear.advanceStep(() => { st.step = "liked"; }); return; }
    const res = await App.act.createStyleRequest({ refIds, notes: st.notes || "" });
    if (!res) { toast("No se pudo enviar el pedido. Prueba de nuevo."); App.crear.advanceStep(() => { st.step = "liked"; }); return; }
    UI.crear.ai = {}; // el modelo elegido valia solo para este pedido; el proximo arranca en el de siempre
    App.crear.advanceStep(() => { st.step = "sent"; st.sentId = res.id; });
    toast(res.told ? "Pedido enviado. Claude ya empieza." : "Guardado. Claude lo lee en cuanto haya una sesión abierta.");
  }

  // ---------- eventos ----------
  function bind(root) {
    const dz = $("#cresatt", root); if (dz) att().bind(dz);
    const gz = $("#cresgate", root); if (gz) gateAtt().bind(gz);
    const lk = $("#creslinks", root); if (lk) lk.addEventListener("input", () => { ST().linksText = lk.value; });
    const idEl = $("#cresidea", root); if (idEl) idEl.addEventListener("input", () => { ST().ideaText = idEl.value; });
    const nt = $("#cresnotes", root); if (nt) nt.addEventListener("input", () => { ST().notes = nt.value; });
    $$("[data-liked]", root).forEach((inpEl) => inpEl.addEventListener("input", () => { const it = ST().items[+inpEl.dataset.liked]; if (it) it.liked = inpEl.value; }));
  }

  App.crearEstilo = { render, bind, back };
  const A = App.acts;
  A.cresAsk = (el) => {
    const yes = el.dataset.v === "si";
    stepTo(yes ? "upload" : "denied", [{ who: "ai", html: `<p>${esc(Q.ask)}</p>` }, { who: "me", html: esc(yes ? "Sí, tengo." : "Todavía no.") }]);
  };
  A.crescontinue = () => {
    const st = ST(), links = String(st.linksText || "").split(/\n+/).map((x) => x.trim()).filter((x) => /^https?:\/\/\S+$/i.test(x)), idea = String(st.ideaText || "").trim();
    const uploaded = att().take(); // mueve lo ya subido de la ficha de adjuntos a la lista de referencias del paso siguiente
    uploaded.forEach((f) => st.items.push({ kind: "file", id: f.id, name: f.name, size: f.size, liked: "" }));
    links.forEach((url) => { if (!st.items.some((i) => i.kind === "link" && i.url === url)) st.items.push({ kind: "link", url, liked: "" }); });
    if (idea && !st.items.some((i) => i.kind === "idea" && i.text === idea)) st.items.push({ kind: "idea", text: idea, liked: "" });
    const haveAny = st.items.length;
    if (!haveAny) { st.err = "Subí un video, pegá un link o escribí una idea."; App.render(true); return; }
    const parts = []; const nFiles = st.items.filter((i) => i.kind === "file").length; if (nFiles) parts.push(`${nFiles} video(s)`); if (links.length) parts.push(`${links.length} link(s)`); if (idea) parts.push("una idea");
    stepTo("liked", [{ who: "ai", html: `<p>${esc(Q.upload)}</p>` }, { who: "me", html: esc(parts.join(", ") + ".") }]);
  };
  A.cressend = () => send();
  A.crrestart = () => restart();
})();
