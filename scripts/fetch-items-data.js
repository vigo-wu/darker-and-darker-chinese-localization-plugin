const fs = require("fs");
const path = require("path");

const API_BASE = "https://api.darkerdb.com";
const OUTPUT_PATH = path.join(__dirname, "..", "src", "locales", "itemsData.json");
const PAGE_LIMIT = 50;

async function fetchItemsPage(page) {
  const url = new URL(`${API_BASE}/v1/items`);
  url.searchParams.set("condense", "true");
  url.searchParams.set("limit", String(PAGE_LIMIT));
  url.searchParams.set("page", String(page));

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API 请求失败 (${response.status})`);
  }

  const data = await response.json();
  if (data.status !== "OK") {
    throw new Error(data.message || "API 返回异常");
  }

  return data;
}

async function fetchAllItems() {
  const firstPage = await fetchItemsPage(1);
  const totalPages = firstPage.pagination?.num_pages ?? 1;
  const items = [...(firstPage.body || [])];

  for (let page = 2; page <= totalPages; page += 1) {
    const data = await fetchItemsPage(page);
    items.push(...(data.body || []));
    process.stdout.write(`\r已获取 ${items.length} / ${firstPage.pagination?.total ?? items.length} 条物品`);
  }

  process.stdout.write("\n");
  return {
    items,
    total: firstPage.pagination?.total ?? items.length,
    apiVersion: firstPage.version,
    patch: firstPage.patch,
  };
}

function buildEntries(items) {
  const names = new Set();

  for (const item of items) {
    if (item.name) {
      names.add(item.name);
    }
  }

  return Object.fromEntries(
    [...names].sort((a, b) => a.localeCompare(b, "en")).map((name) => [name, ""])
  );
}

async function main() {
  const { items, total, apiVersion, patch } = await fetchAllItems();
  const entries = buildEntries(items);

  const output = {
    version: 1,
    exportedAt: new Date().toISOString(),
    scope: "items",
    source: `${API_BASE}/v1/items`,
    apiVersion,
    patch,
    totalItems: total,
    uniqueNames: Object.keys(entries).length,
    entries,
  };

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`已写入 ${OUTPUT_PATH}`);
  console.log(`共 ${total} 条物品记录，${output.uniqueNames} 个唯一英文名称`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  fetchAllItems,
  buildEntries,
  OUTPUT_PATH,
};
