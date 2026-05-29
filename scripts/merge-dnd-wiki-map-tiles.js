const fs = require("fs");
const path = require("path");

const TRANSITION_PATH = path.join(__dirname, "..", "metaData", "transition.json");
const WIKI_TILES_PATH = path.join(__dirname, "..", "metaData", "dnd-wiki-map-tiles.json");

const MANUAL_ALIASES = {
  "abandoned ship": ["abandoned ship 01", "abandonedship 01"],
  "abandoned sanctum": ["ruins chapel"],
  "admirer's room": ["admirer room"],
  "altar room": ["altar room ab"],
  "bat roost": ["batroost", "inferno batroost"],
  "bath house": ["ruins bath"],
  "bladehand's refuge": ["bladehand refuge"],
  "blue hole a": ["hole", "ship graveyard hole"],
  "blue hole": ["hole"],
  "brimstone bridge": ["conector double bridge"],
  "brimstone castle": ["inferno castle conner"],
  "brimstone columns": ["inferno columns"],
  "brimstone falls": ["inferno bloodyfalls", "bloodyfalls"],
  "brimstone platforms": ["inferno death platforms"],
  "brimstone prison": ["inferno skull"],
  "brimstone river": ["inferno river"],
  "broken stone bridge": ["broken stonebridge", "brokenstonebridge"],
  "castle armory": ["ruins armory", "armory"],
  "cave altar a": ["cave altar center"],
  "cave altar b": ["cave altar 02"],
  "cave hideout a": ["hideout cave", "hideout cave 02"],
  "cave hideout b": ["hideout cave 02"],
  "cave tombs": ["cave tomb center"],
  "cavern lake a": ["cavern lake 02", "cavern lake"],
  "cavern lake b": ["cavern lake 03"],
  "broken bridge": ["crypt large room pit", "large room pit"],
  "cave tunnels": ["goblin cave corner 01"],
  "circular": ["center tower"],
  "cliffs": ["cliff bridge"],
  "coffin rooms": ["cemetery 02"],
  "corridors": ["ossuary edge"],
  "dark magic library": ["dark magic library center"],
  "goblin prisons b": ["goblin jail 02"],
  "goblin rooms": ["cave rooms"],
  "graveyard": ["ruins grave"],
  "pyramid": ["low pyramid", "ice cave pyramid"],
  "sailor's inn": ["floating house 01"],
  "slime forest": ["ruins slime forest 01"],
  "tombs": ["cave tomb center"],
  "trap hall a": ["trap hall"],
  "trap hall b": ["trap hall 02"],
  "wheel": ["the mini wheel", "mini wheel"],
  "fallen hallways": ["ruins inner 03"],
  "forest path": ["ruins forest 08"],
  "glacial pass": ["ice abyss glacivia"],
  "mummy chest": ["eight to one 01"],
  "center altar": ["four way connect", "fourwayconnect"],
  "center bridge": ["h bridge", "hbridge"],
  "crypt dungeons": ["crypt dungeon"],
  "dark ritual room": ["crypt dark ritual room 01", "dark ritual room 04"],
  "demon gate": ["inferno gate"],
  "demon lairs": ["inferno lava corner"],
  "demon mouth": ["inferno mouth"],
  "demon overseer's": ["demon overseers dominion", "inferno demon overseers dominion"],
  "demon stairs": ["inferno lava stairway"],
  "demon throne": ["throne room 02"],
  "destroyed tower": ["ruins tower 01 destroyed"],
  "doom cage": ["doomcage", "inferno doomcage"],
  "fallen forest": ["ruins forest 06"],
  "fallen halls": ["ruins inner 03"],
  "fallen pass": ["ruins inner 04"],
  "fallen rooms": ["ruins inner 02"],
  "fallen warrens": ["ruins inner 05"],
  "fishing grounds": ["fishing ground"],
  "floating island a": ["floating island"],
  "forest a": ["ruins forest 01"],
  "forest b": ["ruins forest 02"],
  "forgotten fields": ["ruins outer 03"],
  "forgotten forest": ["ruins outer 04"],
  "forgotten glades": ["ruins outer 02"],
  "forgotten passage": ["ruins outer 05"],
  "forgotten plots": ["ruins grave"],
  "gated rooms": ["crypt lightless chamber 01"],
  "glacial teeth": ["ice abyss abyss tooth", "abyss tooth"],
  "goblin bandits": ["cave bandit camp"],
  "goblin maze a": ["cave maze"],
  "goblin maze b": ["cave maze 02"],
  "goblin mine": ["goblin mine center 01"],
  "goblin prisons a": ["goblin jail", "goblin jail center 02"],
  "goblin town a": ["cave town", "cavetown"],
  "goblin town b": ["cave town 02"],
  "greathall a": ["ruins great hall 01 destroyed"],
  "greathall b": ["ruins great hall 02 destroyed"],
  "greathall c": ["ruins great hall 03 destroyed"],
  "guard post": ["guard post"],
  "guard posts": ["guard post", "ice cave guard post"],
  "guardpost": ["guard post", "ice cave guardpost"],
  "hall e": ["connector 01"],
  "hellcross bridge": ["hellcrossbridge", "inferno hellcrossbridge"],
  "hellwind": ["inferno hellwind"],
  "hidden altar": ["ruins underground altar 01"],
  "high priests": ["high priest ossuary"],
  "hut a": ["hut 01", "ice cave hut 01"],
  "hut b": ["hut 02", "ice cave hut 02"],
  "hut c": ["hut 03", "ice cave hut 03"],
  "judgement road": ["judgementroad", "inferno judgementroad"],
  "magma falls": ["magmafalls"],
  "mimic lair": ["mimic room"],
  "murder of crows": ["ruins forest 06"],
  "ocean volcano": ["oceanvolcano", "ship graveyard oceanvolcano"],
  "outer cemetery": ["cemetery 03"],
  "painful steps": ["painfulsteps", "inferno painfulsteps"],
  "path a": ["path", "ice cave path"],
  "prisons b": ["prison 01"],
  "ritual room": ["crypt dark ritual room 01"],
  "ritual rooms": ["inferno rooms", "ice abyss imp ritual rooms"],
  "sea fortress a": ["sea fortress"],
  "sea fortress b": ["sea fortress 02"],
  "skeleton rooms": ["skeleton pit"],
  "slime forest": ["ruins slime forest 01"],
  "spider lair": ["spider cave 01"],
  "spider nest": ["cave spider nest 02", "spider cave 01"],
  "square a": ["ruins square 01"],
  "square b": ["ruins square 02"],
  "stone graves a": ["stone grave center", "stone grave"],
  "stone graves b": ["stone grave 02"],
  "stones": ["ruins stonehenge"],
  "sunken ship": ["sunken ship 01"],
  "the great walkway": ["crypt great walkway", "great walkway"],
  "tower bridge": ["ruins tower bridge destroyed"],
  "trap hall a": ["trap hall"],
  "trap hall b": ["trap hall 02"],
  "twin cemeteries": ["cemetery 01"],
  "undersea cave a": ["under sea cave 01"],
  "valley a": ["cave valley"],
  "valley b": ["cave valley 02"],
  "waiting room": ["inferno down stair", "down stair"],
  "watering hole": ["ruins water hole"],
  "well": ["ruins wells 02"],
  "wolf den": ["ruins wollf colony", "wollf colony"],
  "wraith lair": ["eight to one 02"],
  "wyvern lair": ["ice abyss wyvern lair"],
};

