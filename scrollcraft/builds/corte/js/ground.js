// CORTE · the ground. One film, graded scene by scene: as the viewport centre
// travels down the page the ground colour, its two haze lights and the page's
// "gold" (0..1, which La Cinta turns into gold plate) are interpolated between
// per-section palettes. Each palette is held through the middle of its section
// and only blends across the seam, so the change is felt but never pops.
//
// It writes CSS custom properties on <html> (see css/ground.css for what reads
// them) and returns { gold } for the strip. No layout reads per frame: section
// offsets are cached and refreshed on resize, when fonts settle and whenever
// <main> changes size.
//
//   import { createGround } from './ground.js';
//   const ground = createGround({ ids, reduce });
//   // in the frame loop:
//   const g = ground.update();   // { gold }
//   if (stage) stage.setGold(g.gold);

// ---------------------------------------------------------------- palettes --
// canvas / surface: the ground and anything raised off it. a / b: the two haze
// lights as [r, g, b, alpha] (a = top right, b = bottom left, same geometry as
// the original page). gold: 0..1 for the strip. Everything stays low chroma so
// it reads as one graded film, not a rainbow.
export const PALETTES = {
  // The opening is the original graphite, untouched.
  inicio:    { canvas: '#0B0C0E', surface: '#15171A', a: [238, 234, 226, 0.055], b: [255, 74, 28, 0.045], gold: 0 },
  // Lucid: steel-ink leaning blue-green (teal, so the way into the oxblood
  // passes through grey, never through purple), with a cold bone light.
  costo:     { canvas: '#061519', surface: '#102227', a: [140, 214, 232, 0.075], b: [56, 168, 178, 0.065], gold: 0.15 },
  // The peak: oxblood-black, the red turned up.
  estilos:   { canvas: '#1B0A0C', surface: '#2A1215', a: [255, 112, 74, 0.085], b: [255, 56, 28, 0.115], gold: 0.35 },
  // Relief: deep forest-black.
  tuyos:     { canvas: '#0A140E', surface: '#15211B', a: [120, 235, 190, 0.070], b: [64, 190, 124, 0.072], gold: 0.65 },
  // Golden hour: warm umber-black. (The camera scene, when it exists.)
  camara:    { canvas: '#191006', surface: '#26190B', a: [246, 196, 108, 0.095], b: [232, 140, 56, 0.075], gold: 0.75 },
  // A hard cut to near pure black, on purpose.
  como:      { canvas: '#070809', surface: '#101113', a: [238, 234, 226, 0.030], b: [255, 74, 28, 0.035], gold: 0.80 },
  porque:    { canvas: '#191006', surface: '#26190B', a: [246, 196, 108, 0.095], b: [226, 130, 50, 0.070], gold: 0.82 },
  // Slate.
  necesitas: { canvas: '#0C131C', surface: '#16202C', a: [150, 184, 232, 0.075], b: [92, 134, 190, 0.060], gold: 0.86 },
  // Paper sections: the dark entry only shows under the sheet's overlapping edge.
  precio:    { canvas: '#0E0F11', surface: '#17191C', a: [238, 234, 226, 0.040], b: [255, 74, 28, 0.030], gold: 0.90 },
  faq:       { canvas: '#0E0F11', surface: '#17191C', a: [238, 234, 226, 0.040], b: [255, 74, 28, 0.030], gold: 0.92 },
  // Close: graphite with a wine tint and a warm gold light.
  cierre:    { canvas: '#160B10', surface: '#24141B', a: [248, 200, 112, 0.105], b: [196, 52, 78, 0.085], gold: 0.95 }
};

