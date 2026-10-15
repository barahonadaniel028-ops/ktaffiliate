/* Aura · Crear: flujo conversacional sobre la nube de Jarvis (reemplazo completo de la v1, ver DECISIONES.md #10).
   "¿Qué querés crear?" y dos caminos: un estilo nuevo (crear-estilo.js, conecta con Laboratorio) o un video
   nuevo (crear-video.js, elegís estilo(s) y subís lo que hay que editar). Este archivo es el cascarón: la
   misma nube/vidrio que Jarvis (clases .jv/.msg/.chips/.confirm de shell.css, reusadas, no reinventadas), el
   router entre los dos caminos, los pedidos en curso y el aviso cuando un estilo nuevo queda listo. */
(function () {
  "use strict";
  const App = window.App, S = App.S, sel = App.sel, UI = App.ui, { $, $$, esc, icon, plural, bytes, toast } = App;
  UI.crear = UI.crear || {};
  const CAMINOS = ["estilo", "video"];
  const caminoOf = (r) => (CAMINOS.includes(r.args[0]) ? r.args[0] : null);
  const STATUS = { pedido: ["Pedido", ""], produccion: ["En producción", "apricot"], revisar: ["Listo para revisar", "good"], listo: ["Listo", "good"], bloqueado: ["Bloqueado", "bad"], cancelado: ["Cancelado", ""] };
  // el modelo de este pedido: arranca en el de siempre y, si se cambia aqui (pill en el encabezado de la nube),
  // vale solo para el pedido que se esta armando en Crear (igual mecanismo que ya usan Jarvis/Estudio/Laboratorio).
  UI.crear.ai = UI.crear.ai || {};
  App.ai.contexts.draft = {
    get: () => { const g = App.ai.get("global"), d = UI.crear.ai; return { model: App.ai.MODELS.some((m) => m.id === d.model) ? d.model : g.model, effort: App.ai.EFFORTS.some((x) => x[0] === d.effort) ? d.effort : g.effort }; },
    set: (p) => { Object.assign(UI.crear.ai, p); },
    note: "Solo para este pedido. Tu modelo de siempre no cambia.",
  };

  // ---------- la misma gota, siempre: transicion entre pasos de esta conversacion (motion-doctrine: un solo carrier,
  // nunca un fundido de pantalla aparte compitiendo con esto). App.morph.wilt/bloom ya existen (motion.js, no se
  // tocan); esta es la pieza nueva que falta: encoger el panel actual a un punto y florecer el que sigue desde ahi.
  // advanceStep: un paso nuevo DENTRO del mismo camino (no cambia el hash) -> mutamos el estado y nos re-renderizamos
  // nosotros mismos. advanceNav: cambiar de camino (si cambia el hash) -> dejamos que App.go/el router re-rendericen
  // (igual que jarvis.js lo hace al navegar) y solo nos ocupamos del florecido una vez que el contenido nuevo esta. ----------
  function liftOff(cb) {
    const old = $(".crear-cloud");
    if (!old || App.reduceMotion()) { cb(null); return; }
    const r = App.morph.rectOf(old), at = { x: r.x + r.w / 2, y: r.y + Math.min(r.h * 0.3, 150) };
    old.style.pointerEvents = "none";
    App.morph.wilt(old, at, 230).then(() => cb(at));
  }
  function advanceStep(mutate) {
    liftOff((at) => {
      mutate(); App.render(true);
      if (!at) return;
      requestAnimationFrame(() => { const el = $(".crear-cloud"); if (el) App.morph.bloom(el, at, 560); });
    });
  }
  function advanceNav(hash) {
    liftOff((at) => {
      App._morphNav = true;
      const unsub = App.on((ks) => { if (ks.has("route")) { unsub(); const el = $(".crear-cloud"); if (el && at) App.morph.bloom(el, at, 560); } });
      App.go(hash);
    });
  }

  // ---------- piezas de conversacion compartidas por los dos caminos ----------
  function msg(who, html) { return `<div class="msg ${who === "me" ? "me" : "ai"}">${html}</div>`; }
  function trail(list) { return (list || []).map((m) => msg(m.who, m.html)).join(""); }
  function chips(list) { return list && list.length ? `<div class="chips static">${list.map((c) => `<button type="button" class="${c.pri ? "pri" : ""}" data-act="${esc(c.act)}" ${c.data ? Object.entries(c.data).map(([k, v]) => `data-${k}="${esc(v)}"`).join(" ") : ""}>${c.icon ? icon(c.icon) : ""}${esc(c.label)}</button>`).join("")}</div>` : "";
  }
  function cloud(o) {
    o = o || {};
    return `<div class="crear-wrap"><div class="crear-cloud jv solid-glass" role="group" aria-label="Crear"><div class="inner">
      <div class="jh"><span class="orb${o.busy ? " fast" : ""}"></span><div class="nm">Crear<small>${esc(o.status || "")}</small></div><span class="sp"></span>${App.ai.pillHtml("draft")}${o.back ? `<button class="iconbtn" type="button" data-act="crback" aria-label="Volver atrás">${icon("chevleft")}</button>` : ""}</div>
      <div class="log">${trail(o.trail)}</div>
      <div class="cbody">${o.body || ""}</div>
      ${o.chips ? chips(o.chips) : ""}
    </div></div></div>`;
  }
  function queueList() {
    const b = sel.brand();
    const videos = sel.newRequests(b.id).map((r) => ({ r, kind: "video" }));
    const styles = S.requests.filter((r) => r.kind === "new_style").sort((a, c) => (c.at || "").localeCompare(a.at || "")).map((r) => ({ r, kind: "estilo" }));
    const all = videos.concat(styles).sort((a, c) => (c.r.at || "").localeCompare(a.r.at || ""));
    if (!all.length) return "";
    const row = ({ r, kind }) => {
      const s = STATUS[r.status || "pedido"] || [r.status, ""], steps = r.steps || [], done = steps.filter((x) => x.status === "hecho").length;
      const p = steps.length ? done / steps.length : r.status === "listo" ? 1 : r.status === "produccion" ? 0.4 : 0.06;
      const title = kind === "estilo" ? (r.notes || "Estilo nuevo").slice(0, 70) : (r.topic || (r.styles || []).join(" + ") || (r.assets || []).length + " archivos").slice(0, 70);
      return `<li class="rq"><div class="rqh">${icon(kind === "estilo" ? "sparkles" : "film")}<span class="chip ${s[1]}">${esc(s[0])}</span><b>${esc(title)}</b><span class="faint">${r.at ? App.ago(r.at) : ""}</span></div>
        ${r.model ? `<div class="rqm muted">${esc(App.ai.byId(r.model).name)}${r.effort ? " · " + esc(App.ai.effName(r.effort)) : ""}</div>` : ""}
        ${r.status !== "cancelado" ? `<div class="bar" style="--p:${Math.round(p * 100)}%"><i></i></div>` : ""}
        ${r.reply ? `<p class="reply">${esc(r.reply)}</p>` : ""}
        ${(r.status || "pedido") === "pedido" ? `<button class="btn sm ghost" type="button" data-act="crcancel" data-id="${esc(r.id)}">Cancelar</button>` : ""}</li>`;
    };
    return `<section class="card lg crqueue"><div class="ch">${icon("clock")}Tus pedidos<span class="sp"></span><span class="faint">${all.length}</span></div><ul class="rqs">${all.map(row).join("")}</ul></section>`;
  }

  // ---------- raiz: "¿Qué querés crear?" ----------
  function rootBody() {
    return `<div class="crear-paths">
      <button class="crear-path" type="button" data-act="crgo" data-c="estilo">${icon("sparkles")}<b>Un estilo nuevo</b><span>A partir de referencias, videos o ideas que te gustan.</span></button>
      <button class="crear-path" type="button" data-act="crgo" data-c="video">${icon("wand")}<b>Un video nuevo</b><span>Elegís el estilo y subís lo que hay que editar.</span></button>
    </div>`;
  }
  function renderRoot() {
    return cloud({ status: "¿qué armamos?", trail: [{ who: "ai", html: `<p>${esc(App.say("¿Qué querés crear?", "¿Qué quieres crear?"))}</p>` }], body: rootBody() }) + queueList();
  }

  // ---------- entrada desde afuera: Biblioteca y Laboratorio ("Usar en un video nuevo") dejan UI.draft.style/.notes;
  // Jarvis (new_request) deja UI.draft.topic. Los tres siguen funcionando sin tocar esos archivos: los leemos
  // una vez al llegar a la raiz y saltamos directo al camino que corresponde. ----------
  function consumeIncoming() {
    const d = UI.draft; if (!d || (!d.style && !d.topic && !d.notes)) return false;
    const pre = { style: d.style || "", notes: d.notes || d.topic || "" };
    UI.draft = {};
    App.crearVideo.arriveWith(pre);
    App.go("crear/video", { replace: true });
    return true;
  }

  App.views.crear = {
    title: "Crear",
    render(r) {
      const c = caminoOf(r);
      if (!c) { if (consumeIncoming()) return `<div class="empty"><span class="orb"></span></div>`; return renderRoot(); }
      if (c === "estilo") return App.crearEstilo.render() + queueList();
      return App.crearVideo.render() + queueList();
    },
    bind(root, r) {
      const c = caminoOf(r);
      if (c === "estilo" && App.crearEstilo.bind) App.crearEstilo.bind(root);
      if (c === "video" && App.crearVideo.bind) App.crearVideo.bind(root);
    },
    update(kinds) {
      if (kinds.has("requests") || kinds.has("exp_styles") || kinds.has("refs")) return false; // la cola y los avisos se actualizan solos
      const a = document.activeElement; if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && $("#main").contains(a)) return true;
      return false;
    },
  };
  App.crear = { advanceStep, advanceNav, cloud, msg, trail, chips, STATUS };

  // ---------- aviso global cuando un estilo pedido queda listo (vive en Laboratorio) ----------
  // No depende de estar parado en Crear: escucha los cambios de "requests" en cualquier pantalla (igual en
  // espiritu a como Metricas/Logros avisan de un hito aunque no se este viendo esa pantalla), incluso si quedo
  // listo mientras la app estaba cerrada: lo marca "visto" (localStorage) para no repetir el aviso.
  App.on((kinds) => {
    if (!kinds.has("requests")) return;
    const seen = App.store.get("styleSeenListo", {}); let changed = false;
    S.requests.filter((x) => x.kind === "new_style" && x.status === "listo" && !seen[x.id]).forEach((x) => {
      seen[x.id] = true; changed = true;
      toast(`Tu estilo nuevo ya está listo para probar en el Laboratorio.${x.reply ? " " + x.reply : ""}`);
    });
    if (changed) App.store.set("styleSeenListo", seen);
  });

  const A = App.acts;
  A.crgo = (el) => App.crear.advanceNav("crear/" + el.dataset.c);
  A.crback = () => {
    const c = caminoOf(App.route()), mod = c === "estilo" ? App.crearEstilo : c === "video" ? App.crearVideo : null;
    if (mod && mod.back && mod.back()) return; // el camino maneja su propio paso atrás (vuelve al paso anterior)
    App.crear.advanceNav("crear"); // ya estaba en el primer paso: vuelve a "¿qué querés crear?"
  };
  A.crcancel = async (el) => { const r = S.requests.find((x) => x.id === el.dataset.id); if (!r) return; const ok = await App.data.write("requests", r.id, { status: "cancelado" }); toast(ok ? "Pedido cancelado." : "No se pudo cancelar. Prueba de nuevo."); };
})();
