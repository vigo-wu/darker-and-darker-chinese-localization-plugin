const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const FILES = [
  { name: "Items.json", path: path.join(ROOT, "src", "locales", "Items.json") },
  { name: "zh-CN.json", path: path.join(ROOT, "src", "locales", "zh-CN.json") },
];

function readEntries(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return data.entries || data;
}

function findDuplicateZh(entries) {
  const byZh = new Map();

  for (const [en, zh] of Object.entries(entries)) {
    const normalized = String(zh).trim();
    if (!normalized) continue;

    if (!byZh.has(normalized)) byZh.set(normalized, []);
    byZh.get(normalized).push(en);
  }

  return [...byZh.entries()]
    .filter(([, ens]) => ens.length > 1)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "zh-CN"));
}

function printDuplicates(label, duplicates) {
  console.log(`\n=== ${label}：${duplicates.length} 组重复中文译名 ===\n`);

  for (const [zh, ens] of duplicates) {
    console.log(`「${zh}」 (${ens.length})`);
    for (const en of ens.sort((a, b) => a.localeCompare(b, "en"))) {
      console.log(`  - ${en}`);
    }
    console.log("");
  }
}

function main() {
  const allEntries = {};

  for (const file of FILES) {
    const entries = readEntries(file.path);
    const duplicates = findDuplicateZh(entries);
    printDuplicates(file.name, duplicates);

    for (const [en, zh] of Object.entries(entries)) {
      allEntries[en] = { zh, source: file.name };
    }
  }

  const mergedByZh = new Map();
  for (const [en, { zh, source }] of Object.entries(allEntries)) {
    const normalized = String(zh).trim();
    if (!normalized) continue;
    if (!mergedByZh.has(normalized)) mergedByZh.set(normalized, []);
    mergedByZh.get(normalized).push({ en, source });
  }

  const crossDuplicates = [...mergedByZh.entries()]
    .filter(([, items]) => items.length > 1)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "zh-CN"));

  console.log(`\n=== 合并后（Items + zh-CN）：${crossDuplicates.length} 组重复中文译名 ===\n`);

  for (const [zh, items] of crossDuplicates) {
    console.log(`「${zh}」 (${items.length})`);
    for (const { en, source } of items.sort((a, b) => a.en.localeCompare(b.en, "en"))) {
      console.log(`  - ${en}  [${source}]`);
    }
    console.log("");
  }
}

main();
