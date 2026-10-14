/* Aura · Logros: trofeos y niveles por hitos de redes. Celebracion (medalla con rebote y destellos) al desbloquear. */
(function () {
  "use strict";
  const App = window.App, S = App.S, UI = App.ui, sel = App.sel, { $, $$, esc, icon, fmt } = App, T = App.trophies;
  const scope = () => (UI.scope === "total" || !S.brands.some((b) => b.id === UI.scope) ? "total" : UI.scope);
  function medal(c, big) {
    const tier = c.tier >= 0 ? T.TIERS[c.tier] : null;
    return `<span class="medal ${big ? "big" : ""} ${tier ? "" : "locked"}" style="--m:${tier ? tier[1] : "#9fb0ac"}">${icon(c.def.icon)}</span>`;
  }
  function trCard(c, fresh) {
    const tier = c.tier >= 0 ? T.TIERS[c.tier] : null;
    const dots = c.steps.map((s, i) => `<li class="${c.value >= s ? "on" : ""}" style="--tc:${T.TIERS[T.tierOf(i, c.steps.length)][1]}" title="${esc(fmt(s))} · ${T.TIERS[T.tierOf(i, c.steps.length)][0]}"></li>`).join("");
    const next = c.next == null ? "Todos los escalones logrados" : `Próximo: ${T.TIERS[T.tierOf(c.got, c.steps.length)][0]} a ${fmt(c.next)} · faltan ${fmt(c.next - c.value)}`;
    return `<article class="tr lg ${fresh ? "fresh" : ""}" data-fresh="${fresh ? 1 : 0}" style="--tc:${tier ? tier[1] : "#9fb0ac"}">${medal(c)}<div class="trb"><h3>${esc(c.def.name)}${tier ? `<em>${tier[0]}</em>` : ""}</h3>${c.def.sub ? `<small class="muted">${esc(c.def.sub)}</small>` : ""}<b class="num trv" data-count="${c.value}" data-compact="1">${fmt(c.value)}</b><div class="bar" style="--p:${Math.round(c.ratio * 100)}%"><i></i></div><small class="muted">${next}</small><ol class="steps5" aria-label="Escalones">${dots}</ol></div></article>`;
  }
  App.views.logros = {
    title: "Logros",
    render() {
      const cs = T.cards(), all = T.all(cs), lv = T.level(T.totalXp(cs)), nw = T.newIds(all), nwSet = new Set(nw), sc = scope(), list = sc === "total" ? cs.total : cs.brands[sc] || [];
      const fresh = (c) => c.ids.some((id) => nwSet.has(id)), near = all.filter((x) => x.next != null && x.value > 0).sort((a, b) => b.ratio - a.ratio).slice(0, 3);
      const chips = [["total", "Total"], ...S.brands.map((b) => [b.id, b.name])].map(([k, n]) => `<button type="button" class="${k === sc ? "on" : ""}" aria-pressed="${k === sc}" data-act="mscope" data-k="${esc(k)}">${esc(n)}</button>`).join("");
      return `<div class="vhead"><div class="t"><span class="eyebrow">Nivel ${lv.level}</span><h1 class="h-l">Tus <em>logros</em> en redes</h1><p class="muted">Cada hito de seguidores, vistas e interacciones suma experiencia. Solo redes sociales.</p></div></div>
        <section class="lvlhero lg card"><div class="lvbadge"><b class="num" data-count="${lv.level}">${lv.level}</b><small>NIVEL</small></div><div class="lvi"><div class="lvt"><strong class="num">${fmt(lv.xp)} XP</strong><span class="muted">${fmt(lv.to - lv.xp)} XP para el nivel ${lv.level + 1}</span></div><div class="bar big" style="--p:${Math.round(Math.min(1, Math.max(0, lv.ratio)) * 100)}%"><i></i></div>
          <div class="nextrow">${near.map((x) => `<span class="chip">${esc(x.def.name)}: faltan ${fmt(x.next - x.value)}</span>`).join("")}</div></div>
          ${nw.length ? `<div class="newb"><b>¡Logros nuevos!</b><span>${nw.length} ${nw.length === 1 ? "nuevo" : "nuevos"} desde la última vez</span><button class="btn pri" type="button" data-act="trseen">¡Genial!</button></div>` : ""}</section>
        <div class="tabs"><div class="seg lg" role="tablist">${chips}</div></div>
        <div class="trs rise">${list.map((c) => trCard(c, fresh(c))).join("")}</div>`;
    },
    bind(root) {
      T.ensureBaseline(T.all(T.cards()));
      const fresh = $$(".tr[data-fresh='1']", root); fresh.forEach((el, i) => setTimeout(() => { const m = el.querySelector(".medal"); m.classList.add("drop"); App.morph.sparkles(m, 4); }, 400 + i * 350));
    },
    update() { return false; },
  };
  App.acts.trseen = () => { const ids = T.newIds(T.all(T.cards())); T.markSeen(ids); App.toast("¡Genial! Seguimos hacia el próximo nivel."); };
})();
