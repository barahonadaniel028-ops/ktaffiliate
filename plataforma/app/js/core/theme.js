/* Aura · dia y noche. Modos: auto (sigue al sistema), day, night. El cambio es un View Transition circular desde el boton. */
(function () {
  "use strict";
  const App = window.App, root = document.documentElement;
  let mode = App.store.get("theme", "auto");
  const mq = (() => { try { return matchMedia("(prefers-color-scheme: dark)"); } catch (e) { return null; } })();
  const hostDark = () => root.getAttribute("data-theme") === "dark";
  const effective = () => (mode === "day" ? "day" : mode === "night" ? "night" : (mq && mq.matches) || hostDark() ? "night" : "day");
  const apply = () => {
    if (mode === "auto") root.removeAttribute("data-aura"); else root.setAttribute("data-aura", mode === "day" ? "day" : "night");
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = effective() === "night" ? "#06100f" : "#eef2f0";
    App.emit("theme");
  };
  async function set(next, ev) {
    mode = next; App.store.set("theme", next);
    const x = ev && ev.clientX != null ? ev.clientX : innerWidth - 60, y = ev && ev.clientY != null ? ev.clientY : 40;
    if (!document.startViewTransition || App.reduceMotion()) { apply(); return; }
    root.style.setProperty("--vt-x", x + "px"); root.style.setProperty("--vt-y", y + "px"); root.dataset.vt = "theme";
    const t = document.startViewTransition(() => { apply(); });
    try {
      await t.ready;
      const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] }, { duration: 700, easing: "cubic-bezier(.2,.8,.2,1)", pseudoElement: "::view-transition-new(root)" });
    } catch (e) { /* sin animacion */ }
    t.finished.finally(() => { delete root.dataset.vt; });
  }
  // un toque alterna entre dia y noche segun lo que se ve ahora; Ajustes permite volver a Auto
  const toggle = (ev) => set(effective() === "night" ? "day" : "night", ev);
  if (mq && mq.addEventListener) mq.addEventListener("change", () => { if (mode === "auto") apply(); });
  apply();
  App.theme = { get mode() { return mode; }, effective, set, toggle };
})();
