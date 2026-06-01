const fs = require("fs");
const path = require("path");
const { mergeDictionary, writeDictionaryJson, writeDictionaryJs } = require("./rebuild-dictionary");

const TRANSITION_PATH = path.join(__dirname, "..", "metaData", "transition.json");

const CATEGORIES = [
  { key: "map_locations", title: "地图地点" },
  { key: "containers_and_interactables", title: "容器与可交互物" },
  { key: "monsters_and_mobs", title: "怪物" },
  { key: "herbs_and_ores", title: "草药与矿石" },
  { key: "traps", title: "陷阱" },
  { key: "items_and_loot", title: "物品与战利品" },
];

const transition = JSON.parse(fs.readFileSync(TRANSITION_PATH, "utf8"));

for (const category of CATEGORIES) {
  const entries = transition[category.key] || {};
  console.log(`${category.title}: ${Object.keys(entries).length} 条`);
}

const entries = mergeDictionary();
writeDictionaryJson(entries);
writeDictionaryJs(entries);
console.log(`已重建 src/locales/zh-CN.json（${Object.keys(entries).length} 条）`);
