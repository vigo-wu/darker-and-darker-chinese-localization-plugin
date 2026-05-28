const fs = require("fs");
const path = require("path");

const TRANSITION_PATH = path.join(__dirname, "..", "metaData", "transition.json");
const CATEGORY_DIR = path.join(__dirname, "..", "src", "locales", "category");

const CATEGORIES = [
  {
    key: "map_locations",
    file: "mapLocations.js",
    global: "DARKTRANS_CATEGORY_MAP_LOCATION",
    title: "地图地点",
  },
  {
    key: "containers_and_interactables",
    file: "containers.js",
    global: "DARKTRANS_CATEGORY_CONTAINERS",
    title: "容器与可交互物",
  },
  {
    key: "monsters_and_mobs",
    file: "monsters.js",
    global: "DARKTRANS_CATEGORY_MONSTERS",
    title: "怪物",
  },
  {
    key: "herbs_and_ores",
    file: "herbs.js",
    global: "DARKTRANS_CATEGORY_HERBS",
    title: "草药与矿石",
  },
  {
    key: "traps",
    file: "traps.js",
    global: "DARKTRANS_CATEGORY_TRAPS",
    title: "陷阱",
  },
  {
    key: "items_and_loot",
    file: "loot.js",
    global: "DARKTRANS_CATEGORY_LOOT",
    title: "物品与战利品",
  },
];

function formatObjectLiteral(entries) {
  return Object.entries(entries)
    .sort(([a], [b]) => b.length - a.length)
    .map(([en, zh]) => `  ${JSON.stringify(en)}: ${JSON.stringify(zh)}`)
    .join(",\n");
}

function writeCategoryFile({ file, global, title }, entries) {
  const content = `/**
 * ${title}（transition.json）
 * 由 npm run merge-transition 自动生成，请勿手改
 */
window.${global} = {
${formatObjectLiteral(entries)}
};
`;
  fs.mkdirSync(CATEGORY_DIR, { recursive: true });
  fs.writeFileSync(path.join(CATEGORY_DIR, file), content, "utf8");
  return Object.keys(entries).length;
}

const transition = JSON.parse(fs.readFileSync(TRANSITION_PATH, "utf8"));

for (const category of CATEGORIES) {
  const entries = transition[category.key] || {};
  const count = writeCategoryFile(category, entries);
  console.log(`${category.file}: ${count} 条`);
}
