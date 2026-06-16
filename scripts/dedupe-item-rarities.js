const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ITEMS_PATH = path.join(ROOT, "src", "locales", "Items.json");
const ITEM_I18N_PATH = path.join(ROOT, "metaData", "item-names-i18n.json");
const MANUAL_ZH_PATH = path.join(ROOT, "metaData", "item-names-manual-zh.json");

const RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
const raritySuffix = new RegExp(` \\((?:${RARITIES.join("|")})\\)$`);
const rarityZhSuffix = /（(?:普通|优秀|稀有|史诗|传奇)）$/;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function collectItemTranslations() {
  const translations = new Map();

  const itemI18n = readJson(ITEM_I18N_PATH);
  for (const item of itemI18n.items) {
    if (item.en && item.zh) translations.set(item.en, item.zh);
  }

  const manualZh = readJson(MANUAL_ZH_PATH);
  for (const [en, zh] of Object.entries(manualZh)) {
    translations.set(en, zh);
  }

  return translations;
}

function getBaseName(key) {
  return key.replace(raritySuffix, "");
}

function isRarityVariant(key) {
  return raritySuffix.test(key);
}

function stripRarityFromZh(zh) {
  return String(zh).replace(rarityZhSuffix, "").trim();
}

function sortEntries(entries) {
  return Object.fromEntries(
    Object.entries(entries).sort(([a], [b]) => a.localeCompare(b, "en"))
  );
}

function dedupeItemEntries(entries, fallbackTranslations) {
  const result = {};
  const variantGroups = new Map();

  for (const [key, value] of Object.entries(entries)) {
    if (!isRarityVariant(key)) {
      result[key] = value;
      continue;
    }

    const base = getBaseName(key);
    if (!variantGroups.has(base)) variantGroups.set(base, []);
    variantGroups.get(base).push({ key, value });
  }

  for (const [base, variants] of variantGroups) {
    if (Object.prototype.hasOwnProperty.call(result, base)) {
      continue;
    }

    if (fallbackTranslations.has(base)) {
      result[base] = fallbackTranslations.get(base);
      continue;
    }

    const preferred = variants.find(({ key }) => key.includes("(Common)")) || variants[0];
    result[base] = stripRarityFromZh(preferred.value);
  }

  return result;
}

function main() {
  const data = readJson(ITEMS_PATH);
  const before = Object.keys(data.entries).length;
  const fallbackTranslations = collectItemTranslations();
  const deduped = dedupeItemEntries(data.entries, fallbackTranslations);

  data.exportedAt = new Date().toISOString();
  data.entries = sortEntries(deduped);
  fs.writeFileSync(ITEMS_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");

  const removed = before - Object.keys(deduped).length;
  console.log(`已合并稀有度变体，移除 ${removed} 条，保留 ${Object.keys(deduped).length} 条`);
}

if (require.main === module) {
  main();
}

module.exports = {
  dedupeItemEntries,
  isRarityVariant,
  getBaseName,
  raritySuffix,
};
