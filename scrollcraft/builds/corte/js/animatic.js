// Animatics: live structure previews of each editing style, drawn on Canvas2D.
// They show layout, rhythm and caption treatment, which is what a style is.
// A real sample video set on a style (style.video) replaces its animatic.

export const C = {
  bg: '#0d0e10', studio: '#191b1f', plate: '#1b1d21', plate2: '#24272c',
  line: 'rgba(238,234,226,0.10)', ink: '#EEEAE2', soft: '#9D998F',
  acc: '#FF4A1C', accInk: '#160803'
};

const DISPLAY = 'Archivo, system-ui, sans-serif';
const TEXT = 'Geist, system-ui, sans-serif';

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const ease = (x) => 1 - Math.pow(1 - clamp01(x), 4);
const easeIO = (x) => { x = clamp01(x); return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2; };

// Which shot of a cut list is on screen at time t, and how far into it.
function seq(t, durs) {
  const total = durs.reduce((a, b) => a + b, 0);
  let x = ((t % total) + total) % total;
  for (let i = 0; i < durs.length; i++) {
    if (x < durs[i]) return { i, lt: x, lp: x / durs[i] };
    x -= durs[i];
  }
  return { i: durs.length - 1, lt: 0, lp: 0 };
}

// Deterministic pseudo random, so a thumbnail is the same frame every load.
function rnd(seed) { const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

class Kit {
  constructor(ctx, w, h) {
    this.ctx = ctx; this.w = w; this.h = h;
    this.u = Math.min(w, h) / 100;
    this.W = w / this.u; this.H = h / this.u;
  }
  font(size, weight = 600, family = DISPLAY, stretch = 'semi-expanded', style = 'normal') {
    const c = this.ctx;
    c.font = `${style} ${weight} ${size * this.u}px ${family}`;
    try { c.fontStretch = stretch; } catch (e) { /* older engines */ }
  }
  bg(color = C.bg) { const c = this.ctx; c.fillStyle = color; c.fillRect(0, 0, this.w, this.h); }

  // A lit studio wall behind a presenter: one soft key, no colour.
  studio(kx = 0.3, ky = 0.3, tone = 1) {
    const c = this.ctx, u = this.u;
    this.bg(C.bg);
    const g = c.createRadialGradient(kx * this.w, ky * this.h, 0, kx * this.w, ky * this.h, Math.max(this.w, this.h) * 0.8);
    g.addColorStop(0, `rgba(42,44,50,${0.95 * tone})`);
    g.addColorStop(0.55, 'rgba(24,25,29,0.9)');
    g.addColorStop(1, 'rgba(13,14,16,1)');
    c.fillStyle = g; c.fillRect(0, 0, this.w, this.h);
    c.fillStyle = 'rgba(238,234,226,0.025)';
    c.fillRect(0, this.h * 0.72, this.w, 1 * u * 0.15);
  }

  rr(x, y, w, h, r) {
    const c = this.ctx, u = this.u;
    x *= u; y *= u; w *= u; h *= u; r *= u;
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }

  // A mannequin bust, lit from the left with a bone rim on the right.
  presenter(cx, by, s, t, o = {}) {
    const c = this.ctx, u = this.u;
    const ph = o.ph || 0;
    const nod = Math.sin(t * 2.4 + ph) * 0.035 * s;
    const sway = Math.sin(t * 0.9 + ph) * 0.05 * s;
    const S = s * u;
    c.save();
    c.translate((cx + sway) * u, by * u);
    c.beginPath();
    c.moveTo(-2.7 * S, 0.05 * S);
    c.bezierCurveTo(-2.62 * S, -1.25 * S, -1.95 * S, -1.78 * S, -0.98 * S, -1.98 * S);
    c.bezierCurveTo(-0.62 * S, -2.05 * S, -0.44 * S, -2.25 * S, -0.42 * S, -2.6 * S);
    c.lineTo(0.42 * S, -2.6 * S);
    c.bezierCurveTo(0.44 * S, -2.25 * S, 0.62 * S, -2.05 * S, 0.98 * S, -1.98 * S);
    c.bezierCurveTo(1.95 * S, -1.78 * S, 2.62 * S, -1.25 * S, 2.7 * S, 0.05 * S);
    c.closePath();
    const bodyPath = new Path2D(); // re-trace for outline use
    const g = c.createLinearGradient(-2.7 * S, -2.6 * S, 2.7 * S, 0);
    g.addColorStop(0, o.cut ? '#4a4d55' : '#3f4249');
    g.addColorStop(0.55, '#26282d');
    g.addColorStop(1, '#141518');
    c.fillStyle = g; c.fill();
    if (o.outline) { c.lineWidth = 0.09 * S; c.strokeStyle = o.outline; c.stroke(); }
    // collar line
    c.strokeStyle = 'rgba(238,234,226,0.08)'; c.lineWidth = 0.05 * S;
    c.beginPath(); c.moveTo(-0.55 * S, -1.95 * S); c.quadraticCurveTo(0, -1.55 * S, 0.55 * S, -1.95 * S); c.stroke();
    // head
    const hy = -3.32 * S + nod;
    c.beginPath(); c.ellipse(0, hy, 0.74 * S, 0.92 * S, 0, 0, Math.PI * 2);
    const hg = c.createRadialGradient(-0.3 * S, hy - 0.35 * S, 0.05 * S, 0, hy, 1.15 * S);
    hg.addColorStop(0, '#5a5d65'); hg.addColorStop(0.55, '#2d2f35'); hg.addColorStop(1, '#16171a');
    c.fillStyle = hg; c.fill();
    if (o.outline) { c.lineWidth = 0.09 * S; c.strokeStyle = o.outline; c.stroke(); }
    // rim light
    c.strokeStyle = 'rgba(238,234,226,0.42)'; c.lineWidth = 0.05 * S;
    c.beginPath(); c.ellipse(0, hy, 0.74 * S, 0.92 * S, 0, -1.25, 0.85); c.stroke();
    c.beginPath(); c.moveTo(1.1 * S, -1.9 * S); c.bezierCurveTo(1.9 * S, -1.72 * S, 2.5 * S, -1.2 * S, 2.6 * S, -0.2 * S); c.stroke();
    c.restore();
    void bodyPath;
  }

  // B-roll stand-in: a quiet photographic plate with one motif and a slate label.
  plate(x, y, w, h, t, seed = 1, o = {}) {
    const c = this.ctx, u = this.u;
    c.save();
    this.rr(x, y, w, h, o.r == null ? 1.2 : o.r);
    c.clip();
    const X = x * u, Y = y * u, Wd = w * u, Hd = h * u;
    const a = rnd(seed) * Math.PI * 2;
    const g = c.createLinearGradient(X + Math.cos(a) * Wd, Y, X + Wd - Math.cos(a) * Wd, Y + Hd);
    const warm = rnd(seed + 3) > 0.5;
    g.addColorStop(0, warm ? '#2b2724' : '#22262b');
    g.addColorStop(1, '#121315');
    c.fillStyle = g; c.fillRect(X, Y, Wd, Hd);
    // Ken Burns drift of the key light
    const kx = X + Wd * (0.3 + 0.4 * rnd(seed + 1) + Math.sin(t * 0.25 + seed) * 0.06);
    const ky = Y + Hd * (0.3 + 0.3 * rnd(seed + 2));
    const kg = c.createRadialGradient(kx, ky, 0, kx, ky, Math.max(Wd, Hd) * 0.7);
    kg.addColorStop(0, 'rgba(238,234,226,0.16)'); kg.addColorStop(1, 'rgba(238,234,226,0)');
    c.fillStyle = kg; c.fillRect(X, Y, Wd, Hd);
    const motif = Math.floor(rnd(seed + 9) * 4);
    c.strokeStyle = 'rgba(238,234,226,0.18)'; c.fillStyle = 'rgba(238,234,226,0.10)';
    c.lineWidth = Math.max(1, 0.25 * u);
    if (motif === 0) { // horizon and sun
      const hy = Y + Hd * 0.64;
      c.beginPath(); c.moveTo(X, hy); c.lineTo(X + Wd, hy); c.stroke();
      c.beginPath(); c.arc(X + Wd * 0.62, hy - Hd * 0.12 - Math.sin(t * 0.3) * Hd * 0.02, Math.min(Wd, Hd) * 0.11, 0, Math.PI * 2); c.fill();
    } else if (motif === 1) { // city windows
      for (let i = 0; i < 7; i++) {
        const bw = Wd / 7, bh = Hd * (0.25 + 0.45 * rnd(seed + i));
        c.fillStyle = 'rgba(238,234,226,0.05)'; c.fillRect(X + i * bw + bw * 0.1, Y + Hd - bh, bw * 0.8, bh);
        c.fillStyle = 'rgba(238,234,226,0.22)';
        for (let k = 0; k < 4; k++) if (rnd(seed + i * 7 + k) > 0.5) c.fillRect(X + i * bw + bw * 0.3, Y + Hd - bh + bh * (0.15 + k * 0.2), bw * 0.14, bh * 0.06);
      }
    } else if (motif === 2) { // a screen on a desk
      c.strokeRect(X + Wd * 0.22, Y + Hd * 0.26, Wd * 0.56, Hd * 0.36);
      c.fillStyle = 'rgba(238,234,226,0.06)'; c.fillRect(X + Wd * 0.22, Y + Hd * 0.26, Wd * 0.56, Hd * 0.36);
      c.beginPath(); c.moveTo(X + Wd * 0.1, Y + Hd * 0.72); c.lineTo(X + Wd * 0.9, Y + Hd * 0.72); c.stroke();
    } else { // hands and cup: two circles on a table
      c.beginPath(); c.moveTo(X, Y + Hd * 0.7); c.lineTo(X + Wd, Y + Hd * 0.66); c.stroke();
      c.beginPath(); c.arc(X + Wd * 0.38, Y + Hd * 0.6, Math.min(Wd, Hd) * 0.09, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(X + Wd * 0.62, Y + Hd * 0.62, Math.min(Wd, Hd) * 0.06, 0, Math.PI * 2); c.fill();
    }
    if (!o.nolabel) {
      this.font(Math.max(2.1, Math.min(w, h) * 0.07), 500, TEXT, 'normal');
      c.fillStyle = 'rgba(238,234,226,0.38)';
      c.textBaseline = 'alphabetic'; c.textAlign = 'left';
      c.fillText('B-ROLL ' + String(1 + (seed % 9)).padStart(2, '0'), X + 1.6 * u, Y + Hd - 1.6 * u);
    }
    c.restore();
    if (o.stroke) { this.rr(x, y, w, h, o.r == null ? 1.2 : o.r); c.lineWidth = o.lw || 0.35 * u; c.strokeStyle = o.stroke; c.stroke(); }
  }

  text(str, x, y, size, o = {}) {
    const c = this.ctx, u = this.u;
    this.font(size, o.weight || 650, o.family || DISPLAY, o.stretch || 'semi-expanded', o.italic ? 'italic' : 'normal');
    c.textAlign = o.align || 'left'; c.textBaseline = o.base || 'alphabetic';
    c.fillStyle = o.color || C.ink;
    c.globalAlpha = o.alpha == null ? 1 : o.alpha;
    c.fillText(str, x * u, y * u);
    c.globalAlpha = 1;
    return c.measureText(str).width / u;
  }
  measure(str, size, weight = 650, family = DISPLAY, stretch = 'semi-expanded') {
    this.font(size, weight, family, stretch); return this.ctx.measureText(str).width / this.u;
  }

  // One word, big, with a small pop on each new word.
  capWord(word, cx, cy, size, lp, o = {}) {
    const c = this.ctx, u = this.u;
    const pop = 1 + 0.12 * (1 - ease(lp * 5));
    c.save(); c.translate(cx * u, cy * u); c.scale(pop, pop);
    this.font(size, 800, DISPLAY, 'expanded');
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = size * 0.16 * u; c.strokeStyle = 'rgba(8,9,11,0.85)'; c.lineJoin = 'round';
    c.strokeText(word.toUpperCase(), 0, 0);
    c.fillStyle = o.accent ? C.acc : C.ink;
    c.fillText(word.toUpperCase(), 0, 0);
    c.restore();
  }

  // Karaoke line: the spoken word wears the accent.
  capKaraoke(words, cx, cy, size, p, o = {}) {
    const c = this.ctx, u = this.u;
    this.font(size, 750, DISPLAY, 'semi-expanded');
    const gap = size * 0.28;
    const ws = words.map((w) => c.measureText(w.toUpperCase()).width / u);
    const total = ws.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
    let x = cx - total / 2;
    const cur = Math.min(words.length - 1, Math.floor(p * words.length));
    c.textBaseline = 'middle'; c.textAlign = 'left';
    words.forEach((w, i) => {
      if (i === cur) {
        c.fillStyle = C.acc; this.rr(x - size * 0.14, cy - size * 0.62, ws[i] + size * 0.28, size * 1.18, size * 0.12); c.fill();
        c.fillStyle = C.accInk;
      } else c.fillStyle = i < cur ? C.ink : 'rgba(238,234,226,0.55)';
      if (o.shadow !== false && i !== cur) { c.lineWidth = size * 0.14 * u; c.strokeStyle = 'rgba(8,9,11,0.7)'; c.lineJoin = 'round'; c.strokeText(w.toUpperCase(), x * u, cy * u); }
      c.fillText(w.toUpperCase(), x * u, cy * u);
      x += ws[i] + gap;
    });
  }

  // Fitted: small line, one huge accent word, small line, all set to one width.
  capFitted(top, big, bottom, cx, cy, width, lp) {
    const c = this.ctx, u = this.u;
    const bw = this.measure(big.toUpperCase(), 10, 850, DISPLAY, 'expanded');
    const bs = (width / bw) * 10;
    const tw = this.measure(top.toUpperCase(), 10, 700, DISPLAY, 'semi-expanded');
    const ts = Math.min((width / tw) * 10, bs * 0.42);
    const lw = this.measure(bottom, 10, 500, DISPLAY, 'normal');
    const ls = Math.min((width / lw) * 10, bs * 0.36);
    const k = ease(lp * 3);
    const y0 = cy - (ts + bs * 0.86 + ls) / 2;
    c.save();
    c.globalAlpha = k;
    this.text(top.toUpperCase(), cx - width / 2, y0 + ts * 0.82, ts, { weight: 700, color: C.ink });
    c.save(); c.translate(0, (1 - k) * bs * 0.25 * u);
    this.text(big.toUpperCase(), cx - width / 2, y0 + ts + bs * 0.78, bs, { weight: 850, stretch: 'expanded', color: C.acc });
    c.restore();
    this.text(bottom, cx - width / 2, y0 + ts + bs * 0.86 + ls * 0.95, ls, { weight: 500, stretch: 'normal', italic: true, color: C.ink });
    c.restore();
  }

  // Stacked key phrases on solid boxes, entering one by one.
  capStack(lines, x, y, size, p, o = {}) {
    const c = this.ctx, u = this.u;
    let yy = y;
    lines.forEach((ln, i) => {
      const k = ease((p - i * (o.step || 0.18)) * 5);
      if (k <= 0) { yy += size * 1.32; return; }
      const hot = o.hot === i;
      const w = this.measure(ln.toUpperCase(), size, 780, DISPLAY, 'semi-expanded');
      c.save();
      c.beginPath(); c.rect(x * u, (yy - size * 1.05) * u, (w + size * 0.7) * u * k, size * 1.34 * u); c.clip();
      c.fillStyle = hot ? C.acc : C.ink;
      this.rr(x, yy - size * 1.0, w + size * 0.7, size * 1.24, size * 0.12); c.fill();
      this.text(ln.toUpperCase(), x + size * 0.35, yy, size, { weight: 780, color: hot ? C.accInk : C.bg });
      c.restore();
      yy += size * 1.32;
    });
  }

  capSmall(str, cx, y, size = 3.6) {
    const c = this.ctx;
    c.save();
    this.text(str, cx, y, size, { weight: 500, family: TEXT, stretch: 'normal', align: 'center', color: 'rgba(238,234,226,0.86)' });
    c.restore();
  }

  graph(x, y, w, h, p, seed = 2) {
    const c = this.ctx, u = this.u;
    c.strokeStyle = C.line; c.lineWidth = Math.max(1, 0.2 * u);
    for (let i = 0; i <= 3; i++) { c.beginPath(); c.moveTo(x * u, (y + h * i / 3) * u); c.lineTo((x + w) * u, (y + h * i / 3) * u); c.stroke(); }
    const n = 9, pts = [];
    for (let i = 0; i < n; i++) {
      const fx = i / (n - 1);
      const v = 0.12 + 0.7 * Math.pow(fx, 1.6) + (rnd(seed + i) - 0.5) * 0.14;
      pts.push([x + w * fx, y + h - h * clamp01(v)]);
    }
    const lim = p * (n - 1);
    c.strokeStyle = C.acc; c.lineWidth = 0.8 * u; c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath(); c.moveTo(pts[0][0] * u, pts[0][1] * u);
    let last = pts[0];
    for (let i = 1; i < n; i++) {
      if (i <= lim) { c.lineTo(pts[i][0] * u, pts[i][1] * u); last = pts[i]; }
      else {
        const f = lim - (i - 1); if (f <= 0) break;
        const px = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, py = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f;
        c.lineTo(px * u, py * u); last = [px, py]; break;
      }
    }
    c.stroke();
    c.fillStyle = C.acc; c.beginPath(); c.arc(last[0] * u, last[1] * u, 1.3 * u, 0, Math.PI * 2); c.fill();
  }

  bars(x, y, w, h, p, n = 5, seed = 4) {
    const c = this.ctx, u = this.u;
    const bw = w / n;
    for (let i = 0; i < n; i++) {
      const v = 0.25 + 0.7 * (i / (n - 1)) * (0.75 + 0.25 * rnd(seed + i));
      const k = ease(p * 1.6 - i * 0.12);
      const bh = h * v * k;
      c.fillStyle = i === n - 1 ? C.acc : 'rgba(238,234,226,0.22)';
      c.fillRect((x + i * bw + bw * 0.18) * u, (y + h - bh) * u, bw * 0.64 * u, bh * u);
    }
  }

  // Three labelled boxes joined by lines that draw themselves.
  diagram(x, y, w, h, p, labels = ['Gancho', 'Valor', 'Llamada'], vertical = false) {
    const c = this.ctx, u = this.u;
    const n = labels.length;
    const boxes = labels.map((l, i) => {
      if (vertical) { const bh = h / (n * 1.6); return { x: x + w * 0.15, y: y + i * (h / n) + (h / n - bh) / 2, w: w * 0.7, h: bh, l }; }
      const bw = w / (n * 1.45); return { x: x + i * (w / n) + (w / n - bw) / 2, y: y + h * 0.3, w: bw, h: h * 0.4, l };
    });
    boxes.forEach((b, i) => {
      const k = ease(p * n * 0.9 - i * 0.9);
      if (k <= 0) return;
      c.globalAlpha = k;
      c.fillStyle = i === n - 1 ? 'rgba(255,74,28,0.14)' : 'rgba(238,234,226,0.06)';
      this.rr(b.x, b.y, b.w, b.h, 1.4); c.fill();
      c.lineWidth = 0.3 * u; c.strokeStyle = i === n - 1 ? C.acc : 'rgba(238,234,226,0.35)'; c.stroke();
      const fs = Math.min(b.h * 0.3, b.w * 0.16);
      this.text(b.l, b.x + b.w / 2, b.y + b.h / 2 + fs * 0.35, fs, { align: 'center', weight: 650, color: C.ink });
      c.globalAlpha = 1;
      if (i < n - 1) {
        const nb = boxes[i + 1];
        const lk = ease(p * n * 0.9 - i * 0.9 - 0.6);
        if (lk > 0) {
          c.strokeStyle = 'rgba(238,234,226,0.45)'; c.lineWidth = 0.3 * u;
          c.beginPath();
          if (vertical) { const sx = b.x + b.w / 2; c.moveTo(sx * u, (b.y + b.h) * u); c.lineTo(sx * u, (b.y + b.h + (nb.y - b.y - b.h) * lk) * u); }
          else { const sy = b.y + b.h / 2; c.moveTo((b.x + b.w) * u, sy * u); c.lineTo((b.x + b.w + (nb.x - b.x - b.w) * lk) * u, sy * u); }
          c.stroke();
        }
      }
    });
  }

  // A page of notes that scrolls, with the spoken line marked.
  doc(x, y, w, h, scroll, hot) {
    const c = this.ctx, u = this.u;
    c.save();
    c.fillStyle = '#e9e7e1'; this.rr(x, y, w, h, 1.2); c.fill(); c.clip();
    const lh = h / 11;
    for (let i = 0; i < 22; i++) {
      const ly = y + lh * 0.9 + i * lh - scroll * lh * 6;
      if (ly < y - lh || ly > y + h + lh) continue;
      if (i % 6 === 0) { c.fillStyle = '#111214'; c.fillRect((x + w * 0.08) * u, ly * u, w * 0.5 * u, lh * 0.42 * u); continue; }
      const lw = w * (0.55 + 0.3 * rnd(i + 3));
      if (i === hot) { c.fillStyle = 'rgba(255,74,28,0.32)'; c.fillRect((x + w * 0.06) * u, (ly - lh * 0.12) * u, (lw + w * 0.04) * u, lh * 0.5 * u); }
      c.fillStyle = 'rgba(17,18,20,0.42)'; c.fillRect((x + w * 0.08) * u, ly * u, lw * u, lh * 0.22 * u);
    }
    c.restore();
  }

  // The loop's own playhead: a hairline with an accent head.
  playhead(f) {
    const c = this.ctx, u = this.u;
    c.fillStyle = 'rgba(238,234,226,0.14)'; c.fillRect(0, this.h - 0.6 * u, this.w, 0.6 * u);
    c.fillStyle = C.acc; c.fillRect(0, this.h - 0.6 * u, this.w * f, 0.6 * u);
  }
}

// ---------------------------------------------------------------- styles --
// fmt: '9:16' | '16:9'. trat: caption treatment the page borrows under El Grade.
export const STYLES = [
  {
    id: 'reel-negocio', name: 'Reel de negocio', fmt: '9:16', trat: 'apilado', dur: 7.2, thumb: 1.1,
    line: 'Pantalla completa, pantalla dividida y animación, alternando en cada corte.',
    draw(K, t) {
      const s = seq(t, [1.8, 1.8, 1.8, 1.8]);
      if (s.i === 0 || s.i === 3) {
        K.studio(0.25, 0.25); K.presenter(50, K.H + 4, 23, t, { ph: 1 });
        K.capStack(s.i === 0 ? ['Tres errores', 'que frenan', 'tu negocio'] : ['Arréglalos', 'hoy mismo'], 8, K.H * 0.7, 6.4, s.lp, { hot: s.i === 0 ? 2 : 1, step: 0.14 });
      } else if (s.i === 1) {
        K.bg(); K.plate(0, 0, K.W, K.H * 0.5, t, 3, { r: 0 });
        K.ctx.save(); K.ctx.beginPath(); K.ctx.rect(0, K.H * 0.5 * K.u, K.w, K.h); K.ctx.clip();
        K.studio(0.3, 0.6); K.presenter(50, K.H + 4, 19, t, { ph: 2 }); K.ctx.restore();
        K.ctx.fillStyle = C.acc; K.ctx.fillRect(0, K.H * 0.5 * K.u - 0.3 * K.u, K.w, 0.6 * K.u);
        K.capKaraoke(['uno', 'precio', 'sin', 'valor'], 50, K.H * 0.86, 5.8, s.lp);
      } else {
        K.bg('#101114');
        K.text('ESCALA', 8, 30, 9, { weight: 850, stretch: 'expanded' });
        K.text('lo que ya funciona', 8, 38, 4.6, { weight: 500, italic: true, stretch: 'normal', color: C.soft });
        K.bars(8, 60, 84, 80, s.lp);
      }
      K.playhead((t % this.dur) / this.dur);
    }
  },
  {
    id: 'reel-personal', name: 'Reel personal', fmt: '9:16', trat: 'palabra', dur: 6.0, thumb: 0.7,
    line: 'Cortes rápidos, tu propio B-roll, subtítulos de una sola palabra.',
    draw(K, t) {
      const words = ['Nadie', 'te', 'cuenta', 'esto', 'de', 'grabar', 'todos', 'los', 'días'];
      const s = seq(t, words.map(() => this.dur / words.length));
      const shot = Math.floor(s.i / 2) % 3;
      if (shot === 1) K.plate(0, 0, K.W, K.H, t, 11 + s.i, { r: 0 });
      else { K.studio(shot ? 0.7 : 0.25, 0.3); K.presenter(50 + (shot ? -6 : 4), K.H + (shot ? 14 : 6), shot ? 30 : 22, t, { ph: shot }); }
      K.capWord(words[s.i], 50, K.H * 0.62, 12, s.lp, { accent: s.i === 5 });
      K.playhead((t % this.dur) / this.dur);
    }
  },
  {
    id: 'panel-explicativo', name: 'Panel explicativo', fmt: '9:16', trat: 'limpio', dur: 7.0, thumb: 4.2,
    line: 'Tú en un panel abajo, la explicación animada arriba.',
    draw(K, t) {
      const p = (t % this.dur) / this.dur;
      K.bg('#0f1012');
      K.text('Cómo funciona un gancho', 8, 16, 5.2, { weight: 700 });
      K.diagram(4, 22, 92, 80, p * 1.3, ['Pausa', 'Promesa', 'Prueba'], true);
      K.ctx.save(); K.rr(6, K.H * 0.62, 88, K.H * 0.33, 2.4); K.ctx.clip();
      K.studio(0.3, 0.75); K.presenter(50, K.H * 0.95 + 2, 13, t, { ph: 3 });
      K.ctx.restore();
      K.rr(6, K.H * 0.62, 88, K.H * 0.33, 2.4); K.ctx.lineWidth = 0.3 * K.u; K.ctx.strokeStyle = 'rgba(238,234,226,0.2)'; K.ctx.stroke();
      K.capSmall('la pausa es lo que obliga a mirar', 50, K.H * 0.92, 3.5);
      K.playhead(p);
    }
  },
  {
    id: 'subtitulo-ajustado', name: 'Subtítulo ajustado', fmt: '9:16', trat: 'acento', dur: 7.5, thumb: 0.9,
    line: 'Una palabra grande en acento y el resto encajado alrededor.',
    draw(K, t) {
      const lines = [['el primer', 'segundo', 'lo decide todo'], ['nadie', 'termina', 'un video lento'], ['corta', 'todo', 'lo que no empuja']];
      const s = seq(t, [2.5, 2.5, 2.5]);
      K.studio(0.28, 0.22); K.presenter(50, K.H + 6, 24, t, { ph: 4 });
      const L = lines[s.i];
      K.capFitted(L[0], L[1], L[2], 50, K.H * 0.7, 76, s.lp);
      K.playhead((t % this.dur) / this.dur);
    }
  },
  {
    id: 'ensayo-visual', name: 'Ensayo visual', fmt: '9:16', trat: 'acento', dur: 7.0, thumb: 3.6,
    line: 'Negro y un color. Tú recortado y la evidencia encima de ti.',
    draw(K, t) {
      const p = (t % this.dur) / this.dur;
      K.bg('#08090a');
      const cards = [[8, 12, 50, 28, 21], [44, 30, 48, 26, 22], [12, 52, 46, 24, 23]];
      cards.forEach((cd, i) => {
        const k = ease(p * 3.2 - i * 0.7);
        if (k <= 0) return;
        K.ctx.save(); K.ctx.globalAlpha = k; K.ctx.translate(0, (1 - k) * 6 * K.u);
        K.plate(cd[0], cd[1], cd[2], cd[3], t, cd[4], { nolabel: true, stroke: i === 1 ? C.acc : 'rgba(238,234,226,0.25)', lw: 0.5 * K.u });
        K.ctx.fillStyle = 'rgba(238,234,226,0.75)'; K.ctx.fillRect((cd[0] + 3) * K.u, (cd[1] + cd[3] - 7) * K.u, cd[2] * 0.6 * K.u, 1.4 * K.u);
        if (i === 1) { K.ctx.fillStyle = C.acc; K.ctx.fillRect((cd[0] + 3) * K.u, (cd[1] + cd[3] - 4.4) * K.u, cd[2] * 0.42 * K.u * ease(p * 3 - 1.4), 1.2 * K.u); }
        K.ctx.restore();
      });
      K.presenter(50, K.H + 4, 19, t, { ph: 5, outline: C.acc, cut: true });
      K.ctx.fillStyle = C.acc; K.rr(10, K.H * 0.83, 80, 10, 1); K.ctx.fill();
      K.text('LA PRUEBA ESTÁ ARRIBA', 50, K.H * 0.83 + 6.6, 4.6, { align: 'center', weight: 800, color: C.accInk });
      K.playhead(p);
    }
  },
  {
    id: 'reel-dividido', name: 'Reel dividido', fmt: '9:16', trat: 'limpio', dur: 6.4, thumb: 3.0,
    line: 'Tu cara arriba, diagramas animados abajo.',
    draw(K, t) {
      const p = (t % this.dur) / this.dur;
      K.ctx.save(); K.ctx.beginPath(); K.ctx.rect(0, 0, K.w, K.h * 0.5); K.ctx.clip();
      K.studio(0.3, 0.3); K.presenter(50, K.H * 0.5 + 6, 15, t, { ph: 6 }); K.ctx.restore();
      K.ctx.fillStyle = '#0f1012'; K.ctx.fillRect(0, K.h * 0.5, K.w, K.h * 0.5);
      K.ctx.fillStyle = 'rgba(238,234,226,0.18)'; K.ctx.fillRect(0, K.h * 0.5, K.w, 0.3 * K.u);
      K.graph(10, K.H * 0.58, 80, K.H * 0.28, p * 1.15, 8);
      K.capSmall('retención por segundo', 50, K.H * 0.94, 3.4);
      K.playhead(p);
    }
  },
  {
    id: 'broll-frases', name: 'B-roll y frases', fmt: '9:16', trat: 'apilado', dur: 6.0, thumb: 3.5,
    line: 'Corte ajustado, B-roll y frases clave apiladas.',
    draw(K, t) {
      const s = seq(t, [1.5, 1.5, 1.5, 1.5]);
      K.plate(0, 0, K.W, K.H, t, 31 + s.i, { r: 0 });
      const p = (t % this.dur) / this.dur;
      K.capStack(['Graba una vez.', 'Publica diez.', 'Sin editar tú.'], 8, K.H * 0.66, 6.2, p * 1.4, { hot: 1, step: 0.22 });
      K.playhead(p);
    }
  },
  {
    id: 'nube-imagenes', name: 'Nube de imágenes', fmt: '9:16', trat: 'limpio', dur: 6.8, thumb: 3.4,
    line: 'Grupos de imágenes sobre tu cabeza, subtítulos pequeños y tranquilos.',
    draw(K, t) {
      const p = (t % this.dur) / this.dur;
      K.studio(0.5, 0.25); K.presenter(50, K.H + 6, 21, t, { ph: 7 });
      const spots = [[14, 14, 30, 20, -4], [50, 8, 34, 22, 3], [28, 36, 30, 20, 2], [62, 34, 26, 18, -3], [6, 40, 20, 15, 5]];
      spots.forEach((sp, i) => {
        const k = ease(p * 4 - i * 0.45);
        if (k <= 0) return;
        K.ctx.save();
        K.ctx.translate((sp[0] + sp[2] / 2) * K.u, (sp[1] + sp[3] / 2) * K.u);
        K.ctx.rotate(sp[4] * Math.PI / 180); K.ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k); K.ctx.globalAlpha = k;
        K.ctx.translate(-(sp[0] + sp[2] / 2) * K.u, -(sp[1] + sp[3] / 2) * K.u);
        K.plate(sp[0], sp[1], sp[2], sp[3], t, 41 + i, { nolabel: true, stroke: 'rgba(238,234,226,0.4)', lw: 0.4 * K.u });
        K.ctx.restore();
      });
      K.capSmall('cinco ideas, una sola toma', 50, K.H * 0.93, 3.6);
      K.playhead(p);
    }
  },
  {
    id: 'recorte-fondo', name: 'Recorte sobre fondo', fmt: '9:16', trat: 'palabra', dur: 6.0, thumb: 1.6,
    line: 'Tú recortado sobre imágenes que cambian con cada idea.',
    draw(K, t) {
      const s = seq(t, [1.5, 1.5, 1.5, 1.5]);
      const words = ['Idea', 'Prueba', 'Ejemplo', 'Cierre'];
      K.plate(0, 0, K.W, K.H, t, 51 + s.i * 2, { r: 0 });
      K.ctx.fillStyle = 'rgba(8,9,11,0.35)'; K.ctx.fillRect(0, 0, K.w, K.h);
      K.presenter(50, K.H + 4, 22, t, { ph: 8, outline: 'rgba(238,234,226,0.9)', cut: true });
      K.capWord(words[s.i], 50, K.H * 0.3, 11, s.lp, { accent: s.i === 3 });
      K.playhead((t % this.dur) / this.dur);
    }
  },
  {
    id: 'ranking', name: 'Ranking', fmt: '9:16', trat: 'apilado', dur: 8.0, thumb: 6.0,
    line: 'Una lista por niveles que se llena tarjeta a tarjeta.',
    draw(K, t) {
      const p = (t % this.dur) / this.dur;
      K.bg('#0f1012');
      K.text('MIS HERRAMIENTAS', 8, 13, 5.6, { weight: 850, stretch: 'expanded' });
      const tiers = ['S', 'A', 'B', 'C'];
      const rowH = 17;
      tiers.forEach((tr, i) => {
        const y = 20 + i * (rowH + 2);
        K.ctx.fillStyle = i === 0 ? C.acc : 'rgba(238,234,226,0.12)'; K.rr(6, y, 14, rowH, 1); K.ctx.fill();
        K.text(tr, 13, y + rowH * 0.68, 8, { align: 'center', weight: 850, color: i === 0 ? C.accInk : C.ink });
        K.ctx.fillStyle = 'rgba(238,234,226,0.04)'; K.rr(22, y, 72, rowH, 1); K.ctx.fill();
      });
      const order = [[0, 0], [2, 0], [1, 0], [0, 1], [3, 0], [1, 1], [2, 1]];
      order.forEach((o, i) => {
        const k = ease(p * 9 - i * 1.05);
        if (k <= 0) return;
        const tx = 24 + o[1] * 16, ty = 20 + o[0] * (rowH + 2) + 1.5;
        const sx = 50, sy = K.H * 0.86;
        const x = sx + (tx - sx) * k, y = sy + (ty - sy) * k;
        K.plate(x, y, 14, rowH - 3, t, 61 + i, { nolabel: true, stroke: 'rgba(238,234,226,0.35)', lw: 0.3 * K.u });
      });
      K.ctx.save(); K.rr(60, K.H * 0.76, 34, K.H * 0.2, 2); K.ctx.clip();
      K.studio(0.3, 0.8); K.presenter(77, K.H * 0.96 + 1, 7.5, t, { ph: 9 }); K.ctx.restore();
      K.playhead(p);
    }
  },
  {
    id: 'clips-largo', name: 'Clips de video largo', fmt: '9:16', trat: 'palabra', dur: 7.0, thumb: 4.4,
    line: 'Entra un video largo y salen clips verticales ordenados por fuerza.',
    draw(K, t) {
      const p = (t % this.dur) / this.dur;
      K.bg('#0f1012');
      K.ctx.save(); K.rr(6, 8, 88, 28, 1.4); K.ctx.clip(); K.studio(0.4, 0.4); K.presenter(30, 40, 6.5, t, { ph: 10 }); K.presenter(70, 40, 6.5, t, { ph: 11 }); K.ctx.restore();
      K.ctx.fillStyle = 'rgba(238,234,226,0.12)'; K.ctx.fillRect(6 * K.u, 39 * K.u, 88 * K.u, 1.2 * K.u);
      [0.18, 0.47, 0.79].forEach((m, i) => { K.ctx.fillStyle = C.acc; K.ctx.fillRect((6 + 88 * m) * K.u, 37.6 * K.u, 0.8 * K.u, 4 * K.u); void i; });
      K.ctx.fillStyle = C.ink; K.ctx.fillRect(6 * K.u, 39 * K.u, 88 * p * K.u, 1.2 * K.u);
      [0, 1, 2].forEach((i) => {
        const k = ease(p * 3.4 - 0.5 - i * 0.6);
        if (k <= 0) return;
        const x = 6 + i * 30, y = 52 + (1 - k) * 20;
        K.ctx.save(); K.ctx.globalAlpha = k; K.rr(x, y, 27, 48, 1.4); K.ctx.clip();
        K.studio(0.3, 0.3); K.presenter(x + 13.5, y + 52, 5.6, t, { ph: 12 + i }); K.ctx.restore();
        K.ctx.globalAlpha = k; K.text('#' + (i + 1), x + 2, y + 6.5, 5, { weight: 850, color: i === 0 ? C.acc : C.ink }); K.ctx.globalAlpha = 1;
      });
      K.capKaraoke(['tres', 'clips', 'listos'], 50, K.H * 0.9, 5.4, p);
      K.playhead(p);
    }
  },
  {
    id: 'datos-en-pantalla', name: 'Datos en pantalla', fmt: '9:16', trat: 'acento', dur: 7.0, thumb: 5.6,
    line: 'Contadores y gráficas que se dibujan mientras hablas.',
    draw(K, t) {
      const p = (t % this.dur) / this.dur;
      K.studio(0.3, 0.7); K.presenter(50, K.H + 8, 19, t, { ph: 13 });
      K.ctx.fillStyle = 'rgba(13,14,16,0.82)'; K.rr(6, 8, 88, 70, 2); K.ctx.fill();
      K.ctx.lineWidth = 0.3 * K.u; K.ctx.strokeStyle = 'rgba(238,234,226,0.14)'; K.ctx.stroke();
      const v = Math.round(ease(p * 1.4) * 3);
      K.text('×' + v, 12, 32, 18, { weight: 850, stretch: 'expanded', color: C.acc });
      K.text('más vistas al recortar el inicio', 12, 40, 3.6, { weight: 500, family: TEXT, stretch: 'normal', color: C.soft });
      K.graph(12, 46, 76, 26, p * 1.25, 14);
      K.playhead(p);
    }
  },
  {
    id: 'youtube-educativo', name: 'YouTube educativo', fmt: '16:9', trat: 'limpio', dur: 8.0, thumb: 1.2,
    line: 'Edición larga con overlays, pantalla dividida y animaciones explicativas.',
    draw(K, t) {
      const s = seq(t, [2.6, 2.6, 2.8]);
      if (s.i === 0) {
        K.studio(0.7, 0.3); K.presenter(K.W * 0.68, K.H + 6, 22, t, { ph: 14 });
        const k = ease(s.lp * 3);
        K.ctx.globalAlpha = k;
        K.text('CAPÍTULO 2', 10, 34, 4.2, { weight: 600, family: TEXT, stretch: 'normal', color: C.acc });
        K.text('El gancho', 10, 50, 13, { weight: 800, stretch: 'expanded' });
        K.ctx.globalAlpha = 1;
      } else if (s.i === 1) {
        K.bg(); K.plate(4, 6, K.W * 0.5 - 6, 88, t, 71); K.ctx.save(); K.rr(K.W * 0.5 + 2, 6, K.W * 0.5 - 6, 88, 1.2); K.ctx.clip();
        K.studio(0.5, 0.3); K.presenter(K.W * 0.75, K.H + 4, 17, t, { ph: 15 }); K.ctx.restore();
      } else {
        K.bg('#0f1012'); K.diagram(6, 10, K.W * 0.62, 70, s.lp * 1.4, ['Idea', 'Prueba', 'Acción']);
        K.ctx.save(); K.rr(K.W * 0.7, 52, K.W * 0.27, 42, 1.4); K.ctx.clip(); K.studio(0.5, 0.5); K.presenter(K.W * 0.835, 100, 8, t, { ph: 16 }); K.ctx.restore();
      }
      K.ctx.fillStyle = 'rgba(8,9,11,0.7)'; K.ctx.fillRect(6 * K.u, 82 * K.u, 44 * K.u, 9 * K.u);
      K.ctx.fillStyle = C.acc; K.ctx.fillRect(6 * K.u, 82 * K.u, 0.8 * K.u, 9 * K.u);
      K.text('Tu nombre · tu tema', 9, 88.2, 3.6, { weight: 600, family: TEXT, stretch: 'normal' });
      K.playhead((t % this.dur) / this.dur);
    }
  },
  {
    id: 'leccion-dividida', name: 'Lección dividida', fmt: '16:9', trat: 'limpio', dur: 8.0, thumb: 3.0,
    line: 'Tu documento de notas a la izquierda, tú a la derecha.',
    draw(K, t) {
      const p = (t % this.dur) / this.dur;
      K.bg('#0f1012');
      K.doc(5, 6, K.W * 0.52, 88, p, 2 + Math.floor(p * 9));
      K.ctx.save(); K.rr(K.W * 0.57 + 1, 6, K.W * 0.43 - 6, 88, 1.2); K.ctx.clip();
      K.studio(0.5, 0.3); K.presenter(K.W * 0.785, K.H + 4, 16, t, { ph: 17 }); K.ctx.restore();
      K.playhead(p);
    }
  },
  {
    id: 'clips-llamada', name: 'Clips de llamada', fmt: '16:9', trat: 'palabra', dur: 7.6, thumb: 4.6,
    line: 'Entra una llamada completa y salen clips con gráficos a tu lado.',
    draw(K, t) {
      const s = seq(t, [3.0, 4.6]);
      K.bg('#0f1012');
      if (s.i === 0) {
        [0, 1].forEach((i) => { const x = 4 + i * (K.W / 2 - 2); K.ctx.save(); K.rr(x, 14, K.W / 2 - 6, 64, 1.4); K.ctx.clip(); K.studio(0.5, 0.35); K.presenter(x + (K.W / 2 - 6) / 2, 84, 11, t, { ph: 18 + i }); K.ctx.restore(); });
        K.text('LLAMADA COMPLETA · 58 MIN', 4, 9, 3.4, { weight: 600, family: TEXT, stretch: 'normal', color: C.soft });
        K.ctx.fillStyle = 'rgba(238,234,226,0.12)'; K.ctx.fillRect(4 * K.u, 86 * K.u, (K.W - 8) * K.u, 1 * K.u);
        [0.22, 0.5, 0.71].forEach((m) => { K.ctx.fillStyle = C.acc; K.ctx.fillRect((4 + (K.W - 8) * m) * K.u, 84.5 * K.u, 0.8 * K.u, 4 * K.u); });
      } else {
        K.ctx.save(); K.rr(4, 6, K.W * 0.55, 88, 1.4); K.ctx.clip(); K.studio(0.4, 0.3); K.presenter(4 + K.W * 0.275, K.H + 6, 18, t, { ph: 20 }); K.ctx.restore();
        K.text('CLIP 1 / 5', K.W * 0.62, 18, 3.8, { weight: 600, family: TEXT, stretch: 'normal', color: C.acc });
        K.bars(K.W * 0.62, 26, K.W * 0.33, 46, s.lp * 1.3, 4, 33);
        K.capKaraoke(['precio', 'antes', 'que', 'plan'], 4 + K.W * 0.275, 84, 4.6, s.lp);
      }
      K.playhead((t % this.dur) / this.dur);
    }
  },
  {
    id: 'podcast', name: 'Podcast a dos cámaras', fmt: '16:9', trat: 'apilado', dur: 7.2, thumb: 0.8,
    line: 'Dos cámaras, corte a quien habla, subtítulos grandes.',
    draw(K, t) {
      const s = seq(t, [1.8, 1.8, 1.2, 2.4]);
      const who = s.i % 2;
      if (s.i === 2) {
        K.studio(0.5, 0.3); K.presenter(K.W * 0.3, K.H + 6, 15, t, { ph: 21 }); K.presenter(K.W * 0.7, K.H + 6, 15, t, { ph: 22 });
      } else {
        K.studio(who ? 0.7 : 0.3, 0.3); K.presenter(K.W * (who ? 0.58 : 0.42), K.H + 8, 23, t, { ph: 21 + who });
      }
      const lines = [['¿Y si no', 'tengo tiempo?'], ['Entonces', 'no editas tú.'], ['…'], ['Dirige.', 'No edites.']];
      K.capStack(lines[s.i], 8, 64, 7, s.lp * 1.6, { hot: s.i === 3 ? 0 : -1, step: 0.25 });
      K.playhead((t % this.dur) / this.dur);
    }
  },
  {
    id: 'biblioteca-broll', name: 'Biblioteca de B-roll', fmt: '16:9', tool: true, trat: 'limpio', dur: 7.0, thumb: 5.2,
    line: 'Indexa tu material una vez y búscalo en lenguaje normal.',
    draw(K, t) {
      const p = (t % this.dur) / this.dur;
      K.bg('#0f1012');
      const q = 'atardecer en la ciudad';
      const n = Math.floor(clamp01(p * 2.2) * q.length);
      K.ctx.fillStyle = 'rgba(238,234,226,0.06)'; K.rr(6, 6, K.W - 12, 13, 1.4); K.ctx.fill();
      K.ctx.lineWidth = 0.3 * K.u; K.ctx.strokeStyle = 'rgba(238,234,226,0.2)'; K.ctx.stroke();
      K.text(q.slice(0, n) + (Math.floor(t * 2) % 2 ? '|' : ''), 10, 14.6, 4.6, { weight: 500, family: TEXT, stretch: 'normal' });
      const hits = [1, 4];
      for (let i = 0; i < 6; i++) {
        const cx = 6 + (i % 3) * ((K.W - 12) / 3), cy = 24 + Math.floor(i / 3) * 37;
        const hit = hits.includes(i) && p > 0.5;
        K.ctx.save(); K.ctx.globalAlpha = p > 0.5 && !hit ? 0.3 : 1;
        K.plate(cx + 1, cy, (K.W - 12) / 3 - 2, 34, t, i === 1 || i === 4 ? 3 : 80 + i, { nolabel: true, stroke: hit ? C.acc : null, lw: 0.6 * K.u });
        K.ctx.restore();
      }
      K.playhead(p);
    }
  },
  {
    id: 'video-a-texto', name: 'Video a texto', fmt: '16:9', tool: true, trat: 'limpio', dur: 7.0, thumb: 5.0,
    line: 'Entra un video y salen emails y posts escritos con tu voz.',
    draw(K, t) {
      const p = (t % this.dur) / this.dur;
      K.bg('#0f1012');
      K.ctx.save(); K.rr(6, 14, K.W * 0.36, 60, 1.4); K.ctx.clip(); K.studio(0.4, 0.3); K.presenter(6 + K.W * 0.18, 80, 11, t, { ph: 23 }); K.ctx.restore();
      K.ctx.strokeStyle = C.acc; K.ctx.lineWidth = 0.5 * K.u;
      K.ctx.beginPath(); K.ctx.moveTo((10 + K.W * 0.36) * K.u, 44 * K.u); K.ctx.lineTo((10 + K.W * 0.36 + 10 * ease(p * 3)) * K.u, 44 * K.u); K.ctx.stroke();
      ['EMAIL', 'POST'].forEach((lb, b) => {
        const x = K.W * 0.58 + b * 0, y = 10 + b * 44;
        K.ctx.fillStyle = '#e9e7e1'; K.rr(x, y, K.W * 0.38, 38, 1.2); K.ctx.fill();
        K.text(lb, x + 3, y + 7, 3.2, { weight: 700, family: TEXT, stretch: 'normal', color: C.acc });
        for (let l = 0; l < 5; l++) {
          const k = clamp01(p * 3 - 0.6 - b * 0.7 - l * 0.12);
          K.ctx.fillStyle = 'rgba(17,18,20,0.5)';
          K.ctx.fillRect((x + 3) * K.u, (y + 12 + l * 5) * K.u, (K.W * 0.38 - 6) * (0.6 + 0.35 * rnd(l + b * 5)) * k * K.u, 1.6 * K.u);
        }
      });
      K.playhead(p);
    }
  }
];

export const byId = Object.fromEntries(STYLES.map((s) => [s.id, s]));
export const SHORT = STYLES.filter((s) => s.fmt === '9:16' && !s.tool);
export const LONG = STYLES.filter((s) => s.fmt === '16:9' && !s.tool);
export const TOOLS = STYLES.filter((s) => s.tool);

// Draw one frame of a style into a canvas whose backing store is already sized.
export function drawFrame(canvas, style, t) {
  const ctx = canvas.getContext('2d');
  const K = new Kit(ctx, canvas.width, canvas.height);
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  style.draw.call(style, K, t);
  ctx.restore();
}

// Size a canvas to its CSS box at a capped DPR. Returns true if it changed.
export function fit(canvas, maxDpr = 2) {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; return true; }
  return false;
}

export { easeIO, ease, clamp01 };
