const fs = require("fs");
const path = require("path");

const BASE = "https://dnd.nfuwow.com";
const PAGE_URL = `${BASE}/item/others.html`;
const OUTPUT_PATH = path.join(__dirname, "..", "metaData", "nfu-others-items.json");

const CN_EN_RE =
  /([\u4e00-\u9fff][\u4e00-\u9fffA-Za-z0-9·\s\/、，。：；！？（）\-]{0,40}?)\s*（([A-Za-z][^）]{1,80})）/g;

function parseNfuHtml(html) {
  const byEn = new Map();
  CN_EN_RE.lastIndex = 0;
  let match;
  while ((match = CN_EN_RE.exec(html)) !== null) {
    const zh = match[1].trim();
    const en = match[2].trim();
    byEn.set(en, zh);
  }
  return [...byEn.entries()]
    .map(([en, zh]) => ({ en, zh }))
    .sort((a, b) => a.en.localeCompare(b.en));
}

async function main() {
  const res = await fetch(PAGE_URL, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const items = parseNfuHtml(html);

  const result = {
    source: PAGE_URL,
    fetchedAt: new Date().toISOString(),
    itemCount: items.length,
    items,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2), "utf8");

  console.log(`杂项物品: ${items.length} 条`);
  console.log(`已写入: ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
