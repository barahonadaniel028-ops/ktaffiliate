/* Aura · utilidades compartidas por los adaptadores (claude, demo, simulador).
   App._adapterUtil las deja disponibles para los otros archivos de esta carpeta, que cargan despues. */
(function () {
  "use strict";
  const App = window.App;
  const withTimeout = (pr, ms) => Promise.race([Promise.resolve(pr).catch(() => null), new Promise((r) => setTimeout(() => r(null), ms))]);
  const assetUrl = (v) => (!v ? "" : v === "demo-video" ? (window.AuraDemo && window.AuraDemo.videoUrl) || "" : /^[0-9a-f]{32}$/.test(v) ? "/_blob/" + v : v);
  // Guardar por la capacidad `downloads` del visor (el iframe de un artefacto bloquea los <a download>: el codigo
  // de la pagina nunca descarga directo). Devuelve true | "declined" | false, igual que adapter.download().
  // La capacidad solo acepta una lista cerrada de extensiones y .srt no esta en ella: como un SRT es texto plano,
  // se ofrece una sola vez como .txt (la persona lo renombra). No se arma ninguna cadena de formatos alternativos.
  const saveViaCapability = async (dl, filename, data) => {
    const attempt = (name) => dl.save({ filename: name, data });
    try { await attempt(filename); return true; } catch (e) {
      if (e && e.code === "declined") return "declined";
      if (e && e.code === "rejected_extension" && typeof data === "string" && !/\.txt$/i.test(filename)) {
        try { await attempt(filename + ".txt"); return true; } catch (e2) { return e2 && e2.code === "declined" ? "declined" : false; }
      }
      return false;
    }
  };
  App.adapters = App.adapters || {};
  App.withTimeout = withTimeout;
  App._adapterUtil = { withTimeout, assetUrl, saveViaCapability };
})();
