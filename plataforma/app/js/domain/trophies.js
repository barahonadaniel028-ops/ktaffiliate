/* Aura · logros. Solo redes sociales (sin dinero). Misma mecanica que el portal: escalones por metrica, niveles por XP, celebracion al desbloquear.
   Se guarda en la base unicamente cuales logros ya vio la persona (home/trophies). */
(function () {
  "use strict";
  const App = window.App, S = App.S, sel = App.sel, { n0, fmt } = App;
  const TIERS = [["Bronce", "#d9904f"], ["Plata", "#c9d2dc"], ["Oro", "#ffcf6e"], ["Platino", "#7fe8ff"], ["Diamante", "#b693ff"]];
  const POINTS = [1, 2, 5, 10, 25], XP_BASE = 25;
  const DEFS = {
    followers: { name: "Seguidores", icon: "users", steps: [1000, 2500, 5000, 10000, 25000, 50000, 100000] },
    views: { name: "Vistas de reels", sub: "últimos 150 días", icon: "eye", steps: [10000, 25000, 50000, 100000, 250000, 500000, 1000000] },
    inter: { name: "Interacciones", sub: "likes, comentarios, guardados y compartidos", icon: "heart", steps: [500, 1000, 2500, 5000, 10000, 25000, 50000] },
    best: { name: "Reel más visto", sub: "vistas de un solo reel", icon: "zap", steps: [1000, 5000, 10000, 50000, 100000, 250000, 1000000] },
    reels: { name: "Reels publicados", sub: "incluye Trial Reels", icon: "film", steps: [25, 50, 100, 250, 500, 1000] },
    weekViews: { name: "Vistas en 7 días", icon: "trend", steps: [1000, 2500, 5000, 10000, 25000, 50000] },
    weekFollowers: { name: "Seguidores nuevos en 7 días", icon: "users", steps: [10, 25, 50, 100, 250] },
    streak: { name: "Racha de contenido", sub: "días seguidos con una publicación agendada", icon: "fire", steps: [3, 7, 14, 21, 30, 60] },
  };
  const KEYS = Object.keys(DEFS);
  const tierOf = (i, n) => Math.min(TIERS.length - 1, Math.round((i * (TIERS.length - 1)) / Math.max(1, n - 1)));

  function streakOf(b) { // dias consecutivos (desde hoy hacia adelante) con al menos un post agendado
    const days = new Set(sel.slotsOf(b).map((x) => sel.dayKeyL(x.ms))); let n = 0; const t0 = Date.now();
    for (let i = 0; i < 90; i++) { if (days.has(sel.dayKeyL(t0 + i * sel.DAY))) n++; else break; }
    return n;
  }
  function socialOf(b) {
    const rows = sel.rowsOf(b), e = sel.evoOf(b);
    return { followers: e ? e.followers : 0, views: sel.sumBy(rows, "views"), inter: sel.sumBy(rows, "inter"), best: rows.reduce((m, r) => Math.max(m, r.views), 0), reels: rows.length, weekViews: e ? e.views : 0, weekFollowers: e ? Math.max(0, e.net) : 0, streak: streakOf(b) };
  }
  function totalSocial() {
    const parts = S.brands.map(socialOf), add = (k) => parts.reduce((a, p) => a + p[k], 0);
    return { followers: add("followers"), views: add("views"), inter: add("inter"), best: parts.reduce((m, p) => Math.max(m, p.best), 0), reels: add("reels"), weekViews: add("weekViews"), weekFollowers: add("weekFollowers"), streak: parts.reduce((m, p) => Math.max(m, p.streak), 0) };
  }
  function card(group, key, value) {
    const def = DEFS[key], steps = def.steps, got = steps.filter((s) => value >= s).length, next = steps[got] != null ? steps[got] : null, prev = got ? steps[got - 1] : 0, tier = got ? tierOf(got - 1, steps.length) : -1;
    return { id: group + ":" + key, group, key, def, value, got, steps, next, tier, ratio: next ? Math.min(1, Math.max(0, (value - prev) / (next - prev))) : 1,
      ids: steps.slice(0, got).map((s) => `${group}:${key}:${s}`), xp: steps.slice(0, got).reduce((a, s, i) => a + POINTS[tierOf(i, steps.length)], 0) };
  }
  function cards() {
    const out = { total: [], brands: {} }, tot = totalSocial();
    out.total = KEYS.map((k) => card("total", k, tot[k]));
    S.brands.forEach((b) => { const s = socialOf(b); out.brands[b.id] = KEYS.map((k) => card(b.id, k, s[k])); });
    return out;
  }
  const all = (c) => [...c.total, ...Object.values(c.brands).flat()];
  function level(xp) { const lv = Math.floor(Math.sqrt(xp / XP_BASE)) + 1, from = XP_BASE * (lv - 1) * (lv - 1), to = XP_BASE * lv * lv; return { level: lv, xp, from, to, ratio: (xp - from) / (to - from) }; }
  const totalXp = (c) => c.total.reduce((a, x) => a + x.xp, 0);
  const seen = () => (S.trophyDoc && S.trophyDoc.seen) || {};
  const newIds = (cs) => (!S.trophyDoc || !S.trophyDoc.baseline ? [] : cs.flatMap((c) => c.ids).filter((id) => !seen()[id]));
  const dataReady = () => S.brands.length > 0 && S.brands.every((b) => sel.evoOf(b) && sel.rowsOf(b).length);
  let baselining = false;
  async function ensureBaseline(cs) {
    if (baselining || !S.ready.home || (S.trophyDoc && S.trophyDoc.baseline) || !dataReady() || !App.adapter().canWrite()) return;
    baselining = true; const at = App.stamp(), s = Object.fromEntries(cs.flatMap((c) => c.ids).map((id) => [id, at]));
    S.trophyDoc = { baseline: at, seen: s, level: level(totalXp(cards())).level }; // la primera vez: lo ya logrado queda como visto; solo se celebra lo que llegue despues
    if (!(await App.data.set("home", "trophies", S.trophyDoc))) { S.trophyDoc = null; baselining = false; }
  }
  async function markSeen(ids) {
    const at = App.stamp(), s = { ...seen(), ...Object.fromEntries(ids.map((id) => [id, at])) };
    S.trophyDoc = { ...(S.trophyDoc || {}), seen: s, level: level(totalXp(cards())).level }; App.emit("home");
    if (!(await App.data.set("home", "trophies", S.trophyDoc))) App.toast("No se pudo guardar. Prueba de nuevo.");
  }
  // lo nuevo, listo para celebrar: un logro por tarjeta (el escalon mas alto que alcanzo), los de "todas las cuentas" primero, y la subida de nivel si la hubo
  const UNIT = { followers: (n) => `${fmt(n)} seguidores`, views: (n) => `${fmt(n)} vistas`, inter: (n) => `${fmt(n)} interacciones`, best: (n) => `un reel con ${fmt(n)} vistas`, reels: (n) => `${fmt(n)} reels publicados`, weekViews: (n) => `${fmt(n)} vistas en 7 días`, weekFollowers: (n) => `${fmt(n)} seguidores nuevos en 7 días`, streak: (n) => `${n} días de contenido seguidos` };
  function fresh() {
    const cs = cards(), a = all(cs), nw = new Set(newIds(a)); if (!nw.size) return null;
    const items = [];
    a.forEach((c) => {
      const idx = c.steps.map((st, i) => (nw.has(`${c.group}:${c.key}:${st}`) ? i : -1)).filter((i) => i >= 0); if (!idx.length) return;
      const top = idx[idx.length - 1], brand = c.group === "total" ? null : S.brands.find((b) => b.id === c.group);
      items.push({ id: c.id, group: c.group, brand: brand ? brand.name : "", key: c.key, def: c.def, step: c.steps[top], tier: tierOf(top, c.steps.length), extra: idx.length - 1, xp: idx.reduce((x, i) => x + POINTS[tierOf(i, c.steps.length)], 0), ids: idx.map((i) => `${c.group}:${c.key}:${c.steps[i]}`), line: UNIT[c.key] ? UNIT[c.key](c.steps[top]) : fmt(c.steps[top]) });
    });
    items.sort((x, y) => (x.group === "total" ? 0 : 1) - (y.group === "total" ? 0 : 1) || y.tier - x.tier);
    const lv = level(totalXp(cs)), before = S.trophyDoc && S.trophyDoc.level, up = before && lv.level > before ? { from: before, to: lv.level, xp: lv.xp, ratio: lv.ratio, left: lv.to - lv.xp } : null;
    return { items, ids: [...nw], xp: items.filter((x) => x.group === "total").reduce((x, i) => x + i.xp, 0), level: up, now: lv };
  }
  App.trophies = { TIERS, DEFS, KEYS, UNIT, tierOf, cards, all, level, newIds, fresh, ensureBaseline, markSeen, seen, totalXp, fmtVal: (v) => fmt(v) };
})();
