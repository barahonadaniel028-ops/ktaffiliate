/* Aura · memoria de demostracion (misma forma que la base real, con onSnapshot). Interfaz igual a los demas adaptadores de esta carpeta. */
(function () {
  "use strict";
  const App = window.App, { assetUrl } = App._adapterUtil;
  App.adapters.demo = function (seed) {
    const data = {}, listeners = {}, files = {};
    let sampleD = null;
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
      hasDownloads: () => true,
      async metrics(brand, q) {
        await new Promise((r) => setTimeout(r, 450));
        const dm = window.AuraDemo; if (!dm) throw Object.assign(new Error("sin datos"), { code: "server_not_connected" });
        return { payload: dm.metricRows(brand, q && q.evo), at: Date.now() };
      },
      // en demostracion los datos son de ejemplo, pero si la pagina tiene la capacidad "sample" Jarvis conversa con Claude de verdad
      async sample() { if (!window.claude || !window.claude.use) return null; sampleD = sampleD || (await App.withTimeout(window.claude.use("sample"), 6000)); return sampleD; },
      async canTell() { return "demo"; },
      async tell(text) { log.push(["tell", text]); return true; },
      async download(filename, d) {
        log.push(["download", filename]);
        // Publicado como artefacto (aunque este en modo demostracion) el iframe bloquea el <a download>: si el
        // visor ofrece la capacidad `downloads`, se guarda por ahi. Sin ella (pagina autonoma) sigue el ancla.
        const dl = window.claude && window.claude.use ? await App._adapterUtil.withTimeout(window.claude.use("downloads"), 4000) : null;
        if (dl && dl.save) return App._adapterUtil.saveViaCapability(dl, filename, d);
        const blob = d instanceof Blob ? d : new Blob([d], { type: "text/plain" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 500); return true; },
      canWrite: () => true,
      _data: data,
    };
    function flat(p, cur) { return p; }
  };
})();
