// Renderiza cada .board de un HTML a PNG. Uso: NODE_PATH=$(npm root -g) node shoot.cjs archivo.html prefijo [escala]
const { chromium } = require("playwright");
const path = require("node:path");
const [file, prefix, scale = "2"] = process.argv.slice(2);
(async () => {
  const exe = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const browser = await chromium.launch(require("node:fs").existsSync(exe) ? { executablePath: exe } : {});
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: +scale });
  await page.goto("file://" + path.resolve(file), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  for (const b of await page.$$(".board")) {
    const out = path.resolve(__dirname, "imagenes", `${prefix}-${await b.getAttribute("id")}.jpg`);
    await b.screenshot({ path: out, type: "jpeg", quality: 92, animations: "disabled" });
    console.log(out);
  }
  await browser.close();
})();
