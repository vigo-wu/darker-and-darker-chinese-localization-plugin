const fs = require("fs");
const path = require("path");

const bundlePath = path.join(__dirname, "..", "temp-main.js");
const t = fs.readFileSync(bundlePath, "utf8");
console.log("length", t.length);

const patterns = [
  "questtracker",
  "QuestTracker",
  "questName",
  "questTitle",
  "questDescription",
  "fetchQuest",
  "/quests",
  "quests.json",
  "questData",
  "Quest Data",
  "Sailor",
  "Innkeeper",
  "Alchemist",
  "Blacksmith",
  "Confirmed Quests",
  "Last quest update",
  "questGiver",
  "questType",
  "requiredItems",
  "questGivers",
  "questItems",
];

for (const p of patterns) {
  let idx = 0;
  let count = 0;
  let first = -1;
  while ((idx = t.indexOf(p, idx)) !== -1) {
    if (first < 0) first = idx;
    count++;
    idx += p.length;
  }
  console.log(JSON.stringify(p), "count", count, "first", first);
  if (first >= 0) {
    console.log("  snippet:", JSON.stringify(t.slice(first, first + 250)));
  }
}
