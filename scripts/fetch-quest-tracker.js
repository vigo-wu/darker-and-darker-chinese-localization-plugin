const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BUNDLE_URL = "https://darkanddarkertracker.com/static/js/main.7fcff60d.js";
const PAGE_URL = "https://darkanddarkertracker.com/questtracker";

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "darkTrans/1.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function extractQuestJsonExpr(bundle) {
  const exprStart = bundle.indexOf('JSON.parse(\'{"C":');
  if (exprStart < 0) throw new Error("Quest JSON expression not found in bundle");

  let i = exprStart + "JSON.parse(".length;
  if (bundle[i] !== "'") throw new Error("Unexpected JSON.parse format");

  i++;
  let escaped = false;
  for (; i < bundle.length; i++) {
    const ch = bundle[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === "'") {
      i++;
      break;
    }
  }

  if (bundle[i] !== ")") throw new Error("Missing closing paren after quest JSON");
  return bundle.slice(exprStart, i + 1);
}

function parseQuestData(bundle) {
  const expr = extractQuestJsonExpr(bundle);
  return Function(`"use strict"; return (${expr});`)();
}

function collectStrings(value, out = new Set()) {
  if (typeof value === "string") {
    if (/[A-Za-z]/.test(value) && value.length >= 2) out.add(value);
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, out));
    return out;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectStrings(item, out));
  }
  return out;
}

function extractUiStrings(bundle) {
  const ui = new Set([
    "Quest Progress",
    "Quest Data Status",
    "Confirmed Quests",
    "confirmed completed",
    "Last quest update",
    "Get Started",
    "Track progress and mark quests complete.",
    "See required items and track collection.",
    "Explore interactive markers and points of interest.",
    "Quest Tracker",
    "Active Quests",
    "Compact Mode",
    "Rewards",
    "Favorited",
    "Available",
    "Completed",
    "Merchant",
    "Pre-Req",
    "Objectives",
    "Map",
    "Status",
    "Filter",
    "Search",
    "Show All",
    "Hide Completed",
    "Mark Complete",
    "Mark Incomplete",
    "Required Items",
    "Quest Items",
    "All Maps",
    "Any Map",
    "Loot Only",
    "Purchasable Only",
    "Highlight Available",
    "Sort Order",
    "Name",
    "Progress",
    "No quests found",
    "Loading quests",
  ]);

  const re = /"([A-Z][A-Za-z0-9 ,.'!?\-]{3,80})"/g;
  let match;
  while ((match = re.exec(bundle)) !== null) {
    const text = match[1];
    if (
      /quest/i.test(text) ||
      /merchant/i.test(text) ||
      /objective/i.test(text) ||
      /reward/i.test(text) ||
      /progress/i.test(text) ||
      /complete/i.test(text) ||
      /collect/i.test(text)
    ) {
      if (text.split(" ").length <= 10) ui.add(text);
    }
  }

  return [...ui].sort((a, b) => a.localeCompare(b));
}

async function main() {
  console.log("Fetching", PAGE_URL);
  const html = await fetchText(PAGE_URL);
  fs.writeFileSync(path.join(ROOT, "temp-questtracker.html"), html, "utf8");

  console.log("Fetching bundle...");
  const bundle = await fetchText(BUNDLE_URL);
  fs.writeFileSync(path.join(ROOT, "temp-main.js"), bundle, "utf8");
  console.log("Bundle size:", bundle.length);

  const questData = parseQuestData(bundle);
  fs.writeFileSync(
    path.join(ROOT, "temp-quests-raw.json"),
    JSON.stringify(questData, null, 2),
    "utf8"
  );

  const questStrings = [...collectStrings(questData)].sort((a, b) =>
    a.localeCompare(b)
  );
  fs.writeFileSync(
    path.join(ROOT, "temp-quest-strings.txt"),
    questStrings.join("\n"),
    "utf8"
  );

  const uiStrings = extractUiStrings(bundle);
  fs.writeFileSync(
    path.join(ROOT, "temp-quest-ui-strings.txt"),
    uiStrings.join("\n"),
    "utf8"
  );

  const questCount = Object.values(questData).reduce(
    (sum, list) => sum + list.length,
    0
  );

  console.log("Quest categories:", Object.keys(questData).join(", "));
  console.log("Quest count:", questCount);
  console.log("Unique quest strings:", questStrings.length);
  console.log("UI strings:", uiStrings.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
