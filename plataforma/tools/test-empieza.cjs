// Pruebas de "Empieza aquí" (DECISIONES.md #18): primera vez, deteccion automatica de cada paso, progreso, festejo al terminar, movimiento al final del
// menu, persistencia, telefono, movimiento reducido y conexion con la base. Independiente: `node tools/test-empieza.cjs` (necesita dist/index.local.html,
// ver tools/lib-test.cjs). Cada bloque abre su propio contexto del navegador (el almacenamiento local es por contexto: asi se prueba la persistencia).
const fs = require("node:fs"), path = require("node:path");
const T = require("./lib-test.cjs"), { launch, ok, wait, done, file } = T;
// navega por hash y espera a que la vista nueva este dibujada (el navegador de pruebas no tiene GPU y va lento; el nav de lib-test solo espera un tiempo fijo)
async function nav(p, h, ms) {
  const name = h.replace(/^#/, "").split("/")[0];
  await p.evaluate((x) => { location.hash = x.startsWith("#") ? x : "#" + x; }, h);
  await p.waitForFunction((n) => { const v = document.querySelector("#main > .view"); return v && v.dataset.view === n && v.style.opacity !== "0"; }, name, { timeout: 8000 }).catch(() => {});
  await wait(p, ms || 400);
}
const mockSrc = fs.readFileSync(path.join(T.root, "app", "js", "core", "adapters", "simulador.js"), "utf8");
const IDS = ["jarvis", "estilo", "grabar", "pedido", "revisar", "metricas"];
// lo que flota sin parar hace que Playwright espere "a que se quede quieto" antes de cada clic: aca se congela (los clics igual se hacen con la pantalla viva)
const FREEZE = ".es-float, .es-cloud, .es-liq i, .es-fin-hero > i, .es-li .es-badge::after, .crear-cloud.jv, .nt-float, .nt-cloud { animation: none !important; }";

// abre la app con opciones propias de contexto (telefono real, movimiento reducido, base simulada); query sin "nocel": se agrega aca
async function openWith(b, query, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: o.viewport || { width: 1440, height: 900 }, isMobile: !!o.isMobile, hasTouch: !!o.isMobile, deviceScaleFactor: o.isMobile ? 2 : 1, reducedMotion: o.reducedMotion || "no-preference" });
  if (o.init) await ctx.addInitScript(o.init);
  await ctx.addInitScript((css) => { document.addEventListener("DOMContentLoaded", () => { const st = document.createElement("style"); st.id = "__nofloat"; st.textContent = css; document.head.appendChild(st); }); }, FREEZE);
  const p = await ctx.newPage(); const errs = []; p.errs = errs; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await p.goto(file + query.replace("?", "?nocel=1&"), { waitUntil: "load" });
  await p.waitForFunction(() => window.App && App.S.ready && App.S.ready.videos && App.S.ready.home, null, { timeout: 8000 }).catch(() => {}); await wait(p, 900); return p;
}
const doneIds = (p) => p.evaluate(() => App.onboarding.STEPS.filter((s) => App.onboarding.isDone(s.id)).map((s) => s.id));
const waitDone = (p, id, ms) => p.waitForFunction((i) => App.onboarding.isDone(i), id, { timeout: ms || 6000 }).then(() => true, () => false);
const rail = (p) => p.evaluate(() => [...document.querySelectorAll("#rail .nv")].map((a) => a.dataset.nav));
const tabs = (p) => p.evaluate(() => [...document.querySelectorAll("#tabbar .tb")].map((a) => a.dataset.nav || a.dataset.act));
const hash = (p) => p.evaluate(() => location.hash);
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
// algun elemento visible se sale del ancho de la pantalla (ignora lo oculto, lo recortado a proposito y las capas decorativas)
const spill = (p) => p.evaluate(() => { const bad = [...document.querySelectorAll("#main *")].filter((e) => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false; if (e.closest(".es-liq, .confeti, svg, [aria-hidden='true']")) return false; return r.right > innerWidth + 1 || r.left < -1; }); return bad.length ? bad.slice(0, 3).map((e) => e.className || e.tagName).join(",") : ""; });
// marca todos menos los pasos dados (sin el festejo ni avisos: para llegar rapido al estado que se quiere probar)
const markAll = (p, except) => p.evaluate(async (ex) => { for (const s of App.onboarding.STEPS) if (!(ex || []).includes(s.id)) await App.onboarding.markDone(s.id, { quiet: true }); }, except || []);
const closeFinale = async (p) => { if (await p.evaluate(() => !!document.querySelector("#esfin"))) { await p.keyboard.press("Escape"); await p.waitForFunction(() => !document.querySelector("#esfin"), null, { timeout: 4000 }).catch(() => {}); await wait(p, 300); } };

