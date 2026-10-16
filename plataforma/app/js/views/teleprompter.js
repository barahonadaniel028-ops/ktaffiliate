/* Aura · teleprompter propio (DECISIONES.md #20). Pantalla completa por encima de todo (editor y Jarvis incluidos), dos modos y camara opcional.
   Contrato (lo usa Crear > Grabar, grabar.js):
     App.teleprompter.open({ mode: "script" | "interview", title, text?, questions?, secondsPerQuestion?, onDone? }) -> abre la pantalla completa
         script:    `text` es el guion entero (parrafos separados por linea en blanco) que se desplaza solo; velocidad en palabras por minuto, tamano, ancho y espejo ajustables.
                    Lo que va entre [corchetes] es una acotacion ("[pausa]", "[sonrie]"): se ve en otro color y NO cuenta como palabra.
         interview: `questions` es un arreglo de preguntas; se muestra UNA por vez, lento, `secondsPerQuestion` segundos cada una (se cambia en vivo con +/- 5 s)
         onDone(result): se llama UNA sola vez, al terminar o al cerrar:  result = { recorded: File|null, durationMs, mode, completed, discarded }
                    recorded = la grabacion de la camara (null si no hubo camara o se descarto); completed = se llego al final (o la persona toco Terminar).
     App.teleprompter.close()    cierra sin preguntar; si se estaba grabando, la grabacion NO se pierde: llega en onDone({recorded}).
     App.teleprompter.isOpen()   false apenas empieza a cerrarse
     App.teleprompter.state()    foto del estado (para pruebas y para quien quiera mirar): fase, posicion, wpm, velocidad en px/s, camara, grabando...
   La camara y la grabacion son "lo mejor que se pueda": si getUserMedia no existe o se niega (iframe de claude.ai, sin camara) se avisa en una linea y el
   teleprompter de texto funciona igual. Nunca hay un reintento automatico ni una llamada a Claude: esta pantalla no necesita IA. */
