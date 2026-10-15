/* Aura · estructura: riel lateral, barra superior, barra inferior (telefono), capa flotante, render de la vista activa con entrada y salida,
   nube de fondo viva (parallax, animo por seccion y por Jarvis), brillo de vidrio que sigue al puntero, atajos y barra de cambios sin enviar. */
(function () {
  "use strict";
  const App = window.App, S = App.S, UI = App.ui, sel = App.sel, { $, $$, esc, icon } = App;
  App.views = App.views || {}; App.acts = App.acts || {};
  const MORE = ["biblioteca", "laboratorio", "metricas", "logros", "notas", "ajustes"];

  const SHEEN = ".lg.card, .lg.piece, .lg.tr, .lg.xc, .lg.lib-card, .lg.ref, .lg.seed, .lg.xs, .lg.stat";
  function counts() { return { estudio: App.sel.allPending().length, notas: sel.unsentCount(), crear: sel.activeRequests().length, logros: App.trophies ? App.trophies.newIds(App.trophies.all(App.trophies.cards())).length : 0 }; }
  function railHtml() {
    const c = counts(), cur = App.route().name;
    const items = App.nav.map(([k, n, ic]) => `<a class="nv" href="#${k}" data-nav="${k}" ${cur === k ? 'aria-current="page"' : ""}>${icon(ic)}<span>${n}</span>${c[k] ? `<b>${c[k]}</b>` : ""}</a>`).join("");
    return `<a class="logo" href="#hoy" aria-label="${esc(App.config.name)}">${esc(App.config.short)}</a>${items}<span class="sp"></span><a class="nv" href="#ajustes" data-nav="ajustes" ${cur === "ajustes" ? 'aria-current="page"' : ""}>${icon("settings")}<span>Ajustes</span></a>`;
  }
  function topHtml() {
    const b = sel.brand(), night = App.theme.effective() === "night", cs = S.claudeState;
    const claude = cs === "available" ? ["available", "Claude conectado"] : S.mode === "demo" ? ["demo", "Demo"] : ["off", cs === "no_session" ? "Claude sin sesión" : "Sin aviso a Claude"];
    return `<div class="ws lg"><span class="mono">${esc(App.config.short)}</span><label class="sr" for="brandsel">Cuenta</label><select id="brandsel" data-change="brand">${S.brands.map((x) => `<option value="${esc(x.id)}" ${x.id === b.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></div>
      <button class="ask lg" type="button" data-act="jarvis" aria-label="Hablar con Jarvis"><span class="orb" data-orb></span><span class="ph">${esc(App.say("Preguntale a Jarvis o andá a…", "Pregunta a Jarvis o ve a…"))}</span><kbd>⌘K</kbd></button>
      <div class="r"><span class="cdot" data-s="${claude[0]}" title="${esc(claude[1])}">${esc(claude[1])}</span><button class="iconbtn" type="button" data-act="theme" aria-label="${night ? "Cambiar a día" : "Cambiar a noche"}">${icon(night ? "sun" : "moon")}</button><span class="av" title="${esc(App.config.owner)}">${esc(App.config.owner.slice(0, 1))}</span></div>`;
  }
  function tabHtml() {
    const c = counts(), cur = App.route().name, tb = (k, n, ic) => `<a class="tb" href="#${k}" data-nav="${k}" ${cur === k ? 'aria-current="page"' : ""}>${icon(ic)}<span>${n}</span>${c[k] ? `<b>${c[k]}</b>` : ""}</a>`;
    return `${tb("hoy", "Hoy", "home")}${tb("estudio", "Estudio", "film")}<button class="orb" type="button" data-orb data-act="jarvis" aria-label="Hablar con Jarvis"></button>${tb("crear", "Crear", "plus")}<button class="tb" type="button" data-act="more" ${MORE.includes(cur) ? 'aria-current="page"' : ""}>${icon("more")}<span>Más</span></button>`;
  }
  // el riel y la barra solo se reescriben si cambiaron (asi no se pierden hovers ni foco)
  const setHtml = (el, html) => { if (el && el._h !== html) { el.innerHTML = html; el._h = html; } };
  function renderChrome() { setHtml($("#rail"), railHtml()); setHtml($("#top"), topHtml()); setHtml($("#tabbar"), tabHtml()); updateSendBar(); }

  // ---------- capa flotante: lo fijo de cada vista (capsula de decision, lote) vive fuera del contenido animado ----------
  App.float = (html) => { const f = $("#floating"); if (!f) return null; f.innerHTML = html || ""; return f.firstElementChild; };

  // ---------- nube de fondo: tono por seccion y animo (jarvis escuchando, pensando) ----------
  const TONE = { hoy: "base", crear: "warm", biblioteca: "cool", laboratorio: "vivid", metricas: "cool", logros: "gold", notas: "base", estudio: "warm", ajustes: "base" };
  App.aura = {
    el: () => $(".aura"),
    mood(m, at) { const a = $(".aura"); if (!a) return; if (m) a.dataset.mood = m; else delete a.dataset.mood; if (at) { a.style.setProperty("--gx", ((at.x / innerWidth - 0.5) * 30).toFixed(1) + "vmax"); a.style.setProperty("--gy", ((at.y / innerHeight - 0.5) * 30).toFixed(1) + "vmax"); } },
    tone(t) { const a = $(".aura"); if (a) a.dataset.tone = t || "base"; },
  };

  // ---------- vista activa con salida y entrada ----------
  let lastKey = "", lastHtml = "", token = 0;
  const typing = () => { const a = document.activeElement; return a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable) && $("#main").contains(a); };
  const SKELETON = `<div class="grid cols2"><div class="skel" style="height:220px"></div><div class="skel" style="height:220px"></div><div class="skel" style="height:160px"></div><div class="skel" style="height:160px"></div></div>`;
  function renderMain(force) {
    const r = App.route(), v = App.views[r.name]; if (!v) return;
    const main = $("#main"), key = r.name + "/" + r.args.join("/") + "|" + UI.brandId;
    if (!force && key === lastKey && typing()) return;
    let html; try { html = App.loading() && r.name !== "ajustes" ? SKELETON : v.render(r); } catch (e) { console.error(e); html = `<div class="empty"><span class="orb"></span><h3>Algo salió mal en esta pantalla</h3><p>${esc(e.message)}</p><button class="btn" data-act="reload">Reintentar</button></div>`; }
    if (!force && key === lastKey && html === lastHtml) return;
    const same = key === lastKey, y = same ? window.scrollY : 0, my = ++token;
    lastKey = key; lastHtml = html;
    document.title = v.title ? `${v.title} · ${App.config.name}` : App.config.name;
    document.body.classList.toggle("in-review", r.name === "estudio" && r.args[0] === "ver");
    App.aura.tone(TONE[r.name]);
    const upd = () => {
      if (my !== token) return;
      if (!same) App.float("");
      main.classList.toggle("wide", !!v.wide);
      main.innerHTML = `<div class="view" data-view="${r.name}" ${same ? "" : "data-enter"}>${html}</div>`;
      if (same) window.scrollTo(0, y); else { window.scrollTo(0, 0); setTimeout(() => { const n = main.firstElementChild; if (n) n.removeAttribute("data-enter"); }, 1600); }
      if (v.bind) v.bind(main, r); App.countUp(main);
    };
    const old = main.firstElementChild;
    if (App._morphNav) {
      // Jarvis ya está llevando al visitante acá con su propio vuelo + derrame: esta es la única
      // transición visible. Sin esto, el fundido de pantalla normal corre a la vez y se pisan.
      upd();
    } else if (!same && old && !App.reduceMotion() && !App.studioOpen) {
      if (App._navFrom && document.startViewTransition) { App.morph.view(upd, App._navFrom); }
      else { old.style.pointerEvents = "none"; old.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-6px) scale(.996)" }], { duration: 140, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" }).finished.then(upd, upd); }
    } else upd();
    App._navFrom = null; App._morphNav = false; renderChrome();
  }
  App.render = renderMain;

  // ---------- barra de cambios sin enviar (una capsula pequena) ----------
  let listOpen = false, armTime = 0;
  function updateSendBar() {
    const bar = $("#sendbar"), n = sel.unsentCount(); if (!bar) return;
    bar.hidden = n === 0 || App.route().name === "notas" || App.studioOpen; document.body.classList.toggle("has-send", n > 0);
    bar.querySelector("#sendn").textContent = n; bar.querySelector("#sendtxt").textContent = App.plural(n, "cambio sin enviar", "cambios sin enviar");
    const list = $("#sendlist"), open = listOpen && n > 0 && !bar.hidden; list.hidden = !open; bar.querySelector("[data-act=sendview]").setAttribute("aria-expanded", String(open));
    if (open) { const items = App.act.pendingItems(); list.innerHTML = `<ul>${items.map((it, i) => `<li><div><b>${esc(it.kind)}</b><span>${esc(it.label)}</span></div><button class="btn sm ghost" type="button" data-act="sundo" data-i="${i}">Quitar</button></li>`).join("")}</ul><button class="btn sm ghost bad" type="button" data-act="sundoall">Descartar todo</button>`; } else armTime = 0;
  }
  App.updateSendBar = updateSendBar;

  // ---------- eventos delegados ----------
  const A = App.acts;
  A.reload = () => location.reload();
  A.theme = (el, e) => App.theme.toggle(e);
  A.jarvis = (el) => App.jarvis.open(el.querySelector(".orb") || (el.matches(".orb") ? el : null) || el);
  A.more = () => {
    const sh = App.sheet(`<div class="sheet-list">${MORE.map((k) => { const n = k === "ajustes" ? ["Ajustes", "settings"] : App.nav.find((x) => x[0] === k).slice(1); return `<a href="#${k}" data-close>${icon(n[1])}<span>${n[0]}</span></a>`; }).join("")}</div>`);
    sh.el.addEventListener("click", (e) => { if (e.target.closest("a")) setTimeout(sh.close, 0); });
  };
  A.sendall = async (el) => { el.disabled = true; const t = el.textContent; el.textContent = "Enviando…"; await App.act.sendAll(); el.disabled = false; el.textContent = t; };
  A.sendview = () => { listOpen = !listOpen; updateSendBar(); };
  A.sundo = async (el) => { const it = App.act.pendingItems()[+el.dataset.i]; if (!it) return; el.disabled = true; try { await it.undo(); App.toast("Quitado. Ya no se va a enviar."); } catch (e) { App.toast("No se pudo quitar. Prueba de nuevo."); } App.emit("notes"); };
  A.sundoall = async (el) => { const now = Date.now(); if (now - armTime > 4000) { armTime = now; el.textContent = "¿Seguro? Toca otra vez para descartar todo"; return; } armTime = 0; el.disabled = true; try { for (const it of App.act.pendingItems()) await it.undo(); App.toast("Descartado. No se va a enviar nada."); } catch (e) { App.toast("No se pudo descartar todo."); } listOpen = false; App.emit("notes"); };

  function wire() {
    document.addEventListener("click", (e) => {
      const t = e.target.closest("[data-act]"); if (t && App.acts[t.dataset.act]) { if (t.tagName !== "A") e.preventDefault(); App.acts[t.dataset.act](t, e); return; }
      const go = e.target.closest("[data-go]"); if (go) { e.preventDefault(); App.go(go.dataset.go, { from: go.closest(".card, .vid, .lib-card, .ref") || go }); return; }
      if (listOpen && !e.target.closest("#sendlist, #sendbar")) { listOpen = false; updateSendBar(); }
    });
    document.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("[role=button][data-act], [role=radio][data-act], [role=button][data-go]")) { e.preventDefault(); e.target.click(); } });
    document.addEventListener("change", (e) => {
      const t = e.target.closest("[data-change]"); if (!t) return;
      if (t.dataset.change === "brand") sel.setBrand(t.value); else if (App.acts[t.dataset.change]) App.acts[t.dataset.change](t, e);
    });
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); App.jarvis.toggle(); return; }
      if (e.key === "Escape" && App.jarvis.isOpen()) { App.jarvis.close(); return; }
      const v = App.views[App.route().name]; if (v && v.key && !typing() && !e.metaKey && !e.ctrlKey && !e.altKey && !App.jarvis.isOpen() && !App.studioOpen) v.key(e);
    });
    // parallax de la nube y brillo del vidrio bajo el puntero (solo con mouse; un cuadro por fotograma)
    let raf = 0, lx = 0, ly = 0, tgt = null;
    const fine = (() => { try { return matchMedia("(pointer: fine)").matches; } catch (e) { return false; } })();
    if (fine && !App.reduceMotion()) document.addEventListener("pointermove", (e) => {
      lx = e.clientX; ly = e.clientY; tgt = e.target;
      if (raf) return; raf = requestAnimationFrame(() => {
        raf = 0; const a = $(".aura"); if (a) { a.style.setProperty("--px", (lx / innerWidth - 0.5).toFixed(3)); a.style.setProperty("--py", (ly / innerHeight - 0.5).toFixed(3)); }
        const card = tgt && tgt.closest && tgt.closest(SHEEN); if (card) { const r = card.getBoundingClientRect(); card.style.setProperty("--mx", (lx - r.left).toFixed(0) + "px"); card.style.setProperty("--my", (ly - r.top).toFixed(0) + "px"); }
      });
    }, { passive: true });
    document.addEventListener("visibilitychange", () => { const a = $(".aura"); if (a) a.classList.toggle("paused", document.hidden); });
  }

  function mount(root) {
    root.className = "aura-app";
    root.innerHTML = `<div class="aura" aria-hidden="true" data-tone="base"><b><i></i></b><b><i></i></b><b><i></i></b><b><i></i></b><b><i></i></b></div><div class="grain" aria-hidden="true"></div>
      <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
        <filter id="goo" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="10" result="b"/><feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10" result="g"/><feComposite in="SourceGraphic" in2="g" operator="atop"/></filter>
        <linearGradient id="auraGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f6b6c"/><stop offset=".55" stop-color="#6fd1c0"/><stop offset="1" stop-color="#ffad85"/></linearGradient></defs></svg>
      <nav class="rail lg" id="rail" aria-label="Secciones"></nav>
      <div class="stage"><header class="topbar" id="top"></header><main class="main" id="main" tabindex="-1"></main></div>
      <div id="floating" class="floating"></div>
      <nav class="tabbar lg" id="tabbar" aria-label="Secciones"></nav>
      <button class="jv-fab" id="jvfab" type="button" data-act="jarvis" aria-label="Hablar con Jarvis"><span class="orb"></span></button>
      <div class="sendbar lg" id="sendbar" hidden role="region" aria-label="Cambios sin enviar"><b class="sendn" id="sendn"></b><span id="sendtxt"></span><button class="iconbtn sm" type="button" data-act="sendview" aria-expanded="false" aria-label="Ver y quitar">${icon("chevup")}</button><button class="btn sm pri" type="button" data-act="sendall">Enviar</button></div>
      <div class="sendlist lg solid-glass" id="sendlist" hidden role="region" aria-label="Cambios sin enviar, para quitar"></div>
      <div class="toasts" id="toasts" role="status" aria-live="polite"></div><div id="morph" aria-hidden="true"></div><div id="jvmount"></div><div id="stmount"></div>`;
    renderChrome();
  }
  App.shell = { mount, wire, renderChrome, renderMain, counts };
})();
