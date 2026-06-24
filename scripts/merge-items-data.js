const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ITEMS_DATA_PATH = path.join(ROOT, "src", "locales", "itemsData.json");
const ITEMS_PATH = path.join(ROOT, "src", "locales", "Items.json");
const ZH_CN_PATH = path.join(ROOT, "src", "locales", "zh-CN.json");

/** itemsData 规范键名 -> 历史遗留别名键名 */
const LEGACY_ITEM_ALIASES = {
  "Battle-Worn Armor Fragment": "Battle Worn Armor Fragment",
  "Brand of the Subservient": "Brandofthe Subservient",
  "Hell Hunter's Curved Blade": "Hell Hunters Curved Blade",
  "Seal of Dominion": "Sealof Dominion",
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sortEntries(entries) {
  return Object.fromEntries(
    Object.entries(entries).sort(([a], [b]) => a.localeCompare(b, "en"))
  );
}

function writeLocaleJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function main() {
  const itemsData = readJson(ITEMS_DATA_PATH);
  const items = readJson(ITEMS_PATH);
  const zhCn = readJson(ZH_CN_PATH);

  const itemsDataEntries = itemsData.entries || {};
  const itemsDataKeys = new Set(Object.keys(itemsDataEntries));
  const duplicateKeys = new Set(itemsDataKeys);

  for (const canonical of itemsDataKeys) {
    const legacy = LEGACY_ITEM_ALIASES[canonical];
    if (legacy) duplicateKeys.add(legacy);
  }

  const oldItemsEntries = items.entries || {};
  const oldZhEntries = zhCn.entries || {};

  const removedFromItems = Object.keys(oldItemsEntries).filter((key) =>
    duplicateKeys.has(key)
  );
  const removedFromZh = Object.keys(oldZhEntries).filter((key) =>
    duplicateKeys.has(key)
  );

  const mergedItemsEntries = {
    ...Object.fromEntries(
      Object.entries(oldItemsEntries).filter(([key]) => !duplicateKeys.has(key))
    ),
    ...itemsDataEntries,
  };

  const remainingZhEntries = Object.fromEntries(
    Object.entries(oldZhEntries).filter(([key]) => !duplicateKeys.has(key))
  );

  const mergedItems = {
    version: 1,
    exportedAt: new Date().toISOString(),
    scope: "items",
    source: itemsData.source,
    apiVersion: itemsData.apiVersion,
    patch: itemsData.patch,
    totalItems: itemsData.totalItems,
    uniqueNames: Object.keys(mergedItemsEntries).length,
    entries: sortEntries(mergedItemsEntries),
  };

  const updatedZhCn = {
    ...zhCn,
    exportedAt: new Date().toISOString(),
    scope: "builtin",
    entries: sortEntries(remainingZhEntries),
  };

  writeLocaleJson(ITEMS_PATH, mergedItems);
  writeLocaleJson(ZH_CN_PATH, updatedZhCn);

  console.log(`itemsData 词条: ${itemsDataKeys.size}`);
  console.log(`Items.json 移除重复: ${removedFromItems.length}，合并后: ${Object.keys(mergedItemsEntries).length}`);
  console.log(`zh-CN.json 移除重复: ${removedFromZh.length}，剩余: ${Object.keys(remainingZhEntries).length}`);
}

if (require.main === module) {
  main();
}

module.exports = { main };
