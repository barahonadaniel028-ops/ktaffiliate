// Pruebas del teleprompter propio (DECISIONES.md #20): guion que se desplaza solo, entrevista pregunta por pregunta, camara y grabacion, y limpieza total.
// Uso: node tools/test-teleprompter.cjs   (antes: python3 tools/build.py --local <vendor>). Chromium con camara y microfono FALSOS (banderas de abajo): no hace falta hardware.
const L = require("./lib-test.cjs"), { open, ok, wait, done } = L;
const MEDIA = ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"];

// Espias que corren ANTES de la pagina: pistas de camara abiertas, wake lock simulado y cuantos cuadros de animacion pide el bucle del teleprompter
const SPY = () => {
  window.__tracks = []; window.__wl = { req: 0, rel: 0, active: 0 }; window.__loopRaf = 0; window.__dl = 0;
  const md = navigator.mediaDevices;
  if (md && md.getUserMedia) {
    const orig = md.getUserMedia.bind(md);
    md.getUserMedia = async (c) => { const s = await orig(c); s.getTracks().forEach((t) => window.__tracks.push(t)); return s; };
  }
  try {
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request: async () => {
      window.__wl.req++; window.__wl.active++; const l = new EventTarget(); l.released = false;
      l.release = async () => { if (!l.released) { l.released = true; window.__wl.rel++; window.__wl.active--; l.dispatchEvent(new Event("release")); } };
      return l;
    } } });
  } catch (e) { /* ya existia */ }
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => { if (cb && cb.name === "loop") window.__loopRaf++; return raf(cb); };
};
// sin camara: getUserMedia rechaza como cuando se niega el permiso o el iframe no lo deja
const NOCAM_DENIED = () => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("Permission denied", "NotAllowedError")); };
const NOCAM_NONE = () => { Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined }); };

const para = (n) => `Hoy te voy a contar el número ${n} de mis trucos favoritos para grabar videos que enganchan desde el primer segundo, sin vueltas y con una idea clara. [pausa] Mirá a la cámara y sonreí.`;
const LONG = Array.from({ length: 14 }, (_, i) => para(i + 1)).join("\n\n");
const SHORT = "Hola, soy Daniel y hoy te cuento una sola cosa: grabar es más fácil cuando alguien te acompaña. [sonríe] Listo, eso es todo por hoy.";   // 24 palabras (las acotaciones no cuentan)
const QS = ["¿Qué te hizo empezar a crear contenido?", "¿Cuál fue tu mayor error al principio?", "¿Qué le dirías a alguien que recién empieza?"];

const S = (p) => p.evaluate(() => App.teleprompter.state());
const openTp = (p, o) => p.evaluate((o) => {
  window.__done = null; window.__doneN = 0; window.__file = null;
  App.teleprompter.open(Object.assign({ onDone: (r) => { window.__doneN++; window.__file = r.recorded || null; window.__done = Object.assign({}, r, { recorded: r.recorded ? { size: r.recorded.size, name: r.recorded.name, type: r.recorded.type, isFile: r.recorded instanceof File } : null }); } }, o));
}, o);
const waitPhase = (p, ph, ms) => p.waitForFunction((x) => App.teleprompter.state().phase === x, ph, { timeout: ms || 9000 }).then(() => true).catch(() => false);
const waitDone = (p, ms) => p.waitForFunction(() => window.__doneN > 0, null, { timeout: ms || 12000 }).then(() => true).catch(() => false);
// velocidad observada (px/s) en una ventana de tiempo real: no depende de cuantos cuadros pinte el navegador sin GPU
async function rate(p, ms) {
  const a = await p.evaluate(() => ({ t: performance.now(), pos: App.teleprompter.state().pos })); await wait(p, ms);
  const b = await p.evaluate(() => ({ t: performance.now(), pos: App.teleprompter.state().pos })); return (b.pos - a.pos) / ((b.t - a.t) / 1000);
}
const ty = (p) => p.evaluate(() => { const m = new DOMMatrix(getComputedStyle(document.querySelector(".tp-track")).transform); return m.m42; });
const key = (p, k) => p.keyboard.press(k);
async function startRun(p) { await key(p, "Space"); return waitPhase(p, "run", 9000); }
const click = (p, sel) => p.click(sel, { force: true, timeout: 8000 });

