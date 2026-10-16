/* Aura · Hoy: la frase del dia y las tarjetas de lo que sigue. */
(function () {
  "use strict";
  const App = window.App, S = App.S, sel = App.sel, { esc, icon, fmt, plural, ring, spark, vidThumb } = App;

  const greet = () => { const h = new Date().getHours(); return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches"; };
  const wave = '<i class="wv"><b style="height:6px"></b><b style="height:12px"></b><b style="height:8px"></b><b style="height:15px"></b><b style="height:7px"></b></i>';

  function runwayCard() {
    const rows = S.brands.map((b) => {
      const r = sel.runway(b), lv = sel.runwayLevel(r.days), p = Math.min(1, r.days / App.config.runwayTarget);
      return `<div class="rw" data-lv="${lv}">${ring(p, 76, { r: 40, sw: 8, inner: `<b class="num" style="font:400 24px/1 var(--font);letter-spacing:-.03em">${r.days}</b><small style="font-size:10.5px;color:var(--ink3)">días</small>`, color: lv === "bad" ? "var(--down)" : undefined })}
        <div class="rwi"><b>${esc(b.name)}</b><span class="muted">${r.last ? "Contenido hasta el " + sel.showDateL(r.last) : "Sin posts agendados"}</span>
        <span class="meta">${r.posts} agendados · ${r.pend} por aprobar</span>${r.waiting ? `<span class="wait">${r.waiting} sin agendar</span>` : ""}</div></div>`;
    }).join("");
    return `<a class="card lg span2" href="#crear" data-go="crear"><div class="ch">${icon("calendar")}Contenido asegurado<span class="sp"></span><span class="faint">meta ${App.config.runwayTarget} días</span></div><div class="rws">${rows || '<p class="muted">Sin cuentas todavía.</p>'}</div></a>`;
  }
  function approveCard() {
    const list = sel.allPending(), groups = sel.groupByPiece(list), first = list.slice(0, 5);
    if (!list.length) return `<div class="card lg"><div class="ch">${icon("check")}Por aprobar</div><div class="mini-empty"><b class="big-num">0</b><p class="muted">Todo decidido. ${App.say("Pedí", "Pide")} contenido nuevo para seguir.</p><a class="btn sm" href="#crear">Pedir un video</a></div></div>`;
    const thumbs = first.map((v) => { const r = App.pred.scoreVideo(v); return vidThumb(v, { score: r ? r.score : null, color: r ? App.pred.TIER_COLOR[r.tier] : undefined, cs: 8, style: "width:62px;height:110px" }); }).join("");
    return `<a class="card lg" href="#estudio" data-go="estudio"><div class="ch">${icon("check")}Por aprobar<span class="sp"></span><span class="chip apricot">${list.length}</span></div><div class="thumbs">${thumbs}</div><p class="muted" style="margin-top:12px">${groups.length} ${plural(groups.length, "pieza", "piezas")} · aprobar es dejarlas agendadas</p></a>`;
  }
  // analiticas a la vista apenas entras: las cuatro cifras de la semana con su curva, de todas las cuentas juntas
  function analyticsCard() {
    const evo = S.brands.map(sel.evoOf).filter(Boolean), loading = S.brands.some((b) => S.live[b.id] && S.live[b.id].loading);
    const head = (extra) => `<div class="ch">${icon("chart")}Redes · 7 días<span class="sp"></span>${extra || `<span class="faint">Métricas${icon("chevron")}</span>`}</div>`;
    if (!evo.length) return `<a class="card lg span2 an" href="#metricas" data-go="metricas">${head()}${loading ? `<div class="an-grid">${[0, 1, 2, 3].map(() => '<div class="skel an-sk"></div>').join("")}</div>` : `<div class="mini-empty"><p class="muted">Conecta Metricool y aquí ves vistas, seguidores e interacciones apenas entras.</p></div>`}</a>`;
    const sum = (k) => evo.reduce((a, e) => a + e[k], 0), avg = (k) => Math.round(evo.reduce((a, e) => a + (e[k] || 0), 0) / evo.length);
    const ser = (k, n) => { const len = evo[0][k].length, m = Math.min(n, len); return Array.from({ length: m }, (_, i) => evo.reduce((a, e) => a + e[k][len - m + i], 0)); };
    const net = sum("net"), tile = (name, val, delta, series, color, pre, sub) => `<div class="an-s"><span class="an-n">${name}</span><b class="an-v num" data-count="${Math.abs(val)}" data-compact="1"${pre ? ` data-pre="${pre}"` : ""}>${pre}${fmt(Math.abs(val))}</b>${delta != null ? `<span class="chip ${delta >= 0 ? "good" : "bad"}">${App.pctTxt(delta)}</span>` : sub ? `<span class="an-sub">${sub}</span>` : '<span class="an-sub">&nbsp;</span>'}<div class="spk">${series ? spark(series, 120, 34, { color }) : ""}</div></div>`;
    return `<a class="card lg span2 an" href="#metricas" data-go="metricas">${head()}<div class="an-grid">${tile("Vistas", sum("views"), avg("dViews"), ser("series", 14), "var(--accent)", "")}${tile("Seguidores", net, null, ser("fseries", 14), "var(--teal)", net >= 0 ? "+" : "−", `${fmt(sum("followers"))} en total`)}${tile("Interacciones", sum("inter"), avg("dInter"), ser("iseries", 14), "var(--apricot)", "")}${tile("Alcance", sum("reach"), avg("dReach"), null, "var(--rose)", "")}</div></a>`;
  }
  function requestsCard() {
    const reqs = sel.activeRequests().slice(0, 3), st = sel.studioActive().length;
    const rows = reqs.map((r) => { const steps = r.steps || [], p = steps.length ? steps.filter((s) => s.status === "hecho").length / steps.length : r.status === "produccion" ? 0.4 : 0.08; return `<li><div><b>${esc((r.topic || (r.hooks || [])[0] || "Pedido").slice(0, 46))}</b><span class="muted">${esc((sel.brand(r.brand) || {}).name || "")} · ${esc(STATUS[r.status || "pedido"] || r.status)}</span></div><div class="bar" style="--p:${Math.round(p * 100)}%"><i></i></div></li>`; }).join("");
    return `<a class="card lg span2" href="#crear" data-go="crear"><div class="ch">${icon("wand")}Claude trabajando<span class="sp"></span>${reqs.length + st ? `<span class="chip">${reqs.length + st}</span>` : ""}</div>${rows ? `<ul class="reqs">${rows}</ul>` : `<div class="mini-empty"><p class="muted">Nada en cola. ${App.say("Pedí", "Pide")} un video o ${App.say("subí", "sube")} material.</p></div>`}${st ? `<p class="muted" style="margin-top:10px">${st} ${plural(st, "cambio", "cambios")} del Estudio en curso</p>` : ""}</a>`;
  }
  const STATUS = { pedido: "Pedido", produccion: "En producción", revisar: "Listo para revisar", listo: "Terminado", bloqueado: "Bloqueado", cancelado: "Cancelado" };
  function todoCard() {
    const all = sel.todoItems(), items = all.slice(0, 3);
    const li = items.map((t) => { const u = sel.URGENCY[t.urgency] || sel.URGENCY.week; return `<li><i class="dot" style="--c:${t.urgency === "now" ? "var(--down)" : t.urgency === "today" ? "var(--apricot)" : "var(--ink3)"}"></i><div><b>${esc(t.title)}</b>${t.detail ? `<span class="muted">${esc(t.detail)}</span>` : ""}</div><span class="acts">${t.link ? `<a class="btn sm" href="${esc(t.link)}">Ir</a>` : ""}${t.auto ? "" : `<button class="btn sm ghost" data-act="tododone" data-id="${esc(t.id)}">Hecho</button>`}</span></li>`; }).join("");
    return `<div class="card lg span2"><div class="ch">${icon("flag")}${App.say("Para vos", "Para ti")}<span class="sp"></span><span class="faint">${all.length > 3 ? `${all.length - 3} más` : ""}</span></div>${li ? `<ul class="todo">${li}</ul>` : `<div class="mini-empty"><p class="muted">Todo al día. Nada que requiera tu mano ahora.</p></div>`}</div>`;
  }
  function labCard() {
    const r = S.expRounds.filter((x) => x.status !== "cerrada").sort((a, b) => String(b.created || "").localeCompare(String(a.created || "")))[0];
    if (!r) return `<a class="card lg" href="#laboratorio" data-go="laboratorio"><div class="ch">${icon("flask")}Laboratorio</div><div class="mini-empty"><p class="muted">Sin ronda abierta. ${App.say("Guardá", "Guarda")} referencias para armar la próxima.</p></div></a>`;
    const cs = S.expCards.filter((c) => c.round === r.id), done = cs.filter((c) => c.verdict).length;
    const tiles = cs.slice(0, 4).map((c) => `<span class="rtile ${c.verdict ? "v-" + c.verdict : ""}">${App.demoHtml(c.demo)}</span>`).join("");
    return `<a class="card lg" href="#laboratorio/ronda" data-go="laboratorio/ronda"><div class="ch">${icon("flask")}Ronda de estilo<span class="sp"></span><span class="faint">${done}/${cs.length}</span></div><div class="rtiles">${tiles}</div><div><div class="bar" style="--p:${cs.length ? Math.round((done / cs.length) * 100) : 0}%"><i></i></div><p class="muted" style="margin-top:10px">${cs.length - done ? `${cs.length - done} por calificar` : "Ronda completa. Envía tus cambios."}</p></div></a>`;
  }

  App.views.hoy = {
    title: "Hoy",
    render() {
      const ph = sel.phrase(), n = sel.allPending().length, prim = ph.cta === "aprobar" || n ? `<a class="btn pri lg2" href="#estudio" data-go="estudio">Empezar a aprobar${n ? `<b>${n}</b>` : ""}</a>` : `<a class="btn pri lg2" href="#crear" data-go="crear">Pedir un video</a>`;
      // mientras falten pasos de introduccion, una tarjeta chica arriba de todo lleva a "Empieza aquí" (DECISIONES.md #18)
      return `<div class="hoy">${App.onboarding ? App.onboarding.hoyCard() : ""}
        <section class="talk">
          <button class="orb" data-orb data-act="jarvis" type="button" aria-label="Hablar con Jarvis" style="width:var(--orb,132px);height:var(--orb,132px)"></button>
          <p class="hi">${esc(greet())}, ${esc(App.config.owner)} ${wave}</p>
          <h1 class="h-xl" aria-live="polite">${ph.html}</h1>
          <div class="acts">${prim}${n ? `<a class="btn lg2" href="#crear" data-go="crear">${icon("plus")}Pedir un video</a>` : ""}<a class="btn lg2" href="#estudio" data-go="estudio">${icon("film")}Abrir el Estudio</a></div>
        </section>
        <section class="cards rise">${analyticsCard()}${runwayCard()}${todoCard()}${approveCard()}${labCard()}${requestsCard()}</section></div>`;
    },
    bind(root) { App.observeDemos(root); App.trophies.ensureBaseline(App.trophies.all(App.trophies.cards())); App.celebrate.check(); },
  };
  App.acts.tododone = async (el) => { el.disabled = true; await App.act.markTodoDone(el.dataset.id); App.toast("Hecho. Un pendiente menos."); };
})();
