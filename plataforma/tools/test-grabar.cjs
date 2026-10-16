// Pruebas de Crear > Grabar (DECISIONES.md #19): `node tools/test-grabar.cjs` (necesita dist/index.local.html, ver tools/lib-test.cjs).
// El teleprompter real lo construye otro trabajo: aqui SIEMPRE se reemplaza App.teleprompter.open por un doble, asi estas pruebas valen con el esqueleto y con el real.
// La IA se simula con un window.claude.use("sample") inyectado antes de la pagina (modo demo + capacidad sample), y la voz con un SpeechRecognition falso.
const { launch, open, nav, ok, wait, done } = require("./lib-test.cjs");

// ---------- ayudas ----------
// clic por codigo: los elementos flotantes/animados y las barras fijas del telefono tapan el punto del clic de Playwright; el flujo es el mismo
const tap = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) throw new Error("no existe " + s); e.click(); }, sel);
const has = (p, sel) => p.evaluate((s) => !!document.querySelector(s), sel);
const count = (p, sel) => p.evaluate((s) => document.querySelectorAll(s).length, sel);
const text = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent : ""; }, sel);
const until = (p, sel, ms) => p.waitForSelector(sel, { timeout: ms || 25000, state: "attached" }).then(() => true, () => false);
const gone = (p, sel, ms) => p.waitForSelector(sel, { timeout: ms || 25000, state: "detached" }).then(() => true, () => false);
const st = (p) => p.evaluate(() => { const g = App.ui.crear.grabar; return g ? { step: g.step, mode: g.mode, busy: g.busy, ideas: g.ideas.length, qs: g.qs.slice(), secs: g.secs, script: g.script ? { hook: g.script.hook, beats: g.script.beats.slice(), cierre: g.script.cierre, texto: g.script.texto, palabras: g.script.palabras, titulo: g.script.titulo } : null } : null; });
// espera a que la IA (o su reemplazo local) termine de "pensar": primero tiene que aparecer Pensando… y despues irse
const thought = async (p) => { await until(p, ".gr-think", 10000); await gone(p, ".gr-think"); await p.waitForTimeout(350); };
const stub = (p, o) => p.evaluate((o) => {
  o = o || {}; window.__tp = []; window.__grabado = 0; window.__md = [];
  window.addEventListener("aura:grabado", () => window.__grabado++);
  const md = App.onboarding && App.onboarding.markDone; App.onboarding.markDone = function (id) { window.__md.push(id); return md ? md.call(App.onboarding, id) : undefined; };
  App.teleprompter.open = (a) => { window.__tp.push(JSON.parse(JSON.stringify(a))); setTimeout(() => a.onDone({ recorded: o.file ? new File([new Uint8Array(4096)], "grabacion.webm", { type: "video/webm" }) : null, durationMs: 31000, mode: a.mode }), 40); };
}, o);

// ---------- dobles para el navegador ----------
// SpeechRecognition falso: al empezar suelta un parcial y despues un resultado final (con la forma de la API real)
const FAKE_SR = `(() => {
  const mk = (t, f) => { const r = [{ transcript: t }]; r.isFinal = f; return r; };
  class SR { constructor() { window.__sr = (window.__sr || 0) + 1; this.on = false; }
    start() { this.on = true; window.__srStarts = (window.__srStarts || 0) + 1; setTimeout(() => { if (this.on && this.onresult) this.onresult({ resultIndex: 0, results: [mk("Dejé de usar el despertador", false)] }); }, 120);
      setTimeout(() => { if (this.on && this.onresult) this.onresult({ resultIndex: 0, results: [mk("Dejé de usar el despertador hace tres meses", true)] }); }, 360); }
    stop() { this.on = false; setTimeout(() => this.onend && this.onend(), 20); } abort() { this.stop(); } }
  window.SpeechRecognition = SR; window.webkitSpeechRecognition = SR;
})();`;
const NO_SR = `Object.defineProperty(window, "SpeechRecognition", { value: undefined, configurable: true }); Object.defineProperty(window, "webkitSpeechRecognition", { value: undefined, configurable: true });`;
// "sample" simulado (capacidad de Claude): responde con JSON segun lo que pide el prompt. window.__sampleMode: ok | reject | hang. withJson=false prueba la via sample() + parseo de texto.
const sampleInit = (withJson) => `(() => {
  window.__sampleCalls = []; window.__sampleMode = "ok"; let ideaBase = 0;
  const idea = (i) => ({ titulo: "Idea de IA " + i, gancho: "Esto es lo que aprendí en la idea " + i + ".", por_que: "Porque funciona " + i });
  const answer = (q, opts) => {
    window.__sampleCalls.push({ q, cache: opts && opts.cache, model: opts && opts.model, hasSignal: !!(opts && opts.signal) });
    const mode = window.__sampleMode;
    if (mode === "reject") { window.__sampleMode = "ok"; return Promise.reject({ code: "rate_limited", message: "límite" }); }
    if (mode === "hang") return new Promise((res, rej) => { const s = opts && opts.signal; if (s) s.addEventListener("abort", () => rej({ code: "cancelled" })); });
    let m;
    if (/propone EXACTAMENTE/i.test(q)) { m = q.match(/EXACTAMENTE (\\d+) ideas/); const n = m ? +m[1] : 21; const out = Array.from({ length: n }, (_, i) => idea(ideaBase + i + 1)); ideaBase += n; return Promise.resolve(out); }
    if (/GUION ACTUAL \\(JSON\\)/.test(q)) return Promise.resolve({ titulo: "Guion de IA", hook: "Este gancho lo cambió la IA.", desarrollo: ["Un bloque corto."], cierre: "Guárdalo para después." });
    if (/La persona tiene \\d+ ideas/.test(q)) { m = q.match(/tiene (\\d+) ideas/); return Promise.resolve(Array.from({ length: +m[1] }, (_, i) => ({ titulo: "Guion IA " + (i + 1), hook: "Gancho de IA " + (i + 1) + ".", desarrollo: ["Bloque uno.", "Bloque dos."], cierre: "Sígueme." }))); }
    if (/LO QUE DIJO LA PERSONA/.test(q)) return Promise.resolve({ titulo: "Guion de IA", hook: "Esto es lo que cambió mi mañana.", desarrollo: ["Dejé el despertador.", "Me levanto con la luz."], cierre: "Si te sirvió, guárdalo." });
    if (/TEMA DE LA ENTREVISTA/.test(q)) { m = q.match(/Propone (\\d+) preguntas/); return Promise.resolve(Array.from({ length: m ? +m[1] : 6 }, (_, i) => "Pregunta de IA " + (i + 1) + "?")); }
    return Promise.resolve({});
  };
  const sample = (input, opts) => answer(typeof input === "string" ? input : JSON.stringify(input), opts).then((v) => ({ text: JSON.stringify(v), truncated: false }));
  ${withJson ? `sample.json = (input, opts) => answer(typeof input === "string" ? input : JSON.stringify(input), opts);` : ""}
  sample.limits = async () => ({ tools: false });
  window.claude = { use: async (n) => (n === "sample" ? sample : null) };
})();`;