const IMAGE_PATH_ALIASES = {
  "brimstone prison": { pattern: /\/inferno\/Skull\.png/i },
  "mummy chest": { pattern: /EightToOne_01\.png/i, slug: "eight-to-one-01" },
  "demon overseer's": { pattern: /DemonOverseersDominion/i },
  "cavern lake a": { pattern: /CavernLake_02\.png/i, slug: "cavern-lake-02" },
  "cavern lake b": { pattern: /CavernLake_03\.png/i, slug: "cavern-lake-03" },
  "forest a": { pattern: /Ruins_Forest_01\.png/i, slug: "ruins-forest-01" },
  "forest b": { pattern: /Ruins_Forest_02\.png/i, slug: "ruins-forest-02" },
  "goblin prisons b": { slug: "goblin-jail-02" },
  "blue hole a": { pattern: /ShipGraveyard_Hole\.png/i, slug: "ship-graveyard-hole" },
  "destroyed tower": { pattern: /ruins-tower-01-destroyed/i },
  "sailor's inn": { pattern: /FloatingHouse_01\.png/i, slug: "ship-graveyard-floating-house-01" },
  "slime forest": { pattern: /SlimeForest_01\.png/i, slug: "ruins-slime-forest-01" },
  "graveyard": { pattern: /Ruins_Grave\.png/i, slug: "ruins-grave" },
  "tombs": { pattern: /Cave_Tomb_Center\.png/i, slug: "cave-tomb" },
  "fallen hallways": { pattern: /Passage_Inner_03\.png/i, slug: "ruins-inner-03" },
  "forest path": { pattern: /Ruins_Forest_08\.png/i, slug: "ruins-forest-08" },
  "gated rooms": { pattern: /EightToOne_01\.png/i, slug: "crypt-lightless-chamber-01" },
};

