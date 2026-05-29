const urls = [
  "https://darkanddarkertracker.com/ProcessedModules/ShipGraveyard/ShipGraveyard.json",
  "https://darkanddarkertracker.com/ProcessedModules/map_manifest.json",
  "https://darkanddarkertracker.com/ProcessedModules/Cave/Cave.json",
];

async function main() {
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "darkTrans/1.0" } });
      const text = await res.text();
      console.log(url, "->", res.status, text.length, "bytes");
    } catch (e) {
      console.error(url, "-> FAIL", e.message);
    }
  }
}

main();
