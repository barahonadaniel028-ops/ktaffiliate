/* Aura · utilidades compartidas por los adaptadores (claude, demo, simulador).
   App._adapterUtil las deja disponibles para los otros archivos de esta carpeta, que cargan despues. */
(function () {
  "use strict";
  const App = window.App;
  const withTimeout = (pr, ms) => Promise.race([Promise.resolve(pr).catch(() => null), new Promise((r) => setTimeout(() => r(null), ms))]);
  const assetUrl = (v) => (!v ? "" : v === "demo-video" ? (window.AuraDemo && window.AuraDemo.videoUrl) || "" : /^[0-9a-f]{32}$/.test(v) ? "/_blob/" + v : v);
  App.adapters = App.adapters || {};
  App.withTimeout = withTimeout;
  App._adapterUtil = { withTimeout, assetUrl };
})();
