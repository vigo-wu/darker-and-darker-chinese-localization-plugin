const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DICT_JSON_PATH = path.join(ROOT, "src", "locales", "zh-CN.json");
const ITEMS_JSON_PATH = path.join(ROOT, "src", "locales", "Items.json");
const DICT_JS_PATH = path.join(ROOT, "src", "locales", "zh-CN.js");

function readEntries(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (data.entries && typeof data.entries === "object") {
    return data.entries;
  }
  return data;
}

function readMergedEntries() {
  const builtin = readEntries(DICT_JSON_PATH);
  const items = fs.existsSync(ITEMS_JSON_PATH) ? readEntries(ITEMS_JSON_PATH) : {};
  return { ...builtin, ...items };
}

function writeDictionaryJson(entries) {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    scope: "builtin",
    entries,
  };

  fs.mkdirSync(path.dirname(DICT_JSON_PATH), { recursive: true });
  fs.writeFileSync(DICT_JSON_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function writeDictionaryJs(entries) {
  const content = `/**
 * 英文 -> 简体中文 翻译词典
 * 由 npm run rebuild-dictionary 从 zh-CN.json 自动生成，请勿手改
 */
(function () {
  window.DARKTRANS_DICTIONARY = ${JSON.stringify(entries)};
})();
`;

  fs.writeFileSync(DICT_JS_PATH, content, "utf8");
}

function main() {
  const entries = readMergedEntries();
  const count = Object.keys(entries).length;

  writeDictionaryJs(entries);

  console.log(`已写入 ${DICT_JS_PATH}（${count} 条，含物品词典）`);
}

module.exports = {
  readEntries,
  readMergedEntries,
  writeDictionaryJson,
  writeDictionaryJs,
  DICT_JSON_PATH,
  ITEMS_JSON_PATH,
  DICT_JS_PATH,
};

if (require.main === module) {
  main();
}
