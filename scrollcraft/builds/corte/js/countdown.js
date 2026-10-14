// CORTE · temporizador de oferta.
//
//   import { initCountdowns } from './countdown.js';
//   const cd = initCountdowns({ endsAt: '2026-10-21T23:59:59-05:00', reduce, root: document });
//   cd.state();    // 'live' | 'ended' | 'none'
//   cd.destroy();  // stops every timer and frame, restores the mount points
//
// Mount points are plain elements with data-countdown="chip" | "big" | "line".
// The module builds all inner DOM. Load order: corte.css, then countdown.css.
//
// Truth rules: remaining = endsAt - Date.now(), recomputed on every tick and
// never accumulated. The tick fires on the boundary where the displayed second
// changes. A tab that comes back from the background recomputes at once and
// swaps digits without animating. There is no fake or auto-resetting timer:
// invalid or missing endsAt hides the countdown, a past endsAt shows "ended".

const ROLL_MS = 420;                 // matches --cd-roll in countdown.css
const SETTLE_MS = ROLL_MS + 60;      // when a finished roll is swept away
const KNOWN = { chip: 1, big: 1, line: 1 };

const registry = new WeakMap();      // root -> { key, api }
const owners = new WeakMap();        // mount element -> restore()

function parseEnd(v) {
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  if (typeof v === 'string') {
    const s = v.trim();
    return s ? Date.parse(s) : NaN;
  }
  return NaN;
}

function plural(n, one, many) { return n === 1 ? `1 ${one}` : `${n} ${many}`; }

// "La oferta termina en 6 días, 23 horas y 41 minutos."
function sentence(d, h, m) {
  const parts = [];
  if (d) parts.push(plural(d, 'día', 'días'));
  if (d || h) parts.push(plural(h, 'hora', 'horas'));
  if (d || h || m) parts.push(plural(m, 'minuto', 'minutos'));
  const when = !parts.length ? 'menos de un minuto'
    : parts.length === 1 ? parts[0]
    : parts.slice(0, -1).join(', ') + ' y ' + parts[parts.length - 1];
  return `La oferta termina en ${when}.`;
}

// ----------------------------------------------------------- digit cells --
// One cell per character. A change adds the incoming glyph under the old one;
// CSS slides the old one up and out and lifts the new one in. Only transform
// and opacity animate, and the cell clips, so layout never moves.
function newCell(ch) {
  const el = document.createElement('span');
  el.className = 'cd-d';
  const g = document.createElement('span');
  g.className = 'cd-g';
  g.textContent = ch;
  el.appendChild(g);
  return { el, v: ch };
}

function setDigit(cell, ch, animate, timers) {
  if (cell.v === ch) return;
  cell.v = ch;
  const el = cell.el;
  while (el.childNodes.length > 1) el.removeChild(el.firstChild);   // settle a roll in flight
  const cur = el.firstChild;
  if (!animate) { cur.className = 'cd-g'; cur.textContent = ch; return; }
  const nxt = document.createElement('span');
  nxt.className = 'cd-g cd-g--in';
  nxt.textContent = ch;
  cur.classList.remove('cd-g--in');
  cur.classList.add('cd-g--out');
  el.appendChild(nxt);
  const id = setTimeout(() => {
    timers.delete(id);
    if (cur.parentNode === el) el.removeChild(cur);
    nxt.classList.remove('cd-g--in');
  }, SETTLE_MS);
  timers.add(id);
}

function fillGroup(host, width) {
  const group = { host, cells: [] };
  for (let i = 0; i < width; i++) { const c = newCell('0'); host.appendChild(c.el); group.cells.push(c); }
  return group;
}

function setGroup(group, n, animate, timers) {
  let str = String(n);
  while (str.length > group.cells.length) {                         // a clock set back needs a wider day count
    const c = newCell('0');
    group.host.insertBefore(c.el, group.host.firstChild);
    group.cells.unshift(c);
  }
  str = str.padStart(group.cells.length, '0');
  for (let i = 0; i < group.cells.length; i++) setDigit(group.cells[i], str[i], animate, timers);
}

function groupsOf(el, dayWidth) {
  const out = {};
  el.querySelectorAll('[data-g]').forEach((host) => {
    const k = host.getAttribute('data-g');
    out[k] = fillGroup(host, k === 'd' ? dayWidth : 2);
  });
  return out;
}

