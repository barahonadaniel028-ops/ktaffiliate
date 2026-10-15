/* Aura · rutas por hash. #hoy #crear #biblioteca[/tipo] #laboratorio[/pestana] #metricas #notas
   #estudio[/pestana] (antes "Aprobar": por-aprobar/agendados/rechazados) #estudio/ver/<videoId> #estudio/editor/<videoId> #ajustes
   "aprobar" ya no es una pantalla propia (DECISIONES.md #2): un hash viejo #aprobar... entra a #estudio... en su lugar (ver LEGACY).
   "logros" tampoco (DECISIONES.md #1): los hitos viven dentro de Métricas, con una celebracion puntual al cruzar uno nuevo. */
(function () {
  "use strict";
  const App = window.App;
  const NAV = [
    ["hoy", "Hoy", "home"], ["crear", "Crear", "plus"], ["biblioteca", "Biblioteca", "book"], ["laboratorio", "Laboratorio", "flask"],
    ["metricas", "Métricas", "chart"], ["notas", "Notas", "note"], ["estudio", "Estudio", "film"],
  ];
  const ALL = NAV.map((n) => n[0]).concat(["ajustes"]);
  // nombres de pantalla que ya no existen por su cuenta: un hash con ese nombre entra a la pantalla que lo reemplaza.
  const LEGACY = { aprobar: "estudio", logros: "metricas" };
  const parse = () => {
    const rawParts = (location.hash || "").replace(/^#\/?/, "").split("/").map(decodeURIComponent).filter(Boolean);
    const parts = LEGACY[rawParts[0]] ? [LEGACY[rawParts[0]], ...rawParts.slice(1)] : rawParts;
    const name = ALL.includes(parts[0]) ? parts[0] : "hoy";
    return { name, args: parts.slice(1), raw: parts.join("/") };
  };
  let route = parse();
  function go(path, o) {
    o = o || {}; const want = "#" + String(path).replace(/^#\/?/, "");
    if (location.hash === want) { App.emit("route"); return; }
    App._navFrom = o.from || null;
    if (o.replace) history.replaceState(null, "", want); else location.hash = want;
    if (o.replace) { route = parse(); App.emit("route"); }
  }
  window.addEventListener("hashchange", () => { route = parse(); App.emit("route"); });
  App.nav = NAV;
  App.go = go;
  App.route = () => route;
  App.href = (name, ...args) => "#" + [name].concat(args.map(encodeURIComponent)).join("/");
})();
