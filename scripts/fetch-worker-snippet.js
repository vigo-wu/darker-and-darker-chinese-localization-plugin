const BUNDLE = "https://darkanddarkertracker.com/static/js/main.7fcff60d.js";

async function main() {
  const res = await fetch(BUNDLE, { headers: { "User-Agent": "darkTrans/1.0" } });
  const b = await res.text();
  for (const pat of ["new Worker", "mapWorker", "mapWorkerUtils", "Worker("]) {
    let i = 0;
    let n = 0;
    while (n < 3) {
      i = b.indexOf(pat, i);
      if (i < 0) break;
      console.log("\n", pat, "@", i, b.slice(i, i + 200));
      i += pat.length;
      n++;
    }
  }
}

main().catch(console.error);
