const fs = require("fs");
const path = require("path");

const NFU_OTHERS_PATH = path.join(__dirname, "..", "metaData", "nfu-others-items.json");
const I18N_PATH = path.join(__dirname, "..", "metaData", "item-names-i18n.json");
const MANUAL_PATH = path.join(__dirname, "..", "metaData", "item-names-manual-zh.json");
const TRANSITION_PATH = path.join(__dirname, "..", "metaData", "transition.json");

function normalizeKey(name) {
  return name
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\sores$/i, " ore")
    .replace(/\scoins$/i, " coin")
    .replace(/frost stone ore/i, "froststone ore")
    .replace(/tide stone ore/i, "tidestone ore")
    .trim();
}

function expandNameCandidates(en) {
  const candidates = new Set([en]);

  let spaced = en
    .replace(/ofthe/gi, " of the ")
    .replace(/\bof([A-Z])/g, " of $1")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  candidates.add(spaced);

  const possessive = (word) =>
    [...candidates].flatMap((name) => [
      name.replace(new RegExp(`\\b${word}s\\b`, "i"), `${word}'s`),
      name.replace(new RegExp(`\\b${word}s\\b`, "i"), `${word}s`),
    ]);
  for (const word of [
    "Warlord",
    "Doctor",
    "Captain",
    "Mermaid",
    "Ship",
    "Yeti",
    "Troll",
    "Cave Troll",
  ]) {
    for (const name of possessive(word)) candidates.add(name);
  }

  const potionMatch = en.match(/^(\w+) Potion$/i);
  if (potionMatch) candidates.add(`Potion of ${potionMatch[1]}`);

  candidates.add(en.replace(/^Potionof\s/i, "Potion of "));

  const tailMatch = en.match(/^Tail [Oo]f (.+)$/);
  if (tailMatch) candidates.add(`${tailMatch[1]} Tail`);

  const tongueMatch = en.match(/^Tongue [Oo]f (.+)$/);
  if (tongueMatch) candidates.add(`${tongueMatch[1]} Tongue`);

  const mimicTongue = en.match(/^(.+) Tongue$/);
  if (mimicTongue) candidates.add(`Tongue Of ${mimicTongue[1]}`);

  for (const name of [...candidates]) {
    candidates.add(name.replace(/\sOres$/i, " Ore"));
    candidates.add(name.replace(/\sCoins$/i, " Coin"));
    candidates.add(name.replace(/Frost Stone Ore/i, "Froststone Ore"));
    candidates.add(name.replace(/Tide Stone Ore/i, "Tidestone Ore"));
    candidates.add(name.replace(/\bEar\b/i, "Ears"));
    candidates.add(name.replace(/\bEars\b/i, "Ear"));
    candidates.add(name.replace(/\bPelt\b/i, "Pelts"));
    candidates.add(name.replace(/\bPelts\b/i, "Pelt"));
    candidates.add(name.replace(/\bThorn\b/i, "Thorns"));
    candidates.add(name.replace(/\bThorns\b/i, "Thorn"));
  }

  return [...candidates];
}

function buildProjectIndex(i18n, manual, transition) {
  const byNorm = new Map();

  function add(en, zh, source) {
    const norm = normalizeKey(en);
    if (!byNorm.has(norm)) byNorm.set(norm, []);
    byNorm.get(norm).push({ en, zh, source });
  }

  for (const item of i18n.items) add(item.en, item.zh, "i18n");
  for (const [en, zh] of Object.entries(manual)) add(en, zh, "manual");
  for (const [section, entries] of Object.entries(transition)) {
    if (!entries || typeof entries !== "object" || Array.isArray(entries)) continue;
    for (const [en, zh] of Object.entries(entries)) {
      add(en, zh, `transition:${section}`);
    }
  }

  return byNorm;
}

