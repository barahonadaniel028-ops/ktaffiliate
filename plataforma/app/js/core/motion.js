/* Aura · movimiento. La firma: el orbe se estira como una gota liquida, vuela con cola (filtro SVG "goo"), aterriza aplastandose y ESA
   misma sustancia se desparrama hasta tomar la forma del panel (y al cerrar se vuelve a juntar en una gota que regresa al orbe). Nunca un
   circulo geometrico que crece, nunca un crossfade: todo seam necesita un carrier que el ojo pueda seguir, y la gota es el carrier en todos
   los casos (abrir, cerrar, llevarte a otra pantalla, presentar algo, una nube que nace en el orbe) -- un solo lenguaje de movimiento.
   Ver motion-doctrine (skills-para-la-nube): carrier, causa (el aterrizaje ES lo que dispara el derrame) y DECISIONES.md #4, #15 y #17.

   Por que esta hecho asi (DECISIONES.md #17, "se ve cuadro por cuadro"):
   1. TODO se agenda en el mismo instante. Antes cada fase esperaba a la anterior (vuelo -> promesa -> setTimeout -> derrame -> clip-path):
      cada traspaso costaba uno o dos cuadros quietos y, si el hilo principal estaba ocupado pintando el panel, el derrame arrancaba tarde.
      Ahora vuelo, derrame, aparicion del contenido y limpieza se crean juntos con `delay` sobre el mismo reloj (WAAPI), asi que corren en el
      compositor aunque el hilo principal este trabado, y no hay ningun traspaso en JS en medio del movimiento.
   2. Solo transform y opacity (se componen en la GPU, sin repintar). El cuerpo liquido NO es un clip-path ni un border-radius animado (los dos
      repintan el panel entero en cada cuadro): es la union de 4 elipses (las esquinas) y 2 barras (la cruz) -- la suma de Minkowski de un
      rectangulo y una elipse -- y cada pieza solo se traslada y escala. Con radios = medio ancho/medio alto es una elipse (la gota); con los
      radios del panel, es el panel. Asi puede pasar por todas las formas intermedias (gota -> mancha ancha -> rectangulo redondeado que se
      asienta) sin repintar nada: cada pieza es de un solo color y se rasteriza una vez.
   3. La forma no es una curva de tiempo sino un resorte muestreado: el ancho y el alto son dos resortes desfasados (primero se abre a lo
      ancho -el aplaste del aterrizaje- y despues baja), con rebote, y las esquinas pasan de "todo redondo" a los radios del panel recien
      cuando ya casi lleno su lugar: eso es lo que se lee como liquido con tension superficial, no como una figura geometrica.
   4. El panel real espera invisible (se sube a su propia capa y se pinta ~150 ms antes de que la gota toque, no en el clic) y aparece
      DEBAJO del cuerpo, que es de su mismo color; el cuerpo se desvanece encima y el contenido sube escalonado. El panel ademas sigue el
      resorte del cuerpo (escala desde el punto de aterrizaje), asi el asentado se ve en el panel y no en una capa aparte.
   5. Nunca `fill: forwards` sobre el panel (ver resetJv/wilt): el estado final se deja en estilo inline.
   Con "reducir movimiento": fundido simple, sin vuelo ni cola. */
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
  // la tinta del orbe diluyendose en el cuerpo (bordes blandos: se lee como color que se difunde, no como otra bola)
  const GLOW_BG = "radial-gradient(closest-side, rgba(111,209,192,.9), rgba(255,173,133,.62) 50%, rgba(247,166,189,.25) 78%, rgba(247,166,189,0))";
  let parked = null; // la gota que dejo un wilt sin vuelo (Crear, entre pasos): el bloom siguiente la toma en el mismo cuadro
  function clean() { const L = layer(); if (L) L.innerHTML = ""; if (parked) { clearTimeout(parked.tm); parked = null; } }
  const after = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
  const settled = (a) => a.finished.then(() => {}, () => {});
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const smooth = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
  const fx = (v) => (Math.abs(v) < 0.005 ? "0" : v.toFixed(2));
  // [[t_ms, valor, easing?], ...] -> keyframes con offset (ordenados y dentro de 0..1) para una animacion de `total` ms. Siempre cierra en offset 1
  // con el ultimo valor: si falta, WAAPI inventa ese keyframe con el valor de base del elemento y la animacion "vuelve" sola al final.
  function keysAt(total, pts, prop) {
    let last = 0;
    const ks = pts.map(([t, v, e]) => { const off = Math.max(last, clamp01(total ? t / total : 0)); last = off; const k = { offset: off }; k[prop] = v; if (e) k.easing = e; return k; });
    if (last < 1) { const k = { offset: 1 }; k[prop] = ks[ks.length - 1][prop]; ks.push(k); }
    return ks;
  }

  // Modo liviano: mientras algo grande se mueve encima de la pantalla (Jarvis abriendo, abierto, cerrando o llevando a otro lugar) el vidrio de
  // abajo deja de desenfocar el fondo (backdrop-filter). Es lo MAS caro de repintar en cada cuadro --medido: sin eso, abrir Jarvis pasa de ~150 ms
  // por cuadro a ~50 ms en un navegador sin GPU-- y el velo ya tapa lo que hay debajo, asi que no se nota. Se activa con una clase en #aura-root
  // (ver shell.css). Cada dueño (key) lo pide y lo suelta; las transiciones cortas traen un ttl por si algo se interrumpe y no lo suelta.
  // Las claves "de velo" (Jarvis y la celebracion, que tapan la pantalla) ademas apagan el grano de pelicula (.grain): es una capa de pantalla
  // completa con mix-blend-mode que obliga a recomponer TODO lo de abajo en cada cuadro en que algo se mueve -- medido, es el segundo costo mas
  // grande del movimiento (DECISIONES.md #17) -- y bajo el velo no se ve.
  const liteKeys = new Set(), liteT = {}, VEIL_KEYS = new Set(["jv"]);
  function lite(key, on, ttl) {
    const r = document.getElementById("aura-root"); if (!r) return;
    clearTimeout(liteT[key]);
    if (on) { liteKeys.add(key); if (ttl) liteT[key] = setTimeout(() => lite(key, false), ttl); } else liteKeys.delete(key);
    r.classList.toggle("mo", liteKeys.size > 0);
    r.classList.toggle("mo-v", [...liteKeys].some((k) => VEIL_KEYS.has(k)));
  }

  // curva cubic-bezier(x1,y1,x2,y2) evaluada igual que WAAPI: sirve para muestrear la trayectoria de la gota y calcular donde queda su estela
  function bez(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t;
    return (x) => { if (x <= 0) return 0; if (x >= 1) return 1; let lo = 0, hi = 1, t = x; for (let i = 0; i < 24; i++) { const v = X(t); if (Math.abs(v - x) < 1e-5) break; if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; } return Y(t); };
  }
  const FLY_EASING = "cubic-bezier(.45,0,.2,1)", FLY_EASE = bez(0.45, 0, 0.2, 1), FLY_KEYS = [[0, 0], [0.12, -0.03], [0.52, 0.55], [0.8, 1], [1, 1]]; // [offset, avance a lo largo de la linea]
  function flyPath(u) { // avance 0..1 de la gota en el instante u (0..1 de la duracion): primero la curva de tiempo, despues los puntos clave
    const q = FLY_EASE(u);
    for (let i = 1; i < FLY_KEYS.length; i++) { const [b, pb] = FLY_KEYS[i], [a, pa] = FLY_KEYS[i - 1]; if (q <= b) return pa + (pb - pa) * ((q - a) / (b - a || 1)); }
    return 1;
  }
  // fraccion del vuelo en la que la gota TOCA destino (el aplaste, offset .8 de la curva): ahi, en ese mismo instante, empieza el derrame
  const FLY_TOUCH = (() => { let lo = 0, hi = 1; for (let i = 0; i < 32; i++) { const m = (lo + hi) / 2; if (FLY_EASE(m) < 0.8) lo = m; else hi = m; } return (lo + hi) / 2; })();

  // una gota de diametro "size" vuela de a (centro) a b (centro), se estira en la direccion del viaje y aplasta al llegar. Devuelve el plan
  // (ms, delay, touch = cuando toca destino, end) para que quien llama agende lo que sigue sobre el MISMO reloj en vez de esperar promesas.
  // o.delay: arranca mas tarde (la gota espera quieta en el origen; con o.fadeIn aparece en los ultimos ms de la espera -- asi un wilt le pasa
  // la posta sin hueco). o.spread: al tocar destino la gota se funde (el bloom de ahi la toma). o.keep: no borra lo que ya hay en la capa.
  // El filtro "goo" (lo que une la gota y su estela como un liquido) es lo MAS caro del vuelo, y recalcula toda su caja en cada cuadro: la caja es
  // chica, centrada en la gota, y VIAJA con ella (solo transform). La estela son tres gotas menores que se quedan atras segun la velocidad de la
  // principal (mas atras cuanto mas rapido va) y se reabsorben al frenar: se calculan muestreando la misma curva del viaje.
  function flight(from, to, o) {
    o = o || {};
    const dx = to.x - from.x, dy = to.y - from.y, dist = Math.hypot(dx, dy);
    const ms = o.ms || Math.max(480, Math.min(760, 400 + dist * 0.42)), delay = o.delay || 0;
    const plan = { ms, delay, touch: delay + ms * FLY_TOUCH, end: delay + ms, done: Promise.resolve(null) };
    const L = layer(); if (!L || App.reduceMotion()) return plan;
    if (!o.keep) clean();
    const goo = document.createElement("div"); goo.className = "gooed"; L.appendChild(goo);
    const s = o.size || 64, end = o.endSize || s, K = end / s, ang = (Math.atan2(dy, dx) * 180) / Math.PI, ux = dist ? dx / dist : 1, uy = dist ? dy / dist : 0;
    const lagMax = Math.min(dist * 0.3, 110);
    const HB = Math.ceil(Math.max((s * Math.max(K, 1) * 1.3) / 2 + 24, (s * 1.9 * Math.max(K, 1)) / 2 + lagMax + 36)); // mitad de la caja: aguanta el estiramiento y la estela
    Object.assign(goo.style, { left: from.x - HB + "px", top: from.y - HB + "px", width: HB * 2 + "px", height: HB * 2 + "px" });
    const mk = (size) => { const d = document.createElement("div"); d.className = "drop"; Object.assign(d.style, { width: size + "px", height: size + "px", left: "0px", top: "0px", background: ORB_BG }); goo.appendChild(d); return d; };
    const at = (size, off, rot, sx, sy) => `translate(${(HB - size / 2 - ux * off).toFixed(1)}px, ${(HB - size / 2 - uy * off).toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
    const k = (p) => 1 + (K - 1) * p; // el tamano crece/decrece en el camino
    const T = { duration: ms, delay, easing: FLY_EASING, fill: "both" }; // fill en elementos temporales de la capa (se borran al final), nunca en el panel
    // el viaje lo hace la caja entera (compositor); la cabeza solo se deforma adentro
    goo.animate(FLY_KEYS.map(([off, p]) => ({ transform: `translate(${(dx * p).toFixed(1)}px, ${(dy * p).toFixed(1)}px)`, offset: off })), T);
    const main = mk(s);
    const anim = main.animate([
      { transform: at(s, 0, ang, 1, 1), offset: 0 },
      { transform: at(s, 0, ang, 0.82, 1.14), offset: 0.12 },                  // se encoge un poco antes de saltar (anticipacion)
      { transform: at(s, 0, ang, 1.85 * k(0.5), 0.66 * k(0.5)), offset: 0.52 }, // se estira en vuelo
      { transform: at(s, 0, ang, 0.8 * K, 1.22 * K), offset: 0.8 },             // aplaste al aterrizar
      { transform: at(s, 0, ang, K, K), offset: 1 },
    ], T);
    // estela: velocidad de la cabeza en cada instante -> cuanto se queda atras cada gota (en reposo se funde con la principal)
    const N = 16, sp = [];
    for (let i = 0; i < N; i++) { const u = i / (N - 1), h = 0.02; sp.push(Math.max(0, (flyPath(Math.min(1, u + h)) - flyPath(Math.max(0, u - h))) / (2 * h))); }
    const vmax = Math.max(...sp, 1e-6);
    [[0.62, 1], [0.44, 0.68], [0.3, 0.42]].forEach(([f, lag], idx) => {
      const t = mk(s * f), sz = s * f;
      t.animate(sp.map((v, i) => { const u = i / (N - 1), off = lagMax * lag * Math.pow(v / vmax, 0.9), sc = 1.25 - 0.95 * u; return { transform: at(sz, off, ang, Math.max(0.3, sc) * (1 + 0.5 * (v / vmax)), Math.max(0.3, sc) * (1 - 0.25 * (v / vmax))), opacity: u > 0.82 ? 1 - (u - 0.82) / 0.18 : 1, offset: u }; }), { duration: ms * (0.96 - idx * 0.02), delay, easing: "linear", fill: "both" });
    });
    // aparecer y fundirse: la opacidad es de la caja filtrada entera (dentro del filtro goo una opacidad parcial "se come" la forma por el umbral
    // de alfa, en vez de transparentarla). Dos animaciones cortas y no una que dure todo el vuelo: solo existen en los ~100 ms en que hacen algo
    if (delay && o.fadeIn) goo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: o.fadeIn, delay: Math.max(0, delay - o.fadeIn), fill: "backwards" });
    if (o.spread) goo.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 80, delay: plan.touch, fill: "forwards" });
    if (o.onLand) setTimeout(() => { if (!(o.stale && o.stale())) o.onLand(); }, plan.touch);
    plan.el = goo;
    plan.done = settled(anim).then(() => { if (o.spread) setTimeout(() => goo.remove(), 60); return main; });
    return plan;
  }
  const fly = (from, to, o) => flight(from, to, o).done;

  // ---------- el cuerpo liquido ----------
  const solidColor = () => getComputedStyle(document.querySelector(".aura-app") || document.documentElement).getPropertyValue("--glass-solid").trim() || "#f7faf9";
  // de que color es la superficie que va a aparecer: si es opaca, el cuerpo es de ese mismo color (el traspaso cuerpo -> panel no se ve);
  // si es translucida (la nube de Notas, la pantalla entera al navegar) el cuerpo es vidrio que se evapora ("splash")
  function surfaceOf(el) {
    const c = getComputedStyle(el).backgroundColor, m = /^rgba?\(([^)]*)\)/.exec(c || "");
    if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean); if ((p.length > 3 ? parseFloat(p[3]) : 1) > 0.92) return { color: c, solid: true }; }
    return { color: solidColor(), solid: false };
  }
  function radiiOf(el, r) { // radio promedio de las esquinas redondeadas (las de radio 0, como el borde de abajo de la hoja del telefono, no cuentan)
    const cs = getComputedStyle(el); let sx = 0, sy = 0, n = 0;
    ["TopLeft", "TopRight", "BottomRight", "BottomLeft"].forEach((k) => {
      const v = String(cs["border" + k + "Radius"] || "0").trim().split(/\s+/), px = (s, base) => (/%$/.test(s) ? (parseFloat(s) / 100) * base : parseFloat(s) || 0);
      const h = px(v[0], r.w), vv = px(v[1] || v[0], r.h); if (h > 0.5 || vv > 0.5) { sx += h; sy += vv; n++; }
    });
    return n ? { rx: Math.min(sx / n, r.w / 2), ry: Math.min(sy / n, r.h / 2) } : { rx: 24, ry: 24 };
  }
  // si la superficie se sale de la pantalla (la hoja de abajo del telefono, la pantalla entera) el cuerpo se estira mas alla del borde para que
  // sus esquinas de ese lado queden fuera de cuadro (si no, se verian redondeadas donde el panel es recto)
  function fitView(r, rad) {
    let { x, y, w, h } = r; const W = innerWidth, H = innerHeight;
    if (y + h >= H - 1) h = H - y + rad.ry + 2;
    if (y < -1) { h += y + rad.ry + 2; y = -rad.ry - 2; }
    if (x < -1) { w += x + rad.rx + 2; x = -rad.rx - 2; }
    if (x + w > W + 1) w = W - x + rad.rx + 2;
    return { x, y, w: Math.max(w, 4), h: Math.max(h, 4) };
  }
  // el resorte (respuesta a un escalon, subamortiguado) que llega exacto a 1 al final de D: z = amortiguacion (menos = mas rebote),
  // at = fraccion de D en la que ya se asento, lag = retraso (fraccion de D). Los ultimos cuadros se funden con el reposo: sin salto final.
  function springFn(D, z, at, lag) {
    const w = 4.6 / (z * ((at * D) / 1000)), wd = w * Math.sqrt(1 - z * z);
    return (tms) => { const t = (tms - (lag || 0) * D) / 1000; const v = t <= 0 ? 0 : 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t)); return v + (1 - v) * smooth(0.84, 1, tms / D); };
  }
  // forma en un instante: bordes L R T B (coordenadas del grupo) y radios rx ry de las esquinas -> transform de cada pieza.
  // H y V = las dos barras de la cruz; S = la sombra (caja que envuelve todo); TL TR BL BR = las cuatro esquinas (elipses).
  function pieceT(kind, s, n) {
    const W = s.R - s.L, H = s.B - s.T; let x, y, sx, sy;
    if (kind === "H") { x = s.L; y = s.T + s.ry; sx = W / n.w; sy = (H - 2 * s.ry) / n.h; }
    else if (kind === "V") { x = s.L + s.rx; y = s.T; sx = (W - 2 * s.rx) / n.w; sy = H / n.h; }
    else if (kind === "S") { x = s.L + W * 0.04; y = s.T + H * 0.16; sx = (W * 0.92) / n.w; sy = (H * 0.96) / n.h; } // sombra blanda, corrida hacia abajo
    else { x = kind[1] === "L" ? s.L : s.R - 2 * s.rx; y = kind[0] === "T" ? s.T : s.B - 2 * s.ry; sx = (2 * s.rx) / n.w; sy = (2 * s.ry) / n.h; }
    return `translate(${fx(x)}px, ${fx(y)}px) scale(${Math.max(1e-4, sx).toFixed(5)}, ${Math.max(1e-4, sy).toFixed(5)})`;
  }
  function mkBody(rect, color, cw, ch, shadow) {
    const g = document.createElement("div"); g.className = "lq";
    Object.assign(g.style, { left: rect.x + "px", top: rect.y + "px", width: rect.w + "px", height: rect.h + "px" });
    const parts = [], add = (kind, w, h, cls) => { const e = document.createElement("i"); if (cls) e.className = cls; e.style.width = w + "px"; e.style.height = h + "px"; if (kind !== "S") e.style.background = color; g.appendChild(e); parts.push({ kind, e, n: { w, h } }); };
    if (shadow) add("S", 160, 120, "sh"); // un degradado blando: alcanza con rasterizarlo chico y estirarlo (no se nota y no ocupa una textura del tamano del panel)
    add("H", rect.w, rect.h); add("V", rect.w, rect.h);
    ["TL", "TR", "BL", "BR"].forEach((k) => add(k, cw, ch, "r"));
    const L = layer(), goo = L.querySelector(".gooed"); if (goo) L.insertBefore(g, goo); else L.appendChild(g); // la gota en vuelo siempre por encima
    return { g, parts };
  }
  function mkInk(g, cx, cy, r, bg) { const e = document.createElement("i"); e.className = "ink"; Object.assign(e.style, { width: 2 * r + "px", height: 2 * r + "px", left: cx - r + "px", top: cy - r + "px", background: bg }); g.appendChild(e); return e; }
  const cssMoved = (el) => el.getAnimations().some((a) => typeof CSSAnimation !== "undefined" && a instanceof CSSAnimation); // una nube que ya flota con su propia animacion no recibe el resorte (saltaria al final)

  // bloom: la gota que acaba de aterrizar en `at` se desparrama hasta ser `target` (y el target aparece debajo, ya en su lugar).
  // ms = duracion del cuerpo; o.delay = cuando empieza (el `touch` del vuelo: agendado, no esperado); o.r0 = radio de la gota que lo trae;
  // o.rect / o.splash / o.radius: superficie sin borde propio (la pantalla al navegar): el cuerpo es vidrio translucido que se evapora.
  // Devuelve una promesa (al terminar) con .reveal/.revealEnd/.end en ms desde ahora, para escalonar el contenido sobre el mismo reloj.
  function bloom(target, at, ms, o) {
    o = o || {}; ms = ms || 640;
    const delay = o.delay || 0;
    const plan = (p, rv, re, end) => Object.assign(p, { reveal: rv, revealEnd: re, end });
    if (App.reduceMotion() || !at || !layer()) {
      if (!target || !target.animate) return plan(Promise.resolve(), delay, delay, delay);
      return plan(settled(target.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay, easing: "ease-out", fill: "backwards" })), delay, delay + 200, delay + 200);
    }
    const rect0 = o.rect || (target ? rectOf(target) : null); if (!rect0) return plan(Promise.resolve(), delay, delay, delay);
    const surf = target && !o.splash ? surfaceOf(target) : { color: solidColor(), solid: false }, splash = !surf.solid;
    const rad = o.radius != null ? { rx: o.radius, ry: o.radius } : target ? radiiOf(target, rect0) : { rx: 40, ry: 40 };
    const rect = fitView(rect0, rad), rxF = Math.min(rad.rx, rect.w / 2), ryF = Math.min(rad.ry, rect.h / 2), lx = at.x - rect.x, ly = at.y - rect.y;
    let r0 = o.r0;
    if (parked && !delay && Math.hypot(parked.at.x - at.x, parked.at.y - at.y) < 48) { r0 = r0 || parked.r; clearTimeout(parked.tm); parked.g.remove(); parked = null; } // toma la gota que dejo el wilt, en el mismo cuadro
    r0 = r0 || 20;
    // dos resortes desfasados: primero se abre a lo ancho (sigue al aplaste del aterrizaje), despues baja; con rebote, que es el liquido
    const D = ms, N = Math.max(18, Math.min(48, Math.round(D / 14)));
    const sx = springFn(D, splash ? 0.78 : 0.6, 0.76, 0), sy = springFn(D, splash ? 0.8 : 0.66, 0.82, 0.03);
    const S = [], P = [], cx0 = rect0.w / 2, cy0 = rect0.h / 2, plx = at.x - rect0.x, ply = at.y - rect0.y;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * D, u = i / N, ax = sx(t), ay = sy(t);
      const Lb = (lx - r0) * (1 - ax), Rb = lx + r0 + (rect.w - lx - r0) * ax, Tb = (ly - r0) * (1 - ay), Bb = ly + r0 + (rect.h - ly - r0) * ay;
      const W = Rb - Lb, H = Bb - Tb, q = smooth(0.1, 0.58, u); // q: de "todo redondo" (gota/mancha) a las esquinas del panel
      S.push({ L: Lb, R: Rb, T: Tb, B: Bb, rx: Math.max(0, Math.min(W / 2, W / 2 + (rxF - W / 2) * q)), ry: Math.max(0, Math.min(H / 2, H / 2 + (ryF - H / 2) * q)) });
      // el panel real sigue la misma caja (con su propio tamano, que puede no ser el del cuerpo si este se estiro fuera de pantalla)
      const pl = (plx - r0) * (1 - ax), pr = plx + r0 + (rect0.w - plx - r0) * ax, pt = (ply - r0) * (1 - ay), pb = ply + r0 + (rect0.h - ply - r0) * ay;
      const ksx = Math.max(1e-3, (pr - pl) / rect0.w), ksy = Math.max(1e-3, (pb - pt) / rect0.h);
      P.push(`translate(${fx(pl - cx0 * (1 - ksx))}px, ${fx(pt - cy0 * (1 - ksy))}px) scale(${ksx.toFixed(5)}, ${ksy.toFixed(5)})`);
    }
    const cw = 2 * Math.max(rxF, r0, 8), ch = 2 * Math.max(ryF, r0, 8);
    const B = mkBody(rect, surf.color, cw, ch, !splash && o.shadow !== false);
    const opt = { duration: D, delay, easing: "linear", fill: "both" };
    B.parts.forEach((p) => p.e.animate(S.map((s) => ({ transform: pieceT(p.kind, s, p.n) })), opt));
    // la tinta del orbe: la gota de color queda un instante (la del vuelo se funde encima) y se diluye en el cuerpo
    const glow = mkInk(B.g, lx, ly, r0, GLOW_BG), ink = mkInk(B.g, lx, ly, r0, ORB_BG), gk = Math.max(2, (0.5 * Math.min(rect0.w, rect0.h, innerHeight)) / r0);
    glow.animate([{ transform: "scale(1)", opacity: 0.9 }, { transform: `scale(${gk.toFixed(2)})`, opacity: 0 }], { duration: D * 0.7, delay, easing: OUT, fill: "both" });
    ink.animate([{ transform: "scale(1)", opacity: 1 }, { transform: "scale(1.45)", opacity: 0 }], { duration: Math.min(240, D * 0.4), delay, easing: "cubic-bezier(.2,.6,.35,1)", fill: "both" }); // se funde, no crece como otra bola
    // el cuerpo aparece cuando la gota toca y se desvanece cuando el panel ya esta debajo; el contenido llega mientras la forma se asienta
    // (no despues: un panel en blanco quieto entre la forma y el contenido se lee como un corte)
    const total = delay + D, peak = splash ? o.peak || 0.72 : 1, fA = splash ? 0.3 : 0.4, fB = splash ? 0.96 : 0.8;
    const gA = B.g.animate(keysAt(total, [[0, 0], [delay, 0], [delay + 1, peak], [delay + fA * D, peak], [delay + fB * D, 0]], "opacity"), { duration: total, fill: "both" });
    const rv = delay + (splash ? 0.28 : 0.3) * D, re = delay + (splash ? 0.6 : 0.5) * D;
    if (target && !o.splash) {
      const keepOp = target.style.opacity, jelly = !splash && o.jelly !== false && !cssMoved(target);
      const base = jelly ? getComputedStyle(target).transform : "none", pre = base && base !== "none" ? base + " " : "";
      const mount = () => {
        if ((o.stale && o.stale()) || !target.isConnected) return; // otro turno ya tomo el panel (se cerro con la gota en el aire)
        target.style.opacity = keepOp;
        // sin fill forwards: al terminar manda el estilo propio del target (para el panel de Jarvis, opacity 1 inline)
        const a = [target.animate(keysAt(re, [[0, 0], [rv, 0, "cubic-bezier(.3,0,.2,1)"], [re, 1]], "opacity"), { duration: re })];
        if (jelly) a.push(target.animate(P.map((t) => ({ transform: pre + t })), { duration: D, delay, easing: "linear", fill: "backwards" }));
        if (gA.startTime != null) a.forEach((x) => { x.startTime = gA.startTime; }); // el mismo reloj que el cuerpo, aunque se creen despues
      };
      // El panel se sube a su propia capa (y se pinta) un poco antes de que la gota toque, no en el clic: medido, componer un panel invisible
      // durante todo el vuelo encarecia los primeros cuadros (y el clic es lo que mas se siente). Hasta entonces espera en opacidad 0 inline;
      // si el timer llega tarde, el cuerpo opaco lo sigue tapando un rato mas, asi que no se ve un hueco.
      if (delay > 250) { target.style.opacity = "0"; setTimeout(mount, delay - 150); } else mount();
    }
    setTimeout(() => B.g.remove(), total + 60);
    return plan(settled(gA), rv, re, total);
  }

  // wilt: lo contrario. El cuerpo (del color del panel) aparece encima y lo tapa, el panel se apaga debajo, y el cuerpo se recoge: primero se
  // hincha un poco (toma aire), baja (se aplasta a lo alto) y se cierra a lo ancho hasta ser una gota de radio o.r en `at`, que se tine del
  // color del orbe. Con o.handoff la gota se funde al final (un vuelo agendado la toma); si no, queda "estacionada" para el bloom siguiente.
  // ms = duracion del recogerse; antes hay o.fade ms para tapar el contenido. Devuelve una promesa (al terminar) con .end en ms desde ahora.
  function wilt(target, at, ms, o) {
    o = o || {}; ms = ms || 360;
    const plan = (p, end) => Object.assign(p, { end });
    if (!target) return plan(Promise.resolve(), 0);
    const vis = o.cover != null ? o.cover : parseFloat(getComputedStyle(target).opacity) || 0;
    if (App.reduceMotion() || !at || !layer()) {
      target.style.opacity = "0";
      if (!(vis > 0.02) || !target.animate) return plan(Promise.resolve(), 0);
      return plan(settled(target.animate([{ opacity: vis }, { opacity: 0 }], { duration: 160, easing: "ease-in" })), 160);
    }
    const fade = o.fade != null ? o.fade : vis > 0.5 ? Math.round(Math.min(110, ms * 0.32)) : 0;
    const rect0 = rectOf(target), surf = surfaceOf(target), rad = radiiOf(target, rect0), rect = fitView(rect0, rad);
    const rE = o.r || 22, rxF = Math.min(rad.rx, rect.w / 2), ryF = Math.min(rad.ry, rect.h / 2), px = at.x - rect.x, py = at.y - rect.y;
    const backIn = (v) => v * v * (2 * v - 1); // toma aire (~4% hacia afuera) y despues acelera hacia la gota
    const D = ms, N = Math.max(16, Math.min(40, Math.round(D / 14))), S = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, ey = backIn(clamp01(u / 0.84)), ex = backIn(clamp01((u - 0.1) / 0.9));
      const Lb = (px - rE) * ex, Rb = rect.w + (px + rE - rect.w) * ex, Tb = (py - rE) * ey, Bb = rect.h + (py + rE - rect.h) * ey;
      const W = Rb - Lb, H = Bb - Tb, q = 1 - smooth(0.04, 0.5, u);
      S.push({ L: Lb, R: Rb, T: Tb, B: Bb, rx: Math.max(0, Math.min(W / 2, W / 2 + (rxF - W / 2) * q)), ry: Math.max(0, Math.min(H / 2, H / 2 + (ryF - H / 2) * q)) });
    }
    const B = mkBody(rect, surf.solid ? surf.color : solidColor(), 2 * Math.max(rxF, rE, 8), 2 * Math.max(ryF, rE, 8), surf.solid && vis > 0.5);
    const opt = { duration: D, delay: fade, easing: "linear", fill: "both" };
    B.parts.forEach((p) => p.e.animate(S.map((s) => ({ transform: pieceT(p.kind, s, p.n) })), opt));
    const glow = mkInk(B.g, px, py, rE, GLOW_BG), ink = mkInk(B.g, px, py, rE, ORB_BG), gk = Math.max(2, (0.42 * Math.min(rect0.w, rect0.h)) / rE);
    glow.animate([{ transform: `scale(${gk.toFixed(2)})`, opacity: 0 }, { transform: `scale(${gk.toFixed(2)})`, opacity: 0, offset: 0.4 }, { transform: "scale(1)", opacity: 0.9 }], { duration: D, delay: fade, easing: "cubic-bezier(.5,0,.8,.6)", fill: "both" });
    ink.animate([{ transform: "scale(1.6)", opacity: 0 }, { transform: "scale(1.6)", opacity: 0, offset: 0.62 }, { transform: "scale(1)", opacity: 1 }], { duration: D, delay: fade, easing: "cubic-bezier(.4,0,.6,1)", fill: "both" });
    const end = fade + D, total = end + (o.handoff ? 110 : 0);
    const pts = [[0, vis > 0.5 ? 0 : 1], [fade, 1], [end, 1]]; if (o.handoff) pts.push([end + 50, 1], [end + 110, 0]);
    const gA = B.g.animate(keysAt(total, pts, "opacity"), { duration: total, fill: "both" });
    // el target se apaga DEBAJO del cuerpo (que ya lo tapa): el estado final queda inline, sin fill forwards (ver resetJv)
    target.style.opacity = "0";
    if (fade && vis > 0.02) target.animate([{ opacity: vis }, { opacity: vis, offset: 0.92 }, { opacity: 0 }], { duration: fade }); // se apaga recien cuando el cuerpo ya lo tapa entero (si no, un cuadro "fantasma" translucido)
    if (o.handoff) setTimeout(() => B.g.remove(), total + 60);
    else { if (parked) { clearTimeout(parked.tm); parked.g.remove(); } const p = { g: B.g, at, r: rE }; p.tm = setTimeout(() => { if (parked === p) parked = null; B.g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "forwards" }); setTimeout(() => B.g.remove(), 220); }, end + 900); parked = p; }
    return plan(settled(gA), end);
  }
  const pop = (el) => { if (el && el.animate) el.animate([{ transform: "scale(1)" }, { transform: "scale(1.22)" }, { transform: "scale(.96)" }, { transform: "scale(1)" }], { duration: 560, easing: spring }); };

  // ---------- Jarvis: el orbe se vuelve panel (y vuelve a serlo). Un solo lenguaje para todos los casos. ----------
  // Abrir, cerrar y navegar nunca se pisan: cada uno "reclama" el turno (claim) y, despues de cada espera, si otro lo reclamo mientras tanto
  // (la persona toco el orbe otra vez con el cierre a medias) sale sin tocar nada. Antes un cierre que seguia corriendo terminaba limpiando
  // el panel que ya se estaba abriendo: quedaba en opacity 0 con un recorte de 14 px, "se abre pero luego desaparece".
  let jvTok = 0;
  const hidden = new Set();
  const claim = () => ++jvTok, live = (t) => t === jvTok;
  // cancela solo lo que agendo este archivo (WAAPI); las transiciones/animaciones de CSS (el velo, el contenido escalonado) siguen su curso
  const stopAnims = (el) => { if (el) el.getAnimations().forEach((a) => { if ((typeof CSSAnimation !== "undefined" && a instanceof CSSAnimation) || (typeof CSSTransition !== "undefined" && a instanceof CSSTransition)) return; try { a.cancel(); } catch (e) { /* ya cancelada */ } }); };
  // deja el panel y las orbes limpios, sin rastro de una animacion anterior (cuerpo y gotas en el aire, orbes escondidas, estilos inline)
  function resetJv(panel) {
    stopAnims(panel); const w = panel.closest(".jv-wrap"); stopAnims(w && w.querySelector(".veil"));
    panel.style.opacity = ""; panel.style.clipPath = ""; panel.style.backdropFilter = ""; panel.style.webkitBackdropFilter = "";
    clean(); App.$$(".orb[data-orb], .jv-fab").forEach((o) => { o.style.visibility = ""; });
    hidden.forEach((o) => { o.style.visibility = ""; }); hidden.clear(); // el orbe de adentro del boton flotante no tiene data-orb: se recuerda cual se escondio
  }
  // una apertura a medias que se interrumpe: lo que se ve en ESTE cuadro (para que el cierre arranque de ahi y no de un panel que "salta")
  function takeOver(panel) { const vis = parseFloat(getComputedStyle(panel).opacity) || 0; stopAnims(panel); clean(); panel.style.opacity = vis > 0.5 ? "1" : "0"; return vis; }

  async function open(fromEl, wrap, panel) {
    const t = claim(); resetJv(panel); lite("jv", true);
    wrap.classList.remove("in", "shown"); wrap.classList.add("open");
    panel.style.opacity = "1"; // el estado final; bloom lo tiene en 0 hasta que el cuerpo llena su lugar (WAAPI, sin fill forwards)
    if (App.reduceMotion()) { wrap.style.setProperty("--jv-d", "0ms"); wrap.classList.add("in", "shown"); await settled(panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" })); return; }
    wrap.classList.add("in"); // el velo se aclara mientras la gota viaja
    const b = rectOf(panel), land = { x: b.x + b.w / 2, y: b.y + Math.min(b.h * 0.42, 150) };
    let delay = 0, r0 = 22;
    if (fromEl) {
      const a = rectOf(fromEl), endSize = Math.round(Math.min(120, b.w * 0.2));
      fromEl.style.visibility = "hidden"; hidden.add(fromEl); // la gota ES el orbe que se toco
      delay = flight(center(a), land, { size: Math.min(a.w, a.h), endSize, spread: true }).touch; r0 = endSize / 2;
    }
    const B = bloom(panel, land, 640, { delay, r0, stale: () => !live(t) });
    // el contenido del panel sube escalonado justo cuando el cuerpo le deja lugar (shell.css: --jv-d), sobre el mismo reloj
    wrap.style.setProperty("--jv-d", Math.round(B.reveal) + "ms"); wrap.classList.add("shown");
    await after(B.revealEnd); if (!live(t)) return;
    setTimeout(() => { if (live(t)) clean(); }, B.end - B.revealEnd + 80);
  }
  async function close(fromEl, wrap, panel) {
    const t = claim();
    const el = fromEl && fromEl.isConnected && fromEl.offsetParent !== null ? fromEl : App.$$(".orb[data-orb]").find((e) => e.offsetParent !== null);
    // cerrar con la gota todavia en el aire (Esc apenas abierto): vuelve desde donde esta, sin inventar un panel que nunca se vio
    const L = layer(), head = L && L.querySelector(".gooed .drop"), hr = head && parseFloat(getComputedStyle(panel).opacity) < 0.05 ? rectOf(head) : null;
    const vis = takeOver(panel);
    wrap.classList.remove("shown", "in"); // el velo se va mientras la sustancia se junta
    if (App.reduceMotion() || !el) {
      await wilt(panel, null, 0, { cover: vis }); if (!live(t)) return;
      resetJv(panel); wrap.classList.remove("open"); lite("jv", false); return;
    }
    const r = rectOf(panel), o = rectOf(el), oc = center(o), pc = hr ? center(hr) : { x: Math.max(r.x + 30, Math.min(r.x + r.w - 30, oc.x)), y: Math.max(r.y + 30, Math.min(r.y + r.h - 30, oc.y)) };
    const W = hr ? { end: 40 } : wilt(panel, pc, 330, { r: 23, handoff: true, cover: vis });
    if (hr) panel.style.opacity = "0";
    // la gota que vuelve al orbe arranca justo cuando el cuerpo termina de juntarse (agendada, no esperada: sin cuadro muerto en el medio)
    const F = flight(pc, oc, { size: hr ? Math.max(16, Math.min(hr.w, hr.h)) : 46, endSize: Math.min(o.w, o.h), ms: 520, delay: Math.max(0, W.end - 40), fadeIn: hr ? 0 : 110, keep: true });
    await F.done; if (!live(t)) return;
    resetJv(panel); pop(el); wrap.classList.remove("open"); lite("jv", false);
  }
  // Jarvis te lleva a otro lugar (o presenta algo / abre el chat en otra pantalla): el panel se junta en la gota (igual que al cerrar), la gota
  // salta hasta `to` y ahi se derrama sobre la pantalla nueva como vidrio que se evapora (igual que al abrir). o.onLand: se llama cuando la gota
  // toca (ahi se cambia de pantalla, bajo el velo que recien entonces se va). o.rect: la zona que cubre el derrame.
  async function carry(panel, wrap, to, o) {
    o = o || {}; const t = claim();
    const vis = takeOver(panel);
    wrap.classList.remove("shown");
    let landed = false;
    const land = () => { if (landed || !live(t)) return; landed = true; wrap.classList.remove("in"); if (o.onLand) o.onLand(); };
    if (App.reduceMotion()) { await wilt(panel, null, 0, { cover: vis }); if (!live(t)) return; land(); resetJv(panel); wrap.classList.remove("open"); lite("jv", false); return; }
    const r = rectOf(panel), from = { x: r.x + r.w / 2, y: r.y + Math.min(r.h * 0.42, 150) };
    const W = wilt(panel, from, 280, { r: 26, handoff: true, cover: vis });
    // un salto corto es rapido: la duracion sigue a la distancia (el mismo vuelo, no un vuelo lento de pocos pixeles)
    const F = flight(from, to, { size: 52, endSize: 104, ms: o.ms || Math.max(380, Math.min(620, 300 + Math.hypot(to.x - from.x, to.y - from.y) * 0.5)), delay: Math.max(0, W.end - 40), fadeIn: 110, keep: true, spread: true, stale: () => !live(t), onLand: land });
    const B = bloom(null, to, o.bloomMs || 640, { delay: F.touch, rect: o.rect || { x: 0, y: 0, w: innerWidth, h: innerHeight }, splash: true, r0: 52, radius: 44 });
    await B; if (!live(t)) return;
    land(); resetJv(panel); wrap.classList.remove("open");
    setTimeout(() => { if (live(t)) lite("jv", false); }, 120);
  }
  // la gota viaja desde un orbe hasta un destino y ahi florece lo que sigue: SIEMPRE el mismo vuelo + derrame que open(), nunca un fundido de
  // pantalla aparte corriendo en paralelo. target es el elemento que se revela en el punto de aterrizaje (si no hay, la gota solo llega y se funde).
  async function travel(fromEl, toPoint, o, target) {
    o = o || {};
    if (App.reduceMotion() || !fromEl) { if (target) await bloom(target, toPoint, 0); return; }
    const a = rectOf(fromEl), keep = fromEl.style.visibility; fromEl.style.visibility = "hidden";
    const endSize = o.endSize || 90, F = flight(center(a), toPoint, Object.assign({ size: Math.min(a.w, a.h), spread: true }, o, { endSize }));
    if (target) bloom(target, toPoint, o.bloomMs || 620, { delay: F.touch, r0: endSize / 2 });
    await F.done; fromEl.style.visibility = keep;
  }

  // una nube/pantalla que "nace" en el orbe de Jarvis: la gota vuela desde el orbe hasta donde va a quedar y ahi florece (mismo vuelo + bloom
  // que abrir Jarvis, DECISIONES.md #10 y #12). Todo se agenda ya: el elemento espera invisible (.arr-pre y la animacion de opacidad del bloom)
  // hasta que el cuerpo le hace lugar, y su entrada escalonada (.arr-in, CSS) se corre en el tiempo para empezar en ese mismo instante.
  // No hace nada con "reducir movimiento" ni si Jarvis ya esta llevando a la persona hasta aca (App._morphNav): ese derrame ya lo hizo el.
  function arrive(el, o) {
    o = o || {};
    if (!el || App.reduceMotion() || App._morphNav) return false;
    const orb = App.$$(".orb[data-orb]").find((e) => e.offsetParent), b = rectOf(el), ob = orb && rectOf(orb);
    const land = { x: b.x + b.w / 2, y: b.y + Math.min(b.h * 0.42, 150) }, from = orb ? center(ob) : { x: innerWidth - 56, y: innerHeight - 56 };
    lite("arr", true, 2600);
    const endSize = o.endSize || 120, F = flight(from, land, { size: ob ? Math.min(ob.w, ob.h, 64) : 56, endSize, spread: true });
    const B = bloom(el, land, o.ms || 700, { delay: F.touch, r0: endSize / 2 });
    // .arr-pre (opacity 0 !important) la tiene invisible mientras la gota vuela; se suelta un poco ANTES de que el cuerpo le haga lugar (la
    // animacion de opacidad del bloom todavia la tiene en 0), asi un timer que llega tarde no deja un hueco: el cuerpo la tapa un rato mas
    el.classList.add("arr-pre", "arr-in");
    el.getAnimations({ subtree: true }).forEach((a) => { if (typeof CSSAnimation !== "undefined" && a instanceof CSSAnimation && a.animationName === "enterUp") a.currentTime = (a.currentTime || 0) - B.reveal; });
    setTimeout(() => el.classList.remove("arr-pre"), Math.max(0, B.reveal - 120));
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
  App.morph = { open, close, carry, travel, arrive, lite, claim, live, fly, flight, bloom, wilt, pop, view, sparkles, confetti, rectOf, center, spring, OUT, IN, clean };
})();