(async () => {
  const b = await launch();

  console.log("\n== Empieza aquí: primera vez (escritorio) ==");
  let p = await openWith(b, "?demo=1&preset=kt");
  ok(await hash(p) === "#empieza", "al abrir el portal por primera vez (sin hash) cae en Empieza aquí", await hash(p));
  ok(await p.evaluate(() => App.onboarding.pending() === true && App.onboarding.progress().done === 0 && App.onboarding.progress().total === 6), "no hay pasos hechos (los videos y pedidos de ejemplo no cuentan)");
  let r = await rail(p);
  ok(r[0] === "empieza" && r.includes("hoy") && r[r.length - 1] === "ajustes", "Empieza aquí va PRIMERO en el menú lateral mientras falten pasos", r.join(","));
  ok(await p.evaluate(() => { const a = document.querySelector('#rail [data-nav="empieza"]'); return a.getAttribute("aria-current") === "page" && /Empieza aquí/.test(a.textContent); }), "el item del menú dice Empieza aquí y está activo");
  ok(await p.evaluate(() => { const a = document.querySelector('#rail [data-nav="empieza"]'), s = a.querySelector("span"), g = document.createRange(); g.selectNodeContents(s); return g.getBoundingClientRect().width <= a.getBoundingClientRect().width - 8; }), "la etiqueta Empieza aquí cabe en la pastilla del menú sin tocar los bordes");
  await p.addStyleTag({ content: FREEZE });
  ok(JSON.stringify(await p.evaluate(() => [...document.querySelectorAll(".es-li")].map((e) => e.dataset.step))) === JSON.stringify(IDS), "seis pasos en orden: jarvis, estilo, grabar, pedido, revisar, métricas");
  ok(await p.evaluate(() => [...document.querySelectorAll(".es-li")].every((li) => !!li.querySelector(".es-badge .n") && li.querySelector(".es-t").textContent.length > 4 && li.querySelector(".es-d").textContent.length > 20 && !!li.querySelector(".es-cta") && /Ya lo hice/.test(li.querySelector(".es-skip").textContent))), "cada paso tiene número, título, beneficio en una frase, botón principal y «Ya lo hice»");
  ok(await p.evaluate(() => document.querySelectorAll('.es-li[data-state="next"]').length === 1 && document.querySelector('.es-li[data-state="next"]').dataset.step === "jarvis" && document.querySelector('.es-li[data-state="next"]').getAttribute("aria-current") === "step"), "el primer paso sin hacer queda resaltado como el siguiente");
  ok(await p.evaluate(() => { const rw = document.querySelector(".es-ringwrap"); return /^0 de 6/.test(rw.getAttribute("aria-label")) && document.querySelector('[data-es="done"]').textContent === "0" && /pasos/.test(document.querySelector(".es-count").textContent); }), "el anillo de avance dice 0 de 6");
  ok(await p.evaluate(() => { const li = document.querySelector('.es-li[data-step="jarvis"]'); return li.querySelector(".es-cta").dataset.act === "esjarvis"; }) && await p.evaluate(() => ["estilo:#biblioteca", "grabar:#crear/grabar", "pedido:#crear", "revisar:#estudio", "metricas:#metricas"].every((x) => { const [id, h] = x.split(":"); return document.querySelector(`.es-li[data-step="${id}"] a.es-cta`).getAttribute("href") === h; })), "cada botón lleva directo al lugar (Jarvis se abre; los demás a su pantalla)");
  ok(await overflow(p), "sin scroll horizontal en escritorio");

  console.log("\n== Hoy: tarjeta chica mientras falten pasos ==");
  await nav(p, "#hoy", 1200);
  ok(await p.evaluate(() => { const c = document.querySelector(".hoy .es-hoy"); return !!c && c.getAttribute("href") === "#empieza" && /0\s*\/\s*6/.test(c.textContent) && /Conocé a Jarvis/.test(c.textContent) && /Empezar/.test(c.textContent); }), "Hoy muestra la tarjeta compacta con 0/6 y el primer paso");
  ok(await p.evaluate(() => { const c = document.querySelector(".hoy .es-hoy").getBoundingClientRect(), t = document.querySelector(".hoy .talk").getBoundingClientRect(); return c.bottom <= t.top + 2 && c.height < 110 && c.left >= 0 && c.right <= innerWidth; }), "la tarjeta queda arriba de todo (compacta) y no tapa la frase del día");
  ok(await p.evaluate(() => { const g = document.querySelector(".es-hoy-go").getBoundingClientRect(); return g.height >= 44; }), "el botón de la tarjeta mide al menos 44 px");
  await p.click(".hoy .es-hoy"); await wait(p, 900);
  ok(await hash(p) === "#empieza" && await p.evaluate(() => !!document.querySelector(".es")), "la tarjeta de Hoy lleva a Empieza aquí");

  console.log("\n== Detección: Jarvis, estilos, grabar, pedido, revisar, métricas ==");
  await p.addStyleTag({ content: FREEZE });
  await p.click('.es-li[data-step="jarvis"] .es-cta', { force: true });
  ok(await p.waitForFunction(() => App.jarvis.isOpen(), null, { timeout: 5000 }).then(() => true, () => false), "«Hablar con Jarvis» abre a Jarvis");
  ok(await waitDone(p, "jarvis", 8000), "abrir a Jarvis completa el paso 1 solo (sin tocar jarvis.js)");
  await wait(p, 1500); await p.evaluate(() => App.jarvis.close()); await wait(p, 2500);
  ok(await p.evaluate(() => { const li = document.querySelector('.es-li[data-step="jarvis"]'), nx = document.querySelector('.es-li[data-state="next"]'); return li.dataset.state === "done" && /Hecho/.test(li.querySelector(".es-tag-done").textContent) && nx && nx.dataset.step === "estilo" && document.querySelector('[data-es="done"]').textContent === "1" && /^1 de 6/.test(document.querySelector(".es-ringwrap").getAttribute("aria-label")); }), "la pantalla se pone al día sin repintarse: paso 1 hecho, 1 de 6 y el siguiente resaltado");
  ok(await p.evaluate(() => { const dash = document.querySelector(".es .ring-val").style.strokeDasharray.split(" "); return Math.abs(parseFloat(dash[0]) / parseFloat(dash[1]) - 1 / 6) < 0.01; }), "el anillo avanza 1/6");
  ok(await hash(p) === "#empieza", "después de cerrar a Jarvis seguís en Empieza aquí");

  await p.click('.es-li[data-step="estilo"] a.es-cta', { force: true }); await wait(p, 900);
  ok(await hash(p) === "#biblioteca" && await waitDone(p, "estilo", 4000), "ir a la Biblioteca completa «Mirá tus estilos»");
  ok(await p.waitForFunction(() => [...document.querySelectorAll(".toast")].some((t) => /Paso listo/.test(t.textContent) && /2 de 6/.test(t.textContent) && /Deshacer/.test(t.textContent)), null, { timeout: 4000 }).then(() => true, () => false), "estando en otra pantalla avisa «¡Paso listo!» (2 de 6) con Deshacer");
  ok(await p.evaluate(() => { const a = document.querySelector('#rail [data-nav="empieza"]'); return !!a && !!a.querySelector(".ic"); }) && (await rail(p))[0] === "empieza", "el menú sigue con Empieza aquí primero");
  await nav(p, "#empieza", 800); await p.addStyleTag({ content: FREEZE });
  ok(await p.evaluate(() => document.querySelector('.es-li[data-step="estilo"]').dataset.state === "done" && document.querySelector('.es-li[data-state="next"]').dataset.step === "grabar" && document.querySelector('[data-es="done"]').textContent === "2"), "al volver, el paso 2 está hecho, 2 de 6 y el siguiente es Grabar");

  // «Ya lo hice» manual, con Deshacer
  await p.click('.es-li[data-step="grabar"] .es-skip', { force: true }); await wait(p, 700);
  ok(await doneIds(p).then((d) => d.includes("grabar")) && await p.evaluate(() => document.querySelector('.es-li[data-step="grabar"]').dataset.state === "done" && document.querySelector('[data-es="done"]').textContent === "3"), "«Ya lo hice» marca el paso a mano (3 de 6)");
  ok(await p.evaluate(() => { const f = document.activeElement; return !!f && f.classList.contains("es-cta") && f.closest(".es-li").dataset.step === "pedido"; }), "después de «Ya lo hice» el foco pasa al botón del paso que sigue");
  ok(await p.evaluate(() => [...document.querySelectorAll(".toast")].some((t) => /3 de 6/.test(t.textContent) && /Deshacer/.test(t.textContent))), "el aviso del marcado manual trae Deshacer");
  await p.evaluate(() => { [...document.querySelectorAll(".toast button")].filter((x) => /Deshacer/.test(x.textContent)).pop().click(); }); await wait(p, 700);
  ok(!(await doneIds(p)).includes("grabar") && await p.evaluate(() => document.querySelector('.es-li[data-step="grabar"]').dataset.state === "next" && document.querySelector('[data-es="done"]').textContent === "2"), "Deshacer devuelve el paso a pendiente y vuelve a ser el siguiente");
  // lo que hace la función Grabar: avisar con el evento propio
  await p.evaluate(() => window.dispatchEvent(new CustomEvent("aura:grabado")));
  ok(await waitDone(p, "grabar", 3000), "el evento aura:grabado completa «Grabá tu primer video»");

  // pedido: lo creado por esta persona (los pedidos de ejemplo del modo demo ya estaban y no cuentan)
  ok(await p.evaluate(() => App.S.requests.filter((x) => x.kind === "new_video" && x.by === App.S.userId).length >= 2) && !(await doneIds(p)).includes("pedido"), "los pedidos de ejemplo (del mismo usuario) que ya estaban no completan «Pedí tu primer video»");
  await p.evaluate(() => App.act.createRequest({ topic: "Prueba de Empieza aquí", brand: App.S.brands[0].id }));
  ok(await waitDone(p, "pedido", 5000), "crear un pedido de video completa el paso 4 solo");

  // revisar: aprobar o rechazar un video (cambio de estado ahora)
  ok(!(await doneIds(p)).includes("revisar"), "antes de aprobar nada, el paso 5 sigue pendiente (los videos ya decididos no cuentan)");
  const vid = await p.evaluate(() => App.sel.pending()[0].id);
  await p.evaluate((id) => App.act.setStatus(App.sel.video(id), "approved"), vid);
  ok(await waitDone(p, "revisar", 5000), "aprobar un video completa «Aprobá o rechazá un video»");
  ok(await p.evaluate(() => App.onboarding.progress().done === 5 && App.onboarding.pending() === true), "quedan 5 de 6 y el menú sigue con Empieza aquí arriba");

  // el último paso: festejo y baja al final del menú
  await p.evaluate(() => { location.hash = "#metricas"; }); await wait(p, 800);
  ok(await waitDone(p, "metricas", 4000), "ver Métricas completa el último paso");
  ok(await p.waitForFunction(() => !!document.querySelector("#esfin .es-fin"), null, { timeout: 9000 }).then(() => true, () => false), "al terminar los 6 pasos aparece la celebración");
  await wait(p, 2500);
  ok(await p.evaluate(() => { const f = document.querySelector("#esfin"); return /Completaste los 6 pasos/.test(f.textContent) && /Daniel/.test(f.textContent) && /constancia|crecer|suma|video/i.test(f.textContent) && /Ya conocés Aura/.test(f.textContent); }), "felicita por nombre, con una frase motivadora (mismo tono que los hitos)");
  ok(await p.evaluate(() => !!document.querySelector("#esfin .confeti i")), "hay confeti en los colores de la marca");
  ok(await p.evaluate(() => document.activeElement && document.activeElement.id === "esfinok"), "el foco queda en «¡Genial!»");
  r = await rail(p);
  ok(r[r.length - 2] === "empieza" && r[r.length - 1] === "ajustes" && r[0] === "hoy", "Empieza aquí bajó solo al final del menú", r.join(","));
  ok(await p.evaluate(() => App.onboarding.pending() === false && App.onboarding.progress().done === 6 && App.onboarding.next() === null), "todo marcado: ya no está pendiente");
  await closeFinale(p);
  ok(await p.evaluate(() => !document.querySelector("#esfin")), "Escape cierra la celebración");

  console.log("\n== Después de terminar: sigue a mano, sin callejón ==");
  await nav(p, "#hoy", 1200);
  ok(await p.evaluate(() => !document.querySelector(".hoy .es-hoy")), "Hoy ya no muestra la tarjeta");
  await p.click('#rail [data-nav="empieza"]'); await p.waitForSelector(".es .es-li", { timeout: 6000 }).catch(() => {}); await wait(p, 900); await p.addStyleTag({ content: FREEZE });
  ok(await hash(p) === "#empieza" && await p.evaluate(() => document.querySelectorAll('.es-li[data-state="done"]').length === 6 && document.querySelector('[data-es="done"]').textContent === "6"), "se puede volver a entrar: los 6 pasos aparecen hechos");
  ok(await p.evaluate(() => !!document.querySelector('[data-act="esreset"]') && /Volver a ver los pasos/.test(document.querySelector('[data-act="esreset"]').textContent) && /Ir a Hoy/.test(document.querySelector(".es-next").textContent)), "ofrece «Ir a Hoy» y «Volver a ver los pasos»");
  ok(await p.evaluate(() => [...document.querySelectorAll(".es-li")].every((li) => /Volver a verlo/.test(li.querySelector(".es-cta").textContent))), "cada paso hecho ofrece «Volver a verlo»");
  await p.click('[data-act="esreset"]'); await p.waitForFunction(() => App.onboarding.progress().done === 0, null, { timeout: 5000 }).catch(() => {}); await wait(p, 1500);
  r = await rail(p);
  ok(await p.evaluate(() => App.onboarding.progress().done === 0 && App.onboarding.pending()) && r[0] === "empieza", "«Volver a ver los pasos» reinicia y Empieza aquí vuelve al primer lugar", r.join(","));
  ok(await p.evaluate(() => document.querySelectorAll('.es-li[data-state="done"]').length === 0 && document.querySelector('.es-li[data-state="next"]').dataset.step === "jarvis" && document.querySelector('[data-es="done"]').textContent === "0"), "la pantalla vuelve a 0 de 6 con el paso 1 resaltado");
  ok(await p.evaluate(() => [...document.querySelectorAll(".toast")].some((t) => /Deshacer/.test(t.textContent))), "reiniciar se puede deshacer");
  await p.evaluate(() => { [...document.querySelectorAll(".toast button")].filter((x) => /Deshacer/.test(x.textContent)).pop().click(); }); await wait(p, 1000);
  ok(await p.evaluate(() => App.onboarding.progress().done === 6) && (await rail(p)).slice(-2)[0] === "empieza", "Deshacer devuelve los 6 pasos y el menú al final");
  ok(p.errs.length === 0, "sin errores en el recorrido completo", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  console.log("\n== Cada fuente de detección por separado ==");
  p = await openWith(b, "?demo=1&preset=kt#hoy");
  await nav(p, "#laboratorio", 800);
  ok(await waitDone(p, "estilo", 3000), "entrar al Laboratorio también completa «Mirá tus estilos»");
  ok(!(await doneIds(p)).includes("metricas"), "visitar otra pantalla no marca pasos de más");
  // si el teleprompter termina con una grabación (o una lectura larga) se cuenta; abrirlo y cerrarlo enseguida, no
  await p.evaluate(() => { App.teleprompter.open = function (o) { window.__tpOnDone = o.onDone; }; App.emit("x"); }); await wait(p, 300);
  await p.evaluate(() => { App.teleprompter.open({ mode: "script", onDone: (r) => { window.__userDone = r; } }); window.__tpOnDone({ recorded: null, durationMs: 800, mode: "script" }); }); await wait(p, 400);
  ok(!(await doneIds(p)).includes("grabar") && await p.evaluate(() => !!window.__userDone), "cerrar el teleprompter enseguida no cuenta como grabar, y el onDone de quien lo abrió sigue funcionando");
  await p.evaluate(() => { App.teleprompter.open({ mode: "script", onDone: () => {} }); window.__tpOnDone({ recorded: null, durationMs: 9000, mode: "script" }); }); await wait(p, 400);
  ok(!(await doneIds(p)).includes("grabar"), "una lectura corta sin grabar (9 s) tampoco cuenta");
  await p.evaluate(() => { App.teleprompter.open({ mode: "interview", onDone: () => {} }); window.__tpOnDone({ recorded: { name: "toma.webm" }, durationMs: 4000, mode: "interview" }); });
  ok(await waitDone(p, "grabar", 3000), "una sesión del teleprompter con grabación completa «Grabá tu primer video»");
  await p.evaluate(() => App.onboarding.unmark("grabar")); await wait(p, 400);
  await p.evaluate(() => { App.teleprompter.open({ mode: "script", onDone: () => {} }); window.__tpOnDone({ recorded: null, durationMs: 40000, mode: "script" }); });
  ok(await waitDone(p, "grabar", 3000), "una sesión de lectura completa de 40 s (aunque sin grabar) también cuenta");
  await p.evaluate(() => { App.onboarding.markDone("metricas"); }); await wait(p, 400);
  ok(await waitDone(p, "metricas", 2000) && !(await doneIds(p)).includes("pedido"), "otras funciones pueden llamar App.onboarding.markDone(id)");
  ok(await p.evaluate(async () => (await App.onboarding.markDone("no-existe")) === false && (await App.onboarding.markDone("metricas")) === false), "un id desconocido o un paso ya hecho no hacen nada");
  await p.evaluate(() => App.emit("grabado")); // el evento interno "grabado" de App.emit también vale
  ok(p.errs.length === 0, "sin errores con las distintas fuentes", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  console.log("\n== Jarvis desde Hoy, enlaces directos y tablet ==");
  p = await openWith(b, "?demo=1&preset=kt#hoy"); await wait(p, 1200);
  ok(await hash(p) === "#hoy", "un enlace directo (#hoy) no se pisa con Empieza aquí: solo se abre ahí cuando no hay hash");
  await p.click(".hoy .talk .orb", { force: true });
  ok(await waitDone(p, "jarvis", 8000), "abrir a Jarvis desde el orbe de Hoy completa el paso 1");
  await wait(p, 800);
  ok(await p.evaluate(() => App.jarvis.isOpen() && ![...document.querySelectorAll(".toast")].some((t) => /Paso listo/.test(t.textContent))), "mientras Jarvis está abierto no sale ningún aviso encima");
  await p.evaluate(() => App.jarvis.close()); await wait(p, 2500);
  ok(await p.evaluate(() => [...document.querySelectorAll(".toast")].some((t) => /Paso listo/.test(t.textContent) && /1 de 6/.test(t.textContent))), "al cerrarlo aparece el aviso «¡Paso listo!» (1 de 6)");
  ok(await p.evaluate(() => { const c = document.querySelector(".hoy .es-hoy"); return !!c && /1\s*\/\s*6/.test(c.textContent) && /Mirá tus estilos/.test(c.textContent) && /Seguir/.test(c.textContent); }), "la tarjeta de Hoy ya dice 1/6 y propone el paso siguiente");
  ok(await p.evaluate(() => [...document.querySelectorAll(".orb[data-orb]")].filter((o) => o.offsetParent).every((o) => getComputedStyle(o).visibility === "visible")), "el orbe de Hoy vuelve a verse después de cerrar a Jarvis");
  ok(p.errs.length === 0, "sin errores al abrir a Jarvis desde Hoy", p.errs.slice(0, 3).join(" || ")); await p.context().close();
  p = await openWith(b, "?demo=1&preset=kt", { viewport: { width: 1024, height: 768 } });
  ok(await overflow(p) && await p.evaluate(() => { const l = document.querySelector(".es-li").getBoundingClientRect(), c = document.querySelector("#escloud").getBoundingClientRect(); return l.top < innerHeight - 200 && l.left > c.right - 4; }), "en tablet apaisada la nube queda al lado y el primer paso se ve sin bajar");
  await p.context().close();

  console.log("\n== Rechazar también cuenta; el Estudio real ==");
  p = await openWith(b, "?demo=1&preset=kt#estudio");
  const first = await p.evaluate(() => App.sel.groupByPiece(App.sel.pending())[0].vs[0].id);
  await p.evaluate((id) => { location.hash = "#estudio/ver/" + encodeURIComponent(id); }, first); await wait(p, 1400);
  await p.keyboard.press("r"); await wait(p, 900);
  ok(await waitDone(p, "revisar", 4000) && await p.evaluate((id) => App.sel.video(id).status === "rejected", first), "rechazar un video desde la revisión (tecla R) completa el paso 5");
  ok(p.errs.length === 0, "sin errores al decidir en el Estudio", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  console.log("\n== Persistencia entre cargas ==");
  p = await openWith(b, "?demo=1&preset=kt");
  await p.evaluate(async () => { await App.onboarding.markDone("jarvis", { quiet: true }); await App.onboarding.markDone("estilo", { quiet: true }); }); await wait(p, 500);
  await p.reload({ waitUntil: "load" }); await p.waitForFunction(() => window.App && App.S.ready && App.S.ready.home, null, { timeout: 8000 }).catch(() => {}); await wait(p, 1500);
  ok(await p.evaluate(() => App.onboarding.progress().done === 2 && App.onboarding.isDone("jarvis") && App.onboarding.isDone("estilo")) && await hash(p) === "#empieza", "al recargar el progreso sigue ahí (2 de 6) y vuelve a Empieza aquí");
  ok(await p.evaluate(() => document.querySelector('[data-es="done"]').textContent === "2" && document.querySelector('.es-li[data-step="estilo"]').dataset.state === "done"), "la pantalla recargada muestra los pasos hechos");
  await markAll(p); await wait(p, 600);
  await p.goto(file + "?nocel=1&demo=1&preset=kt", { waitUntil: "load" }); await p.waitForFunction(() => window.App && App.S.ready && App.S.ready.home, null, { timeout: 8000 }).catch(() => {}); await wait(p, 1500);
  r = await rail(p);
  ok(await hash(p) !== "#empieza" && await p.evaluate(() => App.route().name === "hoy") && r[r.length - 2] === "empieza", "terminados los pasos, al abrir el portal ya no cae en Empieza aquí y el menú la deja al final", r.join(",") + " " + await hash(p));
  ok(await p.evaluate(() => !document.querySelector("#esfin") && !document.querySelector(".hoy .es-hoy")), "recargar con todo hecho no repite el festejo ni la tarjeta de Hoy");
  await nav(p, "#empieza", 900); await p.addStyleTag({ content: FREEZE });
  await p.click('[data-act="esreset"]'); await wait(p, 800);
  await p.goto(file + "?nocel=1&demo=1&preset=kt", { waitUntil: "load" }); await p.waitForFunction(() => window.App && App.S.ready && App.S.ready.home, null, { timeout: 8000 }).catch(() => {}); await wait(p, 1500);
  ok(await p.evaluate(() => App.onboarding.progress().done === 0 && App.onboarding.pending()) && await hash(p) === "#empieza", "reiniciar también sobrevive a una recarga: vuelve a Empieza aquí con 0 de 6");
  ok(p.errs.length === 0, "sin errores al recargar", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  console.log("\n== Conexión con el menú y con la base ==");
  p = await openWith(b, "?demo=1&preset=kt#hoy");
  ok((await rail(p))[0] === "empieza", "con pasos pendientes el menú empieza con Empieza aquí");
  await wait(p, 1500); // la demo siembra los hitos a los ~1,2 s y eso reescribe el estado de home: se espera a que pase
  await p.evaluate(() => { App.S.onboardDoc = { steps: Object.fromEntries(App.onboarding.STEPS.map((s) => [s.id, new Date().toISOString()])) }; App.emit("home"); }); await wait(p, 900);
  r = await rail(p);
  ok(r[0] === "hoy" && r[r.length - 2] === "empieza", "un cambio en home/onboarding (App.emit(\"home\")) reordena el menú sin recargar", r.join(","));
  await p.context().close();
  p = await openWith(b, "?preset=kt#hoy", { init: mockSrc }); await wait(p, 800);
  ok(await p.evaluate(() => App.S.mode === "claude") && (await rail(p))[0] === "empieza", "con la base real (simulada) también arranca con Empieza aquí primero");
  await p.evaluate(() => App.onboarding.markDone("estilo", { quiet: true })); await wait(p, 600);
  ok(await p.evaluate(() => !!(window.__mock.data.home && window.__mock.data.home.onboarding && window.__mock.data.home.onboarding.steps && window.__mock.data.home.onboarding.steps.estilo)), "cada paso se guarda en la base (home/onboarding)");
  await p.evaluate(async () => { const db = await window.claude.use("db"); await db.collection("home").doc("onboarding").set({ steps: Object.fromEntries(App.onboarding.STEPS.map((s) => [s.id, new Date().toISOString()])) }); }); await wait(p, 1000);
  r = await rail(p);
  ok(await p.evaluate(() => App.onboarding.pending() === false) && r[r.length - 2] === "empieza", "lo que llega de la base (otro dispositivo) se respeta y reordena el menú", r.join(","));
  ok(p.errs.length === 0, "sin errores con la base simulada", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  console.log("\n== Teléfono (390×844) ==");
  p = await openWith(b, "?demo=1&preset=kt", { viewport: { width: 390, height: 844 }, isMobile: true });
  ok(await hash(p) === "#empieza", "en el teléfono también se abre en Empieza aquí");
  let tb = await tabs(p);
  ok(tb[0] === "empieza" && tb.includes("estudio") && tb.includes("crear") && !tb.includes("hoy"), "el primer tab de la barra inferior es Empieza aquí", tb.join(","));
  ok(await p.evaluate(() => /Empieza/.test(document.querySelector('#tabbar [data-nav="empieza"]').textContent)), "el tab dice Empieza");
  ok(await overflow(p) && !(await spill(p)), "sin scroll horizontal ni nada fuera de la pantalla", await spill(p));
  ok(await p.evaluate(() => { const c = document.querySelector("#escloud").getBoundingClientRect(); return c.left >= 8 && c.right <= innerWidth - 8 && c.height < innerHeight * 0.95; }), "la nube cabe con aire a los costados");
  ok(await p.evaluate(() => [...document.querySelectorAll(".es-cta, .es-skip, .es-next .btn")].filter((e) => e.offsetParent).every((e) => e.getBoundingClientRect().height >= 44 - 0.5)), "todos los botones de los pasos miden al menos 44 px");
  ok(await p.evaluate(() => { const l = [...document.querySelectorAll(".es-li")].map((e) => e.getBoundingClientRect()); return l.every((r) => r.left >= 0 && r.right <= innerWidth); }), "las tarjetas de los pasos entran en el ancho");
  await p.screenshot({ path: process.env.ES_SHOTS ? path.join(process.env.ES_SHOTS, "es-phone-0.png") : "/dev/null" }).catch(() => {});
  await p.click('#tabbar [data-act="more"]'); await wait(p, 700);
  ok(await p.evaluate(() => /Hoy/.test(document.querySelector(".sheet-list").textContent)), "«Más» lista Hoy mientras Empieza aquí ocupa el primer tab");
  await p.keyboard.press("Escape"); await wait(p, 300); await p.evaluate(() => { const s = document.querySelector(".modal-wrap, .sheet-wrap"); if (s) s.remove(); });
  await nav(p, "#hoy", 1400);
  ok(await p.evaluate(() => { const c = document.querySelector(".hoy .es-hoy"); if (!c) return false; const r = c.getBoundingClientRect(), g = c.querySelector(".es-hoy-go").getBoundingClientRect(); return r.left >= 8 && r.right <= innerWidth - 8 && g.height >= 44 && g.right <= r.right; }), "la tarjeta de Hoy cabe en el teléfono y su botón mide 44 px");
  ok(await overflow(p), "Hoy sin scroll horizontal");
  await nav(p, "#empieza", 900); await p.addStyleTag({ content: FREEZE });
  await markAll(p, ["metricas"]); await wait(p, 500);
  await p.evaluate(() => { location.hash = "#metricas"; }); await wait(p, 800);
  ok(await p.waitForFunction(() => !!document.querySelector("#esfin .es-fin"), null, { timeout: 9000 }).then(() => true, () => false), "en el teléfono también festeja al terminar");
  await wait(p, 2200);
  ok(await p.evaluate(() => { const f = document.querySelector(".es-fin").getBoundingClientRect(), b = document.querySelector("#esfinok").getBoundingClientRect(); return f.left >= 4 && f.right <= innerWidth - 4 && f.top >= 0 && f.bottom <= innerHeight && b.height >= 44; }), "la celebración cabe en el teléfono con el botón de 44 px");
  await p.screenshot({ path: process.env.ES_SHOTS ? path.join(process.env.ES_SHOTS, "es-phone-fin.png") : "/dev/null" }).catch(() => {});
  await closeFinale(p);
  tb = await tabs(p);
  ok(tb[0] === "hoy" && !tb.includes("empieza"), "terminado, el primer tab vuelve a ser Hoy", tb.join(","));
  await p.click('#tabbar [data-act="more"]'); await wait(p, 700);
  ok(await p.evaluate(() => /Empieza aquí/.test(document.querySelector(".sheet-list").textContent)), "y Empieza aquí pasa a «Más» (sigue accesible)");
  ok(p.errs.length === 0, "sin errores en el teléfono", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  console.log("\n== Movimiento reducido ==");
  p = await openWith(b, "?demo=1&preset=kt", { reducedMotion: "reduce" });
  ok(await p.evaluate(() => App.reduceMotion() === true && !!document.querySelector(".es") && !document.querySelector("#escloud").classList.contains("arr-pre")), "con movimiento reducido la nube aparece de una (sin esperar la gota)");
  await markAll(p, ["metricas"]); await wait(p, 500);
  await p.evaluate(() => App.onboarding.markDone("metricas")); await wait(p, 2500);
  ok(await p.evaluate(() => !!document.querySelector("#esfin .es-fin") && !document.querySelector("#esfin .confeti") && /Completaste los 6 pasos/.test(document.querySelector("#esfin").textContent)), "la felicitación se ve igual, sin confeti");
  await closeFinale(p);
  ok(await p.evaluate(() => !document.querySelector("#esfin")), "se cierra con Escape");
  ok(p.errs.length === 0, "sin errores con movimiento reducido", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  await b.close();
  done("Empieza aquí");
})();
