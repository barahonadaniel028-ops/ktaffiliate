/* Aura · Crear → "Grabar" (DECISIONES.md #19). ESQUELETO: lo completa el trabajo de "Grabar". Contrato con crear.js (igual que crearEstilo / crearVideo):
     App.crearGrabar.render()  -> HTML de la nube (usa App.crear.cloud({...}))
     App.crearGrabar.bind(root) -> engancha eventos despues de pintar
     App.crearGrabar.back()     -> true si maneja su propio paso atrás; false → crear.js vuelve a "¿Qué querés crear?"
   Para grabar usa el teleprompter: App.teleprompter.open({...}) (teleprompter.js). */
(function () {
  "use strict";
  const App = window.App;
  App.crearGrabar = {
    render() { return App.crear.cloud({ status: "grabar", back: true, trail: [{ who: "ai", html: "<p>Grabar: en construcción.</p>" }] }); },
    bind() {},
    back() { return false; },
  };
})();
