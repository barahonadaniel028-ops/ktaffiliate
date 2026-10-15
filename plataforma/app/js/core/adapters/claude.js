/* Aura · adaptador claude (real). Habla con las capacidades reales del artefacto (window.claude.use). Interfaz igual a los demas adaptadores de esta carpeta:
   connect(emit) update set add remove upload(file) assetUrl(id) deleteAsset(id) metrics(brand, q) sample() canTell() tell(text) userId() download(name, data) hasDownloads().
   hasDownloads() refleja si el artefacto declaro la capacidad `downloads` al publicarse (capabilities:{downloads:true}, ver DECISIONES.md #8): si no la declaro,
   use("downloads") resuelve null para siempre en esta vista y download() devuelve false -- la UI debe ocultar o deshabilitar el boton en vez de dejarlo fallar sin aviso.
   Este mismo codigo, sin cambios, es lo que corre contra el simulador de la fase 7 (ver adapters/simulador.js): el simulador solo reemplaza lo que hay
   detras de window.claude, nunca esta funcion. */
(function () {
  "use strict";
  const App = window.App, { withTimeout, assetUrl } = App._adapterUtil;
  App.adapters.claude = function () {
    let db = null, user = null, mcp = null, comments = null, assets = null, sampleP = null, dl = null, uid = null, writer = true;
    const cap = (name, ms) => withTimeout(window.claude && window.claude.use(name), ms || 10000);
    return {
      name: "claude",
      async connect(emit) {
        db = await cap("db", 10000); if (!db) return false;
        App.COLLECTIONS.concat([]).forEach((name) => { try { db.collection(name).onSnapshot((s) => emit(name, s.docs), () => {}); } catch (e) { /* esa coleccion no existe todavia */ } });
        cap("user", 8000).then(async (u) => {
          user = u; try { uid = u ? await u.id() : null; App.S.userId = uid; } catch (e) { /* anonimo */ }
          // quien solo mira no escribe copias de metricas ni marcas de logros; null = no lo sabemos: se deja y decide el primer rechazo
          try { if (u) writer = (await u.can("data.write")) !== false; } catch (e) { writer = true; }
        });
        cap("mcp", 12000).then((m) => { mcp = m; App.emit("mcp"); });
        cap("comments", 12000).then((c) => { comments = c; App.refreshClaudeState(); setInterval(App.refreshClaudeState, 120000); });
        cap("downloads", 12000).then((d) => { dl = d; App.emit("downloads"); });
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
      hasDownloads: () => !!dl,
      async canTell() { return comments ? await comments.canSendToClaude() : "off"; },
      async tell(text) {
        if (!comments) return false;
        if ((await comments.canSendToClaude()) !== "available") return false;
        const anchor = await comments.anchorFor(document.getElementById("main") || document.body);
        await comments.sendToClaude({ anchor, text }); return true;
      },
      async download(filename, data) {
        dl = dl || (await cap("downloads", 6000)); if (!dl || !dl.save) return false;
        return App._adapterUtil.saveViaCapability(dl, filename, data);
      },
      canWrite: () => writer,
    };
  };
})();
