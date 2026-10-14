/* Aura · movimiento. El orbe se estira como una gota (filtro SVG "goo" + cola) y se convierte en lo que pedis.
   morph.open(fromEl, toEl): gota del orbe al panel · morph.close: regreso · morph.travel: la gota lleva a un destino.
   Sin goo ni cola con "reducir movimiento": fundido simple. */
(function () {
  "use strict";
  const App = window.App;
  const SPRING = "linear(0, .22 7%, .58 16%, .9 27%, 1.06 38%, 1.07 46%, 1.01 60%, .995 74%, 1)";
  const EASE_OUT = "cubic-bezier(.2,.9,.25,1)";
  const supportsLinear = (() => { try { return CSS.supports("transition-timing-function", SPRING); } catch (e) { return false; } })();
  const spring = supportsLinear ? SPRING : "cubic-bezier(.3,1.35,.4,1)";
  const rectOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
  const layer = () => document.getElementById("morph");

  const ORB_BG = "radial-gradient(circle at 32% 26%, rgba(255,255,255,.95), rgba(255,255,255,0) 22%), radial-gradient(circle at 70% 75%, rgba(255,173,133,.95), rgba(255,173,133,0) 45%), radial-gradient(circle at 25% 70%, rgba(169,230,211,.95), rgba(169,230,211,0) 50%), conic-gradient(from 200deg at 50% 50%, #0f6b6c, #6fd1c0, #ffd0a8, #ff9a76, #f7a6bd, #0f6b6c)";
  const place = (el, r, radius) => { Object.assign(el.style, { left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px", borderRadius: radius }); };
  const frameOf = (r, radius) => ({ left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px", borderRadius: radius });

  // Anima una gota desde "a" hasta "b" (rects). La gota principal cambia de forma; tres gotas chicas la siguen y el filtro las funde.
  function run(a, b, o) {
    o = o || {};
    return new Promise((resolve) => {
      const L = layer(); if (!L) { resolve(); return; }
      const ms = o.ms || 640, rTo = o.radiusTo || "40px", rFrom = o.radiusFrom || "50%";
      if (App.reduceMotion()) { resolve(); return; }
      L.innerHTML = ""; const goo = document.createElement("div"); goo.className = "gooed"; L.appendChild(goo);
      const main = document.createElement("div"); main.className = "drop"; main.style.background = ORB_BG; goo.appendChild(main);
      const glass = document.createElement("div"); glass.className = "drop"; glass.style.background = getComputedStyle(document.documentElement).getPropertyValue("--glass-solid") || "#f7faf9"; glass.style.opacity = "0"; goo.appendChild(glass);
      place(main, a, rFrom); place(glass, a, rFrom);
      const cx = (r) => r.x + r.w / 2, cy = (r) => r.y + r.h / 2;
      const tails = [0.62, 0.46, 0.3].map((k, i) => {
        const t = document.createElement("div"); t.className = "drop"; t.style.background = ORB_BG;
        const s = Math.min(a.w, a.h) * k; place(t, { x: cx(a) - s / 2, y: cy(a) - s / 2, w: s, h: s }, "50%"); goo.appendChild(t);
        const tx = cx(b) - s / 2 + (i - 1) * Math.min(18, b.w * 0.04), ty = cy(b) - s / 2 + (i - 1) * 10;
        t.animate([{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${(tx - (cx(a) - s / 2)) * 0.9}px, ${(ty - (cy(a) - s / 2)) * 0.9}px) scale(.8)`, opacity: 1, offset: 0.6 }, { transform: `translate(${tx - (cx(a) - s / 2)}px, ${ty - (cy(a) - s / 2)}px) scale(.2)`, opacity: 0 }], { duration: ms * 0.95, delay: 40 + i * 50, easing: EASE_OUT, fill: "both" });
        return t;
      });
      const shape = [frameOf(a, rFrom), frameOf({ x: a.x + (b.x - a.x) * 0.55, y: a.y + (b.y - a.y) * 0.55, w: a.w + (b.w - a.w) * 0.3, h: a.h + (b.h - a.h) * 0.3 }, "42%"), frameOf(b, rTo)];
      const anim = main.animate(shape, { duration: ms, easing: EASE_OUT, fill: "forwards" });
      glass.animate([{ ...shape[0], opacity: 0 }, { ...shape[1], opacity: 0, offset: 0.55 }, { ...shape[2], opacity: o.glassTo == null ? 1 : o.glassTo }], { duration: ms, easing: EASE_OUT, fill: "forwards" });
      main.animate([{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0.0 }], { duration: ms, easing: "linear", fill: "forwards" });
      anim.finished.then(() => resolve(), () => resolve()).finally(() => {});
      run._cleanup = () => { L.innerHTML = ""; };
    });
  }
  const clean = () => { const L = layer(); if (L) L.innerHTML = ""; };

  // abre el panel desde el orbe: panelEl ya existe (oculto); se muestra cuando la gota llega
  async function open(fromEl, wrap, panel) {
    const orbs = App.$$(".orb[data-orb]");
    wrap.classList.add("open");
    if (App.reduceMotion() || !fromEl) { wrap.classList.add("in"); panel.style.opacity = 1; return; }
    const a = rectOf(fromEl); panel.style.opacity = 0; wrap.classList.add("in");
    const b = rectOf(panel);
    fromEl.style.visibility = "hidden";
    document.querySelectorAll(".orb.fast").forEach((e) => e.classList.remove("fast"));
    await run(a, b, { ms: 620, radiusTo: getComputedStyle(panel).borderTopLeftRadius || "40px" });
    panel.style.opacity = ""; panel.style.transition = "opacity .25s var(--ease)"; panel.style.opacity = 1;
    setTimeout(() => { clean(); panel.style.transition = ""; }, 260);
    open._from = fromEl;
  }
  async function close(fromEl, wrap, panel) {
    const el = fromEl && fromEl.isConnected ? fromEl : App.$$(".orb[data-orb]").find((e) => e.offsetParent !== null);
    if (App.reduceMotion() || !el) { wrap.classList.remove("in", "open"); panel.style.opacity = ""; if (el) el.style.visibility = ""; return; }
    const a = rectOf(panel), b = rectOf(el);
    wrap.classList.remove("in"); panel.style.opacity = 0;
    await run(a, b, { ms: 520, radiusFrom: getComputedStyle(panel).borderTopLeftRadius || "40px", radiusTo: "50%", glassTo: 0 });
    el.style.visibility = ""; wrap.classList.remove("open"); panel.style.opacity = "";
    el.animate([{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }], { duration: 420, easing: spring });
    clean();
  }
  // la gota viaja de un lado a otro (por ejemplo, "llevame a aprobar")
  async function travel(fromEl, toRect, o) {
    if (App.reduceMotion() || !fromEl) return;
    const a = rectOf(fromEl); const keep = fromEl.style.visibility; fromEl.style.visibility = "hidden";
    await run(a, toRect, Object.assign({ ms: 560, radiusTo: "50%" }, o || {}));
    fromEl.style.visibility = keep; clean();
  }

  // View Transition de cambio de pantalla (con elemento compartido opcional)
  function view(update, sharedFrom) {
    if (!document.startViewTransition || App.reduceMotion()) { update(); return Promise.resolve(); }
    if (sharedFrom) sharedFrom.style.viewTransitionName = "shared";
    const t = document.startViewTransition(() => { update(); const tgt = document.querySelector("[data-shared-target]"); if (tgt) tgt.style.viewTransitionName = "shared"; });
    return t.finished.catch(() => {}).finally(() => { if (sharedFrom) sharedFrom.style.viewTransitionName = ""; const tgt = document.querySelector("[data-shared-target]"); if (tgt) tgt.style.viewTransitionName = ""; });
  }

  // destellos y medalla (logros)
  function sparkles(host, n) {
    if (App.reduceMotion()) return;
    for (let i = 0; i < (n || 4); i++) {
      const s = document.createElement("i"); s.className = "spk"; const ang = (Math.PI * 2 * i) / (n || 4) + 0.5, d = 60 + Math.random() * 30;
      s.style.cssText = `position:absolute;left:50%;top:50%;width:10px;height:10px;margin:-5px;border-radius:50%;background:var(--apricot);box-shadow:0 0 14px var(--apricot);pointer-events:none`;
      host.appendChild(s);
      s.animate([{ transform: "translate(0,0) scale(.2)", opacity: 1 }, { transform: `translate(${Math.cos(ang) * d}px,${Math.sin(ang) * d}px) scale(1)`, opacity: 0 }], { duration: 900, delay: 300 + i * 60, easing: EASE_OUT, fill: "both" }).finished.then(() => s.remove(), () => s.remove());
    }
    try { navigator.vibrate && navigator.vibrate(18); } catch (e) { /* sin vibracion */ }
  }
  App.morph = { open, close, travel, run, view, sparkles, rectOf, spring, EASE_OUT, clean };
})();
