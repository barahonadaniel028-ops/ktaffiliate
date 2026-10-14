/* Aura · Laboratorio. Una mesa de luz: sueltas lo que te gusta (video o imagen) y Aura lee su ADN en este navegador (color, ritmo,
   movimiento, luz). En la Estación lo ves recreado en vivo con el mismo motor del Estudio, lo ajustas, lo mezclas y lo guardas como estilo.
   Lo guardado pasa a la Biblioteca. La Ronda de estilo y los estilos en prueba siguen aquí. */
(function () {
  "use strict";
  const App = window.App, S = App.S, UI = App.ui, sel = App.sel, { $, $$, esc, icon, plural } = App;
  const DNA = () => window.AuraDNA;
  UI.lab = Object.assign({ jobs: [], rec: {}, mix: {} }, UI.lab || {});
  const TABS = [["mesa", "Mesa"], ["ronda", "Ronda"], ["estilos", "Estilos"]];
  const VERD = [["keep", "Me gusta", "check"], ["maybe", "Quizás", "help"], ["drop", "No", "x"]];
  const FONTS = [["Anton", "Grueso"], ["Inter", "Limpio"], ["Caveat", "A mano"]];
  const ANIMS = [["pop", "Pop"], ["slide", "Subir"], ["fade", "Fundido"], ["type", "Escribir"]];
  const TRANS = [["flash", "Destello"], ["zoom", "Zoom"], ["wipe", "Barrido"], ["slide", "Deslizar"], ["iris", "Iris"], ["blur", "Desenfoque"], ["cut", "Corte"]];
  const BGS = [["gradient", "Degradado"], ["black-glow", "Negro con luz"], ["anim:ondas", "Ondas"], ["anim:rayos", "Rayos"], ["anim:universo", "Universo"], ["anim:red", "Red"]];
  const FF = { Anton: "'Anton',Impact,sans-serif", Inter: "-apple-system,BlinkMacSystemFont,'SF Pro Display','Inter',system-ui,sans-serif", Caveat: "'Caveat',cursive", Aston: "'AstonScript','Caveat',cursive" };
  const curRound = () => S.expRounds.filter((r) => r.status !== "cerrada").sort((a, b) => String(b.created || "").localeCompare(String(a.created || "")))[0] || null;
  const roundCards = (r) => (r ? S.expCards.filter((c) => c.round === r.id).sort((a, b) => (a.order || 0) - (b.order || 0)) : []);
  const isStation = (r) => r.args[0] === "ref" || r.args[0] === "semilla";
  const tabOf = (r) => (TABS.some((t) => t[0] === r.args[0]) ? r.args[0] : "mesa");
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return u || ""; } };
  const refName = (r) => (r.name ? r.name.replace(/\.(mp4|mov|m4v|webm|png|jpe?g|webp)$/i, "") : "") || host(r.url) || "Referencia";
  const pct = (v) => Math.round((v || 0) * 100);

  // ---------- receta en miniatura (CSS puro; se usa en semillas, estilos guardados y la Biblioteca) ----------
  function findRecipe(id) {
    const st = S.expStyles.find((x) => x.id === id); if (st && st.recipe) return st.recipe;
    const sd = DNA() && DNA().SEEDS.find((x) => x.id === id); if (sd) return sd.recipe;
    const rf = S.refs.find((x) => x.id === id); return rf ? rf.recipe || (rf.dna ? DNA().recipeFrom(rf.dna) : null) : null;
  }
  function recipeMini(R, o) {
    o = o || {}; if (typeof R === "string") R = findRecipe(R);
    if (!R || !DNA()) return `<div class="xd xd-mock${o.mini ? " mini" : ""}"><div class="xd-bg"></div></div>`;
    const U = DNA().util, b = R.bg || {}, pal = R.palette || [], b1 = b.type === "gradient" ? b.from : U.mixHex(R.accent, "#000000", 0.6), b2 = b.type === "gradient" ? b.to : "#040607", b3 = U.mixHex(pal[1] && pal[1] !== R.accent ? pal[1] : R.accent, "#000000", 0.55);
    const fs = (R.font === "Inter" ? 9.4 : R.font === "Caveat" ? 13 : 14.5) * Math.max(0.8, Math.min(1.15, (R.size || 150) / (R.font === "Inter" ? 92 : 150)));
    const words = DNA().SAMPLE.map((w, i) => `<span style="--i:${i}" class="${R.keyAccent && i % 2 ? "k" : ""}${R.hero && i === 1 ? " h" : ""}">${esc(w)}</span>`).join("");
    return `<div class="xd xd-rcp${o.mini ? " mini" : ""}" data-anim="${esc(R.anim)}" data-tr="${esc(R.trans)}" data-bg="${esc(b.type === "anim" ? b.name : b.type || "gradient")}" data-font="${esc(R.font)}" data-glow="${esc(R.glow)}" style="--a:${esc(R.accent)};--b1:${esc(b1)};--b2:${esc(b2)};--b3:${esc(b3)};--beat:${+R.beat || 1.2}s;--ff:${FF[R.font] || FF.Anton};--fs:${fs.toFixed(2)};--tc:${DNA().TEXT_HEX[R.text] || "#F3F0E8"}" aria-hidden="true"><div class="rb"></div><div class="rb two"></div><div class="rf"></div><p class="rw">${words}</p>${R.card ? '<div class="rcard"><i>DATO</i><b>Una idea</b><b class="hl">por tarjeta</b></div>' : ""}${R.subs ? '<p class="rsub">así se <b>siente</b></p>' : ""}</div>`;
  }
  App.recipeMini = recipeMini;

  // ---------- mesa de luz ----------
  const PHASE = (j) => (j.phase === "error" ? j.err || "No pude leer este archivo." : j.phase === "listo" ? "Listo. Su ADN está guardado." : j.phase === "guardando" ? "Guardando su ADN…" : j.p < 0.34 ? "Leyendo la luz y el color…" : j.p < 0.7 ? "Contando los cortes…" : "Midiendo el movimiento…");
  function jobHtml(j) {
    const media = /^image\//.test(j.type) ? `<img src="${esc(j.url)}" alt="">` : `<video src="${esc(j.url)}" muted loop playsinline autoplay preload="auto"></video>`;
    return `<article class="job" id="job-${j.id}" data-phase="${j.phase}"><div class="job-m">${media}<i class="scan"></i></div><div class="job-b"><b>${esc(j.name)}</b><span class="job-st">${esc(PHASE(j))}</span><div class="job-bar"><i style="transform:scaleX(${(j.phase === "listo" ? 1 : j.p || 0).toFixed(3)})"></i></div><div class="job-pal">${(j.pal || []).map((p) => `<i style="--c:${esc(p.hex)}"></i>`).join("")}</div>${j.refId && j.phase === "listo" ? `<a class="btn sm" href="#laboratorio/ref/${esc(j.refId)}" data-go="laboratorio/ref/${esc(j.refId)}">Ver su ADN${icon("chevron")}</a>` : ""}</div></article>`;
  }
  function paintJob(j) {
    const el = document.getElementById("job-" + j.id); if (!el) return;
    el.dataset.phase = j.phase; el.querySelector(".job-st").textContent = PHASE(j); el.querySelector(".job-bar i").style.transform = `scaleX(${(j.phase === "listo" ? 1 : j.p || 0).toFixed(3)})`;
    const pal = el.querySelector(".job-pal"), want = (j.pal || []).map((p) => p.hex).join(); if (pal.dataset.k !== want) { pal.dataset.k = want; pal.innerHTML = (j.pal || []).map((p) => `<i style="--c:${esc(p.hex)}"></i>`).join(""); }
    if (j.refId && j.phase === "listo" && !el.querySelector(".btn")) el.querySelector(".job-b").insertAdjacentHTML("beforeend", `<a class="btn sm" href="#laboratorio/ref/${esc(j.refId)}" data-go="laboratorio/ref/${esc(j.refId)}">Ver su ADN${icon("chevron")}</a>`);
  }
  function lightTable() {
    const jobs = UI.lab.jobs.filter((j) => j.phase !== "visto");
    return `<section class="lt" id="lt" aria-label="Mesa de luz"><div class="lt-glow" aria-hidden="true"></div>
      <div class="lt-idle"><span class="orb lt-orb" aria-hidden="true"></span><h2>Suelta aquí lo que te gusta</h2><p>Un video o una imagen. Aura lee su color, su ritmo y su movimiento en este navegador, en segundos.</p>
        <div class="lt-acts"><label class="btn pri" for="ltfile">${icon("upload")}Elegir archivo</label><form class="lt-link" id="ltlink" novalidate><input id="ltlinkin" type="url" inputmode="url" placeholder="o pega un link" aria-label="Link de una referencia" autocomplete="off"><button type="submit" aria-label="Guardar link">${icon("arrow")}</button></form></div>
        <input id="ltfile" type="file" accept="video/*,image/*" multiple hidden></div>
      ${jobs.length ? `<div class="lt-jobs" id="ltjobs">${jobs.map(jobHtml).join("")}</div>` : ""}</section>`;
  }
  function refTile(r) {
    const d = r.dna, poster = d && d.thumbs && (d.thumbs[1] || d.thumbs[0]), pal = d ? d.palette || [] : [], mood = d ? DNA().moodOf(d) : r.analysis ? "Analizada por Claude" : r.sent === false ? "Se envía con tus cambios" : "Claude la está mirando";
    const bg = pal.length ? `background:linear-gradient(160deg,${esc(pal[0].hex)},${esc((pal[1] || pal[0]).hex)})` : "";
    return `<a class="rt" href="#laboratorio/ref/${esc(r.id)}" data-go="laboratorio/ref/${esc(r.id)}" aria-label="${esc(refName(r))}"><div class="rt-m" style="${bg}">${poster ? `<img src="${esc(poster)}" alt="" loading="lazy">` : `<span class="rt-ph">${icon(r.kind === "link" ? "link" : "film")}<small>${esc(host(r.url) || r.name || "")}</small></span>`}
      ${d ? `<span class="rt-g">${DNA().radar(d.axes, { size: 60, pad: 4, labels: false, grid: false, dots: false })}</span>` : ""}</div>
      <div class="rt-b"><b>${esc(refName(r))}</b><small>${esc(mood)}</small>${pal.length ? `<span class="rt-pal">${pal.slice(0, 5).map((p) => `<i style="--c:${esc(p.hex)}"></i>`).join("")}</span>` : ""}</div></a>`;
  }
  function mesa() {
    const refs = S.refs.slice().sort((a, b) => String(b.created || "").localeCompare(String(a.created || "")));
    const seeds = DNA() ? DNA().SEEDS : [];
    return `${lightTable()}
      ${refs.length ? `<section class="lsec"><div class="lsec-h"><h2 class="h-m">Tus referencias</h2><span class="faint">${refs.length}</span></div><div class="mb-grid">${refs.map(refTile).join("")}</div></section>` : ""}
      <section class="lsec"><div class="lsec-h"><h2 class="h-m">Empieza desde una semilla</h2><span class="faint">Seis puntos de partida para hacer tuyos</span></div>
        <div class="seed-row">${seeds.map((s) => `<a class="seed" href="#laboratorio/semilla/${s.id}" data-go="laboratorio/semilla/${s.id}"><div class="seed-d">${recipeMini(s.recipe)}</div><div class="seed-b"><b>${esc(s.name)}</b><small>${esc(s.desc)}</small></div></a>`).join("")}</div></section>`;
  }

  // ---------- estacion: lectura + recreacion en vivo ----------
  function baseRecipe(key) {
    if (UI.lab.rec[key]) return UI.lab.rec[key];
    const [k, id] = key.split(":"), D = DNA(); let R = null;
    if (k === "seed") { const s = D.SEEDS.find((x) => x.id === id); R = s ? JSON.parse(JSON.stringify(s.recipe)) : null; }
    else { const r = S.refs.find((x) => x.id === id); if (r) R = r.recipe ? JSON.parse(JSON.stringify(r.recipe)) : r.dna ? D.recipeFrom(r.dna, refName(r)) : Object.assign(JSON.parse(JSON.stringify(D.SEEDS[0].recipe)), { name: refName(r) }); }
    if (R) UI.lab.rec[key] = R; return R;
  }
  function mixOther(id) { if (!id) return null; const [k, x] = id.split(":"); return k === "seed" ? (DNA().SEEDS.find((s) => s.id === x) || {}).recipe || null : baseRecipe("ref:" + x); }
  function effective(key) { const R = baseRecipe(key), m = UI.lab.mix[key]; const o = m && m.with ? mixOther(m.with) : null; return o ? DNA().mix(R, o, m.t) : R; }

  function refMedia(ref, seed, R) {
    if (seed) return `<div class="rd-seed">${recipeMini(seed.recipe)}</div>`;
    const d = ref.dna, url = ref.assetId ? App.adapter().assetUrl(ref.assetId) : "", poster = d && d.thumbs ? d.thumbs[0] : "";
    if (url && d && d.kind === "image") return `<img class="rd-v" src="${esc(url)}" alt="">`;
    if (url) return `<video class="rd-v" src="${esc(url)}" ${poster ? `poster="${esc(poster)}"` : ""} muted loop playsinline autoplay preload="metadata" data-tap-play></video>`;
    if (poster) return `<img class="rd-v" src="${esc(d.thumbs[2] || poster)}" alt="">`;
    return `<div class="rd-link"><span class="orb"></span><b>${esc(host(ref.url) || "Referencia")}</b>${ref.url ? `<a class="btn sm" href="${esc(ref.url)}" target="_blank" rel="noopener">${icon("out")}Abrir</a>` : ""}</div>`;
  }
  function palette(pal) {
    if (!pal.length) return "";
    return `<div class="pal"><div class="pal-b">${pal.map((p) => `<i style="--c:${esc(p.hex)};flex:${Math.max(0.06, p.w || 1 / pal.length).toFixed(3)}"></i>`).join("")}</div>
      <div class="pal-x">${pal.map((p) => `<button type="button" class="hexc" data-act="labcopy" data-v="${esc(p.hex.toUpperCase())}"><i style="--c:${esc(p.hex)}"></i>${esc(p.hex.toUpperCase())}</button>`).join("")}</div></div>`;
  }
  function readPanel(ref, seed, R) {
    const D = DNA(), d = ref && ref.dna, ax = d ? d.axes : seed ? seed.axes : null, desc = d ? D.describe(d) : null;
    const cmp = D.axesOf(R), rad = ax ? `<div class="rd-radar" id="lab-radar">${D.radar(ax, { size: 260, compare: cmp })}</div>` : "";
    const legend = ax ? `<div class="rd-leg"><span><i class="a"></i>${seed ? "La semilla" : "La referencia"}</span><span><i class="b"></i>Tu versión</span></div>` : "";
    let body = "";
    if (d) {
      const pal = d.palette || [], cuts = d.cuts || [], dur = d.duration || 0, mets = d.kind === "video"
        ? [["Cortes por minuto", String(d.cpm)], ["Movimiento", pct(d.axes.movimiento) + "%"], ["Temperatura", desc.temp], d.audio && !d.audio.silent ? ["Pulso del audio", d.audio.pulse + "/min"] : ["Duración", App.mmss(dur)]]
        : [["Luz", pct(d.axes.luz) + "%"], ["Contraste", pct(d.axes.contraste) + "%"], ["Color", pct(d.axes.color) + "%"], ["Temperatura", desc.temp]];
      body = `<div class="rd-tags">${desc.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>${palette(pal)}
        <div class="mets">${mets.map(([k, v]) => `<div class="met"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("")}</div>
        ${d.kind === "video" && dur ? `<div class="cuts"><div class="cuts-film">${(d.thumbs || []).map((t) => `<img src="${esc(t)}" alt="">`).join("")}</div><div class="cuts-ln">${cuts.map((t) => `<i style="left:${((t / dur) * 100).toFixed(2)}%"></i>`).join("")}</div><div class="cuts-l"><span>0:00</span><span>${cuts.length} ${plural(cuts.length, "corte", "cortes")}</span><span>${App.mmss(dur)}</span></div></div>` : ""}`;
    } else if (seed) {
      body = `${palette((seed.recipe.palette || []).map((h) => ({ hex: h, w: 1 / seed.recipe.palette.length })))}
        <div class="mets"><div class="met"><span>Una idea cada</span><b>${String(seed.recipe.beat).replace(".", ",")} s</b></div><div class="met"><span>Letra</span><b>${esc((FONTS.find((f) => f[0] === seed.recipe.font) || [0, seed.recipe.font])[1])}</b></div><div class="met"><span>Transición</span><b>${esc((TRANS.find((t) => t[0] === seed.recipe.trans) || [0, ""])[1])}</b></div><div class="met"><span>Energía</span><b>${pct(seed.recipe.energy)}%</b></div></div>`;
    } else {
      const a = ref.analysis, rows = a ? [["Resumen", a.resumen], ["Texto", a.texto], ["Transiciones", a.transiciones], ["Animaciones", a.animaciones], ["Ritmo", a.ritmo], ["Colores", a.colores]].filter(([, v]) => v) : [];
      body = a ? `<dl class="xra">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>${Array.isArray(a.comoRecrear) && a.comoRecrear.length ? `<div class="how"><b>Cómo recrearlo</b><ul>${a.comoRecrear.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}`
        : `<div class="rd-wait"><span class="orb"></span><p>${ref.sent === false ? "Un link no se puede leer desde aquí. Claude lo analiza cuando envíes tus cambios." : "Claude la está analizando. Mientras tanto, parte de una semilla a la derecha."}</p></div>`;
    }
    const note = ref && ref.note ? `<p class="rd-note">“${esc(ref.note)}”</p>` : "";
    return `<section class="stn-read" aria-label="Lectura"><div class="rd-top"><div class="rd-media">${refMedia(ref, seed, R)}</div><div class="rd-dna">${rad}${legend}</div></div>${note}${body}
      ${ref ? `<div class="rd-foot"><button class="btn sm ghost bad" type="button" data-act="labrefdel" data-id="${esc(ref.id)}">${icon("trash")}Borrar referencia</button></div>` : ""}</section>`;
  }
  const seg = (rk, list, cur, cls) => `<div class="sgc ${cls || ""}" role="radiogroup">${list.map(([k, n]) => `<button type="button" role="radio" aria-checked="${String(cur) === k}" data-rk="${rk}" data-v="${esc(k)}"${rk === "font" ? ` style="font-family:${FF[k]}"` : ""}>${esc(n)}</button>`).join("")}</div>`;
  const toggle = (rk, label, on) => `<label class="row tg"><span class="l">${esc(label)}</span><input type="checkbox" role="switch" data-rk="${rk}" ${on ? "checked" : ""}><i class="swu" aria-hidden="true"></i></label>`;
  const beatPct = (b) => Math.round(((2.4 - b) / 1.7) * 100), pctBeat = (p) => +(2.4 - (p / 100) * 1.7).toFixed(2);
  function controls(key) {
    const R = baseRecipe(key), m = UI.lab.mix[key] || {}, bgKey = R.bg && R.bg.type === "anim" ? "anim:" + R.bg.name : (R.bg && R.bg.type) || "gradient";
    const pal = [...new Set([...(R.palette || []), R.accent, "#F4DC3C", "#FFFFFF", "#6FD1C0", "#FF9A76", "#B58CFF"].map((h) => String(h).toUpperCase()))].slice(0, 8);
    const others = [...DNA().SEEDS.filter((s) => key !== "seed:" + s.id).map((s) => ["seed:" + s.id, s.name]), ...S.refs.filter((r) => (r.dna || r.recipe) && key !== "ref:" + r.id).map((r) => ["ref:" + r.id, refName(r)])];
    return `<div class="grp"><div class="row"><span class="l">Letra</span>${seg("font", FONTS, R.font)}</div>
        <div class="row"><span class="l">Color</span><div class="sws" role="radiogroup">${pal.map((h) => `<button type="button" role="radio" class="swc" style="--c:${esc(h)}" aria-checked="${h === String(R.accent).toUpperCase()}" data-rk="accent" data-v="${esc(h)}" aria-label="Color ${esc(h)}"></button>`).join("")}</div></div>
        <div class="row"><span class="l">Ritmo</span><div class="rng"><small>Calmo</small><input type="range" min="0" max="100" value="${beatPct(R.beat)}" style="--v:${beatPct(R.beat)}%" data-rk="beat" aria-label="Ritmo"><small>Rápido</small></div></div></div>
      <div class="grp"><div class="row col"><span class="l">Entrada del texto</span>${seg("anim", ANIMS, R.anim)}</div>
        <div class="row col"><span class="l">Transición</span>${seg("trans", TRANS, R.trans, "wrap")}</div>
        <div class="row col"><span class="l">Fondo</span>${seg("bg", BGS, bgKey, "wrap")}</div></div>
      <div class="grp">${toggle("hero", "Una palabra especial en cursiva", R.hero)}${toggle("keyAccent", "Palabras clave en color", R.keyAccent)}${toggle("subs", "Subtítulos", R.subs)}${toggle("card", "Tarjetas con datos", R.card)}</div>
      <div class="grp"><div class="row"><span class="l">Mezclar con</span><select id="lab-mixwith" aria-label="Mezclar con"><option value="">Nada</option>${others.map(([k, n]) => `<option value="${esc(k)}" ${m.with === k ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></div>
        <div class="row" id="lab-mixrow" ${m.with ? "" : "hidden"}><div class="rng"><small>Esta</small><input type="range" min="0" max="100" value="${Math.round((m.t != null ? m.t : 0.5) * 100)}" style="--v:${Math.round((m.t != null ? m.t : 0.5) * 100)}%" id="lab-mixt" aria-label="Cuánto mezclar"><small>La otra</small></div></div></div>`;
  }
  function station(kind, id) {
    const ref = kind === "ref" ? S.refs.find((x) => x.id === id) : null, seed = kind === "semilla" && DNA() ? DNA().SEEDS.find((x) => x.id === id) : null;
    if (!ref && !seed) return `<div class="empty card lg"><span class="orb"></span><h3>No encontré esa referencia</h3><p>Puede que se haya borrado.</p><a class="btn pri" href="#laboratorio" data-go="laboratorio">Volver a la mesa</a></div>`;
    const key = ref ? "ref:" + id : "seed:" + id, R = baseRecipe(key), d = ref && ref.dna;
    const title = ref ? refName(ref) : seed.name, sub = d ? DNA().moodOf(d) : seed ? seed.desc : ref.note || "Referencia guardada";
    return `<div class="stn-h"><a class="iconbtn" href="#laboratorio" data-go="laboratorio" aria-label="Volver a la mesa">${icon("chevleft")}</a><div class="t"><span class="eyebrow">${ref ? "Referencia" : "Semilla"}</span><h1 class="h-l">${esc(title)}</h1><p class="muted">${esc(sub)}</p></div><span class="sp"></span>
        <div class="stn-acts"><button class="btn" type="button" data-act="labclaude">${icon("sparkles")}Pedirle a Claude</button><button class="btn pri" type="button" data-act="labsave">Guardar estilo</button></div></div>
      <div class="stn" data-key="${esc(key)}">${readPanel(ref, seed, R)}
        <section class="stn-make" aria-label="Tu versión"><div class="mk-prev"><div class="mk-phone" id="lab-phone"><div id="lab-stage"></div><button class="mk-play" id="lab-play" type="button" aria-label="Pausar">${icon("pause")}</button></div><p class="mk-cap">Recreado en vivo con el motor del Estudio</p></div>
          <div class="mk-ctl" id="lab-ctl">${controls(key)}</div></section></div>`;
  }

  // ---------- vista previa en vivo con el motor ----------
  let live = null;
  function stopLive() { if (!live) return; cancelAnimationFrame(live.raf); try { if (live.handle) live.handle.destroy(); } catch (e) { /* ya cerrado */ } live = null; }
  async function mountLive(host, R) {
    stopLive(); const L = (live = { host, playing: !App.reduceMotion(), t: 1.2, last: 0, raf: 0, handle: null });
    if (!window.StudioRenderer || !window.gsap || !window.StudioModel) { host.innerHTML = recipeMini(R); host.classList.add("css"); return; }
    try { await Promise.all(['400 40px "Anton"', '700 40px "Caveat"', '700 40px "Inter"'].map((f) => (document.fonts ? document.fonts.load(f).catch(() => null) : null))); } catch (e) { /* sin fuentes */ }
    const h = await window.StudioRenderer.mount(host, DNA().buildSpec(R), { mode: "preview", assetUrl: () => "", audio: false });
    if (live !== L) { h.destroy(); return; }
    L.handle = h; fitLive(); h.seek(L.t); paintPlay();
    const tick = (now) => {
      if (live !== L) return; if (!host.isConnected) { stopLive(); return; }
      if (L.playing && !document.hidden) { const dt = L.last ? Math.min(0.1, (now - L.last) / 1000) : 0; L.t = (L.t + dt) % (h.duration || 6.4); h.seek(L.t); }
      L.last = now; L.raf = requestAnimationFrame(tick);
    };
    L.raf = requestAnimationFrame(tick);
  }
  function fitLive() { if (!live || !live.handle) return; const ph = $("#lab-phone"); if (ph) live.handle.scaleTo(ph.clientWidth); }
  function paintPlay() { const b = $("#lab-play"); if (!b || !live) return; b.innerHTML = icon(live.playing ? "pause" : "play"); b.setAttribute("aria-label", live.playing ? "Pausar" : "Reproducir"); b.classList.toggle("paused", !live.playing); }
  function refreshLive(key) {
    const R = effective(key);
    if (live && live.handle) { try { live.handle.rebuild(DNA().buildSpec(R)); live.handle.seek(live.t); } catch (e) { /* se vuelve a montar */ } } else if (live && live.host && live.host.classList.contains("css")) live.host.innerHTML = recipeMini(R);
    const rd = $("#lab-radar"); if (rd) { const r = App.route(), ref = r.args[0] === "ref" ? S.refs.find((x) => x.id === r.args[1]) : null, sd = r.args[0] === "semilla" ? DNA().SEEDS.find((x) => x.id === r.args[1]) : null, ax = ref && ref.dna ? ref.dna.axes : sd ? sd.axes : null; if (ax) { rd.innerHTML = DNA().radar(ax, { size: 260, compare: DNA().axesOf(R) }); rd.classList.add("calm"); } }
  }
  const saveSoon = App.debounce((key) => { const [k, id] = key.split(":"); if (k !== "ref") return; const r = S.refs.find((x) => x.id === id); if (r) App.act.saveRecipe(r, UI.lab.rec[key]); }, 1200);
  function setRK(key, rk, v) {
    const R = baseRecipe(key); if (!R) return;
    if (rk === "beat") R.beat = pctBeat(+v); else if (rk === "bg") R.bg = v.startsWith("anim:") ? { type: "anim", name: v.slice(5) } : v === "black-glow" ? { type: "black-glow" } : { type: "gradient", from: (R.bg && R.bg.from) || DNA().util.mixHex(R.accent, "#000000", 0.7), to: (R.bg && R.bg.to) || "#05080a" };
    else if (["hero", "keyAccent", "subs", "card"].includes(rk)) R[rk] = !!v; else if (rk === "font") { R.font = v; R.size = v === "Inter" ? 92 : v === "Caveat" ? 132 : Math.max(132, R.size || 150); R.text = v === "Inter" ? "pure" : "white"; } else R[rk] = v;
    R.energy = +Math.max(0, Math.min(1, (2.4 - R.beat) / 1.7)).toFixed(2);
    refreshLive(key); saveSoon(key);
  }
  function bindStation(root, r) {
    const st = $(".stn", root); if (!st) return; const key = st.dataset.key, stage = $("#lab-stage", root);
    if (stage) mountLive(stage, effective(key));
    const play = $("#lab-play", root); if (play) play.addEventListener("click", () => { if (!live) return; live.playing = !live.playing; live.last = 0; paintPlay(); });
    const ctl = $("#lab-ctl", root);
    ctl.addEventListener("click", (e) => { const b = e.target.closest("button[data-rk]"); if (!b) return; $$(`button[data-rk="${b.dataset.rk}"]`, ctl).forEach((x) => x.setAttribute("aria-checked", String(x === b))); setRK(key, b.dataset.rk, b.dataset.v); });
    ctl.addEventListener("input", (e) => { const t = e.target; if (t.type === "range") t.style.setProperty("--v", t.value + "%"); if (t.matches('input[type="range"][data-rk]')) setRK(key, t.dataset.rk, t.value); if (t.id === "lab-mixt") { UI.lab.mix[key] = Object.assign(UI.lab.mix[key] || {}, { t: +t.value / 100 }); refreshLive(key); } });
    ctl.addEventListener("change", (e) => { const t = e.target; if (t.matches('input[type="checkbox"][data-rk]')) setRK(key, t.dataset.rk, t.checked); if (t.id === "lab-mixwith") { UI.lab.mix[key] = { with: t.value, t: (UI.lab.mix[key] || {}).t != null ? UI.lab.mix[key].t : 0.5 }; $("#lab-mixrow", root).hidden = !t.value; refreshLive(key); } });
    $$("video[data-tap-play]", root).forEach((v) => v.addEventListener("click", () => (v.paused ? v.play() : v.pause())));
    if (window.ResizeObserver) { const ph = $("#lab-phone", root); if (ph) new ResizeObserver(() => fitLive()).observe(ph); }
  }

  // ---------- ronda y estilos (igual que antes, con el lenguaje nuevo) ----------
  function ronda() {
    const r = curRound(), cs = roundCards(r);
    if (!r) return `<div class="empty card lg"><span class="orb"></span><h3>No hay una ronda abierta</h3><p>Guarda referencias en la mesa y Claude arma la próxima ronda de estilos.</p><button class="btn pri" type="button" data-act="labtab" data-t="mesa">Ir a la mesa</button></div>`;
    const done = cs.filter((c) => c.verdict).length, p = cs.length ? done / cs.length : 0;
    const cards = cs.map((c) => `<article class="xc lg" data-v="${esc(c.verdict || "")}"><div class="xc-demo">${App.demoHtml(c.demo)}${(c.demo || "").startsWith("s-") ? "" : `<button class="xc-rep" type="button" data-act="labrep" aria-label="Ver otra vez">${icon("refresh")}</button>`}</div>
      <div class="xc-b"><b>${esc(c.label || c.name || "Estilo")}</b>${c.desc ? `<small>${esc(c.desc)}</small>` : ""}
      <div class="verd" role="group" aria-label="Tu opinión">${VERD.map(([k, n, ic]) => `<button type="button" class="vd v-${k}" data-act="labverd" data-id="${esc(c.id)}" data-v="${k}" aria-pressed="${c.verdict === k}">${icon(ic)}${n}</button>`).join("")}</div>
      <textarea class="xc-note" rows="2" maxlength="600" data-labnote="${esc(c.id)}" placeholder="¿Por qué? (opcional)" aria-label="Nota">${esc(c.note || "")}</textarea></div></article>`).join("");
    return `<div class="xprog"><div><b>Ronda ${esc(r.name || "")}</b><span class="muted"> · ${done} de ${cs.length}</span></div><div class="bar" style="--p:${Math.round(p * 100)}%"><i></i></div></div>
      <div class="xcs">${cards}</div>
      <section class="card lg overall"><div class="field"><label for="laboverall">Comentario general de la ronda</label><textarea id="laboverall" data-laboverall="${esc(r.id)}" rows="3" maxlength="1500" placeholder="Qué te gustó en conjunto, qué falta, qué probar después">${esc(r.overall || "")}</textarea></div>
        <p class="muted">${sel.unsentCount() ? "Tus calificaciones se envían con <b>Enviar</b>." : done === cs.length ? "Ronda completa. Todo enviado." : "Califica cada estilo. Se guarda solo."}</p></section>`;
  }
  function estilos() {
    const by = (s) => S.expStyles.filter((x) => x.status === s), mk = (x, acts) => `<article class="xs"><div class="xs-demo">${App.demoHtml(x.demo || "e-palabra-ancla", { mini: true })}</div><div class="xs-b"><b>${esc(x.name)}</b><small>${esc(x.description || x.desc || "")}</small><div class="acts">${acts}</div></div></article>`;
    const sec = (title, list, acts, empty) => `<section class="lsec"><div class="lsec-h"><h2 class="h-m">${title}</h2><span class="faint">${list.length || ""}</span></div>${list.length ? `<div class="xsg">${list.map((x) => mk(x, acts(x))).join("")}</div>` : `<p class="muted">${empty}</p>`}</section>`;
    return sec("En prueba", by("prueba"), (x) => `<button class="btn sm pri" type="button" data-act="labdecide" data-id="${esc(x.id)}" data-st="aprobado">${icon("check")}Aprobar</button><button class="btn sm ghost" type="button" data-act="labdecide" data-id="${esc(x.id)}" data-st="descartado">Descartar</button>`, "No hay estilos en prueba ahora.")
      + sec("Aprobados", by("aprobado"), (x) => `<a class="btn sm" href="#biblioteca" data-go="biblioteca">En la Biblioteca</a><button class="btn sm ghost" type="button" data-act="labdecide" data-id="${esc(x.id)}" data-st="prueba">Volver a prueba</button>`, "Cuando guardes o apruebes uno, aparece aquí y en la Biblioteca.")
      + sec("Descartados", by("descartado"), (x) => `<button class="btn sm ghost" type="button" data-act="labdecide" data-id="${esc(x.id)}" data-st="prueba">Recuperar</button>`, "Nada descartado.");
  }

  App.views.laboratorio = {
    title: "Laboratorio",
    render(r) {
      if (isStation(r)) return station(r.args[0], r.args[1] || "");
      stopLive();
      const t = tabOf(r), rd = curRound(), cs = roundCards(rd), done = cs.filter((c) => c.verdict).length;
      const tabs = TABS.map(([k, n]) => { const c = k === "ronda" ? (rd ? `${done}/${cs.length}` : "") : k === "mesa" ? S.refs.length || "" : sel.approvedStyles().length || ""; return `<button role="tab" type="button" class="${k === t ? "on" : ""}" aria-pressed="${k === t}" data-act="labtab" data-t="${k}">${n}${c ? `<b>${c}</b>` : ""}</button>`; }).join("");
      return `<div class="vhead"><div class="t"><span class="eyebrow">Laboratorio</span><h1 class="h-l">Lo que te gusta, <em>convertido en estilo</em>.</h1><p class="muted">Aura lee una referencia y la recrea con el motor del Estudio. Lo que guardas pasa a la <a href="#biblioteca" data-go="biblioteca">Biblioteca</a>.</p></div></div>
        <div class="tabs"><div class="seg lg" role="tablist">${tabs}</div></div>${t === "ronda" ? ronda() : t === "estilos" ? estilos() : mesa()}`;
    },
    bind(root, r) {
      App.observeDemos(root);
      if (isStation(r)) { bindStation(root, r); return; }
      $$("[data-labnote]", root).forEach((ta) => ta.addEventListener("input", App.debounce(() => { const c = S.expCards.find((x) => x.id === ta.dataset.labnote); if (c) App.act.setCardNote(c, ta.value); }, 700)));
      const ov = $("#laboverall", root); if (ov) ov.addEventListener("input", App.debounce(() => { const rd = S.expRounds.find((x) => x.id === ov.dataset.laboverall); if (rd) App.act.setOverall(rd, ov.value); }, 700));
      const lt = $("#lt", root); if (!lt) return;
      const inp = $("#ltfile", root); inp.addEventListener("change", () => { addFiles(inp.files); inp.value = ""; });
      let depth = 0;
      lt.addEventListener("dragenter", (e) => { e.preventDefault(); depth++; lt.classList.add("over"); });
      lt.addEventListener("dragover", (e) => { e.preventDefault(); });
      lt.addEventListener("dragleave", () => { if (--depth <= 0) { depth = 0; lt.classList.remove("over"); } });
      lt.addEventListener("drop", (e) => { e.preventDefault(); depth = 0; lt.classList.remove("over"); addFiles(e.dataTransfer.files); });
      lt.addEventListener("pointermove", (e) => { const b = lt.getBoundingClientRect(); lt.style.setProperty("--lx", ((e.clientX - b.left) / b.width) * 100 + "%"); lt.style.setProperty("--ly", ((e.clientY - b.top) / b.height) * 100 + "%"); });
      $("#ltlink", root).addEventListener("submit", async (e) => { e.preventDefault(); const i = $("#ltlinkin", root), u = i.value.trim(); if (!/^https?:\/\/\S+\.\S+/i.test(u)) { App.toast("Pega un link completo, con https://"); i.focus(); return; } i.value = ""; const id = await App.act.addRefLink(u, ""); App.toast(id ? "Link guardado. Claude lo analiza cuando envíes tus cambios." : "No se pudo guardar. Prueba de nuevo."); });
    },
    update() {
      const r = App.route(); if (isStation(r)) return !!$(".stn");
      const a = document.activeElement; if (a && /^(INPUT|TEXTAREA)$/.test(a.tagName) && $("#main").contains(a)) return true;
      return UI.lab.jobs.some((j) => j.phase === "leyendo" || j.phase === "guardando");
    },
  };
  App.views.laboratorio.wide = false;

  // ---------- leer archivos ----------
  let jn = 0;
  function addFiles(list) {
    const files = [...(list || [])].filter((f) => /^(video|image)\//.test(f.type) || /\.(mp4|mov|m4v|webm|png|jpe?g|webp)$/i.test(f.name)).slice(0, 6);
    if (!files.length) { App.toast("Elige un video o una imagen."); return; }
    if (!DNA()) { App.toast("El lector de estilos no cargó. Recarga la página."); return; }
    const fresh = files.map((f) => ({ id: "j" + ++jn, file: f, name: f.name, type: f.type || (/\.(png|jpe?g|webp)$/i.test(f.name) ? "image/jpeg" : "video/mp4"), size: f.size, url: URL.createObjectURL(f), phase: "leyendo", p: 0, pal: [] }));
    UI.lab.jobs = UI.lab.jobs.filter((j) => j.phase === "leyendo" || j.phase === "guardando").concat(fresh);
    const box = $("#ltjobs"); if (box) box.insertAdjacentHTML("beforeend", fresh.map(jobHtml).join("")); else { const lt = $("#lt"); if (lt) lt.insertAdjacentHTML("beforeend", `<div class="lt-jobs" id="ltjobs">${fresh.map(jobHtml).join("")}</div>`); }
    const lt = $("#lt"); if (lt) lt.classList.add("busy");
    App.aura.mood("think");
    Promise.all(fresh.map(run)).then(() => {
      App.aura.mood(null); const ok = fresh.filter((j) => j.refId);
      if (fresh.length === 1 && ok.length === 1 && App.route().name === "laboratorio" && !isStation(App.route())) setTimeout(() => { const el = document.getElementById("job-" + ok[0].id); App.go("laboratorio/ref/" + ok[0].refId, { from: el }); ok[0].phase = "visto"; }, 650);
      else App.render(true);
    });
  }
  async function run(j) {
    let last = 0;
    const up = j.size <= App.act.MAX_FILE ? App.act.upload(j.file, () => {}).then((r) => r.id).catch(() => "") : Promise.resolve("");
    let dna = null;
    try { dna = await DNA().analyze(j.file, { keepUrl: true, onProgress: (p, acc) => { j.p = p; const now = performance.now(); if (now - last > 160 || p >= 1) { last = now; j.pal = DNA().partialPalette(acc); } paintJob(j); } }); }
    catch (e) { j.err = "No pude leer este archivo. Prueba con un MP4 o una imagen."; }
    j.phase = "guardando"; paintJob(j);
    const assetId = await up;
    if (!dna && !assetId) { j.phase = "error"; paintJob(j); return; }
    const name = j.name.replace(/\.[a-z0-9]{2,4}$/i, "");
    j.refId = await App.act.addRefDna({ kind: "file", assetId, name, dna, recipe: dna ? DNA().recipeFrom(dna, name) : null, note: assetId ? "" : "Pesa más de 19 MB: guardé su ADN, no el archivo." });
    j.phase = j.refId ? "listo" : "error"; if (!j.refId) j.err = "No se pudo guardar. Prueba de nuevo."; paintJob(j);
  }

  // ---------- acciones ----------
  const stationKey = () => { const s = $(".stn"); return s ? s.dataset.key : ""; };
  const A = App.acts;
  A.labtab = (el) => App.go("laboratorio" + (el.dataset.t === "mesa" ? "" : "/" + el.dataset.t));
  A.labverd = (el) => { const c = S.expCards.find((x) => x.id === el.dataset.id); if (!c) return; const v = c.verdict === el.dataset.v ? "" : el.dataset.v; c.verdict = v; App.act.setVerdict(c, v); App.render(true); };
  A.labrep = (el) => { const d = el.closest(".xc-demo").querySelector(".xd"); if (d) { d.classList.remove("live"); void d.offsetWidth; d.classList.add("live"); d.querySelectorAll("*").forEach((n) => { n.style.animation = "none"; void n.offsetWidth; n.style.animation = ""; }); } };
  A.labrefdel = (el) => {
    const r = S.refs.find((x) => x.id === el.dataset.id); if (!r) return;
    const m = App.modal(`<h3>¿Borrar «${esc(refName(r))}»?</h3><p class="muted">Se borra la referencia y su ADN. Los estilos que ya guardaste desde ella se quedan.</p><div class="acts"><button class="btn ghost" type="button" data-close>Cancelar</button><button class="btn bad" type="button" id="lab-del-go">Borrar</button></div>`);
    $("#lab-del-go", m.el).addEventListener("click", async () => { m.close(); await App.data.remove("refs", r.id); if (r.assetId && r.assetId !== "demo-video") App.adapter().deleteAsset(r.assetId); delete UI.lab.rec["ref:" + r.id]; App.go("laboratorio"); App.toast("Referencia borrada."); });
  };
  A.labdecide = (el) => { const s = S.expStyles.find((x) => x.id === el.dataset.id); if (s) App.act.decideStyle(s, el.dataset.st); };
  A.labcopy = async (el) => { const ok = await App.copyText(el.dataset.v); App.toast(ok ? `Copiado ${el.dataset.v}` : el.dataset.v); };
  A.labsave = () => {
    const key = stationKey(); if (!key) return; const R = effective(key);
    const m = App.modal(`<span class="eyebrow">Guardar estilo</span><h3>Ponle un nombre</h3><div class="field"><label class="sr" for="lab-name">Nombre</label><input id="lab-name" type="text" maxlength="60" value="${esc(R.name || "Mi estilo")}"></div><div class="lab-sv">${recipeMini(R)}</div><p class="muted">Pasa a tu Biblioteca y se puede elegir al pedir un video nuevo.</p><div class="acts"><button class="btn ghost" type="button" data-close>Cancelar</button><button class="btn pri" type="button" id="lab-save-go">Guardar</button></div>`);
    m.el.classList.add("lab-modal"); App.observeDemos(m.el); const inp = $("#lab-name", m.el); setTimeout(() => { inp.focus(); inp.select(); }, 60);
    const go = async () => {
      const name = inp.value.trim() || "Mi estilo", [k, id] = key.split(":"), b = $("#lab-save-go", m.el); b.disabled = true;
      const sid = await App.act.saveStyleFromRecipe(Object.assign({}, R, { name }), k === "ref" ? { ref: id } : { seed: id });
      if (!sid) { b.disabled = false; App.toast("No se guardó. Prueba de nuevo."); return; }
      m.el.innerHTML = `<div class="lab-ok"><span class="orb"></span><h3>«${esc(name)}» ya está en tu Biblioteca</h3><p class="muted">Lo puedes elegir al pedir un video nuevo.</p><div class="acts"><button class="btn ghost" type="button" data-close>Listo</button><button class="btn pri" type="button" id="lab-use">Usar en un video nuevo</button></div></div>`;
      App.morph.sparkles(m.el.querySelector(".lab-ok"), 6);
      $("#lab-use", m.el).addEventListener("click", () => { m.close(); UI.draft = Object.assign(UI.draft || {}, { style: sid }); App.go("crear"); });
    };
    $("#lab-save-go", m.el).addEventListener("click", go); inp.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  };
  A.labclaude = () => {
    const key = stationKey(); if (!key) return; const R = effective(key), [k, id] = key.split(":"), ref = k === "ref" ? S.refs.find((x) => x.id === id) : null, att = App.attach.make();
    const m = App.modal(`<span class="eyebrow">Pedirle a Claude</span><h3>Que lo recree en el Estudio</h3><p class="muted">Claude recibe la receta${ref ? " y la referencia" : ""}, arma el estilo con todo el detalle (palabras clave, fotos, sonido) y te lo deja para probar.</p>
      <div class="lab-cbox">${att.chips()}<textarea id="lab-cnote" rows="3" maxlength="1200" aria-label="Algo más" placeholder="Por ejemplo: igual pero con mi foto de fondo, sin tarjetas"></textarea><div class="lab-cbar">${att.btn()}${App.ai.pillHtml("global")}</div></div>
      <div class="acts"><button class="btn ghost" type="button" data-close>Cancelar</button><button class="btn pri" type="button" id="lab-c-go">${icon("sparkles")}Pedir</button></div>`);
    att.bind($(".lab-cbox", m.el));
    $("#lab-c-go", m.el).addEventListener("click", async (e) => {
      if (att.busy()) { App.toast("Espera a que terminen de subir los archivos."); return; }
      e.currentTarget.disabled = true; const res = await App.act.askRecreate(R, ref, $("#lab-cnote", m.el).value.trim(), att.take()); m.close();
      App.toast(!res ? "No se pudo pedir. Prueba de nuevo." : res.told ? "Claude ya lo recibió." : "Pedido guardado. Claude lo lee cuando haya una sesión abierta.");
    });
  };
})();
