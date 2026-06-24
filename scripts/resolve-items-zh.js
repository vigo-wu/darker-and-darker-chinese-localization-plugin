const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ITEMS_DATA_PATH = path.join(ROOT, "src", "locales", "itemsData.json");
const ITEMS_JSON_PATH = path.join(ROOT, "src", "locales", "Items.json");
const ZH_CN_PATH = path.join(ROOT, "src", "locales", "zh-CN.json");
const ITEM_I18N_PATH = path.join(ROOT, "metaData", "item-names-i18n.json");
const MANUAL_ZH_PATH = path.join(ROOT, "metaData", "item-names-manual-zh.json");
const NFU_CACHED_PATH = path.join(ROOT, "metaData", "nfu-others-items.json");

/** API 英文名与社区/wiki 数据中的历史命名差异 */
const NAME_ALIASES = {
  "Battle-Worn Armor Fragment": "Battle Worn Armor Fragment",
  "Brand of the Subservient": "Brandofthe Subservient",
  "Hell Hunter's Curved Blade": "Hell Hunters Curved Blade",
  "Seal of Dominion": "Sealof Dominion",
};

/** 第三方站点尚未收录的新物品，按同类物品命名规律补全 */
const INFERRED_TRANSLATIONS = {
  "Huntress' Witness Emblem": "女猎手的见证徽章",
};

const NFU_PAGES = [
  "https://dnd.nfuwow.com/item/others.html",
  "https://dnd.nfuwow.com/item/armor.html",
  "https://dnd.nfuwow.com/item/utility.html",
  "https://dnd.nfuwow.com/item/weapons.html",
  "https://dnd.nfuwow.com/item/accessories.html",
];

