/* Aura · Aprobar (lista): piezas con sus versiones, en tres pestañas (por aprobar, agendados, rechazados), seleccion en lote y entrada a la revision. */
(function () {
  "use strict";
  const App = window.App, S = App.S, sel = App.sel, UI = App.ui, { esc, icon, plural, vidThumb } = App;
  const picked = (App.picked = new Set());
  const TABS = [["por-aprobar", "Por aprobar"], ["agendados", "Agendados"], ["rechazados", "Rechazados"]];
  const tabOf = (r) => (TABS.some((t) => t[0] === r.args[0]) ? r.args[0] : "por-aprobar");
  const listFor = (tab) => (tab === "agendados" ? sel.scheduled() : tab === "rechazados" ? sel.rejected() : sel.pending());
  const STAT = { approved: ["Aprobada", "good"], rejected: ["Rechazada", "bad"], maybe: ["Quizás", "warn"] };

  function versionCard(v, tab) {
    const r = App.pred.scoreVideo(v), st = STAT[v.status || ""] || null, on = picked.has(v.id), color = r ? App.pred.TIER_COLOR[r.tier] : "";
    const meta = tab === "agendados" ? (v.inMetricool ? '<span class="chip good">En Metricool</span>' : '<span class="chip warn">Esperando agendar</span>') : tab === "rechazados" ? (v.inMetricool ? '<span class="chip bad">Por quitar</span>' : "") : (st && v.status === "maybe" ? `<span class="chip warn">Quizás</span>` : "");
    const notes = sel.openNotes(v).length;
    return `<div class="ver ${on ? "on" : ""}" data-id="${esc(v.id)}">
      <button class="pick" type="button" data-act="pick" data-id="${esc(v.id)}" aria-pressed="${on}" aria-label="Elegir ${esc(sel.label(v))}">${icon("check")}</button>
      <a class="vlink" href="#aprobar/ver/${encodeURIComponent(v.id)}" data-go="aprobar/ver/${encodeURIComponent(v.id)}" aria-label="Revisar ${esc(sel.label(v))}">${vidThumb(v, { cs: 10, style: "width:100%;aspect-ratio:9/16" })}
        ${r ? `<span class="rk" style="--c:${color}" title="Puntaje ${r.score}">${r.score}</span>` : ""}<span class="vn">v${v.version}</span></a>
      <div class="vm">${meta}${notes ? `<span class="chip">${notes} ${plural(notes, "nota", "notas")}</span>` : ""}</div></div>`;
  }
  function pieceCard(g, tab) {
    const first = g.vs[0], b = S.brands.find((x) => x.id === g.brand), gs = App.pred.groupScore(g.vs), allOn = g.vs.every((v) => picked.has(v.id));
    const when = tab === "agendados" ? (first.scheduled || first.date || "") : "";
    return `<article class="piece lg"><header><div><h3 class="h-m">${esc(g.name)}</h3><p class="muted">${esc(b ? b.name : "")}${when ? " · " + esc(when) : ""}</p></div><span class="sp"></span>
        ${gs ? `<span class="chip" style="color:${App.pred.TIER_COLOR[gs.tier]}" title="Puntaje promedio de la pieza">Promedio ${gs.avg}</span>` : ""}
        <button class="btn sm ghost" type="button" data-act="pickpiece" data-piece="${esc(g.brand + "|" + g.piece)}" aria-pressed="${allOn}">${allOn ? "Quitar elección" : "Elegir las " + g.vs.length}</button></header>
      <div class="vers">${g.vs.map((v) => versionCard(v, tab)).join("")}</div>
      <footer>${tab === "por-aprobar" ? `<a class="btn sm pri" href="#aprobar/ver/${encodeURIComponent(first.id)}" data-go="aprobar/ver/${encodeURIComponent(first.id)}">Revisar${g.vs.length > 1 ? " las " + g.vs.length : ""}</a><button class="btn sm good" type="button" data-act="piecestatus" data-piece="${esc(g.brand + "|" + g.piece)}" data-st="approved">${icon("check")}Aprobar todas</button><button class="btn sm bad" type="button" data-act="piecestatus" data-piece="${esc(g.brand + "|" + g.piece)}" data-st="rejected">${icon("x")}Rechazar</button>`
        : tab === "agendados" ? `<button class="btn sm ghost" type="button" data-act="piecestatus" data-piece="${esc(g.brand + "|" + g.piece)}" data-st="pending">Devolver a Por aprobar</button><button class="btn sm bad ghost" type="button" data-act="piecestatus" data-piece="${esc(g.brand + "|" + g.piece)}" data-st="rejected">Rechazar</button>`
        : `<button class="btn sm" type="button" data-act="piecestatus" data-piece="${esc(g.brand + "|" + g.piece)}" data-st="pending">Recuperar</button>`}</footer></article>`;
  }

  App.listView = {
    render(r) {
      const tab = tabOf(r), b = sel.brand(), all = listFor(tab).filter((v) => v.brand === b.id), groups = sel.groupByPiece(all), np = sel.pending().length, na = sel.scheduled().length, nr = sel.rejected().length;
      const cnt = { "por-aprobar": np, agendados: na, rechazados: nr };
      const total = sel.allPending().length, others = total - np;
      const head = `<div class="vhead"><div class="t"><span class="eyebrow">${esc(b.name)}</span><h1 class="h-l">${tab === "por-aprobar" ? (np ? `<em>${np} ${plural(np, "video", "videos")}</em> por decidir` : "Todo <em>decidido</em>") : tab === "agendados" ? `<em>${na}</em> ${plural(na, "agendado", "agendados")}` : `<em>${nr}</em> ${plural(nr, "rechazado", "rechazados")}`}</h1>
        <p class="muted">${tab === "por-aprobar" ? (np ? `${groups.length} ${plural(groups.length, "pieza", "piezas")}. Aprobar es dejarlas agendadas; Claude las programa en Metricool.` : others ? `${others} ${plural(others, "video", "videos")} esperan en otra cuenta.` : "No queda nada por aprobar.") : tab === "agendados" ? "Aprobadas. Las que dicen «Esperando agendar» las programa Claude en un momento." : "Rechazadas. Se pueden recuperar."}</p></div>
        <div class="r">${tab === "por-aprobar" && np ? `<a class="btn pri lg2" href="#aprobar/ver/${encodeURIComponent(groups[0].vs[0].id)}" data-go="aprobar/ver/${encodeURIComponent(groups[0].vs[0].id)}">Empezar<b>${np}</b></a>` : ""}</div></div>
        <div class="tabs"><div class="seg lg" role="tablist">${TABS.map(([k, n]) => `<button role="tab" type="button" class="${k === tab ? "on" : ""}" aria-pressed="${k === tab}" data-act="aptab" data-tab="${k}">${n}${cnt[k] ? `<b>${cnt[k]}</b>` : ""}</button>`).join("")}</div></div>`;
      const body = groups.length ? `<div class="pieces rise">${groups.map((g) => pieceCard(g, tab)).join("")}</div>`
        : `<div class="empty card lg"><span class="orb"></span><h3>${tab === "por-aprobar" ? "No hay nada por aprobar" : tab === "agendados" ? "Todavía no hay agendados" : "Nada rechazado"}</h3><p>${tab === "por-aprobar" ? App.say("Pedí un video nuevo y aparece acá apenas Claude lo termine.", "Pide un video nuevo y aparece aquí apenas Claude lo termine.") : "Cuando apruebes videos, los verás aquí."}</p><a class="btn pri" href="#crear" data-go="crear">Pedir un video</a></div>`;
      return head + body;
    },
    bind() { App.float(picked.size ? bulkBar() : ""); },
  };
  function bulkBar() {
    return `<div class="bulk lg" id="bulk"><span><b class="num">${picked.size}</b> ${plural(picked.size, "elegido", "elegidos")}</span><button class="btn sm good" type="button" data-act="bulk" data-st="approved">${icon("check")}Aprobar</button><button class="btn sm bad" type="button" data-act="bulk" data-st="rejected">${icon("x")}Rechazar</button><button class="btn sm ghost" type="button" data-act="bulk" data-st="clear">Soltar</button></div>`;
  }
  const A = App.acts;
  A.aptab = (el) => { picked.clear(); App.go("aprobar" + (el.dataset.tab === "por-aprobar" ? "" : "/" + el.dataset.tab)); };
  A.pick = (el) => { const id = el.dataset.id; picked.has(id) ? picked.delete(id) : picked.add(id); App.render(true); };
  A.pickpiece = (el) => { const [b, p] = el.dataset.piece.split("|"), vs = S.videos.filter((v) => v.brand === b && v.piece === p && !v.published && listMatches(v)), on = vs.every((v) => picked.has(v.id)); vs.forEach((v) => (on ? picked.delete(v.id) : picked.add(v.id))); App.render(true); };
  const listMatches = (v) => { const t = tabOf(App.route()); return t === "agendados" ? v.status === "approved" : t === "rechazados" ? v.status === "rejected" : sel.isPending(v); };
  A.piecestatus = (el) => { const [b, p] = el.dataset.piece.split("|"), vs = S.videos.filter((v) => v.brand === b && v.piece === p && !v.published && listMatches(v)); if (vs.length) App.act.setMany(vs, el.dataset.st); };
  A.bulk = (el) => { const st = el.dataset.st; if (st === "clear") { picked.clear(); App.render(true); return; } const vs = [...picked].map(sel.video).filter(Boolean); picked.clear(); if (vs.length) App.act.setMany(vs, st); else App.render(true); };
})();
