// Pruebas de interaccion de Aura (Playwright). Verifica aprobar, notas, subir archivos, Estudio, Jarvis, tema, rutas y el adaptador "claude" con un simulador.
// Uso: NODE_PATH=$(npm root -g) node plataforma/tools/test.cjs   (antes: python3 plataforma/tools/build.py --local <vendor>)
const { chromium } = require("playwright");
const path = require("node:path"), fs = require("node:fs");
const root = path.resolve(__dirname, ".."), file = "file://" + path.join(root, "dist", "index.local.html");
const mockSrc = fs.readFileSync(path.join(root, "app", "js", "core", "adapters", "simulador.js"), "utf8");
let pass = 0, fail = 0; const failures = [];
const ok = (cond, name, extra) => { if (cond) { pass++; console.log("  ok  ", name); } else { fail++; failures.push(name + (extra ? " -> " + extra : "")); console.log("  FALLA", name, extra || ""); } };
const wait = (p, ms) => p.waitForTimeout(ms);

async function open(browser, url, init, viewport) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 1440, height: 900 } }); if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage(); const errs = []; page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.errs = errs; await page.goto(file + url, { waitUntil: "load" });
  await page.waitForFunction(() => window.App && App.S.ready && App.S.ready.videos, null, { timeout: 8000 }).catch(() => {}); await wait(page, 900); return page;
}
(async () => {
  const exe = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const browser = await chromium.launch(fs.existsSync(exe) ? { executablePath: exe, args: ["--autoplay-policy=no-user-gesture-required"] } : {});

  console.log("\n== Demo: navegacion y datos ==");
  let p = await open(browser, "?demo=1&preset=kt#hoy");
  ok(await p.evaluate(() => App.S.videos.length > 20), "carga los videos de demostracion");
  ok(await p.evaluate(() => !!document.querySelector(".hoy h1") && document.querySelector(".hoy h1").textContent.length > 20), "Hoy muestra la frase del dia");
  ok(!(await p.evaluate(() => /ventas|comisi[oó]n|afiliad|\$\d/i.test(document.body.innerText))), "Hoy no menciona ventas ni dinero");
  for (const r of ["aprobar", "crear", "biblioteca", "laboratorio", "metricas", "logros", "notas", "estudio", "ajustes"]) {
    await p.evaluate((h) => { location.hash = "#" + h; }, r); await wait(p, 700);
    ok(await p.evaluate((n) => !!document.querySelector(`.view[data-view="${n}"]`) && document.querySelector(".view").innerText.length > 40, r), "vista " + r + " dibuja contenido");
  }
  ok(!(await p.evaluate(() => /ventas|comisi[oó]n|afiliad/i.test(document.body.innerText))), "ninguna vista menciona ventas");

  console.log("\n== Aprobar ==");
  await p.evaluate(() => { location.hash = "#aprobar"; }); await wait(p, 600);
  const pend0 = await p.evaluate(() => App.sel.allPending().length);
  const firstId = await p.evaluate(() => App.sel.groupByPiece(App.sel.pending())[0].vs[0].id);
  await p.evaluate((id) => { location.hash = "#aprobar/ver/" + encodeURIComponent(id); }, firstId); await wait(p, 1200);
  ok(await p.evaluate(() => !!document.querySelector("#rvdecide .btn.pri")), "la revision muestra la capsula de decision");
  ok(await p.evaluate(() => document.querySelectorAll("#rvleft .vb").length >= 3), "muestra las versiones de la pieza");
  ok(await p.evaluate(() => document.querySelectorAll("#rvright .why li").length >= 3), "muestra los factores del predictor");
  await p.keyboard.press("a"); await wait(p, 700);
  const after = await p.evaluate((id) => ({ st: App.sel.video(id).status, nxt: location.hash, log: (window.__auraLog || []).filter((x) => x[1] === "requests").map((x) => x[2]) }), firstId);
  ok(after.st === "approved", "A aprueba la version", after.st);
  ok(after.nxt !== "#aprobar/ver/" + encodeURIComponent(firstId), "avanza a la siguiente version");
  await wait(p, 4600);
  const log = await p.evaluate(() => window.__auraLog.map((x) => x[0] + ":" + x[1] + ":" + x[2]));
  ok(log.some((l) => l.startsWith("set:requests:schedule_")), "aprobar = agendar: escribe requests/schedule_*", log.slice(-4).join(" | "));
  ok(await p.evaluate(() => window.__auraLog.some((x) => x[0] === "tell" && /APROB/.test(x[1]))), "avisa a Claude de la aprobacion");
  await p.keyboard.press("r"); await wait(p, 500);
  ok((await p.evaluate(() => App.sel.allPending().length)) <= pend0 - 2, "R rechaza y baja los pendientes");
  // notas por cuadro
  await p.fill("#rvnote", "Nota de prueba en el cuadro"); await p.keyboard.press("Enter"); await wait(p, 600);
  ok(await p.evaluate(() => App.S.notes.some((n) => n.text === "Nota de prueba en el cuadro" && n.sent === false)), "guarda una nota por cuadro como borrador");
  ok(await p.evaluate(() => App.sel.unsentCount() >= 4), "la barra cuenta los cambios sin enviar");
  await p.keyboard.press("Escape"); await wait(p, 500);
  // en lote desde la lista
  await p.evaluate(() => { location.hash = "#aprobar"; }); await wait(p, 600);
  await p.click(".piece .pick >> nth=0"); await p.click(".piece .pick >> nth=1"); await wait(p, 300);
  ok(await p.evaluate(() => !!document.querySelector("#bulk")), "seleccionar versiones muestra la barra de lote");
  await p.click('[data-act="bulk"][data-st="approved"]'); await wait(p, 600);
  ok(await p.evaluate(() => App.S.videos.filter((v) => v.status === "approved").length >= 2), "aprobar en lote funciona");

  console.log("\n== Enviar cambios ==");
  const before = await p.evaluate(() => App.sel.unsentCount());
  await p.evaluate(() => App.act.sendAll()); await wait(p, 800);
  ok(before > 0 && (await p.evaluate(() => App.sel.unsentCount())) === 0, "Enviar cambios deja todo enviado", before + " -> " + (await p.evaluate(() => App.sel.unsentCount())));
  ok(await p.evaluate(() => window.__auraLog.some((x) => x[0] === "set" && /^changes_/.test(x[2]))), "escribe requests/changes_*");

  console.log("\n== Crear: pedido y subida de videos ==");
  await p.evaluate(() => { location.hash = "#crear/subir"; }); await wait(p, 700);
  const tmp = path.join(root, "capturas", "_tmp", "clip-prueba.mp4"); fs.mkdirSync(path.dirname(tmp), { recursive: true }); fs.copyFileSync(path.join(root, "app", "dev", "demo.mp4"), tmp);
  await p.setInputFiles("#crfile", tmp); await wait(p, 1200);
  ok(await p.evaluate(() => App.ui.files.length === 1 && App.ui.files[0].state === "done"), "sube un video y queda listo");
  ok(await p.evaluate(() => !!document.querySelector(".file .th")), "muestra la miniatura/estado del archivo");
  await p.fill("#crnotes", "Para el estilo de la semana"); await p.click("#crsend"); await wait(p, 900);
  const req = await p.evaluate(() => App.S.requests.filter((r) => r.kind === "new_video" && r.source === "material")[0]);
  ok(!!req && req.assets.length === 1 && req.assets[0].purpose === "crudo", "el pedido incluye el archivo subido", JSON.stringify(req && req.assets));
  await p.evaluate(() => { location.hash = "#crear"; }); await wait(p, 600);
  await p.fill("#crtopic", "Tres errores al empezar el dia"); await p.click(".sty >> nth=1"); await p.click("#crsend"); await wait(p, 800);
  ok(await p.evaluate(() => App.S.requests.some((r) => r.source === "idea" && /Tres errores/.test(r.topic) && r.style)), "pedido por idea con estilo elegido");

  console.log("\n== Biblioteca y Laboratorio ==");
  await p.evaluate(() => { location.hash = "#biblioteca"; }); await wait(p, 700);
  const nLib = await p.evaluate(() => document.querySelectorAll(".lib-card").length);
  ok(nLib >= 30, "la biblioteca lista el catalogo", String(nLib));
  await p.click('[data-act="libtype"][data-k="transiciones"]'); await wait(p, 500);
  ok(await p.evaluate(() => document.querySelectorAll(".lib-card").length >= 7 && App.route().args[0] === "transiciones"), "filtra por tipo");
  await p.click(".lib-card >> nth=0"); await wait(p, 500); await p.click('[data-act="libuse"]'); await wait(p, 600);
  ok(await p.evaluate(() => App.route().name === "crear" && !!App.ui.draft.notes), "Usar en un video nuevo lleva a Crear con el estilo");
  await p.evaluate(() => { location.hash = "#laboratorio/ronda"; }); await wait(p, 700);
  await p.click('[data-act="labverd"][data-v="keep"] >> nth=3'); await wait(p, 400);
  ok(await p.evaluate(() => App.S.expCards.filter((c) => c.verdict === "keep").length >= 2), "calificar una tarjeta guarda el veredicto");
  await p.evaluate(() => { location.hash = "#laboratorio/estilos"; }); await wait(p, 600);
  await p.click('[data-act="labdecide"][data-st="aprobado"] >> nth=0'); await wait(p, 500);
  ok(await p.evaluate(() => App.S.expStyles.filter((s) => s.status === "aprobado").length >= 5), "aprobar un estilo lo pasa a la Biblioteca");

  console.log("\n== Metricas y Logros ==");
  await p.evaluate(() => { location.hash = "#metricas"; }); await wait(p, 900);
  ok(await p.evaluate(() => document.querySelectorAll(".stat").length === 4 && document.querySelectorAll(".top li").length >= 5), "metricas: tarjetas y mejores reels");
  await p.click('[data-act="mrange"][data-k="7"]'); await wait(p, 400); await p.click('[data-act="mscope"][data-k="kt-en"]'); await wait(p, 400);
  ok(await p.evaluate(() => /KT English/.test(document.querySelector(".vhead .eyebrow").textContent)), "filtra por cuenta");
  await p.click('[data-act="mscope"][data-k="total"]'); await wait(p, 300);
  await p.evaluate(() => { location.hash = "#logros"; }); await wait(p, 1500);
  ok(await p.evaluate(() => document.querySelectorAll(".tr").length >= 6 && !!document.querySelector(".lvlhero")), "logros: nivel y tarjetas");
  ok(await p.evaluate(() => document.querySelectorAll(".tr.fresh").length >= 1), "hay logros nuevos para celebrar");

  console.log("\n== Estudio ==");
  const ed = await p.evaluate(() => App.S.studioVersions.find((x) => x.spec).id);
  await p.evaluate((id) => { location.hash = "#estudio/" + encodeURIComponent(id); }, ed); await wait(p, 2200);
  ok(await p.evaluate(() => !!(App.st.SE && App.st.SE.handle && App.st.SE.spec)), "abre el editor con el motor original");
  await p.click('.st-clip[data-k="text"] >> nth=0'); await wait(p, 400);
  ok(await p.evaluate(() => !!document.querySelector("#st-ft")), "seleccionar un clip abre sus ajustes");
  await p.fill("#st-ft", "NUEVO TITULO"); await wait(p, 500);
  ok(await p.evaluate(() => JSON.stringify(App.st.SE.spec).includes("NUEVO TITULO")), "editar el texto cambia la especificacion");
  await wait(p, 1200);
  ok(await p.evaluate((id) => JSON.stringify(App.S.studioVersions.find((x) => x.id === id).spec).includes("NUEVO TITULO"), ed), "guarda automaticamente en studio_versions");
  await p.keyboard.press("Escape"); await p.click("#st-undo"); await wait(p, 500);
  ok(await p.evaluate(() => !JSON.stringify(App.st.SE.spec).includes("NUEVO TITULO")), "deshacer revierte la edicion");
  await p.click('[data-tool="texto"]'); await wait(p, 450); await p.click('.st-tile[data-add="texto"] >> nth=0'); await wait(p, 500);
  ok(await p.evaluate(() => App.st.SE.spec.tracks.filter((t) => t.kind === "text").reduce((a, t) => a + t.clips.length, 0) >= 3), "la biblioteca del Estudio agrega un texto en el cursor");
  await p.click("#st-qa"); await wait(p, 450); ok(await p.evaluate(() => !!document.querySelector("#st-ipane .st-qahead")), "revisar reglas abre el panel de calidad"); await p.click("#st-iclose"); await wait(p, 400);
  await p.click("#st-ask-btn"); await wait(p, 450); await p.fill("#st-ask-text", "Pon un iris en el fondo"); await p.click("#st-ask-go"); await wait(p, 800);
  ok(await p.evaluate(() => App.S.studioRequests.some((r) => /iris/.test(r.text) && r.status === "pedido")), "pedirle a Claude crea studio_requests con pasos por hacer");
  await p.click('[data-tool="exportar"]'); await wait(p, 450); await p.click("#st-dl-srt"); await wait(p, 500);
  ok(await p.evaluate(() => window.__auraLog.some((x) => x[0] === "download" && /\.srt$/.test(x[1]))), "exporta subtitulos SRT");
  for (let i = 0; i < 4 && (await p.evaluate(() => !!App.studioOpen)); i++) { await p.keyboard.press("Escape"); await wait(p, 450); }
  ok(await p.evaluate(() => App.route().name === "estudio" && !App.studioOpen), "Esc cierra el editor");

  console.log("\n== Jarvis, tema y rutas ==");
  await p.evaluate(() => { location.hash = "#hoy"; }); await wait(p, 600);
  await p.keyboard.press("Control+k"); await wait(p, 1100);
  ok(await p.evaluate(() => App.jarvis.isOpen() && document.querySelectorAll("#jvcmds button").length >= 4), "Ctrl+K abre Jarvis con comandos");
  await p.fill("#jvbox", "aprobar"); await p.keyboard.press("Enter"); await p.waitForFunction(() => App.route().name === "aprobar" && !App.jarvis.isOpen(), null, { timeout: 4000 }).catch(() => {}); await wait(p, 300);
  ok(await p.evaluate(() => App.route().name === "aprobar" && !App.jarvis.isOpen()), "un comando lleva a la pantalla y cierra el panel");
  await p.evaluate(() => { location.hash = "#hoy"; }); await wait(p, 500); await p.click('[data-act="theme"]'); await p.waitForFunction(() => document.documentElement.getAttribute("data-aura") === "night", null, { timeout: 4000 }).catch(() => {}); await wait(p, 300);
  const th = await p.evaluate(() => document.documentElement.getAttribute("data-aura") + "|" + getComputedStyle(document.documentElement).getPropertyValue("--base").trim());
  ok(/^night\|#06100f/.test(th), "el boton cambia a noche", th);
  await p.reload(); await wait(p, 1500);
  ok(await p.evaluate(() => document.documentElement.getAttribute("data-aura") === "night"), "recuerda la noche al recargar");
  ok(p.errs.length === 0, "sin errores de consola en el recorrido demo", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  console.log("\n== Preset Lumen (otra marca) ==");
  p = await open(browser, "?demo=1&preset=lumen#hoy");
  ok(await p.evaluate(() => App.config.id === "lumen" && App.S.brands.length === 3), "carga otro espacio con 3 cuentas");
  ok(!(await p.evaluate(() => /\bKT\b|Kevin|Trudeau|Teacher/.test(document.body.innerText))), "ninguna referencia a KT en el otro espacio");
  await p.evaluate(() => { location.hash = "#crear"; }); await wait(p, 600);
  ok(await p.evaluate(() => /Reel con voz en off/.test(document.querySelector("#crformat").innerText) && !document.querySelector("#crteacher")), "formatos propios y sin campo Teacher");
  await p.evaluate(() => { location.hash = "#metricas"; }); await wait(p, 900);
  ok(await p.evaluate(() => document.querySelectorAll(".stat").length === 4), "metricas del otro espacio");
  ok(p.errs.length === 0, "sin errores en el preset Lumen", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  console.log("\n== Adaptador Claude (simulador de capacidades) ==");
  p = await open(browser, "?preset=kt#hoy", mockSrc); await wait(p, 600);
  ok(await p.evaluate(() => App.S.mode === "claude"), "con window.claude usa el adaptador real");
  ok(await p.evaluate(() => App.S.videos.length === 0), "una base vacia no inventa datos");
  await p.evaluate(() => { location.hash = "#ajustes"; }); await wait(p, 600);
  ok(await p.evaluate(() => !!document.querySelector('[data-act="seeddemo"]')), "ofrece cargar datos de ejemplo cuando esta vacia");
  await p.click('[data-act="seeddemo"]'); await wait(p, 5000);
  ok(await p.evaluate(() => App.S.videos.length > 20 && Object.keys(window.__mock.data.videos).length > 20), "los datos se escriben en la base y vuelven por onSnapshot");
  await p.evaluate(() => { location.hash = "#hoy"; }); await wait(p, 900);
  const vid = await p.evaluate(() => App.sel.pending()[0].id);
  await p.evaluate((id) => App.act.setStatus(App.sel.video(id), "approved"), vid); await wait(p, 5000);
  ok(await p.evaluate((id) => window.__mock.data.videos[id].status === "approved", vid), "aprobar escribe en videos/<id>");
  ok(await p.evaluate(() => !!window.__mock.data.requests.schedule_kt_es || Object.keys(window.__mock.data.requests).some((k) => /^schedule_/.test(k))), "escribe requests/schedule_<cuenta>");
  ok(await p.evaluate(() => window.__mock.tells.some((t) => /APROB/.test(t))), "avisa por comments.sendToClaude");
  ok(await p.evaluate(() => App.S.claudeState === "available"), "estado de Claude disponible");
  await p.evaluate(() => { location.hash = "#metricas"; }); await wait(p, 1800);
  ok(await p.evaluate(() => window.__mock.calls.length >= 2 && window.__mock.calls.some((c) => c[0] === "metricool")), "Metricas llama a mcp.callTool(metricool)");
  ok(await p.evaluate(() => Object.keys(window.__mock.data.metrics || {}).length >= 1), "guarda copia de las metricas en la base");
  await p.evaluate(() => { location.hash = "#crear/subir"; }); await wait(p, 600);
  await p.setInputFiles("#crfile", tmp); await wait(p, 1200);
  ok(await p.evaluate(() => window.__mock.uploads.length === 1 && App.ui.files[0].state === "done" && /^[0-9a-f]{32}$/.test(App.ui.files[0].id)), "subir usa assets.upload y guarda el id", JSON.stringify(await p.evaluate(() => window.__mock.uploads)));
  await p.evaluate(() => { location.hash = "#estudio"; }); await wait(p, 600);
  const edSim = await p.evaluate(() => (App.S.studioVersions.find((x) => x.spec) || {}).id);
  await p.evaluate((id) => { location.hash = "#estudio/" + encodeURIComponent(id); }, edSim); await wait(p, 2200);
  ok(await p.evaluate(() => !!(App.st.SE && App.st.SE.handle && App.st.SE.spec)), "abre el Estudio de un video con spec contra el simulador");
  await p.keyboard.press("Escape"); await wait(p, 500);
  await p.evaluate(() => { location.hash = "#hoy"; }); await wait(p, 500);
  await p.keyboard.press("Control+k"); await wait(p, 1100);
  await p.fill("#jvbox", "llevame a biblioteca"); await p.keyboard.press("Enter");
  await p.waitForFunction(() => App.route().name === "biblioteca" && !App.jarvis.isOpen(), null, { timeout: 4000 }).catch(() => {}); await wait(p, 300);
  ok(await p.evaluate(() => App.route().name === "biblioteca" && !App.jarvis.isOpen()), "Jarvis responde y navega con sample()+herramientas contra el simulador");
  ok(await p.evaluate(() => window.__mock.sampleCalls.length >= 1), "el simulador registra el turno de Jarvis (sampleCalls)");
  ok(p.errs.length === 0, "sin errores con el adaptador real", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  console.log("\n== Telefono ==");
  p = await open(browser, "?demo=1&preset=kt#hoy", null, { width: 390, height: 844 });
  ok(await p.evaluate(() => getComputedStyle(document.querySelector("#tabbar")).display !== "none" && getComputedStyle(document.querySelector("#rail")).display === "none"), "barra inferior en telefono y sin riel");
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Hoy no tiene scroll horizontal");
  for (const r of ["aprobar", "crear", "biblioteca", "laboratorio", "metricas", "logros", "notas", "estudio", "ajustes"]) { await p.evaluate((h) => { location.hash = "#" + h; }, r); await wait(p, 600); ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), r + " sin scroll horizontal", String(await p.evaluate(() => document.documentElement.scrollWidth))); }
  await p.evaluate(() => { const v = App.sel.pending()[0]; location.hash = "#aprobar/ver/" + encodeURIComponent(v.id); }); await wait(p, 1200);
  ok(await p.evaluate(() => { const b = document.querySelector("#rvdecide").getBoundingClientRect(); return b.bottom <= innerHeight && b.top > 300; }), "la capsula de decision queda visible sobre la barra");
  ok(p.errs.length === 0, "sin errores en telefono", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  await browser.close();
  console.log(`\n${pass} ok, ${fail} fallan`); if (fail) { console.log(failures.join("\n")); process.exit(1); }
})();
