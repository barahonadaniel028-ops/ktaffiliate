/* Aura · motor del Estudio. COPIA LITERAL del Portal de Aprobación (lineas 1490-2039 del artefacto vivo): modelo, reglas, catalogo y renderizador.
   No se edita aqui: lo que se ve en la vista previa es exactamente lo que se exporta. Requiere GSAP. */
/* Estudio: modelo puro de la especificacion de video (sin DOM, sin base de datos).
   Toda edicion devuelve una copia nueva (inmutable). Se usa en el Portal, en el render de HyperFrames y en las pruebas de Node. */
(function (root) {
  "use strict";
  const W = 1080, H = 1920, FPS = 30;
  const SAFE = [[91, 237], [990, 237], [990, 997], [899, 997], [899, 1650], [366, 1650], [366, 1479], [91, 1479]];
  const FONTS = {
    Anton: { css: '"Anton", Impact, sans-serif', cap: 0.859, adv: 0.43, weight: 400, upper: true, label: "Anton (grueso)" },
    Aston: { css: '"AstonScript", cursive', cap: 0.5, adv: 0.36, weight: 400, upper: false, label: "Aston Script (cursiva)" },
    Inter: { css: '"Inter", system-ui, sans-serif', cap: 0.727, adv: 0.58, weight: 700, upper: false, label: "Inter" },
    Caveat: { css: '"Caveat", cursive', cap: 0.6, adv: 0.42, weight: 700, upper: false, label: "Caveat (mano)" },
  };
  const COLORS = { white: "#F3F0E8", yellow: "#F4DC3C", pure: "#FFFFFF", accent: "#B6FF3B", ink: "#0A0A0A" };
  const q = (t) => Math.round(t * FPS) / FPS;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let uidN = 0;
  const uid = (p) => (p || "c") + "_" + (Date.now().toString(36) + (uidN++).toString(36)).slice(-7);
  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
  function merge(a, b) { // mezcla b sobre a sin tocar ninguno (un nivel por objeto anidado)
    const out = Array.isArray(a) ? a.slice() : { ...a };
    Object.keys(b).forEach((k) => { out[k] = isObj(b[k]) && isObj(a && a[k]) ? merge(a[k], b[k]) : b[k]; });
    return out;
  }

  // ---------- especificacion ----------
  function newSpec(o) {
    o = o || {};
    return { v: 1, fps: FPS, w: W, h: H, duration: o.duration || 10, lang: o.lang || "es",
      base: Object.assign({ asset: "", cutout: "", audio: true, focus: { x: 540, y: 1250 }, face: { top: 190, chin: 760 } }, o.base || {}),
      tracks: [
        { id: "bg", kind: "background", clips: [] },
        { id: "media", kind: "media", clips: [] },
        { id: "text", kind: "text", clips: [] },
        { id: "subs", kind: "subtitles", style: { font: "Inter", size: 64, maxW: 808, y: 880, hero: [], key: [] }, lines: [] },
        { id: "sfx", kind: "sfx", clips: [] },
      ] };
  }
  const track = (spec, id) => spec.tracks.find((t) => t.id === id) || null;
  const trackOfKind = (spec, kind) => spec.tracks.find((t) => t.kind === kind) || null;
  function allClips(spec) { const out = []; spec.tracks.forEach((tr) => (tr.clips || []).forEach((c, i) => out.push({ track: tr, clip: c, index: i }))); return out; }
  const findClip = (spec, id) => allClips(spec).find((x) => x.clip.id === id) || null;
  const clipEnd = (c) => (c.d != null ? c.t + c.d : c.t);
  const activeAt = (spec, t) => allClips(spec).filter((x) => x.clip.t <= t && t < clipEnd(x.clip) + 1e-6);

  function mapClips(spec, fn) { // devuelve una copia con las pistas transformadas
    const out = clone(spec); out.tracks.forEach((tr) => { if (tr.clips) tr.clips = fn(tr.clips, tr); }); return out;
  }
  function addClip(spec, trackId, clip) {
    const out = clone(spec), tr = track(out, trackId); if (!tr || !tr.clips) throw new Error("pista invalida: " + trackId);
    const c = Object.assign({ id: uid(trackId.slice(0, 2)) }, clone(clip)); tr.clips.push(c); tr.clips.sort((a, b) => a.t - b.t); return { spec: out, id: c.id };
  }
  function updateClip(spec, id, patch) {
    if (!findClip(spec, id)) return spec;
    return mapClips(spec, (clips) => clips.map((c) => (c.id === id ? merge(c, patch) : c)));
  }
  function removeClip(spec, id) { return findClip(spec, id) ? mapClips(spec, (clips) => clips.filter((c) => c.id !== id)) : spec; }
  function moveClip(spec, id, t) { return updateClip(spec, id, { t: Math.max(0, Math.min(spec.duration - 0.1, q(t))) }); }
  function resizeClip(spec, id, r) {
    const f = findClip(spec, id); if (!f) return spec;
    const t = r.t != null ? Math.max(0, q(r.t)) : f.clip.t, end = r.end != null ? q(r.end) : clipEnd(f.clip);
    return updateClip(spec, id, { t, d: Math.max(0.2, q(end - t)) });
  }
  function splitClip(spec, id, at) {
    const f = findClip(spec, id); if (!f || f.clip.d == null || at <= f.clip.t + 0.2 || at >= clipEnd(f.clip) - 0.2) return spec;
    const a = clone(f.clip), b = clone(f.clip); a.d = q(at - a.t); b.t = q(at); b.d = q(clipEnd(f.clip) - at); b.id = uid(f.track.id.slice(0, 2));
    if (a.out) b.out = a.out, a.out = a.kind === "bg" ? { type: "cut", d: 0 } : "cut"; if (b.in) b.in = f.track.kind === "background" ? { type: "cut", d: 0 } : "cut";
    const out = clone(spec); const tr = track(out, f.track.id); tr.clips = tr.clips.flatMap((c) => (c.id === id ? [a, b] : [c])); return out;
  }
  function duplicateClip(spec, id, dt) {
    const f = findClip(spec, id); if (!f) return { spec, id: null };
    const c = clone(f.clip); delete c.id; c.t = q(Math.min(spec.duration - 0.2, f.clip.t + (dt == null ? (f.clip.d || 1) : dt))); return addClip(spec, f.track.id, c);
  }
  const setSubs = (spec, patch) => { const out = clone(spec), tr = trackOfKind(out, "subtitles"); if (patch.style) tr.style = merge(tr.style, patch.style); if (patch.lines) tr.lines = clone(patch.lines); return out; };
  const setDuration = (spec, d) => Object.assign(clone(spec), { duration: q(d) });

  // ---------- subtitulos KT: UNA linea, hasta 3 palabras, por ancho medido ----------
  const norm = (w) => String(w).toLowerCase().replace(/[.,;:!?¿¡"()]/g, "");
  function estimateMeasure(size) { return (w, hero) => w.length * size * (hero ? 0.4 : 0.58) * (hero ? 1.08 : 1); }
  function chunkSubs(lines, style, measure) {
    const st = Object.assign({ size: 64, maxW: 808, maxWords: 3, hero: [], key: [] }, style || {});
    const hero = new Set(st.hero.map(norm)), key = new Set(st.key.map(norm)), gap = Math.round(st.size * 0.26);
    const m = measure || estimateMeasure(st.size), out = [];
    lines.forEach(([s, e, text]) => {
      const words = String(text).split(/\s+/).filter(Boolean), len = words.map((w) => w.length + 1), tot = len.reduce((a, b) => a + b, 0) || 1;
      let acc = 0; const wt = words.map((w, i) => { const t = s + (e - s) * acc / tot; acc += len[i]; return t; });
      let cur = [], curW = 0; const groups = [];
      words.forEach((w, i) => {
        const ww = m(w, hero.has(norm(w))), add = cur.length ? gap + ww : ww;
        if (cur.length && (cur.length >= st.maxWords || curW + add > st.maxW * 0.97)) { groups.push(cur); cur = []; curW = 0; }
        curW += cur.length ? gap + ww : ww; cur.push(i);
      });
      if (cur.length) groups.push(cur);
      groups.forEach((idx, c) => out.push({ s: Math.max(s, wt[idx[0]]), e: c < groups.length - 1 ? wt[groups[c + 1][0]] : e, words: idx.map((i) => ({ w: words[i], hero: hero.has(norm(words[i])), key: key.has(norm(words[i])) })) }));
    });
    return out;
  }

  // ---------- cajas estimadas (para reglas y para arrastrar) ----------
  function textBox(c) {
    const st = c.style || {}, f = FONTS[st.font] || FONTS.Anton, size = st.size || 100, txt = f.upper && st.upper !== false ? String(c.text || "").toUpperCase() : String(c.text || "");
    const w = Math.min(st.maxW || 9999, txt.length * size * f.adv), h = size * (st.lh || 1);
    const x = st.x != null ? st.x : 540, y = st.y != null ? st.y : 900, al = st.align || "center";
    return { x: al === "left" ? x : al === "right" ? x - w : x - w / 2, y: y - h / 2, w, h };
  }
  function mediaBox(c) { // caja estimada de una imagen o tarjeta (las tarjetas crecen con su texto)
  const b = c.box || {};
  if (c.type === "card") {
    const k = c.card || {}, w = b.w || 899;
    if (k.variant === "columns") return { x: b.x != null ? b.x : 91, y: b.y != null ? b.y : 262, w, h: 500 };
    return { x: b.x != null ? b.x : 91, y: b.y != null ? b.y : 262, w, h: Math.round(138 + (k.lines || []).length * (k.size || 86) * 1.04) };
  }
  return { x: b.x || 0, y: b.y || 0, w: b.w || 300, h: b.h || 300 };
}
  function inPoly(pt, poly) { let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) ins = !ins; } return ins; }
  const boxInSafe = (b) => [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]].every((p) => inPoly([Math.min(Math.max(p[0], 0.5), W - 0.5), p[1]], SAFE) && p[0] >= 91 - 0.5 && p[0] <= 990 + 0.5);
  const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  // ---------- historial (deshacer / rehacer) ----------
  function createHistory(max) {
    const limit = max || 100; let past = [], future = [];
    return {
      push(spec) { past.push(spec); if (past.length > limit) past.shift(); future = []; },
      undo(cur) { if (!past.length) return null; future.push(cur); return past.pop(); },
      redo(cur) { if (!future.length) return null; past.push(cur); return future.pop(); },
      canUndo: () => past.length > 0, canRedo: () => future.length > 0, depth: () => past.length, clear() { past = []; future = []; },
    };
  }

  const api = { W, H, FPS, SAFE, FONTS, COLORS, q, clone, merge, uid, newSpec, track, trackOfKind, allClips, findClip, clipEnd, activeAt,
    addClip, updateClip, removeClip, moveClip, resizeClip, splitClip, duplicateClip, setSubs, setDuration, chunkSubs, estimateMeasure, norm,
    textBox, mediaBox, boxInSafe, inPoly, overlap, createHistory };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.StudioModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

/* Estudio: control de calidad. Aplica las reglas de Daniel (styles-pack/REGLAS_DE_DISENO.md) sobre una especificacion.
   check(spec, ctx) -> { ok, errors, warns, findings:[{id, level, clipId, msg, fix}] }. applyFix(spec, finding) -> spec nuevo. Puro, sin DOM. */
(function (root) {
  "use strict";
  const M = root.StudioModel || (typeof require !== "undefined" ? require("./studio-model.js") : null);
  const ES_WORDS = new Set(["el", "la", "los", "las", "de", "que", "y", "en", "un", "una", "es", "con", "por", "para", "se", "su", "lo", "al", "del", "como", "mas", "más", "si", "te", "tu", "tú"]);
  const EN_WORDS = new Set(["the", "and", "you", "of", "to", "is", "in", "that", "it", "for", "with", "this", "are", "what", "your", "if", "so", "not"]);
  const MIN_SUB = 56, MIN_TEXT = 64, EDGE = { l: 91, r: 990, rLow: 899, lLow: 366, t: 237, b: 1479, bLow: 1650 };
  const fnd = (id, level, msg, clipId, fix) => ({ id, level, msg, clipId: clipId || null, fix: fix || null });
  const words = (s) => String(s || "").toLowerCase().replace(/[^a-záéíóúñü\s]/g, " ").split(/\s+/).filter(Boolean);
  const langOf = (txt) => { const w = words(txt); let es = 0, en = 0; w.forEach((x) => { if (ES_WORDS.has(x)) es++; if (EN_WORDS.has(x)) en++; }); return es === en ? "" : es > en ? "es" : "en"; };

  function clampBox(b) { // cuanto hay que mover una caja para entrar en la zona segura (el poligono de Instagram, con su franja baja angosta)
    const low = b.y + b.h > EDGE.b, left = low ? EDGE.lLow : EDGE.l, right = low || b.y + b.h > 997 ? EDGE.rLow : EDGE.r, bottom = low ? EDGE.bLow : EDGE.b; let dx = 0, dy = 0;
    if (b.x < left) dx = left - b.x; else if (b.x + b.w > right) dx = right - (b.x + b.w);
    if (b.y < EDGE.t) dy = EDGE.t - b.y; else if (b.y + b.h > bottom) dy = bottom - (b.y + b.h);
    return { dx, dy };
  }
  function activeText(spec, t) { return M.allClips(spec).filter((x) => x.track.kind === "text" && x.clip.t <= t && t < M.clipEnd(x.clip)); }

  function check(spec, ctx) {
    ctx = ctx || {}; const out = [], face = spec.base && spec.base.face, dur = spec.duration;
    const clips = M.allClips(spec);
    clips.forEach(({ track, clip }) => {
      if (track.kind === "text") {
        const st = clip.style || {}, b = M.textBox(clip), mv = clampBox(b);
        if (mv.dx || mv.dy) out.push(fnd("zona-segura", "error", `El texto «${clip.text}» se sale de la zona segura de Instagram.`, clip.id, { type: "nudge", clipId: clip.id, dx: mv.dx, dy: mv.dy }));
        if ((st.size || 100) < MIN_TEXT) out.push(fnd("fuente-chica", "error", `El texto «${clip.text}» es muy chico (${st.size}px). Mínimo ${MIN_TEXT}px.`, clip.id, { type: "set", clipId: clip.id, patch: { style: { size: MIN_TEXT + 6 } } }));
        if (face && b.y < face.chin + 100 && b.y + b.h > face.top - 100 && b.x < (face.right || 1080) + 0 && b.x + b.w > (face.left || 0)) out.push(fnd("cerca-cara", "error", `El texto «${clip.text}» está pegado a la cara. Dejá al menos 100px de aire.`, clip.id, { type: "setY", clipId: clip.id, y: Math.round(face.chin + 100 + b.h / 2) }));
        if (clip.t + clip.d > dur + 0.05) out.push(fnd("fuera-de-tiempo", "warn", `«${clip.text}» termina después del final del video.`, clip.id, { type: "set", clipId: clip.id, patch: { d: Math.max(0.2, M.q(dur - clip.t)) } }));
        if (ctx.lang || spec.lang) { const l = langOf(clip.text); if (l && l !== (spec.lang || ctx.lang)) out.push(fnd("idioma", "warn", `«${clip.text}» parece estar en ${l === "es" ? "español" : "inglés"} y el video es ${spec.lang === "es" ? "español" : "inglés"}.`, clip.id)); }
      } else if (track.kind === "media") {
        const b = M.mediaBox(clip), mv = clampBox(b);
        if (mv.dx || mv.dy) out.push(fnd("zona-segura", "error", "Una imagen o tarjeta se sale de la zona segura.", clip.id, { type: "nudgeBox", clipId: clip.id, dx: mv.dx, dy: mv.dy }));
        if (face && b.y < face.chin + 20 && b.y + b.h > face.top - 20 && b.x < (face.right || 1080) && b.x + b.w > (face.left || 0)) out.push(fnd("cerca-cara", "warn", clip.type === "card" ? "Una tarjeta está encima de la cara." : "Una imagen está encima de la cara.", clip.id));
      } else if (track.kind === "sfx" && clip.sfx !== "whoosh") out.push(fnd("sonido", "error", `Solo se permite el whoosh suave en transiciones, no «${clip.sfx}».`, clip.id, { type: "remove", clipId: clip.id }));
    });
    // lineas de texto grandes a la vez: maximo 2 filas
    const times = [...new Set(clips.filter((x) => x.track.kind === "text").flatMap((x) => [x.clip.t + 0.01]))];
    let worst = 0, worstT = 0; times.forEach((t) => { const rows = []; activeText(spec, t).forEach((x) => { const y = M.textBox(x.clip).y; if (!rows.some((r) => Math.abs(r - y) < 55)) rows.push(y); }); if (rows.length > worst) { worst = rows.length; worstT = t; } });
    if (worst > 2) out.push(fnd("max-filas", "error", `Hay ${worst} líneas de texto grande a la vez (cerca de ${worstT.toFixed(1)}s). Máximo 2, nunca tipo sándwich.`, null));
    // Aston: una palabra a la vez
    times.forEach((t) => { const as = activeText(spec, t).filter((x) => (x.clip.style || {}).font === "Aston"); if (as.length > 1 && !out.some((f) => f.id === "aston")) out.push(fnd("aston", "warn", "Hay más de una palabra en Aston a la vez. Una sola palabra especial por escena.", as[1].clip.id)); });
    clips.filter((x) => x.track.kind === "text" && (x.clip.style || {}).font === "Aston" && words(x.clip.text).length > 2).forEach((x) => out.push(fnd("aston", "warn", `«${x.clip.text}» tiene muchas palabras en Aston. Va en una sola palabra clave.`, x.clip.id)));
    // medios: maximo 3 juntos y sin tapar
    const media = clips.filter((x) => x.track.kind === "media");
    media.forEach((a) => { const together = media.filter((b) => b.clip.t < M.clipEnd(a.clip) && a.clip.t < M.clipEnd(b.clip)); if (together.length > 3 && !out.some((f) => f.id === "max-medios")) out.push(fnd("max-medios", "error", "Hay más de 3 imágenes o tarjetas a la vez.", a.clip.id));
      together.filter((b) => b.clip.id !== a.clip.id && M.overlap(M.mediaBox(a.clip), M.mediaBox(b.clip))).slice(0, 1).forEach((b) => { if (a.clip.id < b.clip.id) out.push(fnd("tapa", "warn", "Dos imágenes o tarjetas se tapan entre sí.", a.clip.id)); }); });
    clips.filter((x) => x.track.kind === "text").forEach((tx) => { const tb = M.textBox(tx.clip); media.forEach((m) => { if (m.clip.t < M.clipEnd(tx.clip) && tx.clip.t < M.clipEnd(m.clip) && M.overlap(tb, M.mediaBox(m.clip)) && !out.some((f) => f.id === "tapa" && f.clipId === tx.clip.id)) out.push(fnd("tapa", "warn", `El texto «${tx.clip.text}» y una imagen o tarjeta se tapan.`, tx.clip.id)); }); });
    // subtitulos: una linea, tamano, zona segura, cobertura
    const subs = M.trackOfKind(spec, "subtitles");
    if (subs) {
      const st = subs.style || {};
      if ((st.size || 64) < MIN_SUB) out.push(fnd("subs-chicos", "error", `Los subtítulos son muy chicos (${st.size}px). Mínimo ${MIN_SUB}px.`, null, { type: "subsStyle", patch: { size: 64 } }));
      const bx = { x: (st.x || 495) - (st.maxW || 808) / 2, y: (st.y || 880) - (st.size || 64) * 0.6, w: st.maxW || 808, h: (st.size || 64) * 1.2 }, mv = clampBox(bx);
      if (mv.dx || mv.dy) out.push(fnd("zona-segura", "error", "Los subtítulos se salen de la zona segura.", null, { type: "subsStyle", patch: { y: Math.round((st.y || 880) + mv.dy), x: Math.round((st.x || 495) + mv.dx) } }));
      if (face && bx.y < face.chin + 60 && bx.y + bx.h > face.top - 40 && bx.x < (face.right || 1080) && bx.x + bx.w > (face.left || 0)) out.push(fnd("cerca-cara", "warn", "Los subtítulos están pegados a la cara.", null, { type: "subsStyle", patch: { y: Math.round(face.chin + 60 + bx.h / 2) } }));
      const total = (subs.lines || []).reduce((a, l) => a + Math.max(0, l[1] - l[0]), 0), spoken = ctx.speechSeconds || 0;
      const textCover = clips.filter((x) => x.track.kind === "text").reduce((a, x) => a + (x.clip.d || 0), 0);
      if (spoken && total < spoken * 0.9 && textCover < spoken * 0.9) out.push(fnd("subs-incompletos", "error", `Los subtítulos cubren ${Math.round(100 * total / spoken)}% de lo que se dice. Tienen que estar completos.`, null));
      (subs.lines || []).forEach((l, i) => { const l2 = langOf(l[2]); if (l2 && l2 !== spec.lang && !out.some((f) => f.id === "idioma-subs")) out.push(fnd("idioma-subs", "warn", `La línea ${i + 1} de los subtítulos parece estar en ${l2 === "es" ? "español" : "inglés"}.`, null)); });
    }
    // fondo normal a ratos
    const bgs = (M.trackOfKind(spec, "background") || { clips: [] }).clips, bgTime = bgs.reduce((a, c) => a + (c.type === "original" ? 0 : c.d), 0);
    if (bgs.length && bgTime > dur * 0.85) out.push(fnd("fondo-normal", "warn", "Casi todo el video tiene el fondo cambiado. A ratos tiene que verse su fondo original.", null));
    const errors = out.filter((f) => f.level === "error").length, warns = out.filter((f) => f.level === "warn").length;
    return { ok: errors === 0, errors, warns, findings: out };
  }

  function applyFix(spec, f) {
    if (!f || !f.fix) return spec; const x = f.fix;
    if (x.type === "set") return M.updateClip(spec, x.clipId, x.patch);
    if (x.type === "remove") return M.removeClip(spec, x.clipId);
    if (x.type === "nudge") { const c = M.findClip(spec, x.clipId); if (!c) return spec; const st = c.clip.style || {}; return M.updateClip(spec, x.clipId, { style: { x: Math.round((st.x != null ? st.x : 540) + x.dx), y: Math.round((st.y != null ? st.y : 900) + x.dy) } }); }
    if (x.type === "nudgeBox") { const c = M.findClip(spec, x.clipId); if (!c) return spec; const b = c.clip.box || {}; return M.updateClip(spec, x.clipId, { box: { x: Math.round((b.x || 0) + x.dx), y: Math.round((b.y || 0) + x.dy) } }); }
    if (x.type === "setY") return M.updateClip(spec, x.clipId, { style: { y: x.y } });
    if (x.type === "subsStyle") return M.setSubs(spec, { style: x.patch });
    return spec;
  }
  const api = { check, applyFix, langOf, MIN_SUB, MIN_TEXT };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.StudioRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

/* Estudio: catalogo de la biblioteca (estilos, fondos, texto, transiciones, subtitulos, sonido) y formatos de exportacion.
   Cada elemento declara que reglas lo tocan. Los "make" devuelven el clip listo para agregar en el cursor. Puro, sin DOM. */
(function (root) {
  "use strict";
  const M = root.StudioModel || (typeof require !== "undefined" ? require("./studio-model.js") : null);
  const T = (name, desc, make, extra) => Object.assign({ name, desc, make }, extra || {});

  const FONDOS = {
    original: T("Fondo original", "Vuelve a verse su habitación tal cual, a pantalla completa.", (t) => ({ t, d: 6, type: "original", cutout: false, in: { type: "cut", d: 0 }, out: { type: "cut", d: 0 } })),
    "black-glow": T("Negro con luz", "Negro con un brillo suave arriba y la persona recortada.", (t) => ({ t, d: 8, type: "black-glow", cutout: true, in: { type: "iris", d: 0.6 }, out: { type: "iris", d: 0.6 } })),
    gradient: T("Degradado", "Degradado oscuro de dos colores.", (t) => ({ t, d: 8, type: "gradient", props: { from: "#0f3a45", to: "#040d12", radial: true }, cutout: true, in: { type: "zoom", d: 0.5 }, out: { type: "zoom", d: 0.5 } })),
    ondas: T("Animación: ondas", "Tres ondas de colores que se dibujan solas.", (t) => ({ t, d: 7, type: "anim", props: { name: "ondas" }, cutout: true, in: { type: "zoom", d: 0.5 }, out: { type: "wipe", d: 0.5 } })),
    red: T("Animación: red neuronal", "Nodos que se conectan uno por uno.", (t) => ({ t, d: 8, type: "anim", props: { name: "red" }, cutout: true, in: { type: "iris", d: 0.6 }, out: { type: "iris", d: 0.6 } })),
    rayos: T("Animación: rayos", "Rayos de energía sobre azul profundo.", (t) => ({ t, d: 6, type: "anim", props: { name: "rayos" }, cutout: true, in: { type: "zoom", d: 0.5 }, out: { type: "zoom", d: 0.5 } })),
    universo: T("Animación: universo", "Estrellas y un planeta con anillo.", (t) => ({ t, d: 6, type: "anim", props: { name: "universo" }, cutout: true, in: { type: "zoom", d: 0.5 }, out: { type: "zoom", d: 0.5 } })),
    solid: T("Color sólido", "Un solo color, para que resalte la persona.", (t) => ({ t, d: 6, type: "solid", props: { color: "#101820" }, cutout: true, in: { type: "wipe", d: 0.5 }, out: { type: "wipe", d: 0.5 } })),
  };
  // Lugar para un texto grande: debajo de la barbilla con 100 px de aire y dentro de la zona segura (si no cabe, baja el tamaño)
  const spot = (ctx, want) => { const chin = ctx && ctx.face ? ctx.face.chin : 760, room = 1479 - (chin + 100), size = Math.max(64, Math.min(want, Math.floor(room - 6))); return { size, y: Math.round(chin + 100 + 3 + size / 2) }; };
  const txt = (font, want, color, glow, anim, text, d) => (t, ctx) => { const s = spot(ctx, want); return { t, d, text, style: { font, size: s.size, color, x: 495, y: s.y, glow, maxW: 808 }, anim }; };
  const cardAt = (variant) => (t, ctx) => {
    const chin = ctx && ctx.face ? ctx.face.chin : 760, size = chin > 900 ? 60 : 86, lines = [{ text: "Línea uno", at: 0.5 }, { text: "línea dos", at: 1.5, hl: true }], h = Math.round(138 + lines.length * size * 1.04), y = Math.round(Math.min(Math.max(237, chin + 40), 1479 - h));
    return { t, d: 5, type: "card", front: true, box: { x: 91, y, w: 808, rot: -1.2 }, card: { variant, kicker: "Dato", size, lines } };
  };
  const TEXTOS = {
    titulo: T("Título grueso", "Mayúsculas gruesas, el texto grande del video.", txt("Anton", 150, "white", "soft", { in: "pop", out: "fade" }, "Tu título", 2)),
    amarillo: T("Título amarillo", "Mayúsculas gruesas en amarillo con brillo.", txt("Anton", 160, "yellow", "neon", { in: "pop", out: "fade" }, "Palabra clave", 2)),
    aston: T("Palabra especial (Aston)", "Una sola palabra en cursiva, la que más pesa.", txt("Aston", 210, "white", "neon", { in: "pop", out: "fade" }, "palabra", 2)),
    etiqueta: T("Etiqueta Inter", "Frase corta de apoyo en Inter.", txt("Inter", 70, "pure", "soft", { in: "slide", out: "fade" }, "Una frase corta", 2.5)),
    mano: T("Letra a mano", "Escrito a mano, para algo más personal.", txt("Caveat", 120, "white", "soft", { in: "type", out: "fade" }, "a mano", 2.5)),
    tarjeta: T("Tarjeta de evidencia", "Papel con título y líneas que aparecen con la voz.", cardAt("quote"), { track: "media" }),
    versus: T("Dos columnas", "Lo que se cree contra lo que es cierto, con tachado y palomita.", (t, ctx) => ({ t, d: 8, type: "card", front: true, box: { x: 91, y: Math.round(Math.min(1479 - 500, Math.max(237, ((ctx && ctx.face ? ctx.face.chin : 760) + 40)))), w: 808, rot: -1 }, card: { variant: "columns", kicker: "La diferencia", cols: [{ title: "Se cree", items: [{ text: "Esto", at: 0.6, strikeAt: 4 }] }, { title: "Es cierto", check: true, checkAt: 4.5, items: [{ text: "Aquello", at: 3 }] }] } }), { track: "media" }),
  };
  const TRANSICIONES = {
    iris: T("Iris", "Un círculo que se abre desde la cara.", null), zoom: T("Zoom hacia adelante", "Entra empujando y sale igual, en el mismo sentido.", null),
    wipe: T("Barrido", "Una cortina cruza de izquierda a derecha.", null), slide: T("Deslizar", "La escena nueva empuja a la anterior.", null),
    flash: T("Flash", "Un destello tapa el cambio.", null), blur: T("Desenfoque", "Se desenfoca y aparece la otra.", null), cut: T("Corte directo", "Sin efecto.", null),
  };
  const ESTILOS = {
    "titular-amarillo": { name: "Titular amarillo con brillo", desc: "Frases cortas en mayúsculas gruesas, una palabra Aston, máximo 2 líneas.", kinds: ["text"] },
    "palabra-ancla": { name: "Palabra ancla", desc: "Una palabra enorme y la frase ajustada alrededor, debajo de la cara.", kinds: ["text"] },
    "fondo-recortado": { name: "Fondo recortado", desc: "Animaciones y fotos reales detrás de la persona, con recuadros que entran y salen.", kinds: ["bg", "media"] },
    "ensayo-combo": { name: "Ensayo visual combo", desc: "Su fondo original, un iris cambia a negro con tarjetas y vuelve.", kinds: ["bg", "media"] },
    "panel-explicativo": { name: "Panel explicativo", desc: "Tú abajo y tarjetas animadas arriba, una por idea.", kinds: ["media"] },
    ranking: { name: "Ranking de niveles", desc: "Un ranking de verdad que se llena mientras hablas.", kinds: ["media"] },
    "texto-nativo": { name: "Texto nativo TikTok", desc: "Hook blanco con borde negro, debajo de la cara.", kinds: ["text"] },
    "caja-blanca": { name: "Caja blanca con Inter", desc: "El hook dentro de una caja blanca.", kinds: ["text"] },
  };
  const SUBS = {
    kt: { name: "Estilo KT (ktvideos6)", desc: "Una sola línea, hasta 3 palabras, Inter bold; especiales en Aston, claves en amarillo.", style: { size: 64, maxW: 808 } },
    pequena: { name: "KT más chico", desc: "Igual, a 56 px (el mínimo permitido).", style: { size: 56, maxW: 808 } },
  };
  const COLORES = [["white", "Blanco"], ["pure", "Blanco puro"], ["yellow", "Amarillo"], ["accent", "Verde ácido"], ["#66dcff", "Celeste"], ["#ff6b6b", "Rojo"], ["#B58CFF", "Violeta"], ["#0A0A0A", "Negro"]];
  const FUENTES = [["Anton", "Anton (grueso)"], ["Aston", "Aston Script (cursiva)"], ["Inter", "Inter"], ["Caveat", "Caveat (a mano)"]];
  const EJEMPLOS_PEDIDO = ["Agregá una transición de iris cuando cambia el fondo", "Cambiá la foto de la derecha por otra más clara", "Poné una palabra en Aston en cada idea importante", "Hacé el texto un poco más grande y más abajo", "Revisá que todo cumpla las reglas y arreglá lo que falle"];

  // ---------- exportar ----------
  const EXPORT_FORMATOS = [
    { id: "mp4-1080", name: "Instagram Reels · MP4 vertical 1080×1920", desc: "El formato de siempre. Se ve perfecto en el celular.", ext: "mp4", w: 1080, h: 1920, rec: true },
    { id: "mp4-720", name: "MP4 vertical liviano 720×1280", desc: "Pesa menos. Bueno para mandar por mensaje.", ext: "mp4", w: 720, h: 1280 },
    { id: "mp4-540", name: "MP4 vertical muy liviano 540×960", desc: "Para revisar rápido o subir a un chat.", ext: "mp4", w: 540, h: 960 },
    { id: "mp4-square", name: "MP4 cuadrado 1080×1080", desc: "Para feed cuadrado. Se recorta al centro.", ext: "mp4", w: 1080, h: 1080 },
    { id: "gif", name: "GIF de 6 segundos", desc: "Un tramo corto en loop (desde donde estés parado).", ext: "gif", w: 480, h: 854 },
    { id: "audio", name: "Solo audio", desc: "La voz y la música sin imagen, en un archivo MP4 que abre cualquier reproductor.", ext: "mp4", audio: true },
    { id: "png", name: "Fotograma actual (PNG)", desc: "Una imagen del momento donde estás parado.", ext: "png", w: 1080, h: 1920 },
  ];
  const EXPORT_CALIDADES = [
    { id: "borrador", name: "Borrador", desc: "Rápido, para mirar. Menos nítido." },
    { id: "estandar", name: "Estándar", desc: "Equilibrado. Casi igual a alta." },
    { id: "alta", name: "Alta", desc: "La mejor nitidez que entra en el tope de 19 MB de descarga.", rec: true },
  ];
  const api = { FONDOS, TEXTOS, TRANSICIONES, ESTILOS, SUBS, COLORES, FUENTES, EJEMPLOS_PEDIDO, EXPORT_FORMATOS, EXPORT_CALIDADES };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.StudioLib = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

/* Estudio: renderizador de la especificacion. Es EL MISMO codigo para la vista previa del Portal y para el render final de HyperFrames
   (lo que Daniel ve es lo que se exporta). Determinista: sin Math.random ni relojes. Requiere GSAP y studio-model.js.
   Uso: StudioRenderer.mount(host, spec, { mode: "preview"|"render", assetUrl: (id) => url, safe: false }).then((h) => ...)  */
(function (root) {
  "use strict";
  const M = root.StudioModel || (typeof require !== "undefined" ? require("./studio-model.js") : null);
  const { W, H, FONTS, COLORS, SAFE } = M;
  const IRIS_R = 1900;

  const CSS = `
.st-stage{position:relative;width:${W}px;height:${H}px;overflow:hidden;background:#000;transform-origin:0 0;font-synthesis:none}
.st-stage *{box-sizing:border-box}
.st-stage video,.st-stage img{display:block}
.st-base,.st-cut{position:absolute;object-fit:cover}
.st-layer{position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none}
.st-bgclip{position:absolute;inset:0;overflow:hidden}
.st-art{position:absolute;inset:0}
.st-t{position:absolute;white-space:nowrap;line-height:1;translate:-50% -50%;will-change:transform,opacity}
.st-ins{position:absolute;border:10px solid #fff;border-radius:14px;background:#111;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.55)}
.st-ins img{width:100%;height:100%;object-fit:cover}
.st-card{position:absolute;border-radius:26px;background:var(--st-paper,#F3F0E8);color:#0a0a0a;padding:36px 44px 40px;box-shadow:0 36px 80px rgba(0,0,0,.6)}
.st-kk{display:inline-block;font:700 24px/1 "Inter",system-ui,sans-serif;letter-spacing:.2em;background:#0a0a0a;color:var(--st-accent,#B6FF3B);padding:9px 18px;border-radius:10px;text-transform:uppercase}
.st-q{margin-top:20px;font:400 86px/1.04 "Anton",Impact,sans-serif;text-transform:uppercase}
.st-q .ln{display:none}
.st-hl{background:linear-gradient(var(--st-accent,#B6FF3B),var(--st-accent,#B6FF3B)) no-repeat left center/0% 88%;padding:0 .08em;margin:0 -.08em}
.st-cols{display:flex;gap:26px;margin-top:24px}
.st-col{flex:1;border-radius:18px;border:3px solid #0a0a0a;padding:22px 20px;min-height:330px;position:relative}
.st-col h3{font:700 24px/1 "Inter",system-ui,sans-serif;letter-spacing:.2em;margin:0 0 18px;text-transform:uppercase}
.st-chip{display:block;font:400 46px/1.05 "Anton",Impact,sans-serif;text-transform:uppercase;background:#0a0a0a;color:#fff;border-radius:12px;padding:10px 16px;margin-bottom:12px;position:relative}
.st-strike{position:absolute;left:-6px;right:-6px;top:50%;height:7px;background:#ff3b3b;transform-origin:left center;transform:scaleX(0);border-radius:4px}
.st-sub{position:absolute;display:flex;justify-content:center;align-items:center;white-space:nowrap}
.st-safe{position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none}
.st-flash{position:absolute;inset:0;background:#fff;opacity:0}
`;

  const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
  const svgEl = (tag, attrs, parent) => { const e = document.createElementNS("http://www.w3.org/2000/svg", tag); Object.keys(attrs || {}).forEach((k) => e.setAttribute(k, attrs[k])); if (parent) parent.appendChild(e); return e; };
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = (seed) => { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
  const colorOf = (c) => COLORS[c] || c || "#fff";
  const glowOf = (g) => (g === "neon" ? "0 0 22px rgba(255,255,255,.55),0 3px 6px rgba(0,0,0,.8)" : g === "soft" || g === true ? "0 0 18px rgba(0,0,0,.75),0 3px 6px rgba(0,0,0,.8)" : g === "kt" ? "0 2px 8px rgba(0,0,0,.6)" : "none");

  // ---------- fondos ----------
  const ART = {
    solid(art, c) { art.style.background = (c.props && c.props.color) || "#050505"; },
    gradient(art, c) { const p = c.props || {}; art.style.background = p.radial ? `radial-gradient(900px 700px at 50% 45%,${p.from || "#0f3a45"} 0%,${p.to || "#040d12"} 100%)` : `linear-gradient(${p.angle || 180}deg,${p.from || "#0f3a45"},${p.to || "#040d12"})`; },
    "black-glow"(art, c) { const a = colorOf((c.props && c.props.accent) || "accent"); art.style.background = `radial-gradient(760px 620px at 50% 12%,color-mix(in srgb,${a} 18%,transparent),transparent 70%),#050505`; },
    photo(art, c, ctx) {
      const p = c.props || {}, src = ctx.url(p.asset); art.style.background = p.bg || "#0a0e18"; if (!src) return;
      const img = el("img", "", art); img.src = src; img.style.cssText = `position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;object-position:${(p.fx != null ? p.fx : 0.5) * 100}% ${(p.fy != null ? p.fy : 0.4) * 100}%;filter:contrast(1.06)`;
      el("div", "", art).style.cssText = `position:absolute;inset:0;background:rgba(5,8,16,${p.dim != null ? p.dim : 0.15})`;
      el("div", "", art).style.cssText = "position:absolute;left:0;right:0;bottom:0;height:1100px;background:linear-gradient(to top,rgba(10,14,24,.97) 40%,rgba(10,14,24,0))";
    },
    anim(art, c, ctx) {
      const name = (c.props && c.props.name) || "ondas", R = rng(hash(c.id || name)), s = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, art); s.style.cssText = "position:absolute;left:0;top:0";
      if (name === "rayos") {
        art.style.background = "linear-gradient(180deg,#040916 0%,#0a2350 70%,#0d3a7a 100%)";
        const ax = (c.props && c.props.x) || 540, ay = (c.props && c.props.y) || 520, sc = (c.props && c.props.scale) || 1, defs = svgEl("defs", {}, s), g = svgEl("radialGradient", { id: "o" + hash(c.id), cx: "50%", cy: "50%", r: "50%" }, defs);
        svgEl("stop", { offset: "0%", "stop-color": "#e6fbff" }, g); svgEl("stop", { offset: "40%", "stop-color": "#7fdcff", "stop-opacity": 0.85 }, g); svgEl("stop", { offset: "100%", "stop-color": "#1b6bff", "stop-opacity": 0 }, g);
        svgEl("circle", { cx: ax, cy: ay, r: 330 * sc, fill: `url(#o${hash(c.id)})` }, s);
        for (let b = 0; b < 8; b++) {
          const a = (b / 8) * Math.PI * 2 + 0.2, len = (420 + R() * 260) * sc; let x = ax, y = ay, d = `M${x} ${y}`;
          for (let k = 1; k <= 7; k++) { const f = k / 7; x = ax + Math.cos(a) * len * f + (R() - 0.5) * 70; y = ay + Math.sin(a) * len * f + (R() - 0.5) * 70; d += ` L${x.toFixed(1)} ${y.toFixed(1)}`; }
          const p = svgEl("path", { d, fill: "none", stroke: "#bdf1ff", "stroke-width": 5, "stroke-linecap": "round", "stroke-linejoin": "round", pathLength: 1, "stroke-dasharray": 1, "stroke-dashoffset": 1 }, s); p.style.filter = "drop-shadow(0 0 12px #5ad2ff)";
          ctx.tl.to(p, { attr: { "stroke-dashoffset": 0 }, duration: 0.28, ease: "power3.out" }, c.t + 0.1 + b * 0.1);
        }
      } else if (name === "universo") {
        art.style.background = "radial-gradient(900px 800px at 30% 24%,#3a1479 0%,#12053a 55%,#04020c 100%)";
        for (let i = 0; i < 150; i++) svgEl("circle", { cx: R() * W, cy: R() * 1500, r: 0.8 + R() * 2.4, fill: "#fff", opacity: 0.25 + R() * 0.75 }, s);
        svgEl("ellipse", { cx: 540, cy: 520, rx: 470, ry: 150, fill: "none", stroke: "rgba(255,255,255,.22)", "stroke-width": 2 }, s);
        const defs = svgEl("defs", {}, s), g = svgEl("radialGradient", { id: "p" + hash(c.id), cx: "35%", cy: "30%", r: "75%" }, defs);
        svgEl("stop", { offset: "0%", "stop-color": "#ffd9a8" }, g); svgEl("stop", { offset: "60%", "stop-color": "#e0733a" }, g); svgEl("stop", { offset: "100%", "stop-color": "#5a1d12" }, g);
        const pl = svgEl("circle", { cx: 760, cy: 470, r: 170, fill: `url(#p${hash(c.id)})` }, s); svgEl("ellipse", { cx: 760, cy: 470, rx: 290, ry: 62, fill: "none", stroke: "rgba(255,230,190,.65)", "stroke-width": 12, transform: "rotate(-16 760 470)" }, s);
        ctx.tl.fromTo(pl, { attr: { r: 120 } }, { attr: { r: 170 }, duration: 1.6, ease: "power3.out", immediateRender: false }, c.t);
      } else if (name === "red") {
        art.style.background = "linear-gradient(180deg,#021410 0%,#05281f 100%)";
        const pts = []; for (let i = 0; i < 14; i++) pts.push([100 + (i % 5) * 220 + (R() - 0.5) * 80, 300 + Math.floor(i / 5) * 190 + (R() - 0.5) * 70]);
        const edges = []; for (let i = 0; i < pts.length - 1; i++) edges.push([i, i + 1]); for (let i = 0; i < 9; i++) edges.push([i, i + 5]);
        const lines = edges.map(([a, b]) => svgEl("line", { x1: pts[a][0], y1: pts[a][1], x2: pts[b][0], y2: pts[b][1], stroke: "#5EEAD4", "stroke-width": 4, opacity: 0.16, "stroke-linecap": "round" }, s));
        const dots = pts.map(([x, y]) => svgEl("circle", { cx: x, cy: y, r: 11, fill: "#fff", opacity: 0.35 }, s));
        edges.forEach(([a, b], i) => { const tt = c.t + 0.5 + i * 0.22; ctx.tl.to(lines[i], { attr: { opacity: 1, "stroke-width": 6 }, duration: 0.3, ease: "power3.out" }, tt); ctx.tl.to(dots[b], { attr: { opacity: 1, r: 17, fill: "#5EEAD4" }, duration: 0.3, ease: "back.out(1.6)" }, tt + 0.1); });
      } else { // ondas
        art.style.background = "linear-gradient(180deg,#02100f 0%,#052724 100%)";
        const cols = ["#5eead4", "#a78bfa", "#fbbf24"], amps = [38, 56, 30], frs = [0.011, 0.019, 0.03], ys = (c.props && c.props.ys) || [330, 450, 570];
        for (let w = 0; w < 3; w++) {
          let d = ""; for (let x = 0; x <= W; x += 8) d += (x ? " L" : "M") + x + " " + (ys[w] + Math.sin(x * frs[w] * 2 * Math.PI / 12) * amps[w]).toFixed(1);
          svgEl("path", { d, fill: "none", stroke: cols[w], "stroke-width": 4, opacity: 0.22, "stroke-linecap": "round" }, s);
          const p = svgEl("path", { d, fill: "none", stroke: cols[w], "stroke-width": 7, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": 1, "stroke-dashoffset": 1 }, s); p.style.filter = `drop-shadow(0 0 14px ${cols[w]})`;
          ctx.tl.to(p, { attr: { "stroke-dashoffset": 0 }, duration: 0.8, ease: "power3.out" }, c.t + 0.2 + w * 0.3);
        }
      }
    },
  };

  // ---------- transiciones de fondo ----------
  function irisAt(ctx) { const f = (ctx.spec.base && ctx.spec.base.focus) || { x: 540, y: 1250 }; return `${f.x}px ${f.y}px`; }
  function transIn(wrap, tr, t, ctx) {
    const d = tr && tr.d != null ? tr.d : 0.6, type = (tr && tr.type) || "cut", tl = ctx.tl, ease = "power3.inOut";
    tl.set(wrap, { autoAlpha: 1 }, t);
    if (type === "iris") tl.fromTo(wrap, { clipPath: `circle(0px at ${irisAt(ctx)})` }, { clipPath: `circle(${IRIS_R}px at ${irisAt(ctx)})`, duration: d, ease, immediateRender: false }, t);
    else if (type === "zoom") tl.fromTo(wrap, { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: d, ease: "power4.out", immediateRender: false }, t);
    else if (type === "wipe") tl.fromTo(wrap, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: d, ease, immediateRender: false }, t);
    else if (type === "slide") tl.fromTo(wrap, { xPercent: 100 }, { xPercent: 0, duration: d, ease, immediateRender: false }, t);
    else if (type === "blur") tl.fromTo(wrap, { autoAlpha: 0, filter: "blur(40px)" }, { autoAlpha: 1, filter: "blur(0px)", duration: d, ease: "power2.out", immediateRender: false }, t);
    else if (type === "flash") { tl.set(wrap, { autoAlpha: 0 }, t); tl.set(wrap, { autoAlpha: 1 }, t + 0.08); tl.fromTo(ctx.flash, { opacity: 0 }, { opacity: 0.95, duration: 0.08, ease: "none", immediateRender: false }, t); tl.to(ctx.flash, { opacity: 0, duration: Math.max(0.15, d), ease: "power2.out" }, t + 0.08); }
  }
  function transOut(wrap, tr, end, ctx) {
    const d = tr && tr.d != null ? tr.d : 0.5, type = (tr && tr.type) || "cut", tl = ctx.tl, ease = "power3.inOut", s = end - d;
    if (type === "iris") tl.fromTo(wrap, { clipPath: `circle(${IRIS_R}px at ${irisAt(ctx)})` }, { clipPath: `circle(0px at ${irisAt(ctx)})`, duration: d, ease, immediateRender: false }, s);
    else if (type === "zoom") tl.to(wrap, { scale: 1.3, autoAlpha: 0, duration: d, ease: "power4.in" }, s);
    else if (type === "wipe") tl.to(wrap, { clipPath: "inset(0 0% 0 100%)", duration: d, ease }, s);
    else if (type === "slide") tl.to(wrap, { xPercent: -100, duration: d, ease }, s);
    else if (type === "blur") tl.to(wrap, { autoAlpha: 0, filter: "blur(40px)", duration: d, ease: "power2.in" }, s);
    else if (type === "flash") { tl.fromTo(ctx.flash, { opacity: 0 }, { opacity: 0.95, duration: 0.08, ease: "none", immediateRender: false }, s + d - 0.1); tl.to(ctx.flash, { opacity: 0, duration: 0.25, ease: "power2.out" }, s + d - 0.02); }
    tl.set(wrap, { autoAlpha: 0 }, end);
  }
  function buildBg(c, ctx) {
    if (c.type === "original") return; // volver al fondo original = no tapar el video
    const wrap = el("div", "st-bgclip", ctx.L.bg); wrap.dataset.cid = c.id; const art = el("div", "st-art", wrap);
    (ART[c.type] || ART.solid)(art, c, ctx);
    ctx.tl.set(wrap, { autoAlpha: 0 }, 0);
    transIn(wrap, c.in, c.t, ctx); transOut(wrap, c.out, c.t + c.d, ctx);
    if (c.push !== false && (c.type === "photo" || c.type === "anim")) ctx.tl.fromTo(art, { scale: 1 }, { scale: 1.06, duration: c.d, ease: "none", immediateRender: false }, c.t);
    ctx.els[c.id] = wrap;
  }
  // el recorte de persona se ve solo mientras hay un fondo con cutout activo
  function buildCutVisibility(bgs, ctx) {
    ctx.tl.set(ctx.cut, { opacity: 0 }, 0);
    const spans = []; // intervalos con recorte, juntando los que se tocan
    bgs.filter((c) => c.cutout !== false && c.type !== "original").map((c) => [c.t, c.t + c.d]).sort((a, b) => a[0] - b[0]).forEach((s) => { const last = spans[spans.length - 1]; if (last && s[0] <= last[1] + 0.02) last[1] = Math.max(last[1], s[1]); else spans.push(s.slice()); });
    spans.forEach(([a, b]) => { ctx.tl.set(ctx.cut, { opacity: 1 }, a); ctx.tl.set(ctx.cut, { opacity: 0 }, b); });
  }

  // ---------- texto ----------
  function buildText(c, ctx) {
    const st = c.style || {}, f = FONTS[st.font] || FONTS.Anton, tl = ctx.tl, an = c.anim || {};
    const b = el("div", "st-t", ctx.L.text); b.dataset.cid = c.id; b.textContent = c.text || "";
    const al = st.align || "center"; b.style.left = (st.x != null ? st.x : 540) + "px"; b.style.top = (st.y != null ? st.y : 900) + "px";
    b.style.translate = al === "left" ? "0 -50%" : al === "right" ? "-100% -50%" : "-50% -50%";
    b.style.cssText += `;font-family:${f.css};font-weight:${f.weight};font-size:${st.size || 100}px;color:${colorOf(st.color || "white")};text-shadow:${glowOf(st.glow == null ? "soft" : st.glow)};text-transform:${f.upper && st.upper !== false ? "uppercase" : "none"};letter-spacing:${st.spacing || 0}px;${st.rot ? `rotate:${st.rot}deg;` : ""}`;
    ctx.fit.push(() => { if (st.maxW && b.offsetWidth > st.maxW) b.style.fontSize = ((st.size || 100) * st.maxW / b.offsetWidth) + "px"; });
    tl.set(b, { autoAlpha: 0 }, 0);
    const t = c.t, e = c.t + c.d, ii = an.in || "cut", oo = an.out || "cut";
    if (ii === "pop") tl.fromTo(b, { autoAlpha: 0, scale: 1.28, y: 18 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.22, ease: "power4.out", immediateRender: false }, t);
    else if (ii === "slide") tl.fromTo(b, { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.28, ease: "power4.out", immediateRender: false }, t);
    else if (ii === "fade") tl.fromTo(b, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, immediateRender: false }, t);
    else if (ii === "type") {
      const txt = b.textContent; b.textContent = ""; const chars = [...txt].map((ch) => { const s = el("span", "", b); s.textContent = ch; return s; });
      tl.set(b, { autoAlpha: 1 }, t); tl.set(chars, { autoAlpha: 0 }, 0); tl.to(chars, { autoAlpha: 1, duration: 0.01, stagger: Math.min(0.06, Math.max(0.02, (c.d * 0.5) / Math.max(1, chars.length))) }, t);
    } else tl.set(b, { autoAlpha: 1 }, t);
    if (oo === "fade") tl.to(b, { autoAlpha: 0, duration: 0.15 }, e - 0.15); else if (oo === "slide") tl.to(b, { autoAlpha: 0, y: -40, duration: 0.25, ease: "power3.in" }, e - 0.25);
    tl.set(b, { autoAlpha: 0 }, e);
    ctx.els[c.id] = b;
  }

  // ---------- medios: imagen en recuadro y tarjetas ----------
  const up = (b, t, rot, ctx) => ctx.tl.fromTo(b, { y: 140, autoAlpha: 0, rotation: rot + 3 }, { y: 0, autoAlpha: 1, rotation: rot, duration: 0.5, ease: "power4.out", immediateRender: false }, t);
  function buildMedia(c, ctx) {
    const tl = ctx.tl, bx = c.box || {}, e = c.t + c.d;
    if (c.type === "card") {
      const k = c.card || {}, b = el("div", "st-card", c.front === false ? ctx.L.media : ctx.L.front); b.dataset.cid = c.id; b.style.cssText += `;left:${bx.x != null ? bx.x : 91}px;top:${bx.y != null ? bx.y : 262}px;width:${bx.w || 899}px`;
      el("span", "st-kk", b, "").textContent = k.kicker || "";
      if (k.variant === "columns") {
        const cols = el("div", "st-cols", b);
        (k.cols || []).forEach((col, ci) => {
          const cb = el("div", "st-col", cols); el("h3", "", cb).textContent = col.title || "";
          (col.items || []).forEach((it) => { const chip = el("span", "st-chip", cb); chip.textContent = it.text; tl.set(chip, { autoAlpha: 0 }, 0); tl.fromTo(chip, { autoAlpha: 0, x: ci ? 50 : -50 }, { autoAlpha: 1, x: 0, duration: 0.24, ease: "power3.out", immediateRender: false }, c.t + (it.at || 0.3));
            if (it.strikeAt != null) { const sk = el("i", "st-strike", chip); tl.to(sk, { scaleX: 1, duration: 0.25, ease: "power3.out" }, c.t + it.strikeAt); } });
          if (col.check) { const w = el("div", "", cb); w.style.cssText = "position:absolute;right:18px;bottom:18px"; w.innerHTML = `<svg viewBox="0 0 120 120" width="120" height="120"><circle cx="60" cy="60" r="54" fill="${colorOf("accent")}" stroke="#0a0a0a" stroke-width="6"/><path d="M32 62 L53 82 L90 40" fill="none" stroke="#0a0a0a" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>`; tl.to(w.querySelector("path"), { attr: { "stroke-dashoffset": 0 }, duration: 0.4, ease: "power3.out" }, c.t + (col.checkAt || 1)); }
        });
        tl.fromTo(cols, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, immediateRender: false }, c.t + 0.2);
      } else {
        const q = el("div", "st-q", b); if (k.size) q.style.fontSize = k.size + "px";
        (k.lines || []).forEach((ln) => { const l = el("span", "ln", q); l.innerHTML = ln.hl ? `<span class="st-hl">${ln.text}</span>` : ln.text; tl.set(l, { display: "block", autoAlpha: 0 }, 0); tl.set(l, { autoAlpha: 1, display: "block" }, c.t + (ln.at || 0.3)); tl.fromTo(l, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.22, ease: "power3.out", immediateRender: false }, c.t + (ln.at || 0.3));
          if (ln.hl) tl.to(l.querySelector(".st-hl"), { backgroundSize: "100% 88%", duration: 0.45, ease: "power3.inOut" }, c.t + (ln.hlAt || (ln.at || 0.3) + 0.4)); });
        // las lineas ocultas no ocupan lugar hasta que aparecen: display se enciende en su momento
        (k.lines || []).forEach((ln, i) => { const l = q.children[i]; tl.set(l, { display: "none" }, 0); tl.set(l, { display: "block" }, c.t + (ln.at || 0.3)); });
      }
      tl.set(b, { autoAlpha: 0 }, 0); const rot = bx.rot != null ? bx.rot : -1.2; up(b, c.t, rot, ctx); tl.to(b, { y: -170, autoAlpha: 0, duration: 0.3, ease: "power4.in" }, e - 0.3); tl.set(b, { autoAlpha: 0 }, e);
      ctx.els[c.id] = b; return;
    }
    const b = el("div", "st-ins", c.front === false ? ctx.L.media : ctx.L.front); b.dataset.cid = c.id; const im = el("img", "", b); const u = ctx.url(c.src && c.src.asset); if (u) im.src = u;
    b.style.cssText += `;left:${bx.x || 0}px;top:${bx.y || 0}px;width:${bx.w || 300}px;height:${bx.h || 300}px;border-width:${bx.border === false ? 0 : 10}px`;
    tl.set(b, { autoAlpha: 0 }, 0); const r = bx.rot || 0, ii = c.in || "pop";
    if (ii === "slide") tl.fromTo(b, { autoAlpha: 0, x: 120, rotation: r }, { autoAlpha: 1, x: 0, duration: 0.4, ease: "power3.out", immediateRender: false }, c.t);
    else if (ii === "fade") tl.fromTo(b, { autoAlpha: 0, rotation: r }, { autoAlpha: 1, duration: 0.3, immediateRender: false }, c.t);
    else tl.fromTo(b, { autoAlpha: 0, scale: 0.55, rotation: r - 8, transformOrigin: "100% 0%" }, { autoAlpha: 1, scale: 1, rotation: r, duration: 0.45, ease: "back.out(1.5)", immediateRender: false }, c.t);
    tl.to(b, { autoAlpha: 0, x: 60, duration: 0.28, ease: "power3.in" }, e - 0.28); tl.set(b, { autoAlpha: 0 }, e);
    ctx.els[c.id] = b;
  }

  // ---------- subtitulos estilo KT ----------
  function buildSubs(tr, ctx) {
    const st = Object.assign({ size: 64, maxW: 808, y: 880, x: 495, hero: [], key: [] }, tr.style || {}), host = el("div", "st-sub", ctx.L.subs);
    host.style.cssText += `;left:${st.x - st.maxW / 2}px;width:${st.maxW}px;top:${st.y - st.size}px;height:${st.size * 2}px`;
    const cv = document.createElement("canvas").getContext("2d"), hero = new Set((st.hero || []).map(M.norm));
    const measure = (w, h) => { cv.font = h ? `${st.size * 1.08}px "AstonScript"` : `700 ${st.size}px "Inter"`; return cv.measureText(w).width; };
    const chunks = M.chunkSubs(tr.lines || [], st, measure), gap = Math.round(st.size * 0.26);
    chunks.forEach((ch) => {
      const row = el("div", "", host); row.style.cssText = `position:absolute;left:0;right:0;top:0;bottom:0;display:flex;justify-content:center;align-items:center;gap:0 ${gap}px;white-space:nowrap`;
      ch.words.forEach((w) => { const s = el("span", "", row); s.textContent = w.w; s.style.cssText = `font-family:${w.hero ? '"AstonScript",cursive' : '"Inter",system-ui,sans-serif'};font-weight:${w.hero ? 400 : 700};font-size:${w.hero ? st.size * 1.08 : st.size}px;line-height:1;color:${w.key && !w.hero ? "#FFD400" : "#fff"};text-shadow:0 2px 8px rgba(0,0,0,.6)`; });
      ctx.tl.set(row, { autoAlpha: 0 }, 0); ctx.tl.set(row, { autoAlpha: 1 }, M.q(ch.s)); ctx.tl.set(row, { autoAlpha: 0 }, M.q(ch.e));
    });
    ctx.els.subs = host; ctx.chunks = chunks;
  }

  function safeOverlay(parent) {
    const s = svgEl("svg", { class: "st-safe", viewBox: `0 0 ${W} ${H}` }, parent), d = SAFE.map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join(" ") + " Z";
    svgEl("path", { d: `M0 0H${W}V${H}H0Z ${d}`, fill: "rgba(255,0,80,.16)", "fill-rule": "evenodd" }, s); svgEl("path", { d, fill: "none", stroke: "#fff", "stroke-width": 3, "stroke-dasharray": "8 8", opacity: 0.9 }, s); return s;
  }

  // ---------- montaje ----------
  function fontsUsed(spec) {
    const set = new Set(['700 40px "Inter"', '40px "AstonScript"']);
    M.allClips(spec).forEach((x) => { if (x.clip.style && x.clip.style.font) { const f = M.FONTS[x.clip.style.font]; if (f) set.add(`${f.weight} 40px ${f.css.split(",")[0]}`); } });
    return [...set];
  }
  function mount(host, spec, opts) {
    const o = Object.assign({ mode: "preview", assetUrl: (id) => (id ? "/_blob/" + id : ""), safe: false, audio: true }, opts || {});
    if (!document.getElementById("st-style")) { const s = el("style"); s.id = "st-style"; s.textContent = CSS; document.head.appendChild(s); }
    if (!o.baseEl) host.innerHTML = ""; // en el render final los <video> ya estan escritos en el HTML (HyperFrames los lee ahi) y se adoptan, no se crean
    const stage = el("div", "st-stage", host), rect = (spec.base && spec.base.rect) || { x: 0, y: 0, w: W, h: H };
    const video = o.baseEl || el("video", "st-base", stage), cut = o.cutEl || el("video", "st-cut", stage);
    [[o.baseEl, "st-base"], [o.cutEl, "st-cut"]].forEach(([n, c]) => { if (n) { n.classList.add(c); stage.appendChild(n); } });
    [video, cut].forEach((v) => { v.playsInline = true; v.preload = "auto"; v.style.cssText += `;left:${rect.x}px;top:${rect.y}px;width:${rect.w}px;height:${rect.h}px`; });
    cut.muted = true; if (!o.audio) video.muted = true;
    const L = {}; ["bg", "media"].forEach((k) => { L[k] = el("div", "st-layer", stage); });
    stage.insertBefore(L.bg, cut); stage.insertBefore(L.media, cut);
    L.front = el("div", "st-layer", stage); L.text = el("div", "st-layer", stage); L.subs = el("div", "st-layer", stage); L.flash = el("div", "st-flash", stage);
    let safeEl = null, tl = null, ctx = null; const handle = { stage, video, cut, L, o };
    const setSrc = () => {
      const b = handle.spec.base || {}, u = o.assetUrl(b.asset), c = o.assetUrl(b.cutout);
      if (u && video.getAttribute("src") !== u) video.src = u; if (c && cut.getAttribute("src") !== c) cut.src = c; cut.style.display = c ? "" : "none";
      if (o.mode === "render") { video.setAttribute("data-start", "0"); video.setAttribute("data-duration", String(handle.spec.duration)); video.setAttribute("data-has-audio", "true"); video.setAttribute("data-track-index", "0"); cut.setAttribute("data-start", "0"); cut.setAttribute("data-duration", String(handle.spec.duration)); cut.setAttribute("data-track-index", "2"); }
    };
    function rebuild(next) {
      handle.spec = next; const prevTime = tl ? tl.time() : 0; if (tl) tl.kill();
      ["bg", "media", "front", "text", "subs"].forEach((k) => { L[k].innerHTML = ""; });
      stage.style.setProperty("--st-paper", (next.theme && next.theme.paper) || "#F3F0E8"); stage.style.setProperty("--st-accent", colorOf((next.theme && next.theme.accent) || "accent"));
      tl = gsap.timeline({ paused: true }); ctx = { spec: next, tl, L, cut, flash: L.flash, els: {}, fit: [], url: o.assetUrl, chunks: [] }; handle.tl = tl; handle.els = ctx.els;
      const bgs = (M.trackOfKind(next, "background") || { clips: [] }).clips; bgs.forEach((c) => buildBg(c, ctx)); buildCutVisibility(bgs, ctx);
      next.tracks.filter((t) => t.kind === "media").forEach((t) => t.clips.forEach((c) => buildMedia(c, ctx)));
      next.tracks.filter((t) => t.kind === "text").forEach((t) => t.clips.forEach((c) => buildText(c, ctx)));
      const subs = M.trackOfKind(next, "subtitles"); if (subs) buildSubs(subs, ctx);
      ctx.fit.forEach((f) => f()); handle.events = ((M.trackOfKind(next, "sfx") || { clips: [] }).clips || []).map((c) => ({ t: c.t, sfx: c.sfx || "whoosh" }));
      handle.chunks = ctx.chunks; handle.duration = next.duration; setSrc();
      if (safeEl) safeEl.remove(); safeEl = o.safe ? safeOverlay(stage) : null; tl.time(next.duration, true); tl.time(Math.min(prevTime, next.duration), true); // ida al final y vuelta: asi cada elemento toma su estado inicial (oculto hasta su momento)
    }
    handle.rebuild = rebuild; handle.seek = (t) => { if (tl) tl.time(t, false); };
    handle.setSafe = (on) => { o.safe = !!on; if (safeEl) { safeEl.remove(); safeEl = null; } if (on) safeEl = safeOverlay(stage); };
    handle.scaleTo = (px) => { const k = px / W; stage.style.transform = `scale(${k})`; host.style.width = px + "px"; host.style.height = Math.round(H * k) + "px"; host.style.overflow = "hidden"; handle.scale = k; };
    handle.rectOf = (id) => { const n = ctx.els[id]; if (!n) return null; const a = n.getBoundingClientRect(), s = stage.getBoundingClientRect(), k = handle.scale || 1; return { x: (a.left - s.left) / k, y: (a.top - s.top) / k, w: a.width / k, h: a.height / k }; };
    handle.destroy = () => { if (tl) tl.kill(); host.innerHTML = ""; };
    handle.spec = spec;
    return Promise.all(fontsUsed(spec).map((f) => (document.fonts ? document.fonts.load(f).catch(() => null) : null))).then(() => { rebuild(spec); return handle; });
  }
  root.StudioRenderer = { mount, IRIS_R };
})(typeof globalThis !== "undefined" ? globalThis : this);
