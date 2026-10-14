/* Kit compartido de los mockups: iconos de trazo, graficos chicos y cuadros de video de muestra.
   Todo se dibuja en el navegador a partir de atributos data-*, asi el HTML de cada propuesta queda legible. */
(function () {
  const I = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 16v-4M12 16V8M17 16v-7"/>',
    trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    dollar: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    flask: '<path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7 15h10"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5"/>',
    sparkles: '<path d="M12 3l1.8 4.6 4.7 1.9-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.9z"/><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    play: '<path d="M7 4v16l13-8z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    chevdown: '<path d="m6 9 6 6 6-6"/>',
    chevleft: '<path d="m15 6-6 6 6 6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    out: '<path d="M7 17 17 7M8 7h9v9"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    film: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 7.5h4M3 12h18M3 16.5h4M17 7.5h4M17 16.5h4"/>',
    send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    command: '<path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    flag: '<path d="M4 22V4M4 4h13l-2 4 2 4H4"/>',
    volume: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
    scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/>',
    type: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
    keyboard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M8 16h8"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    wand: '<path d="m15 4 5 5L9 20H4v-5z"/><path d="m13 6 5 5"/>',
    home2: '<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/>',
  };
  const icon = (n, cls) => `<svg class="ic ${cls || ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || ""}</svg>`;

  // curva suave (Catmull-Rom a Bezier) para sparklines y areas
  function curve(pts) {
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  }
  function spark(el) {
    const v = el.dataset.spark.split(",").map(Number), W = +(el.dataset.w || 200), H = +(el.dataset.h || 48), pad = +(el.dataset.pad || 3);
    const mn = el.dataset.min != null ? +el.dataset.min : Math.min(...v), mx = Math.max(...v), r = mx - mn || 1;
    const pts = v.map((y, i) => [i * (W / (v.length - 1)), pad + (H - pad * 2) * (1 - (y - mn) / r)]);
    const line = curve(pts), area = `${line} L${W} ${H} L0 ${H} Z`, last = pts[pts.length - 1];
    const id = "g" + Math.random().toString(36).slice(2, 8);
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="${el.dataset.fill || ".22"}"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>
      <path d="${area}" fill="url(#${id})"/><path d="${line}" fill="none" stroke="currentColor" stroke-width="${el.dataset.sw || 1.6}" vector-effect="non-scaling-stroke" stroke-linecap="round"/>
      ${el.dataset.dot ? `<circle cx="${last[0]}" cy="${last[1]}" r="${el.dataset.dot}" fill="currentColor"/>` : ""}</svg>`;
  }
  function bars(el) {
    const v = el.dataset.bars.split(",").map(Number), W = +(el.dataset.w || 300), H = +(el.dataset.h || 60), gap = +(el.dataset.gap || 3), mx = Math.max(...v) || 1, bw = W / v.length;
    const hi = el.dataset.hi ? el.dataset.hi.split(",").map(Number) : [];
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${v.map((x, i) => { const h = x ? Math.max(2, (H - 2) * x / mx) : 1.5; return `<rect class="${hi.includes(i) ? "hi" : ""}${x ? "" : " zero"}" x="${(i * bw + gap / 2).toFixed(1)}" y="${(H - h).toFixed(1)}" width="${(bw - gap).toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(2, (bw - gap) / 2)}"/>`; }).join("")}</svg>`;
  }
  function ring(el) {
    const p = Math.max(0, Math.min(1, +el.dataset.ring)), r = +(el.dataset.r || 42), sw = +(el.dataset.sw || 6), C = 2 * Math.PI * r, s = r * 2 + sw * 2;
    el.innerHTML = `<svg viewBox="0 0 ${s} ${s}" aria-hidden="true"><circle class="ring-trk" cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke-width="${sw}"/><circle class="ring-val" cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${(C * p).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${s / 2} ${s / 2})"/></svg>` + el.innerHTML;
  }

  // cuadro de video de muestra: un talking head estilizado con subtitulo estilo Reels
  const TONES = {
    warm: { a: "#1c120c", b: "#6b4428", key: "#ffb877", suit: "#141317", shirt: "#d9d2c6", skin: "#c4906b", hair: "#2a1d16", bok: ["#ffb35c", "#ff8a3d", "#ffd59a"] },
    cool: { a: "#0a111d", b: "#2b4466", key: "#9cc6ff", suit: "#121620", shirt: "#c9d4e2", skin: "#b98a6c", hair: "#1d1a18", bok: ["#5d9bff", "#9ad0ff", "#3f6fd1"] },
    olive: { a: "#10140d", b: "#4b5530", key: "#e8e1a0", suit: "#17181a", shirt: "#e0dccd", skin: "#c09070", hair: "#251b14", bok: ["#d9cf7a", "#9bab52", "#f2e6a6"] },
    rose: { a: "#1a0e14", b: "#5e2e43", key: "#ffa9c1", suit: "#151216", shirt: "#e6d6da", skin: "#c48e72", hair: "#22171a", bok: ["#ff7aa2", "#ffb3c7", "#c84f78"] },
    studio: { a: "#0d0d0e", b: "#3a3a3d", key: "#f1ede6", suit: "#1a1a1d", shirt: "#ebe7df", skin: "#c39274", hair: "#231c18", bok: ["#d8d2c8", "#8f8a82", "#f5efe4"] },
    teal: { a: "#081413", b: "#1f4b4a", key: "#8ff0df", suit: "#121617", shirt: "#d2e2df", skin: "#bb8d6e", hair: "#1e1915", bok: ["#4fd1c0", "#a5f2e6", "#2c8f86"] },
  };
  function wrap(words, max) {
    const lines = [[]]; let n = 0;
    words.forEach((w) => { if (n + w.length > max && lines[lines.length - 1].length) { lines.push([]); n = 0; } lines[lines.length - 1].push(w); n += w.length + 1; });
    return lines;
  }
  function frame(el) {
    const t = TONES[el.dataset.tone] || TONES.warm, cap = el.dataset.cap || "", hl = (el.dataset.hl || "").split(",").map(Number), id = "f" + Math.random().toString(36).slice(2, 8);
    const pose = +(el.dataset.pose || 0), hx = 45 + pose * 4;
    let k = 0;
    const lines = wrap(cap.split(" "), +(el.dataset.max || 15)).slice(0, 4);
    const capY = +(el.dataset.cy || 116) - (lines.length - 1) * 4.6;
    const text = cap ? lines.map((ln, li) => `<text x="45" y="${(capY + li * 9.4).toFixed(1)}" text-anchor="middle">${ln.map((w) => { const on = hl.includes(k++); return `<tspan${on ? ' fill="#ffe14d"' : ""}>${w.replace(/&/g, "&amp;").replace(/</g, "&lt;")} </tspan>`; }).join("")}</text>`).join("") : "";
    el.innerHTML = `<svg viewBox="0 0 90 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="${id}bg" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="${t.b}"/><stop offset="1" stop-color="${t.a}"/></linearGradient>
        <radialGradient id="${id}k" cx="${pose > 0 ? .22 : .78}" cy=".28" r=".7"><stop offset="0" stop-color="${t.key}" stop-opacity=".55"/><stop offset="1" stop-color="${t.key}" stop-opacity="0"/></radialGradient>
        <radialGradient id="${id}face" cx="${pose > 0 ? .35 : .62}" cy=".38" r=".75"><stop offset="0" stop-color="${t.skin}"/><stop offset=".7" stop-color="${t.skin}" stop-opacity=".92"/><stop offset="1" stop-color="#3a2418"/></radialGradient>
        <linearGradient id="${id}suit" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${t.suit}"/><stop offset="${pose > 0 ? .3 : .7}" stop-color="${t.suit}" stop-opacity=".85"/><stop offset="1" stop-color="#000"/></linearGradient>
        <radialGradient id="${id}v" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient>
        <filter id="${id}b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.2"/></filter>
        <filter id="${id}s" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.2"/></filter>
      </defs>
      <rect width="90" height="160" fill="url(#${id}bg)"/>
      <g filter="url(#${id}b)" opacity=".85">
        <rect x="${pose > 0 ? 60 : 4}" y="14" width="24" height="60" rx="2" fill="${t.bok[2]}" opacity=".18"/>
        <circle cx="${pose > 0 ? 70 : 16}" cy="38" r="7" fill="${t.bok[0]}" opacity=".55"/>
        <circle cx="${pose > 0 ? 18 : 74}" cy="26" r="5" fill="${t.bok[1]}" opacity=".5"/>
        <circle cx="${pose > 0 ? 78 : 10}" cy="70" r="4" fill="${t.bok[2]}" opacity=".45"/>
        <circle cx="${pose > 0 ? 8 : 82}" cy="62" r="6" fill="${t.bok[0]}" opacity=".35"/>
      </g>
      <rect width="90" height="160" fill="url(#${id}k)"/>
      <g transform="translate(45 160) scale(1.2) translate(-45 -160)">
      <g filter="url(#${id}s)" opacity=".5"><ellipse cx="${hx}" cy="150" rx="40" ry="16" fill="#000"/></g>
      <path d="M8 160 C10 128 27 117 ${hx} 115 C${hx + 18} 117 80 128 82 160 Z" fill="url(#${id}suit)"/>
      <path d="M${hx - 8} 116 L${hx} 136 L${hx + 8} 116 Z" fill="${t.shirt}" opacity=".9"/>
      <path d="M${hx - 2.2} 118 L${hx} 132 L${hx + 2.2} 118 Z" fill="#5a1f22" opacity=".85"/>
      <path d="M${hx - 13} 117 L${hx - 3} 140 L${hx - 9} 160 M${hx + 13} 117 L${hx + 3} 140 L${hx + 9} 160" stroke="#000" stroke-opacity=".35" stroke-width="1" fill="none"/>
      <rect x="${hx - 5.5}" y="98" width="11" height="19" rx="4" fill="${t.skin}" opacity=".75"/>
      <g transform="translate(0 3.5)"><ellipse cx="${hx}" cy="84" rx="13.2" ry="16.5" fill="url(#${id}face)"/>
      <ellipse cx="${hx - 13}" cy="86" rx="2" ry="3.6" fill="${t.skin}" opacity=".8"/><ellipse cx="${hx + 13}" cy="86" rx="2" ry="3.6" fill="${t.skin}" opacity=".7"/>
      <g fill="none" stroke="#2a1810" stroke-linecap="round" opacity=".55"><path d="M${hx - 8} 80.6 Q${hx - 5} 79.2 ${hx - 2.2} 80.4M${hx + 2.2} 80.4 Q${hx + 5} 79.2 ${hx + 8} 80.6" stroke-width=".9"/><path d="M${hx - 3} 94.5 Q${hx} 95.1 ${hx + 3} 94.6" stroke-width=".7"/><path d="M${hx} 84 L${hx - .8} 90 L${hx + .8} 90.4" stroke-width=".5" opacity=".6"/></g>
      <g fill="#1a0f0a" opacity=".7"><ellipse cx="${hx - 5}" cy="84" rx="1.3" ry=".9"/><ellipse cx="${hx + 5}" cy="84" rx="1.3" ry=".9"/></g>
      <path d="M${hx - 13.6} 84 C${hx - 15} 66 ${hx - 4} 63 ${hx + 1} 64 C${hx + 11} 64 ${hx + 15} 71 ${hx + 13.4} 84 C${hx + 12} 76 ${hx + 6} 72 ${hx} 73 C${hx - 6} 73 ${hx - 11} 77 ${hx - 13.6} 84 Z" fill="${t.hair}"/></g>
      </g>
      <rect width="90" height="160" fill="url(#${id}v)"/>
      <g font-family="'Montserrat','Archivo',system-ui,sans-serif" font-weight="800" font-size="7.4" fill="#fff" stroke="#000" stroke-width="1.6" stroke-linejoin="round" paint-order="stroke" letter-spacing="-.1">${text}</g>
    </svg>`;
  }

  window.KIT = { icon };
  document.querySelectorAll("[data-i]").forEach((el) => { el.outerHTML = icon(el.dataset.i, el.className); });
  document.querySelectorAll("[data-spark]").forEach(spark);
  document.querySelectorAll("[data-bars]").forEach(bars);
  document.querySelectorAll("[data-ring]").forEach(ring);
  document.querySelectorAll("[data-frame]").forEach(frame);
  document.documentElement.classList.add("kit-ready");
})();
