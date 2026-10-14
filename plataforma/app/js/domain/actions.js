/* Aura · acciones. Lo que escribe en la base y avisa a Claude. Mismas escrituras que el portal actual (ver CONTRATO-DE-DATOS.md). */
(function () {
  "use strict";
  const App = window.App, S = App.S, D = App.data, sel = App.sel, { toast, esc, uid } = App;
  const A = (App.act = {});

  // ---------- aprobar = agendar ----------
  const vDayLabel = (v) => (v.scheduled || "").split(" ").slice(0, 2).join(" ");
  const vTime = (v) => (v.scheduled || "").split(" ")[2] || "";
  const vDay = (v) => (v.date || "").slice(0, 10);
  function groupOf(v) {
    const vs = sel.bv(v.brand).filter((x) => sel.live(x) && x.piece === v.piece).sort((a, b) => (a.version || 0) - (b.version || 0)), n = (s) => vs.filter((x) => (x.status || "pending") === s).length;
    const alive = vs.filter((x) => x.status !== "rejected"), days = [...new Set(alive.map(vDayLabel).filter(Boolean))];
    return { vs, total: vs.length, approved: n("approved"), rejected: n("rejected"), open: n("pending") + n("maybe"), day: days.join(" y "), times: alive.map(vTime).filter(Boolean) };
  }
  A.groupLine = (v) => {
    const g = groupOf(v), when = g.day ? `salen el ${g.day}${g.times.length ? " (" + g.times.join(", ") + ")" : ""}` : "la fecha la elige Claude al agendar";
    return `Es 1 de ${g.total} versiones de "${v.pieceName || v.piece}" y ${when}. ${g.approved} aprobadas, ${g.open} por decidir${g.rejected ? ", " + g.rejected + " rechazadas" : ""}.`;
  };
  const queueTimers = {};
  function queueSchedule(bId) {
    clearTimeout(queueTimers[bId]);
    queueTimers[bId] = setTimeout(async () => {
      const b = S.brands.find((x) => x.id === bId), mine = S.videos.filter((v) => v.brand === bId && sel.live(v) && !v.demo);
      const add = mine.filter((v) => v.status === "approved" && !v.inMetricool), del = mine.filter((v) => v.status === "rejected" && v.inMetricool), groups = new Map();
      add.forEach((v) => { if (!groups.has(v.piece)) groups.set(v.piece, { piece: v.piece, name: v.pieceName || v.piece, day: vDayLabel(v), ids: [], replace: false }); const g = groups.get(v.piece); g.ids.push(v.id); if (v.replaces) g.replace = true; });
      const body = { kind: "schedule", brand: bId, blogId: b ? b.blogId : "", at: App.stamp(), by: S.userId, state: add.length || del.length ? "pendiente" : "vacio", schedule: [...groups.values()], remove: del.map((v) => ({ id: v.id, piece: v.piece, version: v.version, scheduled: v.scheduled || "" })) };
      if (!(await D.set("requests", "schedule_" + bId, body))) toast("No se pudo avisar a Claude del agendado. Prueba de nuevo.");
    }, 700);
  }
  A.setStatus = (v, st, o) => {
    o = o || {}; const prev = v.status || "pending";
    if (v.demo) { D.patchVideo(v, { status: st, decidedAt: App.stamp() }); toast(`${sel.label(v)} es un ejemplo: no se agenda ni se publica.`); return; }
    D.patchVideo(v, { status: st, decidedAt: App.stamp() }, o.quiet); queueSchedule(v.brand);
    D.tellSoon(`${st === "approved" ? "APROBÉ" : st === "rejected" ? "RECHACÉ" : "CAMBIÉ"} ${sel.label(v)} (${v.id}) en ${v.brand}. Lee requests/schedule_${v.brand} y agenda o saca del calendario.`);
    if (o.silent) return;
    const what = st === "approved" ? (v.inMetricool ? "Aprobado, sigue agendado." : v.replaces ? "Aprobado. Claude cambia el video de su post por esta versión." : "Aprobado. Claude lo agenda con sus otras versiones.")
      : st === "rejected" ? (v.inMetricool ? "Rechazado. Claude lo saca del calendario." : "Rechazado.") : st === "maybe" ? "Quedó en duda." : "Volvió a Por aprobar.";
    toast(`${sel.label(v)}: ${what}`, () => { D.patchVideo(v, { status: prev, decidedAt: App.stamp() }); queueSchedule(v.brand); });
  };
  // varias versiones de golpe (una pieza, o una seleccion): un solo aviso y un solo "Deshacer"
  A.setMany = (list, st) => {
    const prev = list.map((v) => [v, v.status || "pending"]);
    list.forEach((v) => A.setStatus(v, st, { silent: true, quiet: true })); App.emit("videos");
    const names = [...new Set(list.map((v) => v.pieceName || v.piece))];
    toast(`${list.length} ${App.plural(list.length, "versión", "versiones")} ${st === "approved" ? "aprobadas" : st === "rejected" ? "rechazadas" : "movidas"}${names.length === 1 ? " de " + names[0] : ""}.`, () => { prev.forEach(([v, p]) => D.patchVideo(v, { status: p, decidedAt: App.stamp() }, true)); [...new Set(list.map((v) => v.brand))].forEach(queueSchedule); App.emit("videos"); });
  };

  // ---------- notas por cuadro y feedback ----------
  A.addNote = async (v, t, text, tags) => {
    const body = { video: v.id, brand: v.brand, piece: v.piece, round: v.round || 1, t: Math.round(t * 100) / 100, tc: App.mmss(t), text: String(text).trim().slice(0, 600), tags: tags || [], status: "open", sent: false, by: S.userId, created: App.stamp(), scope: "video" };
    const id = await D.add("notes", body); if (!id) toast("La nota no se guardó. Prueba de nuevo."); else toast("Nota guardada. Se envía con Enviar cambios.");
    return id;
  };
  A.patchNote = (n, f) => D.write("notes", n.id, f);
  A.removeNote = (n) => D.remove("notes", n.id);
  A.createFeedback = async (ctx, text, tags) => {
    const body = { scope: ctx.scope, brand: ctx.brand || "", text: String(text).trim().slice(0, 2000), tags: tags || [], status: "open", sent: false, by: S.userId, created: App.stamp() };
    if (ctx.piece) body.piece = ctx.piece; if (ctx.ids) body.ids = ctx.ids; if (ctx.title) body.title = ctx.title;
    return D.add("notes", body);
  };
  A.setFeedback = (v, text, tags) => D.patchVideo(v, { feedback: text, feedbackDirty: true, tags: tags || v.tags || [] }, true);
  A.setWordStyles = (v, ws) => D.patchVideo(v, { wordStyles: ws, wordStylesDirty: true }, true);

  // ---------- enviar cambios ----------
  const clip = (s, n) => (String(s).length > n ? String(s).slice(0, n) + "…" : String(s));
  const titleOf = (n) => { if (n.video) return `${(sel.video(n.video) ? sel.label(sel.video(n.video)) : n.video)}${n.tc ? " a los " + n.tc : ""}`; if (n.scope === "group") return n.title || `Pieza ${n.piece || ""}`; if (n.scope === "selection") return n.title || `${(n.ids || []).length} videos elegidos`; if (n.scope === "brand") return `Toda la cuenta ${(sel.brand(n.brand) || {}).name || n.brand}`; return "Todo el espacio"; };
  const scopeOf = (n) => ({ video: "VIDEO", group: "PIEZA", selection: "ELEGIDOS", brand: "CUENTA", general: "GENERAL", style: "ESTILO" }[n.video ? "video" : n.scope || "general"] || "NOTA");
  A.noteTitle = titleOf; A.noteScope = scopeOf;
  A.pendingItems = () => {
    const items = [];
    sel.unsentNotes().forEach((n) => items.push({ kind: "Nota", label: `${titleOf(n)}: ${clip(n.text, 70)}`, undo: () => D.remove("notes", n.id) }));
    sel.unsentVideos().forEach((v) => items.push({ kind: "Video", label: `${sel.label(v)}: ${clip(v.feedback, 70)}`, undo: () => D.write("videos", v.id, { feedback: v.feedbackSent || "", feedbackDirty: false }) }));
    sel.capGroups().forEach((g) => items.push({ kind: "Subtítulos", label: `Cambios de palabras en ${sel.label(g[0])}`, undo: () => Promise.all(g.map((v) => D.write("videos", v.id, { wordStyles: v.wordStylesSent || {}, wordStylesDirty: false }))) }));
    sel.refsUnsent().forEach((r) => items.push({ kind: "Referencia", label: r.assetId ? `Video ${r.name || ""}`.trim() : clip(r.url, 60), undo: async () => { await D.remove("refs", r.id); if (r.assetId) App.adapter().deleteAsset(r.assetId); } }));
    const xc = sel.cardsUnsent(); if (xc.length) items.push({ kind: "Ronda", label: `${xc.length} ${App.plural(xc.length, "calificación", "calificaciones")} de la ronda de estilo`, undo: () => Promise.all(xc.map((c) => D.write("exp_cards", c.id, { verdict: c.sentVerdict || "", note: c.sentNote || "", dirty: false }))) });
    sel.overallsUnsent().forEach((r) => items.push({ kind: "Comentario", label: `Comentario general: ${clip(r.overall, 60)}`, undo: () => D.write("exp_rounds", r.id, { overall: r.sentOverall || "", overallDirty: false }) }));
    return items;
  };
  A.sendAll = async () => {
    const ns = sel.unsentNotes(), vs = sel.unsentVideos(), cg = sel.capGroups(), rs = sel.refsUnsent(), xc = sel.cardsUnsent(), xo = sel.overallsUnsent(), count = ns.length + vs.length + cg.length + rs.length + (xc.length ? 1 : 0) + xo.length;
    if (!count) return false;
    const tagsOf = (t) => ((t || []).length ? " [" + t.join(", ") + "]" : ""), VERD = { keep: "ME GUSTA", maybe: "QUIZÁS", drop: "NO" };
    const lines = [...ns.map((n) => `[${scopeOf(n)}] ${titleOf(n)}: "${clip(n.text, 400)}"${tagsOf(n.tags)} (notes/${n.id})`), ...vs.map((v) => `[VIDEO] ${sel.label(v)} (${v.id}): "${clip((v.feedback || "").trim(), 400)}"${tagsOf(v.tags)}`),
      ...rs.map((r) => `[REFERENCIA] ${r.assetId ? "video subido: " + (r.name || r.assetId) : r.url} (refs/${r.id})${r.note ? ': "' + clip(r.note, 400) + '"' : ""}`),
      ...(xc.length ? [`[RONDA] ${xc.length} calificaciones: ` + xc.map((c) => `${c.label || c.id}: ${VERD[c.verdict] || "sin calificar"}${c.note ? ' ("' + clip(c.note, 200) + '")' : ""}`).join("; ")] : []),
      ...xo.map((r) => `[RONDA] Comentario general: "${clip(r.overall, 400)}"`), ...cg.map((g) => `[SUBTÍTULOS] ${sel.label(g[0])}: cambios de palabras (${g.length} versiones)`)];
    const at = App.stamp(), reqId = "changes_" + Date.now();
    const ok = await D.set("requests", reqId, { kind: "changes_batch", at, by: S.userId, status: "pendiente", count, notes: ns.map((n) => n.id), videos: vs.map((v) => ({ id: v.id, brand: v.brand, feedback: (v.feedback || "").trim(), tags: v.tags || [] })), refs: rs.map((r) => r.id), roundCards: xc.map((c) => ({ id: c.id, label: c.label || "", verdict: c.verdict || "", note: c.note || "", styleId: c.styleId || "" })), captionEdits: cg.map((g) => ({ brand: g[0].brand, piece: g[0].piece, ids: g.map((x) => x.id), wordStyles: g[0].wordStyles || {} })) });
    if (!ok) { toast("No se pudo enviar. Prueba de nuevo."); return false; }
    await Promise.all([...ns.map((n) => D.write("notes", n.id, { sent: true, sentAt: at })), ...vs.map((v) => D.write("videos", v.id, { feedbackDirty: false, feedbackSent: (v.feedback || "").trim() })), ...cg.flat().map((v) => D.write("videos", v.id, { wordStylesDirty: false, wordStylesSent: v.wordStyles || {} })),
      ...rs.map((r) => D.write("refs", r.id, { sent: true, status: "enviada", sentAt: at })), ...xc.map((c) => D.write("exp_cards", c.id, { dirty: false, sentVerdict: c.verdict || "", sentNote: c.note || "" })), ...xo.map((r) => D.write("exp_rounds", r.id, { overallDirty: false, sentOverall: r.overall || "" }))]);
    let msg = `ENVIÉ ${count} ${count === 1 ? "CAMBIO" : "CAMBIOS"} JUNTOS (requests/${reqId}). Aplícalos todos sin que te lo repita; en cada nota pon status fixed y una respuesta corta, y sube los videos corregidos.\n` + lines.map((l, i) => `${i + 1}. ${l}`).join("\n");
    if (msg.length > 3600) msg = msg.slice(0, 3600) + "\n… (el resto está en requests/" + reqId + ")";
    const told = await D.tell(msg);
    toast(told ? `Listo. Claude recibió los ${count} cambios juntos.` : "Guardado. Claude los lee en cuanto haya una sesión abierta.");
    return true;
  };

  // ---------- Crear: pedidos y archivos ----------
  A.MAX_FILE = 19 * 1048576;
  A.uploadError = (e) => (e && e.code === "too_large" ? "El archivo pasa de 19 MB. Súbelo a un servicio y pega el link." : e && /not_granted|denied/.test(String(e.message || e.code)) ? "Esta página no tiene permiso para guardar archivos." : "No se pudo subir. Prueba de nuevo.");
  A.upload = async (file, onProgress) => {
    if (file.size > A.MAX_FILE) throw Object.assign(new Error("too_large"), { code: "too_large" });
    file.onprogress = onProgress; return App.adapter().upload(file);
  };
  A.createRequest = async (r) => {
    const b = sel.brand(r.brand), id = "new_" + Date.now();
    const body = Object.assign({ kind: "new_video", brand: b.id, blogId: b.blogId, at: App.stamp(), by: S.userId, status: "pedido", steps: [] }, r);
    if (!(await D.set("requests", id, body))) return null;
    const told = await D.tell(`PEDIDO DE VIDEO NUEVO de ${App.config.owner} para ${b.name}: ${r.topic || (r.hooks || []).join(" / ") || "con archivos adjuntos"} (requests/${id})${(r.assets || []).length ? `, con ${(r.assets || []).length} archivos subidos (assetId en requests/${id}.assets)` : ""}. Empieza a producirlo sin que te lo repita.`);
    return { id, told };
  };
  A.cancelRequest = (r) => D.write("requests", r.id, { status: "cancelado" });
  A.addRefLink = (url, note) => D.add("refs", { kind: "link", url, assetId: "", name: "", note: note || "", status: "nueva", sent: false, by: S.userId, created: App.stamp() });
  A.addRefFile = (file, note) => D.add("refs", { kind: "file", url: "", assetId: file.id, name: file.name, note: note || "", status: "nueva", sent: false, by: S.userId, created: App.stamp() });

  // ---------- Laboratorio ----------
  A.setVerdict = (c, verdict) => D.write("exp_cards", c.id, { verdict, dirty: true });
  A.setCardNote = (c, note) => D.write("exp_cards", c.id, { note, dirty: true });
  A.setOverall = (r, overall) => D.write("exp_rounds", r.id, { overall, overallDirty: true });
  A.decideStyle = async (s, status) => { const ok = await D.write("exp_styles", s.id, { status, decidedAt: App.stamp() }); if (!ok) toast("No se guardó. Prueba de nuevo."); else if (status === "aprobado") toast(`«${s.name}» ya está en la Biblioteca.`); return ok; };

  // ---------- pendientes y logros ----------
  A.markTodoDone = (id) => D.write("home", "done", { [id]: App.stamp() });
  A.saveSeen = (seen) => D.write("home", "trophies", { seen, updated: App.stamp() });

  // ---------- Metricool ----------
  const iso = (d) => d.toISOString().slice(0, 19) + "+00:00";
  const METRICS = ["IGRE02", "IGRE06", "IGRE23", "IGRE10", "IGRE07", "IGRE11", "IGRE12", "IGRE21", "IGRE27"], EVO_METRICS = ["IGEV01", "IGEV43", "IGEV44", "IGEV05", "IGEV38", "IGEV06"], EVO_DAYS = 35;
  const errMsg = (e) => { const code = e && e.code; return code === "needs_reauth" ? "Metricool pide volver a iniciar sesión en tu cuenta de Claude." : code === "server_not_connected" ? "Metricool no está conectado en tu cuenta de Claude." : code === "consent_required" || code === "not_granted" ? "Permite a esta página usar Metricool y toca Actualizar. Mientras tanto se muestran los últimos datos guardados." : e && e.retryable ? "Metricool no respondió. Toca Actualizar en un momento." : "No se pudieron traer los datos en vivo. Se muestran los últimos guardados."; };
  A.loadMetrics = async (b) => {
    S.live[b.id] = { ...(S.live[b.id] || {}), loading: true, error: "" }; App.emit("metrics");
    try {
      const res = await App.adapter().metrics(b, { from: iso(new Date(Date.now() - 150 * 864e5)), to: iso(new Date(Date.now() + 864e5)), metrics: METRICS }), pl = res.payload;
      const rows = (Array.isArray(pl) ? pl : (pl && pl.rows) || []).map((r) => (/^https?:/.test(String((r && r[1]) || "")) ? [r[0], "", ...r.slice(1)] : r));
      S.live[b.id] = { rows, at: res.at, loading: false, error: "" };
      if (rows.length > 20 && App.adapter().canWrite()) D.set("metrics", b.blogId, { updated: new Date(res.at).toISOString(), rows });
    } catch (e) { S.live[b.id] = { ...(S.live[b.id] || {}), loading: false, error: errMsg(e) }; }
    App.emit("metrics");
  };
  const evoLoading = new Set();
  A.loadEvolution = async (b) => {
    if (evoLoading.has(b.id)) return; evoLoading.add(b.id);
    try {
      const now = Date.now(), res = await App.adapter().metrics(b, { from: iso(new Date(now - EVO_DAYS * 864e5)), to: iso(new Date(now + 864e5)), metrics: EVO_METRICS, evo: true }), pl = res.payload, rows = Array.isArray(pl) ? pl : (pl && pl.rows) || [];
      S.liveEvo[b.id] = { rows, at: res.at };
      if (rows.length > 5 && App.adapter().canWrite()) D.set("evolution", b.blogId, { updated: new Date(res.at).toISOString(), metrics: EVO_METRICS, rows });
    } catch (e) { /* se muestran los ultimos datos guardados */ }
    evoLoading.delete(b.id); App.emit("metrics");
  };
  A.refreshAllMetrics = () => S.brands.forEach((b) => { A.loadMetrics(b); A.loadEvolution(b); });
  A.maybeLoadMetrics = () => { if (!App.adapter() || !App.adapter().hasMetrics()) return; S.brands.forEach((b) => { if (!S.live[b.id]) A.loadMetrics(b); if (!S.liveEvo[b.id]) A.loadEvolution(b); }); };
})();
