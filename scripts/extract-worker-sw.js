const BUNDLE = "https://darkanddarkertracker.com/static/js/main.7fcff60d.js";

async function main() {
  const b = await (await fetch(BUNDLE)).text();
  const marker = 'const e=new Blob([SW],{type:"application/javascript"})';
  const idx = b.indexOf(marker);
  // find SW= assignment
  const swAssign = b.lastIndexOf("SW=", idx);
  console.log("SW assign at", swAssign);
  // SW is likely SW="..." or SW='...'
  let start = swAssign + 3;
  const quote = b[start];
  if (quote !== '"' && quote !== "'") {
    console.log("unexpected", b.slice(swAssign, swAssign + 50));
    return;
  }
  start++;
  let escaped = false;
  for (let i = start; i < b.length; i++) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (b[i] === "\\") {
      escaped = true;
      continue;
    }
    if (b[i] === quote) {
      const raw = b.slice(start, i);
      const code = raw.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\'/g, "'");
      console.log("WORKER CODE:\n", code);
      return;
    }
  }
}

main().catch(console.error);
