/* Aura · predictor de viralidad. Misma formula y mismos puntos que el portal (copiada de scoreVideo/satWords/evidenceText);
   solo cambia que lee los videos de App.S y el idioma de la cuenta de App.config. Si el espacio no tiene datos (App.PRED nulo) el predictor se apaga. */
(function () {
  "use strict";
  const App = window.App;
  App.PRED = window.__PRED || null;
  const PRED = () => App.PRED;
  const STOP = new Set(("this that your they with what have from about there every will when then than them their were been into just like more some very only also would could should because which while where after before esto este esta estos estas para como cada pero solo sobre entre desde hasta tiene tienen puede pueden cuando donde porque también está están hace hacer ser son sus mis tus nunca siempre todo todos toda todas otro otra").split(" "));
  const FX_NAMES = { none: "sin cambio visual", zoom: "zoom leve", mirror: "espejo", pulse: "pulsos de zoom" };
  const hookText = (v) => String(v.hook || "").replace(/\s*\/\s*/g, " ").trim();
  const hookWords = (s) => s.match(/[\p{L}\p{N}'$]+/gu) || [];
  let feats = null;
  const features = () => { if (!feats) feats = PRED() ? PRED().features.map((f) => ({ ...f, rx: new RegExp(f.re, "i") })) : []; return feats; };
  App.predPool = {};
  const langOf = (v) => { const b = App.S.brands.find((x) => x.id === v.brand); return (b && b.lang) || "es"; };

  function satWords(v) { // palabras del gancho que ya aparecen en 1 de cada 4 ganchos de la misma cuenta
    const lang = langOf(v), P = PRED();
    if (!App.predPool[v.brand]) {
      const texts = new Set(((P.hist_hooks || {})[lang] || []).map((x) => x.toLowerCase()));
      App.S.videos.filter((x) => x.brand === v.brand).forEach((x) => texts.add(hookText(x).toLowerCase()));
      const counts = new Map(), all = [...texts];
      all.forEach((s) => new Set((s.match(/[\p{L}']{4,}/gu) || []).filter((w) => !STOP.has(w))).forEach((w) => counts.set(w, (counts.get(w) || 0) + 1)));
      App.predPool[v.brand] = { counts, total: all.length };
    }
    const { counts, total } = App.predPool[v.brand];
    return [...new Set((hookText(v).toLowerCase().match(/[\p{L}']{4,}/gu) || []).filter((w) => !STOP.has(w)))]
      .map((w) => [w, counts.get(w) || 0]).filter(([, c]) => c >= 6 && c / total >= 0.25).map(([w, c]) => `"${w}" en ${c} de ${total}`);
  }
  const pctOf = (a, b) => (b ? Math.round((100 * a) / b) + "%" : "-");
  function evidenceText(f) {
    const e = f.evidence, thr = App.config.viralThreshold || 1000;
    if (e && e.n_con >= 4 && e.n_sin >= 6) return `En los ganchos medidos: ${e.ok_con} de ${e.n_con} con esto pasaron ${thr} vistas (${pctOf(e.ok_con, e.n_con)}), contra ${e.ok_sin} de ${e.n_sin} sin esto (${pctOf(e.ok_sin, e.n_sin)}).`;
    return `Regla de la fórmula: ${f.source}. Todavía sin datos propios suficientes.`;
  }
  function scoreVideo(v) {
    const P = PRED(); if (!P || !App.config.features.predictor) return null;
    const t = hookText(v), n = hookWords(t).length, parts = [], FT = features();
    let raw = P.base;
    const add = (label, pts, why, kind, fix) => { raw += pts; parts.push({ label, pts, why, kind, fix }); };
    if (n >= 5 && n <= 12) add("Largo ideal", 5, `${n} palabras: dentro de 5 a 12, el rango de los ganchos que se comparten.`, "formula");
    else if (n >= 13 && n <= 15) add("Largo justo", 2, `${n} palabras: entra, pero está al límite de 2 líneas.`, "formula");
    else if (n >= 16) add("Muy largo", -8, `${n} palabras: pasa de 15 y se parte en más de 2 líneas.`, "formula", "Acortarlo a 12 palabras o menos: tiene que leerse en 2 líneas.");
    else add("Muy corto", -4, `${n} palabras: casi no promete nada.`, "formula", "Sumarle la promesa o el objeto concreto.");
    FT.forEach((f) => {
      if (!f.rx.test(t)) return;
      add(f.label, f.pts, evidenceText(f), f.pts >= 0 ? "formula" : "riesgo", f.pts < 0 ? "Sacarle esto al gancho: " + f.label.toLowerCase() + "." : "");
    });
    const sat = satWords(v);
    if (sat.length) add("Palabra muy repetida", -Math.min(8, 3 * sat.length), `Ya se usó en muchos ganchos de esta cuenta: ${sat.join(", ")}. Pierde el efecto de sorpresa.`, "riesgo", "Cambiar " + sat[0].split('"')[1] + " por otra palabra que todavía no se haya usado.");
    const sibs = App.S.videos.filter((x) => x.brand === v.brand && x.piece === v.piece);
    if (v.fx) add("Se ve distinta a las otras versiones", 4, `Tiene ${FX_NAMES[v.fx] || v.fx}: Instagram no la lee como copia de las otras versiones de la pieza.`, "prod");
    else if ((v.version || 1) > 1 && sibs.length > 1) add("Se parece demasiado a las otras versiones", -5, "El video es casi el mismo que el de las otras versiones de esta pieza, solo cambia el texto del gancho. Instagram las puede marcar como duplicadas y solo una recibe vistas.", "riesgo", "Rehacer esta versión con zoom, espejo o pulsos de zoom para que se vea distinta (lo hace Claude).");
    if (v.flag && /intro/i.test(v.flag)) add("Intro repetido en otra pieza", -6, "Este mismo intro ya salió con otra persona en esta cuenta.", "riesgo", "Grabar un intro nuevo para esta pieza.");
    const sc = P.scale;
    const score = Math.max(sc.min, Math.min(sc.max, Math.round(50 + sc.slope * (raw - sc.center))));
    const tier = score >= sc.green ? "green" : score >= sc.amber ? "amber" : "red";
    const lg = Math.log(P.base_rate / (1 - P.base_rate)) + sc.logit_slope * (raw - sc.center);
    const prob = Math.round(100 / (1 + Math.exp(-lg)));
    const fb = parts.filter((p) => p.fix).sort((a, b) => a.pts - b.pts).map((p) => p.fix);
    const thr = App.config.viralThreshold || 1000;
    if (score < sc.green) {
      const have = (id) => FT.some((f) => f.id === id && f.rx.test(t)), ev = (id) => FT.find((f) => f.id === id);
      if (!have("promesa") && ev("promesa")) { const e = ev("promesa").evidence; if (e) fb.push(`Abrir con una promesa directa ("Esto es...", "Así...", "this is how..."): ${e.ok_con} de ${e.n_con} ganchos con promesa pasaron ${thr} vistas.`); }
      if (!have("objeto") && !have("tiempo")) fb.push("Sumar un objeto, ritual o tiempo concreto (una hoja, una tinta, 30 minutos, $2): es lo que mejor rindió en los datos.");
      if (have("pregunta")) fb.push("Evitar la pregunta con signo de interrogación: en los datos ninguno pasó " + thr + " vistas.");
    }
    const forOwner = (x) => /intro nuevo|grabar/i.test(x); // lo que solo puede hacer Claude no es tarea de la persona
    return { score, raw: Math.round(raw * 10) / 10, tier, prob, parts, fb: fb.filter(forOwner).slice(0, 3), fbClaude: fb.filter((x) => !forOwner(x)).slice(0, 3), words: n };
  }
  const TIER_TXT = { green: "Verde, bueno: se parece a lo que sí funcionó", amber: "Amarillo, regular: se puede mejorar", red: "Rojo, flojo: se parece a lo que no funcionó" };
  const TIER_COLOR = { green: "var(--up)", amber: "var(--warn)", red: "var(--down)" };
  function groupScore(vs) {
    const s = vs.map(scoreVideo).filter(Boolean); if (!s.length) return null;
    const avg = Math.round(s.reduce((a, x) => a + x.score, 0) / s.length), sc = PRED().scale;
    return { avg, tier: avg >= sc.green ? "green" : avg >= sc.amber ? "amber" : "red" };
  }
  App.pred = { scoreVideo, groupScore, TIER_TXT, TIER_COLOR, hookText, FX_NAMES, enabled: () => !!(PRED() && App.config.features.predictor) };
})();