(function () {
  "use strict";
  const App = window.App, { esc, icon, mmss, bytes } = App;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const snap = (v, s) => Math.round(v / s) * s;
  const WPM = { min: 60, max: 260, def: 140, step: 5 }, SEC = { min: 2, max: 120, def: 20, jump: 5 }, FS = { min: 22, max: 96 };
  const UI_HIDE_MS = 3000;   // los controles se esconden a los 3 s sin mover el puntero (solo leyendo)
  const COUNT_FROM = 3;
  const BEAT_SWAP = 560, BEAT_END = 1000;   // entrevista: la pregunta se apaga (0-560 ms), cambia el texto y reaparece; a los 1000 ms vuelve a correr el tiempo
  const CUE_RE = /\[[^\]]*\]/g;
  const phoneW = () => innerWidth <= 640;
  let cur = null;   // la sesion abierta (solo hay una)

  // La app de abajo queda inerte (ni teclado ni lector de pantalla la alcanzan) y la pagina no se desplaza. Si un teleprompter reemplaza a otro, el nuevo no
  // puede encontrarla "ya inerte" y dejarla activa cuando el viejo termine de limpiar (el viejo puede tardar en entregar la grabacion): se cuenta quien la necesita.
  const locks = new Map(); let scrollLocks = 0, scrollSaved = null;
  function lockApp(host, root) {
    const mine = [];
    Array.from(host.children).forEach((n) => {
      if (n === root || !(n instanceof HTMLElement) || n.classList.contains("tp")) return;
      const c = locks.get(n); if (c) { locks.set(n, c + 1); mine.push(n); } else if (!n.inert) { locks.set(n, 1); n.inert = true; mine.push(n); }
    });
    if (!scrollLocks++) { const st = document.documentElement.style; scrollSaved = [st.overflow, st.overscrollBehavior]; st.overflow = "hidden"; st.overscrollBehavior = "none"; }
    return mine;
  }
  function unlockApp(nodes) {
    nodes.forEach((n) => { const c = (locks.get(n) || 1) - 1; if (c <= 0) { locks.delete(n); try { n.inert = false; } catch (e) { /* ok */ } } else locks.set(n, c); });
    if (scrollLocks && !--scrollLocks && scrollSaved) { const st = document.documentElement.style; st.overflow = scrollSaved[0]; st.overscrollBehavior = scrollSaved[1]; scrollSaved = null; }
  }

  // ---------- preferencias que se recuerdan (solo comodidad de esta persona en este navegador) ----------
  const loadPrefs = () => {
    const s = App.store.get("tp", {}) || {}, num = (v, d, a, b) => (Number.isFinite(+v) && +v >= a && +v <= b ? +v : d);
    return {
      wpm: snap(num(s.wpm, WPM.def, WPM.min, WPM.max), WPM.step), sec: Math.round(num(s.sec, SEC.def, SEC.min, SEC.max)), fsS: num(s.fsS, 0, FS.min, FS.max), fsQ: num(s.fsQ, 0, FS.min, 120),
      w: num(s.w, phoneW() ? 100 : 78, 40, 100), mirror: !!s.mirror, cam: s.cam !== false, camView: ["bg", "corner", "off"].includes(s.camView) ? s.camView : "bg", camO: num(s.camO, 45, 10, 90),
    };
  };

  // ---------- formatos de grabacion: mp4 donde el navegador lo graba mejor (Safari), si no webm (vp9, despues vp8) ----------
  function pickMime() {
    try {
      if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";
      const ua = navigator.userAgent || "", safari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua);
      const mp4 = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4;codecs=avc1,mp4a.40.2", "video/mp4"], webm = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
      return (safari ? mp4.concat(webm) : webm.concat(mp4)).find((t) => { try { return MediaRecorder.isTypeSupported(t); } catch (e) { return false; } }) || "";
    } catch (e) { return ""; }
  }
  const stampName = (ext) => { const d = new Date(), p = App.pad; return "grabacion-" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + "." + ext; };

  // ---------- texto ----------
  const scriptHtml = (t) => t.split(/\n[ \t]*\n+/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p).replace(/\[([^\]]*)\]/g, '<span class="tp-cue">[$1]</span>')}</p>`).join("");
  const countWords = (t) => (t.replace(CUE_RE, " ").match(/\S+/g) || []).length;

  function create(o) {
    const mode = o.mode === "interview" ? "interview" : "script";
    const title = String(o.title || "").trim();
    const text = String(o.text == null ? "" : o.text).replace(/\r\n?/g, "\n").trim();
    const questions = (Array.isArray(o.questions) ? o.questions : []).map((q) => String(q == null ? "" : q).replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 60);
    const hasContent = mode === "interview" ? questions.length > 0 : countWords(text) > 0;
    const P = loadPrefs(); if (mode === "interview" && Number.isFinite(+o.secondsPerQuestion) && +o.secondsPerQuestion > 0) P.sec = clamp(Math.round(+o.secondsPerQuestion), SEC.min, SEC.max);
    const words = mode === "script" ? Math.max(1, countWords(text)) : 1;
    const rm = App.reduceMotion();
    const mime = pickMime();
    const host = document.querySelector(".aura-app") || document.body;

    // ----- estado -----
    let phase = "ready";           // ready | count | run | pause | done
    let closing = false, delivered = false, completed = false, discarded = false;
    let pos = 0, maxPos = 1, pxs = 60, gy = 0, lh = 0, holdLeft = 0, holdSec = 3, lastRem = -1;
    let wpm = P.wpm, sec = P.sec, mirror = P.mirror, wantCam = P.cam, camView = P.camView, camO = P.camO, widthPct = P.w;
    let fsS = P.fsS || (phoneW() ? 36 : 46), fsQ = P.fsQ || (phoneW() ? 36 : 54);
    let runMs = 0, raf = 0, lastT = 0, lastAct = 0, uiOff = false, setOpen = false, dlg = null, cn = 0, wl = null, fsEntered = false;
    const iv = { i: 0, el: 0, beat: false, swapped: false, target: 0, lastSecs: -1 };
    const timers = new Set(), offs = [], urls = [];
    let inerted = [], kbd = false;   // kbd: la ultima interaccion fue con teclado (decide si el foco "viaja" a los botones o se queda en la pantalla)
    let beatT = [], countT = 0;
    const prevFocus = o._prevFocus || document.activeElement;
    // grabacion
    let rec = null, chunks = [], recWanted = false, recSeg = 0, recAcc = 0, recState = "off", lastRecSec = -1, finalFile = null, finalMs = 0, recErr = "", stopP = null;
    // camara
    const cam = { st: wantCam ? "pending" : "off", stream: null, token: 0, facing: "user", multi: false, noAudio: false, why: "" };

    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!closing) fn(); }, ms); timers.add(id); return id; };
    const unlater = (id) => { clearTimeout(id); timers.delete(id); };
    const on = (t, ev, fn, opt) => { t.addEventListener(ev, fn, opt); offs.push(() => t.removeEventListener(ev, fn, opt)); };
    const save = App.debounce(() => App.store.set("tp", { wpm, sec, fsS, fsQ, w: widthPct, mirror, cam: wantCam, camView, camO }), 250);

    // ----- DOM -----
    const root = document.createElement("div");
    root.className = "tp" + (rm ? " rm" : "");
    root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "Teleprompter" + (title ? ": " + title : "")); root.tabIndex = -1;
    root.dataset.mode = mode; root.dataset.phase = "ready"; root.dataset.cam = cam.st; root.dataset.camview = camView; root.dataset.rec = "off"; root.dataset.mirror = mirror ? "1" : "0"; root.dataset.facing = "user";
    const bodyHtml = mode === "script" ? (hasContent ? scriptHtml(text) : `<p class="tp-empty">${esc(App.say("Todavía no hay guion para leer. Volvé y escribilo o dictalo.", "Todavía no hay guion para leer. Vuelve y escríbelo o dicta."))}</p>`) : "";
    root.innerHTML = `
      <video class="tp-cam" playsinline muted autoplay aria-hidden="true"></video>
      <div class="tp-view">
        <div class="tp-stage"><div class="tp-track"><div class="tp-body">${bodyHtml}</div></div></div>
        <div class="tp-iv"><div class="tp-ring" aria-hidden="true"><svg viewBox="0 0 120 120"><circle class="trk" cx="60" cy="60" r="52"/><circle class="val" cx="60" cy="60" r="52"/></svg><span class="tp-secs"></span></div>
          <p class="tp-qt" aria-live="polite"></p><div class="tp-nx" aria-hidden="true">Siguiente</div></div>
      </div>
      <div class="tp-fade t" aria-hidden="true"></div><div class="tp-fade b" aria-hidden="true"></div><div class="tp-guide" aria-hidden="true"></div>
      <div class="tp-prog" role="progressbar" aria-label="Progreso" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>
      <header class="tp-top tp-ui"><button class="tp-ib" type="button" data-a="close" aria-label="Cerrar el teleprompter" title="Cerrar (Esc)">${icon("x")}</button>
        <span class="tp-ttl">${esc(title || (mode === "interview" ? "Entrevista" : "Teleprompter"))}</span>
        <button class="tp-ib" type="button" data-a="settings" aria-label="Ajustes" aria-expanded="false" aria-haspopup="true" title="Ajustes">${icon("settings")}</button></header>
      <div class="tp-stat" role="status"><span class="tp-rec"><i></i><b>REC</b> <time>0:00</time></span><span class="tp-info"></span></div>
      <div class="tp-ready tp-ui">
        <button class="tp-camsw" type="button" role="switch" aria-checked="true" data-a="camtoggle">${icon("camera")}<span><b>Grabar con cámara</b><small></small></span><i class="tp-knob" aria-hidden="true"></i></button>
        <p class="tp-note" role="status" hidden></p></div>
      <footer class="tp-dock tp-ui"><div class="tp-read"></div><div class="tp-row">
        <button class="tp-b" type="button" data-a="${mode === "script" ? "restart" : "prev"}"></button>
        <button class="tp-b" type="button" data-a="minus"></button>
        <span class="tp-pw"><button class="tp-play" type="button" data-a="play"><span class="tp-blob" aria-hidden="true"></span><span class="tp-pi"></span></button><span class="tp-cap" aria-hidden="true"></span></span>
        <button class="tp-b" type="button" data-a="plus"></button>
        <button class="tp-b" type="button" data-a="${mode === "script" ? "finish" : "next"}"></button></div></footer>
      <section class="tp-set tp-ui" role="group" aria-label="Ajustes del teleprompter" hidden></section>
      <div class="tp-count" hidden><span class="tp-cblob" aria-hidden="true"></span><span class="tp-cn" aria-hidden="true"></span><button class="tp-ccancel" type="button" data-a="cancelcount">Cancelar</button></div>
      <div class="tp-live sr" aria-live="polite" role="status"></div>`;
    const $q = (s) => root.querySelector(s);
    const view = $q(".tp-view"), track = $q(".tp-track"), bodyEl = $q(".tp-body"), video = $q(".tp-cam"), prog = $q(".tp-prog"), progI = prog.firstElementChild;
    const statEl = $q(".tp-stat"), recTime = $q(".tp-rec time"), recLbl = $q(".tp-rec b"), infoEl = $q(".tp-info"), readEl = $q(".tp-read"), live = $q(".tp-live");
    const playBtn = $q(".tp-play"), playIc = $q(".tp-pi"), capEl = $q(".tp-cap"), setEl = $q(".tp-set"), settingsBtn = $q('[data-a="settings"]');
    const camBtn = $q(".tp-camsw"), camSmall = $q(".tp-camsw small"), noteEl = $q(".tp-note"), countEl = $q(".tp-count");
    const qt = $q(".tp-qt"), ringVal = $q(".tp-ring .val"), secsEl = $q(".tp-secs"), nxEl = $q(".tp-nx");
    const btnL = root.querySelector(".tp-row > .tp-b:first-child"), btnMinus = $q('[data-a="minus"]'), btnPlus = $q('[data-a="plus"]'), btnR = root.querySelector(".tp-row > .tp-b:last-child");
    const RING_C = 2 * Math.PI * 52; ringVal.style.strokeDasharray = RING_C.toFixed(2);
    const say = (t) => { live.textContent = ""; later(() => { live.textContent = t; }, 30); };

    // ----- botones del dock (iconos y etiquetas segun el modo) -----
    if (mode === "script") {
      btnL.innerHTML = icon("undo"); btnL.setAttribute("aria-label", "Volver al principio"); btnL.title = "Volver al principio (Inicio)";
      btnMinus.innerHTML = icon("minus"); btnMinus.setAttribute("aria-label", "Más lento"); btnMinus.title = "Más lento (−)";
      btnPlus.innerHTML = icon("plus"); btnPlus.setAttribute("aria-label", "Más rápido"); btnPlus.title = "Más rápido (+)";
      btnR.innerHTML = icon("check"); btnR.setAttribute("aria-label", "Terminar"); btnR.title = "Terminar";
    } else {
      btnL.innerHTML = icon("chevleft"); btnL.setAttribute("aria-label", "Pregunta anterior"); btnL.title = "Pregunta anterior (←)";
      btnMinus.innerHTML = icon("minus"); btnMinus.setAttribute("aria-label", "5 segundos menos por pregunta"); btnMinus.title = "5 s menos por pregunta (−)";
      btnPlus.innerHTML = icon("plus"); btnPlus.setAttribute("aria-label", "5 segundos más por pregunta"); btnPlus.title = "5 s más por pregunta (+)";
      btnR.innerHTML = icon("chevron"); btnR.setAttribute("aria-label", "Pregunta siguiente"); btnR.title = "Pregunta siguiente (→)";
    }

    // ================= medidas y posicion del texto =================
    // Todo lo que se lee del DOM pasa AQUI, una vez por cambio (abrir, tamano, ancho, redimensionar). En cada cuadro solo se escribe un translateY.
    function layout() {
      const ratio = maxPos > 1 ? pos / maxPos : 0;
      root.style.setProperty("--fs", fsS + "px"); root.style.setProperty("--fsq", fsQ + "px"); root.style.setProperty("--tpw", String(widthPct)); root.style.setProperty("--cam-o", (camO / 100).toFixed(2));
      if (mode === "script") {
        const vh = view.clientHeight || innerHeight; lh = fsS * 1.42; gy = Math.round(vh * (phoneW() ? 0.3 : 0.34));
        root.style.setProperty("--gy", gy + "px"); root.style.setProperty("--lh", lh.toFixed(1) + "px");
        track.style.paddingTop = Math.max(0, gy - lh / 2).toFixed(1) + "px"; track.style.paddingBottom = Math.max(0, vh - gy + lh / 2).toFixed(1) + "px";
        // distancia que recorre el texto de la primera a la ultima linea sobre la guia; la velocidad sale de ella (ver speed())
        maxPos = Math.max(1, bodyEl.offsetHeight - lh);
        pos = clamp(ratio * maxPos, 0, maxPos);
        holdSec = clamp(Math.min(words, 10) / wpm * 60 + 1.5, 2.5, 8);
      }
      speed(); paint(); paintStat();
    }
    // VELOCIDAD TRUTHFUL: el guion mide `maxPos` px de alto y tiene `words` palabras; a `wpm` palabras por minuto dura words/wpm*60 s, asi que la velocidad
    // es altura/duracion. Si cambia el tamano de letra, el ancho o el tamano de la pantalla, cambia la altura y la velocidad se recalcula sola: los WPM no mienten.
    function speed() { pxs = mode === "script" ? maxPos / (words / wpm * 60) : 0; holdSec = clamp(Math.min(words, 10) / wpm * 60 + 1.5, 2.5, 8); }
    function paint() {
      if (mode === "script") {
        track.style.transform = "translate3d(0," + (-pos).toFixed(2) + "px,0)";
        const p = maxPos > 0 ? pos / maxPos : 0;
        progI.style.transform = "scaleX(" + p.toFixed(4) + ")";
        const rem = Math.max(0, Math.ceil((maxPos - pos) / (pxs || 1)));
        if (rem !== lastRem) { lastRem = rem; paintStat(); prog.setAttribute("aria-valuenow", String(Math.round(p * 100))); }
      }
    }
    const setPos = (p) => { pos = clamp(p, 0, maxPos); if (holdLeft > 0 && pos < maxPos) holdLeft = 0; paint(); };

    // ================= estado en pantalla =================
    function paintStat() {
      if (mode === "script") {
        const rem = Math.max(0, Math.ceil((maxPos - pos) / (pxs || 1)));
        infoEl.textContent = phase === "ready" ? "≈ " + mmss(Math.round(words / wpm * 60)) : phase === "done" ? "Listo" : "−" + mmss(rem);
      } else {
        infoEl.textContent = questions.length ? (iv.i + 1) + " de " + questions.length : "Sin preguntas";
      }
      readEl.textContent = mode === "script" ? wpm + " palabras por minuto" : sec + " segundos por pregunta";
    }
    function recLabel() {
      root.dataset.rec = recState; recLbl.textContent = recState === "paused" ? "PAUSA" : "REC";
    }
    function refreshDock() {
      const labelFor = { ready: ["Empezar", "Empezar"], count: ["Cuenta regresiva", ""], run: ["Pausar", "Pausar"], pause: ["Seguir", "Seguir"], done: ["", ""] }[phase];
      playBtn.setAttribute("aria-label", labelFor[0]); playBtn.title = labelFor[0] + " (Espacio)"; capEl.textContent = labelFor[1];
      playIc.innerHTML = phase === "run" ? icon("pause") : icon("play", "fill");
      playBtn.disabled = !hasContent || phase === "done";
      const live_ = phase === "run" || phase === "pause";
      if (mode === "script") { btnL.disabled = phase === "count"; btnR.disabled = !live_; btnMinus.disabled = btnPlus.disabled = false; }
      else {
        btnL.disabled = !live_; btnR.disabled = !live_; btnMinus.disabled = sec <= SEC.min; btnPlus.disabled = sec >= SEC.max;
        const last = iv.i >= questions.length - 1; btnR.innerHTML = last ? icon("check") : icon("chevron"); btnR.setAttribute("aria-label", last ? "Terminar" : "Pregunta siguiente"); btnR.title = last ? "Terminar" : "Pregunta siguiente (→)";
      }
    }
    function setPhase(p) {
      phase = p; root.dataset.phase = p; if (p !== "run") setUiOff(false);
      refreshDock(); paintStat(); paintCam();
    }
    function setUiOff(v) { if (uiOff === v) return; uiOff = v; root.classList.toggle("ui-off", v); }
    const holdUi = () => setOpen || !!dlg;
    function wake() { lastAct = performance.now(); if (uiOff) setUiOff(false); }

    // ================= bucle: UN requestAnimationFrame, solo mientras se lee =================
    function startLoop() { if (raf) return; lastT = performance.now(); lastAct = lastT; raf = requestAnimationFrame(loop); }
    function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    function loop(now) {
      raf = requestAnimationFrame(loop);
      // dt acotado: si la pestana estuvo dormida no hay salto, pero un cuadro lento (>100 ms) igual cuenta entero para que los WPM sigan siendo reales
      const dt = clamp((now - lastT) / 1000, 0, 0.25); lastT = now;
      if (phase !== "run") return;
      runMs += dt * 1000;
      if (mode === "script") stepScript(dt); else stepInterview(dt);
      if (phase === "run" && !uiOff && !holdUi() && now - lastAct > UI_HIDE_MS) setUiOff(true);
      if (recState === "on") tickRec(now);
    }
    function stepScript(dt) {
      if (holdLeft > 0) { holdLeft -= dt; if (holdLeft <= 0) finish("end"); return; }
      pos += pxs * dt;
      if (pos >= maxPos) { pos = maxPos; holdLeft = holdSec; }   // la ultima linea queda un momento sobre la guia, para terminar de decirla
      paint();
    }

    // ================= entrevista =================
    function renderQ(reveal) {
      const q = questions[iv.i] || "", ws = q.split(" ").filter(Boolean), step = clamp(sec * 0.3 / Math.max(1, ws.length), 0.1, 0.4);
      qt.className = "tp-qt " + (reveal ? "rev" : "pre");
      qt.innerHTML = ws.map((w, i) => `<span class="w" style="--d:${(i * step).toFixed(2)}s">${esc(w)}</span>`).join(" ");
      paintRing(true); paintStat(); refreshDock(); paintProgQ();
    }
    function paintRing(force) {
      const p = clamp(iv.el / sec, 0, 1);
      ringVal.style.strokeDashoffset = (RING_C * p).toFixed(2);
      const left = Math.max(0, Math.ceil(sec - iv.el - 0.001));
      if (force || left !== iv.lastSecs) { iv.lastSecs = left; secsEl.textContent = String(left); }
    }
    function paintProgQ() {
      const n = Math.max(1, questions.length), p = clamp((iv.i + clamp(iv.el / sec, 0, 1)) / n, 0, 1);
      progI.style.transform = "scaleX(" + p.toFixed(4) + ")"; prog.setAttribute("aria-valuenow", String(Math.round(p * 100)));
    }
    function stepInterview(dt) {
      if (iv.beat) return;
      iv.el += dt; paintRing(); paintProgQ();
      if (iv.el >= sec) goQ(iv.i + 1, "Siguiente");
    }
    // una pregunta nueva: la actual se apaga con suavidad, aparece "Siguiente" un instante y la nueva se va revelando palabra por palabra
    // Si se pide otro cambio mientras la pregunta todavia se esta apagando, solo cambia a donde va; si la nueva ya se mostro, arranca otro cambio desde ahi
    // (nunca se pierde un toque).
    function goQ(target, label) {
      if (target >= questions.length) { finish("end"); return; }
      target = Math.max(0, target);
      nxEl.textContent = label || "Siguiente"; iv.target = target;
      if (iv.beat && !iv.swapped) return;
      beatT.forEach(unlater);
      iv.beat = true; iv.swapped = false; root.classList.add("q-out");
      beatT = [later(swapQ, rm ? 40 : BEAT_SWAP), later(endBeat, rm ? 90 : BEAT_END)];
      say((label || "Siguiente") + ", " + (target + 1) + " de " + questions.length);
    }
    function swapQ() { iv.swapped = true; iv.i = iv.target; iv.el = 0; renderQ(phase === "run" || phase === "pause"); root.classList.remove("q-out"); }
    function endBeat() { iv.beat = false; iv.swapped = false; }

    // ================= camara y grabacion (siempre opcionales) =================
    function paintCam() {
      const ready = phase === "ready";
      camBtn.setAttribute("aria-checked", String(wantCam && cam.st !== "none")); camBtn.dataset.st = cam.st;
      camBtn.disabled = !ready || cam.st === "none";
      camSmall.textContent = !wantCam ? "Apagada: solo vas a ver el texto." : cam.st === "pending" ? "Pidiendo permiso" : cam.st === "none" ? "No disponible en este dispositivo" : cam.st === "on" ? (cam.noAudio ? "Lista, sin micrófono. Se graba desde la cuenta regresiva." : "Lista. Se graba desde la cuenta regresiva.") : "Apagada: solo vas a ver el texto.";
      const note = cam.st === "none" ? App.say("Sin cámara: el teleprompter funciona igual, grabá con tu celular.", "Sin cámara: el teleprompter funciona igual, graba con tu celular.") : (cam.st === "on" && cam.noAudio ? "Sin micrófono: la toma se graba sin sonido." : "");
      noteEl.hidden = !note; if (noteEl.textContent !== note) noteEl.textContent = note;
      root.dataset.cam = wantCam ? cam.st : "off"; root.dataset.camwhy = cam.why;
      renderSettingsCam();
    }
    function camSet(st, why) { cam.st = st; cam.why = why || ""; paintCam(); }
    async function camStart(facing) {
      const tok = ++cam.token, md = navigator.mediaDevices;
      if (!md || typeof md.getUserMedia !== "function") { camSet("none", "unsupported"); return false; }
      camSet("pending");
      let stream = null, err = null;
      const get = async (c) => { try { return await md.getUserMedia(c); } catch (e) { err = e; return null; } };
      // portrait y 1080x1920 "ideal": el navegador elige lo mas cercano que tenga (una webcam de escritorio da 16:9 y esta bien)
      stream = await get({ video: { facingMode: { ideal: facing }, width: { ideal: 1080 }, height: { ideal: 1920 } }, audio: true });
      cam.noAudio = false;
      if (!stream && !(err && /NotAllowed|Security|Abort/i.test(err.name || ""))) { stream = await get({ video: { facingMode: { ideal: facing } }, audio: false }); if (stream) cam.noAudio = true; }
      if (tok !== cam.token || closing) { if (stream) stream.getTracks().forEach((t) => t.stop()); return false; }   // se cerro o se cambio de idea mientras se esperaba el permiso
      if (!stream) { camSet("none", (err && err.name) || "error"); return false; }
      cam.stream = stream; video.srcObject = stream; try { const pr = video.play(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) { /* sin autoplay: el video igual se graba */ }
      const vt = stream.getVideoTracks()[0], st = (vt && vt.getSettings && vt.getSettings()) || {};
      cam.facing = st.facingMode === "environment" ? "environment" : "user"; root.dataset.facing = cam.facing === "environment" ? "env" : "user";
      if (vt) vt.addEventListener("ended", () => { if (cam.stream === stream && !closing && phase !== "done") { camStopStream(); camSet("none", "lost"); if (recActive()) { say("Se perdió la cámara."); App.toast(App.say("Se perdió la cámara. El texto sigue y lo grabado hasta acá queda guardado.", "Se perdió la cámara. El texto sigue y lo grabado hasta aquí queda guardado.")); } } });
      camSet("on");
      try { const ds = await md.enumerateDevices(); cam.multi = ds.filter((d) => d.kind === "videoinput").length > 1; } catch (e) { cam.multi = false; }
      if (tok === cam.token) paintCam();
      return true;
    }
    function camStopStream() { cam.token++; if (cam.stream) { cam.stream.getTracks().forEach((t) => { try { t.stop(); } catch (e) { /* ya parada */ } }); cam.stream = null; } try { video.srcObject = null; } catch (e) { /* sin video */ } }
    async function camFlip() {
      if (recState !== "off" || !cam.stream || !cam.multi) return;
      const old = cam.stream, oldFacing = cam.facing, md = navigator.mediaDevices;
      const want = oldFacing === "user" ? "environment" : "user";
      cam.token++; const tok = cam.token; camSet("pending");
      let stream = null;
      try { stream = await md.getUserMedia({ video: { facingMode: { ideal: want }, width: { ideal: 1080 }, height: { ideal: 1920 } }, audio: true }); } catch (e) { try { stream = await md.getUserMedia({ video: { facingMode: { ideal: want } }, audio: false }); } catch (e2) { stream = null; } }
      if (tok !== cam.token || closing) { if (stream) stream.getTracks().forEach((t) => t.stop()); return; }
      if (!stream) { camSet("on"); return; }   // no se pudo girar: sigue la que estaba
      let vt = stream.getVideoTracks()[0], fm = vt && vt.getSettings && vt.getSettings().facingMode;
      // en una compu con dos webcams facingMode no distingue: se pasa a la siguiente por deviceId
      if (!fm || fm === oldFacing) {
        try {
          const ds = (await md.enumerateDevices()).filter((d) => d.kind === "videoinput"), curId = (old.getVideoTracks()[0].getSettings() || {}).deviceId, i = ds.findIndex((d) => d.deviceId === curId), nx = ds[(i + 1) % ds.length];
          if (nx && nx.deviceId !== curId) { stream.getTracks().forEach((t) => t.stop()); stream = await md.getUserMedia({ video: { deviceId: { exact: nx.deviceId } }, audio: true }); vt = stream.getVideoTracks()[0]; }
        } catch (e) { /* se queda con la que dio facingMode */ }
      }
      old.getTracks().forEach((t) => t.stop());
      cam.stream = stream; video.srcObject = stream; try { video.play().catch(() => {}); } catch (e) { /* ok */ }
      // una compu con dos webcams no informa facingMode: se queda como "user" (espejo) en vez de adivinar que la segunda mira para atras
      cam.facing = (vt && vt.getSettings && vt.getSettings().facingMode) === "environment" ? "environment" : "user"; root.dataset.facing = cam.facing === "environment" ? "env" : "user";
      camSet("on");
    }
    function recStart() {
      if (!cam.stream || !wantCam) return false;
      chunks = []; recErr = ""; recAcc = 0; stopP = null;
      try { rec = new MediaRecorder(cam.stream, Object.assign(mime ? { mimeType: mime } : {}, { videoBitsPerSecond: 4000000, audioBitsPerSecond: 128000 })); }
      catch (e) { try { rec = new MediaRecorder(cam.stream); } catch (e2) { rec = null; recErr = "no_recorder"; return false; } }
      const r = rec;
      r.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      r.onerror = () => { recErr = "error"; };
      // si el navegador corta la grabadora solo (se perdio la camara, se lleno el disco), el REC no se queda prendido mintiendo: lo grabado hasta ahi se conserva
      r.onstop = () => { if (rec === r && recState !== "off") { if (recState === "on") recAcc += performance.now() - recSeg; recState = "off"; recLabel(); say("La grabación se detuvo."); } };
      try { r.start(1000); } catch (e) { rec = null; recErr = "start"; return false; }
      recSeg = performance.now(); recState = "on"; lastRecSec = -1; recTime.textContent = "0:00"; recLabel(); return true;
    }
    const recMs = () => recAcc + (recState === "on" ? performance.now() - recSeg : 0);
    function tickRec(now) { const s = Math.floor(recMs() / 1000); if (s !== lastRecSec) { lastRecSec = s; recTime.textContent = mmss(s); } }
    function recPause() { if (!rec || recState !== "on") return; try { rec.pause(); } catch (e) { /* algunos navegadores no pausan */ } recAcc += performance.now() - recSeg; recState = "paused"; recLabel(); }
    function recResume() { if (!rec || recState !== "paused") return; try { rec.resume(); } catch (e) { /* sigue */ } recSeg = performance.now(); recState = "on"; recLabel(); }
    function buildFile() {
      if (!chunks.length) return null;
      const type = ((rec && rec.mimeType) || mime || "video/webm").split(";")[0] || "video/webm", ext = /mp4/.test(type) ? "mp4" : "webm", blob = new Blob(chunks, { type });
      if (!blob.size) return null;
      try { return new File([blob], stampName(ext), { type, lastModified: Date.now() }); } catch (e) { blob.name = stampName(ext); return blob; }
    }
    // detiene la grabadora y entrega el archivo; nunca se queda esperando (si el navegador no manda "stop", a los 4 s se arma con lo que haya)
    function recStop() {
      if (stopP) return stopP;
      return (stopP = new Promise((resolve) => {
        if (!rec) { resolve(null); return; }
        const r = rec; if (recState === "on") recAcc += performance.now() - recSeg;
        recState = "off"; recLabel();
        if (r.state === "inactive") { resolve(buildFile()); return; }
        let ended = false; const fin = () => { if (ended) return; ended = true; clearTimeout(tm); resolve(buildFile()); };
        const tm = setTimeout(fin, 4000);
        r.addEventListener("stop", () => setTimeout(fin, 0), { once: true });
        try { r.stop(); } catch (e) { fin(); }
      }));
    }
    function recDiscard() { const r = rec; rec = null; chunks = []; stopP = null; recState = "off"; recAcc = 0; recLabel(); if (r && r.state !== "inactive") { r.ondataavailable = null; r.onerror = null; try { r.stop(); } catch (e) { /* ya parada */ } } }
    const recActive = () => !!rec && (recState !== "off" || chunks.length > 0);

    // ================= pantalla encendida, pantalla completa =================
    async function wlAcquire() { try { if (navigator.wakeLock && !wl && !closing) { const l = await navigator.wakeLock.request("screen"); if (closing || phase === "pause" || phase === "done") { l.release().catch(() => {}); return; } wl = l; l.addEventListener("release", () => { if (wl === l) wl = null; }); } } catch (e) { /* sin wake lock: no pasa nada */ } }
    function wlRelease() { const l = wl; wl = null; if (l) { try { l.release().catch(() => {}); } catch (e) { /* ya liberado */ } } }
    function enterFs() {
      if (document.fullscreenElement || o.fullscreen === false) return;
      try { const fn = root.requestFullscreen || root.webkitRequestFullscreen; if (fn) { const pr = fn.call(root); fsEntered = true; if (pr && pr.catch) pr.catch(() => { fsEntered = false; }); } } catch (e) { fsEntered = false; }
    }
    function exitFs() { if (fsEntered && document.fullscreenElement === root) { try { const pr = document.exitFullscreen(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) { /* ok */ } } fsEntered = false; }

    // ================= transporte =================
    function start() {
      if (phase !== "ready" || !hasContent || closing) return;
      enterFs(); wlAcquire();   // el clic de "Empezar" es el gesto que los navegadores piden para estas dos cosas
      recWanted = wantCam && cam.st === "on";
      if (mode === "interview") { iv.i = 0; iv.el = 0; iv.beat = false; }
      runMs = 0; holdLeft = 0;
      setPhase("count"); toggleSettings(false); armCancel();
      if (recWanted) recStart();   // arranca con la cuenta regresiva: queda un colchon al principio que luego se recorta
      cn = COUNT_FROM; countStep();
    }
    function countStep() {
      if (cn <= 0) { go(); return; }
      countEl.hidden = false; const n = countEl.querySelector(".tp-cn"), fresh = n.cloneNode(false); fresh.textContent = String(cn); fresh.className = "tp-cn"; fresh.setAttribute("aria-hidden", "true"); n.replaceWith(fresh);
      say(String(cn)); cn--; countT = later(countStep, 1000);
    }
    // "Cancelar" queda justo donde estaba el boton de empezar: durante el primer instante no recibe toques, asi un doble toque en Empezar no cancela la cuenta
    function armCancel() { const b = $q(".tp-ccancel"); b.disabled = true; later(() => { b.disabled = false; }, 900); }
    function cancelCount() {
      if (phase !== "count") return;
      unlater(countT); countEl.hidden = true; recDiscard(); wlRelease(); setPhase("ready"); say("Cuenta cancelada");
    }
    function go() {
      countEl.hidden = true; say("¡Ya!");
      setPhase("run");
      if (mode === "interview") { iv.el = 0; renderQ(true); } else paint();
      startLoop();
    }
    function pause() { if (phase !== "run") return; setPhase("pause"); stopLoop(); recPause(); wlRelease(); if (mode === "interview") paintRing(true); }
    function resume() { if (phase !== "pause" || closing) return; setPhase("run"); recResume(); wlAcquire(); startLoop(); }
    function togglePlay() { if (phase === "ready") start(); else if (phase === "run") pause(); else if (phase === "pause") resume(); }
    function restart() {
      if (phase === "ready" || phase === "count" || phase === "done") { if (mode === "script") setPos(0); else if (phase === "ready") { iv.i = 0; iv.el = 0; renderQ(false); } return; }
      if (phase === "run") pause();
      holdLeft = 0;
      if (mode === "script") setPos(0); else goQ(0, "Desde el principio");
    }
    function adj(dir) {
      if (phase === "done") return;
      if (mode === "script") setWpm(wpm + dir * 10); else setSec(sec + dir * SEC.jump);
    }
    function setWpm(v) { wpm = clamp(snap(v, WPM.step), WPM.min, WPM.max); speed(); lastRem = -1; paint(); paintStat(); syncSettings(); save(); }
    function setSec(v) { sec = clamp(Math.round(v), SEC.min, SEC.max); if (mode === "interview") { paintRing(true); paintProgQ(); refreshDock(); } paintStat(); syncSettings(); save(); }
    function setFs(v) { const x = clamp(Math.round(v), FS.min, mode === "script" ? FS.max : 120); if (mode === "script") fsS = x; else fsQ = x; layout(); syncSettings(); save(); }
    function setWidth(v) { widthPct = clamp(Math.round(v / 5) * 5, 40, 100); layout(); syncSettings(); save(); }
    function setMirror(v) { mirror = !!v; root.dataset.mirror = mirror ? "1" : "0"; syncSettings(); save(); }
    function setCamView(v) { camView = v; root.dataset.camview = v; syncSettings(); save(); }
    function setCamO(v) { camO = clamp(Math.round(v), 10, 90); root.style.setProperty("--cam-o", (camO / 100).toFixed(2)); syncSettings(); save(); }
    function nudge(px) { if ((phase === "pause" || phase === "ready") && mode === "script") setPos(pos + px); }

    async function camToggle() {
      if (phase !== "ready") return;
      wantCam = !wantCam; save();
      if (!wantCam) { camStopStream(); camSet("off"); return; }
      camSet("pending"); await camStart(cam.facing);
    }

    // ================= final =================
    async function finish(why) {
      if (phase === "done" || closing) return;
      unlater(countT); beatT.forEach(unlater); beatT = []; countEl.hidden = true; stopLoop(); wlRelease(); toggleSettings(false); closeDlg("cancel");
      completed = why !== "keep"; setPhase("done"); exitFs();
      root.classList.remove("q-out"); renderEnd(!!rec);
      const file = await recStop();
      if (closing) return;
      camStopStream();   // la camara ya no hace falta: se apaga la luz
      finalFile = file; finalMs = file ? Math.round(recAcc) : Math.round(runMs);
      renderEnd(false); if (completed && App.morph && App.morph.confetti) App.morph.confetti($q(".tp-end"), 46);
    }
    // la tarjeta final: "Listo. ¡Buen trabajo!" + (si hubo camara) ver, descargar o repetir. `saving` = todavia se esta armando el archivo
    function renderEnd(saving) {
      let el = $q(".tp-end"); if (!el) { el = document.createElement("section"); el.className = "tp-end"; el.setAttribute("role", "group"); el.setAttribute("aria-label", "Terminaste"); root.appendChild(el); }
      const file = finalFile, dur = mmss(Math.round((file ? finalMs : runMs) / 1000));
      let sub, btns = "";
      if (saving) sub = `<span class="tp-wait"><i></i>Guardando tu grabación</span>`;
      else if (file) {
        sub = `Grabaste ${dur} · ${bytes(file.size)}. ${App.say("Revisala, descargala o seguí.", "Revísala, descárgala o sigue.")}`;
        btns = `<button class="btn" type="button" data-a="view">${icon("eye")}<span>Ver lo que grabaste</span></button><button class="btn" type="button" data-a="dl">${icon("download")}<span>Descargar</span></button><button class="btn ghost" type="button" data-a="again">${icon("refresh")}<span>Otra toma</span></button>`;
      } else {
        const unit = mode === "interview" ? questions.length + " " + App.plural(questions.length, "pregunta", "preguntas") : words + " palabras";
        sub = (recErr ? "No se pudo guardar el video de esta toma. " : "") + (mode === "interview" ? "Pasaste por " + unit + " en " + dur + "." : "Leíste el guion (" + unit + ") en " + dur + ".");
        btns = `<button class="btn ghost" type="button" data-a="again">${icon("refresh")}<span>Repetir</span></button>`;
      }
      el.innerHTML = `<div class="tp-endc"><span class="orb" aria-hidden="true"></span><h2 tabindex="-1">Listo. <em>¡Buen trabajo!</em></h2><p class="tp-endsub">${sub}</p><div class="tp-endvw" hidden></div>
        <div class="tp-enda">${btns}<button class="btn pri" type="button" data-a="ok"${saving ? " disabled" : ""}>${icon("check")}<span>Listo</span></button></div></div>`;
      if (!saving) { const okb = el.querySelector('[data-a="ok"]'); try { okb.focus({ preventScroll: true }); } catch (e) { /* ok */ } }
      say("Listo. ¡Buen trabajo!");
    }
    function showPreview() {
      const box = $q(".tp-endvw"); if (!box || !finalFile) return;
      if (!box.hidden) { box.hidden = true; box.innerHTML = ""; const b = $q('[data-a="view"] span'); if (b) b.textContent = "Ver lo que grabaste"; return; }
      const url = URL.createObjectURL(finalFile); urls.push(url);
      box.innerHTML = `<video class="tp-endv" controls playsinline preload="metadata" aria-label="Tu grabación"></video>`; const v = box.firstElementChild; v.src = url;
      // un webm grabado en el navegador no trae la duracion: se fuerza a calcularla para que la barra de la vista previa se pueda arrastrar
      v.addEventListener("loadedmetadata", () => { if (v.duration === Infinity) { v.currentTime = 1e101; v.addEventListener("timeupdate", function fix() { v.removeEventListener("timeupdate", fix); v.currentTime = 0; }); } });
      box.hidden = false; const b = $q('[data-a="view"] span'); if (b) b.textContent = "Ocultar";
      try { v.scrollIntoView({ block: "nearest" }); } catch (e) { /* ok */ }
    }
    async function download() {
      const f = finalFile; if (!f) return;
      const A = App.adapter && App.adapter();
      try {
        if (A && A.hasDownloads && A.hasDownloads() && A.download) {
          const r = await A.download(f.name, f);
          if (r === true) { App.toast("Descarga lista: " + f.name); return; }
          if (r === "declined") return;
        }
      } catch (e) { /* se prueba el ancla */ }
      try {
        const url = URL.createObjectURL(f), a = document.createElement("a"); a.href = url; a.download = f.name; a.style.display = "none"; root.appendChild(a); a.click();
        setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 10000);
        App.toast("Descargando " + f.name);
      } catch (e) { App.toast(App.say("No se pudo descargar acá. Abrí Aura en su propia pestaña e intentá de nuevo.", "No se pudo descargar aquí. Abre Aura en su propia pestaña e inténtalo de nuevo.")); }
    }
    async function again() {
      if (finalFile) {
        const r = await ask({ title: "¿Grabar otra toma?", text: "Esta grabación se descarta. Si querés guardarla, descargala antes.".replace("querés", App.say("querés", "quieres")).replace("descargala", App.say("descargala", "descárgala")), actions: [{ id: "ok", label: "Descartar y repetir", kind: "pri" }, { id: "stay", label: "Volver", kind: "ghost" }] });
        if (r !== "ok") return;
      }
      const el = $q(".tp-end"); if (el) el.remove();
      urls.splice(0).forEach((u) => URL.revokeObjectURL(u)); finalFile = null; finalMs = 0; recDiscard(); completed = false; runMs = 0; holdLeft = 0;
      if (mode === "script") { pos = 0; paint(); } else { iv.i = 0; iv.el = 0; iv.beat = false; renderQ(false); }
      setPhase("ready"); lastRem = -1; paintStat();
      if (wantCam) camStart(cam.facing);
    }

    // ================= cerrar =================
    function result() {
      return { recorded: discarded ? null : finalFile, durationMs: finalFile && !discarded ? finalMs : Math.round(runMs), mode, completed: !!completed && !discarded, discarded };
    }
    async function shutdown(reason) {
      if (closing) return; closing = true;
      stopLoop(); unlater(countT); beatT.forEach(unlater);
      if (reason === "discard") { discarded = true; recDiscard(); }
      else if (!finalFile && (recActive() || phase === "done")) { const f = await recStop(); if (f) { finalFile = f; finalMs = Math.round(recAcc); } }
      // ---- limpieza total: nada queda colgado ----
      timers.forEach((t) => clearTimeout(t)); timers.clear();
      offs.splice(0).forEach((f) => { try { f(); } catch (e) { /* ok */ } });
      camStopStream(); recDiscardSilently(); wlRelease(); exitFs();
      urls.splice(0).forEach((u) => URL.revokeObjectURL(u));
      unlockApp(inerted.splice(0));
      const res = result();
      const fin = () => {
        root.remove(); if (cur === api) cur = null;
        try { if (prevFocus && prevFocus.isConnected && prevFocus.focus) prevFocus.focus({ preventScroll: true }); } catch (e) { /* ok */ }
        if (!delivered) { delivered = true; if (typeof o.onDone === "function") { try { o.onDone(res); } catch (e) { console.error(e); } } }
      };
      if (rm || !root.animate) { fin(); return; }
      root.classList.add("out"); setTimeout(fin, 240);
    }
    function recDiscardSilently() { const r = rec; rec = null; if (r && r.state !== "inactive") { r.ondataavailable = null; r.onerror = null; r.onstop = null; try { r.stop(); } catch (e) { /* ok */ } } }
    async function requestClose() {
      if (closing || phase === "done") return;
      if (phase === "count") cancelCount();
      if (phase === "run") pause();
      if (phase === "ready") { shutdown("close"); return; }
      if (recActive()) {
        const r = await ask({ title: "Estás grabando", text: "¿Qué hacemos con lo que grabaste hasta ahora?", actions: [{ id: "keep", label: "Guardar y terminar", kind: "pri" }, { id: "discard", label: "Descartar la grabación", kind: "bad" }, { id: "stay", label: "Seguir con la toma", kind: "ghost" }] });
        if (r === "keep") finish("keep"); else if (r === "discard") shutdown("discard");
      } else {
        const r = await ask({ title: "¿Salir del teleprompter?", text: "Vas a perder el lugar donde ibas.", actions: [{ id: "exit", label: "Salir", kind: "pri" }, { id: "stay", label: "Seguir", kind: "ghost" }] });
        if (r === "exit") shutdown("close");
      }
    }
    async function askFinish() {
      if (phase !== "run" && phase !== "pause") return;
      const prog_ = mode === "script" ? pos / maxPos : (iv.i + 1) / Math.max(1, questions.length);
      if (phase === "run") pause();
      if (prog_ < 0.9) {
        const r = await ask({ title: "¿Terminar la toma?", text: recActive() ? "Se corta la grabación aquí." : "Todavía queda parte del " + (mode === "script" ? "guion" : "las preguntas") + ".", actions: [{ id: "ok", label: "Terminar", kind: "pri" }, { id: "stay", label: "Seguir", kind: "ghost" }] });
        if (r !== "ok") return;
      }
      finish("manual");
    }

    // ----- pregunta de confirmacion -----
    function ask(d) {
      return new Promise((resolve) => {
        if (dlg || closing) { resolve("stay"); return; }
        const el = document.createElement("div"); el.className = "tp-dlg";
        el.innerHTML = `<div class="tp-dlgc" role="alertdialog" aria-modal="true" aria-labelledby="tpdt"><h2 id="tpdt">${esc(d.title)}</h2><p>${esc(d.text || "")}</p><div class="tp-dlga">${d.actions.map((a) => `<button type="button" class="btn ${a.kind === "pri" ? "pri" : a.kind === "bad" ? "bad" : "ghost"}" data-d="${a.id}">${esc(a.label)}</button>`).join("")}</div></div>`;
        root.appendChild(el); dlg = { el, resolve, def: d.actions[d.actions.length - 1].id }; wake();
        const first = el.querySelector("button"); if (first) first.focus({ preventScroll: true });
      });
    }
    function closeDlg(result_) { if (!dlg) return; const d = dlg; dlg = null; d.el.remove(); d.resolve(result_ === "cancel" ? d.def : result_); try { if (!closing) (playBtn.disabled ? root : playBtn).focus({ preventScroll: true }); } catch (e) { /* ok */ } }

    // ================= ajustes =================
    const fillPct = (v, a, b) => (b > a ? clamp(((v - a) / (b - a)) * 100, 0, 100) : 0).toFixed(1);
    function settingsHtml() {
      const range = (id, label, val, a, b, step, out) => `<div class="tp-f"><label for="${id}"><span>${label}</span><output id="${id}o">${out}</output></label><input id="${id}" type="range" min="${a}" max="${b}" step="${step}" value="${val}" data-set="${id}" style="--v:${fillPct(val, a, b)}%"></div>`;
      const sw = (a, label, on, sub) => `<div class="tp-f"><button class="tp-sw" type="button" role="switch" aria-checked="${on}" data-a="${a}"><span>${label}${sub ? `<small>${sub}</small>` : ""}</span><i class="tp-knob" aria-hidden="true"></i></button></div>`;
      return `<div class="tp-sh"><span>Ajustes</span><button class="tp-ib" type="button" data-a="settings" aria-label="Cerrar ajustes" style="width:40px;height:40px">${icon("x")}</button></div>
        ${mode === "script" ? range("wpm", "Velocidad", wpm, WPM.min, WPM.max, WPM.step, wpm + " pal/min") : range("sec", "Tiempo por pregunta", sec, SEC.min, SEC.max, 1, sec + " s")}
        ${range("fs", "Tamaño de letra", mode === "script" ? fsS : fsQ, FS.min, mode === "script" ? FS.max : 120, 2, (mode === "script" ? fsS : fsQ) + " px")}
        ${mode === "script" ? range("w", "Ancho del texto", widthPct, 40, 100, 5, widthPct + "%") : ""}
        ${sw("mirror", "Espejo horizontal", mirror, "Para cristal reflectante")}
        <div class="tp-f"><span class="lbl">Cámara</span>${camSettingsHtml()}</div>
        <div class="tp-f"><button class="tp-act" type="button" data-a="fs">${icon("frame")}<span>Pantalla completa</span></button></div>
        <div class="tp-keys"><kbd>Espacio</kbd> empezar / pausar · <kbd>+</kbd> <kbd>−</kbd> ${mode === "script" ? "velocidad" : "segundos"} · <kbd>↑</kbd> <kbd>↓</kbd> ${mode === "script" ? "mover el texto en pausa" : ""}${mode === "interview" ? "<kbd>←</kbd> <kbd>→</kbd> preguntas" : ""} · <kbd>M</kbd> espejo · <kbd>F</kbd> pantalla completa · <kbd>Esc</kbd> pausa / salir</div>`;
    }
    function camSettingsHtml() {
      return `<div class="tp-seg" role="radiogroup" aria-label="Cómo se ve la cámara">${[["bg", "Al fondo"], ["corner", "Esquina"], ["off", "Oculta"]].map(([k, n]) => `<button type="button" role="radio" aria-checked="${camView === k}" data-a="camview" data-v="${k}">${n}</button>`).join("")}</div>
        <div class="tp-f tp-camo" style="border:0;padding-bottom:0"><label for="camo"><span>Transparencia de la cámara</span><output id="camoo">${camO}%</output></label><input id="camo" type="range" min="10" max="90" step="5" value="${camO}" data-set="camo"></div>
        <button class="tp-act" type="button" data-a="camflip">${icon("refresh")}<span>Girar cámara</span></button>`;
    }
    // el estado de la camara cambia (pidiendo permiso, lista, no disponible): se actualizan atributos, no se rearma nada
    function renderSettingsCam() {
      const usable = cam.st === "on" && wantCam;
      setEl.querySelectorAll('[data-a="camview"]').forEach((b) => { b.disabled = !usable; });
      const co = setEl.querySelector(".tp-camo"); if (co) co.hidden = !(usable && camView === "bg");
      const fl = setEl.querySelector('[data-a="camflip"]'); if (fl) { fl.hidden = !(usable && cam.multi); fl.disabled = recState !== "off"; }
    }
    function syncSettings() {
      const set = (id, v, out) => { const i = setEl.querySelector("#" + id), o_ = setEl.querySelector("#" + id + "o"); if (i && +i.value !== v) i.value = v; if (i) i.style.setProperty("--v", fillPct(v, +i.min, +i.max) + "%"); if (o_) o_.textContent = out; };
      set("wpm", wpm, wpm + " pal/min"); set("sec", sec, sec + " s"); set("fs", mode === "script" ? fsS : fsQ, (mode === "script" ? fsS : fsQ) + " px"); set("w", widthPct, widthPct + "%"); set("camo", camO, camO + "%");
      const m = setEl.querySelector('[data-a="mirror"]'); if (m) m.setAttribute("aria-checked", String(mirror));
      setEl.querySelectorAll('[data-a="camview"]').forEach((b) => b.setAttribute("aria-checked", String(b.dataset.v === camView))); renderSettingsCam();
      if (mode === "interview") { refreshDock(); } paintStat();
    }
    function toggleSettings(force) {
      const open_ = typeof force === "boolean" ? force : !setOpen; if (open_ === setOpen) return;
      setOpen = open_; root.classList.toggle("set-open", open_); setEl.hidden = !open_; settingsBtn.setAttribute("aria-expanded", String(open_));
      if (open_) { if (!setEl.firstChild) setEl.innerHTML = settingsHtml(); renderSettingsCam(); syncSettings(); wake(); const f = setEl.querySelector("input"); if (f && kbd) try { f.focus({ preventScroll: true }); } catch (e) { /* ok */ } }
      else { try { if (!closing && kbd && root.contains(document.activeElement) && setEl.contains(document.activeElement)) settingsBtn.focus({ preventScroll: true }); } catch (e) { /* ok */ } }
    }
    function toggleFs() {
      if (document.fullscreenElement) { exitFs(); fsEntered = false; try { document.exitFullscreen(); } catch (e) { /* ok */ } return; }
      try { const fn = root.requestFullscreen || root.webkitRequestFullscreen; if (fn) { const pr = fn.call(root); fsEntered = true; if (pr && pr.catch) pr.catch(() => { fsEntered = false; App.toast("Este navegador no deja usar pantalla completa acá."); }); } else App.toast("Este navegador no deja usar pantalla completa."); } catch (e) { App.toast("Este navegador no deja usar pantalla completa."); }
    }

    // ================= eventos =================
    const acts = {
      close: () => requestClose(), settings: () => toggleSettings(), play: () => togglePlay(), restart: () => restart(), minus: () => adj(-1), plus: () => adj(1),
      prev: () => { if (phase === "run" || phase === "pause") { const b = iv.beat ? iv.target : iv.i; goQ(b - 1, b === 0 ? "De nuevo" : "Anterior"); } },
      next: () => { if (phase === "run" || phase === "pause") { const b = iv.beat ? iv.target : iv.i; if (b >= questions.length - 1) askFinish(); else goQ(b + 1, "Siguiente"); } },
      finish: () => askFinish(), cancelcount: () => cancelCount(), camtoggle: () => camToggle(), camflip: () => camFlip(), fs: () => toggleFs(),
      mirror: () => setMirror(!mirror), camview: (b) => setCamView(b.dataset.v), view: () => showPreview(), dl: () => download(), again: () => again(), ok: () => shutdown("ok"),
    };
    on(root, "click", (e) => {
      const d = e.target.closest("[data-d]"); if (d && dlg) { closeDlg(d.dataset.d); return; }
      const b = e.target.closest("[data-a]"); if (!b || !root.contains(b) || b.disabled) return;
      wake(); const f = acts[b.dataset.a]; if (f) f(b, e);
      // con el mouse o el dedo el foco no se queda en el boton: Espacio siempre es empezar/pausar, no "repetir el ultimo boton"
      if (!kbd && !dlg && !closing && b.matches("button") && root.contains(document.activeElement) && document.activeElement !== root && !$q(".tp-end")) { try { root.focus({ preventScroll: true }); } catch (er) { /* ok */ } }
    });
    on(window, "pointerdown", () => { kbd = false; }, true);
    on(setEl, "input", (e) => {
      const t = e.target.closest("[data-set]"); if (!t) return; const v = +t.value;
      ({ wpm: setWpm, sec: setSec, fs: setFs, w: setWidth, camo: setCamO })[t.dataset.set](v);
    });
    // teclado: el teleprompter es modal; nada de lo que se aprieta aqui debe llegar a los atajos de la app (⌘K de Jarvis, A/R de la revision, el editor...)
    on(window, "keydown", (e) => {
      if (closing) return;
      e.stopPropagation();
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      kbd = true;
      const k = e.key, t = e.target, onBtn = !!(t && t.closest && t.closest("button")), onRange = !!(t && t.matches && t.matches('input[type="range"]'));
      wake();
      if (k === "Tab") {
        const scope = dlg ? dlg.el : root, fo = Array.from(scope.querySelectorAll("button, input, [tabindex]:not([tabindex='-1'])")).filter((n) => !n.disabled && !n.closest("[hidden]") && n.getClientRects().length);
        if (!fo.length) { e.preventDefault(); return; }
        const i = fo.indexOf(document.activeElement);
        if (e.shiftKey && (i <= 0)) { e.preventDefault(); fo[fo.length - 1].focus(); } else if (!e.shiftKey && (i === fo.length - 1 || i < 0)) { e.preventDefault(); fo[0].focus(); }
        return;
      }
      if (k === "Escape") { e.preventDefault(); onEscape(); return; }
      if (dlg) return;   // con una pregunta abierta solo valen Tab, Esc y los botones
      if ((k === " " || k === "Spacebar" || k === "Enter") && !onBtn) { e.preventDefault(); if (phase === "done") return; togglePlay(); return; }
      if (k === "k" || k === "K") { e.preventDefault(); togglePlay(); return; }
      if (phase === "done") return;
      if (k === "+" || k === "=") { e.preventDefault(); adj(1); return; }
      if (k === "-" || k === "_") { e.preventDefault(); adj(-1); return; }
      if (k === "m" || k === "M") { e.preventDefault(); setMirror(!mirror); return; }
      if (k === "f" || k === "F") { e.preventDefault(); toggleFs(); return; }
      if (k === "Home") { e.preventDefault(); restart(); return; }
      if (onRange) return;   // las flechas del control deslizante son suyas
      if (mode === "script") {
        if (k === "ArrowUp" || k === "ArrowDown") { e.preventDefault(); if (phase === "run") adj(k === "ArrowUp" ? 1 : -1); else nudge((k === "ArrowDown" ? 1 : -1) * lh); return; }
        if (k === "PageUp" || k === "PageDown") { e.preventDefault(); nudge((k === "PageDown" ? 1 : -1) * view.clientHeight * 0.7); return; }
        if (k === "ArrowLeft" || k === "ArrowRight") { e.preventDefault(); if (phase === "run" || phase === "pause") setPos(pos + (k === "ArrowRight" ? 1 : -1) * pxs * 5); return; }
      } else {
        if (k === "ArrowLeft") { e.preventDefault(); acts.prev(); return; }
        if (k === "ArrowRight") { e.preventDefault(); acts.next(); return; }
        if (k === "ArrowUp") { e.preventDefault(); adj(1); return; }
        if (k === "ArrowDown") { e.preventDefault(); adj(-1); return; }
      }
    }, true);
    function onEscape() {
      if (dlg) { closeDlg("cancel"); return; }
      if (setOpen) { toggleSettings(false); return; }
      if (phase === "count") { cancelCount(); return; }
      if (phase === "run") { pause(); return; }
      if (phase === "done") return;
      requestClose();
    }
    // tocar el texto: leyendo = pausa, en pausa = sigue; arrastrar con el dedo (o la rueda) mueve el texto mientras esta en pausa
    let drag = null;
    on(view, "pointerdown", (e) => {
      if (e.button > 0) return; wake();
      drag = { y: e.clientY, p: pos, moved: false }; try { view.setPointerCapture(e.pointerId); } catch (er) { /* ok */ }
    });
    on(view, "pointermove", (e) => {
      wake(); if (!drag) return; const dy = e.clientY - drag.y;
      if (!drag.moved && Math.abs(dy) > 6) drag.moved = true;
      if (drag.moved && mode === "script" && (phase === "pause" || phase === "ready")) setPos(drag.p - dy);
    });
    const endDrag = (e) => {
      if (!drag) return; const d = drag; drag = null; try { view.releasePointerCapture(e.pointerId); } catch (er) { /* ok */ }
      if (d.moved || e.type !== "pointerup" || dlg) return;
      if (setOpen) { toggleSettings(false); return; }
      if (phase === "run") pause(); else if (phase === "pause") resume();
    };
    on(view, "pointerup", endDrag); on(view, "pointercancel", endDrag);
    on(view, "wheel", (e) => { if (mode === "script" && (phase === "pause" || phase === "ready")) { e.preventDefault(); setPos(pos + e.deltaY); } }, { passive: false });
    on(root, "pointermove", wake, { passive: true }); on(root, "pointerdown", wake, { passive: true }); on(root, "focusin", wake);
    on(root, "contextmenu", (e) => { if (e.target.closest(".tp-view")) e.preventDefault(); });
    on(document, "visibilitychange", () => { if (document.hidden && phase === "run") pause(); });
    on(document, "fullscreenchange", () => { if (!document.fullscreenElement && fsEntered) { fsEntered = false; if (phase === "run") pause(); } });
    if (window.ResizeObserver) { const rz = new ResizeObserver(App.debounce(() => { if (!closing) layout(); }, 120)); rz.observe(view); offs.push(() => rz.disconnect()); } else on(window, "resize", App.debounce(() => { if (!closing) layout(); }, 120));

    // ================= arranque =================
    const api = {
      root, shutdown, prevFocus, state() {
        return { open: !closing, mode, phase, pos, maxPos, wpm, sec, pxPerSec: pxs, words, fontSize: mode === "script" ? fsS : fsQ, widthPct, mirror, camera: wantCam ? cam.st : "off", cameraWhy: cam.why, recording: recState, recMs: Math.round(recMs()), question: iv.i, questions: questions.length, uiHidden: uiOff, mime };
      },
      _cmd: { start, pause, resume, finish, goQ, setWpm, setSec, setFs, setMirror },
    };
    host.appendChild(root);
    inerted = lockApp(host, root);
    layout();
    if (mode === "interview") { renderQ(false); }
    paintStat(); refreshDock(); paintCam(); recLabel();
    const first = playBtn.disabled ? root : playBtn; try { first.focus({ preventScroll: true }); } catch (e) { /* ok */ }   // sin contenido el foco queda en la pantalla: Espacio no cierra nada
    say(mode === "interview" ? "Entrevista lista. " + questions.length + " preguntas." : "Teleprompter listo.");
    if (!hasContent) camSet("off"); else if (wantCam) camStart("user"); else camSet("off");
    return api;
  }

  App.teleprompter = {
    open(o) {
      const keepFocus = cur && cur.prevFocus;   // el foco vuelve a donde estaba ANTES del primero, no a un boton del que se va
      if (cur) cur.shutdown("replace");   // solo una a la vez: la anterior entrega su resultado y se va
      cur = create(Object.assign({}, o || {}, { _prevFocus: keepFocus || null })); return cur;
    },
    close() { if (cur) return cur.shutdown("api"); return Promise.resolve(); },
    isOpen: () => !!cur && !!cur.root && cur.state().open,
    state: () => (cur ? cur.state() : { open: false }),
    _pickMime: pickMime,
    _cmd: (name, ...a) => cur && cur._cmd[name] && cur._cmd[name](...a),
  };
})();
