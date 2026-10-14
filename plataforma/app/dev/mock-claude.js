/* Aura · simulador de window.claude (db, user, mcp, comments, assets, downloads, sample) para probar el adaptador real sin el artefacto.
   Uso en pruebas: page.addInitScript(contenido de este archivo). Deja el estado en window.__mock (base de datos, avisos, descargas). */
(function () {
  "use strict";
  const data = {}, subs = {}, mock = (window.__mock = { data, tells: [], downloads: [], uploads: [], calls: [], writes: [] });
  const docsOf = (c) => Object.entries(data[c] || {}).map(([id, v]) => ({ id, data: () => JSON.parse(JSON.stringify(v)) }));
  const fire = (c) => (subs[c] || []).forEach((fn) => fn({ docs: docsOf(c) }));
  const col = (c) => ({
    onSnapshot(cb) { (subs[c] = subs[c] || []).push(cb); setTimeout(() => cb({ docs: docsOf(c) }), 5); return () => {}; },
    doc: (id) => ({
      async update(p) { if (!data[c] || !data[c][id]) throw new Error("not_found"); Object.assign(data[c][id], JSON.parse(JSON.stringify(p))); mock.writes.push(["update", c, id]); fire(c); },
      async set(b) { (data[c] = data[c] || {})[id] = JSON.parse(JSON.stringify(b)); mock.writes.push(["set", c, id]); fire(c); },
      async delete() { if (data[c]) delete data[c][id]; mock.writes.push(["delete", c, id]); fire(c); },
    }),
    async add(b) { const id = "m" + Math.random().toString(36).slice(2, 9); (data[c] = data[c] || {})[id] = JSON.parse(JSON.stringify(b)); mock.writes.push(["add", c, id]); fire(c); return { id }; },
  });
  const db = { collection: col, doc: (path) => { const [c, id] = path.split("/"); return col(c).doc(id); } };
  const caps = {
    db,
    user: { id: async () => "user-test", canEdit: () => true },
    mcp: { async callTool(server, tool, args) { mock.calls.push([server, tool, args.metrics && args.metrics[0]]); const b = { blogId: args.brandId }; const evo = (args.metrics || [])[0] === "IGEV01"; return { payload: window.AuraDemo ? window.AuraDemo.metricRows(b, evo) : [], cache: { storedAt: Date.now() } }; } },
    comments: { canSendToClaude: async () => "available", anchorFor: async () => ({ id: "anchor" }), sendToClaude: async (m) => { mock.tells.push(m.text); } },
    assets: { async upload(file) { const id = Array.from({ length: 32 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join(""); mock.uploads.push([file.name, file.size, id]); return { id }; }, async delete() {} },
    downloads: { async save(o) { mock.downloads.push(o.filename); } },
    sample: null,
  };
  window.claude = { use: async (name) => caps[name] || null };
})();
