/* Aura · selectores. Todo lo que se calcula a partir de App.S (sin tocar el DOM). Nombres y reglas iguales a las del portal. */
(function () {
  "use strict";
  const App = window.App, S = App.S, UI = App.ui, { n0, pad, MONTHS, plural } = App;
  const sel = (App.sel = {});

  const DAY = 864e5;
  const local = (ms) => new Date(ms + App.config.tz * 3600 * 1000); // hora local del espacio (UTC + tz)
  const dayKeyL = (ms) => { const l = local(ms); return `${l.getUTCFullYear()}-${pad(l.getUTCMonth() + 1)}-${pad(l.getUTCDate())}`; };
  const showDateL = (ms) => { const l = local(ms); return `${l.getUTCDate()} ${MONTHS[l.getUTCMonth()]}`; };
  const showDateTime = (ms) => { const l = local(ms); return `${l.getUTCDate()} ${MONTHS[l.getUTCMonth()]} ${pad(l.getUTCHours())}:${pad(l.getUTCMinutes())}`; };
  Object.assign(sel, { DAY, local, dayKeyL, showDateL, showDateTime });

  // ---------- cuentas y videos ----------
  sel.brand = (id) => S.brands.find((b) => b.id === (id || UI.brandId)) || S.brands[0] || { id: "", name: "", color: "#0f6b6c" };
  sel.brandOf = (v) => S.brands.find((b) => b.id === v.brand);
  sel.setBrand = (id) => { UI.brandId = id; App.store.set("brand", id); App.emit("brand"); };
  sel.bv = (id) => S.videos.filter((v) => v.brand === (id || UI.brandId));
  sel.live = (v) => !v.published;
  sel.isPending = (v) => !v.demo && (!v.status || v.status === "pending" || v.status === "maybe");
  sel.pending = (id) => sel.bv(id).filter((v) => sel.live(v) && sel.isPending(v));
  sel.scheduled = (id) => sel.bv(id).filter((v) => sel.live(v) && v.status === "approved");
  sel.queued = (id) => sel.scheduled(id).filter((v) => !v.inMetricool);
  sel.rejected = (id) => sel.bv(id).filter((v) => sel.live(v) && v.status === "rejected");
  sel.toRemove = (id) => sel.rejected(id).filter((v) => v.inMetricool);
  sel.allPending = () => S.videos.filter((v) => sel.live(v) && sel.isPending(v));
  sel.label = (v) => `${v.pieceName || v.piece} · v${v.version}`;
  sel.video = (id) => S.videos.find((v) => v.id === id) || null;
  sel.groupByPiece = (list) => {
    const m = new Map();
    list.forEach((v) => { const k = v.brand + "|" + v.piece; if (!m.has(k)) m.set(k, []); m.get(k).push(v); });
    return [...m.values()].map((vs) => ({ piece: vs[0].piece, brand: vs[0].brand, name: vs[0].pieceName || vs[0].piece, vs: vs.sort((a, b) => (a.version || 0) - (b.version || 0)), key: vs.map((x) => x.date || "9999").sort()[0], order: Math.min(...vs.map((x) => x.order || 999)) }))
      .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : a.order - b.order || a.name.localeCompare(b.name)));
  };
  sel.siblings = (v) => S.videos.filter((x) => x.brand === v.brand && x.piece === v.piece).sort((a, b) => (a.version || 0) - (b.version || 0));
  sel.src = (v) => (v && v.src ? App.adapter().assetUrl(v.src) : "");

  // ---------- agenda y contenido asegurado ----------
  sel.slotsOf = (b) => { const map = S.schedule[b.blogId] || S.schedule[b.id] || {}; return Object.entries(map).map(([k, m]) => ({ ms: Date.parse(k + ":00" + (App.config.tz < 0 ? "-" : "+") + pad(Math.abs(App.config.tz)) + ":00"), m })).filter((x) => Number.isFinite(x.ms)); };
  sel.runway = (b) => {
    const now = Date.now(), fut = sel.slotsOf(b).filter((x) => x.ms > now), days = new Set(fut.map((x) => dayKeyL(x.ms)));
    const mine = S.videos.filter((v) => v.brand === b.id && !v.published), pend = mine.filter(sel.isPending);
    return { posts: fut.length, days: days.size, last: fut.length ? Math.max(...fut.map((x) => x.ms)) : null, pend: pend.length, pendPieces: new Set(pend.map((v) => v.piece)).size, waiting: mine.filter((v) => v.status === "approved" && !v.inMetricool).length };
  };
  sel.runwayLevel = (days) => { const t = App.config.runwayTarget; return days < App.config.runwayWarn ? "bad" : days < t * 0.6 ? "warn" : "ok"; };
  // ¿que dia se queda sin contenido? (primer dia sin post despues del ultimo agendado)
  sel.runOutDay = (b) => { const r = sel.runway(b); return r.last ? App.DAYS[local(r.last + DAY).getUTCDay()] : null; };

  // ---------- notas ----------
  sel.closedNote = (n) => n.status === "fixed" || n.status === "resolved";
  sel.openNotes = (v) => S.notes.filter((n) => n.video === v.id && (n.round || 1) === (v.round || 1) && !sel.closedNote(n));
  sel.notesOf = (v) => S.notes.filter((n) => n.video === v.id).sort((a, b) => (a.t || 0) - (b.t || 0));

  // ---------- cambios sin enviar ----------
  sel.unsentNotes = () => S.notes.filter((n) => n.sent === false && !sel.closedNote(n));
  sel.unsentVideos = () => S.videos.filter((v) => v.feedbackDirty === true && (v.feedback || "").trim() && !v.published);
  sel.capGroups = () => { const m = new Map(); S.videos.filter((v) => v.wordStylesDirty === true && !v.published).forEach((v) => { const k = v.brand + "|" + v.piece; if (!m.has(k)) m.set(k, []); m.get(k).push(v); }); return [...m.values()]; };
  sel.refsUnsent = () => S.refs.filter((r) => r.sent === false);
  sel.cardsUnsent = () => S.expCards.filter((c) => c.dirty === true);
  sel.overallsUnsent = () => S.expRounds.filter((r) => r.overallDirty === true);
  sel.unsentCount = () => sel.unsentNotes().length + sel.unsentVideos().length + sel.capGroups().length + sel.refsUnsent().length + (sel.cardsUnsent().length ? 1 : 0) + sel.overallsUnsent().length;

  // ---------- Metricool: filas de reels y evolucion de la cuenta ----------
  const parseTs = (s) => { const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(String(s)); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : null; };
  sel.normRows = (rows) => (rows || []).map((r) => {
    const t = parseTs(r[0]); if (t == null) return null;
    const o = { t, content: String(r[1] || ""), url: String(r[2] || ""), views: n0(r[3]), likes: n0(r[4]), comments: n0(r[5]), reach: n0(r[6]), saved: n0(r[7]), shares: n0(r[8]) };
    o.inter = o.likes + o.comments + o.saved + o.shares; o.rate = o.reach > 0 ? o.inter / o.reach : 0; return o;
  }).filter(Boolean).sort((a, b) => b.t - a.t);
  const parseDay = (s) => { const m = /^(\d{4})(\d{2})(\d{2})$/.exec(String(s)); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null; };
  sel.normEvo = (rows) => (rows || []).map((r) => { const t = parseDay(r[6]); return t == null ? null : { t, followers: n0(r[0]), gained: n0(r[1]), lost: n0(r[2]), views: n0(r[3]), inter: n0(r[4]), reach: n0(r[5]) }; }).filter(Boolean).sort((a, b) => a.t - b.t);
  const sumBy = (rs, k) => rs.reduce((a, r) => a + r[k], 0);
  const delta = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);
  sel.sumBy = sumBy; sel.delta = delta;
  sel.rowsOf = (b) => { const L = S.live[b.id], snap = S.metrics[b.blogId] || S.metrics[b.id]; return sel.normRows((L && L.rows) || (snap && snap.rows) || []); };
  sel.stampOf = (b) => { const L = S.live[b.id], snap = S.metrics[b.blogId] || S.metrics[b.id]; return L && L.at ? L.at : snap && snap.updated ? Date.parse(snap.updated) || 0 : 0; };
  sel.evoOf = (b) => {
    const L = S.liveEvo[b.id], snap = S.evolution[b.blogId] || S.evolution[b.id], rows = sel.normEvo((L && L.rows) || (snap && snap.rows) || []);
    if (!rows.length) return null;
    const last = rows[rows.length - 1].t, cur = rows.filter((r) => r.t > last - 7 * DAY), prev = rows.filter((r) => r.t <= last - 7 * DAY && r.t > last - 14 * DAY);
    const gained = sumBy(cur, "gained"), lost = sumBy(cur, "lost"), byDay = {}; rows.forEach((r) => { byDay[r.t] = r; });
    const seriesOf = (k, n) => Array.from({ length: n }, (_, i) => (byDay[last - (n - 1 - i) * DAY] || {})[k] || 0);
    return { until: last, rows, views: sumBy(cur, "views"), inter: sumBy(cur, "inter"), reach: sumBy(cur, "reach"), dViews: delta(sumBy(cur, "views"), sumBy(prev, "views")), dInter: delta(sumBy(cur, "inter"), sumBy(prev, "inter")), dReach: delta(sumBy(cur, "reach"), sumBy(prev, "reach")),
      gained, lost, net: gained - lost, followers: rows[rows.length - 1].followers, series: seriesOf("views", 14), series30: seriesOf("views", 30), fseries: seriesOf("followers", 30), iseries: seriesOf("inter", 30),
      stamp: L && L.at ? L.at : snap && snap.updated ? Date.parse(snap.updated) || 0 : 0 };
  };
  // reels de una cuenta enlazados con su pieza (por el horario agendado)
  sel.enrich = (b, rows) => {
    const slots = sel.slotsOf(b);
    return rows.map((r) => { let best = null, bd = 25 * 60000 + 1; for (const x of slots) { const d = Math.abs(x.ms - r.t); if (d < bd) { bd = d; best = x.m; } } const o = { ...r, m: best }; if (best) o.hook = best.hook || (S.videos.find((x) => x.id === `${b.id}_${best.piece}_v${best.v}`) || {}).hook || ""; return o; });
  };
  sel.reelName = (r) => (r.m ? `${r.m.name || r.m.piece} · v${r.m.v}` : (r.content.split("\n")[0] || "").slice(0, 44) || showDateL(r.t));
  sel.igOf = (b) => {
    const rows = sel.rowsOf(b), now = Date.now(), d7 = now - 7 * DAY, d14 = now - 14 * DAY, d30 = now - 30 * DAY, cur = rows.filter((r) => r.t >= d7), prev = rows.filter((r) => r.t < d7 && r.t >= d14), byDay = {};
    rows.forEach((r) => { const k = dayKeyL(r.t); byDay[k] = (byDay[k] || 0) + r.views; });
    const series = Array.from({ length: 14 }, (_, i) => byDay[dayKeyL(now - (13 - i) * DAY)] || 0);
    const top = rows.filter((r) => r.t >= d30).sort((a, c) => c.views - a.views)[0] || null, L = S.live[b.id];
    return { n: rows.length, rows, posts7: cur.length, views: sumBy(cur, "views"), reach: sumBy(cur, "reach"), inter: sumBy(cur, "inter"), dViews: delta(sumBy(cur, "views"), sumBy(prev, "views")), series, top, stamp: sel.stampOf(b), error: L && L.error, loading: L && L.loading };
  };

  // ---------- pendientes de la persona ----------
  const URGENCY = { now: ["AHORA", 0], today: ["HOY", 1], week: ["ESTA SEMANA", 2] };
  sel.URGENCY = URGENCY;
  sel.todoItems = () => {
    const auto = [];
    S.brands.forEach((b) => {
      const r = sel.runway(b);
      if (r.pend) auto.push({ id: "aprobar_" + b.id, urgency: "today", title: `${r.pend} ${plural(r.pend, "video", "videos")} por aprobar en ${b.name}`, detail: `Son ${r.pendPieces} ${plural(r.pendPieces, "pieza", "piezas")} con sus versiones. Aprobar es dejarlas agendadas.`, link: "#aprobar", brand: b.id, auto: true });
      if (r.days < App.config.runwayWarn) auto.push({ id: "runway_" + b.id, urgency: "now", title: `Quedan ${r.days} ${plural(r.days, "día", "días")} de contenido en ${b.name}`, detail: "Hay que producir o aprobar más piezas.", link: "#crear", brand: b.id, auto: true });
    });
    const mine = (S.homeTodo || []).filter((t) => t && t.id && !S.homeDone[t.id]);
    return [...auto, ...mine].sort((a, b) => (URGENCY[a.urgency] || URGENCY.week)[1] - (URGENCY[b.urgency] || URGENCY.week)[1]);
  };

  // ---------- pedidos ----------
  sel.newRequests = (id) => S.requests.filter((r) => r.kind === "new_video" && (!id || r.brand === id)).sort((a, c) => (c.at || "").localeCompare(a.at || ""));
  sel.activeRequests = () => S.requests.filter((r) => r.kind === "new_video" && !["listo", "cancelado"].includes(r.status));
  sel.studioActive = () => S.studioRequests.filter((r) => !["listo", "error", "cancelado"].includes(r.status));
  sel.approvedStyles = () => S.expStyles.filter((s) => s.status === "aprobado");

  // ---------- la frase del dia ----------
  sel.phrase = () => {
    const brands = S.brands, rs = brands.map((b) => ({ b, r: sel.runway(b) }));
    if (!brands.length) return { html: `Todavía no hay cuentas. <em>${App.say("Conectá", "Conecta")} la primera</em> en Ajustes.`, cta: "ajustes" };
    const worst = rs.slice().sort((a, c) => a.r.days - c.r.days)[0], total = rs.reduce((a, x) => a + x.r.pend, 0), t = App.config.runwayTarget;
    const short = (x) => x.b.name.replace(/^[A-Z]+\s*/, "") || x.b.name;
    const need = worst ? Math.max(0, Math.min(worst.r.pend, t - worst.r.days)) : 0;
    if (worst && worst.r.days < App.config.runwayWarn && worst.r.pend) {
      const when = sel.runOutDay(worst.b);
      return { html: `${App.esc(short(worst))} ${when ? `se queda sin contenido el <em>${when}</em>` : "no tiene contenido agendado"}. Con <span class="mark">${need} ${plural(need, "aprobado", "aprobados")} hoy</span> llegás a ${Math.min(t, worst.r.days + need)} días.`.replace("llegás", App.say("llegás", "llegas")), cta: "aprobar" };
    }
    if (total) return { html: `Tenés <span class="mark">${total} ${plural(total, "video", "videos")}</span> esperando tu decisión. <em>Son ${new Set(S.videos.filter((v) => sel.live(v) && sel.isPending(v)).map((v) => v.brand + v.piece)).size} ${plural(new Set(S.videos.filter((v) => sel.live(v) && sel.isPending(v)).map((v) => v.brand + v.piece)).size, "pieza", "piezas")}</em> y unos minutos.`.replace("Tenés", App.say("Tenés", "Tienes")), cta: "aprobar" };
    if (worst && worst.r.days < t) return { html: `Todo aprobado. ${App.esc(short(worst))} tiene contenido para <span class="mark">${worst.r.days} ${plural(worst.r.days, "día", "días")}</span>: <em>${App.say("pedí", "pide")} un video nuevo</em> para llegar a ${t}.`, cta: "crear" };
    return { html: `Todo al día. <em>Contenido asegurado</em> para <span class="mark">${worst ? worst.r.days : 0} días</span> en todas las cuentas.`, cta: "crear" };
  };
})();
