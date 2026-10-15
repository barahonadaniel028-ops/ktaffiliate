/* Aura · teleprompter propio (DECISIONES.md #19). ESQUELETO: lo completa el trabajo del "teleprompter". Contrato:
     App.teleprompter.open({ mode: "script" | "interview", title, text?, questions?, secondsPerQuestion?, onDone? }) -> abre la pantalla completa
         script:    `text` es el guion entero (párrafos separados por línea en blanco) que se desplaza solo, con velocidad, tamaño y espejo ajustables
         interview: `questions` es un arreglo de preguntas; se muestra UNA por vez, lento, `secondsPerQuestion` segundos cada una (la persona lo elige)
         onDone(result): result = { recorded: File|null, durationMs, mode } al terminar o cerrar
     App.teleprompter.close(); App.teleprompter.isOpen() */
(function () {
  "use strict";
  const App = window.App;
  let open = false;
  App.teleprompter = {
    open(o) { open = true; if (window.console) console.warn("teleprompter: pendiente", o && o.mode); open = false; if (o && o.onDone) o.onDone({ recorded: null, durationMs: 0, mode: o.mode }); },
    close() { open = false; },
    isOpen: () => open,
  };
})();
