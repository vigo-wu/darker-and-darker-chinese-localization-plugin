const fs = require("fs");
const path = require("path");

const TRANSITION_PATH = path.join(__dirname, "..", "metaData", "transition.json");
const WIKI_MONSTERS_PATH = path.join(__dirname, "..", "metaData", "dnd-wiki-monsters.json");

/** transition 英文键 -> wiki slug（拼写/命名差异） */
const SLUG_ALIASES = {
  "dwarf handcannoner": "dwarf-handcannoneer",
  "frost skeleton guardsman": "frost-skeleton-guardman",
  "goblin slinger": "goblin-bolaslinger",
  "tidewalker boomer": "tidewalker-slinger",
  "tidewalker spearman": "tidewalker-spearer",
  mimic: "mimic-medium-mid-level",
  slinkfoul: "mimic-medium-mid-level-unique",
};

function englishToSlug(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/\s+/g, "-");
}

function normalizeKey(name) {
  return name.trim().toLowerCase().replace(/[''`]/g, "");
}

function buildWikiIndex(monsters) {
  const bySlug = new Map();
  const byName = new Map();

  for (const monster of monsters) {
    bySlug.set(monster.slug, monster);
    if (!byName.has(monster.name)) byName.set(monster.name, []);
    byName.get(monster.name).push(monster);
  }

  return { bySlug, byName };
}

function pickMonster(enKey, { bySlug, byName }) {
  const aliasSlug = SLUG_ALIASES[normalizeKey(enKey)];
  if (aliasSlug && bySlug.has(aliasSlug)) {
    return { monster: bySlug.get(aliasSlug), method: "alias" };
  }

  const slug = englishToSlug(enKey);
  if (bySlug.has(slug)) {
    return { monster: bySlug.get(slug), method: "slug" };
  }

  const byExactName = byName.get(enKey);
  if (byExactName?.length) {
    const monster =
      byExactName.find((item) => !item.slug.includes("-unique")) || byExactName[0];
    return { monster, method: "name" };
  }

  return null;
}

function main() {
  const transition = JSON.parse(fs.readFileSync(TRANSITION_PATH, "utf8"));
  const wikiData = JSON.parse(fs.readFileSync(WIKI_MONSTERS_PATH, "utf8"));
  const index = buildWikiIndex(wikiData.monsters);

  const monsters = { ...transition.monsters_and_mobs };
  const transitionKeys = Object.keys(monsters);
  const updated = [];
  const notFound = [];

  for (const enKey of transitionKeys) {
    const match = pickMonster(enKey, index);
    if (!match?.monster?.name_cn) {
      notFound.push(enKey);
      continue;
    }

    const { monster, method } = match;
    const oldZh = monsters[enKey];
    monsters[enKey] = monster.name_cn;
    if (monster.name_cn !== oldZh) {
      updated.push({
        en: enKey,
        oldZh,
        newZh: monster.name_cn,
        slug: monster.slug,
        method,
      });
    }
  }

  transition.monsters_and_mobs = Object.fromEntries(
    Object.entries(monsters).sort(([a], [b]) => a.localeCompare(b))
  );

  fs.writeFileSync(TRANSITION_PATH, `${JSON.stringify(transition, null, 2)}\n`, "utf8");

  console.log(`已匹配: ${transitionKeys.length - notFound.length}/${transitionKeys.length}`);
  console.log(`已更新译文: ${updated.length}`);
  console.log(`未匹配: ${notFound.length}`);

  if (updated.length) {
    console.log("\n更新列表:");
    for (const item of updated) {
      console.log(`  ${item.en}: ${item.oldZh} -> ${item.newZh} (${item.slug}, ${item.method})`);
    }
  }

  if (notFound.length) {
    console.log("\n未匹配（保留原译）:");
    console.log(notFound.join(", "));
  }
}

main();
