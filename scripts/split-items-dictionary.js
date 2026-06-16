const fs = require("fs");
const path = require("path");
const { dedupeItemEntries } = require("./dedupe-item-rarities");

const ROOT = path.join(__dirname, "..");
const ZH_CN_PATH = path.join(ROOT, "src", "locales", "zh-CN.json");
const ITEMS_PATH = path.join(ROOT, "src", "locales", "Items.json");
const ITEM_I18N_PATH = path.join(ROOT, "metaData", "item-names-i18n.json");
const MANUAL_ZH_PATH = path.join(ROOT, "metaData", "item-names-manual-zh.json");

const RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
const raritySuffix = new RegExp(` \\((?:${RARITIES.join("|")})\\)$`);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeLocaleJson(filePath, entries, scope) {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    scope,
    entries,
  };
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function collectItemNames() {
  const itemNames = new Set();

  const itemI18n = readJson(ITEM_I18N_PATH);
  for (const item of itemI18n.items) {
    if (item.en) itemNames.add(item.en);
  }

  const manualZh = readJson(MANUAL_ZH_PATH);
  for (const name of Object.keys(manualZh)) {
    itemNames.add(name);
  }

  return itemNames;
}

function isItemKey(key, itemNames) {
  if (itemNames.has(key)) return true;
  return raritySuffix.test(key);
}

function sortEntries(entries) {
  return Object.fromEntries(
    Object.entries(entries).sort(([a], [b]) => a.localeCompare(b, "en"))
  );
}

function main() {
  const zhData = readJson(ZH_CN_PATH);
  const entries = zhData.entries;
  const itemNames = collectItemNames();

  const itemEntries = {};
  const remainingEntries = {};

  for (const [key, value] of Object.entries(entries)) {
    if (isItemKey(key, itemNames)) {
      itemEntries[key] = value;
    } else {
      remainingEntries[key] = value;
    }
  }

  writeLocaleJson(ITEMS_PATH, sortEntries(dedupeItemEntries(itemEntries)), "items");
  writeLocaleJson(ZH_CN_PATH, sortEntries(remainingEntries), "builtin");

  console.log(`已移动 ${Object.keys(itemEntries).length} 条物品翻译到 ${ITEMS_PATH}`);
  console.log(`zh-CN.json 剩余 ${Object.keys(remainingEntries).length} 条`);
}

if (require.main === module) {
  main();
}

module.exports = {
  collectItemNames,
  isItemKey,
  ITEMS_PATH,
  ZH_CN_PATH,
};