// ---------- pasos del flujo ----------
async function openGrabar(browser, init, viewport) {
  const p = await open(browser, "?demo=1&preset=kt", init, viewport);
  await stub(p, { file: true });
  await nav(p, "#crear/grabar", 2200);
  await until(p, '.gr[data-step="ask"]');
  return p;
}
async function toIdeas(p) { await tap(p, '[data-act="grstart"][data-v="no"]'); return until(p, ".gr-idea"); }
async function toDevelop(p, init) { if (!(await toIdeas(p))) return false; await tap(p, ".gr-idea"); await tap(p, "#grdevbtn"); return until(p, "#grraw"); }
const DICTADO = "Dejé de usar el despertador hace tres meses y mi vida cambió. Yo antes me despertaba cansado todos los días porque el sonido me daba estrés. Entonces probé despertarme con la luz del sol, y la verdad es que al principio me costó mucho, pero a la segunda semana ya me levantaba solo. Lo único que necesitas es acostarte a la misma hora y abrir la cortina. Si esto te sirvió, guárdalo y sígueme para más.";
async function toScript(p) { if (!(await toDevelop(p))) return false; await p.fill("#grraw", DICTADO); await tap(p, '[data-act="grscript"]'); return until(p, ".gr-script"); }
const spill = () => [...document.querySelectorAll("#main *")].filter((e) => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.right <= innerWidth + 2) return false; for (let a = e.parentElement; a && a.id !== "main"; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return false; } return getComputedStyle(e).position !== "fixed"; }).slice(0, 3).map((e) => e.tagName.toLowerCase() + "." + String(e.className).split(" ").slice(0, 2).join(".")).join(" | ");

