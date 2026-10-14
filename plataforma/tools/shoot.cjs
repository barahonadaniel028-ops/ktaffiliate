// Capturas y pruebas de humo de Aura con Playwright.
// Uso: NODE_PATH=$(npm root -g) node plataforma/tools/shoot.cjs [--smoke] [--out DIR] [--only a,b] [--preset kt|lumen]
const { chromium } = require("playwright");
const path = require("node:path"), fs = require("node:fs");
const args = process.argv.slice(2), has = (f) => args.includes(f), val = (f, d) => (args.includes(f) ? args[args.indexOf(f) + 1] : d);
const root = path.resolve(__dirname, ".."), out = path.resolve(val("--out", path.join(root, "capturas"))), only = val("--only", "").split(",").filter(Boolean), preset = val("--preset", "kt");
const page_ = "file://" + path.join(root, "dist", "index.local.html");
fs.mkdirSync(out, { recursive: true });
const ROUTES = [["hoy", "hoy"], ["aprobar", "aprobar"], ["revision", "aprobar/ver/__FIRST__"], ["agendados", "aprobar/agendados"], ["crear", "crear"], ["subir", "crear/subir"], ["biblioteca", "biblioteca"], ["laboratorio", "laboratorio"], ["ronda", "laboratorio/ronda"], ["referencia", "laboratorio/ref/r3"], ["semilla", "laboratorio/semilla/neon"], ["estilos", "laboratorio/estilos"], ["metricas", "metricas"], ["logros", "logros"], ["notas", "notas"], ["estudio", "estudio"], ["editor", "estudio/__EDIT__"], ["ajustes", "ajustes"]];
(async () => {
  const exe = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const browser = await chromium.launch(fs.existsSync(exe) ? { executablePath: exe, args: ["--autoplay-policy=no-user-gesture-required"] } : {});
  const errors = [];
  const run = async (name, viewport, theme, mobile) => {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: mobile ? 2 : 1.25, isMobile: !!mobile, hasTouch: !!mobile, colorScheme: theme === "night" ? "dark" : "light" });
    const page = await ctx.newPage();
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning" && /Uncaught|Error/.test(m.text())) errors.push(`[${name}] console ${m.type()}: ${m.text().slice(0, 300)}`); });
    page.on("pageerror", (e) => errors.push(`[${name}] pageerror: ${e.message.slice(0, 300)}`));
    await page.goto(page_ + `?preset=${preset}&demo=1&nocel=1#hoy`, { waitUntil: "load" });
    await page.waitForFunction(() => window.App && window.App.S && window.App.S.ready && window.App.S.ready.videos, null, { timeout: 8000 }).catch(() => errors.push(`[${name}] datos no cargaron`));
    await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(1300);
    const ids = await page.evaluate(() => { const S = App.S; const first = S.videos.find((v) => !v.published && (!v.status || v.status === "pending")); const edit = S.studioVersions.find((x) => x.spec); return { first: first && first.id, edit: edit && edit.id }; });
    for (const [label, route] of ROUTES) {
      if (only.length && !only.includes(label)) continue;
      const r = route.replace("__FIRST__", encodeURIComponent(ids.first || "x")).replace("__EDIT__", encodeURIComponent(ids.edit || ids.first || "x"));
      await page.evaluate((h) => { location.hash = h; }, "#" + r); await page.waitForTimeout(label === "editor" ? 1800 : label === "revision" ? 1200 : 900);
      if (label === "logros") await page.waitForTimeout(1600);
      if (label === "editor") { await page.evaluate(() => { const st = window.App && App.st; if (st && st.SE) { st.seek(1.6); } }); await page.waitForTimeout(500); }
      await page.screenshot({ path: path.join(out, `${name}-${label}.jpg`), type: "jpeg", quality: 82 });
    }
    // Jarvis abierto
    if (!only.length || only.includes("jarvis")) {
      await page.evaluate(() => { location.hash = "#hoy"; }); await page.waitForTimeout(700);
      await page.evaluate(() => App.jarvis.open(document.querySelector(".orb[data-orb]"))); await page.waitForTimeout(1200);
      await page.fill("#jvbox", "que tengo pendiente").catch(() => {}); await page.keyboard.press("Enter"); await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(out, `${name}-jarvis.jpg`), type: "jpeg", quality: 82 });
    }
    await ctx.close();
  };
  if (has("--smoke")) { await run("smoke", { width: 1440, height: 900 }, "day"); }
  else if (only.length || has("--all")) {
    await run("dia-escritorio", { width: 1440, height: 900 }, "day"); await run("noche-escritorio", { width: 1440, height: 900 }, "night");
    await run("dia-movil", { width: 390, height: 844 }, "day", true); await run("noche-movil", { width: 390, height: 844 }, "night", true);
  } else { await run("dia-escritorio", { width: 1440, height: 900 }, "day"); }
  await browser.close();
  console.log(errors.length ? "ERRORES:\n" + [...new Set(errors)].join("\n") : "sin errores");
})();
