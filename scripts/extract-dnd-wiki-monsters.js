const fs = require("fs");
const path = require("path");

const BASE = "https://dnd.wiki";
const OUTPUT_PATH = path.join(__dirname, "..", "metaData", "dnd-wiki-monsters.json");

async function fetchJson(urlPath) {
  const res = await fetch(`${BASE}${urlPath}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`${urlPath} HTTP ${res.status}`);
  return res.json();
}

function englishToSlug(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/\s+/g, "-");
}

async function main() {
  const { monsters } = await fetchJson("/api/monsters");
  const result = {
    source: `${BASE}/monsters`,
    fetchedAt: new Date().toISOString(),
    monsterCount: monsters.length,
    monsters: monsters.map((monster) => ({
      slug: monster.slug,
      name: monster.name,
      name_cn: monster.name_cn,
      class_type: monster.class_type,
      slugFromName: englishToSlug(monster.name),
      imageUrl: monster.image_url,
    })),
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2), "utf8");

  const uniqueNames = new Set(monsters.map((m) => m.name));
  console.log(`怪物: ${result.monsterCount} 条（英文名称去重: ${uniqueNames.size} 个）`);
  console.log(`已写入: ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
