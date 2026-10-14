/* Aura · adaptadores. La app habla con UNA interfaz; detras hay Claude real (capacidades del artefacto) o una memoria de demostracion.
   Interfaz: connect(emit) update set add remove upload(file) assetUrl(id) deleteAsset(id) metrics(brand, q) sample() canTell() tell(text) userId() download(name, data) */
(function () {
  "use strict";
  const App = window.App;
  const withTimeout = (pr, ms) => Promise.race([Promise.resolve(pr).catch(() => null), new Promise((r) => setTimeout(() => r(null), ms))]);
  const assetUrl = (v) => (!v ? "" : v === "demo-video" ? (window.AuraDemo && window.AuraDemo.videoUrl) || "" : /^[0-9a-f]{32}$/.test(v) ? "/_blob/" + v : v);

  // ---------- Claude real ----------
  App.adapters.claude = function () {
    let db = null, user = null, mcp = null, comments = null, assets = null, sampleP = null, dl = null, uid = null;
    const cap = (name, ms) => withTimeout(window.claude && window.claude.use(name), ms || 10000);
    return {
      name: "claude",
      async connect(emit) {
        db = await cap("db", 10000); if (!db) return false;
        App.COLLECTIONS.concat([]).forEach((name) => { try { db.collection(name).onSnapshot((s) => emit(name, s.docs), () => {}); } catch (e) { /* esa coleccion no existe todavia */ } });
        cap("user", 8000).then(async (u) => { user = u; try { uid = u ? await u.id() : null; App.S.userId = uid; } catch (e) { /* anonimo */ } });
        cap("mcp", 12000).then((m) => { mcp = m; App.emit("mcp"); });
        cap("comments", 12000).then((c) => { comments = c; App.refreshClaudeState(); setInterval(App.refreshClaudeState, 120000); });
        return true;
      },
      async userId() { return uid; },
      update: (c, id, p) => db.collection(c).doc(id).update(p),
      set: (c, id, b) => db.collection(c).doc(id).set(b),
      async add(c, b) { const r = await db.collection(c).add(b); return r && r.id; },
      remove: (c, id) => db.collection(c).doc(id).delete(),
      async upload(file) { assets = assets || (await cap("assets", 8000)); if (!assets) throw new Error("not_granted"); const r = await assets.upload(file); return { id: r.id, name: file.name, size: file.size, url: assetUrl(r.id) }; },
      async deleteAsset(id) { assets = assets || (await cap("assets", 8000)); if (assets) try { await assets.delete(id); } catch (e) { /* queda en el almacen */ } },
      assetUrl,
      hasMetrics: () => !!mcp,
      async metrics(brand, q) {
        if (!mcp) throw Object.assign(new Error("server_not_connected"), { code: "server_not_connected" });
        const res = await mcp.callTool("metricool", "getAnalyticsDataByMetrics", { brandId: brand.blogId, from: q.from, to: q.to, metrics: q.metrics });
        return { payload: res.payload, at: (res.cache && res.cache.storedAt) || Date.now() };
      },
      async sample() { sampleP = sampleP || (await cap("sample", 10000)); return sampleP; },
      async canTell() { return comments ? await comments.canSendToClaude() : "off"; },
      async tell(text) {
        if (!comments) return false;
        if ((await comments.canSendToClaude()) !== "available") return false;
        const anchor = await comments.anchorFor(document.getElementById("main") || document.body);
        await comments.sendToClaude({ anchor, text }); return true;
      },
      async download(filename, data) {
        dl = dl || (await cap("downloads", 6000)); if (!dl || !dl.save) return false;
        try { await dl.save({ filename, data }); return true; } catch (e) { if (e && e.code === "declined") return "declined"; return false; }
      },
      canWrite: () => { try { return user ? user.canEdit() ?? true : true; } catch (e) { return true; } },
    };
  };

  // ---------- memoria de demostracion (misma forma que la base real, con onSnapshot) ----------
  App.adapters.demo = function (seed) {
    const data = {}, listeners = {}, files = {};
    const docsOf = (c) => Object.entries(data[c] || {}).map(([id, v]) => ({ id, data: () => JSON.parse(JSON.stringify(v)) }));
    const fire = (c) => (listeners[c] || []).forEach((fn) => fn(docsOf(c)));
    Object.entries(seed || {}).forEach(([c, obj]) => { data[c] = {}; Object.entries(obj).forEach(([id, v]) => { data[c][id] = JSON.parse(JSON.stringify(v)); }); });
    const log = (window.__auraLog = window.__auraLog || []);
    let n = 0;
    return {
      name: "demo",
      async connect(emit) {
        App.COLLECTIONS.forEach((name) => { (listeners[name] = listeners[name] || []).push((docs) => emit(name, docs)); setTimeout(() => emit(name, docsOf(name)), 0); });
        return true;
      },
      async userId() { return "demo-user"; },
      async update(c, id, p) { data[c] = data[c] || {}; if (!data[c][id]) throw new Error("no existe"); Object.assign(data[c][id], flat(p, data[c][id])); log.push(["update", c, id, p]); fire(c); },
      async set(c, id, b) { data[c] = data[c] || {}; data[c][id] = JSON.parse(JSON.stringify(b)); log.push(["set", c, id, b]); fire(c); },
      async add(c, b) { data[c] = data[c] || {}; const id = "demo" + Date.now().toString(36) + (n++); data[c][id] = JSON.parse(JSON.stringify(b)); log.push(["add", c, id, b]); fire(c); return id; },
      async remove(c, id) { if (data[c]) delete data[c][id]; log.push(["remove", c, id]); fire(c); },
      async upload(file) {
        if (file.size > 19 * 1048576) throw Object.assign(new Error("too_large"), { code: "too_large" });
        const id = Array.from({ length: 32 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
        for (let p = 0; p <= 1; p += 0.25) { await new Promise((r) => setTimeout(r, 90)); if (file.onprogress) file.onprogress(p); }
        files[id] = URL.createObjectURL(file); log.push(["upload", file.name, file.size, id]);
        return { id, name: file.name, size: file.size, url: files[id] };
      },
      async deleteAsset(id) { delete files[id]; },
      assetUrl: (v) => (files[v] ? files[v] : assetUrl(v)),
      hasMetrics: () => true,
      async metrics(brand, q) {
        await new Promise((r) => setTimeout(r, 450));
        const dm = window.AuraDemo; if (!dm) throw Object.assign(new Error("sin datos"), { code: "server_not_connected" });
        return { payload: dm.metricRows(brand, q && q.evo), at: Date.now() };
      },
      async sample() { return null; },
      async canTell() { return "demo"; },
      async tell(text) { log.push(["tell", text]); return true; },
      async download(filename, d) { log.push(["download", filename]); const blob = d instanceof Blob ? d : new Blob([d], { type: "text/plain" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 500); return true; },
      canWrite: () => true,
      _data: data,
    };
    function flat(p, cur) { return p; }
  };
  App.withTimeout = withTimeout;
})();
