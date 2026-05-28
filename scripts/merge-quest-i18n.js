const fs = require("fs");
const path = require("path");

const QUEST_I18N_PATH = path.join(__dirname, "..", "metaData", "quest-i18n.json");
const OUTPUT_PATH = path.join(
  __dirname,
  "..",
  "src",
  "locales",
  "category",
  "quests.js"
);

function formatObjectLiteral(entries) {
  return Object.entries(entries)
    .sort(([a], [b]) => b.length - a.length)
    .map(([en, zh]) => `  ${JSON.stringify(en)}: ${JSON.stringify(zh)}`)
    .join(",\n");
}

function main() {
  const data = JSON.parse(fs.readFileSync(QUEST_I18N_PATH, "utf8"));
  const entries = data.entries || {};
  const content = `/**
 * 任务追踪页（questtracker）英文 -> 简体中文
 * 由 npm run merge-quest-i18n 自动生成，请勿手改
 * 数据源: ${data.source || "quest-i18n.json"}
 */
window.DARKTRANS_CATEGORY_QUESTS = {
${formatObjectLiteral(entries)}
};
`;

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, content, "utf8");
  console.log(`已写入 ${OUTPUT_PATH}（${Object.keys(entries).length} 条）`);
}

main();
