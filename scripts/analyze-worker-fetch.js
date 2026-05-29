const fs = require("fs");
const path = require("path");

const BUNDLE_URL = "https://darkanddarkertracker.com/static/js/main.7fcff60d.js";
const OUT = path.join(__dirname, "..", "temp-main-snippet.js");

async function main() {
  if (!fs.existsSync(OUT)) {
    console.log("Downloading bundle snippet search...");
    const res = await fetch(BUNDLE_URL, { headers: { "User-Agent": "darkTrans/1.0" } });
    const text = await res.text();
    fs.writeFileSync(OUT, text, "utf8");
    console.log("Saved", text.length);
  }
  const bundle = fs.readFileSync(OUT, "utf8");
  const keys = [
    "mapWorkerUtils",
    "Failed to fetch",
    "ShipGraveyard",
    "new Worker",
    "Worker(",
    "onmessage",
  ];
  for (const k of keys) {
    const idx = bundle.indexOf(k);
    console.log(k, idx >= 0 ? idx : "NOT FOUND");
    if (idx >= 0) console.log(bundle.slice(idx - 120, idx + 280).replace(/\n/g, " "));
  }
}

main().catch(console.error);
