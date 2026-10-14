// CORTE · page orchestration. One rAF loop reads scroll once and drives the
// hero cut, the styles monitor, El Grade, the seams between scenes, the nav
// timecode and La Cinta. The scrollcraft engine owns acts, cues, pans,
// reveals and counters; everything bespoke lives here.

import { STYLES, byId, drawFrame, fit } from './animatic.js';
import { createGround } from './ground.js';
import { createCamera } from './camera.js';
import { initCountdowns } from './countdown.js';

// The one place to change business facts the markup cannot know.
const CONFIG = {
  checkout: '',            // real checkout URL; empty keeps buttons on #precio
  pageSeconds: 90,         // the page is presented as a 90 second edit
  defaultClose: 'subtitulo-ajustado',
  // The launch offer ends here (ISO 8601 with a time zone). A real deadline,
  // never reset by the page. Empty hides the timer everywhere; once the date
  // passes, the page says the offer ended.
  offerEndsAt: '2026-10-15T17:40:00Z',
  // Length of the offer in hours: the inner ring of the dial shows what is left of it.
  offerWindowHours: 24
};

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const phoneMQ = matchMedia('(max-width: 860px)');
const coarse = matchMedia('(hover: none) and (pointer: coarse)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const mobile = () => phoneMQ.matches || coarse;
// Canvas backing stores and redraw rates are capped on phones: a 3x screen
// would otherwise paint nine pixels for every one the eye can use.
const dprCap = () => (mobile() ? 1.5 : 2);
const animGap = () => (mobile() ? 42 : 0);

const $ = (s, el = document) => el.querySelector(s);
// <dialog> reached phones late (iOS 15.4). Without showModal the panel opens
// as a plain fixed box instead of throwing and killing the button.
function openDlg(d) { if (typeof d.showModal === 'function') { try { d.showModal(); return; } catch (e) { /* already open */ } } d.setAttribute('open', ''); }
function closeDlg(d) { if (typeof d.close === 'function') d.close(); else d.removeAttribute('open'); }
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const easeIO = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
};

