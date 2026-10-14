// La Cinta: a film strip that travels the whole page. It starts knotted
// through the hero reels (raw footage), lies down as the cost line, becomes
// the timeline under the styles, braids from three strands into one, and
// closes into a reel at the end. Every state is anchored to a DOM box, so the
// 3D object always sits exactly where the layout wants it.

import * as THREE from 'three';

const FOV = 35, CAM_Z = 8;
const N_CTRL = 16;

// ------------------------------------------------------------- shaders --
const STRIP_VERT = /* glsl */`
attribute float aS;
uniform vec3 uCam;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vView;
varying float vS;
void main() {
  vUv = uv;
  vS = aS;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vView = uCam - wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const STRIP_FRAG = /* glsl */`
precision highp float;
uniform float uDraw, uOpacity, uTime, uHeat, uSheen, uSoft, uFrames, uSweep;
uniform vec3 uRim;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vView;
varying float vS;

float box(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }

void main() {
  if (vS > uDraw) discard;
  float edge = min(vUv.y, 1.0 - vUv.y);
  // Perforations along both edges: 4 per frame, rounded, punched through.
  float fu = fract(vUv.x * 4.0);
  if (edge < 0.15) {
    vec2 p = vec2((fu - 0.5) * 1.0, (edge - 0.075) / 0.15);
    float d = box(p, vec2(0.17, 0.26), 0.08);
    if (d < 0.0) discard;
  }
  vec3 v = normalize(vView);
  vec3 n = normalize(vN);
  // Shade the side we are looking at, whichever way the strip has turned.
  if (dot(n, v) < 0.0) n = -n;
  float ndv = clamp(dot(n, v), 0.0, 1.0);
  float fres = pow(1.0 - ndv, 2.6);

  // Base: obsidian. Frame windows hold a faint exposure each, so the strip
  // reads as film without competing with the page.
  float fi = floor(vUv.x);
  float h = fract(sin(fi * 91.7) * 43758.5);
  vec3 base = vec3(0.052, 0.054, 0.06);
  float fx = fract(vUv.x);
  float win = step(0.2, vUv.y) * step(vUv.y, 0.8) * step(0.05, fx) * step(fx, 0.95);
  vec3 expo = mix(vec3(0.10, 0.095, 0.09), vec3(0.16, 0.15, 0.14), h) * (0.6 + 0.4 * smoothstep(0.2, 0.8, vUv.y));
  base = mix(base, expo, win * 0.85);
  float lip = smoothstep(0.014, 0.0, abs(edge - 0.17)) + smoothstep(0.02, 0.0, edge) * 0.6;

  vec3 L = normalize(vec3(-0.45, 0.75, 0.55));
  float diff = max(dot(n, L), 0.0);
  vec3 H = normalize(L + v);
  float spec = pow(max(dot(n, H), 0.0), 60.0) * uSheen;
  vec3 L2 = normalize(vec3(0.7, -0.2, 0.6));
  float spec2 = pow(max(dot(n, normalize(L2 + v)), 0.0), 20.0) * 0.22;

  // A light that travels along the strip, like a frame passing the gate.
  float sw = fract(vS * 1.6 - uTime * 0.06 * uSweep);
  float sweep = smoothstep(0.06, 0.0, abs(sw - 0.5));

  float rimF = pow(1.0 - ndv, 4.0);
  vec3 bone = vec3(0.93, 0.92, 0.89);
  vec3 col = base * (0.55 + 1.25 * diff)
           + bone * (spec * 1.1 + spec2 + lip * 0.16 + sweep * win * 0.10)
           + uRim * rimF * (0.12 + 0.55 * uHeat)
           + uRim * lip * 0.05 * uHeat;

  float a = uOpacity;
  // Out-of-focus look for the near strip: softer, flatter, lighter.
  if (uSoft > 0.0) {
    col = mix(col, vec3(0.08, 0.085, 0.09) + uRim * 0.08, uSoft * 0.55);
    a *= mix(1.0, smoothstep(0.0, 0.2, edge) * 0.9, uSoft);
  }
  gl_FragColor = vec4(col, a);
}`;

const REEL_VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const REEL_FRAG = /* glsl */`
precision highp float;
uniform sampler2D map;
uniform float uOpacity;
uniform vec2 uSize;
varying vec2 vUv;
float box(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  vec2 p = (vUv - 0.5) * uSize;
  float d = box(p, uSize * 0.5, 0.035);
  float a = 1.0 - smoothstep(-0.002, 0.003, d);
  vec3 col = texture2D(map, vUv).rgb;
  float rim = smoothstep(-0.012, -0.004, d);
  col = mix(col, vec3(0.93, 0.92, 0.89), rim * 0.28);
  gl_FragColor = vec4(col, a * uOpacity);
}`;

const DUST_VERT = /* glsl */`
attribute float aSeed;
uniform float uTime, uSize;
varying float vTw;
void main() {
  vec3 p = position;
  p.y += mod(uTime * 0.05 * (0.4 + aSeed) + aSeed * 10.0, 6.0) - 3.0;
  p.x += sin(uTime * 0.2 + aSeed * 30.0) * 0.15;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * (0.6 + aSeed) * (8.0 / -mv.z);
  vTw = 0.5 + 0.5 * sin(uTime * (0.8 + aSeed * 2.0) + aSeed * 50.0);
  gl_Position = projectionMatrix * mv;
}`;

const DUST_FRAG = /* glsl */`
precision highp float;
uniform float uOpacity;
varying float vTw;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.0, length(c));
  gl_FragColor = vec4(vec3(0.93, 0.9, 0.85), a * uOpacity * (0.25 + 0.5 * vTw));
}`;

// --------------------------------------------------------------- shapes --
// Each shape is N_CTRL points in the anchor box's own space: x and y in
// [-1, 1] across the box, z in box-relative depth.
function shapeNudo(i) {
  if (i === 0) return [-1.55, -0.95, 0.5];
  if (i === N_CTRL - 1) return [1.35, 1.25, -0.6];
  const k = (i - 1) / (N_CTRL - 3);
  const phi = k * Math.PI * 2 * 0.985;
  const r = 0.58 + 0.24 * Math.cos(3 * phi);
  return [r * Math.cos(2 * phi) * 0.95, r * Math.sin(2 * phi) * 0.86, 0.7 * Math.sin(3 * phi)];
}
function shapeLine(i, y = 0, len = 1.25) {
  const k = i / (N_CTRL - 1);
  return [-len + 2 * len * k, y + Math.sin(k * Math.PI * 2) * 0.04, 0];
}
function shapeTrenza(i, phase = 0) {
  const k = i / (N_CTRL - 1);
  const amp = 0.55 * (1 - k * 0.92);
  const a = k * Math.PI * 3.2 + phase;
  return [Math.sin(a) * amp, 0.95 - 1.9 * k, Math.cos(a) * amp * 0.9];
}
function shapeLoop(i) {
  const k = i / (N_CTRL - 1);
  const a = k * Math.PI * 2 + Math.PI * 0.5;
  const tilt = 0.32;
  const x = Math.cos(a) * 0.92, y0 = Math.sin(a) * 0.92;
  return [x, y0 * Math.cos(tilt), y0 * Math.sin(tilt)];
}
function shapeOff(i) {
  const k = i / (N_CTRL - 1);
  return [-3.2 + k * 1.8, -0.2 + Math.sin(k * 5) * 0.2, 0];
}

const SHAPES = {
  nudo: (i) => shapeNudo(i),
  hilo: (i) => shapeLine(i, 0, 1.3),
  pista: (i) => shapeLine(i, 0, 1.5),
  trenza: (i) => shapeTrenza(i, 0),
  trenzaB: (i) => shapeTrenza(i, (Math.PI * 2) / 3),
  trenzaC: (i) => shapeTrenza(i, (Math.PI * 4) / 3),
  loop: (i) => shapeLoop(i),
  off: (i) => shapeOff(i)
};

// ---------------------------------------------------------------- strip --
class Strip {
  constructor(samples, opts = {}) {
    this.n = samples;
    const n = samples;
    const pos = new Float32Array(n * 2 * 3);
    const nor = new Float32Array(n * 2 * 3);
    const uv = new Float32Array(n * 2 * 2);
    const s = new Float32Array(n * 2);
    const idx = [];
    for (let i = 0; i < n; i++) {
      s[i * 2] = s[i * 2 + 1] = i / (n - 1);
      if (i < n - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aS', new THREE.BufferAttribute(s, 1));
    g.setIndex(idx);
    this.uniforms = {
      uDraw: { value: 0 }, uOpacity: { value: 1 }, uTime: { value: 0 },
      uHeat: { value: 0.5 }, uSheen: { value: 0.8 }, uSoft: { value: opts.soft || 0 },
      uFrames: { value: 40 }, uSweep: { value: 1 }, uCam: { value: new THREE.Vector3(0, 0, 8) },
      uRim: { value: new THREE.Color('#FF4A1C') }
    };
    this.mat = new THREE.ShaderMaterial({
      vertexShader: STRIP_VERT, fragmentShader: STRIP_FRAG, uniforms: this.uniforms,
      side: THREE.DoubleSide, transparent: true, depthWrite: true
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.geo = g;
    this.curve = new THREE.CatmullRomCurve3(Array.from({ length: N_CTRL }, () => new THREE.Vector3()), false, 'centripetal');
    this._T = []; this._P = [];
    for (let i = 0; i < n; i++) { this._T.push(new THREE.Vector3()); this._P.push(new THREE.Vector3()); }
    this._N = new THREE.Vector3(); this._B = new THREE.Vector3(); this._W = new THREE.Vector3();
    this._Wf = new THREE.Vector3(); this._v = new THREE.Vector3(); this._tmp = new THREE.Vector3();
  }

  // ctrl: Vector3[N_CTRL] world points. p: params for this frame.
  update(ctrl, p, cam, time, pointer) {
    const n = this.n;
    for (let i = 0; i < N_CTRL; i++) this.curve.points[i].copy(ctrl[i]);
    this.curve.updateArcLengths();
    const P = this._P, T = this._T;
    for (let i = 0; i < n; i++) this.curve.getPointAt(i / (n - 1), P[i]);

    // Living surface: smooth noise along the length, scaled by chaos.
    const amp = p.chaos * p.noiseAmp;
    if (amp > 1e-4) {
      for (let i = 0; i < n; i++) {
        const s = i / (n - 1);
        const tt = time * p.speed;
        P[i].x += amp * (Math.sin(s * 9.1 + tt * 0.9) * 0.6 + Math.sin(s * 23.0 - tt * 1.3) * 0.25);
        P[i].y += amp * (Math.sin(s * 7.3 - tt * 0.7 + 1.7) * 0.6 + Math.sin(s * 19.0 + tt * 1.1) * 0.25);
        P[i].z += amp * (Math.sin(s * 5.9 + tt * 0.8 + 3.1) * 0.8);
      }
    }
    // The strip leans toward the pointer, softly.
    if (pointer && pointer.k > 0.001) {
      const r2 = pointer.r * pointer.r;
      for (let i = 0; i < n; i++) {
        const dx = pointer.x - P[i].x, dy = pointer.y - P[i].y;
        const d2 = dx * dx + dy * dy;
        const f = Math.exp(-d2 / (2 * r2)) * pointer.k;
        P[i].x += dx * f * 0.22; P[i].y += dy * f * 0.22; P[i].z += f * 0.35;
      }
    }
    for (let i = 0; i < n; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
      T[i].subVectors(b, a).normalize();
    }

    const pos = this.geo.attributes.position.array;
    const nor = this.geo.attributes.normal.array;
    const uv = this.geo.attributes.uv.array;
    const N = this._N, B = this._B, W = this._W, Wf = this._Wf, v = this._v, tmp = this._tmp;

    // Parallel-transport frame: stable, no flips where the knot crosses itself.
    tmp.set(0, 0, 1);
    if (Math.abs(T[0].dot(tmp)) > 0.9) tmp.set(0, 1, 0);
    N.crossVectors(T[0], tmp).normalize();

    const len = this.curve.getLength();
    const frames = len / Math.max(p.width * 1.05, 0.02);
    for (let i = 0; i < n; i++) {
      const s = i / (n - 1);
      if (i > 0) { N.addScaledVector(T[i], -N.dot(T[i])).normalize(); }
      B.crossVectors(T[i], N).normalize();
      const th = p.twistBase + p.twist * Math.sin(s * 6.0 + time * 0.35 * p.speed);
      W.copy(N).multiplyScalar(Math.cos(th)).addScaledVector(B, Math.sin(th));
      if (p.flat > 0.001) {
        v.subVectors(cam.position, P[i]).normalize();
        Wf.crossVectors(T[i], v).normalize();
        if (Wf.dot(W) < 0) Wf.multiplyScalar(-1);
        W.lerp(Wf, p.flat).normalize();
      }
      let w = p.width;
      if (p.taper > 0) w *= 1 - p.taper * (1 - Math.min(1, s / 0.035, (1 - s) / 0.035));
      const o = i * 6;
      pos[o] = P[i].x + W.x * w * 0.5; pos[o + 1] = P[i].y + W.y * w * 0.5; pos[o + 2] = P[i].z + W.z * w * 0.5;
      pos[o + 3] = P[i].x - W.x * w * 0.5; pos[o + 4] = P[i].y - W.y * w * 0.5; pos[o + 5] = P[i].z - W.z * w * 0.5;
      tmp.crossVectors(W, T[i]).normalize();
      nor[o] = nor[o + 3] = tmp.x; nor[o + 1] = nor[o + 4] = tmp.y; nor[o + 2] = nor[o + 5] = tmp.z;
      const u = s * frames;
      const q = i * 4;
      uv[q] = u; uv[q + 1] = 0; uv[q + 2] = u; uv[q + 3] = 1;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.normal.needsUpdate = true;
    this.geo.attributes.uv.needsUpdate = true;
    const U = this.uniforms;
    U.uOpacity.value = p.opacity; U.uTime.value = time; U.uCam.value.copy(cam.position);
    U.uHeat.value = p.heat; U.uSheen.value = p.sheen;
    this.mesh.visible = p.opacity > 0.004 && U.uDraw.value > 0.001;
  }
}

// ---------------------------------------------------------------- stage --
export function createStage({ back, front, mobile, reduce, reelCanvases }) {
  const rb = new THREE.WebGLRenderer({ canvas: back, antialias: true, alpha: true, powerPreference: 'high-performance' });
  rb.setClearColor(0x000000, 0);
  const rf = front ? new THREE.WebGLRenderer({ canvas: front, antialias: true, alpha: true }) : null;
  if (rf) rf.setClearColor(0x000000, 0);
  const dprCap = mobile ? 1.25 : 1.75;

  const scene = new THREE.Scene();
  const fscene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
  cam.position.set(0, 0, CAM_Z);

  const main = new Strip(mobile ? 220 : 340);
  const braidB = new Strip(mobile ? 140 : 220);
  const braidC = new Strip(mobile ? 140 : 220);
  const near = new Strip(120, { soft: 1 });
  scene.add(main.mesh, braidB.mesh, braidC.mesh);
  fscene.add(near.mesh);

  // Hero reels: the five styles already playing, at five depths.
  const reels = (reelCanvases || []).map((cv, i) => {
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.NoColorSpace;
    tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    const mat = new THREE.ShaderMaterial({
      vertexShader: REEL_VERT, fragmentShader: REEL_FRAG, transparent: true,
      uniforms: { map: { value: tex }, uOpacity: { value: 1 }, uSize: { value: new THREE.Vector2(0.9, 1.6) } }
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.6), mat);
    m.renderOrder = -1;
    scene.add(m);
    return { mesh: m, tex, mat, i };
  });
  // Layout of the reels inside the hero box: x, y, z, rotY, scale.
  const REEL_LAYOUT = mobile
    ? [[-0.55, 0.0, -0.9, 0.25, 0.9], [0.12, 0.2, -2.2, 0.05, 1], [0.66, -0.05, -0.2, -0.22, 0.88]]
    : [[-0.62, 0.05, -0.5, 0.3, 0.92], [-0.05, 0.28, -2.2, 0.1, 1.05], [0.52, 0.0, -0.9, -0.2, 0.98], [0.15, -0.42, 0.5, 0.06, 0.8], [0.98, 0.5, -3.4, -0.32, 1.1]];

  // Dust: a few motes in the light, only where the strip is the subject.
  const dustN = mobile ? 120 : 260;
  const dpos = new Float32Array(dustN * 3), dseed = new Float32Array(dustN);
  for (let i = 0; i < dustN; i++) {
    dpos[i * 3] = (Math.random() - 0.5) * 12; dpos[i * 3 + 1] = (Math.random() - 0.5) * 6; dpos[i * 3 + 2] = -4 + Math.random() * 6;
    dseed[i] = Math.random();
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  dg.setAttribute('aSeed', new THREE.BufferAttribute(dseed, 1));
  const dustU = { uTime: { value: 0 }, uSize: { value: mobile ? 3 : 4 }, uOpacity: { value: 0.6 } };
  const dust = new THREE.Points(dg, new THREE.ShaderMaterial({ vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, uniforms: dustU, transparent: true, depthWrite: false }));
  dust.frustumCulled = false;
  scene.add(dust);

  // Current (smoothed) control points per strip, in world space.
  const mk = () => Array.from({ length: N_CTRL }, () => new THREE.Vector3());
  const cur = { main: mk(), b: mk(), c: mk(), near: mk() };
  const tgt = { main: mk(), b: mk(), c: mk() };
  let first = true;
  const prevBox = {};
  const P = { opacity: 0, chaos: 0.8, noiseAmp: 0.14, width: 0.16, twist: 1, twistBase: 0, flat: 0, heat: 0.5, sheen: 0.8, speed: 1, taper: 1 };
  const curP = { ...P };
  let grade = { heat: 0.5, sheen: 0.8, twist: 1, speed: 1 };
  let braidOp = 0, nearOp = 0, reelOp = 0, dustOp = 0;
  const pointer = { x: 0, y: 0, k: 0, r: 0.9, tx: 0, ty: 0, on: false, sx: 0, sy: 0 };

  let vw = 1, vh = 1, worldH = 1, worldW = 1;
  function resize() {
    vw = window.innerWidth; vh = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    rb.setPixelRatio(dpr); rb.setSize(vw, vh, false);
    if (rf) { rf.setPixelRatio(dpr); rf.setSize(vw, vh, false); }
    cam.aspect = vw / vh; cam.updateProjectionMatrix();
    worldH = 2 * CAM_Z * Math.tan((FOV * Math.PI) / 360);
    worldW = worldH * cam.aspect;
  }
  resize();

  const toWorld = (px, py) => [(px / vw - 0.5) * worldW, -(py / vh - 0.5) * worldH];
  function boxToWorld(b) {
    const [cx, cy] = toWorld(b.x + b.w / 2, b.y + b.h / 2);
    const hw = (b.w / vw) * worldW * 0.5, hh = (b.h / vh) * worldH * 0.5;
    return { cx, cy, hw, hh, zs: Math.min(hw, hh) };
  }
  function fill(out, shapeFn, B, scaleZ = 1) {
    for (let i = 0; i < N_CTRL; i++) {
      const s = shapeFn(i);
      out[i].set(B.cx + s[0] * B.hw, B.cy + s[1] * B.hh, s[2] * B.zs * scaleZ);
    }
  }
  const scratch = mk();

  // Per-state strip parameters. Grade multiplies heat, sheen, twist, speed.
  const STATE = {
    nudo: { chaos: 0.85, width: 0.17, twist: 1.2, twistBase: 0.3, flat: 0, taper: 1 },
    hilo: { chaos: 0.22, width: 0.12, twist: 0.25, twistBase: 0, flat: 0.85, taper: 1 },
    pista: { chaos: 0.04, width: 0.0, twist: 0.0, twistBase: 0, flat: 1, taper: 0 },
    trenza: { chaos: 0.18, width: 0.13, twist: 0.6, twistBase: 0.2, flat: 0.2, taper: 1 },
    loop: { chaos: 0.05, width: 0.2, twist: 0.0, twistBase: 1.5708, flat: 0, taper: 0 },
    off: { chaos: 0.4, width: 0.12, twist: 0.8, twistBase: 0, flat: 0.4, taper: 1 }
  };

  let drawStart = -1;
  let last = performance.now();
  let time = 0;

  function frame(state) {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!reduce) time += dt;
    if (drawStart < 0 && state.ready) drawStart = now;
    const draw = drawStart < 0 ? 0 : reduce ? 1 : Math.min(1, (now - drawStart) / 2200);
    const drawE = 1 - Math.pow(1 - draw, 3);

    // ---- blend the visible states into one target -----------------------
    let wsum = 0;
    const acc = { chaos: 0, width: 0, twist: 0, twistBase: 0, flat: 0, taper: 0, opacity: 0 };
    for (let i = 0; i < N_CTRL; i++) tgt.main[i].set(0, 0, 0), tgt.b[i].set(0, 0, 0), tgt.c[i].set(0, 0, 0);
    let bOp = 0, rOp = 0, dOp = 0, nOp = 0;
    for (const st of state.states) {
      const w = st.w;
      if (w <= 0) continue;
      wsum += w;
      const B = st.box ? boxToWorld(st.box) : boxToWorld({ x: 0, y: 0, w: vw, h: vh });
      const S = STATE[st.shape];
      const shapeFn = SHAPES[st.shape];
      fill(scratch, shapeFn, B);
      for (let i = 0; i < N_CTRL; i++) tgt.main[i].addScaledVector(scratch[i], w);
      if (st.shape === 'trenza') {
        fill(scratch, SHAPES.trenzaB, B); for (let i = 0; i < N_CTRL; i++) tgt.b[i].addScaledVector(scratch[i], w);
        fill(scratch, SHAPES.trenzaC, B); for (let i = 0; i < N_CTRL; i++) tgt.c[i].addScaledVector(scratch[i], w);
        bOp += w;
      } else {
        for (let i = 0; i < N_CTRL; i++) { tgt.b[i].addScaledVector(scratch[i], w); tgt.c[i].addScaledVector(scratch[i], w); }
      }
      // pista's width follows the rail band so the clips sit on the film.
      const width = st.shape === 'pista' ? B.hh * 2 * 0.62 : S.width;
      acc.chaos += S.chaos * w; acc.width += width * w; acc.twist += S.twist * w;
      acc.twistBase += S.twistBase * w; acc.flat += S.flat * w; acc.taper += S.taper * w;
      acc.opacity += (st.opacity == null ? 1 : st.opacity) * w;
      if (st.shape === 'nudo') { rOp += w * (1 - (state.heroExit || 0)); dOp += w; nOp += w * (1 - Math.min(1, (state.heroExit || 0) * 1.6)); }
      if (st.shape === 'loop') dOp += w * 0.7;
    }
    if (wsum > 0) {
      for (let i = 0; i < N_CTRL; i++) { tgt.main[i].multiplyScalar(1 / wsum); tgt.b[i].multiplyScalar(1 / wsum); tgt.c[i].multiplyScalar(1 / wsum); }
      for (const k in acc) acc[k] /= wsum;
      bOp /= wsum; rOp /= wsum; dOp /= wsum; nOp /= wsum;
    } else { acc.opacity = 0; }

    // Hero exit: the knot starts to come undone as the headline is cut.
    const ex = state.heroExit || 0;

    // ---- follow the page, then ease the shape: this lag IS the morph ------
    // Anchors in flow sections move with the scroll. Carry the current strip
    // by the weighted anchor movement so it stays attached to the layout;
    // only the change of shape between states is eased.
    let mdx = 0, mdy = 0, mw = 0;
    for (const st of state.states) {
      if (!st.box || !st.key) continue;
      const pb = prevBox[st.key];
      if (pb) {
        mdx += ((st.box.x - pb.x) / vw) * worldW * st.w;
        mdy += (-(st.box.y - pb.y) / vh) * worldH * st.w;
        mw += st.w;
      }
    }
    for (const key in prevBox) delete prevBox[key];
    for (const st of state.states) if (st.box && st.key) prevBox[st.key] = { x: st.box.x, y: st.box.y };
    if (mw > 0 && !first) {
      mdx /= Math.max(mw, wsum); mdy /= Math.max(mw, wsum);
      for (let i = 0; i < N_CTRL; i++) { cur.main[i].x += mdx; cur.main[i].y += mdy; cur.b[i].x += mdx; cur.b[i].y += mdy; cur.c[i].x += mdx; cur.c[i].y += mdy; }
    }
    const k = first || reduce ? 1 : 1 - Math.exp(-dt * 4.2);
    first = false;
    for (let i = 0; i < N_CTRL; i++) {
      cur.main[i].lerp(tgt.main[i], k); cur.b[i].lerp(tgt.b[i], k); cur.c[i].lerp(tgt.c[i], k);
    }
    const kp = reduce ? 1 : 1 - Math.exp(-dt * 3.2);
    for (const key of ['chaos', 'width', 'twist', 'twistBase', 'flat', 'taper', 'opacity']) curP[key] += (acc[key] - curP[key]) * kp;
    curP.chaos = curP.chaos * (1 - ex * 0.5);
    curP.heat += (grade.heat - curP.heat) * kp; curP.sheen += (grade.sheen - curP.sheen) * kp;
    curP.speed += (grade.speed - curP.speed) * kp;
    curP.noiseAmp = Math.min(worldH, worldW) * 0.03;
    braidOp += (bOp - braidOp) * kp; reelOp += (rOp - reelOp) * kp; dustOp += (dOp - dustOp) * kp; nearOp += (nOp - nearOp) * kp;

    // ---- pointer ---------------------------------------------------------
    pointer.x += (pointer.tx - pointer.x) * 0.08; pointer.y += (pointer.ty - pointer.y) * 0.08;
    pointer.k += ((pointer.on ? 1 : 0) - pointer.k) * 0.05;
    cam.position.x += (pointer.sx * 0.22 - cam.position.x) * 0.05;
    cam.position.y += (pointer.sy * 0.14 - cam.position.y) * 0.05;
    cam.lookAt(0, 0, 0);

    main.uniforms.uDraw.value = drawE;
    braidB.uniforms.uDraw.value = braidC.uniforms.uDraw.value = drawE;
    const pm = { ...curP, twist: curP.twist * grade.twist };
    main.update(cur.main, pm, cam, time, reduce ? null : pointer);
    const pb = { ...pm, opacity: curP.opacity * braidOp, width: curP.width * 0.8 };
    braidB.update(cur.b, pb, cam, time + 1.3, null);
    braidC.update(cur.c, pb, cam, time + 2.6, null);

    // ---- reels ------------------------------------------------------------
    const hb = state.heroBox ? boxToWorld(state.heroBox) : null;
    reels.forEach((r, i) => {
      const L = REEL_LAYOUT[i];
      if (!L || !hb) { r.mesh.visible = false; return; }
      const fl = reduce ? 0 : Math.sin(time * 0.6 + i * 1.7) * 0.05;
      const dirx = L[0] === 0 ? 1 : Math.sign(L[0]);
      const sc = (hb.hh * 2 * 0.74) / 1.6 * L[4];
      const ox = dirx * ex * ex * (2.2 + i * 0.4), oz = ex * 3.2 * (0.6 + i * 0.15);
      r.mesh.position.set(hb.cx + L[0] * hb.hw + ox, hb.cy + L[1] * hb.hh + fl + ex * (L[1] > 0 ? 1 : -1) * 0.8, L[2] * hb.zs * 0.9 + oz);
      r.mesh.rotation.set(0, L[3] + ex * dirx * 0.5, fl * 0.3);
      r.mesh.scale.setScalar(sc);
      r.mat.uniforms.uOpacity.value = reelOp * (1 - Math.min(1, ex * 1.3));
      r.mesh.visible = r.mat.uniforms.uOpacity.value > 0.01;
      if (r.mesh.visible) r.tex.needsUpdate = true;
    });

    dustU.uTime.value = time; dustU.uOpacity.value = 0.55 * dustOp;
    dust.visible = dustOp > 0.01;

    const anyBack = main.mesh.visible || reels.some((r) => r.mesh.visible) || dust.visible;
    if (anyBack) rb.render(scene, cam); else rb.clear();

    // ---- the near strip, in front of the headline -------------------------
    if (rf) {
      const nv = nearOp * drawE;
      if (nv > 0.01 && !mobile) {
        const z = 3.4;
        const hz = (CAM_Z - z) * Math.tan((FOV * Math.PI) / 360);
        const wz = hz * cam.aspect;
        const pts = [[-0.1, 0.34], [0.05, 0.2], [0.17, 0.27], [0.27, 0.12], [0.36, -0.12]];
        for (let i = 0; i < N_CTRL; i++) {
          const f = (i / (N_CTRL - 1)) * (pts.length - 1);
          const a = Math.floor(f), b = Math.min(pts.length - 1, a + 1), m = f - a;
          const sx = pts[a][0] + (pts[b][0] - pts[a][0]) * m, sy = pts[a][1] + (pts[b][1] - pts[a][1]) * m;
          const wob = reduce ? 0 : Math.sin(time * 0.7 + i * 0.5) * 0.02;
          cur.near[i].set((sx - 0.5) * 2 * wz - ex * 3, -(sy - 0.5) * 2 * hz + wob + ex * 1.5, z);
        }
        near.uniforms.uDraw.value = drawE;
        near.update(cur.near, { opacity: nv * 0.92, chaos: 0, noiseAmp: 0, width: 0.42, twist: 0.5, twistBase: 0.4, flat: 0.5, heat: curP.heat, sheen: 0.4, speed: 1, taper: 1 }, cam, time, null);
        rf.render(fscene, cam);
      } else rf.clear();
    }
  }

  return {
    frame, resize,
    setGrade(g) { grade = { ...grade, ...g }; },
    setPointer(px, py, on) {
      const [x, y] = toWorld(px, py);
      pointer.tx = x; pointer.ty = y; pointer.on = on;
      pointer.sx = px / vw - 0.5; pointer.sy = -(py / vh - 0.5);
    },
    reelTextures: reels.map((r) => r.tex),
    dispose() { rb.dispose(); if (rf) rf.dispose(); }
  };
}
