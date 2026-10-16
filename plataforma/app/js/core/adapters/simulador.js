/* Aura · simulador fiel de window.claude (fase 7 del plan). Repite el contrato completo de CONTRATO-DE-DATOS.md -- db, user, mcp, comments, assets,
   downloads y sample (Jarvis con herramientas reales) -- para recorrer TODA la plataforma como si fuera el artefacto real, sin tocar a Claude.
   Es un script independiente: NO depende de window.App ni de que la app ya haya cargado. Se inyecta ANTES del bundle (Playwright
   page.addInitScript, o un <script> propio antes del resto), igual que lo haria el anfitrion real al definir window.claude. Nunca se incluye en
   el build de produccion (tools/build.py no lo lista): es solo para pruebas y recorridos de desarrollo.
   El adaptador App.adapters.claude (adapters/claude.js) corre SIN CAMBIOS contra esto -- lo que cambia es unicamente lo que hay detras de
   window.claude.use(...), nunca la logica de lectura/escritura de la app.

   Depuracion desde la consola o Playwright:
     window.__mock.data        -> el estado de cada coleccion (como quedaria en la base real)
     window.__mock.writes      -> bitacora de escrituras [update|set|add|remove, coleccion, id]
     window.__mock.tells       -> avisos que la app le mando a "Claude" (comments.sendToClaude)
     window.__mock.calls       -> llamadas a mcp.callTool
     window.__mock.uploads     -> archivos subidos [nombre, tamano, assetId]
     window.__mock.downloads   -> nombres de archivo descargados
     window.__mock.sampleCalls -> turnos de Jarvis resueltos por el simulador [{q, reply}]
     window.__mock.force       -> {sample|mcp|comments: "codigo_de_error"} para probar los caminos de error a pedido, sin afectar el resto */
