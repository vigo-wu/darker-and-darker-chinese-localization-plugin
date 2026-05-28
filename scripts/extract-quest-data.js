const fs = require("fs");
const path = require("path");

const bundlePath = path.join(__dirname, "..", "temp-main.js");
const t = fs.readFileSync(bundlePath, "utf8");

const exprStart = t.indexOf('JSON.parse(\'{"C":');
if (exprStart < 0) {
  console.error("Quest JSON expression not found");
  process.exit(1);
}

// Find end of JSON.parse('...') by parsing JS single-quoted string
let i = exprStart + "JSON.parse(".length;
if (t[i] !== "'") {
  console.error("Unexpected format at", i, t.slice(i, i + 20));
  process.exit(1);
}
i++; // skip opening quote

let escaped = false;
for (; i < t.length; i++) {
  const ch = t[i];
  if (escaped) {
    escaped = false;
    continue;
  }
  if (ch === "\\") {
    escaped = true;
    continue;
  }
  if (ch === "'") {
    i++; // closing quote
    break;
  }
}

if (t[i] !== ")") {
  console.error("Expected ) after JSON string, got", t.slice(i, i + 10));
  process.exit(1);
}

const expr = t.slice(exprStart, i + 1);
const questData = Function(`"use strict"; return (${expr});`)();

const outDir = path.join(__dirname, "..");
fs.writeFileSync(
  path.join(outDir, "temp-quests-raw.json"),
  JSON.stringify(questData, null, 2),
  "utf8"
);

const categories = Object.keys(questData);
let totalQuests = 0;
for (const cat of categories) {
  totalQuests += (questData[cat] || []).length;
}

console.log("categories:", categories.join(", "));
console.log("total quests:", totalQuests);

const strings = new Set();
function walk(value) {
  if (typeof value === "string") {
    if (/[A-Za-z]/.test(value) && value.length >= 2) strings.add(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(walk);
    return;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach(walk);
  }
}
walk(questData);

const sorted = [...strings].sort((a, b) => a.localeCompare(b));
fs.writeFileSync(
  path.join(outDir, "temp-quest-strings.txt"),
  sorted.join("\n"),
  "utf8"
);
console.log("unique strings:", sorted.length);

const sample = questData[categories[0]][0];
console.log("sample quest:", sample.name, "|", sample.merchant);
