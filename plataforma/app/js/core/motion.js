/* Aura · movimiento. La firma: el orbe se estira como una gota, vuela con cola (filtro SVG "goo"), aterriza aplastandose
   y el panel florece desde ese punto (clip-path circular). Al cerrar, el panel se recoge en una gota que vuelve al orbe.
   Todo es transform/opacity/clip-path (se compone en la GPU). Con "reducir movimiento": fundido simple. */
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

  // una gota de diametro "s" vuela de a (centro) a b (centro) con estiramiento en la direccion del viaje y aplaste al llegar
  function fly(from, to, o) {
    o = o || {};
    return new Promise((resolve) => {
      const L = layer(); if (!L || App.reduceMotion()) { resolve(); return; }
      L.innerHTML = ""; const goo = document.createElement("div"); goo.className = "gooed"; L.appendChild(goo);
      const s = o.size || 64, end = o.endSize || s, K = end / s, dx = to.x - from.x, dy = to.y - from.y, dist = Math.hypot(dx, dy), ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      const ms = o.ms || Math.max(520, Math.min(820, 420 + dist * 0.45));
      const mk = (size, bg) => { const d = document.createElement("div"); d.className = "drop"; Object.assign(d.style, { width: size + "px", height: size + "px", left: "0px", top: "0px", background: bg || ORB_BG }); goo.appendChild(d); return d; };
      const at = (p, size, rot, sx, sy) => `translate(${(from.x + dx * p - size / 2).toFixed(1)}px, ${(from.y + dy * p - size / 2).toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
      const k = (p) => 1 + (K - 1) * p; // el tamano crece/decrece en el camino
      const main = mk(s);
      const anim = main.animate([
        { transform: at(0, s, ang, 1, 1), offset: 0 },
        { transform: at(-0.03, s, ang, 0.82, 1.14), offset: 0.12 },               // se encoge un poco antes de saltar (anticipacion)
        { transform: at(0.55, s, ang, 1.85 * k(0.5), 0.66 * k(0.5)), offset: 0.52 }, // se estira en vuelo
        { transform: at(1, s, ang, 0.8 * K, 1.22 * K), offset: 0.8 },              // aplaste al aterrizar
        { transform: at(1, s, ang, K, K), offset: 1 },
      ], { duration: ms, easing: "cubic-bezier(.45,0,.2,1)", fill: "forwards" });
      // tres gotas menores siguen la estela y se funden con la principal (efecto liquido)
      [0.62, 0.44, 0.3].forEach((f, i) => {
        const t = mk(s * f), sz = s * f, delay = 45 + i * 45;
        t.animate([{ transform: at(0, sz, ang, 1, 1), opacity: 1 }, { transform: at(0.5, sz, ang, 1.3, 0.8), opacity: 1, offset: 0.55 }, { transform: at(0.96, sz, ang, 0.3, 0.3), opacity: 0 }], { duration: ms * 0.92, delay, easing: "cubic-bezier(.45,0,.2,1)", fill: "both" });
      });
      if (o.onLand) setTimeout(o.onLand, ms * 0.78);
      anim.finished.then(() => resolve(main), () => resolve(main));
    });
  }

  // el panel florece desde un punto: clip-path circular que crece (y su contenido llega escalonado por CSS)
  function bloom(panel, at, ms) {
    const r = rectOf(panel), x = at.x - r.x, y = at.y - r.y, R = Math.hypot(Math.max(x, r.w - x), Math.max(y, r.h - y)) + 4;
    return panel.animate([{ clipPath: `circle(18px at ${x}px ${y}px)`, opacity: 0.9 }, { clipPath: `circle(${R}px at ${x}px ${y}px)`, opacity: 1 }], { duration: ms || 620, easing: OUT, fill: "both" }).finished.catch(() => {});
  }
  function wilt(panel, at, ms) {
    const r = rectOf(panel), x = at.x - r.x, y = at.y - r.y, R = Math.hypot(Math.max(x, r.w - x), Math.max(y, r.h - y)) + 4;
    return panel.animate([{ clipPath: `circle(${R}px at ${x}px ${y}px)`, opacity: 1 }, { clipPath: `circle(14px at ${x}px ${y}px)`, opacity: 0.85 }], { duration: ms || 360, easing: IN, fill: "forwards" }).finished.catch(() => {});
  }
  const pop = (el) => { if (el && el.animate) el.animate([{ transform: "scale(1)" }, { transform: "scale(1.22)" }, { transform: "scale(.96)" }, { transform: "scale(1)" }], { duration: 560, easing: spring }); };

  // ---------- Jarvis: el orbe se vuelve panel ----------
  async function open(fromEl, wrap, panel) {
    wrap.classList.add("open");
    if (App.reduceMotion() || !fromEl) { wrap.classList.add("in", "shown"); panel.style.opacity = 1; return; }
    const a = rectOf(fromEl), pc = { x: 0, y: 0 };
    panel.style.opacity = 0; wrap.classList.add("in"); // el velo se aclara mientras la gota viaja
    const b = rectOf(panel); pc.x = b.x + b.w / 2; pc.y = b.y + Math.min(b.h * 0.42, 150);
    fromEl.style.visibility = "hidden";
    const land = { x: pc.x, y: pc.y };
    await fly(center(a), land, { size: Math.min(a.w, a.h), endSize: Math.min(150, b.w * 0.24), onLand: () => { panel.style.opacity = 1; wrap.classList.add("shown"); bloom(panel, land, 640); } });
    const L = layer(); if (L) L.firstChild && L.firstChild.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: "forwards" }).finished.then(clean, clean);
    open._land = land;
  }
  async function close(fromEl, wrap, panel) {
    const el = fromEl && fromEl.isConnected && fromEl.offsetParent !== null ? fromEl : App.$$(".orb[data-orb]").find((e) => e.offsetParent !== null);
    if (App.reduceMotion() || !el) { wrap.classList.remove("in", "open", "shown"); panel.style.opacity = ""; if (el) el.style.visibility = ""; return; }
    const r = rectOf(panel), o = rectOf(el), oc = center(o), pc = { x: Math.max(r.x + 30, Math.min(r.x + r.w - 30, oc.x)), y: Math.max(r.y + 30, Math.min(r.y + r.h - 30, oc.y)) };
    wrap.classList.remove("shown");
    await wilt(panel, pc, 340);
    wrap.classList.remove("in"); panel.style.opacity = 0;
    await fly(pc, oc, { size: 46, endSize: Math.min(o.w, o.h), ms: 560 });
    el.style.visibility = ""; pop(el); wrap.classList.remove("open"); panel.style.opacity = ""; panel.getAnimations().forEach((x) => x.cancel()); clean();
  }
  // la gota viaja hasta un destino y ahi florece la pantalla nueva (Jarvis navegando)
  async function travel(fromEl, toRect, o) {
    if (App.reduceMotion() || !fromEl) return;
    const a = rectOf(fromEl), keep = fromEl.style.visibility; fromEl.style.visibility = "hidden";
    await fly(center(a), center(toRect), Object.assign({ size: Math.min(a.w, a.h), endSize: 90 }, o || {}));
    fromEl.style.visibility = keep; const L = layer(); if (L && L.firstChild) L.firstChild.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.6)" }], { duration: 280, fill: "forwards" }).finished.then(clean, clean); else clean();
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
  App.morph = { open, close, travel, fly, bloom, wilt, pop, view, sparkles, rectOf, center, spring, OUT, IN, clean };
})();
