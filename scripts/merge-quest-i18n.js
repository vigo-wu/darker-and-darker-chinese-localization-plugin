const fs = require("fs");
const path = require("path");
const { mergeDictionary, writeDictionaryJson, writeDictionaryJs } = require("./rebuild-dictionary");

const QUEST_I18N_PATH = path.join(__dirname, "..", "metaData", "quest-i18n.json");

function main() {
  const data = JSON.parse(fs.readFileSync(QUEST_I18N_PATH, "utf8"));
  const questCount = Object.keys(data.entries || {}).length;
  console.log(`任务词条: ${questCount} 条（数据源: ${data.source || "quest-i18n.json"}）`);

  const entries = mergeDictionary();
  writeDictionaryJson(entries);
  writeDictionaryJs(entries);
  console.log(`已重建 src/locales/zh-CN.json（${Object.keys(entries).length} 条）`);
}

main();