// --------------------------------------------------------------- colour math --
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const unlin = (c) => { c = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return c < 0 ? 0 : c > 1 ? 255 : c * 255; };
function toLab(r, g, b) {
  r = lin(r); g = lin(g); b = lin(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
  ];
}
function fromLab(L, a, b) {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
  return [
    unlin(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    unlin(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    unlin(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)
  ];
}
const hex2rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const hex2 = (n) => { n = Math.round(n); return (n < 16 ? '0' : '') + n.toString(16); };
const rgb2hex = (c) => '#' + hex2(c[0]) + hex2(c[1]) + hex2(c[2]);
const smooth = (t) => t * t * (3 - 2 * t);

// Prepared palette: Lab values for blending and ready-made strings for holds,
// so a held section writes exactly the authored colour (the hero stays
// byte-for-byte #0B0C0E).
function prep(p) {
  const str = (h) => 'rgb(' + h[0] + ' ' + h[1] + ' ' + h[2] + ' / ' + h[3] + ')';
  const P = {
    gold: p.gold,
    cL: toLab(...hex2rgb(p.canvas)), sL: toLab(...hex2rgb(p.surface)),
    aL: toLab(p.a[0], p.a[1], p.a[2]), bL: toLab(p.b[0], p.b[1], p.b[2]), aA: p.a[3], bA: p.b[3]
  };
  // What a held section writes: the authored values, verbatim.
  P.held = { canvas: p.canvas, surface: p.surface, gold: p.gold, a: str(p.a), b: str(p.b) };
  return P;
}
const mix3 = (x, y, t) => [x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t];
const hazeStr = (lab, al) => {
  const c = fromLab(lab[0], lab[1], lab[2]);
  return 'rgb(' + Math.round(c[0]) + ' ' + Math.round(c[1]) + ' ' + Math.round(c[2]) + ' / ' + (Math.round(al * 1000) / 1000) + ')';
};
const labHex = (lab) => rgb2hex(fromLab(lab[0], lab[1], lab[2]));

function blend(P, Q, t) {
  return {
    canvas: labHex(mix3(P.cL, Q.cL, t)), surface: labHex(mix3(P.sL, Q.sL, t)),
    gold: P.gold + (Q.gold - P.gold) * t,
    a: hazeStr(mix3(P.aL, Q.aL, t), P.aA + (Q.aA - P.aA) * t),
    b: hazeStr(mix3(P.bL, Q.bL, t), P.bA + (Q.bA - P.bA) * t)
  };
}

// ------------------------------------------------------------------- ground --
export function createGround({ ids, reduce = false } = {}) {
  const root = document.documentElement;
  const main = document.querySelector('main');
  const prepared = {};
  for (const k in PALETTES) prepared[k] = prep(PALETTES[k]);

  // The sections that exist, in the order given.
  const secs = [];
  (ids || Object.keys(PALETTES)).forEach((id) => {
    const el = document.getElementById(id);
    if (el && prepared[id]) secs.push({ id, el, pal: prepared[id], top: 0 });
  });

  let stops = [];          // { y, pal } in ascending y; same pal on both ends of a hold
  let dirty = true;
  let lastKey = '';
  let lastGold = 0;

  // Where the viewport centre sits when each seam is crossed, and how far the
  // blend reaches either side. Half a viewport reproduces "the next section
  // shows its top edge" through "that edge leaves the screen"; a section about
  // one screen tall (like the cost) gives up some of it so its own colour is
  // actually held for a beat. Reduced motion widens the blend: the same change
  // over more scroll is gentler.
  function measure() {
    dirty = false;
    if (!secs.length) { stops = []; return; }
    const vh = innerHeight || 800;
    const sy = scrollY;
    for (const s of secs) s.top = s.el.getBoundingClientRect().top + sy;
    const total = Math.max(document.documentElement.scrollHeight, secs[secs.length - 1].top + 1);
    const dist = secs.map((s, i) => (i < secs.length - 1 ? secs[i + 1].top : total) - s.top);
    stops = [{ y: -1e9, pal: secs[0].pal }];
    for (let i = 0; i < secs.length - 1; i++) {
      const b = secs[i + 1].top;
      const half = Math.max(1, Math.min(vh * (reduce ? 0.8 : 0.5), (reduce ? 0.48 : 0.36) * Math.min(dist[i], dist[i + 1])));
      stops.push({ y: b - half, pal: secs[i].pal }, { y: b + half, pal: secs[i + 1].pal });
    }
    stops.push({ y: 1e9, pal: secs[secs.length - 1].pal });
  }
  const touch = () => { dirty = true; };
  addEventListener('resize', touch);
  addEventListener('load', touch);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(touch);
  if (main && 'ResizeObserver' in window) new ResizeObserver(touch).observe(main);

  function write(c) {
    const key = c.canvas + c.surface + c.a + c.b + c.gold.toFixed(3);
    if (key === lastKey) return;
    lastKey = key;
    const st = root.style;
    st.setProperty('--sc-canvas', c.canvas);
    st.setProperty('--sc-surface', c.surface);
    st.setProperty('--haze-a', c.a);
    st.setProperty('--haze-b', c.b);
    st.setProperty('--ground-gold', c.gold.toFixed(3));
  }

  function update() {
    if (!secs.length) return { gold: 0 };
    if (dirty) measure();
    const y = scrollY + (innerHeight || 800) * 0.5;
    let c = null;
    // Find the segment the centre sits in (about twenty stops: a scan is fine).
    for (let i = 0; i < stops.length - 1; i++) {
      const A = stops[i], B = stops[i + 1];
      if (y > B.y) continue;
      if (A.pal === B.pal) c = A.pal.held;
      else c = blend(A.pal, B.pal, smooth(Math.min(1, Math.max(0, (y - A.y) / (B.y - A.y)))));
      break;
    }
    if (!c) c = stops[stops.length - 1].pal.held;
    write(c);
    lastGold = c.gold;
    return { gold: lastGold };
  }

  return {
    update,
    // Force a re-read of the section offsets (after the layout changes).
    refresh: touch,
    get gold() { return lastGold; }
  };
}
