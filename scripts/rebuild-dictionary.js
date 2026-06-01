const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const DICT_JSON_PATH = path.join(ROOT, "src", "locales", "zh-CN.json");
const DICT_JS_PATH = path.join(ROOT, "src", "locales", "zh-CN.js");
const MAP_UI_PATH = path.join(ROOT, "metaData", "map-ui.json");
const LEGACY_MAP_UI_PATH = path.join(ROOT, "src", "locales", "map-ui.js");
const TRANSITION_PATH = path.join(ROOT, "metaData", "transition.json");
const ITEMS_PATH = path.join(ROOT, "metaData", "item-names-i18n.json");
const QUEST_I18N_PATH = path.join(ROOT, "metaData", "quest-i18n.json");

const TRANSITION_CATEGORIES = [
  "map_locations",
  "containers_and_interactables",
  "monsters_and_mobs",
  "herbs_and_ores",
  "traps",
  "items_and_loot",
];

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadTransitionKeys() {
  const transition = readJson(TRANSITION_PATH, {});
  const keys = new Set();
  for (const section of Object.values(transition)) {
    for (const key of Object.keys(section || {})) keys.add(key);
  }
  return keys;
}

function loadItemEntries() {
  const data = readJson(ITEMS_PATH, { items: [] });
  const transitionKeys = loadTransitionKeys();
  const entries = {};
  let skipped = 0;

  for (const { en, zh } of data.items || []) {
    if (!en || !zh) continue;
    if (transitionKeys.has(en)) {
      skipped++;
      continue;
    }
    entries[en] = zh;
  }

  if (skipped) {
    console.log(`物品词条：已跳过 transition.json 中已有的 ${skipped} 条`);
  }

  return entries;
}

function loadTransitionEntries() {
  const transition = readJson(TRANSITION_PATH, {});
  const entries = {};

  for (const key of TRANSITION_CATEGORIES) {
    Object.assign(entries, transition[key] || {});
  }

  return entries;
}

function loadQuestEntries() {
  const data = readJson(QUEST_I18N_PATH, {});
  return data.entries || {};
}

function loadLegacyMapUiFromJs() {
  if (!fs.existsSync(LEGACY_MAP_UI_PATH)) return {};

  const source = fs.readFileSync(LEGACY_MAP_UI_PATH, "utf8");
  const sandbox = { window: {} };
  vm.runInContext(source, vm.createContext(sandbox));
  return sandbox.window.DARKTRANS_MAP_UI || {};
}

function loadMapUiEntries() {
  const fromJson = readJson(MAP_UI_PATH, null);
  if (fromJson && typeof fromJson === "object") {
    return fromJson;
  }

  const legacy = loadLegacyMapUiFromJs();
  if (Object.keys(legacy).length > 0) {
    fs.mkdirSync(path.dirname(MAP_UI_PATH), { recursive: true });
    fs.writeFileSync(MAP_UI_PATH, `${JSON.stringify(legacy, null, 2)}\n`, "utf8");
    console.log(`已从 map-ui.js 迁移 ${Object.keys(legacy).length} 条到 metaData/map-ui.json`);
  }

  return legacy;
}

function mergeDictionary() {
  const entries = {};
  const assign = (obj) => Object.assign(entries, obj || {});

  assign(loadQuestEntries());
  assign(loadItemEntries());
  assign(loadTransitionEntries());
  assign(loadMapUiEntries());

  return entries;
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
 * 由 npm run rebuild-dictionary 从 metaData 源与 zh-CN.json 自动生成，请勿手改
 * 数据源: transition.json / item-names-i18n.json / quest-i18n.json / map-ui.json
 */
(function () {
  window.DARKTRANS_DICTIONARY = ${JSON.stringify(entries)};
})();
`;

  fs.writeFileSync(DICT_JS_PATH, content, "utf8");
}

function main() {
  const entries = mergeDictionary();
  const count = Object.keys(entries).length;

  writeDictionaryJson(entries);
  writeDictionaryJs(entries);

  console.log(`已写入 ${DICT_JSON_PATH}（${count} 条）`);
  console.log(`已写入 ${DICT_JS_PATH}`);
}

module.exports = {
  mergeDictionary,
  writeDictionaryJson,
  writeDictionaryJs,
  DICT_JSON_PATH,
  DICT_JS_PATH,
};

if (require.main === module) {
  main();
}
