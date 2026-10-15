/* Aura · Métricas: solo redes sociales. Vistas, seguidores, interacciones y alcance por cuenta o en total; mejores reels y ritmo de publicacion. */
(function () {
  "use strict";
  const App = window.App, S = App.S, UI = App.ui, sel = App.sel, { $, $$, esc, icon, fmt, fmtFull, pctTxt, spark, barsSvg, plural, vidThumb } = App;
  UI.m = UI.m || { range: App.store.get("m-range", "30"), metric: App.store.get("m-metric", "views"), rank: 8 };
  const RANGES = [["7", "7 días"], ["30", "30 días"], ["90", "90 días"]];
  const METRICS = [["views", "Vistas"], ["reach", "Alcance"], ["inter", "Interacciones"], ["likes", "Likes"], ["saved", "Guardados"], ["shares", "Compartidos"], ["comments", "Comentarios"]];
  const scopeBrands = () => (UI.scope === "total" || !S.brands.some((b) => b.id === UI.scope) ? S.brands : S.brands.filter((b) => b.id === UI.scope));

  function rowsFor(brands, days) {
    const from = Date.now() - days * sel.DAY, out = [];
    brands.forEach((b) => sel.enrich(b, sel.rowsOf(b)).forEach((r) => { if (r.t >= from) out.push({ ...r, brand: b }); }));
    return out.sort((a, c) => c.t - a.t);
  }
  function daily(rows, days, key) {
    const now = Date.now(), by = {}; rows.forEach((r) => { const k = sel.dayKeyL(r.t); by[k] = (by[k] || 0) + (r[key] || 0); });
    return Array.from({ length: days }, (_, i) => by[sel.dayKeyL(now - (days - 1 - i) * sel.DAY)] || 0);
  }
  function chart(series, color) {
    const W = 760, H = 220, mx = Math.max(...series, 1), n = series.length, pts = series.map((v, i) => [i * (W / Math.max(1, n - 1)), 10 + (H - 24) * (1 - v / mx)]);
    const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" "), id = "mc" + Math.random().toString(36).slice(2, 6);
    const grid = [0.25, 0.5, 0.75].map((g) => `<line x1="0" x2="${W}" y1="${(10 + (H - 24) * g).toFixed(0)}" y2="${(10 + (H - 24) * g).toFixed(0)}" stroke="var(--hair2)" stroke-dasharray="3 6"/>`).join("");
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Evolución diaria" style="color:${color || "var(--accent)"}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".3"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>${grid}<path d="${line} L${W} ${H} L0 ${H} Z" fill="url(#${id})"/><path class="ln" pathLength="1" d="${line}" fill="none" stroke="currentColor" stroke-width="2.4" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
  }
  const stat = (label, val, delta, series, sub, color) => `<div class="card lg stat"><div class="ch">${label}<span class="sp"></span>${delta != null ? `<span class="chip ${delta >= 0 ? "good" : "bad"}">${pctTxt(delta)}</span>` : ""}</div><div class="big-num" data-count="${val}" data-compact="1">${fmt(val)}</div>${sub ? `<p class="muted">${sub}</p>` : ""}${series ? `<div class="spk">${spark(series, 220, 48, { color })}</div>` : ""}</div>`;

  App.views.metricas = {
    title: "Métricas",
    render() {
      const brands = scopeBrands(), days = +UI.m.range, mk = UI.m.metric, mname = (METRICS.find((m) => m[0] === mk) || METRICS[0])[1];
      const evos = brands.map(sel.evoOf).filter(Boolean), rows = rowsFor(brands, days), cur7 = rows.filter((r) => r.t >= Date.now() - 7 * sel.DAY);
      const evViews = evos.reduce((a, e) => a + e.views, 0), evInter = evos.reduce((a, e) => a + e.inter, 0), evReach = evos.reduce((a, e) => a + e.reach, 0), net = evos.reduce((a, e) => a + e.net, 0), followers = evos.reduce((a, e) => a + e.followers, 0);
      const dV = evos.length ? Math.round(evos.reduce((a, e) => a + (e.dViews || 0), 0) / evos.length) : null, dI = evos.length ? Math.round(evos.reduce((a, e) => a + (e.dInter || 0), 0) / evos.length) : null;
      const sumSer = (k) => (evos.length ? evos[0][k].map((_, i) => evos.reduce((a, e) => a + e[k][i], 0)) : null);
      const stamp = Math.min(...brands.map(sel.stampOf).filter(Boolean), Infinity), loading = brands.some((b) => S.live[b.id] && S.live[b.id].loading), errs = brands.map((b) => S.live[b.id] && S.live[b.id].error).filter(Boolean);
      const series = daily(rows, Math.min(days, 90), mk), total = series.reduce((a, b) => a + b, 0);
      const top = rows.slice().sort((a, c) => c[mk] - a[mk]).slice(0, UI.m.rank);
      const hours = {}; rows.forEach((r) => { const h = sel.local(r.t).getUTCHours(); (hours[h] = hours[h] || []).push(r.views); });
      const best = Object.entries(hours).filter(([, v]) => v.length >= 2).map(([h, v]) => [+h, v.reduce((a, b) => a + b, 0) / v.length]).sort((a, b) => b[1] - a[1]).slice(0, 3);
      const future = Array.from({ length: 14 }, (_, i) => { const k = sel.dayKeyL(Date.now() + i * sel.DAY); return brands.reduce((a, b) => a + sel.slotsOf(b).filter((x) => sel.dayKeyL(x.ms) === k && x.ms > Date.now()).length, 0); });
      const gaps = future.filter((n) => n === 0).length;
      const scopeSeg = `<div class="seg lg" role="tablist"><button type="button" class="${UI.scope === "total" ? "on" : ""}" aria-pressed="${UI.scope === "total"}" data-act="mscope" data-k="total">Total</button>${S.brands.map((b) => `<button type="button" class="${UI.scope === b.id ? "on" : ""}" aria-pressed="${UI.scope === b.id}" data-act="mscope" data-k="${esc(b.id)}">${esc(b.name)}</button>`).join("")}</div>`;
      const rangeSeg = `<div class="seg lg">${RANGES.map(([k, n]) => `<button type="button" class="${UI.m.range === k ? "on" : ""}" aria-pressed="${UI.m.range === k}" data-act="mrange" data-k="${k}">${n}</button>`).join("")}</div>`;
      const head = `<div class="vhead"><div class="t"><span class="eyebrow">${UI.scope === "total" ? "Todas las cuentas" : esc(sel.brand(UI.scope).name)}</span><h1 class="h-l">Cómo van tus <em>redes</em></h1><p class="muted">${Number.isFinite(stamp) ? "Datos de Metricool, " + App.ago(stamp) + "." : "Todavía no hay datos cargados."} ${errs.length ? `<span class="warn">${esc(errs[0])}</span>` : ""}</p></div>
        <div class="r"><button class="btn" type="button" data-act="mrefresh" ${loading ? "disabled" : ""}>${icon("refresh")}${loading ? "Actualizando…" : "Actualizar"}</button></div></div><div class="tabs">${scopeSeg}${rangeSeg}</div>`;
      if (!evos.length && !rows.length) return head + `<div class="empty card lg"><span class="orb"></span><h3>${loading ? "Trayendo tus números…" : "Aún no hay datos de redes"}</h3><p>${loading ? "Un momento." : "Conecta Metricool y toca Actualizar para ver vistas, seguidores e interacciones."}</p>${loading ? "" : `<button class="btn pri" type="button" data-act="mrefresh">Actualizar</button>`}</div>`;
      const top3 = top.map((r, i) => { const v = r.m && S.videos.find((x) => x.id === `${r.brand.id}_${r.m.piece}_v${r.m.v}`); return `<li><span class="rk">${i + 1}</span>${v ? vidThumb(v, { cap: false, style: "width:40px;height:70px;border-radius:10px" }) : `<span class="vid" style="width:40px;height:70px;border-radius:10px;background:var(--accent-soft)"></span>`}<div class="rm"><b>${esc(sel.reelName(r))}</b><small>${esc(r.brand.name)} · ${App.showDate(r.t)}${r.hook ? " · " + esc(r.hook.slice(0, 50)) : ""}</small></div><div class="rv"><b class="num">${fmt(r[mk])}</b><small>${(r.rate * 100).toFixed(1).replace(".", ",")}% inter.</small></div>${r.url ? `<a class="x" href="${esc(r.url)}" target="_blank" rel="noopener" aria-label="Ver en la red">${icon("out")}</a>` : "<span></span>"}</li>`; }).join("");
      return head + `<div class="stats rise">${stat("Vistas · 7 días", evos.length ? evViews : cur7.reduce((a, r) => a + r.views, 0), dV, sumSer("series"), "", "var(--accent)")}${stat("Seguidores nuevos", net, null, sumSer("fseries"), `${fmtFull(followers)} en total`, "var(--teal)").replace(/data-count="(-?\d+)"/, (m, v) => `data-count="${v}" data-pre="${+v >= 0 ? "+" : ""}"`)}${stat("Interacciones · 7 días", evos.length ? evInter : cur7.reduce((a, r) => a + r.inter, 0), dI, sumSer("iseries"), "", "var(--apricot)")}${stat("Alcance · 7 días", evos.length ? evReach : cur7.reduce((a, r) => a + r.reach, 0), null, null, `${rows.length} ${plural(rows.length, "reel", "reels")} en ${days} días`)}</div>
        <section class="card lg bigchart"><div class="ch">${icon("trend")}${mname} por día<span class="sp"></span><span class="faint">${fmtFull(total)} en ${days} días</span></div><div class="mchips">${METRICS.map(([k, n]) => `<button class="chip fil ${k === mk ? "on" : ""}" type="button" data-act="mmetric" data-k="${k}">${n}</button>`).join("")}</div><div class="chartbox">${chart(series, "var(--accent)")}</div></section>
        <div class="grid cols2"><section class="card lg"><div class="ch">${icon("star")}Mejores reels · ${mname.toLowerCase()}</div>${top.length ? `<ol class="top">${top3}</ol>${rows.length > UI.m.rank ? `<button class="btn sm ghost" type="button" data-act="mmore">Ver más</button>` : ""}` : `<p class="muted">Sin reels en este rango.</p>`}</section>
          <section class="card lg"><div class="ch">${icon("calendar")}Ritmo de publicación<span class="sp"></span><span class="faint">próximos 14 días</span></div><div class="pace">${barsSvg(future, 280, 96, { color: "var(--accent)", gap: 5 })}</div><p class="muted">${gaps ? `<b>${gaps} ${plural(gaps, "día", "días")}</b> sin nada agendado en las próximas dos semanas.` : "Hay algo agendado todos los días."}</p>
          ${best.length ? `<div class="besth"><span class="eyebrow">Mejores horas para publicar</span><div>${best.map(([h, v]) => `<span class="chip">${App.pad(h)}:00 · ${fmt(v)} vistas</span>`).join("")}</div></div>` : ""}
          ${S.brands.length > 1 && UI.scope === "total" ? `<div class="cmp"><span class="eyebrow">Por cuenta · 7 días</span>${S.brands.map((b) => { const e = sel.evoOf(b); return `<div class="cmprow"><i class="dot" style="--c:${esc(b.color || "var(--accent)")}"></i><b>${esc(b.name)}</b><span class="num">${e ? fmt(e.views) : "–"}</span><span class="muted">${e ? (e.net >= 0 ? "+" : "") + e.net + " seg." : ""}</span></div>`; }).join("")}</div>` : ""}</section></div>`;
    },
    // "home" tambien dispara un nuevo bind (y por lo tanto una nueva revisión de hitos): ahi vive home/trophies, y el baseline
    // se escribe de forma asincrona -- la primera llamada a bind() puede correr antes de que esa escritura se asiente.
    update(kinds) { return !(kinds.has("metrics") || kinds.has("evolution") || kinds.has("schedule") || kinds.has("videos") || kinds.has("home")); },
    // Hitos (reemplaza a la antigua pestaña "Logros", DECISIONES.md #1): sin pantalla propia. Al abrir Métricas (y al abrir la
    // app en Hoy, ver celebrate.js) se revisa si se cruzo un numero nuevo desde la ultima vez y, si es asi, se celebra con la
    // misma transicion morph que el resto de la plataforma -- nunca una pantalla ni un panel aparte para "ver los logros".
    bind() { App.trophies.ensureBaseline(App.trophies.all(App.trophies.cards())); App.celebrate.check(); },
  };
  const A = App.acts;
  A.mscope = (el) => { UI.scope = el.dataset.k; App.store.set("scope", UI.scope); App.render(true); };
  A.mrange = (el) => { UI.m.range = el.dataset.k; App.store.set("m-range", UI.m.range); App.render(true); };
  A.mmetric = (el) => { UI.m.metric = el.dataset.k; App.store.set("m-metric", UI.m.metric); App.render(true); };
  A.mmore = () => { UI.m.rank += 10; App.render(true); };
  A.mrefresh = () => App.act.refreshAllMetrics();
})();
