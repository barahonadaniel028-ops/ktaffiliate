// Mide cuanto tarda cada cuadro mientras Jarvis se abre y se cierra (y, con "idle", mientras queda abierto). Sirve para comparar ideas de movimiento.
// Uso:  node tools/perf-jarvis.cjs [variantes,separadas,por,coma]      (antes: python3 tools/build.py --local <vendor>)
//   variantes: base (lo que hay) | nogoo | nobd (sin ningun backdrop-filter) | nobdgoo | todas las que agregues abajo
// Ojo: el navegador de pruebas no tiene GPU y va ~4x mas lento que una Mac; sirve para ORDENAR causas (que es lo caro), no para saber los fps reales.
let chromium; try { ({ chromium } = require("playwright")); } catch (e) { ({ chromium } = require("playwright-core")); }
const path = require("node:path"), fs = require("node:fs");
const FILE = "file://" + path.join(__dirname, "..", "dist", "index.local.html") + "?nocel=1&demo=1&preset=kt#hoy";
const exe = process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const VARIANTS = {
  base: "",
  nogoo: ".gooed { filter: none !important; }",
  nobd: "* { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }",
  nobdgoo: "* { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; } .gooed { filter: none !important; }",
  noorb: ".jv-wrap .orb, .jv-wrap .orb::after { animation: none !important; }",
};
(async () => {
  const b = await chromium.launch(fs.existsSync(exe) ? { executablePath: exe, headless: true } : { headless: true });
  for (const name of (process.argv[2] || "base").split(",")) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }), p = await ctx.newPage();
    await p.goto(FILE); await p.waitForSelector(".aura-app"); await p.waitForTimeout(1800);
    if (VARIANTS[name]) await p.addStyleTag({ content: VARIANTS[name] });
    const rec = async (label, act, ms) => {
      await p.evaluate(() => { window.__fr = []; window.__t0 = performance.now(); let last = window.__t0; window.__on = true; (function f(t) { if (!window.__on) return; window.__fr.push([t - window.__t0, t - last]); last = t; requestAnimationFrame(f); })(last); });
      await p.evaluate(act); await p.waitForTimeout(ms);
      const all = (await p.evaluate(() => { window.__on = false; return window.__fr.slice(1); }));
      const ph = (a, z) => { const x = all.filter((f) => f[0] >= a && f[0] < z).map((f) => f[1]); return x.length ? `${(x.reduce((q, c) => q + c, 0) / x.length).toFixed(0)}ms(n${x.length})` : "-"; };
      console.log(`${name.padEnd(8)} ${label.padEnd(6)} 0-300:${ph(0, 300)} 300-700:${ph(300, 700)} 700-1100:${ph(700, 1100)} 1100+:${ph(1100, 1e9)}`);
    };
    await rec("open", () => App.jarvis.open(), 2200); await p.waitForTimeout(400);
    await rec("close", () => App.jarvis.close(), 2200);
    await ctx.close();
  }
  await b.close();
})();
