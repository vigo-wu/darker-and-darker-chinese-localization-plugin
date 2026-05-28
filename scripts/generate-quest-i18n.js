const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const STRINGS_PATH = path.join(ROOT, "temp-quest-strings.txt");
const UI_PATH = path.join(ROOT, "temp-quest-ui-strings.txt");
const MANUAL_PATH = path.join(ROOT, "metaData", "quest-manual-zh.json");
const OUTPUT_PATH = path.join(ROOT, "metaData", "quest-i18n.json");
const QUESTS_RAW_PATH = path.join(ROOT, "temp-quests-raw.json");

const RARITY_ZH = {
  Common: "普通",
  Uncommon: "非普通",
  Rare: "稀有",
  Epic: "史诗",
  Legendary: "传奇",
  Unique: "独特",
};

const MAP_ZH = {
  Ruins: "遗忘城堡废墟",
  Crypts: "地穴",
  Inferno: "炼狱",
  "Ice Cavern": "冰穴",
  "Goblin Caves": "哥布林洞穴",
  "Ship Graveyard": "船坟场",
  "Ice Abyss": "冰渊",
  ruins: "遗忘城堡废墟",
  crypts: "地穴",
  inferno: "炼狱",
  goblincaves: "哥布林洞穴",
  icecavern: "冰穴",
  iceabyss: "冰渊",
  shipgraveyard: "船坟场",
  any: "任意",
};

const MERCHANT_ZH = {
  Alchemist: "炼金术士",
  Armourer: "护甲匠",
  Cockatrice: "鸡蛇兽",
  "Goblin Merchant": "地精商人",
  Goldsmith: "金匠",
  Leathersmith: "皮匠",
  Squire: "侍从",
  Tailor: "裁缝",
  "Tavern Master": "酒馆老板",
  "The Collector": "收藏家",
  Weaponsmith: "武器匠",
  Woodsman: "樵夫",
};

const TERM_ZH = {
  Experience: "经验",
  Affinity: "亲和力",
  "Gold Coins": "金币",
  "Additional Stash Tab": "额外仓库页",
  Emote: "表情",
  ItemSkin: "物品皮肤",
  Action: "动作",
  Interact: "交互",
  Destroy: "销毁",
  Armor: "护甲",
  Accessory: "配饰",
  Undead: "亡灵",
  Goblin: "哥布林",
  Skeleton: "骷髅",
  Altar: "祭坛",
  "Centaur Demon": "半人马恶魔",
  Large: "大型",
  Small: "小型",
  Abomination: "憎恶者",
  Pot: "罐子",
  Hoard: "宝藏",
  Legend: "传奇",
  ...RARITY_ZH,
  ...MAP_ZH,
  ...MERCHANT_ZH,
};

function loadExistingDictionary() {
  const dict = {};
  const add = (obj) => {
    for (const [k, v] of Object.entries(obj || {})) {
      if (k && v) dict[k] = v;
    }
  };

  const transition = JSON.parse(
    fs.readFileSync(path.join(ROOT, "metaData", "transition.json"), "utf8")
  );
  for (const section of Object.values(transition)) add(section);

  const items = JSON.parse(
    fs.readFileSync(path.join(ROOT, "metaData", "item-names-i18n.json"), "utf8")
  ).items;
  for (const { en, zh } of items) {
    if (en && zh) dict[en] = zh;
  }

  add(
    JSON.parse(fs.readFileSync(path.join(ROOT, "metaData", "item-names-manual-zh.json"), "utf8"))
  );

  const ui = {
    "Ruins of Forgotten Castle": "城堡一层",
    Crypts: "城堡二层",
    Inferno: "城堡三层",
    "Goblin Cave": "哥布林洞穴一层",
    Firedeep: "哥布林洞穴二层",
    "Frost Mountain": "冰霜山脉一层",
    "Ice Abyss": "冰霜山脉二层",
    "Ship Graveyard": "蔚蓝漩涡",
  };
  add(ui);
  add(TERM_ZH);
  add(MERCHANT_ZH);
  add(MAP_ZH);

  return dict;
}

