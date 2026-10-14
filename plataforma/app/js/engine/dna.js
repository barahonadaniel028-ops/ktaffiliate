/* Aura · ADN de estilo. Lee una referencia (video o imagen) en el navegador y la convierte en una receta que el motor del Estudio sabe dibujar.
   analyze(file) -> dna: paleta, cortes por minuto, movimiento, luz, contraste, color, calidez, energia del audio y cuadros de muestra.
   recipeFrom(dna) -> receta (letra, acento, ritmo, entrada, transicion, fondo). buildSpec(receta) -> especificacion del Estudio para la vista previa en vivo.
   Todo pasa en este navegador: el archivo no sale de aqui para ser leido. */
(function (root) {
  "use strict";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0), std = (a) => { const m = avg(a); return Math.sqrt(avg(a.map((x) => (x - m) * (x - m)))); };
  const hex = (r, g, b) => "#" + [r, g, b].map((x) => clamp(Math.round(x), 0, 255).toString(16).padStart(2, "0")).join("");
  const rgb = (h) => { let m = String(h || "#000").replace("#", ""); if (m.length === 3) m = m.split("").map((c) => c + c).join(""); const v = parseInt(m.slice(0, 6) || "0", 16) || 0; return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
  const luma = (h) => { const [r, g, b] = rgb(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const satOf = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx ? (mx - mn) / mx : 0; };
  const sat = (h) => satOf(...rgb(h));
  const mixHex = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)); };
  const AXES = [["ritmo", "Ritmo"], ["movimiento", "Movimiento"], ["contraste", "Contraste"], ["color", "Color"], ["luz", "Luz"], ["energia", "Energía"]];
  const TEXT_HEX = { white: "#F3F0E8", pure: "#FFFFFF", yellow: "#F4DC3C" };

  // ---------- lectura ----------
  const SW = 36, SH = 64, TW = 72, TH = 128;
  let cv = null, cx = null, tv = null, tx = null;
  const once = (el, ev, ms) => new Promise((res, rej) => { let t = 0; const f = () => { clearTimeout(t); el.removeEventListener(ev, f); el.removeEventListener("error", bad); res(); }; const bad = () => { clearTimeout(t); el.removeEventListener(ev, f); el.removeEventListener("error", bad); rej(new Error("no se pudo leer")); }; el.addEventListener(ev, f); el.addEventListener("error", bad); t = setTimeout(() => { el.removeEventListener(ev, f); el.removeEventListener("error", bad); rej(new Error("tardó demasiado")); }, ms || 8000); });
  function crop(w, h, W, H) { const ar = W / H, sr = w / h; let sx = 0, sy = 0, sw = w, sh = h; if (sr > ar) { sw = h * ar; sx = (w - sw) / 2; } else { sh = w / ar; sy = (h - sh) / 2; } return [sx, sy, sw, sh]; }
  function grab(el, w, h) {
    if (!cv) { cv = document.createElement("canvas"); cv.width = SW; cv.height = SH; cx = cv.getContext("2d", { willReadFrequently: true }); }
    cx.drawImage(el, ...crop(w, h, SW, SH), 0, 0, SW, SH); return cx.getImageData(0, 0, SW, SH).data;
  }
  function thumb(el, w, h) {
    if (!tv) { tv = document.createElement("canvas"); tv.width = TW; tv.height = TH; tx = tv.getContext("2d"); }
    try { tx.drawImage(el, ...crop(w, h, TW, TH), 0, 0, TW, TH); return tv.toDataURL("image/jpeg", 0.62); } catch (e) { return ""; }
  }
  const newAcc = () => ({ bins: new Float64Array(4096 * 5), frames: 0, lum: 0, con: 0, sat: 0, warm: 0, diffs: [], prevL: null, prevH: null, thumbs: [], audio: null });
  function sample(acc, el, w, h, t) {
    const d = grab(el, w, h), n = SW * SH, L = new Float32Array(n), hist = new Float32Array(16), B = acc.bins; let sl = 0, sl2 = 0, ss = 0, sr = 0, sb = 0;
    for (let i = 0, p = 0; i < n; i++, p += 4) {
      const r = d[p], g = d[p + 1], b = d[p + 2], y = 0.2126 * r + 0.7152 * g + 0.0722 * b, s = satOf(r, g, b);
      L[i] = y; sl += y; sl2 += y * y; ss += s; sr += r; sb += b; hist[Math.min(15, (y | 0) >> 4)]++;
      const k = (((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)) * 5; B[k]++; B[k + 1] += r; B[k + 2] += g; B[k + 3] += b; B[k + 4] += s;
    }
    const mean = sl / n, sd = Math.sqrt(Math.max(0, sl2 / n - mean * mean));
    if (acc.prevL) { let pd = 0, hd = 0; for (let i = 0; i < n; i++) pd += Math.abs(L[i] - acc.prevL[i]); for (let j = 0; j < 16; j++) hd += Math.abs(hist[j] - acc.prevH[j]); acc.diffs.push({ t, pd: pd / (n * 255), hd: hd / (2 * n) }); }
    acc.prevL = L; acc.prevH = hist; acc.frames++; acc.lum += mean; acc.con += sd; acc.sat += ss / n; acc.warm += (sr - sb) / n;
  }
  function paletteOf(B, k) {
    const cells = []; for (let i = 0; i < 4096; i++) { const c = B[i * 5]; if (c) cells.push({ n: c, r: B[i * 5 + 1] / c, g: B[i * 5 + 2] / c, b: B[i * 5 + 3] / c, s: B[i * 5 + 4] / c }); }
    const total = cells.reduce((a, x) => a + x.n, 0) || 1, out = [];
    cells.sort((a, b) => b.n * (0.5 + b.s) - a.n * (0.5 + a.s));
    for (const c of cells) { if (out.length >= (k || 6)) break; if (out.every((o) => Math.hypot(o.r - c.r, o.g - c.g, o.b - c.b) > 58)) out.push(c); }
    const w = out.map(() => 0); cells.forEach((c) => { let bi = 0, bd = Infinity; out.forEach((o, i) => { const dd = (o.r - c.r) ** 2 + (o.g - c.g) ** 2 + (o.b - c.b) ** 2; if (dd < bd) { bd = dd; bi = i; } }); w[bi] += c.n; });
    return out.map((o, i) => ({ hex: hex(o.r, o.g, o.b), w: +(w[i] / total).toFixed(3) })).sort((a, b) => b.w - a.w);
  }
  async function audioOf(file) {
    const AC = root.OfflineAudioContext || root.webkitOfflineAudioContext; if (!AC || !file || file.size > 40e6) return null;
    const buf = await file.arrayBuffer(), ctx = new AC(1, 22050, 22050);
    const ab = await Promise.race([ctx.decodeAudioData(buf), new Promise((_, rej) => setTimeout(() => rej(new Error("tiempo")), 7000))]);
    const ch = ab.getChannelData(0), win = Math.max(1, Math.floor(ab.sampleRate * 0.05)), rms = [];
    for (let i = 0; i + win <= ch.length; i += win) { let s = 0; for (let j = i; j < i + win; j += 2) s += ch[j] * ch[j]; rms.push(Math.sqrt(s / (win / 2))); }
    if (!rms.length) return null; const m = avg(rms); if (m < 0.004) return { energy: 0, pulse: 0, silent: true };
    let on = 0; for (let i = 4; i < rms.length; i++) { const prev = (rms[i - 1] + rms[i - 2] + rms[i - 3] + rms[i - 4]) / 4; if (rms[i] > prev * 1.6 && rms[i] > m * 0.8) { on++; i += 3; } }
    return { energy: +clamp(m / 0.16, 0, 1).toFixed(2), pulse: Math.round((on / (rms.length * 0.05)) * 60), silent: false };
  }
  function finish(acc, meta) {
    const F = Math.max(1, acc.frames), lum = acc.lum / F, con = acc.con / F, sa = acc.sat / F, warm = acc.warm / F, ds = acc.diffs, cuts = [];
    if (ds.length > 2) { const pds = ds.map((x) => x.pd), m = avg(pds), s = std(pds); ds.forEach((x) => { if (x.hd > 0.32 || x.pd > Math.max(0.15, m + 2 * s)) cuts.push(+x.t.toFixed(2)); }); }
    const cpm = meta.duration ? (cuts.length / meta.duration) * 60 : 0, still = ds.filter((x) => !cuts.includes(+x.t.toFixed(2))).map((x) => x.pd), motion = avg(still);
    const ritmo = clamp(cpm / 50, 0, 1), movimiento = clamp(motion / 0.09, 0, 1);
    const axes = { ritmo, movimiento, contraste: clamp(con / 75, 0, 1), color: clamp(sa / 0.55, 0, 1), luz: clamp(lum / 210, 0, 1), energia: acc.audio && !acc.audio.silent ? clamp(0.6 * acc.audio.energy + 0.4 * ritmo, 0, 1) : clamp(0.55 * ritmo + 0.45 * movimiento + (meta.kind === "image" ? 0.35 * clamp(sa / 0.55, 0, 1) : 0), 0, 1) };
    Object.keys(axes).forEach((k) => { axes[k] = +axes[k].toFixed(2); });
    return { v: 1, kind: meta.kind, duration: +(meta.duration || 0).toFixed(2), cuts, cpm: Math.round(cpm), motion: +motion.toFixed(3), lum: Math.round(lum), contrast: Math.round(con), sat: +sa.toFixed(3), warmth: Math.round(warm), palette: paletteOf(acc.bins, 6), axes, audio: acc.audio, thumbs: acc.thumbs, at: new Date().toISOString() };
  }
  // analiza un archivo (o una URL del mismo origen). o.onProgress(p, parcial) para dibujar la lectura en vivo; o.cancel() para cortar.
  async function analyze(src, o) {
    o = o || {}; const isFile = typeof Blob !== "undefined" && src instanceof Blob, isImg = o.kind === "image" || (isFile && /^image\//.test(src.type)) || /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(String(src));
    const url = isFile ? URL.createObjectURL(src) : String(src), acc = newAcc(), prog = (p) => { if (o.onProgress) try { o.onProgress(p, acc); } catch (e) { /* solo dibujo */ } };
    try {
      if (isImg) { const img = new Image(); img.src = url; await (img.decode ? img.decode() : once(img, "load")); sample(acc, img, img.naturalWidth, img.naturalHeight, 0); acc.thumbs.push(thumb(img, img.naturalWidth, img.naturalHeight)); prog(1); return finish(acc, { kind: "image", duration: 0 }); }
      const v = document.createElement("video"); v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
      await once(v, "loadeddata", 12000);
      let dur = v.duration; if (!isFinite(dur) || dur <= 0) dur = 10;
      const N = clamp(Math.round(dur * 3), 10, 72), step = dur / N, TH_AT = new Set([0.08, 0.3, 0.5, 0.7, 0.92].map((f) => Math.min(N - 1, Math.round(f * (N - 1)))));
      const audio = isFile ? audioOf(src).catch(() => null) : Promise.resolve(null);
      for (let i = 0; i < N; i++) {
        if (o.cancel && o.cancel()) break;
        v.currentTime = Math.min(dur - 0.04, (i + 0.5) * step);
        try { await once(v, "seeked", 3000); } catch (e) { continue; }
        sample(acc, v, v.videoWidth || 1080, v.videoHeight || 1920, (i + 0.5) * step); if (TH_AT.has(i)) acc.thumbs.push(thumb(v, v.videoWidth || 1080, v.videoHeight || 1920));
        prog((i + 1) / N);
      }
      acc.audio = await audio; v.removeAttribute("src"); v.load();
      return finish(acc, { kind: "video", duration: dur });
    } finally { if (isFile && !o.keepUrl) setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }
  // paleta parcial mientras se lee (para que los colores vayan apareciendo)
  const partialPalette = (acc) => paletteOf(acc.bins, 6);

  // ---------- palabras ----------
  function moodOf(d) {
    const a = d.axes || {}, e = a.energia || 0, w = d.warmth || 0;
    if (e > 0.62 && a.luz < 0.45) return "Intenso y nocturno"; if (e > 0.62) return "Vibrante y pop"; if (a.luz > 0.62 && a.color < 0.35) return "Limpio y editorial";
    if (w > 12 && e < 0.42) return "Cálido y calmo"; if (a.contraste > 0.62) return "Dramático"; if (a.luz < 0.3) return "Oscuro y elegante"; return "Equilibrado";
  }
  function describe(d) {
    const a = d.axes || {}, tags = [];
    if (d.kind === "video") tags.push(d.cpm >= 30 ? "corte rápido" : d.cpm >= 12 ? "ritmo medio" : "planos largos");
    tags.push(a.luz > 0.62 ? "luminoso" : a.luz < 0.32 ? "oscuro" : "luz media");
    tags.push(a.contraste > 0.6 ? "contraste fuerte" : a.contraste < 0.3 ? "contraste suave" : "contraste justo");
    tags.push(a.color > 0.6 ? "colores intensos" : a.color < 0.25 ? "casi sin color" : "color medido");
    if (d.kind === "video") tags.push(a.movimiento > 0.6 ? "mucho movimiento" : a.movimiento < 0.25 ? "cámara quieta" : "movimiento suave");
    const temp = (d.warmth || 0) > 12 ? "Cálido" : (d.warmth || 0) < -12 ? "Frío" : "Neutro";
    return { tags, temp, mood: moodOf(d) };
  }

  // ---------- recetas ----------
  const SAMPLE = ["Lo que", "te gusta", "ahora es", "tu estilo"];
  const hasAston = () => { try { return [...document.fonts].some((f) => f.family.replace(/["']/g, "") === "AstonScript"); } catch (e) { return false; } };
  function recipeFrom(dna, name) {
    const ax = dna.axes || {}, pal = (dna.palette || []).map((p) => p.hex);
    // el acento tiene que leerse sobre fondo oscuro: color con saturacion y luz suficientes
    const score = (h) => sat(h) * Math.pow(luma(h) / 255, 0.8), vivid = pal.filter((h) => sat(h) > 0.22 && luma(h) > 105 && luma(h) < 240).sort((a, b) => score(b) - score(a));
    const accent = vivid[0] || (ax.luz > 0.6 ? "#6FD1C0" : "#F4DC3C"), darkest = pal.slice().sort((a, b) => luma(a) - luma(b))[0] || "#0b1114";
    const deep = mixHex(darkest, "#000000", luma(darkest) > 40 ? 0.62 : 0.25);
    const energy = clamp(0.42 * (ax.ritmo || 0) + 0.25 * (ax.movimiento || 0) + 0.33 * (ax.energia || 0), 0, 1);
    const font = ax.luz > 0.62 && ax.color < 0.38 ? "Inter" : energy < 0.33 && (dna.warmth || 0) > 8 ? "Caveat" : "Anton";
    const anim = energy > 0.64 ? "pop" : energy > 0.4 ? "slide" : font === "Caveat" ? "type" : "fade";
    const trans = energy > 0.74 ? "flash" : energy > 0.56 ? "zoom" : energy > 0.4 ? "wipe" : ax.luz > 0.6 ? "slide" : "blur";
    const bg = energy > 0.72 ? { type: "anim", name: (dna.warmth || 0) < 0 ? "rayos" : "ondas" } : ax.luz < 0.3 && ax.color > 0.4 ? { type: "black-glow" } : { type: "gradient", from: mixHex(pal[0] && pal[0] !== accent ? pal[0] : accent, "#000000", luma(pal[0] || accent) > 120 ? 0.68 : 0.45), to: deep };
    const size = font === "Inter" ? 92 : font === "Caveat" ? 132 : Math.round(lerp(132, 172, energy));
    return { v: 1, name: name || moodOf(dna), font, size, accent, text: font === "Inter" ? "pure" : "white", keyAccent: energy > 0.35 || luma(accent) > 140, glow: ax.luz < 0.42 && ax.color > 0.35 ? "neon" : "soft", anim, beat: +lerp(2.3, 0.78, energy).toFixed(2), trans, bg, hero: font === "Anton" && energy > 0.45, subs: true, card: font === "Inter", palette: pal.slice(0, 6), energy: +energy.toFixed(2) };
  }
  const SEEDS = [
    { id: "impacto", name: "Impacto", desc: "Cortes secos, mayúsculas enormes y un destello en cada idea.", axes: { ritmo: 0.92, movimiento: 0.7, contraste: 0.9, color: 0.55, luz: 0.3, energia: 0.95 },
      recipe: { font: "Anton", size: 168, accent: "#F4DC3C", text: "white", keyAccent: true, glow: "neon", anim: "pop", beat: 0.8, trans: "flash", bg: { type: "black-glow" }, hero: false, subs: true, card: false, palette: ["#F4DC3C", "#121212", "#F3F0E8"], energy: 0.95 } },
    { id: "editorial", name: "Editorial", desc: "Letra limpia, mucho aire y barridos suaves. Se lee como una revista.", axes: { ritmo: 0.35, movimiento: 0.3, contraste: 0.45, color: 0.2, luz: 0.8, energia: 0.35 },
      recipe: { font: "Inter", size: 96, accent: "#E9DFC9", text: "pure", keyAccent: false, glow: "soft", anim: "slide", beat: 1.7, trans: "wipe", bg: { type: "gradient", from: "#34312c", to: "#0e0d0c" }, hero: false, subs: true, card: true, palette: ["#E9DFC9", "#34312c", "#8a8172"], energy: 0.35 } },
    { id: "neon", name: "Neón nocturno", desc: "Violeta y celeste que brillan sobre negro, con zoom en cada cambio.", axes: { ritmo: 0.7, movimiento: 0.65, contraste: 0.85, color: 0.9, luz: 0.25, energia: 0.8 },
      recipe: { font: "Anton", size: 156, accent: "#B58CFF", text: "white", keyAccent: true, glow: "neon", anim: "pop", beat: 1, trans: "zoom", bg: { type: "anim", name: "rayos" }, hero: true, subs: true, card: false, palette: ["#B58CFF", "#66DCFF", "#0A0620"], energy: 0.82 } },
    { id: "calma", name: "Calma cálida", desc: "Letra a mano, luz de tarde y fundidos lentos.", axes: { ritmo: 0.15, movimiento: 0.2, contraste: 0.3, color: 0.5, luz: 0.55, energia: 0.2 },
      recipe: { font: "Caveat", size: 132, accent: "#FFB385", text: "white", keyAccent: true, glow: "soft", anim: "type", beat: 2.2, trans: "blur", bg: { type: "gradient", from: "#5a2c17", to: "#140905" }, hero: false, subs: true, card: false, palette: ["#FFB385", "#5A2C17", "#F3E3CF"], energy: 0.2 } },
    { id: "datos", name: "Datos limpios", desc: "Una idea por tarjeta y el dato resaltado.", axes: { ritmo: 0.45, movimiento: 0.35, contraste: 0.6, color: 0.4, luz: 0.5, energia: 0.45 },
      recipe: { font: "Inter", size: 92, accent: "#6FD1C0", text: "pure", keyAccent: true, glow: "soft", anim: "slide", beat: 1.5, trans: "slide", bg: { type: "gradient", from: "#0f3a45", to: "#040d12" }, hero: false, subs: true, card: true, palette: ["#6FD1C0", "#0F3A45", "#F3F0E8"], energy: 0.45 } },
    { id: "karaoke", name: "Karaoke pop", desc: "Palabras que se encienden al ritmo, con ondas de color detrás.", axes: { ritmo: 0.75, movimiento: 0.6, contraste: 0.7, color: 0.85, luz: 0.45, energia: 0.85 },
      recipe: { font: "Anton", size: 150, accent: "#FF9A76", text: "white", keyAccent: true, glow: "soft", anim: "pop", beat: 0.95, trans: "zoom", bg: { type: "anim", name: "ondas" }, hero: true, subs: true, card: false, palette: ["#FF9A76", "#5EEAD4", "#A78BFA"], energy: 0.85 } },
  ];
  SEEDS.forEach((s) => { s.recipe = Object.assign({ v: 1, name: s.name }, s.recipe); });
  const mixBg = (a, b, t) => (a.type === "gradient" && b.type === "gradient" ? { type: "gradient", from: mixHex(a.from, b.from, t), to: mixHex(a.to, b.to, t) } : t < 0.5 ? a : b);
  function mix(a, b, t) {
    const p = (k) => (t < 0.5 ? a[k] : b[k]), pal = []; for (let i = 0; i < 6; i++) { const x = (t < 0.5 ? a : b).palette || [], y = (t < 0.5 ? b : a).palette || []; if (x[i]) pal.push(x[i]); if (y[i] && pal.length < 6) pal.push(y[i]); }
    return { v: 1, name: `${a.name} × ${b.name}`, font: p("font"), size: Math.round(lerp(a.size, b.size, t)), accent: mixHex(a.accent, b.accent, t), text: p("text"), keyAccent: p("keyAccent"), glow: p("glow"), anim: p("anim"), beat: +lerp(a.beat, b.beat, t).toFixed(2), trans: p("trans"), bg: mixBg(a.bg || {}, b.bg || {}, t), hero: p("hero"), subs: a.subs || b.subs, card: p("card"), palette: [...new Set(pal)].slice(0, 6), energy: +lerp(a.energy || 0.5, b.energy || 0.5, t).toFixed(2) };
  }
  // ejes aproximados de una receta (para el radar de una semilla tocada o una mezcla)
  const axesOf = (R) => { const e = R.energy != null ? R.energy : 0.5, l = luma(R.accent || "#888") / 255; return { ritmo: +clamp(1 - (R.beat - 0.7) / 1.8, 0, 1).toFixed(2), movimiento: +clamp(e * 0.9, 0, 1).toFixed(2), contraste: +clamp(R.glow === "neon" ? 0.85 : 0.5 + e * 0.2, 0, 1).toFixed(2), color: +clamp(sat(R.accent || "#888") * 1.1, 0, 1).toFixed(2), luz: +clamp(R.font === "Inter" ? 0.7 : l * 0.6, 0, 1).toFixed(2), energia: +e.toFixed(2) }; };

  // ---------- receta -> especificacion del Estudio ----------
  function bgVariant(R, i) {
    const pal = (R.palette || []).filter(Boolean), b = R.bg || { type: "gradient" };
    if (b.type === "anim") return i % 2 ? { type: "gradient", props: { from: mixHex(R.accent, "#000000", 0.7), to: "#030506", radial: true } } : { type: "anim", props: { name: b.name || "ondas" } };
    if (b.type === "black-glow") return i % 2 ? { type: "gradient", props: { from: mixHex(R.accent, "#000000", 0.74), to: "#030506", radial: true } } : { type: "black-glow", props: { accent: R.accent } };
    if (b.type === "solid") return { type: "solid", props: { color: i % 2 && pal[1] ? mixHex(pal[1], "#000000", 0.55) : b.color || "#101820" } };
    const from = b.from || mixHex(R.accent, "#000000", 0.7), to = b.to || "#05080a", alt = pal[(i + 1) % Math.max(1, pal.length)] || R.accent;
    return { type: "gradient", props: i % 2 ? { from: mixHex(alt, to, 0.62), to, radial: true } : { from, to, radial: true } };
  }
  function buildSpec(R, o) {
    o = o || {}; const M = root.StudioModel; if (!M || !R) return null;
    const dur = o.duration || 6.4, words = o.words || SAMPLE, heroFont = hasAston() ? "Aston" : "Caveat";
    let s = M.newSpec({ duration: dur, lang: "es", base: { asset: "", cutout: "", audio: false, focus: { x: 540, y: 900 }, face: { top: 120, chin: 520 } } });
    s.theme = { accent: R.accent, paper: "#F3F0E8" };
    const add = (tr, c) => { s = M.addClip(s, tr, c).spec; };
    const segs = clamp(Math.round(dur / Math.max(1.5, R.beat * 2)), 2, 4), seg = dur / segs;
    for (let i = 0; i < segs; i++) {
      const t = +(i * seg).toFixed(2), d = +Math.min(dur - t, seg + (i < segs - 1 ? 0.7 : 0)).toFixed(2);
      add("bg", Object.assign(bgVariant(R, i), { t, d, cutout: false, push: true, in: { type: i ? R.trans : "cut", d: i ? (R.trans === "flash" ? 0.2 : 0.6) : 0 }, out: { type: "cut", d: 0 } }));
    }
    const n = clamp(Math.floor((dur - 0.3) / R.beat), 2, 7);
    for (let i = 0; i < n; i++) {
      const key = R.keyAccent && i % 2 === 1, hero = R.hero && i % 3 === 1, font = hero ? heroFont : R.font, size = hero ? Math.round(R.size * 1.3) : R.size;
      add("text", { t: +(0.3 + i * R.beat).toFixed(2), d: +(R.beat * 0.9).toFixed(2), text: words[i % words.length], style: { font, size, color: key ? R.accent : R.text || "white", x: 540, y: 880, glow: R.glow, maxW: 880 }, anim: { in: R.anim, out: "fade" } });
    }
    if (R.card) add("media", { t: +(dur * 0.5).toFixed(2), d: +(dur * 0.45).toFixed(2), type: "card", front: true, box: { x: 91, y: 1080, w: 898, rot: -1.2 }, card: { variant: "quote", kicker: "Dato", size: 64, lines: [{ text: "Una idea", at: 0.3 }, { text: "por tarjeta", at: 0.9, hl: true }] } });
    if (R.subs) s = M.setSubs(s, { lines: [[0.2, dur * 0.34, "así se siente"], [dur * 0.34, dur * 0.68, "tu estilo nuevo"], [dur * 0.68, dur, "listo para usar"]], style: { font: "Inter", size: 58, y: 1470, key: ["estilo", "siente"], hero: [] } });
    return s;
  }

  // ---------- radar ----------
  let rid = 0;
  function radar(ax, o) {
    o = o || {}; const S = o.size || 240, c = S / 2, R = S / 2 - (o.pad != null ? o.pad : 36), n = AXES.length, id = "dna" + ++rid;
    const pt = (i, v) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [c + Math.cos(a) * R * v, c + Math.sin(a) * R * v]; };
    const poly = (vals) => vals.map((v, i) => pt(i, Math.max(0.07, v)).map((x) => x.toFixed(1)).join(",")).join(" ");
    const vals = AXES.map(([k]) => (ax && ax[k]) || 0);
    const rings = o.grid === false ? "" : [0.34, 0.67, 1].map((r) => `<polygon class="rg" points="${poly(AXES.map(() => r))}"/>`).join("") + AXES.map((_, i) => { const [x, y] = pt(i, 1); return `<line class="sp" x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join("");
    const labels = o.labels === false ? "" : AXES.map(([, name], i) => { const [x, y] = pt(i, 1.22); return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle">${name}</text>`; }).join("");
    const cmp = o.compare ? `<polygon class="cmp" points="${poly(AXES.map(([k]) => o.compare[k] || 0))}"/>` : "";
    const dots = o.dots === false ? "" : vals.map((v, i) => { const [x, y] = pt(i, Math.max(0.07, v)); return `<circle class="dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${o.r || 3.4}" style="--i:${i}"/>`; }).join("");
    return `<svg class="radar" viewBox="0 0 ${S} ${S}" role="img" aria-label="ADN: ${AXES.map(([k, name]) => `${name} ${Math.round(((ax && ax[k]) || 0) * 100)}`).join(", ")}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--rd-a,#6fd1c0)"/><stop offset="1" style="stop-color:var(--rd-b,#ffad85)"/></linearGradient></defs>${rings}${cmp}<polygon class="shape" fill="url(#${id})" points="${poly(vals)}"/><polygon class="ln edge" pathLength="1" points="${poly(vals)}"/>${dots}${labels}</svg>`;
  }

  root.AuraDNA = { analyze, partialPalette, describe, moodOf, recipeFrom, mix, axesOf, buildSpec, radar, SEEDS, AXES, SAMPLE, TEXT_HEX, util: { rgb, hex, luma, sat, mixHex, clamp } };
})(typeof globalThis !== "undefined" ? globalThis : this);