(async () => {
  const browser = await launch();
  let p;

  console.log("\n== Grabar en Crear: la entrada ==");
  p = await open(browser, "?demo=1&preset=kt"); await nav(p, "#crear", 2400);
  ok(await p.evaluate(() => { const a = [...document.querySelectorAll(".crear-cloud .crear-path")]; return a.length === 3 && a[0].dataset.c === "grabar" && /Grabar/.test(a[0].textContent) && !!a[0].querySelector("svg.ic") && a[1].dataset.c === "estilo" && a[2].dataset.c === "video"; }), "Crear muestra Grabar (con icono de camara) como primera de las tres opciones");
  ok(await p.evaluate(() => { const ic = document.querySelector('.crear-path[data-c="grabar"] svg.ic'); return !!ic && !!ic.querySelector("circle") && /M23 19/.test(ic.innerHTML); }), "el icono de Grabar es la camara");
  await p.click('.crear-path[data-c="grabar"]', { force: true }); await wait(p, 2600);
  ok(await p.evaluate(() => location.hash === "#crear/grabar" && App.route().name === "crear" && App.route().args[0] === "grabar"), "tocar Grabar abre #crear/grabar");
  ok(await has(p, '.gr[data-step="ask"]') && /¿Ya tenés ideas para grabar\?/.test(await text(p, ".crear-cloud .log")), "la primera pregunta es «¿Ya tenés ideas para grabar?»");
  ok(await p.evaluate(() => { const o = [...document.querySelectorAll('[data-act="grstart"]')]; return o.length === 3 && o.map((x) => x.dataset.v).join() === "si,no,ent" && /Sí/.test(o[0].textContent) && /Todavía no/.test(o[1].textContent) && /entrevista/i.test(o[2].textContent); }), "ofrece Sí, Todavía no y «Quiero hacer una entrevista»");
  ok(await p.evaluate(() => !!App.crearGrabar && typeof App.crearGrabar.render === "function" && typeof App.crearGrabar.back === "function" && !!App.grabarAI && ["ideas", "script", "revise", "questions"].every((k) => typeof App.grabarAI[k] === "function")), "expone App.crearGrabar y App.grabarAI {ideas, script, revise, questions}");
  ok(p.errs.length === 0, "sin errores al entrar", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  p = await open(browser, "?demo=1&preset=kt#crear/grabar"); await wait(p, 2200);
  ok(await has(p, '.gr[data-step="ask"]'), "cargar directo #crear/grabar muestra la primera pregunta"); await p.context().close();

  console.log("\n== Sin ideas: 21 ideas (sin IA conectada) ==");
  p = await openGrabar(browser);
  ok(await toIdeas(p), "«Todavía no» llega a la lista de ideas");
  ok((await count(p, ".gr-idea")) === 21, "son exactamente 21 ideas", String(await count(p, ".gr-idea")));
  ok(/Sin IA conectada/.test(await text(p, ".gr-note")), "avisa con una nota chica que no hay IA conectada (usó ideas base)");
  const first = await p.evaluate(() => [...document.querySelectorAll(".gr-idea .t b")].map((e) => e.textContent.trim()));
  ok(new Set(first).size === 21 && first.every((t) => t.length > 6), "las 21 son distintas entre si", first.slice(0, 3).join(" | "));
  ok(await p.evaluate(() => [...document.querySelectorAll(".gr-idea")].every((b) => b.querySelector("em") && b.querySelector("small") && b.querySelector(".n"))), "cada idea trae titulo, gancho y por que puede funcionar");
  ok(await p.evaluate(() => { const ctx = App.grabarAI.ctx(); return [...document.querySelectorAll(".gr-idea .t")].some((t) => ctx.piezas.some((x) => t.textContent.toLowerCase().includes(x.toLowerCase().slice(0, 12)))); }), "las ideas salen de lo que ya produjo la cuenta (sus piezas)");
  ok(await p.evaluate(() => [...document.querySelectorAll(".gr-idea em")].every((e) => !/\?/.test(e.textContent))), "los ganchos son promesas directas (sin signos de pregunta)");
  ok(await p.evaluate(() => document.querySelector("#grdevbtn").disabled === true), "sin elegir una, «Desarrollar» esta deshabilitado");
  await tap(p, '[data-act="grmore"]'); ok(await until(p, ".gr-think"), "«Dame otras 21» muestra Pensando…");
  ok(await gone(p, ".gr-think") && (await count(p, ".gr-idea")) === 21, "«Dame otras 21» vuelve con 21");
  const second = await p.evaluate(() => [...document.querySelectorAll(".gr-idea .t b")].map((e) => e.textContent.trim()));
  ok(second.filter((t) => first.includes(t)).length === 0, "las otras 21 son distintas de las primeras (0 repetidas)");
  // las propias
  await p.fill("#grown", "Por qué dejé de usar el despertador"); await p.press("#grown", "Enter"); await wait(p, 500);
  ok((await count(p, ".gr-idea")) === 22 && /Por qué dejé de usar el despertador/.test(await text(p, ".gr-idea .t b")) && /Tuya/.test(await text(p, ".gr-idea .t b")), "se puede sumar una idea propia: aparece primera con la marca «Tuya»");
  ok(await p.evaluate(() => document.querySelector(".gr-idea.on") === document.querySelector(".gr-idea") && document.querySelector("#grdevbtn").disabled === false), "la idea propia queda elegida y se habilita «Desarrollar»");
  await tap(p, '[data-act="grmore"]'); await until(p, ".gr-think"); await gone(p, ".gr-think");
  ok((await count(p, ".gr-idea")) === 22 && /Tuya/.test(await text(p, ".gr-idea .t b")), "al pedir otras 21 la idea propia se queda");
  ok(p.errs.length === 0, "sin errores en las ideas", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  console.log("\n== Desarrollar con micrófono, guion y aprobar ==");
  p = await openGrabar(browser, FAKE_SR);
  ok(await toDevelop(p), "elegir una idea y «Desarrollar» abre el paso de contar todo");
  ok(await has(p, "#grmic") && await has(p, "#grraw"), "hay micrófono y un cuadro de texto editable");
  await tap(p, "#grmic"); await wait(p, 900);
  ok((await p.inputValue("#grraw")).includes("Dejé de usar el despertador hace tres meses"), "dictado: la transcripcion aparece en vivo en el cuadro", await p.inputValue("#grraw"));
  await tap(p, "#grmic"); await wait(p, 300);
  ok(await p.evaluate(() => document.querySelector("#grmic").getAttribute("aria-pressed") === "false"), "tocar otra vez corta el micrófono");
  await p.fill("#grraw", DICTADO);
  ok(/Dejé de usar/.test(await p.inputValue("#grraw")), "lo dictado se puede editar a mano");
  await tap(p, '[data-act="grscript"]');
  ok(await until(p, ".gr-script"), "«Ordenar mi guion» arma un guion");
  const sc = await st(p);
  ok(!!sc.script && sc.script.hook.length > 5 && sc.script.beats.length >= 2 && sc.script.cierre.length > 5, "el guion tiene gancho, desarrollo en bloques y cierre", JSON.stringify(sc.script).slice(0, 120));
  ok(sc.script.hook.split(/\s+/).length <= 16, "el gancho cabe en los primeros 3 segundos (<= 16 palabras)", sc.script.hook);
  ok(/despertador/.test(sc.script.texto) && /luz del sol/.test(sc.script.texto) && /acostarte a la misma hora/.test(sc.script.texto), "conserva las palabras de la persona (no inventa)");
  ok(await p.evaluate(() => /≈ \d+:\d\d/.test(document.querySelector(".gr-meta").textContent) && /\d+ palabras/.test(document.querySelector(".gr-meta").textContent)), "muestra la duracion estimada y las palabras");
  ok(/Sin IA conectada/.test(await text(p, ".gr-note")), "avisa que ordenó con reglas simples (sin IA)");
  ok(await p.evaluate(() => ["grapprove", "grchanges", "grbackscript"].every((a) => !!document.querySelector(`[data-act="${a}"]`))), "ofrece Aprobar, Pedir cambios y Volver");
  // pedir cambios
  const w0 = sc.script.palabras;
  await tap(p, '[data-act="grchanges"]'); ok(await until(p, "#grrev"), "«Pedir cambios» abre un cuadro corto para escribir");
  await p.fill("#grrev", "hacelo más corto"); await p.press("#grrev", "Enter");
  await thought(p);
  const sc2 = await st(p);
  ok(sc2.script.palabras < w0, "«hacelo más corto» acorta el guion con una regla local", `${w0} -> ${sc2.script.palabras}`);
  await tap(p, '[data-act="grchanges"]'); await until(p, "#grrev"); await p.fill("#grrev", "agregá un chiste"); await p.press("#grrev", "Enter");
  await thought(p);
  ok(/Sin IA conectada/.test(await text(p, ".gr-note")) && (await st(p)).script.texto === sc2.script.texto, "un cambio que sin IA no se puede hacer lo dice y no toca el guion");
  await tap(p, '[data-act="grchanges"]'); await until(p, "#grrev"); await tap(p, '[data-act="grquick"][data-q="otro cierre"]'); await thought(p);
  ok((await st(p)).script.cierre !== sc2.script.cierre, "los cambios rápidos funcionan («otro cierre»)");
  // editar a mano
  await tap(p, '[data-act="gredit"]'); await until(p, "#gredit"); await p.fill("#gredit", "Mi gancho propio para empezar.\n\nUn bloque del medio.\n\nCierro con esto."); await tap(p, '[data-act="gredone"]'); await until(p, ".gr-script");
  const sc3 = await st(p);
  ok(sc3.script.hook === "Mi gancho propio para empezar." && sc3.script.beats.length === 1 && sc3.script.cierre === "Cierro con esto.", "se puede editar el guion a mano (gancho / medio / cierre)");
  // volver
  await tap(p, '[data-act="grbackscript"]'); ok(await until(p, "#grraw") && (await p.inputValue("#grraw")).includes("despertador"), "«Volver» regresa a lo contado sin perder el texto");
  await tap(p, '[data-act="grscript"]'); await until(p, ".gr-script");
  // aprobar -> teleprompter
  await tap(p, '[data-act="grapprove"]'); ok(await until(p, '[data-act="grrec"]'), "«Aprobar guion» deja listo para grabar");
  ok(/Aprobado/.test(await text(p, ".gr-ready")), "se ve «Aprobado» con el titulo del guion");
  const approved = (await st(p)).script;
  await tap(p, '[data-act="grrec"]'); await until(p, '.gr[data-step="done"]');
  const tp = await p.evaluate(() => window.__tp);
  ok(tp.length === 1 && tp[0].mode === "script" && tp[0].text === approved.texto && tp[0].title === approved.titulo, "«Grabar ahora» abre el teleprompter en modo script con el texto del guion", JSON.stringify(tp).slice(0, 160));
  ok(tp[0].text.split("\n\n")[0] === approved.hook && !("questions" in tp[0]), "el texto va por párrafos: primero el gancho");
  ok(await p.evaluate(() => window.__grabado === 1 && window.__md.join() === "grabar"), "al terminar: onboarding.markDone(\"grabar\") y evento aura:grabado (una sola vez)");
  ok(await has(p, '[data-act="grsend"]') && await has(p, '[data-act="grdl"]') && await has(p, '[data-act="grrerec"]') && await has(p, '[data-act="grnext"]'), "al terminar ofrece: mandarlo a Un video nuevo, descargar, grabar de nuevo y otra idea");
  ok(/grabacion\.webm/.test(await text(p, ".gr-done")), "muestra el archivo grabado");
  // grabar de nuevo
  await tap(p, '[data-act="grrerec"]'); await wait(p, 1200);
  ok((await p.evaluate(() => window.__tp.length)) === 2 && (await p.evaluate(() => window.__tp[1].text)) === approved.texto, "«Grabar de nuevo» reabre el teleprompter con el mismo guion");
  // descargar: usa el adaptador
  await p.evaluate(() => { window.__dl = []; const ad = App.adapter(); ad.download = async (n, d) => { window.__dl.push([n, d && d.size]); return true; }; });
  await tap(p, '[data-act="grdl"]'); await wait(p, 500);
  ok(await p.evaluate(() => window.__dl.length === 1 && /\.webm$/.test(window.__dl[0][0]) && window.__dl[0][1] === 4096), "«Descargar» entrega el archivo por App.adapter().download");
  // mandarlo a Un video nuevo
  await tap(p, '[data-act="grsend"]'); await wait(p, 2600);
  ok(await p.evaluate(() => location.hash === "#crear/video" && App.ui.crear.video.att.normal && App.ui.crear.video.att.normal.items.length === 1 && /grabacion\.webm/.test(App.ui.crear.video.att.normal.items[0].name)), "«Mandarlo a Un video nuevo» lo adjunta como Video normal y abre #crear/video");
  ok(await p.evaluate(() => /Grabado con Grabar/.test(App.ui.crear.video.notes)), "el pedido nuevo lleva la nota de que viene de Grabar");
  ok(await p.evaluate(() => App.ui.crear.video.trail.length === 1 && /ya está cargada/.test(App.ui.crear.video.trail[0].html)) && /ya está cargada/.test(await text(p, ".crear-cloud .log")), "en «Un video nuevo» la nube dice de dónde viene el archivo");
  await p.evaluate(() => { location.hash = "#crear/grabar"; }); await wait(p, 2200);
  ok(await has(p, '.gr[data-step="ask"]') || await has(p, '.gr[data-step="done"]'), "volver a Grabar no deja un estado roto");
  ok(p.errs.length === 0, "sin errores en el flujo de guion", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  console.log("\n== Después de grabar: otra idea y terminar ==");
  p = await openGrabar(browser);
  await p.evaluate(() => { App.teleprompter.open = (a) => { window.__tp.push(a); setTimeout(() => a.onDone({ recorded: null, durationMs: 0, mode: a.mode }), 40); }; }); // esta vez la sesión termina sin archivo (sin cámara)
  ok(await toScript(p), "(preparación) llega al guion");
  await tap(p, '[data-act="grapprove"]'); await until(p, '[data-act="grrec"]'); await tap(p, '[data-act="grrec"]'); await until(p, '.gr[data-step="done"]');
  ok(!(await has(p, '[data-act="grdl"]')) && /Terminado/.test(await text(p, ".gr-done")) && await has(p, '[data-act="grsend"]'), "sin archivo grabado no ofrece descargar, pero sí subir la grabación a mano");
  await tap(p, '[data-act="grnext"]'); ok(await until(p, ".gr-idea") && (await count(p, ".gr-idea")) === 21, "«Otra idea» vuelve a la lista de ideas");
  await tap(p, ".gr-idea"); await tap(p, "#grdevbtn"); await until(p, "#grraw"); ok(!(await p.inputValue("#grraw")).includes("despertador"), "con otra idea se parte de un cuadro vacío");
  await tap(p, '[data-act="crback"]'); await until(p, ".gr-idea"); await tap(p, '[data-act="crback"]'); await until(p, '.gr[data-step="ask"]');
  await tap(p, '[data-act="grstart"][data-v="no"]'); await until(p, ".gr-idea"); await tap(p, ".gr-idea"); await tap(p, "#grdevbtn"); await until(p, "#grraw"); await p.fill("#grraw", DICTADO); await tap(p, '[data-act="grscript"]'); await until(p, ".gr-script");
  await tap(p, '[data-act="grapprove"]'); await until(p, '[data-act="grrec"]'); await tap(p, '[data-act="grrec"]'); await until(p, '.gr[data-step="done"]');
  await tap(p, '[data-act="grfinish"]'); await wait(p, 2600);
  ok(await p.evaluate(() => location.hash === "#crear" && !!document.querySelector('.crear-path[data-c="grabar"]')), "«Terminar» vuelve a «¿Qué querés crear?»");
  await p.click('.crear-path[data-c="grabar"]', { force: true }); await wait(p, 2400);
  ok(await has(p, '.gr[data-step="ask"]'), "la próxima vez Grabar arranca limpio"); await p.context().close();

  console.log("\n== Cerrar el teleprompter a mitad, archivos grandes ==");
  p = await openGrabar(browser);
  // el teleprompter real avisa `completed: false` si se cierra antes de terminar: no hay logro ni pantalla de "grabado"
  await p.evaluate(() => { App.teleprompter.open = (a) => { window.__tp.push(a); setTimeout(() => a.onDone({ recorded: null, durationMs: 2000, mode: a.mode, completed: false, discarded: false }), 40); }; });
  ok(await toScript(p), "(preparación) llega al guion");
  await tap(p, '[data-act="grapprove"]'); await until(p, '[data-act="grrec"]'); await tap(p, '[data-act="grrec"]'); await wait(p, 900);
  ok(await p.evaluate(() => App.ui.crear.grabar.step === "ready" && !!document.querySelector('.gr[data-step="ready"]') && window.__grabado === 0 && window.__md.length === 0), "cerrar el teleprompter a mitad (sin archivo) no marca el paso ni emite aura:grabado y se queda en «listo para grabar»");
  ok(/antes de terminar/.test(await text(p, "#toasts")), "y avisa con un mensaje corto");
  ok(await has(p, '[data-act="grrec"]'), "«Grabar ahora» sigue disponible para probar de nuevo");
  // cerrar a mitad pero con un archivo (se grabó un tramo): se ofrece, sin festejar
  await p.evaluate(() => { App.teleprompter.open = (a) => { window.__tp.push(a); setTimeout(() => a.onDone({ recorded: new File([new Uint8Array(2048)], "parcial.webm", { type: "video/webm" }), durationMs: 5000, mode: a.mode, completed: false }), 40); }; });
  await tap(p, '[data-act="grrec"]'); await until(p, '.gr[data-step="done"]');
  ok(await p.evaluate(() => window.__grabado === 0 && window.__md.length === 0) && /parcial\.webm/.test(await text(p, ".gr-done")), "si se cerró a mitad pero quedó un archivo, se ofrece igual (descargar / mandar), sin marcar el paso");
  // terminar de verdad: ahora sí
  await p.evaluate(() => { App.teleprompter.open = (a) => { window.__tp.push(a); setTimeout(() => a.onDone({ recorded: new File([new Uint8Array(2048)], "completa.webm", { type: "video/webm" }), durationMs: 31000, mode: a.mode, completed: true }), 40); }; });
  await tap(p, '[data-act="grrerec"]'); await wait(p, 900);
  ok(await p.evaluate(() => window.__grabado === 1 && window.__md.join() === "grabar") && /completa\.webm/.test(await text(p, ".gr-done")), "terminar de verdad (completed: true) sí marca «grabar» y emite aura:grabado");
  await p.context().close();

  // una grabación más pesada que el límite de subida (19 MB): primero se descarga, y «Un video nuevo» no la adjunta pero avisa
  p = await openGrabar(browser);
  await p.evaluate(() => { App.teleprompter.open = (a) => { window.__tp.push(a); setTimeout(() => a.onDone({ recorded: new File([new Uint8Array(20 * 1048576)], "larga.webm", { type: "video/webm" }), durationMs: 90000, mode: a.mode, completed: true }), 40); }; });
  ok(await toScript(p), "(preparación) llega al guion");
  await tap(p, '[data-act="grapprove"]'); await until(p, '[data-act="grrec"]'); await tap(p, '[data-act="grrec"]'); await until(p, '.gr[data-step="done"]');
  ok(/Pesa 20,0 MB/.test(await text(p, ".gr-done + .gr-hint")) && /hasta 19,0 MB/.test(await text(p, ".gr-done + .gr-hint")), "una grabación que pasa del límite de subida lo explica (Pesa 20 MB… hasta 19 MB)");
  ok(await p.evaluate(() => document.querySelector(".gr-acts .btn.pri").dataset.act === "grdl" && document.querySelector('[data-act="grsend"]').classList.contains("ghost")), "y entonces lo principal es descargarla, no mandarla");
  await tap(p, '[data-act="grsend"]'); await wait(p, 2600);
  ok(await p.evaluate(() => location.hash === "#crear/video" && !(App.ui.crear.video.att.normal && App.ui.crear.video.att.normal.items.length)), "ir a «Un video nuevo» no adjunta un archivo que no se puede subir");
  await p.context().close();

  console.log("\n== Ya tengo ideas: un guion por idea y elegir ==");
  p = await openGrabar(browser, FAKE_SR);
  await tap(p, '[data-act="grstart"][data-v="si"]'); ok(await until(p, "#grmine"), "«Sí, ya tengo ideas» pide todas las ideas juntas");
  ok(await has(p, "#grmic"), "se pueden dictar (micrófono) o escribir");
  await tap(p, "#grmic"); await wait(p, 900); ok((await p.inputValue("#grmine")).includes("despertador"), "el dictado llena el cuadro de ideas");
  await tap(p, "#grmic"); await wait(p, 300);
  await p.fill("#grmine", "1. Por qué dejé de usar el despertador. Hace tres meses lo apagué y me levanto con la luz del sol, y la verdad es que dormí mejor desde entonces\n2. El error más grande al empezar un negocio: querer vender antes de escuchar a la gente, y eso me costó seis meses\n3. Mi rutina de escritura a mano");
  await tap(p, '[data-act="grmine"]'); ok(await until(p, ".gr-cmp"), "«Armar mis guiones» muestra los guiones para comparar");
  ok((await count(p, ".gr-cmp")) === 3 && (await text(p, ".gr-cmp .t b")).includes("despertador"), "un guion por cada idea (3)");
  ok(await p.evaluate(() => document.querySelector("#grcmpgo").disabled === true), "hasta elegir uno, «Revisar este guion» queda deshabilitado");
  await tap(p, ".gr-cmps li:nth-child(1) .gr-cmp"); await tap(p, '[data-act="grcmpgo"]');
  ok(await until(p, ".gr-script") && /despertador/.test((await st(p)).script.texto), "elegido el correcto pasa a revisar su guion");
  await tap(p, '[data-act="grapprove"]'); await until(p, '[data-act="grrec"]'); await tap(p, '[data-act="grrec"]'); await until(p, '.gr[data-step="done"]');
  const tp2 = await p.evaluate(() => window.__tp);
  ok(tp2.length === 1 && tp2[0].mode === "script" && /luz del sol/.test(tp2[0].text), "va al teleprompter (modo script) con el guion elegido");
  await tap(p, '[data-act="grnext"]'); ok(await until(p, ".gr-cmp") && (await count(p, ".gr-cmp")) === 3, "«Otra idea» vuelve a comparar (los guiones siguen ahí)");
  await tap(p, ".gr-cmps li:nth-child(3) .gr-cmp"); await tap(p, '[data-act="grcmpmore"]'); ok(await until(p, "#grraw") && /rutina de escritura/.test(await p.inputValue("#grraw")), "«Contar más sobre esta» abre el micrófono con lo que ya dijo de esa idea");
  ok(p.errs.length === 0, "sin errores en «ya tengo ideas»", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  console.log("\n== Entrevista: tema, preguntas, segundos ==");
  p = await openGrabar(browser);
  await tap(p, '[data-act="grstart"][data-v="ent"]'); ok(await until(p, "#grtopic"), "«Quiero hacer una entrevista» pide el tema");
  await tap(p, '[data-act="grqs"]'); await wait(p, 500); ok(/tema/i.test(await text(p, ".gr .status.err")), "sin tema no avanza y lo dice");
  await p.fill("#grtopic", "la tinta invisible"); await tap(p, '[data-act="grqs"]');
  ok(await until(p, ".gr-qi"), "arma las preguntas entre los dos");
  const nq = await count(p, ".gr-qi"); ok(nq >= 5 && nq <= 8, "propone entre 5 y 8 preguntas", String(nq));
  ok(/Sin IA conectada/.test(await text(p, ".gr-note")), "avisa que usó preguntas base");
  ok(await p.evaluate(() => [...document.querySelectorAll(".gr-qi")].every((t) => /\?$/.test(t.value.trim()) && /tinta invisible/.test(t.value))), "las preguntas hablan del tema");
  // editar / borrar / sumar / reordenar
  const before = await p.evaluate(() => [...document.querySelectorAll(".gr-qi")].map((t) => t.value));
  await p.fill('.gr-qi[data-i="0"]', "¿Qué es lo primero que hay que saber de la tinta invisible?");
  await tap(p, '[data-act="grqdel"][data-i="1"]'); await wait(p, 400);
  ok((await count(p, ".gr-qi")) === nq - 1, "se puede borrar una pregunta");
  await tap(p, '[data-act="grqadd"]'); await wait(p, 400);
  ok((await count(p, ".gr-qi")) === nq, "se puede agregar una pregunta propia (vacía, lista para escribir)");
  await p.fill(`.gr-qi[data-i="${nq - 1}"]`, "¿Cuánto tarda en aparecer la tinta?");
  await tap(p, `[data-act="grqup"][data-i="${nq - 1}"]`); await wait(p, 400);
  const edited = await p.evaluate(() => [...document.querySelectorAll(".gr-qi")].map((t) => t.value));
  ok(edited[0].startsWith("¿Qué es lo primero") && edited[nq - 2] === "¿Cuánto tarda en aparecer la tinta?" && !edited.includes(before[1]), "las ediciones se conservan: editar, borrar, subir de lugar", JSON.stringify(edited.slice(-2)));
  ok(await p.evaluate(() => document.querySelector('[data-act="grqup"][data-i="0"]').disabled === true && document.querySelector(`[data-act="grqdn"][data-i="${document.querySelectorAll(".gr-qi").length - 1}"]`).disabled === true), "subir la primera y bajar la última están deshabilitados");
  await tap(p, '[data-act="grqmore"]'); await until(p, ".gr-think"); await gone(p, ".gr-think");
  ok((await count(p, ".gr-qi")) > nq && (await count(p, ".gr-qi")) <= 12, "«Sugerime más» suma preguntas nuevas (hasta 12)");
  await tap(p, '[data-act="grqnext"]'); ok(await until(p, ".gr-sec"), "«Seguir» llega a elegir los segundos por pregunta");
  ok((await count(p, ".gr-sec")) === 6 && (await p.evaluate(() => [...document.querySelectorAll(".gr-sec")].map((b) => b.dataset.s).join())) === "10,15,20,30,45,60", "chips de 10 / 15 / 20 / 30 / 45 / 60 segundos");
  ok(await p.evaluate(() => document.querySelector('.gr-sec[data-s="30"]').classList.contains("on")), "30 s viene elegido por defecto");
  await tap(p, '.gr-sec[data-s="15"]'); await wait(p, 200);
  ok(await p.evaluate(() => document.querySelector('.gr-sec[data-s="15"]').classList.contains("on") && !document.querySelector('.gr-sec[data-s="30"]').classList.contains("on") && /× 15 s/.test(document.querySelector("#grsum").textContent)), "elegir 15 s lo marca y actualiza el total");
  await p.fill("#grcust", "25"); await wait(p, 200);
  ok(await p.evaluate(() => App.ui.crear.grabar.secs === 25 && !document.querySelector(".gr-sec.on") && /× 25 s/.test(document.querySelector("#grsum").textContent)), "también se puede escribir otro valor (25 s)");
  const qsNow = await p.evaluate(() => App.ui.crear.grabar.qs.map((q) => q.trim()).filter(Boolean));
  await tap(p, '[data-act="grstartint"]'); await until(p, '.gr[data-step="done"]');
  const tp3 = await p.evaluate(() => window.__tp);
  ok(tp3.length === 1 && tp3[0].mode === "interview" && tp3[0].secondsPerQuestion === 25 && tp3[0].title === "la tinta invisible", "«Empezar la entrevista» abre el teleprompter en modo interview con los segundos elegidos", JSON.stringify(tp3[0]).slice(0, 160));
  ok(JSON.stringify(tp3[0].questions) === JSON.stringify(qsNow) && tp3[0].questions[0].startsWith("¿Qué es lo primero") && !tp3[0].questions.some((q) => !q), "las preguntas van en el orden editado y sin vacías");
  ok(await p.evaluate(() => window.__grabado === 1 && window.__md.join() === "grabar"), "al terminar la entrevista también marca «grabar» y emite aura:grabado");
  ok(/Otro tema/.test(await text(p, ".gr-acts")) && !/Otra idea/.test(await text(p, ".gr-acts")), "después de la entrevista ofrece «Otro tema»");
  await tap(p, '[data-act="grnext"]'); ok(await until(p, "#grtopic") && (await p.inputValue("#grtopic")) === "", "«Otro tema» vuelve a pedir el tema");
  ok(p.errs.length === 0, "sin errores en la entrevista", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  p = await openGrabar(browser);
  await tap(p, '[data-act="grstart"][data-v="ent"]'); await until(p, "#grtopic"); await p.fill("#grtopic", "cómo empezar a escribir a mano"); await tap(p, '[data-act="grqs"]'); await until(p, ".gr-qi");
  ok(await p.evaluate(() => [...document.querySelectorAll(".gr-qi")].every((t) => !/con cómo empezar|de cómo empezar|sobre cómo empezar/i.test(t.value))), "si el tema es una frase, las preguntas lo entrecomillan en vez de armar frases torcidas");
  await p.evaluate(() => { document.querySelectorAll(".gr-qi").forEach((t, i) => { t.value = ""; t.dispatchEvent(new Event("input", { bubbles: true })); }); });
  await tap(p, '[data-act="grqnext"]'); await wait(p, 500);
  ok(/pregunta/i.test(await text(p, ".gr .status.err")), "no se puede seguir sin ninguna pregunta"); await p.context().close();

  console.log("\n== Atrás ==");
  p = await openGrabar(browser);
  await toIdeas(p); await tap(p, '[data-act="crback"]');
  ok(await until(p, '.gr[data-step="ask"]'), "atrás desde las ideas vuelve a la primera pregunta");
  await tap(p, '[data-act="crback"]'); await wait(p, 2600);
  ok(await p.evaluate(() => location.hash === "#crear" && !!document.querySelector('.crear-path[data-c="grabar"]')), "atrás desde la primera pregunta vuelve a «¿Qué querés crear?»");
  await p.evaluate(() => { location.hash = "#crear/grabar"; }); await wait(p, 2200);
  await tap(p, '[data-act="grstart"][data-v="no"]'); await until(p, ".gr-idea"); await tap(p, ".gr-ideas li:nth-child(2) .gr-idea"); await tap(p, "#grdevbtn"); await until(p, "#grraw"); await p.fill("#grraw", DICTADO);
  await tap(p, '[data-act="grscript"]'); await until(p, ".gr-script");
  await tap(p, '[data-act="crback"]'); ok(await until(p, "#grraw") && (await p.inputValue("#grraw")).includes("despertador"), "atrás desde el guion vuelve a lo contado, con el texto");
  await tap(p, '[data-act="crback"]'); ok(await until(p, ".gr-idea") && await p.evaluate(() => !!document.querySelector(".gr-idea.on")), "atrás desde lo contado vuelve a las ideas con la elegida marcada");
  await tap(p, '[data-act="crback"]'); await until(p, '.gr[data-step="ask"]');
  // un doble toque no apila dos pasos
  await p.evaluate(() => { const b = document.querySelector('[data-act="grstart"][data-v="ent"]'); b.click(); b.click(); });
  await until(p, "#grtopic"); await wait(p, 700);
  ok((await p.evaluate(() => App.ui.crear.grabar.hist.length)) === 1 && (await p.evaluate(() => document.querySelectorAll(".crear-cloud .log .msg.me").length)) <= 1, "un doble toque no duplica el paso ni la conversación");
  // cambiar de cuenta a mitad del camino empieza de nuevo (las ideas eran de la otra cuenta)
  await p.evaluate(() => { App.ui.crear.grabar.step = "ask"; }); await p.evaluate(() => App.render(true)); await wait(p, 500);
  await tap(p, '[data-act="grstart"][data-v="no"]'); await until(p, ".gr-idea");
  const brandA = await p.evaluate(() => App.sel.brand().id);
  await p.evaluate(() => { const o = App.S.brands.find((b) => b.id !== App.sel.brand().id); App.sel.setBrand(o.id); }); await wait(p, 1500);
  ok(await p.evaluate((a) => App.sel.brand().id !== a && !!document.querySelector('.gr[data-step="ask"]'), brandA), "al cambiar de cuenta a mitad de camino se empieza de nuevo (las ideas eran de la otra cuenta)");
  ok(p.errs.length === 0, "sin errores al volver atrás", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  console.log("\n== Voz: sin reconocimiento de voz se escribe y sigue igual ==");
  p = await openGrabar(browser, NO_SR);
  ok(await toDevelop(p), "(preparación) llega a contar todo");
  ok(!(await has(p, "#grmic")) && /no dicta por voz/i.test(await text(p, ".gr-hint")), "sin SpeechRecognition no hay micrófono: avisa y deja escribir");
  await p.fill("#grraw", DICTADO); await tap(p, '[data-act="grscript"]'); ok(await until(p, ".gr-script"), "el mismo flujo sigue con el texto escrito"); await p.context().close();
  // permiso denegado
  p = await openGrabar(browser, `(() => { class SR { start() { setTimeout(() => { this.onerror && this.onerror({ error: "not-allowed" }); this.onend && this.onend(); }, 60); } stop() {} abort() {} } window.SpeechRecognition = SR; window.webkitSpeechRecognition = SR; })();`);
  await toDevelop(p); await tap(p, "#grmic"); await wait(p, 900);
  ok(!(await has(p, "#grmic")) && /permiso/i.test(await text(p, ".gr-hint")) && await has(p, "#grraw"), "si niegan el permiso del micrófono cae al cuadro de texto con un aviso"); await p.context().close();

  console.log("\n== Con IA (sample simulado): una consulta por botón, sin bucles ==");
  p = await openGrabar(browser, sampleInit(true));
  await tap(p, '[data-act="grstart"][data-v="no"]'); await until(p, ".gr-idea"); await wait(p, 300);
  let calls = await p.evaluate(() => window.__sampleCalls);
  ok(calls.length === 1 && calls[0].cache === false && calls[0].hasSignal, "pedir ideas hace UNA sola consulta (sin cache, con señal para poder saltarla)", String(calls.length));
  ok((await count(p, ".gr-idea")) === 21 && /Idea de IA 1$/.test((await p.evaluate(() => document.querySelector(".gr-idea .t b").textContent)).trim()), "usa las 21 ideas que devolvió la IA");
  ok(!(await has(p, ".gr-note")), "con IA no aparece el aviso de ideas base");
  ok(/propone EXACTAMENTE 21 ideas/.test(calls[0].q) && /KT Español/.test(calls[0].q) && /piezas_que_ya_produjo/.test(calls[0].q), "el pedido lleva la cuenta, sus piezas y pide exactamente 21");
  await tap(p, '[data-act="grmore"]'); await until(p, ".gr-think"); await gone(p, ".gr-think");
  calls = await p.evaluate(() => window.__sampleCalls);
  ok(calls.length === 2 && /Idea de IA 1\b/.test(calls[1].q), "«Dame otras 21» es otra consulta y le pasa las ya mostradas para no repetirlas");
  ok(/Idea de IA 22$/.test((await p.evaluate(() => document.querySelector(".gr-idea .t b").textContent)).trim()), "y muestra las nuevas");
  await tap(p, ".gr-idea"); await tap(p, "#grdevbtn"); await until(p, "#grraw"); await p.fill("#grraw", DICTADO); await tap(p, '[data-act="grscript"]'); await until(p, ".gr-script"); await wait(p, 300);
  calls = await p.evaluate(() => window.__sampleCalls);
  ok(calls.length === 3 && /LO QUE DIJO LA PERSONA/.test(calls[2].q) && /luz del sol/.test(calls[2].q), "ordenar el guion manda lo que dijo la persona");
  const aiSc = await st(p);
  ok(aiSc.script.titulo === "Guion de IA" && aiSc.script.hook === "Esto es lo que cambió mi mañana." && aiSc.script.beats.length === 2 && !(await has(p, ".gr-note")), "el guion es el que devolvió la IA y no hay aviso");
  await tap(p, '[data-act="grchanges"]'); await until(p, "#grrev"); await p.fill("#grrev", "hacelo más corto"); await p.press("#grrev", "Enter"); await thought(p);
  calls = await p.evaluate(() => window.__sampleCalls);
  ok(calls.length === 4 && /GUION ACTUAL/.test(calls[3].q) && /hacelo más corto/.test(calls[3].q) && (await st(p)).script.hook === "Este gancho lo cambió la IA.", "«Pedir cambios» manda el guion y la instrucción a la IA y aplica lo que vuelve");
  await tap(p, '[data-act="crback"]'); await until(p, "#grraw"); await tap(p, '[data-act="crback"]'); await until(p, ".gr-idea"); await tap(p, '[data-act="crback"]'); await until(p, '.gr[data-step="ask"]');
  await tap(p, '[data-act="grstart"][data-v="ent"]'); await until(p, "#grtopic"); await p.fill("#grtopic", "el hábito de dos dólares"); await tap(p, '[data-act="grqs"]'); await until(p, ".gr-qi"); await wait(p, 300);
  calls = await p.evaluate(() => window.__sampleCalls);
  ok(calls.length === 5 && /TEMA DE LA ENTREVISTA/.test(calls[4].q) && (await count(p, ".gr-qi")) === 6 && (await p.evaluate(() => document.querySelector(".gr-qi").value)) === "Pregunta de IA 1?" && !(await has(p, ".gr-note")), "las preguntas de la entrevista también salen de la IA (6)");
  ok(await p.evaluate(() => window.__sampleCalls.every((c) => c.model === "claude-sonnet-5-5")), "las consultas usan el modelo elegido en la nube (Sonnet 5.5 por defecto)");
  ok(p.errs.length === 0, "sin errores con IA", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  p = await openGrabar(browser, sampleInit(false));
  await tap(p, '[data-act="grstart"][data-v="no"]'); await until(p, ".gr-idea");
  ok((await count(p, ".gr-idea")) === 21 && /Idea de IA/.test(await text(p, ".gr-idea .t b")) && !(await has(p, ".gr-note")), "sin sample.json también sirve (lee el JSON del texto de sample())"); await p.context().close();

  p = await openGrabar(browser, sampleInit(true));
  await p.evaluate(() => { window.__sampleMode = "reject"; });
  await tap(p, '[data-act="grstart"][data-v="no"]'); await until(p, ".gr-idea"); await wait(p, 500);
  calls = await p.evaluate(() => window.__sampleCalls);
  ok(calls.length === 1, "si la IA rechaza (límite de uso) NO se reintenta: una sola consulta", String(calls.length));
  ok((await count(p, ".gr-idea")) === 21 && /límite de uso/i.test(await text(p, ".gr-note")) && /ideas base/.test(await text(p, ".gr-note")), "cae a las 21 ideas base y dice por qué (límite de uso)");
  await p.evaluate(() => { window.__sampleMode = "reject"; });
  await tap(p, ".gr-idea"); await tap(p, "#grdevbtn"); await until(p, "#grraw"); await p.fill("#grraw", DICTADO); await tap(p, '[data-act="grscript"]'); await until(p, ".gr-script"); await wait(p, 300);
  ok((await st(p)).script.hook.length > 5 && /límite de uso/i.test(await text(p, ".gr-note")) && /ordené/i.test(await text(p, ".gr-note")), "el guion también cae a la versión local si la IA rechaza");
  await p.context().close();

  p = await openGrabar(browser, sampleInit(true));
  await p.evaluate(() => { window.__sampleMode = "hang"; });
  await tap(p, '[data-act="grstart"][data-v="no"]'); ok(await until(p, ".gr-think") && /Usar ideas base/.test(await text(p, '[data-act="grskip"]')), "mientras la IA piensa se ve «Pensando…» con un botón para saltarla");
  await wait(p, 900); await tap(p, '[data-act="grskip"]');
  ok(await until(p, ".gr-idea") && (await count(p, ".gr-idea")) === 21 && /Salteaste la IA/.test(await text(p, ".gr-note")), "«Usar ideas base» cancela la consulta y muestra las 21 locales");
  ok((await p.evaluate(() => window.__sampleCalls.length)) === 1, "saltarla no dispara otra consulta"); await p.context().close();

  p = await openGrabar(browser, sampleInit(true));
  await p.evaluate(() => { window.__sampleMode = "hang"; });
  await tap(p, '[data-act="grstart"][data-v="no"]'); await until(p, ".gr-think"); await tap(p, '[data-act="crback"]');
  ok(await until(p, '.gr[data-step="ask"]') && !(await has(p, ".gr-think")), "volver atrás mientras piensa cancela y no deja la pantalla colgada");
  await wait(p, 1200); ok(await has(p, '.gr[data-step="ask"]'), "y el resultado tardío no pisa lo que se ve ahora"); await p.context().close();

  console.log("\n== Lógica local (sin IA): datos planos ==");
  p = await open(browser, "?demo=1&preset=kt");
  const loc = await p.evaluate(async () => {
    const out = { n: {}, det: true, titles: {}, q: [], script: null, rev: null };
    const brands = App.S.brands.slice();
    for (const b of brands) { const a = await App.grabarAI.ideas(b, 21), c = await App.grabarAI.ideas(b, 21); out.n[b.id] = a.length; out.titles[b.id] = new Set(a.map((i) => i.titulo)).size; if (JSON.stringify(a) !== JSON.stringify(c)) out.det = false; }
    out.plain = Object.keys((await App.grabarAI.ideas(brands[0], 3))[0]).sort().join();
    out.q = await App.grabarAI.questions("la tinta invisible", 6);
    const sc = await App.grabarAI.script({ titulo: "Mi idea", gancho: "Esto es lo que aprendí." }, "mi idea es muy corta");
    out.script = { keys: Object.keys(sc).sort().join(), thin: sc.thin, hook: sc.hook };
    const sc2 = await App.grabarAI.script({ titulo: "x" }, "eh osea yo creo que, bueno, el café de la mañana no te despierta, lo que te despierta es el hábito. y entonces dejé de tomarlo. pero la verdad es que lo extraño. sígueme para más ideas");
    out.rev = await App.grabarAI.revise(sc2, "más directo");
    out.sc2 = sc2;
    return out;
  });
  ok(Object.values(loc.n).every((n) => n === 21) && Object.keys(loc.n).length >= 2, "ideas(brand, 21) da 21 para cada cuenta del espacio", JSON.stringify(loc.n));
  ok(Object.values(loc.titles).every((n) => n === 21), "sin títulos repetidos en ninguna cuenta");
  ok(loc.det, "el generador local es estable (misma cuenta y ronda, mismas ideas)");
  ok(loc.plain === "gancho,por_que,titulo", "las ideas son datos planos {titulo, gancho, por_que}", loc.plain);
  ok(loc.q.length === 6 && loc.q.every((q) => /^[¿A-Z]/.test(q)), "questions(topic, 6) da 6 preguntas", String(loc.q.length));
  ok(loc.script.thin === true && loc.script.hook === "Esto es lo que aprendí.", "una idea muy corta se marca y el gancho viene de la idea", JSON.stringify(loc.script));
  ok(!/\b(eh|osea)\b/i.test(loc.sc2.texto) && /el café de la mañana no te despierta/i.test(loc.sc2.texto), "el guion local saca muletillas pero deja las palabras de la persona");
  ok(/sígueme para más ideas/i.test(loc.sc2.cierre) && loc.sc2.cierreSugerido === false, "si la persona ya dijo un cierre, se usa ese (no se inventa otro)");
  ok(typeof loc.rev.texto === "string" && loc.rev.hook && loc.rev.palabras <= loc.sc2.palabras, "revise(script, «más directo») devuelve el guion completo, sin crecer", `${loc.sc2.palabras} -> ${loc.rev.palabras}`);
  const kinds = await p.evaluate(() => {
    const es = App.grabarAI.local.ideas({ id: "x-es", lang: "es", piezas: ["Escribir a mano", "Tu primer cliente", "Tinta invisible", "Empezar un proyecto"], mejor: "", predictor: false }, 21, 0, []);
    const en = App.grabarAI.local.ideas({ id: "x-en", lang: "en", piezas: ["Writing by hand", "Morning ritual", "Your first client", "Starting a project"], mejor: "", predictor: false }, 21, 0, []);
    return { es: es.map((i) => i.titulo), en: en.map((i) => i.titulo) };
  });
  ok(kinds.es.length === 21 && new Set(kinds.es).size === 21 && kinds.en.length === 21 && new Set(kinds.en).size === 21, "con temas que son un verbo o llevan posesivo igual salen 21 ideas distintas");
  ok(!kinds.es.some((t) => /con escribir|con empezar|probé tu|historia con tu|rutina con tu/i.test(t)), "en español no arma frases torcidas con verbos («con empezar un proyecto») ni con posesivos («probé tu primer cliente»)", kinds.es.filter((t) => /con escribir|con empezar|probé tu/i.test(t)).join(" | "));
  ok(kinds.es.some((t) => /\bal escribir a mano|para escribir a mano|Cómo escribir a mano|Por qué cuesta tanto/.test(t)) || kinds.es.some((t) => /empezar un proyecto/.test(t)), "los temas con verbo usan plantillas pensadas para verbos");
  ok(!kinds.en.some((t) => /with writing|with starting|tried your|story with your|routine with your|start with starting/i.test(t)), "en inglés pasa lo mismo con los gerundios y los posesivos", kinds.en.filter((t) => /with writing|with starting|tried your/i.test(t)).join(" | "));
  const noop = await p.evaluate(() => { const sc = App.grabarAI.local.script({ titulo: "x" }, "Dejé el café hace un mes y dormí mejor. Si te sirvió, guárdalo."); return { corto: App.grabarAI.local.revise(sc, "hacelo más corto", "es").meta, directo: App.grabarAI.local.revise(sc, "más directo", "es").meta, raro: App.grabarAI.local.revise(sc, "agregá un chiste", "es").meta }; });
  ok(noop.corto.applied === false && /Ya es corto/.test(noop.corto.note) && noop.directo.applied === false && /ya va al grano/.test(noop.directo.note), "si lo pedido ya estaba así lo dice («Ya es corto»), no dice que no puede");
  ok(noop.raro.applied === false && /Sin IA conectada no puedo/.test(noop.raro.note), "y si es un cambio que sin IA no se sabe hacer, lo dice distinto");
  ok(p.errs.length === 0, "sin errores en la lógica local", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  console.log("\n== Teléfono (390 px) ==");
  const M = { width: 390, height: 844 };
  p = await openGrabar(browser, FAKE_SR, M);
  const fit = async (label) => {
    const o = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    ok(o, label + ": sin scroll horizontal"); const s = await p.evaluate(spill); ok(!s, label + ": nada se sale de la pantalla", s);
  };
  await fit("primera pregunta");
  ok(await p.evaluate(() => [...document.querySelectorAll('[data-act="grstart"]')].every((b) => b.getBoundingClientRect().height >= 44 && b.getBoundingClientRect().width > 200)), "las tres opciones son tocables (>= 44 px de alto)");
  await toIdeas(p); await wait(p, 600); await fit("ideas");
  ok(await p.evaluate(() => { const l = document.querySelector(".gr-ideas").getBoundingClientRect(); return l.height <= innerHeight * 0.5 && l.left >= 0 && l.right <= innerWidth; }), "la lista de ideas tiene su propio scroll y cabe en la pantalla");
  ok(await p.evaluate(() => [...document.querySelectorAll(".gr-acts .btn")].every((b) => b.getBoundingClientRect().height >= 44)), "los botones de las ideas miden >= 44 px");
  await tap(p, ".gr-idea"); await tap(p, "#grdevbtn"); await until(p, "#grraw"); await wait(p, 700); await fit("contar todo");
  ok(await p.evaluate(() => { const m = document.querySelector("#grmic").getBoundingClientRect(); return m.width >= 44 && m.height >= 44; }), "el micrófono mide >= 44 px");
  ok(await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector("#grraw")).fontSize) >= 16), "el cuadro de texto es de 16 px (Safari no hace zoom)");
  await p.fill("#grraw", DICTADO); await tap(p, '[data-act="grscript"]'); await until(p, ".gr-script"); await wait(p, 700); await fit("guion");
  ok(await p.evaluate(() => [...document.querySelectorAll(".gr-acts .btn")].every((b) => b.getBoundingClientRect().height >= 44)), "Aprobar / Pedir cambios / Volver miden >= 44 px");
  await tap(p, '[data-act="grchanges"]'); await until(p, "#grrev"); await wait(p, 400); await fit("pedir cambios");
  await tap(p, '[data-act="grapprove"]'); await until(p, '[data-act="grrec"]'); await wait(p, 500); await fit("listo para grabar");
  await tap(p, '[data-act="grrec"]'); await until(p, '.gr[data-step="done"]'); await wait(p, 700); await fit("terminado");
  await p.evaluate(() => { App.crearGrabar.reset(); App.render(true); }); await until(p, '.gr[data-step="ask"]'); await wait(p, 700);
  await tap(p, '[data-act="grstart"][data-v="si"]'); await until(p, "#grmine"); await wait(p, 600); await fit("tus ideas");
  await p.fill("#grmine", "Idea uno sobre el café de la mañana\nIdea dos sobre escribir a mano"); await tap(p, '[data-act="grmine"]'); await until(p, ".gr-cmp"); await wait(p, 700); await fit("comparar guiones");
  await tap(p, '[data-act="crback"]'); await until(p, "#grmine"); await tap(p, '[data-act="crback"]'); await until(p, '.gr[data-step="ask"]');
  await tap(p, '[data-act="grstart"][data-v="ent"]'); await until(p, "#grtopic"); await wait(p, 500); await fit("tema de la entrevista");
  await p.fill("#grtopic", "la tinta invisible"); await tap(p, '[data-act="grqs"]'); await until(p, ".gr-qi"); await wait(p, 800); await fit("preguntas");
  ok(await p.evaluate(() => [...document.querySelectorAll(".gr-q .iconbtn")].every((b) => b.getBoundingClientRect().width >= 44 && b.getBoundingClientRect().height >= 44)), "subir / bajar / borrar miden >= 44 px");
  ok(await p.evaluate(() => [...document.querySelectorAll(".gr-qi")].every((t) => { const r = t.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })), "las preguntas caben en el ancho");
  await tap(p, '[data-act="grqnext"]'); await until(p, ".gr-sec"); await wait(p, 700); await fit("segundos por pregunta");
  ok(await p.evaluate(() => [...document.querySelectorAll(".gr-sec")].every((b) => b.getBoundingClientRect().height >= 44)), "los chips de segundos miden >= 44 px");
  ok(await p.evaluate(() => { const l = document.querySelector(".crear-cloud .log").getBoundingClientRect(), c = document.querySelector(".crear-cloud").getBoundingClientRect(); return c.left >= 0 && c.right <= innerWidth && l.height < 260; }), "la conversación queda compacta (no se come la pantalla)");
  ok(p.errs.length === 0, "sin errores en teléfono", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  // modo noche y otro espacio (Lumen: tuteo e ideas de otra cuenta)
  console.log("\n== Noche y otro espacio ==");
  p = await open(browser, "?demo=1&preset=lumen"); await stub(p, {}); await nav(p, "#crear/grabar", 2200);
  ok(/¿Ya tienes ideas para grabar\?/.test(await text(p, ".crear-cloud .log")), "en un espacio con tuteo la pregunta dice «¿Ya tienes ideas…?»");
  await toIdeas(p); ok((await count(p, ".gr-idea")) === 21, "Lumen también da 21 ideas");
  ok(await p.evaluate(() => { const n = document.querySelector(".gr-idea .t b").textContent.toLowerCase(); const ctx = App.grabarAI.ctx(); return ctx.lang === "es" ? /[a-záéíóú]/.test(n) : true; }), "las ideas siguen el idioma de la cuenta activa");
  await p.evaluate(() => { document.documentElement.dataset.aura = "night"; }); await wait(p, 400);
  ok(await p.evaluate(() => { const b = getComputedStyle(document.querySelector(".gr-idea")).backgroundColor, t = getComputedStyle(document.querySelector(".gr-idea .t b")).color; return b !== t && !!b; }), "de noche las tarjetas siguen legibles (tokens del tema)");
  ok(p.errs.length === 0, "sin errores en Lumen", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  await browser.close();
  done("Grabar");
})();
