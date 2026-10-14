/* Aura · arranque: elige el adaptador (Claude real o demostracion), conecta, dibuja y reacciona a los cambios. */
(function () {
  "use strict";
  const App = window.App, S = App.S, UI = App.ui, { $ } = App;
  const q = new URLSearchParams(location.search), wantDemo = q.has("demo") || window.AURA_FORCE_DEMO === true || App.store.get("force-demo", false);

  // carga datos de ejemplo en la base real (cuando esta vacia) o reinicia la memoria demo
  App.seedDemo = async function () {
    const seed = window.AuraDemo.seed(App.config.id); let n = 0;
    for (const [coll, docs] of Object.entries(seed)) for (const [id, body] of Object.entries(docs)) { if (await App.data.set(coll, id, body)) n++; }
    App.toast(`Datos de demostración cargados (${n}).`); return n;
  };
  App.acts.seeddemo = async (el) => { el.disabled = true; await App.seedDemo(); el.disabled = false; };
  App.acts.forcedemo = (el) => { const on = el.getAttribute("aria-checked") !== "true"; App.store.set("force-demo", on); location.reload(); };

  function onChange(kinds) {
    const r = App.route(), v = App.views[r.name];
    if (kinds.has("route")) {
      if (v && v.routeChanged && v.routeChanged(r) === true) { App.shell.renderChrome(); App.studioRoute(); return; }
      App.shell.renderMain(); App.studioRoute(); return;
    }
    if (App.st && App.st.SE) App.st.onData(kinds);
    if (kinds.has("theme") || kinds.has("claude") || kinds.has("connected")) { App.shell.renderChrome(); if (kinds.has("connected")) App.render(true); return; }
    if (kinds.has("mcp")) { App.act.maybeLoadMetrics(); return; }
    if (kinds.has("brand")) { App.render(true); return; }
    if (v && v.update && v.update(kinds) !== false) { App.shell.renderChrome(); return; }
    App.shell.renderMain(); App.studioRoute(); App.shell.renderChrome();
  }

  async function start() {
    const root = $("#aura-root");
    App.shell.mount(root); App.shell.wire(); App.jarvis.mount();
    App.on(onChange);
    let ok = false;
    if (!wantDemo && window.claude && window.claude.use) { try { ok = await App.connect(App.adapters.claude()); } catch (e) { ok = false; } }
    if (!ok) { await App.connect(App.adapters.demo(window.AuraDemo ? window.AuraDemo.seed(App.config.id) : {})); }
    App.emit("route");
    // carga inicial de Metricool (en demo trae filas de ejemplo)
    setTimeout(() => { App.act.maybeLoadMetrics(); if (S.mode === "demo" && window.AuraDemo) setTimeout(() => window.AuraDemo.seedTrophies(), 900); }, 300);
    window.addEventListener("resize", App.debounce(() => { if (App.st && App.st.SE) App.st.fit(); }, 120));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