function normalizeApostrophe(text) {
  return text.replace(/\uFFFD/g, "'");
}

function translateWithRarity(name, dict) {
  if (dict[name]) return dict[name];

  const match = name.match(/^(.+?) \((Common|Uncommon|Rare|Epic|Legendary|Unique)\)$/);
  if (match) {
    const [, base, rarity] = match;
    const baseZh = dict[base] || translateWithRarity(base, dict) || base;
    return `${baseZh}（${RARITY_ZH[rarity]}）`;
  }

  return null;
}

function loadManual() {
  const fromModule = require("./quest-manual-zh-data.js");
  let fromFile = {};
  if (fs.existsSync(MANUAL_PATH)) {
    fromFile = JSON.parse(fs.readFileSync(MANUAL_PATH, "utf8"));
  }
  return { ...fromModule, ...fromFile };
}

function loadStrings() {
  const questStrings = fs
    .readFileSync(STRINGS_PATH, "utf8")
    .split(/\r?\n/)
    .filter(Boolean);
  const uiStrings = fs.existsSync(UI_PATH)
    ? fs.readFileSync(UI_PATH, "utf8").split(/\r?\n/).filter(Boolean)
    : [];
  return [...new Set([...questStrings, ...uiStrings])].sort((a, b) =>
    a.localeCompare(b)
  );
}

function buildEntries(allStrings, existing, manual) {
  const entries = {};
  const missing = [];

  for (const raw of allStrings) {
    const candidates = [raw, normalizeApostrophe(raw)];
    let zh = null;

    for (const key of candidates) {
      if (manual[key]) {
        zh = manual[key];
        break;
      }
      if (existing[key]) {
        zh = existing[key];
        break;
      }
      zh = translateWithRarity(key, existing) || translateWithRarity(key, manual);
      if (zh) break;
      if (MERCHANT_ZH[key]) {
        zh = MERCHANT_ZH[key];
        break;
      }
      if (MAP_ZH[key]) {
        zh = MAP_ZH[key];
        break;
      }
      if (TERM_ZH[key]) {
        zh = TERM_ZH[key];
        break;
      }
    }

    if (zh) entries[raw] = zh;
    else missing.push(raw);
  }

  return { entries, missing };
}

function main() {
  if (!fs.existsSync(STRINGS_PATH)) {
    console.error("请先运行: node scripts/fetch-quest-tracker.js");
    process.exit(1);
  }

  const existing = loadExistingDictionary();
  const manual = loadManual();
  const allStrings = loadStrings();
  const { entries, missing } = buildEntries(allStrings, existing, manual);

  let questCount = 0;
  if (fs.existsSync(QUESTS_RAW_PATH)) {
    const raw = JSON.parse(fs.readFileSync(QUESTS_RAW_PATH, "utf8"));
    questCount = Object.values(raw).reduce((n, list) => n + list.length, 0);
  }

  const output = {
    version: 1,
    source: "https://darkanddarkertracker.com/questtracker",
    exportedAt: new Date().toISOString(),
    stats: {
      totalEntries: Object.keys(entries).length,
      totalStrings: allStrings.length,
      missing: missing.length,
      questCount,
    },
    entries,
  };

  if (missing.length) {
    output.missing = missing;
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf8");
  fs.writeFileSync(MANUAL_PATH, JSON.stringify(manual, null, 2), "utf8");

  console.log(`已写入 ${OUTPUT_PATH}`);
  console.log(`已写入 ${MANUAL_PATH}`);
  console.log(`词条: ${Object.keys(entries).length}/${allStrings.length}`);
  if (missing.length) {
    console.log(`仍缺译: ${missing.length} 条（见 quest-i18n.json 的 missing 字段）`);
    fs.writeFileSync(
      path.join(ROOT, "temp-quest-missing.txt"),
      missing.join("\n"),
      "utf8"
    );
  }
}

main();
