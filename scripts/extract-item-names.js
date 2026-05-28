const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "..", "data.json");
const OUTPUT_PATH = path.join(__dirname, "..", "item-names-i18n.json");

const NFU_PAGES = [
  "https://dnd.nfuwow.com/Item/weapons.html",
  "https://dnd.nfuwow.com/item/armor.html",
  "https://dnd.nfuwow.com/item/utility.html",
  "https://dnd.nfuwow.com/item/accessories.html",
  "https://dnd.nfuwow.com/item/others.html",
];

const CN_EN_RE =
  /([\u4e00-\u9fff][\u4e00-\u9fffA-Za-z0-9·\s\/、，。：；！？（）\-]{0,40}?)\s*（([A-Za-z][^）]{1,80})）/g;

function normalizeKey(name) {
  return name
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\sores$/i, " ore")
    .replace(/\scoins$/i, " coin")
    .replace(/frost stone ore/i, "froststone ore")
    .replace(/tide stone ore/i, "tidestone ore")
    .trim();
}

function expandNameCandidates(en) {
  const candidates = new Set([en]);

  let spaced = en
    .replace(/ofthe/gi, " of the ")
    .replace(/\bof([A-Z])/g, " of $1")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  candidates.add(spaced);

  const possessive = (word) =>
    [...candidates].flatMap((name) => [
      name.replace(new RegExp(`\\b${word}s\\b`, "i"), `${word}'s`),
      name.replace(new RegExp(`\\b${word}s\\b`, "i"), `${word}s`),
    ]);
  for (const word of [
    "Warlord",
    "Doctor",
    "Captain",
    "Mermaid",
    "Ship",
    "Yeti",
    "Troll",
    "Cave Troll",
  ]) {
    for (const name of possessive(word)) candidates.add(name);
  }

  const potionMatch = en.match(/^(\w+) Potion$/i);
  if (potionMatch) candidates.add(`Potion of ${potionMatch[1]}`);

  candidates.add(en.replace(/^Potionof\s/i, "Potion of "));

  const tailMatch = en.match(/^Tail [Oo]f (.+)$/);
  if (tailMatch) candidates.add(`${tailMatch[1]} Tail`);

  const tongueMatch = en.match(/^Tongue [Oo]f (.+)$/);
  if (tongueMatch) candidates.add(`${tongueMatch[1]} Tongue`);

  for (const name of [...candidates]) {
    candidates.add(name.replace(/\sOres$/i, " Ore"));
    candidates.add(name.replace(/\sCoins$/i, " Coin"));
    candidates.add(name.replace(/Frost Stone Ore/i, "Froststone Ore"));
    candidates.add(name.replace(/Tide Stone Ore/i, "Tidestone Ore"));
  }

  return [...candidates];
}

function collectItemNames(node, names) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectItemNames(item, names);
    return;
  }
  if (typeof node.itemName === "string" && node.itemName.trim()) {
    names.add(node.itemName.trim());
  }
  for (const key of Object.keys(node)) {
    collectItemNames(node[key], names);
  }
}

function parseNfuHtml(html, map) {
  CN_EN_RE.lastIndex = 0;
  let match;
  while ((match = CN_EN_RE.exec(html)) !== null) {
    const zh = match[1].trim();
    const en = match[2].trim();
    if (!map.has(normalizeKey(en))) {
      map.set(normalizeKey(en), { en, zh });
    }
  }
}

async function fetchNfuDictionary() {
  const map = new Map();
  for (const url of NFU_PAGES) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`跳过 ${url}：HTTP ${res.status}`);
        continue;
      }
      const html = await res.text();
      parseNfuHtml(html, map);
      console.warn(`已解析 ${url}，当前词条 ${map.size}`);
    } catch (err) {
      console.warn(`跳过 ${url}：${err.message}`);
    }
  }
  return map;
}

function lookupZh(en, nfuMap, manualMap) {
  for (const candidate of expandNameCandidates(en)) {
    const hit = nfuMap.get(normalizeKey(candidate));
    if (hit) return hit.zh;
  }
  return manualMap.get(normalizeKey(en)) || "";
}

function loadManualMap() {
  const manualPath = path.join(__dirname, "..", "item-names-manual-zh.json");
  if (!fs.existsSync(manualPath)) return new Map();
  const raw = JSON.parse(fs.readFileSync(manualPath, "utf8"));
  const map = new Map();
  for (const [en, zh] of Object.entries(raw)) {
    map.set(normalizeKey(en), zh);
  }
  return map;
}

async function main() {
  const raw = fs.readFileSync(DATA_PATH, "utf8");
  const data = JSON.parse(raw);

  const names = new Set();
  collectItemNames(data, names);
  const sorted = [...names].sort((a, b) => a.localeCompare(b));

  const nfuMap = await fetchNfuDictionary();
  const manualMap = loadManualMap();

  const items = sorted.map((en) => ({
    en,
    zh: lookupZh(en, nfuMap, manualMap),
  }));

  const missing = items.filter((item) => !item.zh);
  if (missing.length) {
    console.warn(`未匹配中文译名 ${missing.length} 条，zh 留空`);
  }

  const output = {
    meta: {
      source: "data.json",
      total: items.length,
      translated: items.length - missing.length,
      missing: missing.length,
      generatedAt: new Date().toISOString(),
    },
    items,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf8");
  console.log(`已写入 ${OUTPUT_PATH}（${items.length} 条）`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