function fmtTC(sec) {
  sec = Math.max(0, sec);
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60), f = Math.floor((sec % 1) * 24);
  return `00:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

// ------------------------------------------------------------ headings --
// Split every H2 that takes El Grade into segments (text and em) and words.
function splitHeading(h) {
  let i = 0;
  const wrap = (el, text) => {
    el.textContent = '';
    const words = text.split(/\s+/).filter(Boolean);
    words.forEach((w, k) => {
      const s = document.createElement('span');
      s.className = 'w'; s.style.setProperty('--i', i++); s.textContent = w;
      el.appendChild(s);
      if (k < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  };
  const parts = [];
  Array.from(h.childNodes).forEach((n) => {
    const t = n.textContent.trim();
    if (!t) return;
    if (n.nodeType === 3) { const s = document.createElement('span'); s.className = 'seg'; wrap(s, t); parts.push(s); }
    else if (n.nodeType === 1) { n.classList.add('seg'); wrap(n, t); parts.push(n); }
  });
  h.textContent = '';
  parts.forEach((p, k) => { h.appendChild(p); if (k < parts.length - 1) h.appendChild(document.createTextNode(' ')); });
}
const gradedHeads = $$('h2[data-trat]');
gradedHeads.forEach(splitHeading);

// Claims are kinetic cues inside a flow act. Their windows are computed from
// the real layout so each sentence peaks when it crosses the middle.
function setClaimCues() {
  const sec = $('#porque');
  const vh = innerHeight;
  const top = sec.getBoundingClientRect().top + scrollY;
  const H = sec.offsetHeight;
  $$('[data-claim]', sec).forEach((el) => {
    const r = el.getBoundingClientRect();
    const o = r.top + scrollY - top + r.height / 2;
    const pc = (o + vh / 2) / (H + vh);
    const half = (vh * 0.5) / (H + vh);
    el.setAttribute('data-sc-cue', `${(pc - half).toFixed(3)} ${(pc + half * 0.92).toFixed(3)} 0.38 0.28`);
  });
}
setClaimCues();

// Without motion a pinned hero and a panning rail are just held screens, so
// give back the scroll they would otherwise spend standing still.
if (reduce) {
  document.getElementById('inicio').setAttribute('data-sc-span', '1.2');
  document.getElementById('estilos').setAttribute('data-sc-span', '1.3');
  document.getElementById('camara').setAttribute('data-sc-span', '1.2');
}

window.__corte = true;
const sc = window.ScrollCraft.instances[0] || window.ScrollCraft.mount(document.body);
const actOf = (el) => sc.acts.find((a) => a.el === el);

// ---------------------------------------------------------------- refs --
const S = {
  hero: $('#inicio'), costo: $('#costo'), estilos: $('#estilos'), tuyos: $('#tuyos'),
  como: $('#como'), camara: $('#camara'), porque: $('#porque'), necesitas: $('#necesitas'),
  precio: $('#precio'), faq: $('#faq'), cierre: $('#cierre')
};
const A = { hero: actOf(S.hero), estilos: actOf(S.estilos), cierre: actOf(S.cierre), como: actOf(S.como), camara: actOf(S.camara) };

// The three new parts: the scene that fires the flash, the offer timer, and the
// ground colour that follows the scroll.
const camera = createCamera(S.camara);
const ground = createGround({ ids: ['inicio', 'costo', 'estilos', 'tuyos', 'camara', 'como', 'porque', 'necesitas', 'precio', 'faq', 'cierre'], reduce });
initCountdowns({ endsAt: CONFIG.offerEndsAt, reduce, root: document, windowHours: CONFIG.offerWindowHours });
const bar = $('[data-bar]');
const tcEl = $('[data-tc]');
const gradeLabel = $('[data-grade-label]');
const lineA = $('.hero__line--a');
const heroStage = $('.hero__stage');

addEventListener('keydown', (e) => { if (e.key === 'Escape') $$('dialog[open]').forEach(closeDlg); });

// --------------------------------------------------------------- slate --
function runSlate() {
  if (!root.classList.contains('slate-on')) {
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('hero-in')));
    return;
  }
  const tc = $('[data-slate-tc]');
  const t0 = performance.now();
  let fontsOk = false;
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { fontsOk = true; });
  const tick = (now) => {
    const e = now - t0;
    tc.textContent = fmtTC(e / 1000);
    if (e < 1050 || (!fontsOk && e < 2200)) { requestAnimationFrame(tick); return; }
    root.classList.add('slate-out');
    setTimeout(() => root.classList.add('hero-in'), 380);
    try { sessionStorage.setItem('corte-slate', '1'); } catch (err) { /* ignore */ }
    setTimeout(() => root.classList.remove('slate-on', 'slate-out'), 950);
  };
  requestAnimationFrame(tick);
}
runSlate();

// ----------------------------------------------------- WebGL: La Cinta --
const HERO_STYLES = ['subtitulo-ajustado', 'reel-negocio', 'ensayo-visual', 'reel-personal', 'panel-explicativo'];
let stage = null;
let reelCanvases = [];
let glReady = false;
async function initGL() {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) throw new Error('no webgl');
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    const { createStage } = await import('./ribbon.js');
    const n = mobile() ? 3 : 5;
    reelCanvases = HERO_STYLES.slice(0, n).map(() => {
      const c = document.createElement('canvas'); c.width = 270; c.height = 480; return c;
    });
    reelCanvases.forEach((c, i) => drawFrame(c, byId[HERO_STYLES[i]], byId[HERO_STYLES[i]].thumb));
    stage = createStage({ back: $('#gl-back'), front: $('#gl-front'), mobile: mobile(), reduce, reelCanvases });
    glReady = true;
    root.classList.add('webgl');
  } catch (e) {
    root.classList.add('no-webgl');
  }
}

// ------------------------------------------------------------------ nav --
const binDlg = $('#bin');
const binList = $('[data-bin-list]');
const clipSecs = $$('main > section[data-clip]');
function maxScroll() { return Math.max(1, document.documentElement.scrollHeight - innerHeight); }
function buildBin() {
  binList.textContent = '';
  const max = maxScroll();
  clipSecs.forEach((sec) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + sec.id;
    const top = sec.getBoundingClientRect().top + scrollY;
    a.innerHTML = `<span class="tc">${fmtTC((Math.min(top, max) / max) * CONFIG.pageSeconds)}</span><span class="nm"></span><i class="here" aria-hidden="true"></i>`;
    a.querySelector('.nm').textContent = sec.dataset.clip;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      closeDlg(binDlg);
      jumpTo(sec.getBoundingClientRect().top + scrollY + 2);
    });
    li.appendChild(a); binList.appendChild(li);
  });
}
function jumpTo(y) { window.scrollTo({ top: y, behavior: reduce ? 'instant' : 'smooth' }); }
$('[data-open-bin]').addEventListener('click', () => {
  buildBin();
  const cur = currentSection();
  $$('a', binList).forEach((a) => a.setAttribute('aria-current', a.hash === '#' + cur ? 'true' : 'false'));
  openDlg(binDlg);
});
$('[data-close-bin]').addEventListener('click', () => closeDlg(binDlg));
binDlg.addEventListener('click', (e) => { if (e.target === binDlg) closeDlg(binDlg); });
function currentSection() {
  const mid = innerHeight * 0.5;
  let id = clipSecs[0].id;
  clipSecs.forEach((s) => { if (s.getBoundingClientRect().top <= mid) id = s.id; });
  return id;
}

// ------------------------------------------------------------- estilos --
const clips = $$('.clip');
const rail = $('[data-rail]');
const monitor = $('[data-monitor]');
const monCanvas = $('[data-mon-canvas]');
const monTc = $('[data-mon-tc]');
const monVideo = $('[data-mon-video]');
const info = $('[data-info]');
const infoName = $('[data-info-name]'), infoLine = $('[data-info-line]'), infoFmt = $('[data-info-fmt]'), infoGroup = $('[data-info-group]');
const applyBtn = $('[data-apply]');
const appliedMsg = $('[data-applied]');
let active = clips[0].dataset.style;
let monStart = performance.now();

clips.forEach((btn) => {
  const s = byId[btn.dataset.style];
  btn.setAttribute('aria-label', `${s.name}, ${s.tool ? 'herramienta' : s.fmt}. ${s.line} Aplicar a la página.`);
  btn.setAttribute('aria-pressed', 'false');
});

// A real sample, when the catalogue has one, replaces the animatic on screen.
function showSample(videoEl, s) {
  const src = s.video || '';
  if (!src || reduce) {
    if (!videoEl.hidden) { videoEl.pause(); videoEl.hidden = true; }
    return false;
  }
  if (videoEl.dataset.src !== src) { videoEl.dataset.src = src; videoEl.src = src; }
  if (videoEl.hidden) videoEl.hidden = false;
  if (videoEl.paused) { const p = videoEl.play(); if (p && p.catch) p.catch(() => {}); }
  return true;
}

function drawThumbs() {
  clips.forEach((btn) => {
    const cv = btn.querySelector('canvas');
    fit(cv, dprCap());
    const s = byId[btn.dataset.style];
    drawFrame(cv, s, s.thumb);
  });
}

// Hover scrub: the pointer's x across a clip is its playhead, as in an editor.
if (fine) {
  clips.forEach((btn) => {
    const cv = btn.querySelector('canvas');
    const s = byId[btn.dataset.style];
    btn.addEventListener('pointermove', (e) => {
      const r = cv.getBoundingClientRect();
      const f = clamp01((e.clientX - r.left) / r.width);
      drawFrame(cv, s, f * s.dur);
    });
    btn.addEventListener('pointerleave', () => drawFrame(cv, s, s.thumb));
  });
}

function padRail() {
  const vw = innerWidth;
  const first = clips[0], last = clips[clips.length - 1];
  const firstGroup = rail.firstElementChild;
  const gap = parseFloat(getComputedStyle(rail).columnGap || getComputedStyle(rail).gap) || 14;
  const padL = Math.max(0, vw / 2 - firstGroup.offsetWidth - gap - first.offsetWidth / 2);
  const padR = Math.max(0, vw / 2 - last.offsetWidth / 2);
  rail.style.paddingLeft = padL + 'px';
  rail.style.paddingRight = padR + 'px';
}

function setActive(id) {
  if (id === active && monitor.dataset.ready) return;
  active = id;
  monitor.dataset.ready = '1';
  const s = byId[id];
  clips.forEach((c) => c.classList.toggle('is-active', c.dataset.style === id));
  monitor.dataset.fmt = s.fmt;
  info.classList.add('is-swap');
  setTimeout(() => {
    infoName.textContent = s.name;
    infoLine.textContent = s.line;
    infoFmt.textContent = s.fmt;
    infoGroup.textContent = s.tool ? 'Herramienta' : s.fmt === '9:16' ? 'Formato corto' : 'Formato largo';
    info.classList.remove('is-swap');
  }, reduce ? 0 : 140);
  applyBtn.classList.toggle('is-on', root.dataset.estilo === id);
  applyBtn.textContent = root.dataset.estilo === id ? 'Aplicado a la página' : 'Aplicar a toda la página';
  monStart = performance.now();
  requestAnimationFrame(() => fit(monCanvas, dprCap()));
}

function railCenterP(btn) {
  const over = rail.scrollWidth - innerWidth;
  if (over <= 0) return 0;
  const cx = btn.offsetLeft + btn.offsetWidth / 2;
  return clamp01((cx - innerWidth / 2) / over);
}
function scrollToClip(btn) {
  const a = A.estilos;
  if (!a || reduce) { btn.scrollIntoView({ block: 'nearest', inline: 'center' }); return; }
  const p = railCenterP(btn);
  const y = a.top + p * (a.height - innerHeight);
  window.scrollTo({ top: y, behavior: 'smooth' });
}

clips.forEach((btn) => {
  btn.addEventListener('click', () => { setActive(btn.dataset.style); applyGrade(btn.dataset.style); scrollToClip(btn); });
  btn.addEventListener('focus', () => { if (!btn.matches(':hover')) { setActive(btn.dataset.style); if (!reduce) { const a = A.estilos; window.scrollTo({ top: a.top + railCenterP(btn) * (a.height - innerHeight), behavior: 'instant' }); } } });
});
applyBtn.addEventListener('click', () => applyGrade(active));

// "Ver todos": the whole catalogue as a grid, for people who want to choose
// without travelling the timeline.
const allDlg = $('#todos');
const allGrid = $('[data-all-grid]');
let allBuilt = false;
function buildAll() {
  if (allBuilt) return; allBuilt = true;
  STYLES.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'all__item' + (s.fmt === '16:9' ? ' all__item--wide' : '');
    b.dataset.style = s.id;
    b.innerHTML = '<canvas></canvas><b></b><small></small>';
    b.querySelector('b').textContent = s.name;
    b.querySelector('small').textContent = s.line;
    b.addEventListener('click', () => {
      closeDlg(allDlg);
      setActive(s.id); applyGrade(s.id);
      const btn = clips.find((c) => c.dataset.style === s.id);
      if (btn) scrollToClip(btn);
    });
    if (fine) {
      const cv = b.querySelector('canvas');
      b.addEventListener('pointermove', (e) => { const r = cv.getBoundingClientRect(); drawFrame(cv, s, clamp01((e.clientX - r.left) / r.width) * s.dur); });
      b.addEventListener('pointerleave', () => drawFrame(cv, s, s.thumb));
    }
    allGrid.appendChild(b);
  });
}
$('[data-open-all]').addEventListener('click', () => {
  buildAll();
  openDlg(allDlg);
  $$('.all__item', allGrid).forEach((b) => {
    const cv = b.querySelector('canvas'); fit(cv, dprCap()); drawFrame(cv, byId[b.dataset.style], byId[b.dataset.style].thumb);
    b.setAttribute('aria-pressed', root.dataset.estilo === b.dataset.style ? 'true' : 'false');
  });
});
$('[data-close-all]').addEventListener('click', () => closeDlg(allDlg));
allDlg.addEventListener('click', (e) => { if (e.target === allDlg) closeDlg(allDlg); });

// ---------------------------------------------------------------- close --
const closeCanvas = $('[data-close-canvas]');
const closeVideo = $('[data-close-video]');
const renderLabel = $('[data-render-label]');
let closeStyle = CONFIG.defaultClose;

// -------------------------------------------------------------- El Grade --
const GRADES = {
  acento: { heat: 1.15, sheen: 0.6, twist: 1.35, speed: 1.0 },
  palabra: { heat: 0.6, sheen: 1.15, twist: 2.1, speed: 1.75 },
  apilado: { heat: 0.8, sheen: 0.45, twist: 0.55, speed: 0.8 },
  limpio: { heat: 0.28, sheen: 0.95, twist: 0.35, speed: 0.6 }
};
const fxGrade = $('.fx-grade');
const closeName = $('[data-close-name]');
const exportGrade = $('[data-export-grade]');
const exportGradeName = $('[data-export-grade-name]');

const headIO = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-on'); headIO.unobserve(e.target); } });
}, { threshold: 0.5 }) : null;
function rearmHeadings() {
  gradedHeads.forEach((h) => {
    h.classList.remove('is-on');
    if (headIO) headIO.observe(h); else h.classList.add('is-on');
  });
}

function checkoutHref(id) {
  if (!CONFIG.checkout) return '#precio';
  const u = new URL(CONFIG.checkout, location.href);
  if (id) { u.searchParams.set('estilo', id); u.searchParams.set('utm_content', id); }
  return u.toString();
}
$$('[data-checkout]').forEach((a) => { a.href = checkoutHref(null); });

function applyGrade(id, opts = {}) {
  const s = byId[id];
  if (!s) return;
  const changed = root.dataset.estilo !== id;
  root.dataset.estilo = id;
  root.dataset.trat = s.trat;
  root.classList.add('is-graded');
  gradeLabel.textContent = 'Grade · ' + s.name;
  if (stage) stage.setGrade(GRADES[s.trat]);
  clips.forEach((c) => c.setAttribute('aria-pressed', c.dataset.style === id ? 'true' : 'false'));
  applyBtn.classList.toggle('is-on', active === id);
  applyBtn.textContent = active === id ? 'Aplicado a la página' : 'Aplicar a toda la página';
  closeName.textContent = s.name;
  exportGrade.hidden = false;
  exportGradeName.textContent = s.name;
  $$('[data-checkout]').forEach((a) => { a.href = checkoutHref(id); });
  store.set('corte-estilo', id);
  try { const u = new URL(location.href); u.searchParams.set('estilo', id); history.replaceState(history.state, '', u); } catch (e) { /* file:// */ }
  if (!opts.quiet) {
    appliedMsg.textContent = `Aplicado. Desde aquí, la página se edita como «${s.name}».`;
    if (changed && !reduce) { fxGrade.classList.remove('is-on'); void fxGrade.offsetWidth; fxGrade.classList.add('is-on'); }
  }
  closeStyle = id;
  rearmHeadings();
}

// Restore a grade from the URL or a previous visit.
(function restoreGrade() {
  let id = null;
  try { id = new URL(location.href).searchParams.get('estilo'); } catch (e) { /* ignore */ }
  if (!id || !byId[id]) id = store.get('corte-estilo');
  if (id && byId[id]) applyGrade(id, { quiet: true });
  else rearmHeadings();
})();


// ------------------------------------------------------------- pointer --
let ptr = { x: innerWidth / 2, y: innerHeight / 2, on: false };
if (fine && !reduce) {
  addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true; } }, { passive: true });
  document.addEventListener('pointerleave', () => { ptr.on = false; });
}

// ------------------------------------------------------------- layout --
let razorY = 0;
function measure() {
  const lr = lineA.getBoundingClientRect();
  const sr = heroStage.getBoundingClientRect();
  razorY = lr.bottom - sr.top + lr.height * 0.03;
  heroStage.style.setProperty('--razor-y', razorY + 'px');
  $('.hero__razor').style.top = razorY + 'px';
  $('.hero__tag').style.top = razorY + 'px';
  padRail();
  drawThumbs();
  fit(monCanvas, dprCap());
  fit(closeCanvas, dprCap());
}

// ------------------------------------------------------------------ loop --
const whipEl = $('[data-whip]');
const sheetEl = $('[data-sheet]');
const estStage = $('.estilos__stage');
let lastReel = 0, lastMon = 0, lastClose = 0;
const heroAnchor = $('.hero__anchor');
const costoAnchor = $('[data-anchor="costo"]');
const trackEl = $('.track');
const braidEl = $('[data-anchor="tuyos"]');
const renderMon = $('.render__monitor');

function cover(el, vh) {
  const r = el.getBoundingClientRect();
  return Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) / vh;
}
function rectOf(el) { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }

function loop(now) {
  requestAnimationFrame(loop);
  if (document.hidden) return;
  const vh = innerHeight, vw = innerWidth, y = scrollY;
  const max = maxScroll();
  const gd = ground.update();

  // nav
  bar.classList.toggle('is-solid', y > 24);
  tcEl.textContent = fmtTC((y / max) * CONFIG.pageSeconds);

  // hero: the cut
  const hp = A.hero ? A.hero.p : 0;
  const cut = reduce ? 0 : easeIO((hp - 0.12) / 0.43);
  const razor = reduce ? 0 : easeOut((hp - 0.04) / 0.22);
  const open = reduce ? 1 : easeOut((hp - 0.28) / 0.27);
  const exit = reduce ? 0 : clamp01((hp - 0.86) / 0.14);
  S.hero.style.setProperty('--cut', cut.toFixed(4));
  S.hero.style.setProperty('--razor', razor.toFixed(4));
  S.hero.style.setProperty('--open', open.toFixed(4));
  S.hero.style.setProperty('--exit', exit.toFixed(4));

  // estilos: active clip under the playhead
  const estCover = cover(S.estilos, vh);
  if (estCover > 0) {
    let best = null, bd = Infinity;
    const c = vw / 2;
    for (const btn of clips) {
      const r = btn.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - c);
      if (d < bd) { bd = d; best = btn; }
    }
    if (best) setActive(best.dataset.style);
    const s = byId[active];
    const t = (now - monStart) / 1000;
    if (showSample(monVideo, s)) { /* the real sample is playing */ }
    else if (!reduce) { if (now - lastMon >= animGap()) { lastMon = now; drawFrame(monCanvas, s, t); } }
    else if (monCanvas.dataset.drawn !== active) { drawFrame(monCanvas, s, s.thumb); monCanvas.dataset.drawn = active; }
    monTc.textContent = '00:00:' + String(Math.floor(t % s.dur)).padStart(2, '0') + ':' + String(Math.floor(((t % s.dur) % 1) * 24)).padStart(2, '0');
    // whip out: in the last stretch of the pin the frame is thrown left
    const ep = A.estilos ? A.estilos.p : 0;
    const wx = reduce ? 0 : Math.pow(clamp01((ep - 0.94) / 0.06), 2) * vw * 0.4;
    estStage.style.setProperty('--whipx', wx.toFixed(1));
  }

  // tuyos: whip pan in
  if (whipEl && !reduce) {
    const r = S.tuyos.getBoundingClientRect();
    const k = easeOut((vh - r.top) / (vh * 0.8));
    whipEl.style.transform = k >= 1 ? 'none' : `translate3d(${((1 - k) * 26).toFixed(2)}vw,0,0) skewX(${((1 - k) * -8).toFixed(2)}deg)`;
    whipEl.style.opacity = (0.15 + 0.85 * k).toFixed(3);
  }

  // camara: the scene is a pure function of its own scroll progress
  if (A.camara && cover(S.camara, vh) > 0) camera.update(A.camara.p, { reduce });

  // precio: the sheet slides up over the dark
  if (sheetEl) {
    const r = S.precio.getBoundingClientRect();
    sheetEl.style.setProperty('--sheet', reduce ? '1' : easeOut((vh - r.top) / (vh * 0.95)).toFixed(4));
  }

  // cierre: the render plate plays the chosen style
  const ciCover = cover(S.cierre, vh);
  if (ciCover > 0) {
    const s = byId[closeStyle] || byId[CONFIG.defaultClose];
    if (showSample(closeVideo, s)) { /* real sample */ }
    else if (!reduce) { if (now - lastClose >= animGap()) { lastClose = now; drawFrame(closeCanvas, s, now / 1000); } }
    else if (closeCanvas.dataset.drawn !== s.id) { drawFrame(closeCanvas, s, s.thumb); closeCanvas.dataset.drawn = s.id; }
    const cp = A.cierre ? A.cierre.p : 0;
    renderLabel.textContent = cp >= 0.5 ? 'Listo para publicar' : 'Renderizando';
  }

  // hero reels: their animatics play only while the hero is on screen
  const heroCover = cover(S.hero, vh);
  if (glReady && heroCover > 0 && now - lastReel > (mobile() ? 66 : 33)) {
    lastReel = now;
    reelCanvases.forEach((c, i) => drawFrame(c, byId[HERO_STYLES[i]], reduce ? byId[HERO_STYLES[i]].thumb : now / 1000 + i * 1.7));
  }

  // La Cinta
  if (glReady) {
    const states = [];
    const add = (el, shape, box, opacity) => { const w = cover(el, vh); if (w > 0) states.push({ w, shape, box, opacity, key: el.id }); };
    const hb = rectOf(heroAnchor);
    add(S.hero, 'nudo', hb);
    add(S.costo, 'hilo', rectOf(costoAnchor));
    add(S.estilos, 'pista', rectOf(trackEl));
    add(S.tuyos, 'trenza', rectOf(braidEl));
    add(S.camara, 'off', null, 0);
    add(S.como, 'off', null, 0);
    add(S.porque, 'off', null, 0);
    add(S.necesitas, 'off', null, 0);
    add(S.precio, 'off', null, 0);
    add(S.faq, 'off', null, 0);
    if (ciCover > 0) {
      const r = renderMon.getBoundingClientRect();
      const side = r.height * 1.42;
      states.push({ w: ciCover, shape: 'loop', key: 'cierre', box: { x: r.left + r.width / 2 - side / 2, y: r.top + r.height / 2 - side / 2, w: side, h: side } });
    }
    if (fine && !reduce) stage.setPointer(ptr.x, ptr.y, ptr.on && heroCover > 0.3);
    stage.setGold(gd.gold);
    stage.frame({ states, heroBox: hb, heroExit: reduce ? 0 : clamp01((hp - 0.1) / 0.62), ready: !root.classList.contains('slate-on') || root.classList.contains('slate-out') });
  }
}

// ---------------------------------------------------------------- boot --
function boot() {
  measure();
  setActive(active);
  requestAnimationFrame(loop);
}
let resizeT = 0;
addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => { measure(); if (stage) stage.resize(); camera.resize(); ground.refresh(); }, 120);
});
(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { measure(); });
initGL().finally(boot);