// ----------------------------------------------------------------- dial --
// A 60-tick ring on a 200-unit grid, centre (100,100). Tick i sits at 6*i
// degrees from twelve o'clock. Gold ticks are the seconds already gone from
// this minute, the red tick is the one the hand is crossing right now.
function dialSvg() {
  let ticks = '';
  for (let i = 0; i < 60; i++) {
    const a = (i * 6 * Math.PI) / 180;
    const r1 = i % 15 === 0 ? 77 : i % 5 === 0 ? 82 : 87;
    const r2 = 96;
    const x1 = (100 + r1 * Math.sin(a)).toFixed(2), y1 = (100 - r1 * Math.cos(a)).toFixed(2);
    const x2 = (100 + r2 * Math.sin(a)).toFixed(2), y2 = (100 - r2 * Math.cos(a)).toFixed(2);
    ticks += `<line class="cd__t${i % 5 === 0 ? ' cd__t--m' : ''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  }
  // Registration marks on the four axes, between the two inner rings.
  const reg = [[100, 42, 100, 24], [158, 100, 176, 100], [100, 158, 100, 176], [42, 100, 24, 100]]
    .map(([a, b, c, d]) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}"/>`).join('');
  return `<svg class="cd__svg" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
    <circle class="cd__face" cx="100" cy="100" r="99"/>
    <g class="cd__ticks">${ticks}</g>
    <circle class="cd__ring cd__ring--gold" cx="100" cy="100" r="72"/>
    <circle class="cd__ring" cx="100" cy="100" r="58"/>
    <g class="cd__reg">${reg}</g>
  </svg>`;
}

// ---------------------------------------------------------------- mounts --
// Each builder returns { update(model, animate, timers), restore(), ...extras }.
function addRoot(el, variant) {
  const prev = owners.get(el);                 // another instance owned this mount: undo it first
  if (prev) prev();
  const before = { cls: el.className, role: el.getAttribute('role'), live: el.getAttribute('aria-live') };
  el.classList.add('cd', `cd--${variant}`);
  el.setAttribute('role', 'timer');
  el.setAttribute('aria-live', 'off');
  const restore = () => {
    el.className = before.cls;
    if (before.role === null) el.removeAttribute('role'); else el.setAttribute('role', before.role);
    if (before.live === null) el.removeAttribute('aria-live'); else el.setAttribute('aria-live', before.live);
    el.removeAttribute('data-state');
    el.textContent = '';
    owners.delete(el);
  };
  owners.set(el, restore);
  return restore;
}

function setSr(m, model) {
  const key = model.d + '.' + model.h + '.' + model.m;
  if (key === m.srKey) return;
  m.srKey = key;
  m.sr.textContent = sentence(model.d, model.h, model.m);
}

// chip and line share one readout: REC light, label, "06d 23:41:09".
function buildReadout(variant, label) {
  return function (el, dayWidth) {
    const restore = addRoot(el, variant);
    el.innerHTML =
      '<span class="cd__rec" aria-hidden="true"></span>' +
      `<span class="cd__lab" aria-hidden="true">${label}</span>` +
      '<span class="cd__time" aria-hidden="true">' +
        '<span class="cd__grp" data-g="d"></span><span class="cd__unit">d</span><span class="cd__gap"></span>' +
        '<span class="cd__grp" data-g="h"></span><span class="cd__sep">:</span>' +
        '<span class="cd__grp" data-g="m"></span><span class="cd__sep">:</span>' +
        '<span class="cd__grp" data-g="s"></span>' +
      '</span><span class="cd__sr"></span>';
    const g = groupsOf(el, dayWidth);
    const m = { el, restore, sr: el.querySelector('.cd__sr'), srKey: '' };
    m.update = (model, animate, timers) => {
      setGroup(g.d, model.d, animate, timers); setGroup(g.h, model.h, animate, timers);
      setGroup(g.m, model.m, animate, timers); setGroup(g.s, model.s, animate, timers);
      setSr(m, model);
    };
    return m;
  };
}

