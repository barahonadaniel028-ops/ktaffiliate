/* Aura · Notas (cambios sin enviar y pendientes de Claude) y Ajustes (espacio, tema, Jarvis, conexion). */
(function () {
  "use strict";
  const App = window.App, S = App.S, UI = App.ui, sel = App.sel, { $, $$, esc, icon, plural } = App;

  // ---------- Notas ----------
  const SCOPE_ICON = { VIDEO: "film", PIEZA: "layers", CUENTA: "users", GENERAL: "note", ELEGIDOS: "check", ESTILO: "sparkles" };
  function noteRow(n, kind) {
    return `<li class="nrow"><span class="chip">${esc(App.act.noteScope(n))}</span><div><b>${esc(App.act.noteTitle(n))}</b><p>${esc(n.text)}</p><small class="faint">${n.created ? App.ago(n.created) : ""}${(n.tags || []).length ? " · " + esc(n.tags.join(", ")) : ""}</small></div>
      ${kind === "unsent" ? `<button class="btn sm ghost" type="button" data-act="notedel" data-id="${esc(n.id)}">Quitar</button>` : kind === "sent" ? `<span class="chip">Enviada${n.reply ? "" : ""}</span>` : `<button class="btn sm ghost" type="button" data-act="notereopen" data-id="${esc(n.id)}">Reabrir</button>`}${n.reply ? `<p class="reply">Claude: ${esc(n.reply)}</p>` : ""}</li>`;
  }
  App.views.notas = {
    title: "Notas",
    render() {
      const items = App.act.pendingItems(), n = items.length, sent = S.notes.filter((x) => x.sent === true && !sel.closedNote(x)).sort((a, b) => String(b.created || "").localeCompare(String(a.created || ""))), done = S.notes.filter(sel.closedNote).slice(0, 12);
      const tagOpts = [["general", "Todo el espacio"], ...S.brands.map((b) => ["brand:" + b.id, b.name])];
      return `<div class="vhead"><div class="t"><span class="eyebrow">Para Claude</span><h1 class="h-l">${n ? `<em>${n} ${plural(n, "cambio", "cambios")}</em> sin enviar` : "Todo <em>enviado</em>"}</h1><p class="muted">Lo que escribes en videos, subtítulos, Laboratorio y referencias se junta aquí. Se envía todo junto, una sola vez.</p></div><div class="r">${n ? `<button class="btn pri lg2" type="button" data-act="sendall">Enviar cambios<b>${n}</b></button>` : ""}</div></div>
        <div class="grid cols2 notasg"><section class="card lg"><div class="ch">${icon("send")}Sin enviar<span class="sp"></span>${n ? `<button class="lnk" type="button" data-act="sundoall">Descartar todo</button>` : ""}</div>
          ${n ? `<ul class="plist">${items.map((it, i) => `<li class="pit"><div><span class="eyebrow">${esc(it.kind)}</span><p>${esc(it.label)}</p></div><button class="btn sm ghost" type="button" data-act="sundo" data-i="${i}">Quitar</button></li>`).join("")}</ul>` : `<div class="empty small"><span class="orb"></span><p>No hay nada pendiente de enviar.</p></div>`}</section>
          <section class="card lg"><div class="ch">${icon("note")}Nota rápida</div><form class="field" id="quicknote"><label class="sr" for="qn">Nota</label><textarea id="qn" rows="4" maxlength="2000" placeholder="${esc(App.say("Qué querés que cambie o mejore. Queda como borrador hasta Enviar cambios.", "Qué quieres que cambie o mejore. Queda como borrador hasta Enviar cambios."))}"></textarea>
            <div class="row"><select id="qnscope" aria-label="Aplica a">${tagOpts.map(([k, t]) => `<option value="${esc(k)}">${esc(t)}</option>`).join("")}</select><button class="btn pri" type="submit">Guardar nota</button></div></form></section></div>
        <section class="card lg" style="margin-top:16px"><div class="ch">${icon("clock")}Enviadas, esperando a Claude<span class="sp"></span><span class="faint">${sent.length}</span></div>${sent.length ? `<ul class="nrows">${sent.map((x) => noteRow(x, "sent")).join("")}</ul>` : `<p class="muted">Nada esperando respuesta.</p>`}</section>
        ${done.length ? `<section class="card lg" style="margin-top:16px"><div class="ch">${icon("check")}Resueltas</div><ul class="nrows">${done.map((x) => noteRow(x, "done")).join("")}</ul></section>` : ""}`;
    },
    bind(root) {
      const f = $("#quicknote", root); if (!f) return;
      f.addEventListener("submit", async (e) => { e.preventDefault(); const t = $("#qn").value.trim(); if (!t) return; const v = $("#qnscope").value, ctx = v === "general" ? { scope: "general", title: "Todo el espacio" } : { scope: "brand", brand: v.split(":")[1], title: "Toda la cuenta" }; const id = await App.act.createFeedback(ctx, t, []); App.toast(id ? "Nota guardada. Se envía con Enviar cambios." : "No se pudo guardar. Prueba de nuevo."); $("#qn").value = ""; });
    },
    update(kinds) { const a = document.activeElement; return !!(a && a.id === "qn"); },
  };
  App.acts.notedel = (el) => { const n = S.notes.find((x) => x.id === el.dataset.id); if (n) App.act.removeNote(n); };
  App.acts.notereopen = (el) => { const n = S.notes.find((x) => x.id === el.dataset.id); if (n) App.act.patchNote(n, { status: "open", sent: false }); };

  // ---------- Ajustes ----------
  const row = (title, sub, ctl) => `<div class="srow"><div><b>${title}</b>${sub ? `<small class="muted">${sub}</small>` : ""}</div>${ctl}</div>`;
  const sw = (act, on, label) => `<button class="switch" type="button" role="switch" aria-checked="${on}" aria-label="${esc(label)}" data-act="${act}"></button>`;
  App.views.ajustes = {
    title: "Ajustes",
    render() {
      const c = App.config, T = App.theme, tm = T.mode, claude = S.mode === "claude", metr = App.adapter() && App.adapter().hasMetrics && App.adapter().hasMetrics();
      const accounts = S.brands.map((b) => `<li class="acc"><i class="dot" style="--c:${esc(b.color || "var(--accent)")}"></i><div><b>${esc(b.name)}</b><small class="muted">${esc(b.handle || "")} · ${esc(b.network || "instagram")} · ${esc(b.lang === "en" ? "Inglés" : "Español")}</small></div><span class="chip">${esc(b.blogId || "sin Metricool")}</span></li>`).join("");
      return `<div class="vhead"><div class="t"><span class="eyebrow">${esc(c.name)}</span><h1 class="h-l">Ajustes</h1><p class="muted">Tu espacio de trabajo, el aspecto y la conexión con Claude.</p></div></div>
        <div class="grid cols2 setg"><section class="card lg"><div class="ch">${icon("sun")}Aspecto</div>
          ${row("Tema", "Auto sigue a tu dispositivo.", `<div class="seg" role="radiogroup">${[["auto", "Auto"], ["day", "Día"], ["night", "Noche"]].map(([k, n]) => `<button type="button" role="radio" aria-checked="${tm === k}" class="${tm === k ? "on" : ""}" aria-pressed="${tm === k}" data-act="settheme" data-k="${k}">${n}</button>`).join("")}</div>`)}
          ${row("Zona segura de Instagram", "Muestra por defecto el recuadro seguro al revisar videos.", sw("setsafe", App.store.get("safe", false), "Zona segura"))}
          ${row("Subtítulos en todas las versiones", "Un cambio de palabras se aplica a toda la pieza.", sw("setcapall", App.store.get("cap-all", true) !== false, "Aplicar a todas"))}</section>
        <section class="card lg"><div class="ch">${icon("sparkles")}Jarvis</div>
          ${row("Modelo e intensidad", "El de siempre para Jarvis, el Estudio, el Laboratorio y los videos nuevos.", App.ai.pillHtml("global"))}
          ${row("Respuestas en voz", "Jarvis lee en voz alta sus respuestas.", sw("setvoice", App.store.get("jv-voice", true) !== false, "Voz"))}
          ${row("Atajo", "Abre a Jarvis desde cualquier pantalla.", `<kbd class="kb">⌘ K</kbd>`)}</section>
        <section class="card lg"><div class="ch">${icon("users")}Cuentas<span class="sp"></span><span class="faint">${S.brands.length}</span></div><ul class="accs">${accounts}</ul>
          <form class="addacc" id="addacc"><div class="fgrid2"><div class="field"><label for="aan">Nombre</label><input id="aan" type="text" placeholder="Mi marca" required></div><div class="field"><label for="aah">Usuario</label><input id="aah" type="text" placeholder="@mimarca"></div><div class="field"><label for="aab">ID de Metricool</label><input id="aab" type="text" placeholder="123456"></div></div><button class="btn" type="submit">${icon("plus")}Agregar cuenta</button></form></section>
        <section class="card lg"><div class="ch">${icon("zap")}Conexión</div>
          ${row("Datos", claude ? "Conectado a la base de tu artefacto." : "Modo demostración: datos de ejemplo en memoria.", `<span class="chip ${claude ? "good" : "apricot"}">${claude ? "Claude" : "Demo"}</span>`)}
          ${row("Aviso a Claude", S.claudeState === "available" ? "Claude recibe tus aprobaciones y notas solo." : "Se guarda todo y Claude lo lee cuando abra una sesión.", `<span class="chip ${S.claudeState === "available" ? "good" : ""}">${S.claudeState === "available" ? "Conectado" : S.claudeState === "no_session" ? "Sin sesión" : "No disponible"}</span>`)}
          ${row("Metricool", S.mode === "demo" ? "Datos de ejemplo de redes." : metr ? "Métricas en vivo de tus cuentas." : "No conectado: se usan los últimos datos guardados.", `<span class="chip ${S.mode === "demo" ? "apricot" : metr ? "good" : ""}">${S.mode === "demo" ? "Demo" : metr ? "Conectado" : "Sin conexión"}</span>`)}
          ${S.mode === "demo" ? row("Animación de logros", "Mira cómo se celebra un logro nuevo.", `<button class="btn sm" type="button" data-act="celebratetest">${icon("sparkles")}Probar</button>`) : ""}
          ${row("Modo demostración", "Usa datos de ejemplo en memoria en lugar de tu base real. Útil para probar sin riesgo.", sw("forcedemo", App.store.get("force-demo", false), "Modo demostración"))}
          ${claude && !S.videos.length ? row("Cargar datos de ejemplo", "Tu base está vacía. Carga piezas, métricas y un editor listo para recorrer la plataforma.", `<button class="btn sm pri" type="button" data-act="seeddemo">Cargar</button>`) : ""}
          ${row("Espacio de trabajo", "Cambia entre configuraciones de marca para probar la plataforma.", `<select class="mini-sel" data-change="setpreset" aria-label="Espacio">${Object.values(App.PRESETS).map((p) => `<option value="${p.id}" ${p.id === c.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select>`)}
          ${row("Exportar datos", "Descarga un respaldo de lo que ves (JSON).", `<button class="btn sm" type="button" data-act="setexport">${icon("download")}Exportar</button>`)}</section>
        <section class="card lg span2"><div class="ch">${icon("keyboard")}Atajos</div><div class="keys">${[["⌘ K", "Jarvis"], ["A", "Aprobar"], ["Q", "Quizás"], ["R", "Rechazar"], ["← →", "Cambiar de versión"], ["Espacio", "Pausa"], ["N", "Nota en el cuadro"], ["Esc", "Volver"]].map(([k, t]) => `<span><kbd class="kb">${k}</kbd>${t}</span>`).join("")}</div></section></div>`;
    },
    bind(root) { const f = $("#addacc", root); if (f) f.addEventListener("submit", async (e) => { e.preventDefault(); const name = $("#aan").value.trim(); if (!name) return; const id = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); const ok = await App.data.set("brands", id, { name, handle: $("#aah").value.trim(), blogId: $("#aab").value.trim(), color: "#0f6b6c", order: S.brands.length + 1, lang: "es", network: "instagram" }); App.toast(ok ? "Cuenta agregada." : "No se pudo agregar."); }); },
  };
  const A = App.acts;
  A.settheme = (el, e) => App.theme.set(el.dataset.k, e).then(() => App.render(true));
  A.setsafe = (el) => { const on = el.getAttribute("aria-checked") !== "true"; App.store.set("safe", on); el.setAttribute("aria-checked", on); };
  A.setcapall = (el) => { const on = el.getAttribute("aria-checked") !== "true"; App.store.set("cap-all", on); el.setAttribute("aria-checked", on); };
  A.setvoice = (el) => { const on = el.getAttribute("aria-checked") !== "true"; App.store.set("jv-voice", on); el.setAttribute("aria-checked", on); };
  A.setpreset = (el) => App.setPreset(el.value);
  A.setexport = async () => { const data = { exported: App.stamp(), space: App.config.id, brands: S.brands, videos: S.videos, notes: S.notes, requests: S.requests, refs: S.refs, styles: S.expStyles }; const ok = await App.adapter().download(`aura-${App.config.id}-${App.dayKey(new Date())}.json`, JSON.stringify(data, null, 2)); App.toast(ok ? "Respaldo listo." : "No se pudo descargar."); };
})();
