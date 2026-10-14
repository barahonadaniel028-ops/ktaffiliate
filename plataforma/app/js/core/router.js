/* Aura · rutas por hash. #hoy #aprobar[/pestana] #aprobar/ver/<videoId> #crear #biblioteca[/tipo] #laboratorio[/pestana] #metricas #logros #notas #estudio[/<videoId>] #ajustes */
(function () {
  "use strict";
  const App = window.App;
  const NAV = [
    ["hoy", "Hoy", "home"], ["aprobar", "Aprobar", "check"], ["crear", "Crear", "plus"], ["biblioteca", "Biblioteca", "book"], ["laboratorio", "Laboratorio", "flask"],
    ["metricas", "Métricas", "chart"], ["logros", "Logros", "trophy"], ["notas", "Notas", "note"], ["estudio", "Estudio", "film"],
  ];
  const ALL = NAV.map((n) => n[0]).concat(["ajustes"]);
  const parse = () => {
    const parts = (location.hash || "").replace(/^#\/?/, "").split("/").map(decodeURIComponent).filter(Boolean);
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
