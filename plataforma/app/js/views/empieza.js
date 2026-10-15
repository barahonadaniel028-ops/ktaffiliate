/* Aura · "Empieza aquí" (DECISIONES.md #18). ESQUELETO: lo completa el trabajo de "Empieza aquí"; este archivo ya define el contrato que usan el nav,
   el arranque (boot.js) y Hoy:
     App.onboarding.pending()   -> true mientras falte algun paso (el nav pone "Empieza aquí" primero; boot.js abre #empieza la primera vez)
     App.onboarding.progress()  -> {done, total}
     App.onboarding.isDone(id) / markDone(id) / reset()
   El progreso se guarda en la base (home/onboarding, S.onboardDoc) y, como respaldo, en el navegador (App.store "onboard"). */
(function () {
  "use strict";
  const App = window.App, S = App.S, { esc, icon } = App;
  // pasos de introduccion (provisorios; el trabajo de esta seccion los define de verdad)
  const STEPS = [
    { id: "jarvis", title: "Conocé a Jarvis", desc: "Tu asistente: abrilo y pedile que te lleve a algún lugar.", href: "#hoy" },
  ];
  const doc = () => S.onboardDoc || App.store.get("onboard", null) || { steps: {} };
  const isDone = (id) => !!(doc().steps && doc().steps[id]);
  const progress = () => ({ done: STEPS.filter((s) => isDone(s.id)).length, total: STEPS.length });
  const pending = () => progress().done < progress().total;
  async function save(next) {
    S.onboardDoc = next; App.store.set("onboard", next); App.emit("home");
    try { if (App.adapter() && App.adapter().canWrite && App.adapter().canWrite()) await App.data.set("home", "onboarding", next); } catch (e) { /* el respaldo local ya quedo */ }
  }
  function markDone(id) { if (isDone(id)) return; const d = doc(), next = { ...d, steps: { ...(d.steps || {}), [id]: App.stamp() } }; return save(next); }
  function reset() { return save({ steps: {} }); }
  App.onboarding = { STEPS, doc, isDone, progress, pending, markDone, reset };

  App.views.empieza = {
    title: "Empieza aquí",
    render() { return `<div class="vhead"><div class="t"><h1 class="h-l">Empieza <em>aquí</em></h1><p class="muted">${progress().done} de ${progress().total} pasos.</p></div></div>`; },
  };
})();
