/* Aura · movimiento. La firma: el orbe se estira como una gota liquida, vuela con cola (filtro SVG "goo"),
   aterriza, hace una pausa breve (el golpe ya asento, lo que sigue es SU consecuencia) y esa misma
   sustancia se derrama para revelar lo que sigue. Nunca un circulo geometrico aparte, nunca un
   crossfade: todo seam necesita un carrier que el ojo pueda seguir, y la gota es el carrier en los
   cuatro casos (abrir, cerrar, navegar, presentar) — un solo lenguaje de movimiento, no tres.
   Todo es transform/opacity/clip-path (se compone en la GPU); el area del filtro goo se acota al
   rectangulo real del vuelo, no al viewport entero. Con "reducir movimiento": fundido simple, sin cola.
   Ver motion-doctrine (skills-para-la-nube) para el vocabulario: carrier, causa, quietud antes del climax. */
(function () {
  "use strict";
  const App = window.App;
  const OUT = "cubic-bezier(.16,1,.3,1)", IN = "cubic-bezier(.55,0,.85,.35)";
  const SPRING = "linear(0, .25 7.5%, .64 16%, .95 26%, 1.07 36%, 1.08 44%, 1.02 58%, .995 72%, 1)";
  const spring = (() => { try { return CSS.supports("transition-timing-function", SPRING) ? SPRING : OUT; } catch (e) { return OUT; } })();
  const rectOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
  const center = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
  const layer = () => document.getElementById("morph");
  const ORB_BG = "radial-gradient(circle at 32% 26%, rgba(255,255,255,.95), rgba(255,255,255,0) 22%), radial-gradient(circle at 70% 75%, rgba(255,173,133,.95), rgba(255,173,133,0) 45%), radial-gradient(circle at 25% 70%, rgba(169,230,211,.95), rgba(169,230,211,0) 50%), conic-gradient(from 200deg at 50% 50%, #0f6b6c, #6fd1c0, #ffd0a8, #ff9a76, #f7a6bd, #0f6b6c)";
  const clean = () => { const L = layer(); if (L) L.innerHTML = ""; };
  // Modo liviano: mientras algo grande se mueve encima de la pantalla (Jarvis abriendo, abierto, cerrando o llevando a otro lugar) el vidrio de
  // abajo deja de desenfocar el fondo (backdrop-filter). Es lo MAS caro de repintar en cada cuadro --medido: sin eso, abrir Jarvis pasa de ~150 ms
  // por cuadro a ~50 ms en un navegador sin GPU-- y el velo ya tapa lo que hay debajo, asi que no se nota. Se activa con una clase en #aura-root
  // (ver shell.css). Cada dueño (key) lo pide y lo suelta; las transiciones cortas traen un ttl por si algo se interrumpe y no lo suelta.
  const liteKeys = new Set(), liteT = {};
  function lite(key, on, ttl) {
    const r = document.getElementById("aura-root"); if (!r) return;
    clearTimeout(liteT[key]);
    if (on) { liteKeys.add(key); if (ttl) liteT[key] = setTimeout(() => lite(key, false), ttl); } else liteKeys.delete(key);
    r.classList.toggle("mo", liteKeys.size > 0);
  }

  // curva cubic-bezier(x1,y1,x2,y2) evaluada igual que WAAPI: sirve para muestrear la trayectoria de la gota y calcular donde queda su estela
  function bez(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t;
    return (x) => { if (x <= 0) return 0; if (x >= 1) return 1; let lo = 0, hi = 1, t = x; for (let i = 0; i < 24; i++) { const v = X(t); if (Math.abs(v - x) < 1e-5) break; if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; } return Y(t); };
  }
  const FLY_EASE = bez(0.45, 0, 0.2, 1), FLY_KEYS = [[0, 0], [0.12, -0.03], [0.52, 0.55], [0.8, 1], [1, 1]]; // [offset, avance a lo largo de la linea]
  function flyPath(u) { // avance 0..1 de la gota en el instante u (0..1 de la duracion): primero la curva de tiempo, despues los puntos clave
    const q = FLY_EASE(u);
    for (let i = 1; i < FLY_KEYS.length; i++) { const [b, pb] = FLY_KEYS[i], [a, pa] = FLY_KEYS[i - 1]; if (q <= b) return pa + (pb - pa) * ((q - a) / (b - a || 1)); }
    return 1;
  }

  // una gota de diametro "s" vuela de a (centro) a b (centro), se estira en la direccion del viaje y aplasta al llegar.
  // con o.spread: despues del aplaste hace una pausa breve y se derrama (crece y se disuelve) en vez de solo
  // desvanecerse — es lo que bloom() necesita para que el panel no "aparezca": la misma gota es la que lo trae.
  // El filtro "goo" (lo que une la gota y su estela como un liquido) es lo MAS caro del vuelo, y recalcula toda su caja en cada cuadro. Antes la caja
  // cubria todo el recorrido (miles de px cuadrados); ahora es una caja chica centrada en la gota que VIAJA con ella (solo transform, que se compone en
  // la GPU): el filtro vive sobre ~500x500 px en vez de sobre el rectangulo entero del vuelo. La estela son tres gotas menores que se quedan atras segun la
  // velocidad de la principal (mas atras cuanto mas rapido va) y se reabsorben al frenar: se calculan muestreando la misma curva del viaje.
  function fly(from, to, o) {
    o = o || {};
    return new Promise((resolve) => {
      const L = layer(); if (!L || App.reduceMotion()) { resolve(); return; }
      L.innerHTML = ""; const goo = document.createElement("div"); goo.className = "gooed"; L.appendChild(goo);
      const s = o.size || 64, end = o.endSize || s, K = end / s, dx = to.x - from.x, dy = to.y - from.y, dist = Math.hypot(dx, dy), ang = (Math.atan2(dy, dx) * 180) / Math.PI, ux = dist ? dx / dist : 1, uy = dist ? dy / dist : 0;
      const ms = o.ms || Math.max(520, Math.min(820, 420 + dist * 0.45));
      const spreadK = o.spread ? Math.max(K, 1) * 3.4 : K, lagMax = Math.min(dist * 0.3, 110);
      const HB = Math.ceil(Math.max((s * spreadK) / 2 + 24, (s * 1.9 * Math.max(K, 1)) / 2 + lagMax + 36)); // mitad de la caja: aguanta el derrame final y la estela
      Object.assign(goo.style, { left: from.x - HB + "px", top: from.y - HB + "px", width: HB * 2 + "px", height: HB * 2 + "px" });
      const mk = (size, bg) => { const d = document.createElement("div"); d.className = "drop"; Object.assign(d.style, { width: size + "px", height: size + "px", left: "0px", top: "0px", background: bg || ORB_BG }); goo.appendChild(d); return d; };
      const at = (size, off, rot, sx, sy) => `translate(${(HB - size / 2 - ux * off).toFixed(1)}px, ${(HB - size / 2 - uy * off).toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
      const k = (p) => 1 + (K - 1) * p; // el tamano crece/decrece en el camino
      // el viaje lo hace la caja entera (compositor); la cabeza solo se deforma adentro
      goo.animate(FLY_KEYS.map(([off, p]) => ({ transform: `translate(${(dx * p).toFixed(1)}px, ${(dy * p).toFixed(1)}px)`, offset: off })), { duration: ms, easing: "cubic-bezier(.45,0,.2,1)", fill: "forwards" });
      const main = mk(s);
      const anim = main.animate([
        { transform: at(s, 0, ang, 1, 1), offset: 0 },
        { transform: at(s, 0, ang, 0.82, 1.14), offset: 0.12 },                  // se encoge un poco antes de saltar (anticipacion)
        { transform: at(s, 0, ang, 1.85 * k(0.5), 0.66 * k(0.5)), offset: 0.52 }, // se estira en vuelo
        { transform: at(s, 0, ang, 0.8 * K, 1.22 * K), offset: 0.8 },             // aplaste al aterrizar
        { transform: at(s, 0, ang, K, K), offset: 1 },
      ], { duration: ms, easing: "cubic-bezier(.45,0,.2,1)", fill: "forwards" });
      // estela: velocidad de la cabeza en cada instante -> cuanto se queda atras cada gota (en reposo se funde con la principal)
      const N = 16, sp = [];
      for (let i = 0; i < N; i++) { const u = i / (N - 1), h = 0.02; sp.push(Math.max(0, (flyPath(Math.min(1, u + h)) - flyPath(Math.max(0, u - h))) / (2 * h))); }
      const vmax = Math.max(...sp, 1e-6);
      [[0.62, 1], [0.44, 0.68], [0.3, 0.42]].forEach(([f, lag], idx) => {
        const t = mk(s * f), sz = s * f;
        t.animate(sp.map((v, i) => { const u = i / (N - 1), off = lagMax * lag * Math.pow(v / vmax, 0.9), sc = 1.25 - 0.95 * u; return { transform: at(sz, off, ang, Math.max(0.3, sc) * (1 + 0.5 * (v / vmax)), Math.max(0.3, sc) * (1 - 0.25 * (v / vmax))), opacity: u > 0.82 ? 1 - (u - 0.82) / 0.18 : 1, offset: u }; }), { duration: ms * (0.96 - idx * 0.02), easing: "linear", fill: "forwards" });
      });
      if (o.onLand) setTimeout(o.onLand, ms * 0.78);
      anim.finished.then(() => {
        if (!o.spread) { resolve(main); return; }
        // la quietud antes del climax: el golpe ya asento; el derrame es SU consecuencia, no algo a la vez
        setTimeout(() => {
          main.animate([{ transform: at(s, 0, ang, K, K), offset: 0 }, { transform: at(s, 0, ang, spreadK, spreadK), opacity: 0, offset: 1 }], { duration: o.spreadMs || 440, easing: OUT, fill: "forwards" });
          resolve(main);
        }, 90);
      }, () => resolve(main));
    });
  }

  // el panel florece desde el punto de aterrizaje: el clip-path rebasa un poco su tamano final y vuelve
  // (tension superficial asentandose), nunca un circulo que solo crece parejo. Mientras tanto la gota
  // recien aterrizada se sigue derramando ahi mismo (fly con o.spread) asi el borde que el ojo sigue
  // es siempre organico, no una geometria perfecta — nunca un circulo "flotando" solo.
  function bloom(panel, at, ms) {
    ms = ms || 680;
    const r = rectOf(panel), x = at.x - r.x, y = at.y - r.y, R = Math.hypot(Math.max(x, r.w - x), Math.max(y, r.h - y)) + 4;
    // clip-path animado junto con backdrop-filter activo recalcula el desenfoque del fondo en cada
    // cuadro del crecimiento: el combo mas caro posible para una animacion tan rapida. El vidrio vuelve
    // solo despues, cuando el panel ya esta quieto.
    const had = panel.style.backdropFilter, hadWk = panel.style.webkitBackdropFilter;
    panel.style.backdropFilter = "none"; panel.style.webkitBackdropFilter = "none";
    const anim = panel.animate([
      { clipPath: `circle(16px at ${x}px ${y}px)`, opacity: 0.94, offset: 0 },
      { clipPath: `circle(${(R * 1.05).toFixed(1)}px at ${x}px ${y}px)`, opacity: 1, offset: 0.82 }, // rebasa
      { clipPath: `circle(${R}px at ${x}px ${y}px)`, opacity: 1, offset: 1 },
    ], { duration: ms, easing: spring, fill: "both" });
    // al terminar se suelta el recorte (si no, la sombra grande del panel queda cortada en un circulo) y vuelve el vidrio
    return anim.finished.catch(() => {}).then(() => { try { anim.cancel(); } catch (e) { /* ya cancelada */ } panel.style.backdropFilter = had; panel.style.webkitBackdropFilter = hadWk; });
  }
  function wilt(panel, at, ms) {
    ms = ms || 360;
    const r = rectOf(panel), x = at.x - r.x, y = at.y - r.y, R = Math.hypot(Math.max(x, r.w - x), Math.max(y, r.h - y)) + 4;
    const had = panel.style.backdropFilter, hadWk = panel.style.webkitBackdropFilter;
    panel.style.backdropFilter = "none"; panel.style.webkitBackdropFilter = "none";
    // el panel se recoge hasta un punto y se desvanece justo ahi, donde empieza la gota que lo lleva: si se quedara un punto de vidrio (como antes,
    // opacity .85 con fill forwards, que ademas gana a cualquier opacity inline) se veria una bolita blanca clavada mientras la gota ya viaja
    return panel.animate([{ clipPath: `circle(${R}px at ${x}px ${y}px)`, opacity: 1, offset: 0 }, { clipPath: `circle(14px at ${x}px ${y}px)`, opacity: 0.9, offset: 0.84 }, { clipPath: `circle(14px at ${x}px ${y}px)`, opacity: 0, offset: 1 }], { duration: ms, easing: IN, fill: "forwards" }).finished.catch(() => {}).then(() => { panel.style.backdropFilter = had; panel.style.webkitBackdropFilter = hadWk; });
  }
  const pop = (el) => { if (el && el.animate) el.animate([{ transform: "scale(1)" }, { transform: "scale(1.22)" }, { transform: "scale(.96)" }, { transform: "scale(1)" }], { duration: 560, easing: spring }); };

  // ---------- Jarvis: el orbe se vuelve panel (y vuelve a serlo). Un solo lenguaje para los tres casos. ----------
  async function open(fromEl, wrap, panel) {
    lite("jv", true); wrap.classList.add("open");
    if (App.reduceMotion() || !fromEl) { wrap.classList.add("in", "shown"); panel.style.opacity = 1; return; }
    const a = rectOf(fromEl), pc = { x: 0, y: 0 };
    panel.style.opacity = 0; wrap.classList.add("in"); // el velo se aclara mientras la gota viaja
    const b = rectOf(panel); pc.x = b.x + b.w / 2; pc.y = b.y + Math.min(b.h * 0.42, 150);
    fromEl.style.visibility = "hidden";
    const land = { x: pc.x, y: pc.y };
    await fly(center(a), land, { size: Math.min(a.w, a.h), endSize: Math.min(150, b.w * 0.24), spread: true, onLand: () => { panel.style.opacity = 1; wrap.classList.add("shown"); bloom(panel, land, 680); } });
    setTimeout(clean, 480); // le da tiempo al derrame (fly con spread) a terminar de disolverse antes de limpiar la capa
    open._land = land;
  }
  async function close(fromEl, wrap, panel) {
    const el = fromEl && fromEl.isConnected && fromEl.offsetParent !== null ? fromEl : App.$$(".orb[data-orb]").find((e) => e.offsetParent !== null);
    if (App.reduceMotion() || !el) { wrap.classList.remove("in", "open", "shown"); panel.style.opacity = ""; if (el) el.style.visibility = ""; lite("jv", false); return; }
    const r = rectOf(panel), o = rectOf(el), oc = center(o), pc = { x: Math.max(r.x + 30, Math.min(r.x + r.w - 30, oc.x)), y: Math.max(r.y + 30, Math.min(r.y + r.h - 30, oc.y)) };
    wrap.classList.remove("shown");
    await wilt(panel, pc, 340);
    wrap.classList.remove("in"); panel.style.opacity = 0;
    await fly(pc, oc, { size: 46, endSize: Math.min(o.w, o.h), ms: 560 });
    el.style.visibility = ""; pop(el); wrap.classList.remove("open"); panel.style.opacity = ""; panel.getAnimations().forEach((x) => x.cancel()); clean(); lite("jv", false);
  }
  // la gota viaja hasta un destino y ahi florece lo que sigue (Jarvis navegando, presentando algo, o abriendo el chat
  // en un lugar nuevo): SIEMPRE el mismo fly+derrame que open(), nunca un fundido de pantalla aparte corriendo en paralelo.
  // target es el elemento que se revela en el punto de aterrizaje (bloom se encarga; si no hay target, solo limpia).
  async function travel(fromEl, toPoint, o, target) {
    if (App.reduceMotion() || !fromEl) return;
    o = o || {};
    const a = rectOf(fromEl), keep = fromEl.style.visibility; fromEl.style.visibility = "hidden";
    const onLand = o.onLand;
    await fly(center(a), toPoint, Object.assign({ size: Math.min(a.w, a.h), endSize: 90, spread: !!target }, o, {
      onLand: () => { if (onLand) onLand(); if (target) bloom(target, toPoint, o.bloomMs || 620); },
    }));
    fromEl.style.visibility = keep;
    setTimeout(clean, target ? 480 : 160);
  }

  // una nube/pantalla que "nace" en el orbe de Jarvis: la gota vuela desde el orbe hasta donde va a quedar y ahi florece (mismo fly + bloom
  // que abrir Jarvis, DECISIONES.md #10 y #12). Mientras vuela el elemento espera invisible (.arr-pre); al aterrizar queda .arr-in.
  // No hace nada con "reducir movimiento" ni si Jarvis ya esta llevando a la persona hasta aca (App._morphNav): ese florecido ya lo hizo el.
  function arrive(el, o) {
    o = o || {};
    if (!el || App.reduceMotion() || App._morphNav) return false;
    const orb = App.$$(".orb[data-orb]").find((e) => e.offsetParent), b = rectOf(el), ob = orb && rectOf(orb);
    const land = { x: b.x + b.w / 2, y: b.y + Math.min(b.h * 0.42, 150) }, from = orb ? center(ob) : { x: innerWidth - 56, y: innerHeight - 56 };
    el.classList.add("arr-pre"); lite("arr", true, 2600);
    let done = false;
    const reveal = () => { if (done || !el.isConnected) return; done = true; el.classList.remove("arr-pre"); el.classList.add("arr-in"); bloom(el, land, o.ms || 760); };
    fly(from, land, { size: ob ? Math.min(ob.w, ob.h, 64) : 56, endSize: o.endSize || 130, spread: true, onLand: reveal }).then(() => { reveal(); setTimeout(clean, 520); });
    setTimeout(reveal, 1700); // por si el vuelo no llega a avisar: nunca queda invisible
    return true;
  }

  // View Transition con elemento compartido (tarjeta -> pantalla)
  function view(update, sharedFrom) {
    if (!document.startViewTransition || App.reduceMotion()) { update(); return Promise.resolve(); }
    if (sharedFrom) sharedFrom.style.viewTransitionName = "shared";
    const t = document.startViewTransition(() => { if (sharedFrom) sharedFrom.style.viewTransitionName = ""; update(); const tgt = document.querySelector("[data-shared-target]"); if (tgt && sharedFrom) tgt.style.viewTransitionName = "shared"; });
    return t.finished.catch(() => {}).finally(() => { const tgt = document.querySelector("[data-shared-target]"); if (tgt) tgt.style.viewTransitionName = ""; });
  }

  // destellos (logros, terminar de aprobar)
  function sparkles(host, n) {
    if (App.reduceMotion() || !host) return;
    for (let i = 0; i < (n || 4); i++) {
      const s = document.createElement("i"), ang = (Math.PI * 2 * i) / (n || 4) + 0.5, d = 60 + Math.random() * 34;
      s.style.cssText = "position:absolute;left:50%;top:50%;width:10px;height:10px;margin:-5px;border-radius:50%;background:var(--apricot);box-shadow:0 0 14px var(--apricot);pointer-events:none;z-index:3";
      host.appendChild(s);
      s.animate([{ transform: "translate(0,0) scale(.2)", opacity: 1 }, { transform: `translate(${Math.cos(ang) * d}px,${Math.sin(ang) * d}px) scale(1)`, opacity: 0 }], { duration: 900, delay: 300 + i * 60, easing: OUT, fill: "both" }).finished.then(() => s.remove(), () => s.remove());
    }
    try { navigator.vibrate && navigator.vibrate(18); } catch (e) { /* sin vibracion */ }
  }
  // confeti de celebracion (DECISIONES.md #1): una rafaga de papelitos en los colores de la marca que sale de donde cae la medalla,
  // sube desacelerando, se abre y cae acelerando (gravedad en dos tramos, no una curva unica). Solo transform/opacity (GPU).
  // Con "reducir movimiento" no hay confeti: la felicitacion y la frase siguen ahi.
  function confetti(host, n) {
    if (App.reduceMotion() || !host) return;
    const L = document.createElement("div"); L.className = "confeti"; L.setAttribute("aria-hidden", "true");
    L.style.cssText = "position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:6";
    host.appendChild(L);
    const W = host.clientWidth || innerWidth, H = host.clientHeight || innerHeight, ox = W / 2, oy = H * 0.42, total = n || 70;
    const COLORS = ["var(--apricot)", "var(--rose)", "var(--mint)", "var(--sand)", "var(--teal)", "#ffffff", "#ffcf6e"];
    let alive = total; const end = () => { if (--alive === 0) L.remove(); };
    for (let i = 0; i < total; i++) {
      const p = document.createElement("i"), w = 6 + Math.random() * 7, h = Math.random() < 0.4 ? w : w * 1.7;
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.3, v = 220 + Math.random() * 340, rot = (Math.random() - 0.5) * 900;
      const px = ox + Math.cos(ang) * v * 0.55, py = oy + Math.sin(ang) * v * 0.55;
      const ex = ox + Math.cos(ang) * v * 1.05 + (Math.random() - 0.5) * 120, ey = H + 40 + Math.random() * 60;
      p.style.cssText = `position:absolute;left:0;top:0;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;border-radius:${Math.random() < 0.35 ? "50%" : "2px"};background:${COLORS[i % COLORS.length]};opacity:0;will-change:transform,opacity`;
      L.appendChild(p);
      p.animate([
        { transform: `translate(${ox}px,${oy}px) rotate(0deg)`, opacity: 1, offset: 0, easing: "cubic-bezier(.15,.75,.35,1)" },
        { transform: `translate(${px.toFixed(1)}px,${py.toFixed(1)}px) rotate(${(rot * 0.4).toFixed(0)}deg)`, opacity: 1, offset: 0.32, easing: "cubic-bezier(.45,0,.85,.55)" },
        { transform: `translate(${ex.toFixed(1)}px,${ey.toFixed(1)}px) rotate(${rot.toFixed(0)}deg)`, opacity: 1, offset: 0.9 },
        { transform: `translate(${ex.toFixed(1)}px,${ey.toFixed(1)}px) rotate(${rot.toFixed(0)}deg)`, opacity: 0, offset: 1 },
      ], { duration: 1900 + Math.random() * 1300, delay: Math.random() * 260, easing: "linear", fill: "both" }).finished.then(end, end);
    }
  }
  App.morph = { open, close, travel, arrive, lite, fly, bloom, wilt, pop, view, sparkles, confetti, rectOf, center, spring, OUT, IN, clean };
})();
