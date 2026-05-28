const fs = require("fs");
const path = require("path");

const ITEMS_LOCALE_PATH = path.join(
  __dirname,
  "..",
  "src",
  "locales",
  "category",
  "items.js"
);
const ITEMS_PATH = path.join(__dirname, "..", "item-names-i18n.json");

function loadItemEntries() {
  const data = JSON.parse(fs.readFileSync(ITEMS_PATH, "utf8"));
  const entries = {};
  for (const { en, zh } of data.items) {
    if (en && zh) entries[en] = zh;
  }
  return entries;
}

function formatObjectLiteral(entries, indent = "  ") {
  const sorted = Object.entries(entries).sort(([a], [b]) => b.length - a.length);
  return sorted
    .map(([en, zh]) => `${indent}${JSON.stringify(en)}: ${JSON.stringify(zh)}`)
    .join(",\n");
}

function writeItemsLocale(entries) {
  fs.mkdirSync(path.dirname(ITEMS_LOCALE_PATH), { recursive: true });
  const content = `/**
 * 物品名（data.json itemName）英文 -> 简体中文
 * 由 npm run extract-item-names 自动生成，请勿手改
 */
window.DARKTRANS_CATEGORY_ITEMS = {
${formatObjectLiteral(entries)}
};
`;
  fs.writeFileSync(ITEMS_LOCALE_PATH, content, "utf8");
}

const itemEntries = loadItemEntries();
writeItemsLocale(itemEntries);

console.log(`已写入 ${ITEMS_LOCALE_PATH}（${Object.keys(itemEntries).length} 条）`);
console.log("zh-CN.js 入口与 transition 分类请分别维护，运行 npm run merge-transition 更新地图等词条");
