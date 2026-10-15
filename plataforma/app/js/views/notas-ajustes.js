/* Aura · Notas (cambios sin enviar y pendientes de Claude) y Ajustes (espacio, tema, Jarvis, conexion). */
(function () {
  "use strict";
  const App = window.App, S = App.S, UI = App.ui, sel = App.sel, { $, $$, esc, icon, plural } = App;

  // ---------- Notas: "¿Cómo puedo mejorar tu experiencia aquí?" (DECISIONES.md #12) ----------
  // Ya no es una lista de borradores: es una nube flotante (la misma materia que Jarvis, nunca un circulo perfecto) con una sola pregunta y un
  // espacio para escribir. Cada mensaje se manda a Claude en el acto (App.act.sendExperience) y la nube responde "Recibido. ¿Hay algo más?"
  // hasta que la persona dice que no hay nada mas ("Eso es todo", o escribir "no"/"nada"): ahi dice "Muchas gracias, haremos lo mejor...".
  // Los cambios sin enviar (videos, referencias, subtitulos) se ven y se mandan desde la barra de abajo, que ahora tambien esta aqui.
  UI.notas = UI.notas || { step: "ask", n: 0 };
  const SAY = { ask: "¿Cómo puedo mejorar tu experiencia aquí?", more: "<b>Recibido.</b> ¿Hay algo más?", thanks: "Muchas gracias, haremos lo mejor por mejorar tu experiencia." };
  const END = /^\s*(no|nada|nada m[aá]s|eso es todo|es todo|ya|listo|ninguno|no,? gracias|no,? nada)[\s.!¡]*$/i;
  let ntIn = false;
  const ntSpring = "cubic-bezier(.16,1,.3,1)";
  function ntSay(step, instant) {
    const el = $("#ntsay"), nt = $(".nt"); if (!el || !nt) return;
    nt.dataset.step = step; UI.notas.step = step;
    const apply = () => { el.innerHTML = `<span>${SAY[step]}</span>`; if (!App.reduceMotion() && el.firstElementChild.animate) el.firstElementChild.animate([{ opacity: 0, transform: "translateY(14px)", filter: "blur(10px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 700, easing: ntSpring, fill: "backwards" }); };
    const cur = el.firstElementChild;
    if (instant || App.reduceMotion() || !cur || !cur.animate) { apply(); return; }
    cur.animate([{ opacity: 1, filter: "blur(0)" }, { opacity: 0, transform: "translateY(-10px)", filter: "blur(8px)" }], { duration: 220, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" }).finished.then(apply, apply);
  }
  // al recibir algo la nube se "traga" el mensaje: se aprieta y se asienta como una gota (solo transform, sobre el cuerpo; el contorno sigue su propio vaiven)
  function ntPulse() { const c = $("#ntcloud"); if (c && !App.reduceMotion() && c.animate) c.animate([{ transform: "scale(1)" }, { transform: "scale(1.045, .965)" }, { transform: "scale(.99, 1.015)" }, { transform: "scale(1)" }], { duration: 900, easing: ntSpring }); }
  function ntGather() { const c = $("#ntcloud"); if (!c) return; const r = c.getBoundingClientRect(); App.aura.mood("focus", { x: r.x + r.width / 2, y: r.y + r.height / 2 }); }
  async function ntSend(text) {
    const form = $("#ntform"), ta = $("#ntbox"), btn = form && $("button", form); if (!ta) return;
    if (!text) { ta.focus(); if (ta.animate && !App.reduceMotion()) form.animate([{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(5px)" }, { transform: "translateX(0)" }], { duration: 320, easing: "ease-out" }); return; }
    if (END.test(text)) { ntFinish(); return; }
    ta.disabled = true; if (btn) btn.disabled = true;
    const ok = await App.act.sendExperience(text);
    ta.disabled = false; if (btn) btn.disabled = false;
    if (!ok) { App.toast("No se pudo enviar. Prueba de nuevo."); ta.focus(); return; }
    UI.notas.n++; ta.value = ""; ntPulse(); ntSay("more"); ta.focus();
  }
  function ntFinish() { ntPulse(); ntSay("thanks"); const c = $("#ntcloud"); if (c) App.morph.sparkles(c, 8); const ta = $("#ntbox"); if (ta) ta.value = ""; }
  App.views.notas = {
    title: "Notas",
    render() {
      const st = UI.notas.step;
      return `<div class="nt" data-step="${st}"><div class="nt-float"><div class="nt-cloud" id="ntcloud" role="group" aria-label="Cuéntame cómo mejorar tu experiencia"><span class="crliq" aria-hidden="true"><i></i><i></i><i></i></span>
        <div class="nt-in"><span class="orb nt-orb" aria-hidden="true"></span><p class="nt-say" id="ntsay" aria-live="polite"><span>${SAY[st]}</span></p>
          <form class="rvcomp nt-form" id="ntform"><textarea id="ntbox" rows="2" maxlength="2000" placeholder="Escribe aquí" aria-label="Tu idea o comentario"></textarea><button class="rvsend" type="submit" aria-label="Enviar">${icon("arrow")}</button></form>
          <button class="nt-end" type="button" data-act="ntend">Eso es todo</button><button class="nt-again" type="button" data-act="ntagain">Escribir otra idea</button></div></div></div></div>`;
    },
    bind(root) {
      const f = $("#ntform", root), ta = $("#ntbox", root), c = $("#ntcloud", root); if (!f || !c) return;
      if (!ntIn) { ntIn = true; App.morph.arrive(c); }
      ntGather();
      f.addEventListener("submit", (e) => { e.preventDefault(); ntSend(ta.value.trim()); });
      ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); ntSend(ta.value.trim()); } });
      if (UI.notas.step !== "thanks" && !App._morphNav) setTimeout(() => { if (document.contains(ta)) ta.focus({ preventScroll: true }); }, 900);
    },
    update() { return true; }, // nada de aqui depende de los datos: no se repinta (y no se pierde lo que se esta escribiendo)
  };
  App.acts.ntend = () => ntFinish();
  App.acts.ntagain = () => { ntSay("ask"); const ta = $("#ntbox"); if (ta) ta.focus(); };
  App.on((ks) => { if (!ks.has("route") || App.route().name === "notas") return; ntIn = false; UI.notas = { step: "ask", n: 0 }; if (!(App.jarvis && App.jarvis.isOpen()) && !(App.celebrate && App.celebrate.isOpen()) && App.route().name !== "crear") App.aura.mood(null); });

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
          ${row("Zona segura de Instagram", "Muestra por defecto el recuadro seguro al revisar videos.", sw("setsafe", App.store.get("safe", false), "Zona segura"))}</section>
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
          ${S.mode === "demo" ? row("Animación de hitos", "Mira cómo se celebra un hito nuevo.", `<button class="btn sm" type="button" data-act="celebratetest">${icon("sparkles")}Probar</button>`) : ""}
          ${row("Modo demostración", "Usa datos de ejemplo en memoria en lugar de tu base real. Útil para probar sin riesgo.", sw("forcedemo", App.store.get("force-demo", false), "Modo demostración"))}
          ${claude && !S.videos.length ? row("Cargar datos de ejemplo", "Tu base está vacía. Carga piezas, métricas y un editor listo para recorrer la plataforma.", `<button class="btn sm pri" type="button" data-act="seeddemo">Cargar</button>`) : ""}
          ${row("Espacio de trabajo", "Cambia entre configuraciones de marca para probar la plataforma.", `<select class="mini-sel" data-change="setpreset" aria-label="Espacio">${Object.values(App.PRESETS).map((p) => `<option value="${p.id}" ${p.id === c.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select>`)}
          ${row("Exportar datos", "Descarga un respaldo de lo que ves (JSON).", `<button class="btn sm" type="button" data-act="setexport">${icon("download")}Exportar</button>`)}</section>
        <section class="card lg span2"><div class="ch">${icon("keyboard")}Atajos</div><div class="keys">${[["⌘ K", "Jarvis"], ["A", "Aprobar"], ["Q", "Quizás"], ["R", "Rechazar"], ["← →", "Cambiar de versión"], ["Espacio", "Pausa"], ["Esc", "Volver"]].map(([k, t]) => `<span><kbd class="kb">${k}</kbd>${t}</span>`).join("")}</div></section></div>`;
    },
    bind(root) { const f = $("#addacc", root); if (f) f.addEventListener("submit", async (e) => { e.preventDefault(); const name = $("#aan").value.trim(); if (!name) return; const id = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); const ok = await App.data.set("brands", id, { name, handle: $("#aah").value.trim(), blogId: $("#aab").value.trim(), color: "#0f6b6c", order: S.brands.length + 1, lang: "es", network: "instagram" }); App.toast(ok ? "Cuenta agregada." : "No se pudo agregar."); }); },
  };
  const A = App.acts;
  A.settheme = (el, e) => App.theme.set(el.dataset.k, e).then(() => App.render(true));
  A.setsafe = (el) => { const on = el.getAttribute("aria-checked") !== "true"; App.store.set("safe", on); el.setAttribute("aria-checked", on); };
  A.setvoice = (el) => { const on = el.getAttribute("aria-checked") !== "true"; App.store.set("jv-voice", on); el.setAttribute("aria-checked", on); };
  A.setpreset = (el) => App.setPreset(el.value);
  A.setexport = async () => { const data = { exported: App.stamp(), space: App.config.id, brands: S.brands, videos: S.videos, notes: S.notes, requests: S.requests, refs: S.refs, styles: S.expStyles }; const ok = await App.adapter().download(`aura-${App.config.id}-${App.dayKey(new Date())}.json`, JSON.stringify(data, null, 2)); App.toast(ok ? "Respaldo listo." : "No se pudo descargar."); };
})();
