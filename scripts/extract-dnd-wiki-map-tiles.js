const fs = require("fs");
const path = require("path");

const BASE = "https://dnd.wiki";
const OUTPUT_PATH = path.join(__dirname, "..", "metaData", "dnd-wiki-map-tiles.json");

async function fetchJson(urlPath) {
  const res = await fetch(`${BASE}${urlPath}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`${urlPath} HTTP ${res.status}`);
  return res.json();
}

function englishNameFromImageUrl(imageUrl) {
  if (!imageUrl) return null;
  const file = imageUrl.split("/").pop() || "";
  const base = file.replace(/\.(png|webp|jpg|jpeg)$/i, "");
  if (!base) return null;
  return base
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const { maps } = await fetchJson("/api/maps");
  const result = {
    source: `${BASE}/maps`,
    fetchedAt: new Date().toISOString(),
    mapCount: maps.length,
    tileCount: 0,
    maps: [],
    allNames: [],
  };

  const nameSet = new Set();

  for (const map of maps) {
    const detail = await fetchJson(`/api/maps/${map.slug}`);
    const tiles = (detail.modules || []).map((mod) => {
      const entry = {
        slug: mod.slug,
        name: mod.name,
        englishName: englishNameFromImageUrl(mod.image_url),
        imageUrl: mod.image_url,
        poiCount: mod.poi_count,
      };
      nameSet.add(mod.name);
      return entry;
    });

    result.maps.push({
      slug: map.slug,
      name: map.name,
      moduleCount: tiles.length,
      tiles,
    });
    result.tileCount += tiles.length;
  }

  result.allNames = [...nameSet].sort((a, b) => a.localeCompare(b, "zh-CN"));

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2), "utf8");

  console.log(`地图: ${result.mapCount} 张`);
  console.log(`图块: ${result.tileCount} 个（去重名称: ${result.allNames.length} 个）`);
  console.log(`已写入: ${OUTPUT_PATH}`);
  console.log("\n全部图块名称:\n");
  for (const name of result.allNames) {
    console.log(name);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