function findMatches(nfuEn, projectIndex) {
  const matched = new Map();
  for (const candidate of expandNameCandidates(nfuEn)) {
    const hits = projectIndex.get(normalizeKey(candidate));
    if (!hits) continue;
    for (const hit of hits) {
      matched.set(`${hit.source}\0${hit.en}`, hit);
    }
  }
  return [...matched.values()];
}

function applyUpdates(i18n, manual, transition, nfuItems) {
  const projectIndex = buildProjectIndex(i18n, manual, transition);
  const updated = [];
  const added = [];
  const unchanged = [];

  for (const { en: nfuEn, zh: nfuZh } of nfuItems) {
    const matches = findMatches(nfuEn, projectIndex);

    if (matches.length) {
      let changed = false;
      for (const hit of matches) {
        if (hit.zh === nfuZh) continue;
        changed = true;
        if (hit.source === "i18n") {
          const item = i18n.items.find((entry) => entry.en === hit.en);
          if (item) item.zh = nfuZh;
        } else if (hit.source === "manual") {
          manual[hit.en] = nfuZh;
        } else if (hit.source.startsWith("transition:")) {
          const section = hit.source.slice("transition:".length);
          transition[section][hit.en] = nfuZh;
        }
        updated.push({
          en: hit.en,
          nfuEn,
          oldZh: hit.zh,
          newZh: nfuZh,
          source: hit.source,
        });
        hit.zh = nfuZh;
      }
      if (!changed) unchanged.push(nfuEn);
      continue;
    }

    i18n.items.push({ en: nfuEn, zh: nfuZh });
    projectIndex.set(normalizeKey(nfuEn), [{ en: nfuEn, zh: nfuZh, source: "i18n" }]);
    added.push({ en: nfuEn, zh: nfuZh });
  }

  i18n.items.sort((a, b) => a.en.localeCompare(b.en));
  i18n.meta = {
    ...i18n.meta,
    total: i18n.items.length,
    translated: i18n.items.filter((item) => item.zh).length,
    missing: i18n.items.filter((item) => !item.zh).length,
    nfuOthersMergedAt: new Date().toISOString(),
  };

  return { updated, added, unchanged };
}

function sortTransition(transition) {
  for (const [section, entries] of Object.entries(transition)) {
    if (!entries || typeof entries !== "object" || Array.isArray(entries)) continue;
    transition[section] = Object.fromEntries(
      Object.entries(entries).sort(([a], [b]) => a.localeCompare(b))
    );
  }
}

function main() {
  const nfuData = JSON.parse(fs.readFileSync(NFU_OTHERS_PATH, "utf8"));
  const i18n = JSON.parse(fs.readFileSync(I18N_PATH, "utf8"));
  const manual = JSON.parse(fs.readFileSync(MANUAL_PATH, "utf8"));
  const transition = JSON.parse(fs.readFileSync(TRANSITION_PATH, "utf8"));

  const { updated, added, unchanged } = applyUpdates(
    i18n,
    manual,
    transition,
    nfuData.items
  );

  sortTransition(transition);

  fs.writeFileSync(I18N_PATH, `${JSON.stringify(i18n, null, 2)}\n`, "utf8");
  fs.writeFileSync(MANUAL_PATH, `${JSON.stringify(manual, null, 2)}\n`, "utf8");
  fs.writeFileSync(TRANSITION_PATH, `${JSON.stringify(transition, null, 2)}\n`, "utf8");

  console.log(`NFU 杂项: ${nfuData.items.length} 条`);
  console.log(`已更新: ${updated.length} 条`);
  console.log(`已新增: ${added.length} 条`);
  console.log(`未变化: ${unchanged.length} 条`);

  if (updated.length) {
    console.log("\n更新列表:");
    for (const item of updated) {
      console.log(
        `  ${item.en} (${item.nfuEn}): ${item.oldZh} -> ${item.newZh} [${item.source}]`
      );
    }
  }

  if (added.length) {
    console.log("\n新增列表:");
    for (const item of added) {
      console.log(`  ${item.en} -> ${item.zh}`);
    }
  }
}

main();