function buildBig(el, dayWidth) {
  const restore = addRoot(el, 'big');
  el.innerHTML =
    '<p class="cd__title" aria-hidden="true"><i class="cd__rec"></i>La oferta de lanzamiento termina en</p>' +
    '<div class="cd__board" aria-hidden="true">' +
      '<div class="cd__units">' +
        '<div class="cd__col"><span class="cd__num" data-g="d"></span><span class="cd__cap">Días</span></div>' +
        '<span class="cd__colon">:</span>' +
        '<div class="cd__col"><span class="cd__num" data-g="h"></span><span class="cd__cap">Horas</span></div>' +
        '<span class="cd__colon">:</span>' +
        '<div class="cd__col"><span class="cd__num" data-g="m"></span><span class="cd__cap">Min</span></div>' +
      '</div>' +
      '<div class="cd__dial">' + dialSvg() +
        '<div class="cd__sweep"><i class="cd__wedge"></i><i class="cd__hand"></i></div>' +
        '<div class="cd__core"><span class="cd__num cd__num--s" data-g="s"></span><span class="cd__cap">Seg</span></div>' +
      '</div>' +
    '</div><span class="cd__sr"></span>';
  const g = groupsOf(el, dayWidth);
  const ticks = Array.from(el.querySelectorAll('.cd__t'));
  const sweep = el.querySelector('.cd__sweep');
  const m = { el, restore, sr: el.querySelector('.cd__sr'), srKey: '', k: -1, big: true };
  m.setAngle = (deg) => { sweep.style.transform = `rotate(${deg.toFixed(2)}deg)`; };
  // Gold behind the red tick, faint ahead of it. Normally one tick moves per
  // second; a jump (tab returning, minute rollover) repaints all sixty.
  m.setRing = (k) => {
    if (k === m.k) return;
    if (m.k >= 0 && k === m.k + 1) {
      ticks[m.k].classList.remove('is-now'); ticks[m.k].classList.add('is-on');
      ticks[k].classList.add('is-now');
    } else {
      for (let i = 0; i < 60; i++) {
        ticks[i].classList.toggle('is-on', i < k);
        ticks[i].classList.toggle('is-now', i === k);
      }
    }
    m.k = k;
  };
  m.update = (model, animate, timers) => {
    setGroup(g.d, model.d, animate, timers); setGroup(g.h, model.h, animate, timers);
    setGroup(g.m, model.m, animate, timers); setGroup(g.s, model.s, animate, timers);
    m.setRing(model.k);
    setSr(m, model);
  };
  return m;
}

function buildEnded(el) {
  const restore = addRoot(el, 'big');
  el.classList.add('is-ended');
  el.setAttribute('data-state', 'ended');
  el.innerHTML = '<p class="cd__ended">La oferta de lanzamiento terminó.</p>';
  return { el, restore };
}

const BUILDERS = { chip: buildReadout('chip', 'Oferta'), line: buildReadout('line', 'Termina en'), big: buildBig };

