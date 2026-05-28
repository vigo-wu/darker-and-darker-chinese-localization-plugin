const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const strings = fs
  .readFileSync(path.join(root, "temp-quest-strings.txt"), "utf8")
  .split(/\r?\n/)
  .filter(Boolean);

const dict = {};
function add(obj) {
  for (const [k, v] of Object.entries(obj || {})) {
    if (k && v) dict[k] = v;
  }
}

const transition = JSON.parse(
  fs.readFileSync(path.join(root, "metaData", "transition.json"), "utf8")
);
for (const section of Object.values(transition)) add(section);

const items = JSON.parse(
  fs.readFileSync(path.join(root, "metaData", "item-names-i18n.json"), "utf8")
).items;
for (const { en, zh } of items) {
  if (en && zh) dict[en] = zh;
}

add(JSON.parse(fs.readFileSync(path.join(root, "metaData", "item-names-manual-zh.json"), "utf8")));

let hit = 0;
const miss = [];
for (const s of strings) {
  if (dict[s]) hit++;
  else miss.push(s);
}

console.log("total", strings.length, "hit", hit, "miss", miss.length);
console.log("missing:");
console.log(miss.join("\n"));
