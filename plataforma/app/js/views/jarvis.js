/* Aura · Jarvis. El orbe se estira como una gota y se vuelve este panel: paleta de comandos (⌘K), conversacion con Claude (capacidad sample + herramientas)
   y un modo local por reglas cuando no hay sample. Aprobar siempre pasa por una tarjeta de confirmacion. */
(function () {
  "use strict";
  const App = window.App, S = App.S, sel = App.sel, { $, $$, esc, icon, plural, fmt } = App;
  const MAX_TURNS = 8, MAX_TASK = 1500, VOICE_KEY = "jv-voice";
  const ERRORS = { rate_limited: "Llegaste al límite de uso por ahora. Prueba en un rato.", session_expired: "Vuelve a iniciar sesión en Claude y prueba de nuevo.", refused: "Eso no lo puedo responder. Prueba con otra pregunta.", empty_completion: "No me salió respuesta. Prueba de otra forma.", prompt_too_large: "Eso quedó muy largo. Prueba más corto.", upstream_error: "Se cortó la conexión. Prueba de nuevo." };
  const BLOCKED = ["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"];
  let open = false, busy = false, ctl = null, rec = null, sample = null, canTools = false, ready = false, turns = [], confirmCtx = null, from = null, blockedMsg = "", cmdIdx = 0;
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  const COMMANDS = () => [
    ...App.nav.map(([k, n, ic]) => ({ id: "go:" + k, label: "Ir a " + n, icon: ic, run: () => nav("#" + k), kw: n })),
    { id: "go:ajustes", label: "Ir a Ajustes", icon: "settings", run: () => nav("#ajustes"), kw: "ajustes configuracion" },
    { id: "act:approve", label: App.say("Empezar a aprobar", "Empezar a aprobar"), icon: "check", run: () => nav("#aprobar"), kw: "aprobar decidir videos pendientes" },
    { id: "act:new", label: "Pedir un video nuevo", icon: "plus", run: () => nav("#crear"), kw: "crear nuevo pedir video subir" },
    { id: "act:upload", label: "Subir videos", icon: "upload", run: () => nav("#crear/subir"), kw: "subir archivos crudos" },
    { id: "act:theme", label: "Cambiar entre día y noche", icon: "moon", run: () => { close(); setTimeout(() => App.theme.toggle(), 380); }, kw: "tema dia noche oscuro claro" },
    { id: "act:send", label: "Enviar cambios a Claude", icon: "send", run: () => { close(); App.act.sendAll(); }, kw: "enviar cambios" },
  ];
  const score = (c, q) => { const t = norm(c.label + " " + (c.kw || "")); return q.split(/\s+/).filter(Boolean).every((w) => t.includes(w)) ? (norm(c.label).startsWith(q) ? 2 : 1) : 0; };
  const matches = (q) => { q = norm(q).trim(); const all = COMMANDS(); return q ? all.map((c) => [c, score(c, q)]).filter((x) => x[1]).sort((a, b) => b[1] - a[1]).map((x) => x[0]).slice(0, 6) : all.slice(0, 6); };

  // ---------- resumen que Jarvis conoce ----------
  function brief() {
    const l = sel.local(Date.now());
    const marcas = S.brands.map((b) => { const r = sel.runway(b), e = sel.evoOf(b), g = sel.igOf(b), pend = {};
      S.videos.filter((v) => v.brand === b.id && !v.published && sel.isPending(v)).forEach((v) => { const k = v.pieceName || v.piece; (pend[k] = pend[k] || []).push("v" + v.version); });
      return { id: b.id, nombre: b.name, diasDeContenido: r.days, contenidoHasta: r.last ? sel.showDateL(r.last) : null, postsAgendados: r.posts, aprobadosSinAgendar: r.waiting, porAprobar: Object.entries(pend).slice(0, 25).map(([pieza, versiones]) => ({ pieza, versiones })),
        instagram7dias: e ? { vistas: e.views, cambioVistasPct: e.dViews, interacciones: e.inter, seguidoresNuevos: e.net, seguidoresTotal: e.followers } : null, mejorReelDe30dias: g.top ? { nombre: sel.reelName(sel.enrich(b, [g.top])[0]), vistas: g.top.views } : null }; });
    const T = App.trophies, cs = T.cards(), lv = T.level(T.totalXp(cs));
    return JSON.stringify({ ahora: `${l.getUTCDate()} ${App.MONTHS[l.getUTCMonth()]} ${App.pad(l.getUTCHours())}:${App.pad(l.getUTCMinutes())}`, marcas,
      pendientes: sel.todoItems().map((t) => ({ id: t.id, urgencia: t.urgency, titulo: t.title, detalle: t.detail || "" })), notasAbiertas: S.notes.filter((n) => !sel.closedNote(n)).length, cambiosSinEnviar: sel.unsentCount(),
      pedidosEnCurso: sel.activeRequests().length, biblioteca: App.lib.countByType(), logros: { nivel: lv.level, xp: lv.xp, proximos: T.all(cs).filter((x) => x.next != null && x.value > 0).sort((a, b) => b.ratio - a.ratio).slice(0, 3).map((x) => ({ logro: x.def.name, falta: x.next - x.value })) } });
  }
  const RULES = () => `Eres JARVIS, ${App.config.jarvis.persona}.
Cómo hablas: español claro${App.config.voice === "vos" ? " con voseo" : ""}, frases cortas y directas, sin saludos largos ni relleno. Responde en 1 a 3 frases salvo que pidan detalle. Si hay varios pasos, una lista numerada corta.
Reglas:
- Usa SOLO los datos del RESUMEN. Si algo no está ahí, no lo inventes: di que no lo ves y ofrece pasárselo a Claude.
- Navegar: go_to. Aprobar una pieza: propose_approval (siempre muestra un botón de confirmación, nunca aprueba solo). Pendiente hecho: mark_todo_done. Abrir un video en el editor: open_studio. Pedir un video nuevo: new_request. Feedback general: leave_feedback.
- Todo lo que sea trabajo real (producir, rehacer o agendar videos, cambiar posts en Metricool, intros, leer páginas) se lo pasas a Claude con ask_claude con una instrucción completa y autosuficiente.
- Nunca digas que algo está hecho si solo lo pediste: di "se lo pasé a Claude" o "te muestro el botón para confirmar".
- No hay ventas ni dinero en esta plataforma: si preguntan, di que esa parte no está.`;

  function findPending(query, brandHint) {
    const q = norm(query), bId = S.brands.some((b) => b.id === brandHint) ? brandHint : null, hits = S.videos.filter((v) => !v.published && sel.isPending(v) && (!bId || v.brand === bId) && norm(`${v.piece} ${v.pieceName || ""}`).includes(q)), groups = new Map();
    hits.forEach((v) => { const k = v.brand + "|" + v.piece; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(v); });
    return [...groups.values()];
  }
  const ROUTES = ["hoy", "aprobar", "crear", "biblioteca", "laboratorio", "metricas", "logros", "notas", "estudio", "ajustes"];
  function tools() {
    const stat = (t) => { const s = $("#jvstat"); if (s) s.textContent = t; };
    return [
      { name: "go_to", description: "Abre una pantalla. view = hoy, aprobar, crear, biblioteca, laboratorio, metricas, logros, notas, estudio o ajustes. Opcional brand (id de cuenta) para elegir la cuenta. Devuelve 'ok'.",
        inputSchema: { type: "object", properties: { view: { type: "string" }, brand: { type: "string" } }, required: ["view"] },
        execute: ({ view, brand }) => { const v = norm(view).replace(/^#/, ""); if (!ROUTES.includes(v)) throw new Error("pantalla desconocida: " + view); if (brand && S.brands.some((b) => b.id === brand)) sel.setBrand(brand); stat("abriendo…"); setTimeout(() => nav("#" + v), 350); return "ok"; } },
      { name: "propose_approval", description: "Prepara aprobar TODAS las versiones por aprobar de UNA pieza. NO aprueba nada: muestra un botón de confirmación. piece = nombre o parte del nombre; brand opcional.",
        inputSchema: { type: "object", properties: { piece: { type: "string" }, brand: { type: "string" } }, required: ["piece"] },
        execute: ({ piece, brand }) => { const g = findPending(piece, brand); if (!g.length) throw new Error("no hay videos por aprobar que coincidan con " + piece); if (g.length > 1) return "Coinciden varias piezas, pide que elija: " + g.map((x) => `${x[0].pieceName || x[0].piece} (${x[0].brand})`).join("; "); const b = sel.brandOf(g[0][0]); confirmCtx = { ids: g[0].map((v) => v.id), label: g[0][0].pieceName || g[0][0].piece, brand: b ? b.name : g[0][0].brand }; showConfirm(); return `Mostré el botón para aprobar ${g[0].length} versiones de ${confirmCtx.label}. Falta que confirme.`; } },
      { name: "mark_todo_done", description: "Marca como hecho un pendiente de la lista por su id (solo los no automáticos).", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
        execute: async ({ id }) => { if (!S.homeTodo.some((t) => t && t.id === String(id))) throw new Error("ese pendiente no se puede marcar acá"); await App.act.markTodoDone(String(id)); return "ok"; } },
      { name: "open_studio", description: "Abre el Estudio (editor) con un video. piece = nombre de la pieza; version opcional (número).", inputSchema: { type: "object", properties: { piece: { type: "string" }, version: { type: "number" } }, required: ["piece"] },
        execute: ({ piece, version }) => { const q = norm(piece), vs = S.videos.filter((v) => norm(`${v.piece} ${v.pieceName || ""}`).includes(q) && (!version || v.version === version)); if (!vs.length) throw new Error("no encontré esa pieza"); const v = vs[0]; setTimeout(() => nav("#estudio/" + encodeURIComponent(v.id)), 350); return "Abriendo " + sel.label(v); } },
      { name: "new_request", description: "Lleva a Crear con un pedido empezado. topic = la idea del video; brand opcional.", inputSchema: { type: "object", properties: { topic: { type: "string" }, brand: { type: "string" } }, required: ["topic"] },
        execute: ({ topic, brand }) => { if (brand && S.brands.some((b) => b.id === brand)) sel.setBrand(brand); App.ui.draft = Object.assign(App.ui.draft || {}, { topic: String(topic || "").slice(0, 600) }); setTimeout(() => nav("#crear"), 350); return "Abrí Crear con la idea cargada; falta que confirme y envíe."; } },
      { name: "leave_feedback", description: "Guarda feedback general como borrador en Notas; llega a Claude con Enviar cambios. scope = general o brand (con brand).", inputSchema: { type: "object", properties: { text: { type: "string" }, scope: { type: "string" }, brand: { type: "string" } }, required: ["text"] },
        execute: async ({ text, scope, brand }) => { const isB = scope === "brand" && S.brands.some((b) => b.id === brand); stat("guardando…"); await App.act.createFeedback(isB ? { scope: "brand", brand, title: "Toda la cuenta " + sel.brand(brand).name } : { scope: "general", title: "Todo el espacio" }, String(text || ""), []); return "Guardado. Se envía cuando toques Enviar cambios."; } },
      { name: "ask_claude", description: "Le pasa una tarea a Claude, la sesión real que produce y agenda videos, cambia posts en Metricool y genera material. task = instrucción completa y autosuficiente.", inputSchema: { type: "object", properties: { task: { type: "string" } }, required: ["task"] },
        execute: async ({ task }) => { const t = String(task || "").trim().slice(0, MAX_TASK); if (!t) throw new Error("tarea vacía"); stat("pasándole el pedido a Claude…"); await App.data.set("requests", "jarvis_" + Date.now(), { kind: "jarvis", text: t, at: App.stamp(), by: S.userId, status: "pendiente" }); const told = await App.data.tell("PEDIDO DESDE JARVIS: " + t); return told ? "Claude recibió el pedido ahora mismo." : "Guardado. Claude lo lee cuando haya una sesión abierta."; } },
    ];
  }

  // ---------- UI ----------
  const wrap = () => $("#jvwrap"), panel = () => $("#jv");
  function mount() {
    $("#jvmount").innerHTML = `<div class="jv-wrap" id="jvwrap"><div class="veil" data-jvclose></div>
      <section class="jv lg solid-glass" id="jv" role="dialog" aria-modal="true" aria-label="Jarvis"><div class="inner">
        <div class="jh"><span class="orb"></span><div class="nm">Jarvis<small id="jvstat">en línea</small></div><span style="flex:1"></span>
          <button class="iconbtn" id="jvvoice" type="button" aria-pressed="true" aria-label="Respuestas en voz" title="Respuestas en voz">${icon("volume")}</button><button class="iconbtn" type="button" data-jvclose aria-label="Cerrar">${icon("x")}</button></div>
        <div class="jvlisten" id="jvlisten" aria-hidden="true"><span class="orb listen"></span><p id="jvlive">Te escucho…</p></div><div class="log" id="jvlog" role="log" aria-live="polite"></div>
        <div class="cmds" id="jvcmds"></div><div class="chips" id="jvchips"></div>
        <form class="ask2" id="jvform"><input id="jvbox" type="text" autocomplete="off" placeholder="${esc(App.say("Escribí, hablame o buscá un comando…", "Escribe, háblame o busca un comando…"))}" aria-label="Mensaje para Jarvis"><button class="mic" id="jvmic" type="button" aria-label="Hablar" aria-pressed="false">${icon("mic")}</button><button class="go" type="submit" aria-label="Enviar">${icon("arrow")}</button></form>
        <p class="note" id="jvnote"></p></div></section></div>`;
    const v = $("#jvvoice"); v.setAttribute("aria-pressed", String(voiceOn()));
    v.onclick = () => { const on = !voiceOn(); App.store.set(VOICE_KEY, on); v.setAttribute("aria-pressed", String(on)); if (!on) try { speechSynthesis.cancel(); } catch (e) { /* sin voz */ } };
    $("#jvwrap").addEventListener("click", (e) => { if (e.target.closest("[data-jvclose]")) close(); const b = e.target.closest("[data-jvc]"); if (b) resolveConfirm(b.dataset.jvc === "yes", b.closest(".confirm")); const c = e.target.closest("[data-cmd]"); if (c) runCmd(+c.dataset.cmd); const ch = e.target.closest("[data-chip]"); if (ch) send(ch.textContent); const ac = e.target.closest("[data-jvask]"); if (ac) toClaude(ac.dataset.jvask); });
    $("#jvform").addEventListener("submit", (e) => { e.preventDefault(); submit(); });
    $("#jvmic").onclick = listen;
    const box = $("#jvbox");
    box.addEventListener("input", renderCmds);
    box.addEventListener("keydown", (e) => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { const n = $("#jvcmds").children.length; if (n) { e.preventDefault(); cmdIdx = (cmdIdx + (e.key === "ArrowDown" ? 1 : -1) + n) % n; renderCmds(true); } } });
  }
  const voiceOn = () => App.store.get(VOICE_KEY, true) !== false;
  let curCmds = [];
  function renderCmds(keep) {
    if (keep !== true) cmdIdx = 0;
    const q = $("#jvbox").value; curCmds = matches(q); const box = $("#jvcmds");
    box.hidden = busy; box.innerHTML = curCmds.map((c, i) => `<button type="button" data-cmd="${i}" class="${i === cmdIdx ? "on" : ""}">${icon(c.icon)}<span>${esc(c.label)}</span>${i === 0 && q ? "<kbd>↵</kbd>" : ""}</button>`).join("");
    $("#jvchips").hidden = !!q || turns.length > 0 || busy;
  }
  function runCmd(i) { const c = curCmds[i]; if (c) { $("#jvbox").value = ""; c.run(); } }
  function submit() {
    const q = $("#jvbox").value.trim(); if (!q) return;
    const top = curCmds[cmdIdx], strong = top && score(top, norm(q)) >= 1 && norm(q).split(/\s+/).length <= 2;
    if (strong) { runCmd(cmdIdx); return; }
    send(q);
  }
  function add(kind, text, html) {
    const d = document.createElement("div"); d.className = "msg " + (kind === "u" ? "me" : "ai"); if (html) d.innerHTML = text; else d.textContent = text;
    const log = $("#jvlog"); log.appendChild(d); log.scrollTop = log.scrollHeight; return d;
  }
  function speak(text) {
    if (!voiceOn() || !("speechSynthesis" in window)) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(String(text).replace(/[*_`#>]/g, "")), v = speechSynthesis.getVoices().find((x) => /^es[-_]/i.test(x.lang)); if (v) u.voice = v; u.lang = v ? v.lang : "es-ES"; speechSynthesis.speak(u); } catch (e) { /* sin voz */ }
  }
  function showConfirm() {
    if (!confirmCtx) return;
    const c = document.createElement("div"); c.className = "confirm";
    c.innerHTML = `<b>Confirma</b><span>Aprobar las ${confirmCtx.ids.length} versiones de «${esc(confirmCtx.label)}» (${esc(confirmCtx.brand)}). Aprobar es dejarlas agendadas.</span><div class="acts"><button class="btn sm pri" type="button" data-jvc="yes">Sí, aprobar</button><button class="btn sm ghost" type="button" data-jvc="no">No</button></div>`;
    const log = $("#jvlog"); log.appendChild(c); log.scrollTop = log.scrollHeight;
  }
  function resolveConfirm(yes, card) {
    const pend = confirmCtx; confirmCtx = null; if (!pend) return; card.remove();
    if (!yes) { add("a", "Listo, no aprobé nada."); return; }
    const todo = pend.ids.map((id) => sel.video(id)).filter((v) => v && sel.isPending(v));
    if (todo.length) App.act.setMany(todo, "approved");
    add("a", todo.length ? `Aprobé ${todo.length} versiones de ${pend.label}. Si te equivocaste, el aviso de abajo tiene Deshacer.` : "Esas versiones ya no estaban por aprobar.");
  }
  function setBusy(on) { busy = on; if (open) App.aura.mood(on ? "think" : "focus"); $("#jvstat").textContent = on ? "pensando…" : "en línea"; $("#jvbox").disabled = on || !!blockedMsg; $("#jvmic").disabled = on; if (!on) $("#jvbox").focus(); const o = panel().querySelector(".jh .orb"); if (o) o.classList.toggle("fast", on); }

  // ---------- conversacion ----------
  async function init() {
    if (ready) return; ready = true;
    sample = await App.adapter().sample();
    if (sample) { try { const lim = await sample.limits(); canTools = !!(lim && lim.tools); } catch (e) { canTools = false; } }
    const note = $("#jvnote");
    if (!sample) note.textContent = App.adapter().name === "demo" ? "Modo demostración: respondo con reglas simples. Con Claude conectado entiendo cualquier pregunta." : "Jarvis completo no está disponible en esta vista; respondo con reglas simples.";
  }
  async function send(raw) {
    const text = String(raw || "").trim(); if (!text || busy) return;
    $("#jvbox").value = ""; $("#jvchips").hidden = true; $("#jvcmds").hidden = true; add("u", text); turns.push({ role: "user", content: text });
    if (!sample) { local(text); return; }
    const bubble = add("a", '<span class="typing"><i></i><i></i><i></i></span>', true); setBusy(true); ctl = new AbortController();
    const input = [{ role: "user", content: RULES() + "\n\nRESUMEN ACTUAL (JSON):\n" + brief() }, ...turns.slice(-MAX_TURNS)];
    const opts = { modelTier: "quick", signal: ctl.signal, onText: ({ text: t }) => { bubble.textContent = t; $("#jvlog").scrollTop = $("#jvlog").scrollHeight; } };
    if (canTools) opts.tools = tools();
    try { const res = await sample(input, opts); bubble.textContent = res.text; turns.push({ role: "assistant", content: res.text }); speak(res.text); }
    catch (e) {
      const code = e && e.code;
      if (e && e.text) bubble.textContent = e.text + (code === "cancelled" ? "" : " (se cortó)"); else bubble.remove();
      if (BLOCKED.includes(code)) { blockedMsg = "No tengo permiso para usar Claude en esta página. Se da desde el menú de permisos del artefacto."; add("a", blockedMsg); }
      else if (code !== "cancelled") add("a", ERRORS[code] || "No pude responder. Prueba de nuevo.");
    } finally { ctl = null; setBusy(false); }
  }
  // modo local: reglas simples sobre el mismo resumen
  function local(text) {
    const q = norm(text), reply = (t, extra) => { const d = add("a", t, true); if (extra) d.insertAdjacentHTML("beforeend", extra); turns.push({ role: "assistant", content: d.textContent }); speak(d.textContent); };
    const rs = S.brands.map((b) => [b, sel.runway(b)]);
    const goto = /(llevame|llevame a|llevame|ve a|ir a|abre|abrir|muestrame|llevame)/.test(q) && ROUTES.find((r) => q.includes(r) || (r === "metricas" && /redes|numeros/.test(q)));
    if (goto) { reply(`Te llevo a ${goto}.`); setTimeout(() => nav("#" + goto), 450); return; }
    if (/estudio|editor/.test(q)) { reply("Abro el Estudio."); setTimeout(() => nav("#estudio"), 450); return; }
    if (/pendiente|aprobar|decidir|que tengo/.test(q)) { const n = sel.allPending().length; reply(n ? `Tienes <b>${n} ${plural(n, "video", "videos")}</b> por aprobar. ` + rs.filter((x) => x[1].pend).map((x) => `${esc(x[0].name)}: ${x[1].pend}`).join(" · ") : "No tienes nada por aprobar. Todo decidido.", n ? '<p><button class="btn sm" data-cmd-go="aprobar" onclick="location.hash=\'#aprobar\'">Ir a aprobar</button></p>' : ""); return; }
    if (/contenido|queda|runway|dias/.test(q)) { reply(rs.map((x) => `<b>${esc(x[0].name)}</b>: ${x[1].days} ${plural(x[1].days, "día", "días")}${x[1].last ? " (hasta el " + sel.showDateL(x[1].last) + ")" : ""}`).join("<br>")); return; }
    if (/redes|vistas|seguidor|instagram|metrica|resultado/.test(q)) { const ev = S.brands.map((b) => [b, sel.evoOf(b)]).filter((x) => x[1]); reply(ev.length ? ev.map((x) => `<b>${esc(x[0].name)}</b>: ${fmt(x[1].views)} vistas, ${x[1].net >= 0 ? "+" : ""}${x[1].net} seguidores esta semana`).join("<br>") : "Todavía no tengo datos de Metricool cargados."); return; }
    if (/ventas|comision|dinero|stripe/.test(q)) { reply("Esa parte no está en esta plataforma: nos enfocamos en redes sociales."); return; }
    if (/biblioteca|estilo/.test(q)) { const c = App.lib.countByType(); reply(`La Biblioteca tiene ${Object.values(c).reduce((a, b) => a + b, 0)} elementos aprobados: ${Object.entries(c).map(([k, n]) => `${n} ${k}`).join(", ")}.`); return; }
    reply(`Eso no lo puedo resolver solo. ¿Se lo paso a Claude?`, `<p><button class="btn sm pri" data-jvask="${esc(text)}">Pasárselo a Claude</button></p>`);
  }
  async function toClaude(text) {
    await App.data.set("requests", "jarvis_" + Date.now(), { kind: "jarvis", text, at: App.stamp(), by: S.userId, status: "pendiente" });
    const told = await App.data.tell("PEDIDO DESDE JARVIS: " + text); add("a", told ? "Se lo pasé a Claude: ya lo recibió." : "Guardado. Claude lo lee cuando haya una sesión abierta.");
  }
  function listen() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition, mic = $("#jvmic");
    if (!SR) { add("a", "Este navegador no tiene reconocimiento de voz. Usa el dictado de tu teclado."); mic.hidden = true; return; }
    if (rec) { try { rec.stop(); } catch (e) { /* ya detenido */ } return; }
    try {
      const r = new SR(); r.lang = App.config.lang === "es" ? "es-ES" : "en-US"; r.interimResults = true; r.continuous = false;
      r.onresult = (ev) => { const t = [...ev.results].map((x) => x[0].transcript).join(" "); $("#jvbox").value = t; $("#jvlive").textContent = t || "Te escucho…"; renderCmds(); if (ev.results[ev.results.length - 1].isFinal) { panel().classList.remove("listening"); submit(); } };
      r.onerror = (ev) => { if (/not-allowed|service-not-allowed|audio-capture/.test(ev.error)) { add("a", "Esta página no tiene permiso de micrófono. Usa el dictado del teclado."); mic.hidden = true; } };
      r.onend = () => { rec = null; mic.setAttribute("aria-pressed", "false"); panel().querySelector(".jh .orb").classList.remove("fast"); panel().classList.remove("listening"); App.aura.mood(open ? "focus" : null); };
      rec = r; mic.setAttribute("aria-pressed", "true"); panel().querySelector(".jh .orb").classList.add("fast"); panel().classList.add("listening"); $("#jvlive").textContent = "Te escucho…"; App.aura.mood("listen"); r.start();
    } catch (e) { rec = null; add("a", "No pude abrir el micrófono. Usa el dictado del teclado."); mic.hidden = true; }
  }

  // ---------- abrir / cerrar / navegar ----------
  function nav(hash) { if (open) { navigateFrom(hash); } else App.go(hash.replace(/^#/, "")); }
  async function navigateFrom(hash) {
    const w = wrap(), p = panel(); open = false; App.aura.mood(null);
    let went = false; const go = () => { if (!went) { went = true; App.go(hash.replace(/^#/, "")); } };
    if (App.reduceMotion()) { w.classList.remove("in", "open", "shown"); go(); return; }
    const r = App.morph.rectOf(p), main = $("#main").getBoundingClientRect(), from = { x: r.x + r.w / 2, y: r.y + r.h / 2 }, to = { x: main.left + Math.min(main.width, 900) / 2, y: Math.max(140, main.top + 120) };
    // el panel se recoge en una gota; la pantalla nueva entra justo cuando la gota aterriza (no despues)
    w.classList.remove("shown"); await App.morph.wilt(p, from, 240); w.classList.remove("in"); p.style.opacity = 0;
    await App.morph.fly(from, to, { size: 54, endSize: 120, ms: 480, onLand: go }); go();
    w.classList.remove("open"); p.style.opacity = ""; p.getAnimations().forEach((x) => x.cancel()); if (fromOrb()) fromOrb().style.visibility = "";
    const L = document.getElementById("morph"); if (L && L.firstChild) L.firstChild.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(2.2)" }], { duration: 420, easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards" }).finished.then(App.morph.clean, App.morph.clean); else App.morph.clean();
  }
  const fromOrb = () => (from && from.isConnected ? from : null);
  async function openJv(fromEl) {
    if (open) return; open = true; from = fromEl && fromEl.isConnected ? fromEl : $$(".orb[data-orb]").find((o) => o.offsetParent) || null;
    if (from) from.classList.add("fast");
    renderCmds(); $("#jvlog").innerHTML = turns.length ? $("#jvlog").innerHTML : ""; if (!turns.length) { add("a", `${App.say("Acá estoy. Preguntame lo que quieras o pedime algo.", "Aquí estoy. Pregúntame lo que quieras o pídeme algo.")}`); }
    renderChips();
    const pr = panel().getBoundingClientRect(); App.aura.mood("focus", { x: innerWidth / 2, y: Math.min(innerHeight * 0.35, 260) });
    await App.morph.open(from, wrap(), panel());
    $("#jvbox").focus(); init(); void pr;
  }
  function renderChips() { $("#jvchips").innerHTML = App.config.jarvis.chips.map((c) => `<button type="button" data-chip>${esc(c)}</button>`).join(""); }
  async function close() {
    if (!open) return; open = false; try { speechSynthesis.cancel(); } catch (e) { /* sin voz */ } if (ctl) ctl.abort(); if (rec) try { rec.stop(); } catch (e) { /* ya detenido */ }
    App.aura.mood(null); panel().classList.remove("listening");
    await App.morph.close(from, wrap(), panel()); if (from) from.classList.remove("fast");
  }
  App.jarvis = { mount, open: openJv, close, toggle: () => (open ? close() : openJv(null)), isOpen: () => open, brief, tools };
})();
