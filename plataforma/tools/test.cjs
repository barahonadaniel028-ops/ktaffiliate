// Pruebas de interaccion de Aura (Playwright). Verifica aprobar, notas, subir archivos, Estudio, Jarvis, tema, rutas y el adaptador "claude" con un simulador.
// Uso: NODE_PATH=$(npm root -g) node plataforma/tools/test.cjs   (antes: python3 plataforma/tools/build.py --local <vendor>)
let chromium; try { ({ chromium } = require("playwright")); } catch (e) { ({ chromium } = require("playwright-core")); } // sirve con `playwright` global o con el playwright-core de package.json
const path = require("node:path"), fs = require("node:fs");
const root = path.resolve(__dirname, ".."), file = "file://" + path.join(root, "dist", "index.local.html");
const mockSrc = fs.readFileSync(path.join(root, "app", "js", "core", "adapters", "simulador.js"), "utf8");
let pass = 0, fail = 0; const failures = [];
const ok = (cond, name, extra) => { if (cond) { pass++; console.log("  ok  ", name); } else { fail++; failures.push(name + (extra ? " -> " + extra : "")); console.log("  FALLA", name, extra || ""); } };
const wait = (p, ms) => p.waitForTimeout(ms);
// navega por hash y espera a que la vista nueva este dibujada (el navegador de pruebas no tiene GPU y va lento)
async function nav(p, hash, ms) {
  const name = hash.replace(/^#/, "").split("/")[0];
  await p.evaluate((h) => { location.hash = h; }, hash.startsWith("#") ? hash : "#" + hash);
  await p.waitForFunction((n) => { const v = document.querySelector("#main > .view"); return v && v.dataset.view === n && v.style.opacity !== "0"; }, name, { timeout: 6000 }).catch(() => {});
  await p.waitForTimeout(ms || 400);
}

async function open(browser, url, init, viewport, o) {
  if (!(o && o.cel)) url = url.replace("?", "?nocel=1&"); // el aviso automatico de hitos solo se prueba en su seccion
  const ctx = await browser.newContext({ viewport: viewport || { width: 1440, height: 900 } }); if (init) await ctx.addInitScript(init);
  // la nube de Crear flota sin parar y Playwright espera que lo que va a tocar este quieto: en todas las pruebas se congela, menos en la que mide que flota
  await ctx.addInitScript(() => { document.addEventListener("DOMContentLoaded", () => { const st = document.createElement("style"); st.id = "__nofloat"; st.textContent = ".crear-cloud.jv, .nt-float, .nt-cloud { animation: none !important; }"; document.head.appendChild(st); }); });
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
  for (const r of ["crear", "biblioteca", "laboratorio", "metricas", "notas", "estudio", "ajustes"]) {
    await p.evaluate((h) => { location.hash = "#" + h; }, r); await p.waitForFunction((n) => !!document.querySelector(`.view[data-view="${n}"]`), r, { timeout: 5000 }).catch(() => {}); await wait(p, 250);
    ok(await p.evaluate((n) => !!document.querySelector(`.view[data-view="${n}"]`) && document.querySelector(".view").innerText.length > (n === "notas" ? 30 : 40), r), "vista " + r + " dibuja contenido");
  }
  ok(!(await p.evaluate(() => /ventas|comisi[oó]n|afiliad/i.test(document.body.innerText))), "ninguna vista menciona ventas");
  await p.evaluate(() => { location.hash = "#aprobar"; }); await wait(p, 400);
  ok(await p.evaluate(() => App.route().name === "estudio"), "#aprobar (hash viejo) redirige a Estudio, ya no es una pantalla propia");

  console.log("\n== Estudio: listado y vista general (antes la pestaña Aprobar) ==");
  await nav(p, "#estudio", 300);
  const pend0 = await p.evaluate(() => App.sel.allPending().length);
  const firstId = await p.evaluate(() => App.sel.groupByPiece(App.sel.pending())[0].vs[0].id);
  await p.evaluate((id) => { location.hash = "#estudio/ver/" + encodeURIComponent(id); }, firstId); await wait(p, 1200);
  ok(await p.evaluate(() => !!document.querySelector("#rvdecide .btn.pri")), "la vista general muestra la capsula de decision");
  ok(await p.evaluate(() => document.querySelectorAll("#rvleft .vb").length >= 3), "muestra las versiones de la pieza");
  ok(await p.evaluate(() => { const n = document.querySelectorAll("#rvright .why li").length; return n >= 1 && n <= 3; }), "los factores del predictor quedan agrupados en categorias simples (no la lista cruda de hasta 6)");
  ok(await p.evaluate(() => { const b = document.querySelector("#rvwhybox"); return !!b && !b.classList.contains("open") && document.querySelector(".rvwhy").getAttribute("aria-expanded") === "false"; }), "el detalle de \"¿Por qué este score?\" esta cerrado por default");
  ok(await p.evaluate(() => !!document.querySelector("#rvright .rvring .num") && !!document.querySelector("#rvright .rvmanual") && /editor\/.+/.test(document.querySelector("#rvright .rvmanual").getAttribute("href")) && !!document.querySelector("#rvstudio")), "a la derecha: Abrir en editor manual arriba del score, y Abrir en editor bajo el video");
  ok(await p.evaluate(() => !document.querySelector("#rvnote") && !document.querySelector(".caps") && !document.querySelector(".say") && !document.querySelector("#rvright .fb")), "ya no estan las notas por cuadro, los subtitulos, la opinion de Jarvis ni Que falla");
  await p.click(".rvwhy"); await wait(p, 700);
  ok(await p.evaluate(() => document.querySelector("#rvwhybox").classList.contains("open") && document.querySelector(".rvwhy").getAttribute("aria-expanded") === "true" && document.querySelector("#rvwhybox").getBoundingClientRect().height > 40), "al hacer clic en \"¿Por qué este score?\" se abren las razones");
  await p.click(".rvwhy"); await wait(p, 500);
  await p.keyboard.press("a"); await wait(p, 700);
  const after = await p.evaluate((id) => ({ st: App.sel.video(id).status, nxt: location.hash, log: (window.__auraLog || []).filter((x) => x[1] === "requests").map((x) => x[2]) }), firstId);
  ok(after.st === "approved", "A aprueba la version", after.st);
  ok(after.nxt !== "#estudio/ver/" + encodeURIComponent(firstId), "avanza a la siguiente version");
  await wait(p, 4600);
  const log = await p.evaluate(() => window.__auraLog.map((x) => x[0] + ":" + x[1] + ":" + x[2]));
  ok(log.some((l) => l.startsWith("set:requests:schedule_")), "aprobar = agendar: escribe requests/schedule_*", log.slice(-4).join(" | "));
  ok(await p.evaluate(() => window.__auraLog.some((x) => x[0] === "tell" && /APROB/.test(x[1]))), "avisa a Claude de la aprobacion");
  await p.keyboard.press("r"); await wait(p, 500);
  ok((await p.evaluate(() => App.sel.allPending().length)) <= pend0 - 2, "R rechaza y baja los pendientes");
  // chat "¿Qué ajustarías?": chips de seleccion multiple + detalle; queda como el cambio de esa version
  ok(await p.evaluate(() => /¿Qué ajustarías\?/.test(document.querySelector(".rvq").textContent) && document.querySelectorAll(".rvchat .tg").length >= 6), "el chat dice ¿Qué ajustarías? y ofrece hook, subtitulos, intro, video, animaciones...");
  const unsent0 = await p.evaluate(() => App.sel.unsentCount());
  await p.click('.rvchat .tg[data-t="Subtítulos"]'); await p.click('.rvchat .tg[data-t="Animaciones"]');
  ok(await p.evaluate(() => document.querySelectorAll(".rvchat .tg[aria-pressed='true']").length === 2), "se pueden elegir varias opciones a la vez");
  await p.fill("#rvfb", "Subtítulos más grandes y la animación más lenta"); await p.keyboard.press("Enter"); await wait(p, 700);
  ok(await p.evaluate(() => { const v = App.sel.video(document.querySelector("#rv").dataset.id); return /Subtítulos más grandes/.test(v.feedback || "") && (v.tags || []).includes("Animaciones") && v.feedbackDirty === true; }), "enviar el chat guarda el ajuste de esta version como borrador");
  ok(await p.evaluate((n) => App.sel.unsentCount() > n && !!document.querySelector(".rvthread .rvme"), unsent0), "la barra cuenta el cambio sin enviar y el chat lo muestra como mensaje");
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  await p.keyboard.press("Escape"); await wait(p, 500);
  ok(await p.evaluate(() => App.route().name === "estudio" && !App.route().args[0]), "Escape desde la vista general vuelve al listado de Estudio");
  // en lote desde la lista
  await nav(p, "#estudio", 300);
  await p.click(".piece .pick >> nth=0"); await p.click(".piece .pick >> nth=1"); await wait(p, 300);
  ok(await p.evaluate(() => !!document.querySelector("#bulk")), "seleccionar versiones muestra la barra de lote");
  await p.click('[data-act="bulk"][data-st="approved"]'); await wait(p, 600);
  ok(await p.evaluate(() => App.S.videos.filter((v) => v.status === "approved").length >= 2), "aprobar en lote funciona");
  ok(!(await p.evaluate(() => !!document.querySelector('[data-nav="aprobar"]'))), "ya no hay un item de nav propio para Aprobar");

  console.log("\n== Enviar cambios ==");
  const before = await p.evaluate(() => App.sel.unsentCount());
  await p.evaluate(() => App.act.sendAll()); await wait(p, 800);
  ok(before > 0 && (await p.evaluate(() => App.sel.unsentCount())) === 0, "Enviar cambios deja todo enviado", before + " -> " + (await p.evaluate(() => App.sel.unsentCount())));
  ok(await p.evaluate(() => window.__auraLog.some((x) => x[0] === "set" && /^changes_/.test(x[2]))), "escribe requests/changes_*");

  console.log("\n== Crear: la nube que flota ==");
  await nav(p, "#hoy", 500); await p.evaluate(() => { const f = document.getElementById("__nofloat"); if (f) f.remove(); window.__sawPre = false; window.__preOpacity = null; new MutationObserver(() => { const c = document.querySelector(".crear-cloud"); if (c && c.classList.contains("arr-pre")) { window.__sawPre = true; if (window.__preOpacity === null) window.__preOpacity = getComputedStyle(c).opacity; } }).observe(document.body, { subtree: true, attributes: true, childList: true }); location.hash = "#crear"; });
  await p.waitForSelector(".crear-cloud", { timeout: 4000 }); await wait(p, 100);
  ok(await p.evaluate(() => !!document.querySelector(".crear-cloud.hero .crliq i") && /¿Qué quer[eé]s crear\?|¿Qué quieres crear\?/.test(document.querySelector(".crear-cloud .msg.ai").textContent)), "Crear es la nube de Jarvis con la pregunta ¿Qué querés crear?");
  ok(await p.evaluate(() => window.__sawPre === true && window.__preOpacity === "0"), "la nube espera invisible mientras la gota vuela desde el orbe");
  await wait(p, 1900);
  ok(await p.evaluate(() => { const c = document.querySelector(".crear-cloud"); return !c.classList.contains("arr-pre") && c.classList.contains("arr-in") && getComputedStyle(c).opacity === "1"; }), "la nube florece al aterrizar la gota");
  ok(await p.evaluate(() => { const c = document.querySelector(".crear-cloud"), kf = [...document.getAnimations()].find((a) => a.effect && a.effect.target === c); const props = kf ? kf.effect.getKeyframes().flatMap((k) => Object.keys(k)) : []; return /crFloat/.test(getComputedStyle(c).animationName) && props.includes("transform") && !props.includes("borderRadius"); }), "queda flotando solo con transform (se compone en la GPU, no repinta la tarjeta)");
  ok(await p.evaluate(() => document.querySelector(".aura").dataset.mood === "focus"), "el fondo se junta detras de la nube");
  await p.evaluate(() => { location.hash = "#hoy"; }); await wait(p, 700);
  ok(await p.evaluate(() => !document.querySelector(".aura").dataset.mood), "al salir de Crear el fondo vuelve a su lugar");
  await p.addStyleTag({ id: "__nofloat", content: ".crear-cloud.jv, .nt-float, .nt-cloud { animation: none !important; }" });

  console.log("\n== Crear: un estilo nuevo (camino A) ==");
  const tmp = path.join(root, "capturas", "_tmp", "clip-prueba.mp4"); fs.mkdirSync(path.dirname(tmp), { recursive: true }); fs.copyFileSync(path.join(root, "app", "dev", "demo.mp4"), tmp);
  await nav(p, "#crear/estilo", 500);
  ok(await p.evaluate(() => !!document.querySelector('[data-act="cresAsk"][data-v="si"]')), "pregunta si hay referencias, links, videos o ideas");
  await p.click('[data-act="cresAsk"][data-v="si"]'); await wait(p, 900);
  ok(await p.evaluate(() => !!document.querySelector("#cresatt")), "pantalla minimalista para subir el material (App.attach)");
  await p.setInputFiles("#cresatt input[type=file]", tmp); await wait(p, 1200);
  ok(await p.evaluate(() => document.querySelectorAll("#cresatt .achip[data-s='done']").length === 1), "sube un video con la misma ficha de adjuntos que el resto de la app");
  ok(await p.evaluate(() => /^Subido ·/.test(document.querySelector("#cresatt .achip[data-s='done'] small").textContent)), "la ficha dice Subido cuando termina (y Subiendo… mientras sube)");
  await p.fill("#cresidea", "Como el de ejemplo pero con mas energia");
  await p.click('[data-act="crescontinue"]'); await wait(p, 900);
  ok(await p.evaluate(() => document.querySelectorAll(".crlike").length === 2), "pasa a marcar que te gusto de cada referencia (video + idea)");
  await p.fill("#creslk0", "el ritmo del corte");
  await p.click('[data-act="cressend"]'); await wait(p, 1500);
  const styleReq = await p.evaluate(() => App.S.requests.find((r) => r.kind === "new_style"));
  ok(!!styleReq && styleReq.refs.length === 2, "crea un pedido new_style con las referencias juntadas", JSON.stringify(styleReq));
  ok(await p.evaluate(() => App.S.refs.filter((r) => r.sent === true).length >= 2), "las referencias quedan enviadas (no en el cajon de Notas)");

  console.log("\n== Crear: un video nuevo (camino B, reels con estilo) ==");
  await nav(p, "#crear/video", 500);
  ok(await p.evaluate(() => document.querySelectorAll(".crsty-grid .crsty").length > 0), "arranca directo en elegi tu estilo o estilos preferidos (biblioteca completa)");
  ok(await p.evaluate(() => document.querySelectorAll('[data-act="crvother"]').length === 2), "long form y long form a short form son formatos aparte, a un toque");
  await p.click(".crsty-grid .crsty >> nth=0"); await wait(p, 300);
  ok(await p.evaluate(() => App.ui.crear.video.styles.length === 1), "elegir un estilo lo marca");
  await p.click('[data-act="crvcontinue"]'); await wait(p, 900);
  const cat = await p.evaluate(() => { const el = document.querySelector('[id^="crvatt-"]'); return el && el.id.replace("crvatt-", ""); });
  ok(cat === "normal", "pide material segun el estilo elegido (condicional)", String(cat));
  await p.setInputFiles(`#crvatt-${cat} input[type=file]`, tmp); await wait(p, 1200);
  await p.click('[data-act="crvcontinue"]'); await wait(p, 1200);
  const videoReq = await p.evaluate(() => App.S.requests.find((r) => r.kind === "new_video" && (r.styles || []).length === 1));
  ok(!!videoReq && videoReq.assets.length === 1 && videoReq.assets[0].purpose === "normal", "pedido de video con el estilo elegido y el material subido", JSON.stringify(videoReq && videoReq.assets));
  await p.click('[data-act="crvrestart"]'); await wait(p, 900); // "Pedir otro video": arranca de nuevo para el siguiente camino

  console.log("\n== Crear: long form a short form ==");
  await nav(p, "#crear/video", 500);
  await p.click('[data-act="crvother"][data-f="long2short"]'); await wait(p, 900);
  ok(await p.evaluate(() => !!document.querySelector("#crvsrcatt") && !document.querySelector(".crsty-grid")), "pide solo el video de origen primero (subida o link), sin la biblioteca");
  await p.click('[data-act="crvsrcmode"][data-m="link"]'); await wait(p, 300);
  await p.fill("#crvsrclink", "https://youtu.be/ejemplo");
  await p.click('[data-act="crvcontinue"]'); await wait(p, 900);
  ok(await p.evaluate(() => document.querySelectorAll(".crsty-grid .crsty").length > 0), "recien ahi elige en que estilo(s) salen los cortos");
  await p.click(".crsty-grid .crsty >> nth=0"); await wait(p, 300);
  await p.click('[data-act="crvcontinue"]'); await wait(p, 1200);
  ok(await p.evaluate(() => App.S.requests.some((r) => r.kind === "new_video" && r.videoFormat === "long2short" && /youtu\.be/.test(r.sourceLink || ""))), "pedido long form a short form con el link (incluso de YouTube)");

  console.log("\n== Notas: la nube que pregunta como mejorar ==");
  await nav(p, "#hoy", 400); await p.evaluate(() => { location.hash = "#notas"; }); await p.waitForSelector("#ntcloud", { timeout: 4000 }); await wait(p, 2100);
  ok(await p.evaluate(() => /¿Cómo puedo mejorar tu experiencia aquí\?/.test(document.querySelector("#ntsay").textContent) && !!document.querySelector("#ntbox") && !document.querySelector(".card") && !document.querySelector(".plist")), "Notas es solo la nube con la pregunta y un espacio para escribir");
  ok(await p.evaluate(() => { const c = getComputedStyle(document.querySelector("#ntcloud")); return /\//.test(c.borderRadius) || c.borderTopLeftRadius !== c.borderTopRightRadius; }), "el contorno de la nube no es un circulo perfecto");
  await p.fill("#ntbox", "Me gustaría ver los números de la semana más grandes"); await p.keyboard.press("Enter"); await wait(p, 900);
  ok(await p.evaluate(() => window.__auraLog.some((x) => x[0] === "set" && /^experiencia_/.test(x[2]) && /números de la semana/.test(x[3].text)) && window.__auraLog.some((x) => x[0] === "tell" && /COMENTARIO SOBRE LA PLATAFORMA/.test(x[1]))), "enviar manda el comentario a Claude en el acto");
  ok(await p.evaluate(() => /Recibido\. ¿Hay algo más\?/.test(document.querySelector("#ntsay").textContent) && document.querySelector("#ntbox").value === ""), "responde Recibido. ¿Hay algo más? y deja escribir otra");
  await p.fill("#ntbox", "Y que el modo noche sea más oscuro"); await p.click("#ntform .rvsend"); await wait(p, 900);
  ok(await p.evaluate(() => window.__auraLog.filter((x) => x[0] === "set" && /^experiencia_/.test(x[2])).length === 2 && /Recibido/.test(document.querySelector("#ntsay").textContent)), "se pueden mandar varios mensajes seguidos");
  await p.click(".nt-end"); await wait(p, 900);
  ok(await p.evaluate(() => /Muchas gracias, haremos lo mejor por mejorar tu experiencia\./.test(document.querySelector("#ntsay").textContent) && getComputedStyle(document.querySelector("#ntform")).display === "none"), "al terminar dice Muchas gracias, haremos lo mejor por mejorar tu experiencia");
  await p.click(".nt-again"); await wait(p, 800);
  ok(await p.evaluate(() => /¿Cómo puedo mejorar/.test(document.querySelector("#ntsay").textContent) && getComputedStyle(document.querySelector("#ntform")).display !== "none"), "se puede volver a escribir otra idea");
  await p.fill("#ntbox", "no"); await p.keyboard.press("Enter"); await wait(p, 900);
  ok(await p.evaluate(() => /Muchas gracias/.test(document.querySelector("#ntsay").textContent) && window.__auraLog.filter((x) => x[0] === "set" && /^experiencia_/.test(x[2])).length === 2), "escribir \"no\" tambien cierra sin mandar nada");

  console.log("\n== Biblioteca y Laboratorio ==");
  await p.evaluate(() => { location.hash = "#biblioteca"; }); await p.waitForFunction(() => document.querySelectorAll(".lib-card").length > 0, null, { timeout: 5000 }).catch(() => {}); await wait(p, 300);
  const nLib = await p.evaluate(() => document.querySelectorAll(".lib-card").length);
  ok(nLib >= 30, "la biblioteca lista el catalogo", String(nLib));
  await p.click('[data-act="libtype"][data-k="transiciones"]'); await wait(p, 500);
  ok(await p.evaluate(() => document.querySelectorAll(".lib-card").length >= 7 && App.route().args[0] === "transiciones"), "filtra por tipo");
  await p.click('[data-act="libtype"][data-k="estilos"]'); await wait(p, 500);
  await p.click(".lib-card >> nth=0"); await wait(p, 500); await p.click('[data-act="libuse"]'); await wait(p, 900);
  ok(await p.evaluate(() => App.route().name === "crear" && App.route().args[0] === "video" && App.ui.crear.video.styles.length === 1), "Usar en un video nuevo lleva a Crear con el estilo elegido");
  await nav(p, "#laboratorio/ronda", 350);
  await p.click('[data-act="labverd"][data-v="keep"] >> nth=3'); await wait(p, 400);
  ok(await p.evaluate(() => App.S.expCards.filter((c) => c.verdict === "keep").length >= 2), "calificar una tarjeta guarda el veredicto");
  await nav(p, "#laboratorio/estilos", 300);
  await p.click('[data-act="labdecide"][data-st="aprobado"] >> nth=0'); await wait(p, 500);
  ok(await p.evaluate(() => App.S.expStyles.filter((s) => s.status === "aprobado").length >= 6), "aprobar un estilo lo pasa a la Biblioteca");

  console.log("\n== Laboratorio: mesa, ADN y recreacion ==");
  await nav(p, "#laboratorio", 400);
  ok(await p.evaluate(() => !!document.querySelector("#lt") && document.querySelectorAll(".seed").length === 6 && document.querySelectorAll(".rt").length >= 4), "la mesa muestra la mesa de luz, referencias y 6 semillas");
  const nRefs = await p.evaluate(() => App.S.refs.length);
  await p.setInputFiles("#ltfile", path.join(root, "app", "dev", "demo.webm"));
  await p.waitForFunction(() => App.route().args[0] === "ref", null, { timeout: 15000 }).catch(() => {}); await wait(p, 1500);
  const newRef = await p.evaluate(() => { const r = App.S.refs.find((x) => x.id === App.route().args[1]); return r ? { pal: (r.dna && r.dna.palette || []).length, ax: r.dna && r.dna.axes, thumbs: (r.dna && r.dna.thumbs || []).length, rec: !!r.recipe, asset: !!r.assetId } : null; });
  ok(newRef && newRef.pal >= 3 && newRef.ax && newRef.thumbs >= 3 && newRef.rec, "soltar un video lee su ADN (paleta, ejes, cuadros) y abre la Estacion", JSON.stringify(newRef));
  ok(await p.evaluate((n) => App.S.refs.length === n + 1, nRefs), "la referencia queda guardada en refs");
  ok(await p.evaluate(() => !!document.querySelector("#lab-stage .st-stage") && !!document.querySelector("#lab-radar svg .shape")), "la Estacion recrea en vivo con el motor del Estudio y dibuja el radar");
  await p.click('#lab-ctl button[data-rk="font"][data-v="Inter"]'); await wait(p, 1700);
  ok(await p.evaluate(() => { const r = App.S.refs.find((x) => x.id === App.route().args[1]); return r && r.recipe && r.recipe.font === "Inter"; }), "tocar la receta la guarda en la referencia");
  await p.selectOption("#lab-mixwith", "seed:neon"); await wait(p, 400);
  ok(await p.evaluate(() => !document.querySelector("#lab-mixrow").hidden), "mezclar con una semilla muestra el control de mezcla");
  await p.click('[data-act="labsave"]'); await wait(p, 500); await p.fill("#lab-name", "Mi estilo de prueba"); await p.click("#lab-save-go"); await wait(p, 900);
  ok(await p.evaluate(() => App.S.expStyles.some((s) => s.name === "Mi estilo de prueba" && s.recipe && s.status === "aprobado" && /^r-/.test(s.demo))), "guardar estilo lo deja aprobado con su receta");
  await p.click("#lab-use"); await wait(p, 900);
  ok(await p.evaluate(() => { const v = App.ui.crear.video; if (!v || v.styles.length !== 1) return false; const it = App.lib.catalog().find((x) => x.id === v.styles[0]); return App.route().name === "crear" && App.route().args[0] === "video" && !!it && it.name === "Mi estilo de prueba"; }), "Usar en un video nuevo lleva a Crear con el estilo elegido");
  await nav(p, "#laboratorio/semilla/calma", 600);
  ok(await p.evaluate(() => /Calma/.test(document.querySelector(".stn-h h1").textContent) && !!document.querySelector("#lab-stage .st-stage")), "una semilla abre su Estacion");
  await p.click('[data-act="labclaude"]'); await wait(p, 400); await p.fill("#lab-cnote", "con mi foto de fondo"); await p.click("#lab-c-go"); await wait(p, 700);
  ok(await p.evaluate(() => window.__auraLog.some((x) => x[1] === "requests" && /^recreate_/.test(x[2] || ""))), "Pedirle a Claude escribe requests/recreate_<ts>");
  await nav(p, "#biblioteca", 400);
  ok(await p.evaluate(() => document.querySelectorAll(".lib-card .xd-rcp").length >= 2), "los estilos del Laboratorio se ven en la Biblioteca");

  console.log("\n== Metricas (sin pantalla de Logros, los hitos viven aca: DECISIONES.md #1) ==");
  await nav(p, "#metricas", 450);
  ok(await p.evaluate(() => document.querySelectorAll(".stat").length === 4 && document.querySelectorAll(".top li").length >= 5), "metricas: tarjetas y mejores reels");
  await p.click('[data-act="mrange"][data-k="7"]'); await wait(p, 400); await p.click('[data-act="mscope"][data-k="kt-en"]'); await wait(p, 400);
  ok(await p.evaluate(() => /KT English/.test(document.querySelector(".vhead .eyebrow").textContent)), "filtra por cuenta");
  await p.click('[data-act="mscope"][data-k="total"]'); await wait(p, 300);
  ok(!(await p.evaluate(() => !!document.querySelector('[data-nav="logros"]'))), "ya no hay un item de nav propio para Logros");
  await p.evaluate(() => { location.hash = "#logros"; }); await wait(p, 400);
  ok(await p.evaluate(() => App.route().name === "metricas"), "#logros (hash viejo) redirige a Metricas");

  console.log("\n== Estudio: editor completo ==");
  const ed = await p.evaluate(() => App.S.studioVersions.find((x) => x.spec).id);
  await p.evaluate((id) => { location.hash = "#estudio/editor/" + encodeURIComponent(id); }, ed); await wait(p, 2200);
  ok(await p.evaluate(() => !!(App.st.SE && App.st.SE.handle && App.st.SE.spec)), "abre el editor con el motor original");
  // v1/v2/v3: se cambia de version SIN salir del editor
  const otherV = await p.evaluate((id) => { const v = App.sel.video(id); const o = App.sel.siblings(v).find((x) => x.id !== id); return o ? o.id : null; }, ed);
  ok(!!otherV, "la pieza tiene mas de una version para cambiar");
  await p.click(`.st-vc[data-vid="${otherV}"]`); await wait(p, 1800);
  ok(await p.evaluate((id) => App.route().args[0] === "editor" && App.route().args[1] === id && !!App.st.SE && App.st.SE.vid === id && !document.getElementById("st").hidden && App.studioOpen === true, otherV), "cambiar de version sigue en el editor (no vuelve a la vista general)");
  await p.click(`.st-vc[data-vid="${ed}"]`); await wait(p, 2000);
  ok(await p.evaluate((id) => App.route().args[0] === "editor" && !!App.st.SE && App.st.SE.vid === id && !!App.st.SE.spec && !document.getElementById("st").hidden, ed), "y se puede volver a la primera sin salir del editor");
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
  await p.click("#st-ask-btn"); await wait(p, 450);
  ok(await p.evaluate(() => !document.querySelector("#st-ipane .st-chips") && !document.querySelector("#st-ipane [data-ex]")), "el chat de Pedirle a Claude ya no trae sugerencias debajo");
  ok(await p.evaluate(() => { const f = document.querySelector(".jv-fab"), r = f.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return getComputedStyle(f).display !== "none" && r.width > 30 && !!(t && t.closest(".jv-fab")); }), "dentro del editor el orbe de Jarvis sigue visible y se puede tocar");
  await p.fill("#st-ask-text", "Pon un iris en el fondo"); await p.click("#st-ask-go"); await wait(p, 800);
  ok(await p.evaluate(() => App.S.studioRequests.some((r) => /iris/.test(r.text) && r.status === "pedido")), "pedirle a Claude crea studio_requests con pasos por hacer");
  await p.click('[data-tool="exportar"]'); await wait(p, 450); await p.click("#st-dl-srt"); await wait(p, 500);
  ok(await p.evaluate(() => window.__auraLog.some((x) => x[0] === "download" && /\.srt$/.test(x[1]))), "exporta subtitulos SRT");
  // publicado como artefacto (aun en modo demostracion) el visor ofrece la capacidad `downloads` y rechaza .srt: se ofrece como .txt
  await p.evaluate(() => { window.__dlSaved = []; window.claude = { use: async (n) => (n === "downloads" ? { save: async (r) => { if (/\.srt$/i.test(r.filename)) throw { code: "rejected_extension", message: "no" }; window.__dlSaved.push(r.filename); return { status: "saved" }; } } : null) }; });
  await p.click("#st-dl-srt"); await wait(p, 600);
  ok(await p.evaluate(() => window.__dlSaved.some((f) => /\.srt\.txt$/.test(f))), "las descargas usan la capacidad del visor y ofrecen .txt si .srt no esta permitido");
  await p.evaluate(() => { delete window.claude; delete window.__dlSaved; });
  for (let i = 0; i < 4 && (await p.evaluate(() => !!App.studioOpen)); i++) { await p.keyboard.press("Escape"); await wait(p, 450); }
  ok(await p.evaluate(() => App.route().name === "estudio" && !App.studioOpen), "Esc cierra el editor");

  console.log("\n== Jarvis, tema y rutas ==");
  await nav(p, "#hoy", 300);
  // abrir de nuevo con el cierre anterior a medias (y con un cambio de pantalla en el medio) NUNCA deja el panel invisible ("se abre pero luego desaparece")
  for (let i = 0; i < 4; i++) {
    await p.evaluate((i) => { if (App.jarvis.isOpen()) App.jarvis.close(); location.hash = "#" + ["crear", "biblioteca", "metricas", "hoy"][i]; }, i); await wait(p, i % 2 ? 900 : 300);
    await p.evaluate(() => App.jarvis.open()); await wait(p, 2600);
    const st = await p.evaluate(() => { const pn = document.querySelector("#jv"), cs = getComputedStyle(pn), r = pn.getBoundingClientRect(); return { op: cs.opacity, clip: cs.clipPath, w: Math.round(r.width), open: App.jarvis.isOpen() }; });
    ok(st.open && st.op === "1" && st.clip === "none" && st.w > 300, "reabrir Jarvis con el cierre anterior a medias lo deja visible (vuelta " + (i + 1) + ")", JSON.stringify(st));
    if (!(st.op === "1")) break;
  }
  await p.evaluate(() => { if (App.jarvis.isOpen()) App.jarvis.close(); }); await wait(p, 2200);
  // el derrame liquido (DECISIONES.md #17) termina limpio: panel opaco, sin recorte ni animaciones colgadas, capa del morph vacia, grano apagado bajo el velo
  await p.evaluate(() => App.jarvis.open()); await wait(p, 2600);
  const fin = await p.evaluate(() => { const pn = document.querySelector("#jv"), cs = getComputedStyle(pn); return { op: cs.opacity, clip: cs.clipPath, anims: pn.getAnimations().length, morph: document.querySelector("#morph").children.length, grain: getComputedStyle(document.querySelector(".grain")).visibility }; });
  ok(fin.op === "1" && fin.clip === "none" && fin.anims === 0 && fin.morph === 0 && fin.grain === "hidden", "Jarvis abierto: panel opaco sin recorte ni animaciones colgadas y la capa del morph vacia", JSON.stringify(fin));
  // cerrar con la gota todavia en el aire y volver a abrir enseguida: queda abierto y visible
  await p.evaluate(() => App.jarvis.close()); await wait(p, 2200);
  await p.evaluate(() => { App.jarvis.open(); setTimeout(() => App.jarvis.close(), 120); setTimeout(() => App.jarvis.open(), 320); }); await wait(p, 3000);
  const rr = await p.evaluate(() => { const pn = document.querySelector("#jv"), cs = getComputedStyle(pn); return { open: App.jarvis.isOpen(), op: cs.opacity, morph: document.querySelector("#morph").children.length }; });
  ok(rr.open && rr.op === "1" && rr.morph === 0, "abrir, cerrar en pleno vuelo y reabrir deja el panel visible", JSON.stringify(rr));
  await p.evaluate(() => App.jarvis.close()); await wait(p, 2400);
  const cl = await p.evaluate(() => ({ wrap: document.querySelector("#jvwrap").className, morph: document.querySelector("#morph").children.length, root: document.getElementById("aura-root").className, orbs: [...document.querySelectorAll(".orb[data-orb], .jv-fab")].every((o) => o.style.visibility === "") }));
  ok(!/\bopen\b/.test(cl.wrap) && cl.morph === 0 && !/\bmo(-v)?\b/.test(cl.root) && cl.orbs, "al cerrar no queda nada: ni gotas, ni modo liviano, ni orbes escondidas", JSON.stringify(cl));
  // desde el orbe flotante: la gota sale de el y vuelve a el (antes su orbe interno, sin data-orb, quedaba escondido para siempre al cerrar)
  await p.click(".jv-fab"); await wait(p, 2400); await p.keyboard.press("Escape"); await wait(p, 2400);
  ok(await p.evaluate(() => !App.jarvis.isOpen() && document.querySelector(".jv-fab .orb").style.visibility === "" && getComputedStyle(document.querySelector(".jv-fab")).opacity === "1"), "abrir y cerrar desde el orbe flotante lo deja visible");
  await p.keyboard.press("Control+k"); await wait(p, 1100);
  ok(await p.evaluate(() => App.jarvis.isOpen() && document.querySelectorAll("#jvcmds button").length >= 4), "Ctrl+K abre Jarvis con comandos");
  await p.fill("#jvbox", "aprobar"); await p.keyboard.press("Enter"); await p.waitForFunction(() => App.route().name === "estudio" && !App.jarvis.isOpen(), null, { timeout: 4000 }).catch(() => {}); await wait(p, 300);
  ok(await p.evaluate(() => App.route().name === "estudio" && !App.jarvis.isOpen()), "un comando lleva a la pantalla y cierra el panel");
  await wait(p, 1600);
  const nv = await p.evaluate(() => ({ wrap: document.querySelector("#jvwrap").className, morph: document.querySelector("#morph").children.length, root: document.getElementById("aura-root").className, nav: App._morphNav }));
  ok(!/\bopen\b/.test(nv.wrap) && nv.morph === 0 && !/\bmo(-v)?\b/.test(nv.root) && !nv.nav, "despues de llevarte a otra pantalla no queda nada colgado (gotas, velo, modo liviano)", JSON.stringify(nv));
  await nav(p, "#hoy", 300); await p.click('[data-act="theme"]'); await p.waitForFunction(() => document.documentElement.getAttribute("data-aura") === "night", null, { timeout: 4000 }).catch(() => {}); await wait(p, 300);
  const th = await p.evaluate(() => document.documentElement.getAttribute("data-aura") + "|" + getComputedStyle(document.documentElement).getPropertyValue("--base").trim());
  ok(/^night\|#06100f/.test(th), "el boton cambia a noche", th);
  await p.reload(); await wait(p, 1500);
  ok(await p.evaluate(() => document.documentElement.getAttribute("data-aura") === "night"), "recuerda la noche al recargar");
  ok(p.errs.length === 0, "sin errores de consola en el recorrido demo", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  console.log("\n== Preset Lumen (otra marca) ==");
  p = await open(browser, "?demo=1&preset=lumen#hoy");
  ok(await p.evaluate(() => App.config.id === "lumen" && App.S.brands.length === 3), "carga otro espacio con 3 cuentas");
  ok(!(await p.evaluate(() => /\bKT\b|Kevin|Trudeau|Teacher/.test(document.body.innerText))), "ninguna referencia a KT en el otro espacio");
  await nav(p, "#crear", 300);
  ok(await p.evaluate(() => document.querySelectorAll(".crear-path").length === 3), "Crear funciona igual en otro espacio (Grabar, estilo nuevo y video nuevo)");
  await nav(p, "#metricas", 450);
  ok(await p.evaluate(() => document.querySelectorAll(".stat").length === 4), "metricas del otro espacio");
  ok(p.errs.length === 0, "sin errores en el preset Lumen", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  console.log("\n== Adaptador Claude (simulador de capacidades) ==");
  p = await open(browser, "?preset=kt#hoy", mockSrc); await wait(p, 600);
  ok(await p.evaluate(() => App.S.mode === "claude"), "con window.claude usa el adaptador real");
  ok(await p.evaluate(() => App.S.videos.length === 0), "una base vacia no inventa datos");
  await nav(p, "#ajustes", 300);
  ok(await p.evaluate(() => !!document.querySelector('[data-act="seeddemo"]')), "ofrece cargar datos de ejemplo cuando esta vacia");
  await p.click('[data-act="seeddemo"]'); await wait(p, 5000);
  ok(await p.evaluate(() => App.S.videos.length > 20 && Object.keys(window.__mock.data.videos).length > 20), "los datos se escriben en la base y vuelven por onSnapshot");
  await nav(p, "#hoy", 450);
  const vid = await p.evaluate(() => App.sel.pending()[0].id);
  await p.evaluate((id) => App.act.setStatus(App.sel.video(id), "approved"), vid); await wait(p, 5000);
  ok(await p.evaluate((id) => window.__mock.data.videos[id].status === "approved", vid), "aprobar escribe en videos/<id>");
  ok(await p.evaluate(() => !!window.__mock.data.requests.schedule_kt_es || Object.keys(window.__mock.data.requests).some((k) => /^schedule_/.test(k))), "escribe requests/schedule_<cuenta>");
  ok(await p.evaluate(() => window.__mock.tells.some((t) => /APROB/.test(t))), "avisa por comments.sendToClaude");
  ok(await p.evaluate(() => App.S.claudeState === "available"), "estado de Claude disponible");
  await nav(p, "#metricas", 900);
  ok(await p.evaluate(() => window.__mock.calls.length >= 2 && window.__mock.calls.some((c) => c[0] === "metricool")), "Metricas llama a mcp.callTool(metricool)");
  ok(await p.evaluate(() => Object.keys(window.__mock.data.metrics || {}).length >= 1), "guarda copia de las metricas en la base");
  await nav(p, "#crear/estilo", 300);
  await p.click('[data-act="cresAsk"][data-v="si"]'); await wait(p, 900);
  await p.setInputFiles("#cresatt input[type=file]", tmp); await wait(p, 1200);
  ok(await p.evaluate(() => { const it = document.querySelector("#cresatt .achip[data-s='done']"); return window.__mock.uploads.length === 1 && !!it; }), "subir usa assets.upload", JSON.stringify(await p.evaluate(() => window.__mock.uploads)));
  ok(await p.evaluate(() => /^[0-9a-f]{32}$/.test(window.__mock.uploads[0][2])), "y guarda el id que devuelve la capacidad de archivos");
  await p.evaluate(() => { location.hash = "#estudio"; }); await wait(p, 600);
  const edSim = await p.evaluate(() => (App.S.studioVersions.find((x) => x.spec) || {}).id);
  await p.evaluate((id) => { location.hash = "#estudio/editor/" + encodeURIComponent(id); }, edSim); await wait(p, 2200);
  ok(await p.evaluate(() => !!(App.st.SE && App.st.SE.handle && App.st.SE.spec)), "abre el Estudio de un video con spec contra el simulador");
  await p.keyboard.press("Escape"); await wait(p, 500);
  await p.evaluate(() => { location.hash = "#hoy"; }); await wait(p, 500);
  await p.keyboard.press("Control+k"); await wait(p, 1100);
  await p.fill("#jvbox", "llevame a biblioteca"); await p.keyboard.press("Enter");
  await p.waitForFunction(() => App.route().name === "biblioteca" && !App.jarvis.isOpen(), null, { timeout: 4000 }).catch(() => {}); await wait(p, 300);
  ok(await p.evaluate(() => App.route().name === "biblioteca" && !App.jarvis.isOpen()), "Jarvis responde y navega con sample()+herramientas contra el simulador");
  ok(await p.evaluate(() => window.__mock.sampleCalls.length >= 1), "el simulador registra el turno de Jarvis (sampleCalls)");
  ok(p.errs.length === 0, "sin errores con el adaptador real", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  console.log("\n== Modelo e intensidad ==");
  p = await open(browser, "?demo=1&preset=kt#hoy");
  ok(await p.evaluate(() => { const c = App.ai.get(); return c.model === "claude-sonnet-5-5" && c.effort === "medium"; }), "el modelo de siempre es Sonnet 5.5 con intensidad media");
  await p.evaluate(() => App.jarvis.open(null)); await wait(p, 1500);
  ok(await p.evaluate(() => /Sonnet 5\.5/.test(document.querySelector("#jv .aipill").textContent)), "Jarvis muestra el modelo en la cabecera");
  await p.click("#jv .aipill"); await wait(p, 500);
  ok(await p.evaluate(() => !!document.querySelector(".aimenu") && document.querySelectorAll(".aimenu .aim-m").length === 4 && document.querySelectorAll(".aimenu .aim-seg button").length === 3), "el menu ofrece 4 modelos y 3 intensidades");
  await p.click('.aimenu [data-m="claude-opus-5-5"]'); await p.click('.aimenu [data-e="high"]'); await wait(p, 200);
  ok(await p.evaluate(() => { const c = App.ai.get(); return c.model === "claude-opus-5-5" && c.effort === "high" && /Opus 5\.5/.test(document.querySelector("#jv .aipill").textContent); }), "cambiar modelo e intensidad se guarda y se ve en la pastilla");
  await p.keyboard.press("Escape"); await p.waitForFunction(() => !document.querySelector(".aimenu"), null, { timeout: 3000 }).catch(() => {}); await wait(p, 200);
  ok(await p.evaluate(() => !document.querySelector(".aimenu") && App.jarvis.isOpen()), "Esc cierra solo el menu");
  await p.evaluate(() => App.jarvis.close()); await wait(p, 1200);
  await p.reload(); await wait(p, 1500);
  ok(await p.evaluate(() => App.ai.get().model === "claude-opus-5-5" && App.ai.get().effort === "high"), "se recuerda al recargar");
  await nav(p, "#ajustes", 400);
  ok(await p.evaluate(() => /Opus 5\.5/.test(document.querySelector('.aipill[data-ai="global"]').textContent)), "Ajustes muestra y cambia el modelo de siempre");
  await nav(p, "#crear/video", 450);
  ok(await p.evaluate(() => /Opus 5\.5/.test(document.querySelector('.crear-cloud .aipill[data-ai="draft"]').textContent)), "Crear arranca con el modelo de siempre");
  await p.click('.crear-cloud .aipill[data-ai="draft"]'); await wait(p, 300); await p.click('.aimenu [data-m="claude-haiku-5-5"]'); await p.keyboard.press("Escape"); await wait(p, 300);
  ok(await p.evaluate(() => App.ai.get("global").model === "claude-opus-5-5" && App.ai.get("draft").model === "claude-haiku-5-5"), "en Crear el modelo cambia solo para ese pedido");
  await p.click('[data-act="crvother"][data-f="long"]'); await wait(p, 900);
  await p.setInputFiles("#crvatt-normal input[type=file]", tmp); await wait(p, 1200);
  await p.click('[data-act="crvcontinue"]'); await wait(p, 1200);
  ok(await p.evaluate(() => { const r = window.__auraLog.filter((x) => x[0] === "set" && /^new_/.test(x[2])).pop(); return !!r && r[3].model === "claude-haiku-5-5" && r[3].effort === "high"; }), "el pedido de video lleva el modelo elegido");
  ok(await p.evaluate(() => window.__auraLog.some((x) => x[0] === "tell" && /Modelo pedido: Haiku 5\.5/.test(x[1]))), "el aviso a Claude dice con que modelo hacerlo");
  ok(await p.evaluate(() => App.ai.get("draft").model === "claude-opus-5-5"), "despues de enviar, Crear vuelve al modelo de siempre");
  await p.evaluate(() => { localStorage.removeItem("aura:ai"); });
  const ed2 = await p.evaluate(() => App.S.studioVersions.find((x) => x.spec).id);
  await p.evaluate((id) => { location.hash = "#estudio/editor/" + encodeURIComponent(id); }, ed2); await wait(p, 2200);
  await p.click("#st-ask-btn"); await wait(p, 600);
  ok(await p.evaluate(() => !!document.querySelector('#st-ipane .aipill') && /Sonnet 5\.5/.test(document.querySelector('#st-ipane .aipill').textContent)), "el chat del Estudio muestra el modelo");
  await p.click('#st-ipane .aipill'); await wait(p, 300); await p.click('.aimenu [data-e="low"]'); await p.keyboard.press("Escape"); await wait(p, 200);
  await p.fill("#st-ask-text", "Prueba de intensidad"); await p.click("#st-ask-go"); await wait(p, 900);
  ok(await p.evaluate(() => { const r = App.S.studioRequests.find((x) => x.text === "Prueba de intensidad"); return !!r && r.model === "claude-sonnet-5-5" && r.effort === "low"; }), "el pedido del Estudio lleva modelo e intensidad");
  ok(p.errs.length === 0, "sin errores con el selector de modelo", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  console.log("\n== Chats: modelo real y archivos adjuntos ==");
  p = await open(browser, "?preset=kt#hoy", mockSrc); await wait(p, 500);
  await p.click('[data-act="seeddemo"]').catch(() => {}); 
  await nav(p, "#ajustes", 300); await p.click('[data-act="seeddemo"]'); await wait(p, 5000);
  await nav(p, "#hoy", 500);
  await p.evaluate(() => { const c = App.ai; c.contexts.global.set({ model: "claude-opus-5-5", effort: "high" }); c.paint(); });
  await p.evaluate(() => App.jarvis.open(null)); await wait(p, 1600);
  await p.fill("#jvbox", "cuantos videos tengo por aprobar"); await p.keyboard.press("Enter"); await wait(p, 1200);
  ok(await p.evaluate(() => window.__mock.sampleCalls.length === 1 && window.__mock.sampleCalls[0].opts.model === "claude-opus-5-5" && window.__mock.sampleCalls[0].opts.effort === "high" && window.__mock.sampleCalls[0].opts.modelTier === "complex" && window.__mock.sampleCalls[0].opts.cache === false), "Jarvis le pide a Claude el modelo y la intensidad elegidos", JSON.stringify(await p.evaluate(() => window.__mock.sampleCalls.map((x) => x.opts))));
  ok(await p.evaluate(() => !document.querySelector("#jvlog .msg-note")), "si el modelo respondio, no hay aviso de sustitucion");
  const png = path.join(root, "capturas", "_tmp", "foto-prueba.png"); fs.writeFileSync(png, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));
  const vid2 = path.join(root, "app", "dev", "demo.webm");
  await p.setInputFiles("#jv [data-att-in]", [vid2, png]); await wait(p, 1500);
  ok(await p.evaluate(() => document.querySelectorAll("#jv .achip").length === 2 && document.querySelectorAll('#jv .achip[data-s="done"]').length === 2 && window.__mock.uploads.length === 2), "adjuntar un video y una imagen los sube con assets.upload");
  await p.fill("#jvbox", "ponle subtitulos grandes a este video"); await p.keyboard.press("Enter"); await wait(p, 1500);
  ok(await p.evaluate(() => document.querySelectorAll("#jvlog .msg.me .achip").length === 2 && document.querySelectorAll("#jv .atts:not(.sent) .achip").length === 0), "al enviar, los adjuntos quedan en la burbuja y se vacia el compositor");
  ok(await p.evaluate(() => { const l = window.__mock.sampleCalls[1]; return l.opts.images === 1 && /ADJUNTOS DE ESTE MENSAJE/.test(l.last) && /demo\.webm/.test(l.last); }), "Claude recibe la lista de adjuntos y la imagen para verla", JSON.stringify(await p.evaluate(() => window.__mock.sampleCalls[1])));
  const aid = await p.evaluate(() => window.__mock.uploads[0][2]);
  const toolRes = await p.evaluate(async (id) => { const t = App.jarvis.tools().find((x) => x.name === "ask_claude"); return await t.execute({ task: "Subtitula este video con letra grande", attachments: [id] }); }, aid);
  ok(/Claude/.test(String(toolRes)) && await p.evaluate((id) => { const r = Object.entries(window.__mock.data.requests).find(([k]) => /^jarvis_/.test(k)); return !!r && r[1].assets && r[1].assets[0].id === id && r[1].model === "claude-opus-5-5" && r[1].effort === "high"; }, aid), "ask_claude escribe requests/jarvis_* con los archivos y el modelo");
  ok(await p.evaluate(() => window.__mock.tells.some((t) => /PEDIDO DESDE JARVIS/.test(t) && /archivo adjunto/.test(t) && /Opus 5\.5/.test(t))), "el aviso a Claude menciona los archivos y el modelo");
  await p.evaluate(() => { document.querySelector("#jv [data-att-in]").dispatchEvent(new Event("change")); });
  await p.setInputFiles("#jv [data-att-in]", { name: "documento.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: Buffer.from("x") }); await wait(p, 500);
  ok(await p.evaluate(() => document.querySelectorAll("#jv .atts:not(.sent) .achip").length === 0 && /no se puede subir/.test(document.querySelector("#toasts").textContent)), "un tipo de archivo no permitido se rechaza con un aviso");
  await p.setInputFiles("#jv [data-att-in]", { name: "enorme.mp4", mimeType: "video/mp4", buffer: Buffer.alloc(20 * 1024 * 1024) }); await wait(p, 800);
  ok(await p.evaluate(() => { const c = document.querySelector('#jv .atts:not(.sent) .achip'); return !!c && c.dataset.s === "err" && /19 MB/.test(c.textContent); }), "un archivo de mas de 19 MB se marca con error");
  await p.click("#jv .atts:not(.sent) .atx"); await wait(p, 300);
  ok(await p.evaluate(() => document.querySelectorAll("#jv .atts:not(.sent) .achip").length === 0), "se puede quitar un adjunto");
  await p.evaluate(() => App.jarvis.close()); await wait(p, 1200);
  const ed3 = await p.evaluate(() => App.S.studioVersions.find((x) => x.spec).id);
  await p.evaluate((id) => { location.hash = "#estudio/editor/" + encodeURIComponent(id); }, ed3); await wait(p, 2400);
  await p.click("#st-ask-btn"); await wait(p, 600);
  await p.setInputFiles('#st-ipane [data-att-in]', png); await wait(p, 1000);
  await p.fill("#st-ask-text", "Usa esta foto de fondo"); await p.click("#st-ask-go"); await wait(p, 1200);
  ok(await p.evaluate(() => { const r = Object.values(window.__mock.data.studio_requests || {}).find((x) => x.text === "Usa esta foto de fondo"); return !!r && r.assets && r.assets.length === 1 && /^[0-9a-f]{32}$/.test(r.assets[0].id) && r.model === "claude-opus-5-5"; }), "el pedido del Estudio incluye el archivo adjunto y el modelo");
  ok(p.errs.length === 0, "sin errores con adjuntos", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  console.log("\n== Hoy y Metricas: hitos sin pantalla propia, y la celebracion (DECISIONES.md #1) ==");
  p = await open(browser, "?demo=1&preset=kt#notas", null, null, { cel: true }); await wait(p, 2400);
  ok(await p.evaluate(() => !!document.querySelector('.nv[data-nav="metricas"] b') && !App.celebrate.isOpen()), "el riel marca los hitos nuevos en Métricas sin interrumpir otra pantalla");
  await nav(p, "#hoy", 300);
  ok(await p.evaluate(() => !document.querySelector(".tcard") && document.querySelector(".cards").children[0].classList.contains("an")), "Hoy ya no tiene una tarjeta de Logros: la primera es Analiticas");
  ok(await p.evaluate(() => document.querySelectorAll(".an-s").length === 4 && document.querySelectorAll(".an-s .spk svg").length >= 3), "las cuatro cifras de la semana con su curva");
  await p.waitForFunction(() => App.celebrate.isOpen(), null, { timeout: 8000 }).catch(() => {}); await p.waitForSelector(".cel-slide[data-on] .cel-t", { timeout: 9000 }).catch(() => {}); await wait(p, 600);
  const confeti = await p.evaluate(() => document.querySelectorAll("#celwrap .confeti i").length); await wait(p, 1600);
  ok(confeti >= 30, "la celebracion lanza confeti en los colores de la marca");
  ok(await p.evaluate(() => App.celebrate.isOpen() && document.querySelectorAll(".cel-slide").length >= 2 && document.querySelector(".cel-slide[data-on] .cel-t").textContent.length > 3 && +getComputedStyle(document.querySelector(".cel-slide[data-on] .cel-t")).opacity > 0.9), "al entrar a Hoy se celebra el hito nuevo con la tarjeta de la gota");
  ok(await p.evaluate(() => /¡|Buen trabajo|hace|Excelente|vas muy bien|esfuerzo/i.test(document.querySelector(".cel-slide[data-on] .cel-t").textContent)), "el titulo felicita, no solo informa el numero");
  ok(await p.evaluate(() => document.querySelector(".cel-slide[data-on] .cel-p").textContent.length > 10), "hay una frase motivacional ademas del dato");
  ok(await p.evaluate(() => !document.querySelector(".cel-slide.level") && !document.querySelector(".cel-xp") && !/XP|nivel/i.test(document.querySelector("#celwrap").textContent)), "la celebracion no habla de niveles ni de XP: solo reconoce el hito");
  for (let i = 0; i < 6 && (await p.evaluate(() => App.celebrate.isOpen())); i++) { await p.click("#celnext"); await wait(p, 1500); }
  await wait(p, 1200);
  ok(await p.evaluate(() => App.route().name === "hoy"), "al cerrar vuelve a la pantalla desde la que se abrio");
  ok(await p.evaluate(() => !App.celebrate.isOpen() && App.trophies.newIds(App.trophies.all(App.trophies.cards())).length === 0 && !document.querySelector('.nv[data-nav="metricas"] b')), "al cerrar queda como visto y desaparece la marca del riel");
  ok(await p.evaluate(() => window.__auraLog.some((x) => (x[0] === "set" || x[0] === "update") && x[1] === "home" && x[2] === "trophies")), "guarda en la base cuales hitos ya vio");
  ok(p.errs.length === 0, "sin errores en la celebracion desde Hoy", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  // entrar directo a Metricas (sin pasar por Hoy) tambien celebra: ahi es donde viven los hitos ahora, no solo en Hoy
  p = await open(browser, "?demo=1&preset=kt#metricas", null, null, { cel: true });
  await p.waitForFunction(() => App.celebrate.isOpen(), null, { timeout: 9000 }).catch(() => {}); await wait(p, 1500);
  ok(await p.evaluate(() => App.celebrate.isOpen()), "entrar directo a Metricas tambien celebra un hito nuevo");
  await p.keyboard.press("Escape"); await wait(p, 1200);
  ok(await p.evaluate(() => !App.celebrate.isOpen() && App.route().name === "metricas"), "Esc la cierra y queda en Metricas");
  await nav(p, "#ajustes", 400); await p.click('[data-act="celebratetest"]'); await wait(p, 2800);
  ok(await p.evaluate(() => App.celebrate.isOpen()), "Ajustes permite probar la animacion en modo demostracion");
  await p.keyboard.press("Escape"); await wait(p, 1500);
  ok(await p.evaluate(() => !App.celebrate.isOpen()), "Esc cierra la celebracion");
  ok(p.errs.length === 0, "sin errores en la celebracion", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  console.log("\n== Telefono ==");
  p = await open(browser, "?demo=1&preset=kt#hoy", null, { width: 390, height: 844 });
  ok(await p.evaluate(() => getComputedStyle(document.querySelector("#tabbar")).display !== "none" && getComputedStyle(document.querySelector("#rail")).display === "none"), "barra inferior en telefono y sin riel");
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Hoy no tiene scroll horizontal");
  // el contenedor principal recorta el desborde (overflow-x: clip), asi que ademas del scroll se revisa que nada visible se salga de la pantalla
  const spill = () => document.querySelector("#main") && [...document.querySelectorAll("#main *")].filter((e) => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.right <= innerWidth + 2) return false; for (let a = e.parentElement; a && a.id !== "main"; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return false; } return getComputedStyle(e).position !== "fixed"; }).slice(0, 3).map((e) => e.tagName.toLowerCase() + "." + String(e.className).split(" ").slice(0, 2).join(".")).join(" | ");
  for (const r of ["hoy", "crear", "biblioteca", "laboratorio", "metricas", "notas", "estudio", "ajustes"]) { await nav(p, "#" + r, 500); ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), r + " sin scroll horizontal", String(await p.evaluate(() => document.documentElement.scrollWidth))); const sp = await p.evaluate(spill); ok(!sp, r + " no se sale de la pantalla", sp); }
  // la nube de Crear y de Notas en telefono: compactas (no una hoja de pantalla completa) y con las dos opciones lado a lado
  await nav(p, "#crear", 2400);
  ok(await p.evaluate(() => { const c = document.querySelector(".crear-cloud").getBoundingClientRect(), a = [...document.querySelectorAll(".crear-cloud .crear-path")].map((e) => e.getBoundingClientRect()); return c.height < innerHeight * 0.6 && a.length === 3 && Math.abs(a[0].top - a[1].top) < 4 && Math.abs(a[1].top - a[2].top) < 4; }), "en telefono la gota de Crear es compacta y las tres opciones van lado a lado");
  await nav(p, "#notas", 2400);
  ok(await p.evaluate(() => { const c = document.querySelector("#ntcloud").getBoundingClientRect(), f = document.querySelector("#ntform").getBoundingClientRect(); return c.left >= -1 && c.right <= innerWidth + 1 && f.left >= c.left && f.right <= c.right && f.height >= 44; }), "en telefono Notas cabe en la pantalla y el campo queda dentro de la nube");
  await p.evaluate(() => { const v = App.sel.pending()[0]; location.hash = "#estudio/ver/" + encodeURIComponent(v.id); }); await wait(p, 1200);
  ok(await p.evaluate(() => { const b = document.querySelector("#rvdecide").getBoundingClientRect(); return b.bottom <= innerHeight && b.top > 300; }), "la capsula de decision queda visible sobre la barra");
  ok(p.errs.length === 0, "sin errores en telefono", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  await browser.close();
  console.log(`\n${pass} ok, ${fail} fallan`); if (fail) { console.log(failures.join("\n")); }
  // pruebas extra por funcion (cada archivo es independiente, ver tools/lib-test.cjs): se corren al final y se suman al resultado
  let extraFail = 0;
  for (const f of process.env.CORE_ONLY ? [] : ["test-empieza.cjs", "test-grabar.cjs", "test-teleprompter.cjs"]) { // CORE_ONLY=1: solo la suite de la app
    const fp = path.join(__dirname, f); if (!fs.existsSync(fp)) continue;
    console.log("\n== " + f + " =="); const r = require("node:child_process").spawnSync(process.execPath, [fp], { stdio: "inherit" }); if (r.status !== 0) extraFail++;
  }
  if (fail || extraFail) process.exit(1);
})();
