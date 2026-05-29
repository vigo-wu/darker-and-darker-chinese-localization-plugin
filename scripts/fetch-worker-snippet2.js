const BUNDLE = "https://darkanddarkertracker.com/static/js/main.7fcff60d.js";

async function main() {
  const b = await (await fetch(BUNDLE)).text();
  const idx = b.indexOf("new Worker(URL.createObjectURL");
  console.log(b.slice(idx - 500, idx + 1200));
  const mw = b.indexOf("mapWorkerUtils");
  console.log("\nmapWorkerUtils", mw, b.slice(mw - 100, mw + 600));
}

main().catch(console.error);