(function () {
  "use strict";
  const data = {}, subs = {};
  const mock = (window.__mock = { data, writes: [], tells: [], calls: [], uploads: [], downloads: [], sampleCalls: [], force: {} });
  const docsOf = (c) => Object.entries(data[c] || {}).map(([id, v]) => ({ id, data: () => JSON.parse(JSON.stringify(v)) }));
  const fire = (c) => (subs[c] || []).forEach((fn) => { try { fn({ docs: docsOf(c) }); } catch (e) { /* oyente roto, no tira abajo la base */ } });
  const col = (c) => ({
    onSnapshot(cb) {
      (subs[c] = subs[c] || []).push(cb); setTimeout(() => cb({ docs: docsOf(c) }), 5);
      return () => { subs[c] = (subs[c] || []).filter((fn) => fn !== cb); };
    },
    doc: (id) => ({
      async update(p) { if (!data[c] || !data[c][id]) throw new Error("not_found"); Object.assign(data[c][id], JSON.parse(JSON.stringify(p))); mock.writes.push(["update", c, id]); fire(c); },
      async set(b) { (data[c] = data[c] || {})[id] = JSON.parse(JSON.stringify(b)); mock.writes.push(["set", c, id]); fire(c); },
      async delete() { if (data[c]) delete data[c][id]; mock.writes.push(["delete", c, id]); fire(c); },
    }),
    async add(b) { const id = "sim" + Math.random().toString(36).slice(2, 10); (data[c] = data[c] || {})[id] = JSON.parse(JSON.stringify(b)); mock.writes.push(["add", c, id]); fire(c); return { id }; },
  });
  const db = { collection: col, doc: (path) => { const i = path.indexOf("/"), c = path.slice(0, i), id = path.slice(i + 1); return col(c).doc(id); } };
  const hexId = () => Array.from({ length: 32 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const fail = (code, msg) => Object.assign(new Error(msg || code), { code });

  // ---------- sample: Jarvis con herramientas reales, por reglas sobre el MISMO resumen (jvBrief) que recibiria un modelo real ----------
  // No es un modelo de lenguaje: es un conjunto chico de reglas fieles al RULES() de jarvis.js (ir a una pantalla, proponer aprobar una pieza,
  // responder con datos reales del resumen, o pasarle la tarea a Claude). Alcanza para probar de punta a punta que sample()+tools funciona
  // contra el contrato (ejecuta herramientas reales: go_to navega, propose_approval muestra la tarjeta de confirmacion real).
  const ROUTES = ["hoy", "crear", "biblioteca", "laboratorio", "metricas", "notas", "estudio", "ajustes", "empieza"];
  const LEGACY_VIEW = { aprobar: "estudio", logros: "metricas", "primeros pasos": "empieza" }; // "aprobar" y "logros" ya no son pantallas propias (DECISIONES.md #1 y #2); mismo alias que jarvis.js
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  function briefOf(messages) {
    try {
      const head = String((messages[0] || {}).content || ""), m = head.match(/RESUMEN ACTUAL \(JSON\):\n([\s\S]+)$/);
      return m ? JSON.parse(m[1]) : null;
    } catch (e) { return null; }
  }
  function sampleFn(messages, opts) {
    opts = opts || {};
    return new Promise((resolve, reject) => {
      const forced = mock.force.sample; if (forced) { reject(fail(forced, "simulado")); return; }
      let done = false;
      const settle = (fn, v) => { if (done) return; done = true; if (opts.signal) opts.signal.removeEventListener("abort", onAbort); fn(v); };
      const onAbort = () => settle(reject, fail("cancelled"));
      if (opts.signal) { if (opts.signal.aborted) { settle(reject, fail("cancelled")); return; } opts.signal.addEventListener("abort", onAbort); }
      const last = messages && messages.length ? messages[messages.length - 1] : null, raw = String((last && last.content) || "");
      const q = norm(raw), tools = Array.isArray(opts.tools) ? opts.tools : [];
      const tool = (n) => tools.find((t) => t.name === n);
      const b = briefOf(messages) || {}, marcas = b.marcas || [];
      const say = (text) => {
        mock.sampleCalls.push({ q: raw, last: raw, reply: text, opts: { model: opts.model, effort: opts.effort, modelTier: opts.modelTier, cache: opts.cache, images: Array.isArray(opts.images) ? opts.images.length : 0, hasTools: tools.length > 0 } });
        const head = text.length > 60 ? text.slice(0, Math.round(text.length / 2)) : text;
        setTimeout(() => { if (done) return; if (typeof opts.onText === "function") try { opts.onText({ text: head }); } catch (e) { /* oyente roto */ } }, 70);
        setTimeout(() => settle(resolve, { text, truncated: false, modelTierApplied: opts.modelTier || "default", modelApplied: opts.model }), 170);
      };
      (async () => {
        try {
          const wantsGo = /(llevame|lleva|ve a|ir a|anda a|abre|abrir|muestrame|mostrame)/.test(q);
          const goHit = wantsGo ? (ROUTES.concat(Object.keys(LEGACY_VIEW)).find((r) => q.includes(r)) || (/redes|numeros/.test(q) ? "metricas" : null)) : null;
          const goView = goHit && (LEGACY_VIEW[goHit] || goHit);
          if (goView && tool("go_to")) { await tool("go_to").execute({ view: goView }); say(`Te llevo a ${goView}.`); return; }
          const apM = q.match(/^aprueba (.+)/) || q.match(/^aprobar (.+)/);
          if (apM && tool("propose_approval")) {
            try { const r = await tool("propose_approval").execute({ piece: apM[1] }); say(String(r)); }
            catch (e) { say("No encontré una pieza por aprobar con ese nombre. Decime cómo aparece en Aprobar."); }
            return;
          }
          if (/pendiente|por aprobar|que tengo|cuanto.*(aprobar|falta)/.test(q)) {
            const n = marcas.reduce((a, m) => a + (m.porAprobar || []).length, 0);
            say(n ? `Tienes ${n} ${n === 1 ? "pieza" : "piezas"} por aprobar: ${marcas.filter((m) => (m.porAprobar || []).length).map((m) => `${m.nombre} (${m.porAprobar.length})`).join(", ")}.` : "No tienes nada por aprobar ahora mismo.");
            return;
          }
          if (/contenido|queda|runway|dias de/.test(q)) {
            say(marcas.length ? marcas.map((m) => `${m.nombre}: ${m.diasDeContenido} ${m.diasDeContenido === 1 ? "día" : "días"}${m.contenidoHasta ? " (hasta el " + m.contenidoHasta + ")" : ""}`).join(" · ") : "No veo cuentas en el resumen todavía.");
            return;
          }
          if (/redes|vistas|seguidor|instagram|metrica|resultado/.test(q)) {
            const ev = marcas.filter((m) => m.instagram7dias);
            say(ev.length ? ev.map((m) => `${m.nombre}: ${m.instagram7dias.vistas} vistas, ${m.instagram7dias.seguidoresNuevos >= 0 ? "+" : ""}${m.instagram7dias.seguidoresNuevos} seguidores esta semana`).join(" · ") : "Todavía no tengo datos de redes en el resumen.");
            return;
          }
          if (/biblioteca|estilo/.test(q)) {
            const bib = b.biblioteca || {}, total = Object.values(bib).reduce((a, n) => a + n, 0);
            say(total ? `La Biblioteca tiene ${total} elementos aprobados: ${Object.entries(bib).map(([k, n]) => `${n} ${k}`).join(", ")}.` : "Todavía no veo nada aprobado en la Biblioteca.");
            return;
          }
          const askM = /(pasale|pídele|pidele|dile|avisale) a claude\s*(que)?\s*(.*)/.exec(q);
          if (askM && tool("ask_claude")) { const r = await tool("ask_claude").execute({ task: (askM[3] && askM[3].trim()) || raw }); say(String(r)); return; }
          say("Eso no lo tengo en el resumen. Pedime llevarte a una pantalla, aprobar una pieza, o pasale la tarea a Claude.");
        } catch (e) { settle(reject, fail("upstream_error", e && e.message)); }
      })();
    });
  }
  sampleFn.limits = async () => ({ tools: true, images: { maxCount: 4, maxInputBytes: 5e6, mediaTypes: ["image/png", "image/jpeg", "image/webp"] } });

  // ---------- capacidades ----------
  const caps = {
    db,
    user: { id: async () => "user-simulador", canEdit: async () => true, can: async () => true },
    mcp: {
      async callTool(server, toolName, args) {
        args = args || {}; mock.calls.push([server, toolName, (args.metrics || [])[0]]);
        if (mock.force.mcp) throw fail(mock.force.mcp, "simulado");
        await wait(60);
        const brand = { blogId: args.brandId }, evo = (args.metrics || [])[0] === "IGEV01";
        return { payload: window.AuraDemo ? window.AuraDemo.metricRows(brand, evo) : [], cache: { storedAt: Date.now() } };
      },
    },
    comments: {
      async canSendToClaude() { return mock.force.comments || "available"; },
      async anchorFor() { return { id: "anchor" }; },
      async sendToClaude(m) { mock.tells.push(m.text); },
    },
    assets: {
      async upload(file) {
        if (file && file.size > 19 * 1048576) throw fail("too_large");
        for (let p = 0; p <= 1; p += 0.2) { await wait(70); if (file && typeof file.onprogress === "function") try { file.onprogress(p); } catch (e) { /* oyente roto */ } }
        const id = hexId(); mock.uploads.push([(file && file.name) || "", (file && file.size) || 0, id]); return { id };
      },
      async delete(id) { mock.uploads = mock.uploads.filter((u) => u[2] !== id); },
    },
    downloads: { async save(o) { mock.downloads.push(o.filename); } },
    sample: sampleFn,
  };
  window.claude = { use: async (name) => caps[name] || null };
})();
