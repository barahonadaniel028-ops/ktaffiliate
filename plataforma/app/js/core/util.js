/* Aura · utilidades: espacio de nombres, iconos, formatos, anillos, cuadros de video de muestra, avisos y hojas. */
(function () {
  "use strict";
  const App = (window.App = window.App || {});
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("aura:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("aura:" + k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } },
  };
  const debounce = (fn, ms) => { let t = 0; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const uid = (p) => (p || "id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const reduceMotion = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
  const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

  // ---------- formatos ----------
  const n0 = (x) => (Number.isFinite(+x) ? +x : 0);
  const fmt = (n) => { n = n0(n); const a = Math.abs(n); if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(".", ",") + " M"; if (a >= 1e4) return Math.round(n / 1e3) + " mil"; if (a >= 1e3) return (n / 1e3).toFixed(1).replace(".", ",") + " mil"; return String(Math.round(n)); };
  const fmtFull = (n) => Math.round(n0(n)).toLocaleString("es");
  const pctTxt = (x) => (x == null || !Number.isFinite(+x) ? "" : (x > 0 ? "+" : "") + Math.round(x) + "%");
  const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const pad = (n) => String(n).padStart(2, "0");
  const dayKey = (d) => { d = d instanceof Date ? d : new Date(d); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  const showDate = (t) => { const d = new Date(t); return d.getDate() + " " + MONTHS[d.getMonth()]; };
  const dayName = (t) => DAYS[new Date(t).getDay()];
  const ago = (t) => { const s = Math.max(0, (Date.now() - new Date(t).getTime()) / 1000); return s < 60 ? "recién" : s < 3600 ? `hace ${Math.floor(s / 60)} min` : s < 86400 ? `hace ${Math.floor(s / 3600)} h` : `hace ${Math.floor(s / 86400)} d`; };
  const plural = (n, a, b) => (n === 1 ? a : b);
  const mmss = (t) => { t = Math.max(0, t || 0); return Math.floor(t / 60) + ":" + pad(Math.floor(t % 60)); };
  const bytes = (n) => (n < 1024 ? n + " B" : n < 1048576 ? Math.round(n / 1024) + " KB" : (n / 1048576).toFixed(1).replace(".", ",") + " MB");

  // ---------- iconos de trazo ----------
  const I = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 21.5A2.5 2.5 0 0 1 6.5 19H20v3H6.5"/>',
    flask: '<path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7 15h10"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 16v-4M12 16V8M17 16v-7"/>', trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    note: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    film: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 7.5h4M3 12h18M3 16.5h4M17 7.5h4M17 16.5h4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5"/>',
    sparkles: '<path d="M12 3l1.8 4.6 4.7 1.9-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.9z"/><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    play: '<path d="M7 4v16l13-8z"/>', pause: '<path d="M8 5v14M16 5v14"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>', chevdown: '<path d="m6 9 6 6 6-6"/>', chevleft: '<path d="m15 6-6 6 6 6"/>', chevup: '<path d="m18 15-6-6-6 6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', bookmark: '<path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z"/>', out: '<path d="M7 17 17 7M8 7h9v9"/>', send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>', undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>', redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/>',
    type: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>', layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>', music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    volume: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>', mute: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>', copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/>', link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>', calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>', shield: '<path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6z"/>',
    help: '<path d="M9.5 9a2.6 2.6 0 1 1 3.6 2.4c-.8.4-1.1.9-1.1 1.8M12 17.2v.1"/><circle cx="12" cy="12" r="9"/>', more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>', wand: '<path d="m15 4 5 5L9 20H4v-5z"/><path d="m13 6 5 5"/>',
    flag: '<path d="M4 22V4M4 4h13l-2 4 2 4H4"/>', pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>', fire: '<path d="M12 22c4 0 7-2.7 7-6.8 0-3.4-2.2-5.4-3.4-7.4-.6 1.4-1.4 2.2-2.4 2.8.3-3.3-1-6.4-3.8-8.6.2 3.6-1.6 5.4-3 7.3C5 11 5 13 5 15.2 5 19.3 8 22 12 22z"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>', keyboard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M8 16h8"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4"/>', frame: '<path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/>',
    ruler: '<path d="M3 17 17 3l4 4L7 21z"/><path d="m7 13 2 2M10 10l2 2M13 7l2 2"/>',
    minus: '<path d="M5 12h14"/>', bg: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m3 16 5-5 4 4 3-3 6 6"/>', photo: '<rect x="3" y="6" width="14" height="14" rx="2.5"/><path d="M7 3h11a3 3 0 0 1 3 3v11"/><path d="m3 17 4-4 3 3 2-2 5 5"/>',
    trans: '<rect x="3" y="5" width="8" height="14" rx="2"/><path d="M14 5h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5" stroke-dasharray="2.2 2.6"/><path d="m9 12 4 0M11.5 10l2 2-2 2"/>',
    captions: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 11h4M13 11h4M7 15h10"/>', lines: '<path d="M4 6h16M4 10h16M4 14h11M4 18h7"/>', dot: '<circle cx="12" cy="12" r="4" fill="currentColor"/>',
    drop: '<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z"/>', palette: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.9-.6-1.3-.6-2.1 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4c0-4.7-4-8.7-9-8.7z"/><circle cx="7.5" cy="11" r="1.3"/><circle cx="10.5" cy="7" r="1.3"/><circle cx="15" cy="7.5" r="1.3"/>',
    mix: '<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>', scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M4 12h16"/>', box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  };
  const icon = (n, cls) => `<svg class="ic${cls ? " " + cls : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || ""}</svg>`;

  // ---------- graficos chicos ----------
  const RC = (r) => 2 * Math.PI * r;
  function ring(p, size, o) {
    o = o || {}; p = Math.max(0, Math.min(1, p || 0)); const r = o.r || 42, sw = o.sw || 7, s = r * 2 + sw * 2, C = RC(r);
    return `<span class="ringw" style="width:${size}px;height:${size}px${o.color ? `;--rc:${o.color}` : ""}"><svg viewBox="0 0 ${s} ${s}" aria-hidden="true"><circle class="ring-trk" cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke-width="${sw}"/><circle class="ring-val" cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${(C * p).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${s / 2} ${s / 2})"/></svg><span class="in">${o.inner || ""}</span></span>`;
  }
  function curve(pts) {
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  }
  function spark(v, W, H, o) {
    o = o || {}; v = (v || []).map(n0); if (v.length < 2) return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"></svg>`;
    const pad = 4, mn = o.min != null ? o.min : Math.min(...v), mx = Math.max(...v), r = mx - mn || 1, id = "g" + Math.random().toString(36).slice(2, 7);
    const pts = v.map((y, i) => [i * (W / (v.length - 1)), pad + (H - pad * 2) * (1 - (y - mn) / r)]), line = curve(pts), last = pts[pts.length - 1];
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" style="color:${o.color || "var(--accent)"}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".28"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><path d="${line} L${W} ${H} L0 ${H} Z" fill="url(#${id})"/><path class="ln" pathLength="1" d="${line}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round"/>${o.dot ? `<circle cx="${last[0]}" cy="${last[1]}" r="3.5" fill="currentColor"/>` : ""}</svg>`;
  }
  function barsSvg(v, W, H, o) {
    o = o || {}; v = (v || []).map(n0); const mx = Math.max(...v, 1), gap = o.gap || 4, bw = W / (v.length || 1);
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" style="color:${o.color || "var(--accent)"}">${v.map((x, i) => { const h = x ? Math.max(3, (H - 2) * x / mx) : 2; return `<rect x="${(i * bw + gap / 2).toFixed(1)}" y="${(H - h).toFixed(1)}" width="${Math.max(2, bw - gap).toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(4, (bw - gap) / 2)}" fill="currentColor" opacity="${(o.hi || []).includes(i) ? 1 : x ? 0.55 : 0.2}"/>`; }).join("")}</svg>`;
  }

  // ---------- cuadros de video de muestra (desenfocados, sin caras dibujadas) ----------
  const STILL = {
    amber: ["#2a160b", "#8a4a1c", "#ffb46a", "#ffd9a8", "#c98a5e"], ocean: ["#06121f", "#173a5c", "#6fb2ff", "#bfe0ff", "#b98c70"], sage: ["#0e140d", "#3f5232", "#cbe2a0", "#f1f7d8", "#c49474"],
    rose: ["#1c0a12", "#6d2340", "#ff8fb1", "#ffd1de", "#c48e78"], smoke: ["#0c0c0d", "#3a3a3e", "#e8e4dc", "#ffffff", "#b88e74"], teal: ["#041311", "#11504b", "#6ff2dc", "#cffff6", "#b48a6e"],
    gold: ["#140f04", "#5b4512", "#ffd36b", "#fff0c2", "#c69a70"], dusk: ["#0d0b1c", "#3b2a5e", "#ff9f7a", "#ffd2b8", "#b98a72"],
  };
  const TONE_KEYS = Object.keys(STILL);
  const toneOf = (key) => TONE_KEYS[hash(key) % TONE_KEYS.length];
  function still(tone, side, fig) {
    const t = STILL[tone] || STILL.amber, id = "s" + Math.random().toString(36).slice(2, 8), sd = side === "r" ? 1 : -1;
    return `<svg class="still" viewBox="0 0 90 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
      <linearGradient id="${id}a" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="${t[1]}"/><stop offset="1" stop-color="${t[0]}"/></linearGradient>
      <radialGradient id="${id}k" cx="${sd > 0 ? .8 : .2}" cy=".3" r=".75"><stop offset="0" stop-color="${t[2]}" stop-opacity=".75"/><stop offset="1" stop-color="${t[2]}" stop-opacity="0"/></radialGradient>
      <radialGradient id="${id}f" cx="${sd > 0 ? .62 : .38}" cy=".4" r=".7"><stop offset="0" stop-color="${t[4]}"/><stop offset="1" stop-color="${t[0]}" stop-opacity=".2"/></radialGradient>
      <filter id="${id}b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.4"/></filter><filter id="${id}bb" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
      <radialGradient id="${id}v" cx=".5" cy=".45" r=".8"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient></defs>
      <rect width="90" height="160" fill="url(#${id}a)"/><rect width="90" height="160" fill="url(#${id}k)"/>
      <g filter="url(#${id}bb)"><circle cx="${45 + sd * 30}" cy="30" r="9" fill="${t[3]}" opacity=".55"/><circle cx="${45 - sd * 28}" cy="22" r="6" fill="${t[2]}" opacity=".45"/><circle cx="${45 + sd * 34}" cy="74" r="7" fill="${t[2]}" opacity=".4"/><circle cx="${45 - sd * 36}" cy="64" r="5" fill="${t[3]}" opacity=".35"/></g>
      ${fig === false ? "" : `<g filter="url(#${id}b)"><path d="M2 160 C6 124 26 112 ${45 + sd * 3} 110 C${66 + sd * 3} 112 84 124 88 160 Z" fill="${t[0]}" opacity=".92"/><ellipse cx="${45 + sd * 3}" cy="76" rx="15" ry="19" fill="url(#${id}f)"/><path d="M${30 + sd * 3} 72 C${29 + sd * 3} 56 ${40 + sd * 3} 53 ${46 + sd * 3} 54 C${56 + sd * 3} 54 ${61 + sd * 3} 60 ${60 + sd * 3} 72 C${55 + sd * 3} 63 ${36 + sd * 3} 63 ${30 + sd * 3} 72Z" fill="${t[0]}" opacity=".85"/></g>`}
      <rect width="90" height="160" fill="url(#${id}v)"/></svg>`;
  }
  // miniatura de una version: poster real si existe, si no un cuadro de muestra con el gancho
  function capHtml(text, n) {
    const words = String(text || "").replace(/\s*\/\s*/g, " ").split(/\s+/).filter(Boolean).slice(0, n || 6);
    return words.map((w, i) => (i === 1 || i === 2 ? `<em>${esc(w)}</em>` : esc(w))).join(" ");
  }
  function vidThumb(v, o) {
    o = o || {}; const poster = v.posterData || v.poster, tone = v.tone || toneOf(v.piece || v.id);
    const media = poster && /^(data:|https?:|\/)/.test(poster) ? `<img src="${esc(poster)}" alt="">` : still(tone, hash(v.id || "") % 2 ? "r" : "l");
    const st = o.status ? `<span class="st" title="${esc(o.status)}">${icon(o.status === "approved" ? "check" : o.status === "rejected" ? "x" : "clock")}</span>` : "";
    return `<span class="vid" style="${o.style || ""}">${media}${o.score != null ? `<span class="sc" style="--c:${o.color || "#0d1b1d"}">${o.score}</span>` : ""}${o.cap === false ? "" : `<span class="cap" style="--cs:${o.cs || 12}px">${capHtml(v.hook || v.pieceName || "", 5)}</span>`}${st}</span>`;
  }

  // ---------- avisos, hojas y modales ----------
  function toast(text, undo, ms) {
    const box = $("#toasts"); if (!box) return;
    const el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status"); el.innerHTML = `<span>${esc(text)}</span>`;
    const kill = () => { el.classList.add("out"); setTimeout(() => el.remove(), 320); };
    if (undo) { const b = document.createElement("button"); b.type = "button"; b.textContent = "Deshacer"; b.onclick = () => { kill(); undo(); }; el.appendChild(b); }
    box.appendChild(el); while (box.children.length > 3) box.firstChild.remove();
    setTimeout(kill, ms || (undo ? 8000 : 3600));
  }
  function overlay(kind, html, onClose) {
    const wrap = document.createElement("div"); wrap.className = kind === "sheet" ? "sheet-wrap" : "modal-wrap";
    wrap.innerHTML = `<div class="veil" data-close></div>` + (kind === "sheet" ? `<div class="sheet lg solid-glass" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>` : `<div class="modal lg solid-glass" role="dialog" aria-modal="true">${html}</div>`);
    const close = () => { wrap.remove(); document.removeEventListener("keydown", esc_); if (onClose) onClose(); };
    const esc_ = (e) => { if (e.key === "Escape") close(); };
    wrap.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) close(); });
    document.addEventListener("keydown", esc_); document.body.appendChild(wrap);
    const f = wrap.querySelector("input,textarea,select,[data-autofocus]"); if (f) f.focus();
    return { el: wrap.querySelector(kind === "sheet" ? ".sheet" : ".modal"), close };
  }
  const modal = (html, onClose) => overlay("modal", html, onClose), sheet = (html, onClose) => overlay("sheet", html, onClose);

  // numeros que cuentan la primera vez que aparecen
  function countUp(root) {
    $$("[data-count]", root).forEach((el) => {
      const to = +el.dataset.count, pre = el.dataset.pre || "", suf = el.dataset.suf || "", compact = el.dataset.compact === "1";
      const show = (v) => (el.textContent = pre + (compact ? fmt(v) : fmtFull(v)) + suf);
      if (reduceMotion() || !Number.isFinite(to) || el.dataset.done || !el.closest(".view[data-enter]")) { show(to); return; }
      el.dataset.done = "1"; const t0 = performance.now(), d = 800;
      const step = (now) => { const k = Math.min(1, (now - t0) / d), e = 1 - Math.pow(1 - k, 3); show(to * e); if (k < 1) requestAnimationFrame(step); else show(to); };
      requestAnimationFrame(step);
    });
  }
  const copyText = async (t) => { try { await navigator.clipboard.writeText(t); return true; } catch (e) { return false; } };

  Object.assign(App, { $, $$, esc, store, debounce, uid, reduceMotion, hash, n0, fmt, fmtFull, pctTxt, MONTHS, DAYS, pad, dayKey, showDate, dayName, ago, plural, mmss, bytes, icon, ring, spark, barsSvg, still, toneOf, vidThumb, capHtml, toast, modal, sheet, countUp, copyText });
})();