(async () => {
  const browser = await L.launch(MEDIA); let rd;

  // ================= guion, escritorio, con camara falsa =================
  console.log("\n== Teleprompter: guion (1440 px, camara falsa) ==");
  let p = await open(browser, "?demo=1&preset=kt#hoy", SPY);
  ok(await p.evaluate(() => !!App.teleprompter && typeof App.teleprompter.open === "function" && typeof App.teleprompter.close === "function" && typeof App.teleprompter.isOpen === "function"), "App.teleprompter expone open/close/isOpen");
  ok(!(await p.evaluate(() => App.teleprompter.isOpen())), "cerrado al arrancar");
  await openTp(p, { mode: "script", title: "Mi primer video", text: LONG });
  await wait(p, 900);
  ok(await p.evaluate(() => App.teleprompter.isOpen() && !!document.querySelector(".tp")), "open() abre el teleprompter");
  const geo = await p.evaluate(() => { const r = document.querySelector(".tp"), b = r.getBoundingClientRect(); return { z: +getComputedStyle(r).zIndex, w: b.width, h: b.height, role: r.getAttribute("role"), modal: r.getAttribute("aria-modal"), label: r.getAttribute("aria-label"), bg: getComputedStyle(r).backgroundColor, inertN: Array.from(document.querySelector(".aura-app").children).filter((n) => n !== r && n.inert).length, ovf: document.documentElement.style.overflow, inside: r.contains(document.activeElement) }; });
  ok(geo.z > 450, "queda por encima de todo (z-index > 450: editor, Jarvis y morph)", String(geo.z));
  ok(geo.w === 1440 && geo.h === 900, "ocupa toda la pantalla", geo.w + "x" + geo.h);
  ok(geo.role === "dialog" && geo.modal === "true" && /Mi primer video/.test(geo.label || ""), "es un dialogo modal con nombre accesible");
  ok(geo.inertN >= 3 && geo.ovf === "hidden", "el resto de la app queda inerte y la pagina no se desplaza por debajo", JSON.stringify({ i: geo.inertN, o: geo.ovf }));
  ok(geo.inside, "el foco entra al teleprompter");
  const dark = await p.evaluate(() => { const c = getComputedStyle(document.querySelector(".tp")).getPropertyValue("--tp-bg").trim(), ink = getComputedStyle(document.querySelector(".tp-body")).color; return { c, ink }; });
  ok(dark.c === "#05090a" && /rgb\(244, 240, 230\)/.test(dark.ink), "el area de lectura es siempre oscura con letra marfil (no sigue el tema)", JSON.stringify(dark));
  let st = await S(p);
  ok(st.mode === "script" && st.phase === "ready" && st.words === 14 * 34, "estado inicial: guion listo con 476 palabras (sin contar las acotaciones)", JSON.stringify({ w: st.words, ph: st.phase }));
  await p.evaluate(() => App.teleprompter.close()); await wait(p, 600);
  // las acotaciones [..] no cuentan como palabras
  await openTp(p, { mode: "script", text: SHORT }); await wait(p, 500);
  st = await S(p);
  ok(st.words === 24, "las acotaciones [entre corchetes] no cuentan como palabras (24)", String(st.words));
  ok(await p.evaluate(() => document.querySelectorAll(".tp-cue").length === 1 && /\[sonríe\]/.test(document.querySelector(".tp-cue").textContent)), "la acotacion se ve aparte, en otro color");
  await p.evaluate(() => App.teleprompter.close()); await wait(p, 600);

  await openTp(p, { mode: "script", title: "Mi primer video", text: LONG }); await wait(p, 700);
  ok(await p.waitForFunction(() => App.teleprompter.state().camera === "on", null, { timeout: 8000 }).then(() => true).catch(() => false), "con camara falsa: la camara queda lista (state.camera = on)");
  ok(await p.evaluate(() => document.querySelector(".tp-cam").videoWidth > 0 || document.querySelector(".tp-cam").readyState >= 0), "la vista previa de la camara se conecta");
  ok(await p.evaluate(() => /Grabar con cámara/.test(document.querySelector(".tp-camsw").textContent) && document.querySelector(".tp-camsw").getAttribute("aria-checked") === "true"), "ofrece \"Grabar con cámara\" (activado por defecto)");
  ok(await p.evaluate(() => getComputedStyle(document.querySelector(".tp-cam")).transform.startsWith("matrix(-1")), "la vista previa se ve en espejo");
  st = await S(p);
  ok(st.wpm === 140 && st.phase === "ready" && st.mime && /webm|mp4/.test(st.mime), "WPM por defecto 140 y formato de grabacion elegido", st.mime);
  ok(await p.evaluate(() => /≈ \d+:\d\d/.test(document.querySelector(".tp-info").textContent)), "antes de empezar muestra la duracion estimada");
  await p.screenshot({ path: "/tmp/tp-shot-ready.png" }).catch(() => {});

  // ---- cuenta regresiva y arranque ----
  await key(p, "Space");
  ok(await waitPhase(p, "count", 3000), "Espacio: empieza la cuenta regresiva");
  ok(await p.evaluate(() => !document.querySelector(".tp-count").hidden && /^[123]$/.test(document.querySelector(".tp-cn").textContent)), "se ve la cuenta 3-2-1");
  ok(await p.evaluate(() => App.teleprompter.state().pos === 0), "durante la cuenta el texto no se mueve");
  ok(await p.evaluate(() => App.teleprompter.state().recording === "on"), "la grabacion arranca junto con la cuenta regresiva");
  ok(await waitPhase(p, "run", 9000), "despues de la cuenta pasa a leer");
  ok(await p.evaluate(() => document.querySelector(".tp-count").hidden), "la cuenta se esconde");
  // ---- el texto avanza de forma continua con un unico translateY ----
  const ys = []; for (let i = 0; i < 6; i++) { ys.push(await ty(p)); await wait(p, 350); }
  ok(ys.every((y, i) => i === 0 || y < ys[i - 1]), "el translateY de la capa de texto baja de forma monotona (el texto sube)", ys.map((y) => y.toFixed(1)).join(","));
  ok(ys[0] <= 0 && ys[5] < -5, "el texto efectivamente se desplaza", ys[5].toFixed(1));
  st = await S(p);
  ok(Math.abs((await ty(p)) + st.pos) < 40, "el translateY sigue a la posicion del estado");
  ok(await p.evaluate(() => { const t = document.querySelector(".tp-track"), cs = getComputedStyle(t); return /transform/.test(cs.willChange) && !t.style.top && !t.style.marginTop; }), "la capa usa will-change: transform y solo se escribe el translateY (nada de top/margin)");
  const nodes = await p.evaluate(() => document.querySelectorAll(".tp-body p").length); ok(nodes === 14, "el guion son 14 parrafos en un solo contenedor", String(nodes));
  // velocidad real = la del estado
  const r0 = await rate(p, 1600); st = await S(p);
  ok(r0 > st.pxPerSec * 0.7 && r0 < st.pxPerSec * 1.3, "la velocidad medida coincide con la calculada (px/s)", r0.toFixed(1) + " vs " + st.pxPerSec.toFixed(1));
  ok(Math.abs(st.maxPos / st.pxPerSec - st.words / st.wpm * 60) < 0.5, "WPM veraz: alto del guion / velocidad = palabras / WPM x 60 s", (st.maxPos / st.pxPerSec).toFixed(1) + " vs " + (st.words / st.wpm * 60).toFixed(1));
  ok(await p.evaluate(() => document.querySelector(".tp-rec").getBoundingClientRect().width > 0 && /REC/.test(document.querySelector(".tp-rec").textContent)), "indicador REC visible mientras graba");
  // ---- WPM proporcional ----
  for (let i = 0; i < 4; i++) await key(p, "-");   // 140 -> 100
  await wait(p, 200); st = await S(p);
  ok(st.wpm === 100, "la tecla - baja 10 palabras por minuto cada vez", String(st.wpm));
  const rSlow = await rate(p, 1500), pxSlow = (await S(p)).pxPerSec;
  for (let i = 0; i < 10; i++) await key(p, "+");   // 100 -> 200
  await wait(p, 200); st = await S(p);
  ok(st.wpm === 200, "la tecla + sube el WPM", String(st.wpm));
  const rFast = await rate(p, 1500), pxFast = st.pxPerSec;
  ok(Math.abs(pxFast / pxSlow - 2) < 0.02, "al duplicar el WPM se duplica la velocidad calculada", (pxFast / pxSlow).toFixed(3));
  ok(rFast / rSlow > 1.6 && rFast / rSlow < 2.4, "y la velocidad real medida tambien (x2)", (rFast / rSlow).toFixed(2));
  // ---- ajustes: tamano de letra, ancho, WPM por deslizador ----
  await click(p, '[data-a="settings"]'); await wait(p, 400);
  ok(await p.evaluate(() => !document.querySelector(".tp-set").hidden && document.querySelector('[data-a="settings"]').getAttribute("aria-expanded") === "true"), "el engranaje abre los ajustes");
  const dur0 = (await S(p)); const total0 = dur0.maxPos / dur0.pxPerSec;
  await p.fill("#fs", "70"); await wait(p, 300); st = await S(p);
  ok(st.fontSize === 70 && (await p.evaluate(() => getComputedStyle(document.querySelector(".tp-body")).fontSize)) === "70px", "el deslizador cambia el tamano de letra", String(st.fontSize));
  ok(st.maxPos > dur0.maxPos * 1.3, "con letra mas grande el guion es mas alto", dur0.maxPos.toFixed(0) + " -> " + st.maxPos.toFixed(0));
  ok(Math.abs(st.maxPos / st.pxPerSec - total0) < 0.5, "...y la velocidad se recalcula: los WPM siguen siendo veraces", (st.maxPos / st.pxPerSec).toFixed(1) + " vs " + total0.toFixed(1));
  await p.fill("#w", "60"); await wait(p, 300); st = await S(p);
  ok(st.widthPct === 60 && (await p.evaluate(() => Math.round(document.querySelector(".tp-body").getBoundingClientRect().width / document.querySelector(".tp-track").getBoundingClientRect().width * 100))) <= 62, "el deslizador de ancho acota la linea", String(st.widthPct));
  await p.fill("#wpm", "120"); await wait(p, 250); st = await S(p);
  ok(st.wpm === 120, "el deslizador cambia el WPM", String(st.wpm));
  ok(await p.evaluate(() => document.querySelector(".tp-read").textContent === "120 palabras por minuto"), "el WPM se lee en pantalla");
  // camara: al fondo / esquina / oculta
  ok(await p.evaluate(() => document.querySelector(".tp").dataset.camview === "bg" && getComputedStyle(document.querySelector(".tp-cam")).opacity === "0.45"), "la camara va al fondo con opacidad controlada (45 %)");
  await p.fill("#camo", "20"); await wait(p, 150); ok(await p.evaluate(() => getComputedStyle(document.querySelector(".tp-cam")).opacity === "0.2"), "el deslizador cambia la transparencia de la camara");
  await click(p, '[data-a="camview"][data-v="corner"]'); await wait(p, 200);
  ok(await p.evaluate(() => { const v = document.querySelector(".tp-cam").getBoundingClientRect(); return v.width < 140 && v.right > innerWidth - 40 && v.top < 200 && getComputedStyle(document.querySelector(".tp-cam")).opacity === "1"; }), "\"Esquina\": vista previa chica arriba a la derecha");
  await click(p, '[data-a="camview"][data-v="off"]'); await wait(p, 200);
  ok(await p.evaluate(() => getComputedStyle(document.querySelector(".tp-cam")).display === "none" && App.teleprompter.state().recording === "on"), "\"Oculta\": no se ve, pero sigue grabando");
  await click(p, '[data-a="camview"][data-v="bg"]'); await p.fill("#camo", "45"); await wait(p, 150);
  await p.fill("#fs", "46"); await p.fill("#w", "80"); await click(p, '[data-a="settings"]'); await wait(p, 300);
  // ---- espejo ----
  await key(p, "m"); await wait(p, 200);
  ok(await p.evaluate(() => document.querySelector(".tp").dataset.mirror === "1" && getComputedStyle(document.querySelector(".tp-stage")).transform.startsWith("matrix(-1")), "M: espejo horizontal del texto");
  ok(await p.evaluate(() => getComputedStyle(document.querySelector(".tp-dock")).transform === "none"), "el espejo no invierte los controles");
  await key(p, "m"); await wait(p, 150);
  ok(await p.evaluate(() => document.querySelector(".tp").dataset.mirror === "0" && getComputedStyle(document.querySelector(".tp-stage")).transform === "none"), "M otra vez: vuelve a la normalidad");
  // ---- controles se esconden a los 3 s y vuelven al mover ----
  ok(await p.evaluate(() => !document.querySelector(".tp").classList.contains("ui-off")), "mientras se mueve el puntero los controles estan visibles");
  await wait(p, 3900);
  ok(await p.evaluate(() => document.querySelector(".tp").classList.contains("ui-off") && getComputedStyle(document.querySelector(".tp-dock")).opacity < 0.5), "a los 3 s sin mover el puntero los controles se esconden");
  ok(await p.evaluate(() => getComputedStyle(document.querySelector(".tp-stat")).opacity === "1" && document.querySelector(".tp-rec").getBoundingClientRect().width > 0), "REC y el tiempo siguen siempre visibles");
  ok(await p.evaluate(() => { const b = document.querySelector('[data-a="finish"]').getBoundingClientRect(), e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !e.closest("[data-a]"); }), "con los controles escondidos no se puede tocar un boton invisible por accidente");
  await p.mouse.move(700, 500); await p.mouse.move(720, 520); await wait(p, 250);
  ok(await p.evaluate(() => !document.querySelector(".tp").classList.contains("ui-off")), "mover el puntero los vuelve a mostrar");
  // ---- pausa ----
  await key(p, "Space"); ok(await waitPhase(p, "pause", 3000), "Espacio: pausa");
  const pa = (await S(p)).pos; await wait(p, 700); const pb = (await S(p)).pos;
  ok(pa === pb, "en pausa el texto no se mueve", pa.toFixed(2) + " vs " + pb.toFixed(2));
  ok(await p.evaluate(() => App.teleprompter.state().recording === "paused" && /PAUSA/.test(document.querySelector(".tp-rec b").textContent)), "la grabacion tambien se pausa y lo dice");
  await wait(p, 300);
  const loopBefore = await p.evaluate(() => window.__loopRaf); await wait(p, 500); const loopAfter = await p.evaluate(() => window.__loopRaf);
  ok(loopBefore === loopAfter, "en pausa se cancela el requestAnimationFrame (no queda un bucle ocioso)", loopBefore + " vs " + loopAfter);
  ok(await p.evaluate(() => window.__wl.active === 0 && window.__wl.req >= 1), "la pantalla se mantiene encendida solo mientras se lee (wake lock liberado en pausa)", JSON.stringify(await p.evaluate(() => window.__wl)));
  // ---- arrastrar para moverse (en pausa) y tocar para seguir/pausar ----
  const d0 = (await S(p)).pos;
  await p.mouse.move(720, 450); await p.mouse.down(); await p.mouse.move(720, 400, { steps: 4 }); await p.mouse.move(720, 330, { steps: 4 }); await p.mouse.up(); await wait(p, 200);
  const d1 = await S(p);
  ok(d1.pos > d0 + 90 && d1.phase === "pause", "arrastrar el texto en pausa lo mueve (y no lo pone a leer)", (d1.pos - d0).toFixed(0));
  await p.mouse.move(720, 450); await p.mouse.down(); await p.mouse.move(720, 560, { steps: 5 }); await p.mouse.up(); await wait(p, 150);
  ok((await S(p)).pos < d1.pos - 60, "arrastrar hacia abajo retrocede");
  await p.mouse.move(720, 450); await p.mouse.wheel(0, 120); await wait(p, 200);
  ok((await S(p)).pos > 0, "la rueda del mouse tambien mueve el texto en pausa");
  await key(p, "Home"); await wait(p, 150);
  ok((await S(p)).pos === 0, "Inicio vuelve al principio");
  await p.mouse.click(720, 450); ok(await waitPhase(p, "run", 3000), "tocar el texto en pausa sigue leyendo");
  await p.mouse.click(720, 450); ok(await waitPhase(p, "pause", 3000), "tocar el texto leyendo pausa");
  // ---- Escape: leyendo = pausa; en pausa pregunta qué hacer con la grabacion ----
  await p.keyboard.press("Space"); await waitPhase(p, "run", 3000);
  await key(p, "Escape"); ok(await waitPhase(p, "pause", 3000), "Escape leyendo = pausa (no cierra)");
  await key(p, "Escape"); await wait(p, 500);
  ok(await p.evaluate(() => !!document.querySelector(".tp-dlg") && /grabando/i.test(document.querySelector(".tp-dlg h2").textContent) && document.querySelectorAll(".tp-dlg button").length === 3), "Escape en pausa mientras graba: pregunta guardar / descartar / seguir");
  ok(await p.evaluate(() => App.teleprompter.isOpen()), "no se cierra solo");
  await key(p, "Escape"); await wait(p, 300);
  ok(await p.evaluate(() => !document.querySelector(".tp-dlg") && App.teleprompter.isOpen()), "Escape en la pregunta = seguir con la toma");
  // ---- guardar y terminar -> tarjeta final ----
  await click(p, '[data-a="close"]'); await wait(p, 400);
  ok(await p.evaluate(() => /grabando/i.test(document.querySelector(".tp-dlg h2").textContent)), "la X mientras graba pregunta que hacer con la grabacion");
  await click(p, '[data-d="keep"]');
  ok(await p.waitForFunction(() => { const e = document.querySelector(".tp-end"); return e && /Ver lo que grabaste/.test(e.textContent) && !e.querySelector(".tp-wait"); }, null, { timeout: 9000 }).then(() => true).catch(() => false), "Guardar y terminar: tarjeta final con \"Ver lo que grabaste\"");
  ok(await p.evaluate(() => /Listo\.\s*¡Buen trabajo!/.test(document.querySelector(".tp-end h2").textContent)), "la tarjeta final dice \"Listo. ¡Buen trabajo!\"");
  ok(await p.evaluate(() => ["view", "dl", "ok"].every((a) => !!document.querySelector(`.tp-end [data-a="${a}"]`))), "ofrece ver, descargar y Listo");
  ok(await p.evaluate(() => window.__doneN === 0), "onDone todavia no se llamo (falta tocar Listo)");
  await click(p, '.tp-end [data-a="view"]'); await wait(p, 600);
  ok(await p.evaluate(() => { const v = document.querySelector(".tp-endv"); return !!v && /^blob:/.test(v.src) && v.controls; }), "\"Ver lo que grabaste\": reproductor con la grabacion (blob)");
  const vmeta = await p.waitForFunction(() => { const v = document.querySelector(".tp-endv"); return v && v.readyState >= 1 && !v.error; }, null, { timeout: 8000 }).then(() => true).catch(() => false);
  ok(vmeta, "el video grabado se puede cargar (sin error de decodificacion)");
  const dlP = p.waitForEvent("download", { timeout: 8000 }).catch(() => null);
  await click(p, '.tp-end [data-a="dl"]'); const dl = await dlP;
  ok(!!dl && /^grabacion-\d{8}-\d{4}\.(webm|mp4)$/.test(dl.suggestedFilename()), "Descargar entrega grabacion-AAAAMMDD-HHMM.webm", dl ? dl.suggestedFilename() : "sin descarga");
  await click(p, '.tp-end [data-a="ok"]');
  ok(await waitDone(p, 6000), "Listo llama a onDone");
  await wait(p, 500);
  const res = await p.evaluate(() => ({ n: window.__doneN, d: window.__done }));
  ok(res.n === 1, "onDone se llama UNA sola vez", String(res.n));
  ok(res.d && res.d.recorded && res.d.recorded.size > 0 && res.d.recorded.isFile && /^grabacion-\d{8}-\d{4}\.(webm|mp4)$/.test(res.d.recorded.name) && /^video\//.test(res.d.recorded.type), "onDone recibe un File de video con size > 0", JSON.stringify(res.d && res.d.recorded));
  ok(res.d && res.d.mode === "script" && res.d.durationMs > 1500 && res.d.completed === false && res.d.discarded === false && res.d.cancelled === false, "onDone trae modo y duracion; cortar con \"Guardar y terminar\" no cuenta como completada", JSON.stringify(res.d && Object.assign({}, res.d, { recorded: undefined })));
  // ---- limpieza total ----
  const cl = await p.evaluate(() => ({ open: App.teleprompter.isOpen(), dom: document.querySelectorAll(".tp").length, live: window.__tracks.filter((t) => t.readyState === "live").length, total: window.__tracks.length, wl: window.__wl.active, ovf: document.documentElement.style.overflow, inert: Array.from(document.querySelector(".aura-app").children).filter((n) => n.inert).length, fs: !!document.fullscreenElement }));
  ok(!cl.open && cl.dom === 0, "cerrado: isOpen() false y sin restos en el DOM", JSON.stringify(cl));
  ok(cl.total >= 1 && cl.live === 0, "todas las pistas de camara y microfono quedan detenidas", cl.live + " vivas de " + cl.total);
  ok(cl.wl === 0, "wake lock liberado");
  ok(cl.ovf === "" && cl.inert === 0 && !cl.fs, "se restauran el scroll de la pagina, la app deja de estar inerte y se sale de pantalla completa", JSON.stringify(cl));
  const l1 = await p.evaluate(() => window.__loopRaf); await wait(p, 500); const l2 = await p.evaluate(() => window.__loopRaf);
  ok(l1 === l2, "sin bucle de animacion despues de cerrar");
  ok(await p.evaluate(() => !!document.querySelector("#main") && !document.querySelector("#main").inert && document.querySelector(".aura-app").children.length > 4), "la app queda usable");
  ok(p.errs.length === 0, "sin errores de pagina (escritorio)", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  // ================= final natural + grabacion =================
  console.log("\n== Teleprompter: final natural y grabacion ==");
  p = await open(browser, "?demo=1&preset=kt#hoy", SPY);
  await openTp(p, { mode: "script", text: SHORT, title: "Corto" }); await wait(p, 600);
  await p.waitForFunction(() => App.teleprompter.state().camera === "on", null, { timeout: 8000 }).catch(() => {});
  await p.evaluate(() => App.teleprompter._cmd("setWpm", 260));
  ok((await S(p)).wpm === 260, "WPM maximo 260");
  await p.evaluate(() => App.teleprompter._cmd("setWpm", 400)); ok((await S(p)).wpm === 260, "el WPM no pasa de 260");
  await p.evaluate(() => App.teleprompter._cmd("setWpm", 10)); ok((await S(p)).wpm === 60, "ni baja de 60");
  await p.evaluate(() => App.teleprompter._cmd("setWpm", 260));
  await click(p, '[data-a="play"]'); ok(await waitPhase(p, "run", 9000), "el boton grande empieza");
  ok(await waitPhase(p, "done", 25000), "al llegar al final se detiene solo y pasa a la tarjeta final");
  ok(await p.waitForFunction(() => { const e = document.querySelector(".tp-end"); return e && e.querySelector('[data-a="view"]'); }, null, { timeout: 9000 }).then(() => true).catch(() => false), "la tarjeta final espera a que el archivo este armado");
  ok(await p.evaluate(() => document.querySelector(".tp-prog").getAttribute("aria-valuenow") === "100" || +document.querySelector(".tp-prog").getAttribute("aria-valuenow") >= 99), "la barra de progreso llega al 100 %");
  await key(p, "Escape"); ok(await waitDone(p, 6000), "Escape en la tarjeta final = Listo (la grabacion llega igual)");
  const r2 = await p.evaluate(() => window.__done);
  ok(r2 && r2.recorded && r2.recorded.size > 1000 && r2.completed === true, "onDone: grabacion completa", JSON.stringify(r2 && r2.recorded));
  ok(!(await p.evaluate(() => App.teleprompter.isOpen())), "cerrado tras Listo");
  ok(await p.evaluate(() => window.__tracks.every((t) => t.readyState === "ended")), "pistas detenidas");
  ok(p.errs.length === 0, "sin errores de pagina (final)", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  // ================= cerrar grabando: descartar y close() =================
  console.log("\n== Teleprompter: cerrar mientras graba ==");
  p = await open(browser, "?demo=1&preset=kt#hoy", SPY);
  await openTp(p, { mode: "script", text: LONG }); await p.waitForFunction(() => App.teleprompter.state().camera === "on", null, { timeout: 8000 }).catch(() => {});
  await startRun(p); await wait(p, 2200);
  await click(p, '[data-a="close"]'); await wait(p, 500);
  ok((await S(p)).phase === "pause" && !!(await p.evaluate(() => document.querySelector(".tp-dlg"))), "la X pausa y pregunta");
  await click(p, '[data-d="discard"]'); ok(await waitDone(p, 6000), "Descartar cierra y avisa");
  rd = await p.evaluate(() => window.__done);
  ok(rd && rd.recorded === null && rd.discarded === true && rd.completed === false && rd.cancelled === true, "onDone: recorded null, discarded y cancelled true", JSON.stringify(rd));
  await wait(p, 300); ok(await p.evaluate(() => window.__tracks.every((t) => t.readyState === "ended") && !document.querySelector(".tp")), "al descartar se apagan la camara y la pantalla");
  await openTp(p, { mode: "script", text: LONG }); await p.waitForFunction(() => App.teleprompter.state().camera === "on", null, { timeout: 8000 }).catch(() => {});
  await startRun(p); await wait(p, 2500);
  await p.evaluate(() => App.teleprompter.close());
  ok(!(await p.evaluate(() => App.teleprompter.isOpen())), "close() deja isOpen() en false al instante");
  ok(await waitDone(p, 9000), "close() grabando: igual entrega el resultado");
  rd = await p.evaluate(() => window.__done);
  ok(rd && rd.recorded && rd.recorded.size > 0 && rd.discarded === false, "close() grabando NO pierde la grabacion", JSON.stringify(rd && rd.recorded));
  await wait(p, 500); ok(await p.evaluate(() => window.__tracks.every((t) => t.readyState === "ended") && !document.querySelector(".tp") && window.__wl.active === 0), "y limpia todo");
  // boton Terminar: pregunta si falta mucho y luego cuenta como completada
  await openTp(p, { mode: "script", text: LONG }); await p.waitForFunction(() => App.teleprompter.state().camera === "on", null, { timeout: 8000 }).catch(() => {});
  await startRun(p); await wait(p, 1800);
  await click(p, '[data-a="finish"]'); await wait(p, 400);
  ok(await p.evaluate(() => !!document.querySelector(".tp-dlg") && /Terminar la toma/.test(document.querySelector(".tp-dlg h2").textContent)) && (await S(p)).phase === "pause", "Terminar a mitad: pausa y confirma");
  await click(p, '[data-d="stay"]'); await wait(p, 300); ok((await S(p)).phase === "pause" && !(await p.evaluate(() => document.querySelector(".tp-dlg"))), "Seguir: vuelve a la pausa sin perder nada");
  await click(p, '[data-a="finish"]'); await wait(p, 300); await click(p, '[data-d="ok"]');
  ok(await p.waitForFunction(() => { const e = document.querySelector(".tp-end"); return e && e.querySelector('[data-a="view"]'); }, null, { timeout: 9000 }).then(() => true).catch(() => false), "Terminar: tarjeta final con la grabacion");
  await click(p, '.tp-end [data-a="ok"]'); await waitDone(p, 6000); rd = await p.evaluate(() => window.__done);
  ok(rd && rd.completed === true && rd.cancelled === false && rd.recorded && rd.recorded.size > 0, "Terminar a mano cuenta como completada", JSON.stringify(rd));
  // "Otra toma": descarta y vuelve a empezar
  await openTp(p, { mode: "script", text: SHORT }); await p.waitForFunction(() => App.teleprompter.state().camera === "on", null, { timeout: 8000 }).catch(() => {});
  await p.evaluate(() => App.teleprompter._cmd("setWpm", 260)); await startRun(p); await waitPhase(p, "done", 25000);
  await p.waitForFunction(() => { const e = document.querySelector(".tp-end"); return e && e.querySelector('[data-a="again"]') && !e.querySelector(".tp-wait"); }, null, { timeout: 9000 }).catch(() => {});
  await click(p, '.tp-end [data-a="again"]'); await wait(p, 400); await click(p, '[data-d="ok"]'); await wait(p, 600);
  ok((await S(p)).phase === "ready" && (await S(p)).pos === 0 && !(await p.evaluate(() => document.querySelector(".tp-end"))), "Otra toma: vuelve a quedar lista (pide confirmar porque descarta la grabacion)");
  ok(await p.waitForFunction(() => App.teleprompter.state().camera === "on", null, { timeout: 8000 }).then(() => true).catch(() => false), "...y la camara se vuelve a prender");
  // la camara se pierde en plena lectura: sigue el texto, se conserva lo grabado
  await startRun(p); await wait(p, 1800);
  await p.evaluate(() => window.__tracks.forEach((t) => { t.stop(); t.dispatchEvent(new Event("ended")); })); await wait(p, 900);
  st = await S(p);
  ok(st.phase === "run" && st.camera === "none" && st.recording === "off", "si se pierde la camara leyendo: el texto sigue y el REC se apaga", JSON.stringify({ ph: st.phase, c: st.camera, r: st.recording }));
  await waitPhase(p, "done", 25000);
  ok(await p.waitForFunction(() => { const e = document.querySelector(".tp-end"); return e && !e.querySelector(".tp-wait"); }, null, { timeout: 9000 }).then(() => true).catch(() => false), "termina igual");
  await click(p, '.tp-end [data-a="ok"]'); await waitDone(p, 6000); rd = await p.evaluate(() => window.__done);
  ok(rd && rd.completed === true && rd.recorded && rd.recorded.size > 0, "y entrega lo que se alcanzo a grabar", JSON.stringify(rd && rd.recorded));
  // abrir uno nuevo mientras hay otro: el primero entrega su resultado
  await openTp(p, { mode: "script", text: SHORT }); await wait(p, 400);
  await p.evaluate(() => { window.__first = null; App.teleprompter.open({ mode: "interview", questions: ["¿Una?", "¿Dos?"], onDone: (r) => { window.__first = r; } }); }); await wait(p, 700);
  ok(await p.evaluate(() => document.querySelectorAll(".tp").length <= 2 && App.teleprompter.state().mode === "interview"), "abrir otro mientras hay uno: queda el nuevo");
  await wait(p, 600); ok(await p.evaluate(() => document.querySelectorAll(".tp").length === 1 && document.querySelector(".aura-app").children.length > 4 && Array.from(document.querySelector(".aura-app").children).filter((n) => n.inert).length >= 3), "el recambio no deja la app activa por debajo");
  await p.evaluate(() => App.teleprompter.close()); await wait(p, 700);
  ok(p.errs.length === 0, "sin errores de pagina (cerrar grabando)", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  // ================= entrevista =================
  console.log("\n== Teleprompter: entrevista ==");
  p = await open(browser, "?demo=1&preset=kt#hoy", SPY);
  await openTp(p, { mode: "interview", title: "Entrevista", questions: QS, secondsPerQuestion: 3 }); await wait(p, 700);
  st = await S(p);
  ok(st.mode === "interview" && st.questions === 3 && st.sec === 3, "entrevista: 3 preguntas, 3 s cada una", JSON.stringify({ q: st.questions, s: st.sec }));
  ok(await p.evaluate(() => document.querySelector(".tp-info").textContent === "1 de 3"), "contador \"1 de 3\"");
  ok(await p.evaluate(() => document.querySelector(".tp-qt").textContent.trim() === "¿Qué te hizo empezar a crear contenido?"), "se muestra UNA sola pregunta, centrada");
  ok(await p.evaluate(() => { const q = document.querySelector(".tp-qt").getBoundingClientRect(), c = q.left + q.width / 2; return Math.abs(c - innerWidth / 2) < 6 && getComputedStyle(document.querySelector(".tp-qt")).textAlign === "center"; }), "la pregunta esta centrada");
  ok(await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".tp-qt")).fontSize) >= 40), "tipografia grande");
  ok(await p.evaluate(() => getComputedStyle(document.querySelector(".tp-stage")).display === "none" && getComputedStyle(document.querySelector(".tp-guide")).display === "none"), "no hay texto desplazable ni guia en este modo");
  // camara apagada con el interruptor (prueba el interruptor)
  await p.waitForFunction(() => App.teleprompter.state().camera !== "pending", null, { timeout: 8000 }).catch(() => {});
  await click(p, '[data-a="camtoggle"]'); await wait(p, 400);
  ok(await p.evaluate(() => App.teleprompter.state().camera === "off" && document.querySelector(".tp-camsw").getAttribute("aria-checked") === "false"), "el interruptor apaga la camara");
  ok(await p.evaluate(() => window.__tracks.every((t) => t.readyState === "ended")), "al apagarla se sueltan las pistas");
  await click(p, '[data-a="camtoggle"]'); await p.waitForFunction(() => App.teleprompter.state().camera === "on", null, { timeout: 8000 }).catch(() => {});
  ok((await S(p)).camera === "on", "y se puede volver a encender");
  await click(p, '[data-a="camtoggle"]'); await wait(p, 300);
  // empieza
  await click(p, '[data-a="play"]'); ok(await waitPhase(p, "run", 9000), "entrevista: empieza tras la cuenta regresiva");
  ok(await p.evaluate(() => document.querySelectorAll(".tp-qt .w").length >= 5 && getComputedStyle(document.querySelector(".tp-qt .w")).animationName === "tpWord"), "la pregunta se revela palabra por palabra (suave, escalonada)");
  const delays = await p.evaluate(() => Array.from(document.querySelectorAll(".tp-qt .w")).map((w) => parseFloat(w.style.getPropertyValue("--d")))); ok(delays.every((d, i) => i === 0 || d > delays[i - 1]), "cada palabra entra un poco despues de la anterior", delays.join(","));
  ok(await p.evaluate(() => /^[123]$/.test(document.querySelector(".tp-secs").textContent)), "cuenta regresiva por pregunta (anillo con segundos)");
  const off0 = await p.evaluate(() => parseFloat(document.querySelector(".tp-ring .val").style.strokeDashoffset)); await wait(p, 700);
  const off1 = await p.evaluate(() => parseFloat(document.querySelector(".tp-ring .val").style.strokeDashoffset));
  ok(off1 > off0, "el anillo se va llenando", off0.toFixed(0) + " -> " + off1.toFixed(0));
  // pausa congela el tiempo
  await key(p, "Space"); await waitPhase(p, "pause", 3000); const o0 = await p.evaluate(() => document.querySelector(".tp-ring .val").style.strokeDashoffset);
  await wait(p, 1400);
  ok(await p.evaluate((a) => document.querySelector(".tp-ring .val").style.strokeDashoffset === a, o0), "en pausa el tiempo de la pregunta no corre");
  await key(p, "Space"); await waitPhase(p, "run", 3000);
  // auto avance
  ok(await p.waitForFunction(() => document.querySelector(".tp-info").textContent === "2 de 3", null, { timeout: 14000 }).then(() => true).catch(() => false), "al acabar el tiempo avanza solo a \"2 de 3\"");
  ok(await p.evaluate(() => document.querySelector(".tp-qt").textContent.trim() === "¿Cuál fue tu mayor error al principio?"), "con la segunda pregunta");
  const beat = p.waitForFunction(() => document.querySelector(".tp").classList.contains("q-out") && /Siguiente/.test(document.querySelector(".tp-nx").textContent), null, { timeout: 12000, polling: 30 }).then(() => true).catch(() => false);
  ok(await beat, "entre preguntas hay un instante suave con \"Siguiente\"");
  ok(await p.waitForFunction(() => document.querySelector(".tp-info").textContent === "3 de 3", null, { timeout: 14000, polling: 30 }).then(() => true).catch(() => false), "avanza a \"3 de 3\"");
  // un toque justo despues del cambio no se pierde (la pantalla todavia esta en su "beat")
  await click(p, '[data-a="prev"]'); ok(await p.waitForFunction(() => document.querySelector(".tp-info").textContent === "2 de 3", null, { timeout: 5000 }).then(() => true).catch(() => false), "anterior (apenas cambio) vuelve a la pregunta 2: no se pierde el toque");
  ok(await p.evaluate(() => document.querySelector(".tp-qt").textContent.trim() === "¿Cuál fue tu mayor error al principio?"), "con su texto");
  // final natural
  ok(await p.waitForFunction(() => !!document.querySelector(".tp-end"), null, { timeout: 16000 }).then(() => true).catch(() => false), "al terminar la ultima pregunta aparece la pantalla final");
  ok(await p.evaluate(() => /Listo\.\s*¡Buen trabajo!/.test(document.querySelector(".tp-end h2").textContent)), "\"Listo. ¡Buen trabajo!\"");
  ok(await p.evaluate(() => /3 preguntas/.test(document.querySelector(".tp-endsub").textContent)), "resume cuantas preguntas se hicieron");
  await click(p, '.tp-end [data-a="ok"]'); ok(await waitDone(p, 5000), "Listo llama a onDone");
  rd = await p.evaluate(() => window.__done); ok(rd && rd.mode === "interview" && rd.completed === true && rd.recorded === null, "onDone de la entrevista (sin camara): modo y completed", JSON.stringify(rd));
  ok(p.errs.length === 0, "sin errores de pagina (entrevista)", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  // ---- entrevista: controles en vivo (segundos por pregunta, saltos rapidos) ----
  p = await open(browser, "?demo=1&preset=kt#hoy", SPY);
  await openTp(p, { mode: "interview", questions: QS, secondsPerQuestion: 40 }); await wait(p, 600);
  await click(p, '[data-a="camtoggle"]'); await wait(p, 200);
  await click(p, '[data-a="play"]'); await waitPhase(p, "run", 9000); await key(p, "Space"); await waitPhase(p, "pause", 3000);
  ok(await p.evaluate(() => document.querySelector(".tp-read").textContent === "40 segundos por pregunta"), "se lee cuantos segundos dura cada pregunta");
  await click(p, '[data-a="plus"]'); await wait(p, 150); st = await S(p);
  ok(st.sec === 45, "+ suma 5 segundos por pregunta (40 -> 45)", String(st.sec));
  ok(await p.evaluate(() => document.querySelector(".tp-read").textContent === "45 segundos por pregunta"), "y se lee en pantalla");
  await click(p, '[data-a="minus"]'); await click(p, '[data-a="minus"]'); await wait(p, 150); st = await S(p); ok(st.sec === 35, "- resta 5 cada vez", String(st.sec));
  ok(await p.evaluate(() => document.querySelector(".tp-secs").textContent === "35"), "el anillo muestra el nuevo total");
  await click(p, '[data-a="settings"]'); await wait(p, 300); await p.fill("#sec", "12"); await wait(p, 200); st = await S(p);
  ok(st.sec === 12, "el deslizador de tiempo por pregunta tambien", String(st.sec));
  await p.fill("#sec", "2"); await wait(p, 150); ok((await S(p)).sec === 2 && (await p.evaluate(() => document.querySelector('[data-a="minus"]').disabled)), "el minimo es 2 s y - se deshabilita");
  await p.fill("#sec", "30"); await click(p, '[data-a="settings"]'); await wait(p, 300);
  await key(p, "ArrowRight"); await key(p, "ArrowRight");
  ok(await p.waitForFunction(() => document.querySelector(".tp-info").textContent === "3 de 3", null, { timeout: 6000 }).then(() => true).catch(() => false), "dos toques rapidos en siguiente llegan a la pregunta 3 (ninguno se pierde)");
  await wait(p, 1200); await click(p, '[data-a="prev"]'); await click(p, '[data-a="prev"]');
  ok(await p.waitForFunction(() => document.querySelector(".tp-info").textContent === "1 de 3", null, { timeout: 6000 }).then(() => true).catch(() => false), "dos toques rapidos en anterior vuelven a la 1");
  ok(await p.evaluate(() => document.querySelector(".tp-qt").textContent.trim() === "¿Qué te hizo empezar a crear contenido?"), "con su texto");
  await wait(p, 1400); await key(p, "ArrowRight"); await wait(p, 1300); await key(p, "ArrowRight"); await wait(p, 1300);
  await click(p, '[data-a="next"]');
  ok(await p.waitForFunction(() => !!document.querySelector(".tp-end"), null, { timeout: 6000 }).then(() => true).catch(() => false), "siguiente en la ultima pregunta termina");
  await p.evaluate(() => App.teleprompter.close()); await waitDone(p, 5000);
  ok(p.errs.length === 0, "sin errores de pagina (controles de entrevista)", p.errs.slice(0, 3).join(" || ")); await p.context().close();
  p = await open(browser, "?demo=1&preset=kt#hoy", SPY);
  await openTp(p, { mode: "interview", questions: QS, secondsPerQuestion: 2 }); await wait(p, 500);
  ok((await S(p)).sec === 2, "se acepta secondsPerQuestion de 2 s");
  await p.evaluate(() => App.teleprompter.close()); await wait(p, 600);
  await openTp(p, { mode: "interview", questions: QS, secondsPerQuestion: 300 }); await wait(p, 500);
  ok((await S(p)).sec === 300, "y hasta 300 s (lo que ofrece Grabar)");
  await p.evaluate(() => App.teleprompter.close()); await wait(p, 600);
  await openTp(p, { mode: "interview", questions: QS, secondsPerQuestion: 9999 }); await wait(p, 500);
  ok((await S(p)).sec === 300, "un valor absurdo se acota a 300");
  await p.evaluate(() => App.teleprompter.close()); await wait(p, 600);
  await openTp(p, { mode: "interview", questions: [" ", "", null, "Una sola"], }); await wait(p, 500);
  ok((await S(p)).questions === 1 && (await S(p)).sec === 20, "las preguntas vacias se descartan y el tiempo por defecto es 20 s");
  await p.evaluate(() => App.teleprompter.close()); await wait(p, 600); await p.context().close();

  // ================= dos camaras: girar =================
  console.log("\n== Teleprompter: girar camara (dos camaras falsas) ==");
  const b2 = await L.launch(["--use-fake-device-for-media-stream=device-count=2", "--use-fake-ui-for-media-stream"]);
  p = await open(b2, "?demo=1&preset=kt#hoy", SPY);
  await openTp(p, { mode: "script", text: LONG }); await p.waitForFunction(() => App.teleprompter.state().camera === "on", null, { timeout: 8000 }).catch(() => {});
  await wait(p, 600); await click(p, '[data-a="settings"]'); await wait(p, 300);
  ok(await p.evaluate(() => { const b = document.querySelector('[data-a="camflip"]'); return !!b && !b.hidden && b.offsetWidth > 0; }), "con dos camaras aparece \"Girar cámara\"");
  const id0 = await p.evaluate(() => window.__tracks.filter((t) => t.kind === "video" && t.readyState === "live").map((t) => t.getSettings().deviceId)[0]);
  await click(p, '[data-a="camflip"]');
  ok(await p.waitForFunction((a) => window.__tracks.some((t) => t.kind === "video" && t.readyState === "live" && t.getSettings().deviceId !== a), id0, { timeout: 9000 }).then(() => true).catch(() => false), "girar cambia a la otra camara");
  await wait(p, 600);
  ok(await p.evaluate(() => window.__tracks.filter((t) => t.kind === "video" && t.readyState === "live").length === 1 && App.teleprompter.state().camera === "on"), "y suelta la anterior (una sola camara viva)");
  await p.evaluate(() => App.teleprompter.close()); await waitDone(p, 5000); await wait(p, 400);
  ok(await p.evaluate(() => window.__tracks.every((t) => t.readyState === "ended")), "al cerrar quedan todas las pistas detenidas");
  ok(p.errs.length === 0, "sin errores de pagina (girar camara)", p.errs.slice(0, 3).join(" || ")); await p.context().close(); await b2.close();
  // con una sola camara no hay boton de girar
  p = await open(browser, "?demo=1&preset=kt#hoy", SPY);
  await openTp(p, { mode: "script", text: LONG }); await p.waitForFunction(() => App.teleprompter.state().camera === "on", null, { timeout: 8000 }).catch(() => {}); await wait(p, 500); await click(p, '[data-a="settings"]'); await wait(p, 300);
  ok(await p.evaluate(() => { const b = document.querySelector('[data-a="camflip"]'); return !b || b.hidden || !b.offsetWidth; }), "con una sola camara no se ofrece girar");
  await p.evaluate(() => App.teleprompter.close()); await wait(p, 600); await p.context().close();

  // ================= sin camara: nada se rompe =================
  console.log("\n== Teleprompter: sin camara ==");
  for (const [name, init] of [["permiso negado", NOCAM_DENIED], ["sin mediaDevices", NOCAM_NONE]]) {
    p = await open(browser, "?demo=1&preset=kt#hoy", init);
    await openTp(p, { mode: "script", text: SHORT, title: "Sin camara" }); await wait(p, 900);
    ok(await p.waitForFunction(() => App.teleprompter.state().camera === "none", null, { timeout: 6000 }).then(() => true).catch(() => false), name + ": la camara queda como no disponible");
    ok(await p.evaluate(() => !document.querySelector(".tp-note").hidden && /Sin cámara: el teleprompter funciona igual, grab[aá] con tu celular\./.test(document.querySelector(".tp-note").textContent)), name + ": aparece el aviso en una linea");
    ok(await p.evaluate(() => document.querySelector(".tp-camsw").disabled), name + ": el interruptor de camara queda deshabilitado");
    ok(await p.evaluate(() => getComputedStyle(document.querySelector(".tp-cam")).display === "none"), name + ": no se ve el video de camara");
    await p.evaluate(() => App.teleprompter._cmd("setWpm", 260)); await click(p, '[data-a="play"]');
    ok(await waitPhase(p, "run", 9000), name + ": el teleprompter de texto arranca igual");
    ok(await p.evaluate(() => App.teleprompter.state().recording === "off" && !document.querySelector(".tp-stat .tp-rec").offsetWidth), name + ": no hay REC");
    await wait(p, 1200); ok((await S(p)).pos > 5, name + ": el texto avanza");
    ok(await waitPhase(p, "done", 25000), name + ": llega al final");
    ok(await p.evaluate(() => { const e = document.querySelector(".tp-end"); return e && /Listo\.\s*¡Buen trabajo!/.test(e.textContent) && !e.querySelector('[data-a="view"]') && !!e.querySelector('[data-a="again"]'); }), name + ": tarjeta final sin video, con Repetir");
    await click(p, '.tp-end [data-a="ok"]'); ok(await waitDone(p, 5000), name + ": Listo");
    rd = await p.evaluate(() => window.__done); ok(rd && rd.recorded === null && rd.completed === true && rd.mode === "script", name + ": onDone con recorded null", JSON.stringify(rd));
    ok(p.errs.length === 0, name + ": sin errores de pagina", p.errs.slice(0, 3).join(" || ")); await p.context().close();
  }

  // ================= contenido vacio, teclado y capas =================
  console.log("\n== Teleprompter: vacio, atajos y capas ==");
  p = await open(browser, "?demo=1&preset=kt#hoy", SPY);
  await openTp(p, { mode: "script", text: "   " }); await wait(p, 500);
  ok(await p.evaluate(() => document.querySelector('[data-a="play"]').disabled && /Todavía no hay guion/.test(document.querySelector(".tp-body").textContent)), "sin guion: avisa y no deja empezar");
  await key(p, "Space"); await wait(p, 300); ok((await S(p)).phase === "ready", "Espacio no arranca sin contenido");
  await key(p, "Escape"); await wait(p, 600); ok(!(await p.evaluate(() => App.teleprompter.isOpen())), "Escape en listo cierra directo (nada que perder)");
  await waitDone(p, 3000); ok(await p.evaluate(() => window.__done && window.__done.recorded === null && window.__done.completed === false && window.__done.cancelled === true), "onDone al cerrar sin leer: completed false y cancelled true");
  await openTp(p, { mode: "interview", questions: [] }); await wait(p, 500);
  ok(await p.evaluate(() => document.querySelector('[data-a="play"]').disabled && /Sin preguntas/.test(document.querySelector(".tp-info").textContent)), "entrevista sin preguntas: no deja empezar");
  await p.evaluate(() => App.teleprompter.close()); await wait(p, 600);
  // por encima de Jarvis
  await p.evaluate(() => App.jarvis.open(null)); await wait(p, 1200);
  ok(await p.evaluate(() => App.jarvis.isOpen()), "(Jarvis abierto)");
  await openTp(p, { mode: "script", text: LONG }); await wait(p, 700);
  ok(await p.evaluate(() => { const els = [[720, 450], [100, 100], [1300, 800], [720, 850]].map(([x, y]) => document.elementFromPoint(x, y)); return els.every((e) => e && e.closest(".tp")); }), "queda por encima de Jarvis");
  // las teclas no llegan a los atajos de la app (Ctrl+K de Jarvis)
  const jv0 = await p.evaluate(() => App.jarvis.isOpen());
  await key(p, "Control+k"); await wait(p, 400);
  ok(await p.evaluate((a) => App.jarvis.isOpen() === a, jv0), "Ctrl+K no llega a Jarvis mientras el teleprompter esta abierto");
  // atajos
  await key(p, "="); await wait(p, 100); ok((await S(p)).wpm === 150, "+ (o =) sube el WPM");
  await key(p, "ArrowDown"); await wait(p, 100); ok((await S(p)).pos > 0, "en pausa/lista las flechas mueven el texto");
  await key(p, "End").catch(() => {});
  // enfoque atrapado: Tab nunca sale del teleprompter
  for (let i = 0; i < 14; i++) await key(p, "Tab");
  ok(await p.evaluate(() => !!document.activeElement.closest(".tp")), "Tab queda atrapado dentro del teleprompter");
  await key(p, "Shift+Tab"); ok(await p.evaluate(() => !!document.activeElement.closest(".tp")), "Shift+Tab tambien");
  // todos los botones tienen nombre accesible
  ok(await p.evaluate(() => Array.from(document.querySelectorAll(".tp button")).filter((b) => b.offsetWidth).every((b) => (b.getAttribute("aria-label") || b.textContent).trim().length > 1)), "todos los botones visibles tienen nombre accesible");
  ok(await p.evaluate(() => { const g = document.querySelector(".tp-prog"); return g.getAttribute("role") === "progressbar" && g.hasAttribute("aria-valuenow"); }), "la barra de progreso es un progressbar con aria-valuenow");
  await p.evaluate(() => App.teleprompter.close()); await wait(p, 700);
  await p.evaluate(() => App.jarvis.close()); await wait(p, 500);
  // por encima del editor (Estudio)
  ok(p.errs.length === 0, "sin errores de pagina (vacio y capas)", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  // ================= reducir movimiento =================
  console.log("\n== Teleprompter: reducir movimiento ==");
  p = await open(browser, "?demo=1&preset=kt#hoy", SPY, null, { reducedMotion: "reduce" });
  await openTp(p, { mode: "script", text: LONG }); await wait(p, 700);
  ok(await p.evaluate(() => document.querySelector(".tp").classList.contains("rm") && getComputedStyle(document.querySelector(".tp")).animationName === "none" && getComputedStyle(document.querySelector(".tp-blob")).animationName === "none"), "reduce-motion: sin animaciones decorativas");
  await startRun(p); ok(await waitPhase(p, "run", 9000), "reduce-motion: arranca");
  const rr = await rate(p, 1500); ok(rr > 5, "reduce-motion: el texto igual se desplaza", rr.toFixed(1));
  await p.evaluate(() => App.teleprompter.close()); await waitDone(p, 4000); ok(await p.evaluate(() => !document.querySelector(".tp")), "reduce-motion: cierra sin esperar fundidos");
  await p.context().close();

  // ================= telefono 390 px =================
  console.log("\n== Teleprompter: telefono (390x844) ==");
  p = await open(browser, "?demo=1&preset=kt#hoy", SPY, { width: 390, height: 844 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await openTp(p, { mode: "script", title: "Mi primer video con un titulo bastante largo para probar", text: LONG }); await wait(p, 900);
  await p.waitForFunction(() => App.teleprompter.state().camera !== "pending", null, { timeout: 8000 }).catch(() => {});
  const mob = await p.evaluate(() => {
    const r = document.querySelector(".tp"), b = r.getBoundingClientRect(), d = document.documentElement;
    const btns = Array.from(document.querySelectorAll(".tp .tp-b, .tp .tp-ib, .tp .tp-play, .tp .tp-camsw")).filter((x) => x.offsetWidth).map((x) => { const q = x.getBoundingClientRect(); return { n: x.className + (x.dataset.a ? ":" + x.dataset.a : ""), w: Math.round(q.width), h: Math.round(q.height) }; });
    const over = Array.from(r.querySelectorAll("*")).filter((x) => { const q = x.getBoundingClientRect(); return x.offsetWidth && (q.right > innerWidth + 1 || q.left < -1) && !x.closest(".tp-track, .tp-cam, .tp-view, .tp-guide, .tp-fade, .tp-cblob"); }).map((x) => x.className).slice(0, 5);
    return { w: b.width, h: b.height, sw: d.scrollWidth, tsw: r.scrollWidth, btns, over, wpct: getComputedStyle(r).getPropertyValue("--tpw").trim(), fs: App.teleprompter.state().fontSize };
  });
  ok(mob.w === 390 && mob.h === 844, "ocupa toda la pantalla del telefono", mob.w + "x" + mob.h);
  ok(mob.sw <= 390 && mob.tsw <= 390, "sin desborde horizontal", mob.sw + "/" + mob.tsw);
  ok(mob.over.length === 0, "ningun control se sale de la pantalla", mob.over.join(","));
  ok(mob.btns.every((b) => b.w >= 44 && b.h >= 44), "todos los botones principales miden 44 px o mas", JSON.stringify(mob.btns.filter((b) => b.w < 44 || b.h < 44)));
  ok(mob.wpct === "100" && mob.fs <= 40, "en el telefono el texto usa todo el ancho y una letra manejable", mob.wpct + "/" + mob.fs);
  ok(await p.evaluate(() => { const d = document.querySelector(".tp-dock").getBoundingClientRect(); return d.bottom <= innerHeight && d.height > 100; }), "los controles grandes quedan abajo, al alcance del pulgar");
  await p.screenshot({ path: "/tmp/tp-shot-mobile-ready.png" }).catch(() => {});
  await p.touchscreen.tap(195, 300); await wait(p, 300); ok((await S(p)).phase === "ready", "telefono: tocar el texto antes de empezar no hace nada");
  await click(p, '[data-a="play"]'); ok(await waitPhase(p, "run", 9000), "telefono: empieza");
  await wait(p, 1200); await p.screenshot({ path: "/tmp/tp-shot-mobile-run.png" }).catch(() => {});
  await p.touchscreen.tap(195, 300); ok(await waitPhase(p, "pause", 3000), "telefono: tocar el texto pausa");
  await click(p, '[data-a="settings"]'); await wait(p, 500);
  const sheet = await p.evaluate(() => { const s = document.querySelector(".tp-set").getBoundingClientRect(); return { l: s.left, r: s.right, t: s.top, b: s.bottom, h: innerHeight, sc: document.documentElement.scrollWidth }; });
  ok(sheet.l >= 0 && sheet.r <= 390 && sheet.t >= 0 && sheet.b <= sheet.h && sheet.sc <= 390, "los ajustes caben en el telefono", JSON.stringify(sheet));
  const small = await p.evaluate(() => Array.from(document.querySelectorAll(".tp-set input[type=range], .tp-set button")).filter((b) => b.offsetWidth && b.getBoundingClientRect().height < 40).map((b) => b.tagName + "." + (b.dataset.a || b.id) + ":" + Math.round(b.getBoundingClientRect().height)));
  ok(small.length === 0, "controles de los ajustes con area tactil comoda (40 px o mas)", small.join(","));
  await p.screenshot({ path: "/tmp/tp-shot-mobile-settings.png" }).catch(() => {});
  await click(p, '[data-a="settings"]'); await p.evaluate(() => App.teleprompter.close()); await waitDone(p, 8000); await wait(p, 400);
  await openTp(p, { mode: "interview", title: "Entrevista", questions: QS, secondsPerQuestion: 10 }); await wait(p, 900);
  const mob2 = await p.evaluate(() => { const q = document.querySelector(".tp-qt").getBoundingClientRect(), d = document.querySelector(".tp-dock").getBoundingClientRect(); return { sw: document.documentElement.scrollWidth, ql: q.left, qr: q.right, qb: q.bottom, db: d.top }; });
  ok(mob2.sw <= 390 && mob2.ql >= 0 && mob2.qr <= 390, "entrevista en el telefono: sin desborde", JSON.stringify(mob2));
  ok(mob2.qb < mob2.db, "la pregunta no queda tapada por los controles");
  await click(p, '[data-a="play"]'); await waitPhase(p, "run", 9000); await wait(p, 1800); await p.screenshot({ path: "/tmp/tp-shot-mobile-interview.png" }).catch(() => {});
  await p.evaluate(() => App.teleprompter.close()); await waitDone(p, 8000);
  ok(p.errs.length === 0, "sin errores de pagina (telefono)", p.errs.slice(0, 3).join(" || ")); await p.context().close();

  await browser.close();
  done("teleprompter");
})().catch((e) => { console.error(e); process.exit(1); });
