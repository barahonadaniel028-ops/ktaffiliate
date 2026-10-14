// CORTE · La foto. A camera wakes, focuses, shoots, the flash fires, and only
// then does the line develop. Everything here is a PURE FUNCTION of the act's
// progress p (0..1): scrub forward or back and the same p gives the same frame.
//
//   import { createCamera } from './camera.js';
//   const camera = createCamera(document.getElementById('camara'));
//   // every frame:   camera.update(act.p, { reduce })
//   // on resize:     camera.resize()
//
// update() writes unitless CSS custom properties (--c-*) on the stage and the
// iris blade transforms, nothing else, and reads no layout. All geometry
// (distances, sizes, the phone/desktop split) lives in camera.css as calc()
// over those numbers. A write is skipped when its value did not change.

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const seg = (a, b, x) => clamp01((x - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = seg(a, b, x); return t * t * (3 - 2 * t); };
const easeOut = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const easeOut2 = (t) => 1 - Math.pow(1 - clamp01(t), 2);
const easeIn = (t) => { t = clamp01(t); return t * t * t; };
const easeIO = (t) => { t = clamp01(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const easeBack = (t) => { t = clamp01(t); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
// Exponential-feeling decay that is exactly 1 at t=0 and exactly 0 at t=1.
const decay = (t, k) => { t = clamp01(t); const e = Math.exp(-k); return (Math.exp(-k * t) - e) / (1 - e); };

// ---- the timeline: act progress at which each beat happens -----------------
const T = {
  wake: [0.0, 0.2],        // dormant to awake: settle, coatings, tally lamp
  tally: [0.09, 0.135],
  af: [0.2, 0.36],         // brackets contract and hunt
  afShow: [0.18, 0.215],   // brackets fade in
  lock: [0.355, 0.378],    // brackets turn gold, pip
  afHide: [0.408, 0.432],
  irisClose: [0.405, 0.436],
  irisOpen: [0.444, 0.47],
  kickAtt: [0.434, 0.443],
  kickRel: [0.443, 0.52],
  flashUp: [0.432, 0.452],
  flashDown: [0.459, 0.62],   // peak plateau 0.452-0.459 so a fast flick still catches it
  burst: [0.44, 0.6],
  shock: [0.447, 0.585],
  aside: [0.455, 0.58],    // recoils from the flash and clears the text column BEFORE any word is legible
  dev: [0.51, 0.7],        // heading filter (blur and brightness come down)
  t1: [0.52, 0.68],        // first sentence (flash is already under 3 % here)
  t2: [0.58, 0.7]          // second sentence, about 0.06 later
};

const PHI_DORMANT = 60;    // blade angle (deg): lens asleep, aperture a touch smaller
const PHI_REST = 53;
const PHI_SHUT = 79;
const PIVOT = '0 -42';     // blade pivot, in the eye's centre-origin units

// The finished frame. Used for reduced motion and as the shape of "nothing hidden".
const REST = {
  '--c-dorm': 0, '--c-wake': 1, '--c-tally': 1, '--c-aside': 1, '--c-kick': 0,
  '--c-ring': 0, '--c-lamp': 0,
  '--c-af-o': 0, '--c-af-s': 1, '--c-af-w': 0, '--c-af-g': 0, '--c-pip': 0, '--c-pip-o': 0,
  '--c-flash': 0, '--c-burst-s': 0, '--c-burst-o': 0, '--c-shock-s': 0, '--c-shock-o': 0,
  '--c-t1': 1, '--c-t2': 1, '--c-filter': 'none'
};

// p -> every number the stylesheet needs. Pure: no state, no DOM.
export function frame(p) {
  const v = {};

  // 0.00-0.20 wake: the camera is already fully visible at p=0, then settles.
  v['--c-dorm'] = 1 - easeOut(seg(T.wake[0], T.wake[1], p));
  v['--c-wake'] = smooth(0.03, 0.2, p);
  v['--c-tally'] = smooth(T.tally[0], T.tally[1], p);

  // 0.18-0.40 autofocus: brackets appear, hunt, contract, lock gold + pip.
  const afT = seg(T.af[0], T.af[1], p);
  const hunt = 0.1 * Math.sin(afT * Math.PI * 3) * (1 - afT);
  let afS = 1 - 0.54 * easeIO(afT) + hunt;                      // 1 -> .46
  const lockT = seg(T.lock[0], T.lock[1], p);
  afS -= 0.05 * Math.sin(lockT * Math.PI);                      // a tiny snap on lock
  const afO = smooth(T.afShow[0], T.afShow[1], p) * (1 - smooth(T.afHide[0], T.afHide[1], p));
  const lock = smooth(T.lock[0], T.lock[1], p);
  v['--c-af-o'] = afO;
  v['--c-af-s'] = afS;
  v['--c-af-w'] = 1 - lock;
  v['--c-af-g'] = lock;
  v['--c-pip'] = easeBack(seg(T.lock[0], T.lock[0] + 0.03, p));
  v['--c-pip-o'] = clamp01(seg(T.lock[0], T.lock[0] + 0.012, p)) * (1 - smooth(T.afHide[0], T.afHide[1], p));
  // The focus ring turns while the lens hunts, then holds where it locked.
  v['--c-ring'] = (1 - afS) * 92 * (1 - smooth(0.44, 0.5, p));

  // AF-assist lamp blinks during the hunt, then the same lamp fires the flash.
  const assist = afT > 0 && afT < 1 ? 0.42 * (0.5 + 0.5 * Math.sin(afT * Math.PI * 7 - 1.2)) * smooth(0, 0.08, afT) * (1 - smooth(0.9, 1, afT)) : 0;
  const lampFlash = smooth(0.436, 0.446, p) * decay(seg(0.446, 0.53, p), 5);
  v['--c-lamp'] = Math.max(assist, lampFlash);

  // 0.40-0.47 shutter: blades close fast, hold, reopen. The body kicks at the snap.
  const base = lerp(PHI_DORMANT, PHI_REST, easeOut(seg(0, 0.2, p)));
  const closeT = easeIn(seg(T.irisClose[0], T.irisClose[1], p));
  const openT = easeOut(seg(T.irisOpen[0], T.irisOpen[1], p));
  v.phi = base + (PHI_SHUT - base) * closeT * (1 - openT);

  let kick = 0;
  if (p >= T.kickAtt[0] && p < T.kickRel[0]) kick = easeOut(seg(T.kickAtt[0], T.kickAtt[1], p));
  else if (p >= T.kickRel[0] && p < T.kickRel[1]) {
    const t = seg(T.kickRel[0], T.kickRel[1], p);
    kick = Math.exp(-6 * t) * Math.cos(t * Math.PI * 1.5) * (1 - t * t);
  }
  v['--c-kick'] = kick;

  // 0.43-0.62 flash: warm white, peak 0.95 at p=0.455, then an exponential-feeling decay to 0.
  const up = seg(T.flashUp[0], T.flashUp[1], p);
  v['--c-flash'] = p < T.flashUp[1] ? 0.95 * up * up : p < T.flashDown[0] ? 0.95 : 0.95 * decay(seg(T.flashDown[0], T.flashDown[1], p), 12);
  // Radial burst from the lens (scale + opacity) and a faint ring that outruns it.
  const bUp = seg(0.438, 0.452, p);
  v['--c-burst-s'] = easeOut(seg(T.burst[0], T.burst[1], p));
  v['--c-burst-o'] = 0.92 * bUp * decay(seg(0.452, T.burst[1], p), 4.6);
  const sUp = seg(0.445, 0.455, p);
  v['--c-shock-s'] = easeOut(seg(T.shock[0], T.shock[1], p));
  v['--c-shock-o'] = 0.55 * sUp * decay(seg(0.455, T.shock[1], p), 3);

  // 0.46-0.70 the camera eases aside while the line develops out of the flash.
  v['--c-aside'] = easeOut(seg(T.aside[0], T.aside[1], p));
  const d = easeOut(seg(T.dev[0], T.dev[1], p));
  v['--c-t1'] = easeOut2(seg(T.t1[0], T.t1[1], p));
  v['--c-t2'] = easeOut2(seg(T.t2[0], T.t2[1], p));
  v['--c-filter'] = d <= 0 || d >= 0.995 ? 'none' : `blur(${(14 * (1 - d)).toFixed(1)}px) brightness(${(1 + 1.2 * (1 - d)).toFixed(2)})`;

  return v;
}

const round = (x, n) => { const m = Math.pow(10, n); return Math.round(x * m) / m; };
const DEC = { '--c-ring': 1 };

export function createCamera(section) {
  const stage = section.querySelector('[data-sc-stage]') || section.querySelector('.camara__stage') || section;
  const blades = Array.from(section.querySelectorAll('[data-blade], [data-blade-edge]'));
  const last = {};          // property name -> last string written
  let lastPhi = null;
  let lastP = 0;
  let lastReduce = false;

  section.classList.add('is-live');

  function write(v) {
    for (const k in v) {
      if (k === 'phi') continue;
      const raw = v[k];
      const s = typeof raw === 'number' ? String(round(raw, DEC[k] || 3)) : raw;
      if (last[k] === s) continue;
      last[k] = s;
      stage.style.setProperty(k, s);
    }
    const phi = round(v.phi, 1);
    if (phi !== lastPhi) {
      lastPhi = phi;
      const t = `rotate(${phi} ${PIVOT})`;
      for (let i = 0; i < blades.length; i++) blades[i].setAttribute('transform', t);
    }
  }

  function update(p, opts) {
    p = clamp01(+p || 0);
    lastP = p;
    lastReduce = !!(opts && opts.reduce === true);
    if (lastReduce) { write(Object.assign({ phi: PHI_REST }, REST)); return; }
    write(frame(p));
  }

  // Nothing here depends on layout (the stylesheet does the geometry), so a
  // resize only needs the cached writes dropped and the current frame redone.
  function resize() {
    for (const k in last) delete last[k];
    lastPhi = null;
    update(lastP, { reduce: lastReduce });
  }

  // First frame: honour the act's own progress if the engine already published
  // it, so a reload mid-scroll does not flash the dormant camera.
  let p0 = 0;
  try { p0 = parseFloat(getComputedStyle(section).getPropertyValue('--sc-p')) || 0; } catch (e) { p0 = 0; }
  update(p0);

  return { update, resize };
}
