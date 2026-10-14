/* Aura · modelo e intensidad. Una sola preferencia (el de siempre es Sonnet 5.5, intensidad media) que se ve y se cambia desde cualquier chat:
   Jarvis, el Estudio, el Laboratorio y Ajustes. En Crear se puede cambiar por pedido sin tocar el de siempre.
   Se aplica de verdad en las conversaciones que corren aqui (capacidad sample: model + effort) y se escribe en cada pedido para que Claude lo respete. */
(function () {
  "use strict";
  const App = window.App, { $, $$, esc, icon } = App;
  const MODELS = [
    { id: "claude-sonnet-5-5", name: "Sonnet 5.5", note: "El de siempre", tier: "default" },
    { id: "claude-opus-5-5", name: "Opus 5.5", note: "Para lo más difícil", tier: "complex" },
    { id: "claude-fable-5-1", name: "Fable 5.1", note: "", tier: "default" },
    { id: "claude-haiku-5-5", name: "Haiku 5.5", note: "El más rápido", tier: "quick" },
  ];
  const EFFORTS = [["low", "Baja", "Responde rápido"], ["medium", "Media", "Equilibrada"], ["high", "Alta", "Piensa más"]];
  const DEFAULT = { model: MODELS[0].id, effort: "medium" };
  const byId = (id) => MODELS.find((m) => m.id === id) || MODELS[0];
  const effName = (e) => (EFFORTS.find((x) => x[0] === e) || EFFORTS[1])[1];
  const clean = (v) => ({ model: MODELS.some((m) => m.id === (v || {}).model) ? v.model : DEFAULT.model, effort: EFFORTS.some((x) => x[0] === (v || {}).effort) ? v.effort : DEFAULT.effort });

  // contextos: "global" es lo de siempre (se guarda); otros (por ejemplo "draft" en Crear) se registran donde se usan y solo valen para ese pedido
  const contexts = {
    global: { get: () => clean(App.store.get("ai", {})), set: (p) => App.store.set("ai", { ...clean(App.store.get("ai", {})), ...p }), note: "Vale para Jarvis, el Estudio y el Laboratorio. Los videos nuevos también, salvo que lo cambies al pedirlos." },
  };
  const ctx = (k) => contexts[k] || contexts.global;
  const get = (k) => ctx(k).get();

  const label = (c) => `${byId(c.model).name} · ${effName(c.effort)}`;
  function pillHtml(k, cls) {
    k = k || "global"; const c = get(k);
    return `<button class="aipill ${cls || ""}" type="button" data-act="aipick" data-ai="${esc(k)}" aria-haspopup="menu" aria-expanded="false" aria-label="Modelo e intensidad: ${esc(label(c))}" title="Modelo e intensidad"><i class="aid" aria-hidden="true"></i><span class="ain">${esc(byId(c.model).name)}</span><span class="aie">${esc(effName(c.effort))}</span>${icon("chevdown")}</button>`;
  }
  function paint() {
    $$(".aipill").forEach((b) => { const c = get(b.dataset.ai); b.querySelector(".ain").textContent = byId(c.model).name; b.querySelector(".aie").textContent = effName(c.effort); b.setAttribute("aria-label", "Modelo e intensidad: " + label(c)); });
  }

  // opciones para la capacidad sample: el modelo y el esfuerzo que se pidieron; si ese modelo no esta disponible, responde el nivel equivalente
  function opts(k) { const c = get(k); return { model: c.model, effort: c.effort, modelTier: byId(c.model).tier }; }
  // lo que se escribe en cada pedido para que Claude lo respete
  function stamp(k) { const c = get(k); return { model: c.model, effort: c.effort, modelName: byId(c.model).name }; }
  const tellNote = (s) => `Modelo pedido: ${s.modelName} (${s.model}), intensidad ${effName(s.effort).toLowerCase()}.`;

  // ---------- menu ----------
  let menu = null, anchor = null, off = [];
  function close() {
    if (!menu) return; const m = menu, a = anchor; menu = null; anchor = null; off.forEach((f) => f()); off = [];
    if (a) { a.setAttribute("aria-expanded", "false"); try { a.focus({ preventScroll: true }); } catch (e) { /* sin foco */ } }
    if (App.reduceMotion() || !m.animate) { m.remove(); return; }
    m.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(.94)" }], { duration: 140, easing: "ease-in", fill: "forwards" }).finished.then(() => m.remove(), () => m.remove());
  }
  function menuHtml(k) {
    const c = get(k);
    return `<div class="aim-h">Modelo</div>${MODELS.map((m) => `<button type="button" role="menuitemradio" class="aim-m" aria-checked="${m.id === c.model}" data-m="${m.id}"><span><b>${esc(m.name)}</b>${m.note ? `<small>${esc(m.note)}</small>` : ""}</span>${icon("check")}</button>`).join("")}
      <div class="aim-h">Intensidad</div><div class="aim-seg" role="radiogroup" aria-label="Intensidad">${EFFORTS.map(([e, n]) => `<button type="button" role="radio" aria-checked="${e === c.effort}" data-e="${e}">${esc(n)}</button>`).join("")}</div>
      <p class="aim-e">${esc((EFFORTS.find((x) => x[0] === c.effort) || EFFORTS[1])[2])}</p><p class="aim-n">${esc(ctx(k).note || "")}</p>`;
  }
  function open(btn) {
    if (menu) { const same = anchor === btn; close(); if (same) return; }
    const k = btn.dataset.ai || "global", el = document.createElement("div");
    el.className = "aimenu lg solid-glass"; el.setAttribute("role", "menu"); el.setAttribute("aria-label", "Modelo e intensidad"); el.innerHTML = menuHtml(k);
    (document.querySelector(".aura-app") || document.body).appendChild(el);
    const r = btn.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight, below = innerHeight - r.bottom, up = r.top > below && below < h + 14;
    const left = Math.max(10, Math.min(innerWidth - w - 10, r.left + r.width / 2 - w / 2)), top = up ? Math.max(10, r.top - h - 10) : Math.min(innerHeight - h - 10, r.bottom + 10);
    el.style.left = left + "px"; el.style.top = top + "px"; el.style.transformOrigin = `${Math.round(r.left + r.width / 2 - left)}px ${up ? h : 0}px`;
    menu = el; anchor = btn; btn.setAttribute("aria-expanded", "true");
    const sel = el.querySelector('[aria-checked="true"].aim-m'); if (sel) sel.focus({ preventScroll: true });
    el.addEventListener("click", (e) => {
      const m = e.target.closest("[data-m]"), f = e.target.closest("[data-e]"); if (!m && !f) return;
      ctx(k).set(m ? { model: m.dataset.m } : { effort: f.dataset.e }); paint(); el.innerHTML = menuHtml(k);
      const again = el.querySelector(m ? `[data-m="${m.dataset.m}"]` : `[data-e="${f.dataset.e}"]`); if (again) again.focus({ preventScroll: true });
    });
    el.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.stopPropagation(); close(); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { const items = $$(".aim-m", el), i = items.indexOf(document.activeElement); if (i >= 0) { e.preventDefault(); items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length].focus(); } }
    });
    const out = (e) => { if (menu && !menu.contains(e.target) && !btn.contains(e.target)) close(); };
    setTimeout(() => document.addEventListener("pointerdown", out, true), 0); off.push(() => document.removeEventListener("pointerdown", out, true));
    const esc2 = (e) => { if (e.key === "Escape" && menu) { e.stopPropagation(); close(); } };
    document.addEventListener("keydown", esc2, true); off.push(() => document.removeEventListener("keydown", esc2, true));
    window.addEventListener("resize", close, { once: true });
  }
  App.acts.aipick = (el) => open(el);
  App.ai = { MODELS, EFFORTS, DEFAULT, contexts, get, label, pillHtml, paint, opts, stamp, tellNote, byId, effName, open, close };
})();