/** 过于泛化、易误匹配的单字键，仅允许手动别名或路径匹配 */
const GENERIC_SINGLE_WORDS = new Set([
  "bridge",
  "armory",
  "cave",
  "den",
  "forest",
  "gate",
  "hall",
  "keep",
  "maze",
  "pit",
  "room",
  "sanctum",
  "vault",
]);

const SPELLING_FIXES = [
  [/stonebridge/g, "stone bridge"],
  [/batroost/g, "bat roost"],
  [/hellcrossbridge/g, "hellcross bridge"],
  [/judgementroad/g, "judgement road"],
  [/painfulsteps/g, "painful steps"],
  [/doomcage/g, "doom cage"],
  [/bloodyfalls/g, "bloody falls"],
  [/magmafalls/g, "magma falls"],
  [/oceanvolcano/g, "ocean volcano"],
  [/wollf/g, "wolf"],
  [/fourwayconnect/g, "four way connect"],
  [/brokenstonebridge/g, "broken stone bridge"],
];

function hasChinese(text) {
  return /[\u4e00-\u9fff]/.test(text);
}

function formatModuleKey(name) {
  if (!name) return "";
  return name
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(name) {
  let key = formatModuleKey(name).toLowerCase().replace(/[''`]/g, "").replace(/\s+/g, " ").trim();
  for (const [pattern, replacement] of SPELLING_FIXES) {
    key = key.replace(pattern, replacement);
  }
  key = key.replace(/^the\s+/, "");
  return key.trim();
}

function expandTransitionVariants(enKey) {
  const variants = new Set([normalizeKey(enKey)]);
  variants.add(normalizeKey(enKey.replace(/'s\b/gi, "")));

  const letterSuffix = enKey.match(/^(.+?)\s+([AB])$/i);
  if (letterSuffix) {
    const base = letterSuffix[1];
    const letter = letterSuffix[2].toUpperCase();
    variants.add(normalizeKey(base));
    variants.add(normalizeKey(`${base} ${letter.toLowerCase()}`));
    variants.add(normalizeKey(`${base} ${letter === "A" ? "01" : "02"}`));
    variants.add(normalizeKey(`${base} center`));
    variants.add(normalizeKey(`${base} center ${letter === "A" ? "01" : "02"}`));
  }

  const ellipsis = enKey.replace(/\.\.\./g, "").trim();
  if (ellipsis !== enKey) variants.add(normalizeKey(ellipsis));

  const manual = MANUAL_ALIASES[normalizeKey(enKey)] || MANUAL_ALIASES[normalizeKey(ellipsis)];
  if (manual) manual.forEach((alias) => variants.add(normalizeKey(alias)));

  return variants;
}

function wikiEnglishCandidates(tile) {
  const candidates = new Set();

  if (tile.imageUrl) {
    const file = tile.imageUrl.split("/").pop().replace(/\.(png|webp|jpg|jpeg)$/i, "");
    const parts = file.split("_");

    candidates.add(formatModuleKey(file));
    candidates.add(formatModuleKey(file.replace(/_?\d+$/, "")));

    if (parts.length >= 2) {
      const tailJoined = parts.slice(1).join("");
      candidates.add(formatModuleKey(tailJoined));
      candidates.add(formatModuleKey(tailJoined.replace(/\d+$/, "")));
      candidates.add(formatModuleKey(parts.slice(1).join(" ")));
    } else {
      candidates.add(formatModuleKey(parts[0]));
    }
  }

  if (tile.englishName) {
    candidates.add(formatModuleKey(tile.englishName));
    const normalized = normalizeKey(tile.englishName);
    const words = normalized.split(" ");
    if (words.length > 2) {
      candidates.add(words.slice(-2).join(" "));
      candidates.add(words.slice(-3).join(" "));
    }
  }

  if (tile.slug) {
    candidates.add(formatModuleKey(tile.slug.replace(/-/g, " ")));
  }

  return [...candidates].map(normalizeKey).filter(Boolean);
}

function isSingleWordKey(enKey) {
  return normalizeKey(enKey).split(" ").length === 1;
}

function scoreMatch(enKey, tile) {
  const normalizedEn = normalizeKey(enKey);
  const normalizedEllipsis = normalizeKey(enKey.replace(/\.\.\./g, ""));
  const pathRule =
    IMAGE_PATH_ALIASES[normalizedEn] || IMAGE_PATH_ALIASES[normalizedEllipsis];
  if (pathRule?.pattern && tile.imageUrl && pathRule.pattern.test(tile.imageUrl)) {
    if (!pathRule.slug || tile.slug === pathRule.slug) return 1100;
    return 1050;
  }

  const genericSingle = isSingleWordKey(enKey) && GENERIC_SINGLE_WORDS.has(normalizedEn);

  const enVariants = expandTransitionVariants(enKey);
  const tileCandidates = new Set(wikiEnglishCandidates(tile));
  const tileSlug = normalizeKey(tile.slug.replace(/-/g, " "));
  let best = 0;

  const manual = MANUAL_ALIASES[normalizedEn] || MANUAL_ALIASES[normalizedEllipsis];
  if (manual) {
    for (const alias of manual) {
      const aliasKey = normalizeKey(alias);
      if (tileCandidates.has(aliasKey) || tileSlug === aliasKey) best = Math.max(best, 950);
    }
  }

  if (genericSingle) return best;

  for (const variant of enVariants) {
    if (tileCandidates.has(variant)) best = Math.max(best, 1000);
    if (tileSlug === variant) best = Math.max(best, 980);
  }

  if (isSingleWordKey(enKey)) return best;

  const hasLetterSuffix = /\s[AB]$/i.test(enKey);
  const baseOnly = hasLetterSuffix ? normalizeKey(enKey.replace(/\s[AB]$/i, "")) : null;

  for (const variant of enVariants) {
    if (hasLetterSuffix && variant === baseOnly) continue;
    for (const candidate of tileCandidates) {
      if (candidate === variant) continue;
      if (candidate.endsWith(` ${variant}`) || candidate.endsWith(variant)) {
        best = Math.max(best, 700);
      }
    }
  }

  return best;
}

function assignTiles(transitionKeys, tiles) {
  const chineseTiles = tiles.filter((tile) => hasChinese(tile.name));
  const assigned = new Map();
  const usedTiles = new Set();

  // 1. 路径/slug 强制匹配
  for (const enKey of transitionKeys) {
    const normalizedEn = normalizeKey(enKey);
    const normalizedEllipsis = normalizeKey(enKey.replace(/\.\.\./g, ""));
    const pathRule = IMAGE_PATH_ALIASES[normalizedEn] || IMAGE_PATH_ALIASES[normalizedEllipsis];
    if (!pathRule) continue;

    const tile = chineseTiles.find((item) => {
      if (usedTiles.has(item.slug)) return false;
      if (pathRule.slug && item.slug !== pathRule.slug) return false;
      if (pathRule.pattern) {
        return item.imageUrl && pathRule.pattern.test(item.imageUrl);
      }
      return true;
    });
    if (tile) {
      assigned.set(enKey, { tile, score: 1100 });
      usedTiles.add(tile.slug);
    }
  }

  // 2. 其余键贪心匹配
  const pairs = [];
  for (const enKey of transitionKeys) {
    if (assigned.has(enKey)) continue;
    for (const tile of chineseTiles) {
      if (usedTiles.has(tile.slug)) continue;
      const score = scoreMatch(enKey, tile);
      if (score >= 700) pairs.push({ enKey, tile, score });
    }
  }

  pairs.sort((a, b) => b.score - a.score || a.enKey.localeCompare(b.enKey));

  for (const { enKey, tile, score } of pairs) {
    if (assigned.has(enKey) || usedTiles.has(tile.slug)) continue;
    assigned.set(enKey, { tile, score });
    usedTiles.add(tile.slug);
  }

  return assigned;
}

function main() {
  const transition = JSON.parse(fs.readFileSync(TRANSITION_PATH, "utf8"));
  const wikiData = JSON.parse(fs.readFileSync(WIKI_TILES_PATH, "utf8"));
  const tiles = wikiData.maps.flatMap((map) => map.tiles);

  const transitionKeys = Object.keys(transition.map_locations);
  const assignments = assignTiles(transitionKeys, tiles);

  const mapLocations = { ...transition.map_locations };
  const updated = [];
  const notFound = [];

  for (const enKey of transitionKeys) {
    const match = assignments.get(enKey);
    if (match) {
      const { tile } = match;
      const oldZh = mapLocations[enKey];
      mapLocations[enKey] = tile.name;
      if (tile.name !== oldZh) {
        updated.push({ en: enKey, oldZh, newZh: tile.name, score: match.score });
      }
    } else {
      notFound.push(enKey);
    }
  }

  transition.map_locations = Object.fromEntries(
    Object.entries(mapLocations).sort(([a], [b]) => a.localeCompare(b))
  );

  fs.writeFileSync(TRANSITION_PATH, `${JSON.stringify(transition, null, 2)}\n`, "utf8");

  console.log(`已匹配: ${assignments.size}/${transitionKeys.length}`);
  console.log(`已更新译文: ${updated.length}`);
  console.log(`未匹配: ${notFound.length}`);

  if (updated.length) {
    console.log("\n更新列表:");
    for (const item of updated) {
      console.log(`  ${item.en}: ${item.oldZh} -> ${item.newZh}`);
    }
  }

  if (notFound.length) {
    console.log("\n未匹配（保留原译）:");
    console.log(notFound.join(", "));
  }
}

main();
