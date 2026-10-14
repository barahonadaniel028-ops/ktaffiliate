/* Aura · estado, eventos y escritura. Las vistas leen App.S y llaman a App.data.*; nunca tocan window.claude. */
(function () {
  "use strict";
  const App = window.App, { uid } = App;
  const S = (App.S = {
    brands: App.config.brands.slice(), videos: [], notes: [], requests: [], refs: [], expStyles: [], expRounds: [], expCards: [], libraryItems: [],
    studioProjects: [], studioVersions: [], studioRequests: [], studioFeedback: [], studioTranscripts: [],
    metrics: {}, evolution: {}, schedule: {}, rounds: {}, homeTodo: [], homeDone: {}, trophyDoc: null, system: null,
    live: {}, liveEvo: {}, ready: {}, mode: "demo", claudeState: "off", userId: null, canWrite: true,
  });
  App.loading = () => !S.ready.videos;
  const UI = (App.ui = { brandId: App.store.get("brand", null), scope: App.store.get("scope", "total") });

  // ---------- eventos ----------
  const subs = new Set();
  App.on = (fn) => { subs.add(fn); return () => subs.delete(fn); };
  let queued = null;
  App.emit = (kind) => { (queued = queued || new Set()).add(kind); if (App._flush) return; App._flush = requestAnimationFrame(() => { const ks = queued; queued = null; App._flush = 0; subs.forEach((fn) => { try { fn(ks); } catch (e) { console.error(e); } }); }); };

  // ---------- adaptador activo ----------
  App.adapters = {};
  let A = null;
  App.adapter = () => A;

  const toArr = (docs) => docs.map((d) => ({ id: d.id, ...d.data() }));
  const MAP = {
    brands: (docs) => {
      const extra = toArr(docs), base = App.config.brands;
      S.brands = base.map((b) => ({ ...b, ...(extra.find((x) => x.id === b.id) || {}) })).concat(extra.filter((x) => !base.some((b) => b.id === x.id))).sort((a, b) => (a.order || 99) - (b.order || 99));
      if (!S.brands.some((b) => b.id === UI.brandId)) UI.brandId = S.brands[0] && S.brands[0].id;
    },
    videos: (docs) => { S.videos = toArr(docs).map((o) => { if (o.inMetricool && !o.decidedAt && !o.review) o.status = "approved"; return o; }); App.predPool = {}; },
    notes: (d) => { S.notes = toArr(d); }, requests: (d) => { S.requests = toArr(d); }, refs: (d) => { S.refs = toArr(d); },
    exp_styles: (d) => { S.expStyles = toArr(d); }, exp_rounds: (d) => { S.expRounds = toArr(d); }, exp_cards: (d) => { S.expCards = toArr(d); },
    library: (d) => { S.libraryItems = toArr(d); },
    studio_projects: (d) => { S.studioProjects = toArr(d); }, studio_versions: (d) => { S.studioVersions = toArr(d); }, studio_requests: (d) => { S.studioRequests = toArr(d); },
    studio_media_feedback: (d) => { S.studioFeedback = toArr(d); }, studio_transcripts: (d) => { S.studioTranscripts = toArr(d); },
    metrics: (d) => { S.metrics = {}; d.forEach((x) => { S.metrics[x.id] = x.data(); }); }, evolution: (d) => { S.evolution = {}; d.forEach((x) => { S.evolution[x.id] = x.data(); }); },
    schedule: (d) => { S.schedule = {}; d.forEach((x) => { S.schedule[x.id] = x.data().slots || {}; }); }, rounds: (d) => { S.rounds = {}; d.forEach((x) => { S.rounds[x.id] = x.data(); }); },
    system: (d) => { const x = d.find((y) => y.id === "status"); S.system = x ? x.data() : null; },
    home: (d) => { const t = d.find((x) => x.id === "todo"), dn = d.find((x) => x.id === "done"), tr = d.find((x) => x.id === "trophies"); S.homeTodo = (t && t.data().items) || []; S.homeDone = dn ? dn.data() : {}; S.trophyDoc = tr ? tr.data() : null; },
  };
  App.COLLECTIONS = Object.keys(MAP);
  if (!UI.brandId || !S.brands.some((b) => b.id === UI.brandId)) UI.brandId = S.brands[0] && S.brands[0].id;

  App.connect = async function (adapter) {
    A = adapter; S.mode = adapter.name;
    const ok = await adapter.connect((name, docs) => { if (MAP[name]) { MAP[name](docs); S.ready[name] = true; App.emit(name); } });
    S.connected = !!ok; S.canWrite = ok !== false;
    S.userId = await adapter.userId();
    App.refreshClaudeState();
    App.emit("connected");
    return ok;
  };
  App.refreshClaudeState = async () => { try { S.claudeState = A ? await A.canTell() : "off"; } catch (e) { S.claudeState = "off"; } App.emit("claude"); };

  // ---------- escritura ----------
  const stamp = () => new Date().toISOString();
  App.stamp = stamp;
  const D = (App.data = {});
  D.write = async (coll, id, patch) => { // actualiza; si no existe, crea
    if (!A) return false;
    try { await A.update(coll, id, patch); return true; } catch (e) { /* no existia */ }
    try { await A.set(coll, id, patch); return true; } catch (e) { return false; }
  };
  D.set = async (coll, id, body) => { if (!A) return false; try { await A.set(coll, id, body); return true; } catch (e) { return false; } };
  D.add = async (coll, body) => { if (!A) return null; try { return await A.add(coll, body); } catch (e) { return null; } };
  D.remove = async (coll, id) => { if (!A) return false; try { await A.remove(coll, id); return true; } catch (e) { return false; } };
  // cambio local inmediato + guardado (si falla avisa)
  D.patchVideo = async (v, fields, quiet) => {
    Object.assign(v, fields); if (!quiet) App.emit("videos");
    const ok = await D.write("videos", v.id, fields);
    if (!ok) App.toast("No se guardó. Revisa la conexión y prueba de nuevo.");
    return ok;
  };

  // ---------- aviso a Claude ----------
  let tellTimer = 0, tellPending = [];
  D.tell = async (text) => { if (!A) return false; try { return await A.tell(text); } catch (e) { return false; } };
  D.tellSoon = (line) => { tellPending.push(line); clearTimeout(tellTimer); tellTimer = setTimeout(() => { const msg = tellPending.splice(0).join("\n"); D.tell(msg); }, 3500); };

  // ---------- bitacora de diagnostico (silenciosa) ----------
  D.diag = (step, info) => { if (!A) return; D.set("diag", String(Date.now()) + "_" + uid("d").slice(-3), { step, info: info || {}, at: stamp(), ua: String(navigator.userAgent).slice(0, 120) }); };
})();
