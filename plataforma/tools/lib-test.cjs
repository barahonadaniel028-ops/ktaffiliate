// Ayudas compartidas para las pruebas extra de Aura (tools/test-*.cjs). Cada archivo extra es independiente: `node tools/test-empieza.cjs`.
// Necesita `python3 tools/build.py --local <vendor>` hecho antes (dist/index.local.html). Chromium: env CHROME o el de Playwright.
let chromium; try { ({ chromium } = require("playwright")); } catch (e) { ({ chromium } = require("playwright-core")); }
const path = require("node:path"), fs = require("node:fs");
const root = path.resolve(__dirname, ".."), file = "file://" + path.join(root, "dist", "index.local.html");
const exe = process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
let pass = 0, fail = 0; const failures = [];
const ok = (cond, name, extra) => { if (cond) { pass++; console.log("  ok  ", name); } else { fail++; failures.push(name + (extra ? " -> " + extra : "")); console.log("  FALLA", name, extra || ""); } };
const wait = (p, ms) => p.waitForTimeout(ms);
// la nube de Crear/Notas flota sin parar y Playwright espera que lo que toca este quieto: se congela en todas las pruebas
const FREEZE = ".crear-cloud.jv, .nt-float, .nt-cloud { animation: none !important; }";
async function launch() { return chromium.launch(fs.existsSync(exe) ? { executablePath: exe, args: ["--autoplay-policy=no-user-gesture-required"] } : {}); }
// abre la app (modo demostracion, sin celebracion automatica de hitos). `init` es un script que corre antes de la pagina (p. ej. para simular window.claude)
async function open(browser, query, init, viewport) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 1440, height: 900 } }); if (init) await ctx.addInitScript(init);
  await ctx.addInitScript((css) => { document.addEventListener("DOMContentLoaded", () => { const st = document.createElement("style"); st.id = "__nofloat"; st.textContent = css; document.head.appendChild(st); }); }, FREEZE);
  const page = await ctx.newPage(); const errs = []; page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.errs = errs; await page.goto(file + (query || "?demo=1&preset=kt").replace("?", "?nocel=1&"), { waitUntil: "load" });
  await page.waitForFunction(() => window.App && App.S.ready && App.S.ready.videos, null, { timeout: 8000 }).catch(() => {}); await wait(page, 900); return page;
}
async function nav(p, hash, ms) { await p.evaluate((h) => { location.hash = h; }, hash.startsWith("#") ? hash : "#" + hash); await wait(p, ms || 600); }
function done(label) { console.log(`\n${label}: ${pass} ok, ${fail} fallan`); if (fail) { console.log(failures.join("\n")); process.exit(1); } process.exit(0); }
module.exports = { launch, open, nav, ok, wait, done, root, file };