// ------------------------------------------------------------------- api --
export function initCountdowns({ endsAt, reduce, root } = {}) {
  const scope = root || document;
  const doc = scope.ownerDocument || document;
  const html = doc.documentElement;
  const win = doc.defaultView || window;

  const key = String(endsAt instanceof Date ? endsAt.getTime() : endsAt) + '|' + String(reduce);
  const prev = registry.get(scope);
  if (prev) {
    if (prev.key === key) return prev.api;       // idempotent: same call, same instance
    prev.api.destroy();                          // a changed offer remounts cleanly
  }

  const end = parseEnd(endsAt);
  const mq = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let reduced = reduce == null ? !!(mq && mq.matches) : !!reduce;
  const onMq = () => {
    if (reduce != null) return;
    reduced = !!mq.matches; applyMotion(); lastT = -1; tick(false); kick();
  };
  if (mq && reduce == null && mq.addEventListener) mq.addEventListener('change', onMq);

  const els = Array.from(scope.querySelectorAll('[data-countdown]'));
  if (scope.matches && scope.matches('[data-countdown]')) els.unshift(scope);

  const hiddenByUs = new Set();
  const hide = (el) => { if (!el.hasAttribute('hidden')) { el.setAttribute('hidden', ''); hiddenByUs.add(el); } };
  const hideWithWrap = (el) => { hide(el); const w = el.closest('[data-offer-wrap]'); if (w) hide(w); };

  let current = 'none';
  let destroyed = false;
  let mounts = [];                 // live mounts
  let endedMounts = [];            // big mounts showing the ended message
  let timer = 0, raf = 0, io = null, lastT = -1;
  const timers = new Set();        // pending roll clean-ups
  const seen = new Set();          // big mounts currently on screen

  const setState = (s) => { current = s; html.dataset.offer = s; };
  // is-still lets CSS hold the REC light when motion is reduced by the caller rather than the OS.
  const applyMotion = () => mounts.forEach((m) => m.el.classList.toggle('is-still', reduced));

  // ----- terminal states
  function showEnded() {
    clearTimeout(timer); timer = 0;
    if (raf) { win.cancelAnimationFrame(raf); raf = 0; }
    seen.clear();
    mounts.forEach((m) => m.restore());
    mounts = [];
    setState('ended');
    els.forEach((el) => {
      if (el.getAttribute('data-countdown') === 'big') endedMounts.push(buildEnded(el));
      else hideWithWrap(el);
    });
  }

  function showNone() {
    setState('none');
    els.forEach(hideWithWrap);
  }

  // ----- live loop
  function tick(animate = true) {
    if (destroyed || current !== 'live') return;
    clearTimeout(timer); timer = 0;
    const rem = end - Date.now();
    if (rem <= 0) { showEnded(); return; }
    const T = Math.ceil(rem / 1000);
    if (T !== lastT) {
      const step = lastT - T;
      const anim = animate && !reduced && !doc.hidden && step === 1;
      const s = T % 60;
      const model = {
        d: Math.floor(T / 86400), h: Math.floor((T % 86400) / 3600), m: Math.floor((T % 3600) / 60), s,
        k: (60 - s) % 60
      };
      lastT = T;
      mounts.forEach((m) => {
        m.update(model, anim, timers);
        if (m.big && (reduced || !seen.has(m))) m.setAngle(model.k * 6);    // no frame loop: rest on the tick
      });
    }
    // The next time the displayed second changes is when rem crosses a multiple of 1000.
    timer = setTimeout(tick, ((rem - 1) % 1000) + 1 + 2);
  }

  // The sweep is the only thing that needs frames, and only while it can be seen.
  function frame() {
    raf = 0;
    if (destroyed || current !== 'live' || reduced || doc.hidden || !seen.size) return;
    const rem = end - Date.now();
    if (rem <= 0) return;
    const deg = 360 * (1 - (rem % 60000) / 60000);
    seen.forEach((m) => m.setAngle(deg));
    raf = win.requestAnimationFrame(frame);
  }
  function kick() {
    if (!raf && !destroyed && current === 'live' && !reduced && !doc.hidden && seen.size) raf = win.requestAnimationFrame(frame);
  }

  function onVisible() { if (!doc.hidden) { tick(false); kick(); } }

  // ----- go
  if (!Number.isFinite(end)) {
    showNone();
  } else if (end <= Date.now()) {
    showEnded();
  } else {
    setState('live');
    const T0 = Math.ceil((end - Date.now()) / 1000);
    const dayWidth = Math.max(2, String(Math.floor(T0 / 86400)).length);
    els.forEach((el) => {
      const v = el.getAttribute('data-countdown');
      if (!KNOWN[v]) return;
      if (hiddenByUs.has(el)) return;
      mounts.push(BUILDERS[v](el, dayWidth));
    });
    applyMotion();
    const bigs = mounts.filter((m) => m.big);
    if (bigs.length) {
      if ('IntersectionObserver' in win) {
        io = new win.IntersectionObserver((entries) => {
          entries.forEach((e) => {
            const m = bigs.find((b) => b.el === e.target);
            if (!m) return;
            if (e.isIntersecting) seen.add(m); else seen.delete(m);
          });
          kick();
        }, { threshold: 0 });
        bigs.forEach((m) => io.observe(m.el));
      } else {
        bigs.forEach((m) => seen.add(m));
      }
    }
    tick(false);
    kick();
    doc.addEventListener('visibilitychange', onVisible);
    win.addEventListener('pageshow', onVisible);
  }

  const api = {
    state() {
      if (!destroyed && current === 'live' && end - Date.now() <= 0) showEnded();
      return current;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clearTimeout(timer); timer = 0;
      if (raf) { win.cancelAnimationFrame(raf); raf = 0; }
      if (io) { io.disconnect(); io = null; }
      timers.forEach(clearTimeout); timers.clear();
      doc.removeEventListener('visibilitychange', onVisible);
      win.removeEventListener('pageshow', onVisible);
      if (mq && mq.removeEventListener) mq.removeEventListener('change', onMq);
      mounts.forEach((m) => m.restore()); mounts = [];
      endedMounts.forEach((m) => m.restore()); endedMounts = [];
      hiddenByUs.forEach((el) => el.removeAttribute('hidden')); hiddenByUs.clear();
      seen.clear();
      if (html.dataset.offer === current) delete html.dataset.offer;
      if (registry.get(scope) && registry.get(scope).api === api) registry.delete(scope);
    }
  };
  registry.set(scope, { key, api });
  return api;
}