const GEM_QUALITIES = [
  "Cracked",
  "Flawed",
  "Normal",
  "Perfect",
  "Royal",
  "Exquisite",
  "Ultimate",
];
const QUALITY_SUFFIX_RE = new RegExp(` \\((?:${GEM_QUALITIES.join("|")})\\)$`);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeName(name) {
  return String(name)
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getBaseName(name) {
  return normalizeName(name).replace(QUALITY_SUFFIX_RE, "");
}

function getLookupKeys(name) {
  const normalized = normalizeName(name);
  const keys = [normalized];
  const alias = NAME_ALIASES[normalized];
  if (alias) keys.push(normalizeName(alias));
  return keys;
}

function addTranslation(map, en, zh, source) {
  const key = normalizeName(en);
  if (!key || !zh) return;
  if (!map.has(key)) {
    map.set(key, { zh: String(zh).trim(), source });
  }
}

function loadLocalSources() {
  const map = new Map();

  if (fs.existsSync(ITEMS_JSON_PATH)) {
    const data = readJson(ITEMS_JSON_PATH);
    for (const [en, zh] of Object.entries(data.entries || {})) {
      addTranslation(map, en, zh, "Items.json");
    }
  }

  if (fs.existsSync(ITEM_I18N_PATH)) {
    const data = readJson(ITEM_I18N_PATH);
    for (const item of data.items || []) {
      addTranslation(map, item.en, item.zh, "item-names-i18n.json");
    }
  }

  if (fs.existsSync(MANUAL_ZH_PATH)) {
    const data = readJson(MANUAL_ZH_PATH);
    for (const [en, zh] of Object.entries(data)) {
      addTranslation(map, en, zh, "item-names-manual-zh.json");
    }
  }

  if (fs.existsSync(NFU_CACHED_PATH)) {
    const data = readJson(NFU_CACHED_PATH);
    for (const item of data.items || []) {
      addTranslation(map, item.en, item.zh, "nfu-others-items.json");
    }
  }

  if (fs.existsSync(ZH_CN_PATH)) {
    const data = readJson(ZH_CN_PATH);
    for (const [en, zh] of Object.entries(data.entries || {})) {
      addTranslation(map, en, zh, "zh-CN.json");
    }
  }

  return map;
}

function parseNfuHtml(html) {
  const items = [];
  const re = /<p>\s*([^（<]+?)\s*（([^）]+)）/g;
  let match;
  while ((match = re.exec(html))) {
    items.push({
      zh: match[1].trim(),
      en: normalizeName(match[2]),
    });
  }
  return items;
}

async function fetchNfuTranslations() {
  const map = new Map();

  for (const pageUrl of NFU_PAGES) {
    const response = await fetch(pageUrl);
    if (!response.ok) {
      console.warn(`NFU 页面请求失败: ${pageUrl} (${response.status})`);
      continue;
    }

    const html = await response.text();
    const items = parseNfuHtml(html);
    for (const item of items) {
      addTranslation(map, item.en, item.zh, "dnd.nfuwow.com");
    }
    console.log(`NFU ${pageUrl} -> ${items.length} 条`);
  }

  return map;
}

async function fetchWikiTranslations() {
  const response = await fetch("https://dnd.wiki/api/equipment/data");
  if (!response.ok) {
    throw new Error(`dnd.wiki 装备数据请求失败 (${response.status})`);
  }

  const json = await response.json();
  const translations = json?.data?.data?.item_translations;
  if (!translations || typeof translations !== "object") {
    throw new Error("dnd.wiki 返回数据缺少 item_translations");
  }

  const map = new Map();
  for (const [en, zh] of Object.entries(translations)) {
    addTranslation(map, en, zh, "dnd.wiki");
  }

  console.log(`dnd.wiki item_translations -> ${map.size} 条`);
  return map;
}

function lookupTranslation(sources, name) {
  const lookupKeys = getLookupKeys(name);

  for (const key of lookupKeys) {
    for (const sourceMap of sources) {
      const direct = sourceMap.get(key);
      if (direct) return direct;
    }
  }

  const base = getBaseName(lookupKeys[0]);
  if (!lookupKeys.includes(base)) {
    for (const sourceMap of sources) {
      const baseHit = sourceMap.get(base);
      if (baseHit) {
        return {
          zh: baseHit.zh,
          source: `${baseHit.source} (base)`,
        };
      }
    }
  }

  return null;
}

async function main() {
  const itemsData = readJson(ITEMS_DATA_PATH);
  const localMap = loadLocalSources();
  const nfuMap = await fetchNfuTranslations();
  const wikiMap = await fetchWikiTranslations();

  const sourcePriority = [wikiMap, nfuMap, localMap];
  const inferredMap = new Map();
  for (const [en, zh] of Object.entries(INFERRED_TRANSLATIONS)) {
    addTranslation(inferredMap, en, zh, "inferred");
  }
  sourcePriority.push(inferredMap);
  const resolvedEntries = {};
  const sourceStats = {};
  const unresolved = [];

  for (const en of Object.keys(itemsData.entries)) {
    const hit = lookupTranslation(sourcePriority, en);
    if (hit) {
      resolvedEntries[en] = hit.zh;
      sourceStats[hit.source] = (sourceStats[hit.source] || 0) + 1;
    } else {
      resolvedEntries[en] = "";
      unresolved.push(en);
    }
  }

  const translatedCount = Object.values(resolvedEntries).filter(Boolean).length;

  itemsData.exportedAt = new Date().toISOString();
  itemsData.translatedCount = translatedCount;
  itemsData.unresolvedCount = unresolved.length;
  itemsData.translationSources = sourceStats;
  itemsData.entries = Object.fromEntries(
    Object.entries(resolvedEntries).sort(([a], [b]) => a.localeCompare(b, "en"))
  );

  fs.writeFileSync(ITEMS_DATA_PATH, `${JSON.stringify(itemsData, null, 2)}\n`, "utf8");

  console.log(`\n已更新 ${ITEMS_DATA_PATH}`);
  console.log(`已匹配 ${translatedCount} / ${Object.keys(resolvedEntries).length} 条`);
  console.log("来源统计:", sourceStats);
  if (unresolved.length) {
    console.log(`\n未匹配 ${unresolved.length} 条:`);
    console.log(unresolved.join("\n"));
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  fetchWikiTranslations,
  fetchNfuTranslations,
  lookupTranslation,
  normalizeName,
};
