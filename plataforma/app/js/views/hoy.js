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
        <span class="bits"><em>${r.posts} agendados</em><em>${r.pend} por aprobar</em>${r.waiting ? `<em>${r.waiting} sin agendar</em>` : ""}</span></div></div>`;
    }).join("");
    return `<a class="card lg span2" href="#crear" data-go="crear"><div class="ch">${icon("calendar")}Contenido asegurado<span class="sp"></span><span class="faint">meta ${App.config.runwayTarget} días</span></div><div class="rws">${rows || '<p class="muted">Sin cuentas todavía.</p>'}</div></a>`;
  }
  function approveCard() {
    const list = sel.allPending(), groups = sel.groupByPiece(list), first = list.slice(0, 5);
    if (!list.length) return `<div class="card lg"><div class="ch">${icon("check")}Por aprobar</div><div class="mini-empty"><b class="big-num">0</b><p class="muted">Todo decidido. ${App.say("Pedí", "Pide")} contenido nuevo para seguir.</p><a class="btn sm" href="#crear">Pedir un video</a></div></div>`;
    const thumbs = first.map((v) => { const r = App.pred.scoreVideo(v); return vidThumb(v, { score: r ? r.score : null, color: r ? App.pred.TIER_COLOR[r.tier] : undefined, cs: 8, style: "width:62px;height:110px" }); }).join("");
    return `<a class="card lg" href="#aprobar" data-go="aprobar"><div class="ch">${icon("check")}Por aprobar<span class="sp"></span><span class="chip apricot">${list.length}</span></div><div class="thumbs">${thumbs}</div><p class="muted" style="margin-top:12px">${groups.length} ${plural(groups.length, "pieza", "piezas")} · aprobar es dejarlas agendadas</p></a>`;
  }
  function socialCard() {
    const evo = S.brands.map(sel.evoOf).filter(Boolean);
    if (!evo.length) return `<a class="card lg" href="#metricas" data-go="metricas"><div class="ch">${icon("chart")}Redes · 7 días</div><div class="mini-empty"><p class="muted">Conecta Metricool para ver vistas, seguidores e interacciones.</p></div></a>`;
    const views = evo.reduce((a, e) => a + e.views, 0), inter = evo.reduce((a, e) => a + e.inter, 0), net = evo.reduce((a, e) => a + e.net, 0), ser = evo[0].series.map((_, i) => evo.reduce((a, e) => a + e.series[i], 0));
    const prev = evo.reduce((a, e) => a + (e.dViews != null ? e.views / (1 + e.dViews / 100) : e.views), 0), d = prev ? Math.round(((views - prev) / prev) * 100) : null;
    return `<a class="card lg" href="#metricas" data-go="metricas"><div class="ch">${icon("chart")}Redes · 7 días<span class="sp"></span>${d != null ? `<span class="chip ${d >= 0 ? "good" : "bad"}">${App.pctTxt(d)}</span>` : ""}</div>
      <div class="big-num" data-count="${views}" data-compact="1">${fmt(views)}</div><p class="muted">vistas</p><div class="spk">${spark(ser, 240, 54, { dot: true })}</div>
      <div class="trio"><span><b class="num">${fmt(inter)}</b> interacciones</span><span><b class="num">${net >= 0 ? "+" : ""}${fmt(net)}</b> seguidores</span></div></a>`;
  }
  function requestsCard() {
    const reqs = sel.activeRequests().slice(0, 3), st = sel.studioActive().length;
    const rows = reqs.map((r) => { const steps = r.steps || [], p = steps.length ? steps.filter((s) => s.status === "hecho").length / steps.length : r.status === "produccion" ? 0.4 : 0.08; return `<li><div><b>${esc((r.topic || (r.hooks || [])[0] || "Pedido").slice(0, 46))}</b><span class="muted">${esc((sel.brand(r.brand) || {}).name || "")} · ${esc(STATUS[r.status || "pedido"] || r.status)}</span></div><div class="bar" style="--p:${Math.round(p * 100)}%"><i></i></div></li>`; }).join("");
    return `<a class="card lg" href="#crear" data-go="crear"><div class="ch">${icon("wand")}Claude trabajando<span class="sp"></span>${reqs.length + st ? `<span class="chip">${reqs.length + st}</span>` : ""}</div>${rows ? `<ul class="reqs">${rows}</ul>` : `<div class="mini-empty"><p class="muted">Nada en cola. ${App.say("Pedí", "Pide")} un video o ${App.say("subí", "sube")} material.</p></div>`}${st ? `<p class="muted" style="margin-top:10px">${st} ${plural(st, "cambio", "cambios")} del Estudio en curso</p>` : ""}</a>`;
  }
  const STATUS = { pedido: "Pedido", produccion: "En producción", revisar: "Listo para revisar", listo: "Terminado", bloqueado: "Bloqueado", cancelado: "Cancelado" };
  function todoCard() {
    const items = sel.todoItems().slice(0, 4);
    const li = items.map((t) => { const u = sel.URGENCY[t.urgency] || sel.URGENCY.week; return `<li><i class="dot" style="--c:${t.urgency === "now" ? "var(--down)" : t.urgency === "today" ? "var(--apricot)" : "var(--ink3)"}"></i><div><b>${esc(t.title)}</b>${t.detail ? `<span class="muted">${esc(t.detail)}</span>` : ""}</div><span class="acts">${t.link ? `<a class="btn sm" href="${esc(t.link)}">Ir</a>` : ""}${t.auto ? "" : `<button class="btn sm ghost" data-act="tododone" data-id="${esc(t.id)}">Hecho</button>`}</span></li>`; }).join("");
    return `<div class="card lg span2"><div class="ch">${icon("flag")}${App.say("Para vos", "Para ti")}<span class="sp"></span><span class="faint">${sel.todoItems().length || ""}</span></div>${li ? `<ul class="todo">${li}</ul>` : `<div class="mini-empty"><p class="muted">Todo al día. Nada que requiera tu mano ahora.</p></div>`}</div>`;
  }
  function trophyCard() {
    const T = App.trophies, cs = T.cards(), lv = T.level(T.totalXp(cs)), near = T.all(cs).filter((x) => x.next != null && x.value > 0).sort((a, b) => b.ratio - a.ratio).slice(0, 5);
    const shelf = near.map((x) => `<span title="${esc(x.def.name)}"><i class="medal" style="--m:${x.tier >= 0 ? T.TIERS[x.tier][1] : "#9fb0ac"}">${icon(x.def.icon)}</i><small>${esc(x.def.name.split(" ")[0])}</small></span>`).join("");
    return `<a class="card lg span2" href="#logros" data-go="logros"><div class="ch">${icon("trophy")}Logros<span class="sp"></span><span class="faint">Nivel ${lv.level}</span></div><div class="lvl"><div class="lvl-b"><b class="num">${lv.level}</b><small>nivel</small></div><div style="flex:1"><div class="bar" style="--p:${Math.round(Math.min(1, lv.ratio) * 100)}%"><i></i></div><p class="muted" style="margin-top:8px">${fmt(lv.xp)} XP · faltan ${fmt(lv.to - lv.xp)} para el nivel ${lv.level + 1}</p></div></div><div class="shelf">${shelf}</div></a>`;
  }
  function labCard() {
    const r = S.expRounds.filter((x) => x.status !== "cerrada").sort((a, b) => String(b.created || "").localeCompare(String(a.created || "")))[0];
    if (!r) return `<a class="card lg" href="#laboratorio" data-go="laboratorio"><div class="ch">${icon("flask")}Laboratorio</div><div class="mini-empty"><p class="muted">Sin ronda abierta. ${App.say("Guardá", "Guarda")} referencias para armar la próxima.</p></div></a>`;
    const cs = S.expCards.filter((c) => c.round === r.id), done = cs.filter((c) => c.verdict).length;
    return `<a class="card lg" href="#laboratorio/ronda" data-go="laboratorio/ronda"><div class="ch">${icon("flask")}Ronda de estilo<span class="sp"></span><span class="faint">${done}/${cs.length}</span></div><div class="bar" style="--p:${cs.length ? Math.round((done / cs.length) * 100) : 0}%"><i></i></div><p class="muted" style="margin-top:12px">${cs.length - done ? `${cs.length - done} por calificar: Me gusta, Quizás o No.` : "Ronda completa. Envía tus cambios."}</p></a>`;
  }

  App.views.hoy = {
    title: "Hoy",
    render() {
      const ph = sel.phrase(), n = sel.allPending().length, prim = ph.cta === "aprobar" || n ? `<a class="btn pri lg2" href="#aprobar" data-go="aprobar">Empezar a aprobar${n ? `<b>${n}</b>` : ""}</a>` : `<a class="btn pri lg2" href="#crear" data-go="crear">Pedir un video</a>`;
      return `<div class="hoy">
        <section class="talk">
          <button class="orb" data-orb data-act="jarvis" type="button" aria-label="Hablar con Jarvis" style="width:var(--orb,132px);height:var(--orb,132px)"></button>
          <p class="hi">${esc(greet())}, ${esc(App.config.owner)} ${wave}</p>
          <h1 class="h-xl" aria-live="polite">${ph.html}</h1>
          <div class="acts">${prim}${n ? `<a class="btn lg2" href="#crear" data-go="crear">${icon("plus")}Pedir un video</a>` : ""}<a class="btn lg2" href="#estudio" data-go="estudio">${icon("film")}Abrir el Estudio</a></div>
          <button class="askbar lg" type="button" data-act="jarvis"><span>${esc(App.say("Preguntale a Jarvis…", "Pregunta a Jarvis…"))}</span><span class="mic">${icon("mic")}</span></button>
        </section>
        <section class="cards rise">${runwayCard()}${approveCard()}${socialCard()}${requestsCard()}${labCard()}${todoCard()}${trophyCard()}</section></div>`;
    },
    bind(root) { /* las tarjetas son enlaces */ },
  };
  App.acts.tododone = async (el) => { el.disabled = true; await App.act.markTodoDone(el.dataset.id); App.toast("Hecho. Un pendiente menos."); };
})();
