/* CORTE · device diagnostics and the reduced-motion notice.
   A classic script (not a module) so it runs even where the page module
   cannot, and it loads first so it can record errors from the very start.
   - Always: records script errors and console warnings/errors.
   - Opens a panel from the "Diagnóstico del dispositivo" button in the Bin,
     or when the address ends in #diag. The panel states what this phone
     supports and what the page is doing, and can copy that as text.
   - When the device asks for reduced motion, says so once, because then the
     page is shown without animations on purpose. */
(function () {
  'use strict';
  var LOG = (window.__corteLog = []);
  var panel = null, body = null, timer = 0, frames = 0, fps = 0, lastT = 0, scrollEvents = 0, scrollRate = 0;

  function safe(fn, fallback) { try { return fn(); } catch (e) { return fallback === undefined ? 'error: ' + (e && e.message) : fallback; } }
  function push(kind, msg) {
    try {
      LOG.push(kind + ': ' + String(msg).replace(/\s+/g, ' ').slice(0, 260));
      if (LOG.length > 40) LOG.shift();
      if (panel) paint();
    } catch (e) { /* never let logging break the page */ }
  }
  window.addEventListener('error', function (e) {
    var where = e && e.filename ? ' @' + String(e.filename).split('/').pop() + ':' + e.lineno : '';
    push('error', (e && e.message) + where);
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason;
    push('promise', r && (r.message || r));
  });
  ['error', 'warn'].forEach(function (k) {
    var orig = console[k];
    if (typeof orig !== 'function') return;
    console[k] = function () {
      try { push('console.' + k, Array.prototype.slice.call(arguments).join(' ')); } catch (e) { /* ignore */ }
      return orig.apply(console, arguments);
    };
  });
  window.addEventListener('scroll', function () { scrollEvents++; }, { passive: true });

  var mm = function (q) { return safe(function () { return matchMedia(q).matches; }, false); };
  var sup = function (prop, val) { return safe(function () { return !!(window.CSS && CSS.supports(prop, val)); }, false); };
  var yn = function (v) { return v ? 'sí' : 'NO'; };

  function gl() {
    return safe(function () {
      var c = document.createElement('canvas');
      var g2 = c.getContext('webgl2');
      var g = g2 || c.getContext('webgl');
      if (!g) return 'sin WebGL';
      var ext = g.getExtension('WEBGL_debug_renderer_info');
      var name = ext ? g.getParameter(ext.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER);
      var out = (g2 ? 'WebGL2' : 'WebGL1') + ' · ' + name + ' · tex ' + g.getParameter(g.MAX_TEXTURE_SIZE);
      var lose = g.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      return out;
    });
  }

  function report() {
    var d = document.documentElement, L = [];
    var acts = safe(function () { var i = window.ScrollCraft && ScrollCraft.instances[0]; return i ? i.acts.length : 0; }, 0);
    var stage = document.querySelector('.hero__stage');
    L.push('CORTE diagnóstico');
    L.push('agente: ' + navigator.userAgent);
    L.push('ventana: ' + innerWidth + 'x' + innerHeight + ' @' + (devicePixelRatio || 1) + ' · pantalla ' + screen.width + 'x' + screen.height +
      ' · visualViewport ' + safe(function () { return Math.round(visualViewport.width) + 'x' + Math.round(visualViewport.height) + ' esc ' + visualViewport.scale; }, 'n/d'));
    L.push('en iframe: ' + yn(window.top !== window.self) + ' · insets sup/inf: ' +
      safe(function () { var s = getComputedStyle(d); return s.paddingTop + ' / ' + s.paddingBottom; }, 'n/d'));
    L.push('movimiento reducido: ' + yn(mm('(prefers-reduced-motion: reduce)')) + ' · táctil: ' + yn(mm('(hover: none) and (pointer: coarse)')) + ' · ancho<=860: ' + yn(mm('(max-width: 860px)')));
    L.push('módulos: ' + yn(safe(function () { return 'noModule' in HTMLScriptElement.prototype; }, false)) +
      ' · importmap: ' + yn(safe(function () { return HTMLScriptElement.supports && HTMLScriptElement.supports('importmap'); }, false)) +
      ' · dialog: ' + yn(safe(function () { return typeof HTMLDialogElement === 'function' && typeof HTMLDialogElement.prototype.showModal === 'function'; }, false)) +
      ' · IO: ' + yn(!!window.IntersectionObserver) + ' · RO: ' + yn(!!window.ResizeObserver));
    L.push('CSS color-mix: ' + yn(sup('color', 'color-mix(in oklab, red, blue)')) + ' · svh: ' + yn(sup('height', '100svh')) +
      ' · :has: ' + yn(safe(function () { return CSS.supports('selector(:has(a))'); }, false)) +
      ' · aspect-ratio: ' + yn(sup('aspect-ratio', '1 / 1')) + ' · translate: ' + yn(sup('translate', '1px')) + ' · clip-path: ' + yn(sup('clip-path', 'inset(0)')));
    L.push('GPU: ' + gl());
    L.push('página: motor ' + yn(d.classList.contains('sc-ready')) + ' · actos ' + acts + ' · módulo principal ' + yn(window.__corte) +
      ' · WebGL ' + (d.classList.contains('webgl') ? 'activo' : d.classList.contains('no-webgl') ? 'DESACTIVADO (póster)' : 'n/d') +
      ' · intro ' + (d.classList.contains('hero-in') ? 'ok' : 'pendiente'));
    L.push('scroll: y=' + Math.round(window.scrollY) + ' de ' + Math.round(d.scrollHeight - innerHeight) + ' · eventos/s ' + scrollRate +
      ' · escena fija: ' + (stage ? getComputedStyle(stage).position : 'n/d') + ' · fps ' + fps);
    L.push('estilo elegido: ' + (d.dataset.estilo || 'ninguno') + ' · tratamiento: ' + (d.dataset.trat || 'n/d') + ' · oferta: ' + (d.dataset.offer || 'n/d'));
    L.push('registro (' + LOG.length + '):');
    if (!LOG.length) L.push('  sin errores');
    LOG.slice(-8).forEach(function (l) { L.push('  ' + l); });
    return L.join('\n');
  }

  function paint() { if (body) body.textContent = report(); }

  function loop(t) {
    if (!panel) return;
    frames++;
    if (t - lastT >= 1000) { fps = Math.round(frames * 1000 / (t - lastT)); scrollRate = scrollEvents; scrollEvents = 0; frames = 0; lastT = t; paint(); }
    requestAnimationFrame(loop);
  }

  function css() {
    if (document.getElementById('corte-diag-css')) return;
    var s = document.createElement('style'); s.id = 'corte-diag-css';
    s.textContent =
      '.diag{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;max-height:52vh;display:flex;flex-direction:column;background:rgba(7,8,9,.96);color:#EEEAE2;font:11px/1.45 ui-monospace,Menlo,Consolas,monospace;box-shadow:0 -1px 0 rgba(238,234,226,.2);padding:0 0 env(safe-area-inset-bottom,0)}' +
      '.diag pre{margin:0;padding:10px 14px;overflow:auto;white-space:pre-wrap;word-break:break-word;flex:1}' +
      '.diag__bar{display:flex;gap:8px;padding:8px 12px;border-top:1px solid rgba(238,234,226,.14)}' +
      '.diag button,.corte-note button{font:600 12px/1 system-ui,sans-serif;color:#EEEAE2;background:transparent;border:1px solid rgba(238,234,226,.35);border-radius:4px;padding:9px 12px;min-height:36px;cursor:pointer}' +
      '.corte-note{position:fixed;z-index:2147482000;left:max(12px,env(safe-area-inset-left,0px));right:max(12px,env(safe-area-inset-right,0px));bottom:calc(12px + env(safe-area-inset-bottom,0px));margin:0 auto;max-width:30rem;display:flex;gap:12px;align-items:center;justify-content:space-between;background:#15171A;color:#C9C5BC;border-radius:6px;box-shadow:0 0 0 1px rgba(238,234,226,.16),0 18px 40px -12px rgba(0,0,0,.8);padding:12px 14px;font:13px/1.4 system-ui,sans-serif}' +
      '.corte-note[hidden]{display:none}';
    document.head.appendChild(s);
  }

  function open() {
    if (panel) return;
    css();
    panel = document.createElement('div'); panel.className = 'diag'; panel.setAttribute('role', 'region'); panel.setAttribute('aria-label', 'Diagnóstico del dispositivo');
    body = document.createElement('pre');
    var bar = document.createElement('div'); bar.className = 'diag__bar';
    var copy = document.createElement('button'); copy.type = 'button'; copy.textContent = 'Copiar';
    var close = document.createElement('button'); close.type = 'button'; close.textContent = 'Cerrar';
    copy.addEventListener('click', function () {
      var text = report();
      var done = function () { copy.textContent = 'Copiado'; setTimeout(function () { copy.textContent = 'Copiar'; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { selectAll(); });
      else selectAll();
    });
    function selectAll() { try { var r = document.createRange(); r.selectNodeContents(body); var s = getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) { /* ignore */ } }
    close.addEventListener('click', function () { cancelAnimationFrame(timer); if (panel && panel.parentNode) panel.parentNode.removeChild(panel); panel = null; body = null; });
    bar.appendChild(copy); bar.appendChild(close); panel.appendChild(body); panel.appendChild(bar);
    document.body.appendChild(panel);
    paint(); lastT = performance.now(); frames = 0; timer = requestAnimationFrame(loop);
  }

  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-diag-toggle]') : null;
    if (!t) return;
    var dlg = t.closest('dialog'); if (dlg && dlg.open && dlg.close) dlg.close();
    open();
  });
  window.__corteDiag = open;

  // A reduced-motion device gets the page without animations on purpose.
  // Say so once, so nobody mistakes that for a broken page.
  function note() {
    if (!mm('(prefers-reduced-motion: reduce)')) return;
    var seen = safe(function () { return sessionStorage.getItem('corte-note') === '1'; }, false);
    if (seen === true) return;
    css();
    var n = document.createElement('p'); n.className = 'corte-note'; n.setAttribute('role', 'status');
    var t = document.createElement('span');
    t.textContent = 'Tu dispositivo tiene activado «Reducir movimiento», así que la página se muestra sin animaciones. Para verlas, desactívalo en Accesibilidad.';
    var b = document.createElement('button'); b.type = 'button'; b.textContent = 'Entendido';
    b.addEventListener('click', function () { safe(function () { sessionStorage.setItem('corte-note', '1'); }); if (n.parentNode) n.parentNode.removeChild(n); });
    n.appendChild(t); n.appendChild(b); document.body.appendChild(n);
    setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 16000);
  }

  function ready() {
    if (/(^|[#&])diag\b/.test(location.hash)) open();
    setTimeout(note, 2600);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
