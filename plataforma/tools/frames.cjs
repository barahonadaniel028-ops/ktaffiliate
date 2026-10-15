// Graba una animacion cuadro por cuadro (screencast de Chrome, sin ffmpeg) y deja los .jpg con su tiempo en el nombre. Despues: python3 tools/sheet.py <carpeta> <salida.png> <desde_ms> <hasta_ms> [columnas]
// Uso:  node tools/frames.cjs jarvis [carpeta]     (abre Jarvis desde la barra y lo cierra con Esc)    |    node tools/frames.cjs crear [carpeta]  (entra a Crear desde Hoy)
let chromium; try { ({ chromium } = require("playwright")); } catch (e) { ({ chromium } = require("playwright-core")); }
const path = require("node:path"), fs = require("node:fs");
const FILE = "file://" + path.join(__dirname, "..", "dist", "index.local.html") + "?nocel=1&demo=1&preset=kt#hoy";
const exe = process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const action = process.argv[2] || "jarvis", out = path.resolve(process.argv[3] || path.join(__dirname, "..", "capturas", "_tmp", "frames"));
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(fs.existsSync(exe) ? { executablePath: exe, headless: true } : { headless: true });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }), p = await ctx.newPage();
  await p.goto(FILE); await p.waitForSelector(".aura-app"); await p.waitForTimeout(2500);
  const cdp = await ctx.newCDPSession(p), frames = [];
  cdp.on("Page.screencastFrame", async (f) => { frames.push({ t: f.metadata.timestamp, d: f.data }); try { await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }); } catch (e) { /* cerrada */ } });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 60, maxWidth: 640, maxHeight: 400, everyNthFrame: 1 });
  await p.waitForTimeout(300);
  if (action === "jarvis") { await p.click(".topbar .ask"); await p.waitForTimeout(2600); await p.keyboard.press("Escape"); await p.waitForTimeout(2400); }
  else if (action === "crear") { await p.evaluate(() => { location.hash = "#crear"; }); await p.waitForTimeout(3000); }
  await cdp.send("Page.stopScreencast");
  const t0 = frames[0].t; frames.forEach((f, i) => fs.writeFileSync(path.join(out, `f${String(i).padStart(3, "0")}_${Math.round((f.t - t0) * 1000)}.jpg`), Buffer.from(f.d, "base64")));
  console.log(frames.length, "cuadros en", out); await b.close();
})();
