let ENTRIES = {};
let REVERSE_EXACT = new Map();
let itemNamesReady = null;

function buildMaps(entries) {
  ENTRIES = entries || {};
  REVERSE_EXACT = new Map();
  for (const [english, chinese] of Object.entries(ENTRIES)) {
    const zh = String(chinese || '').trim();
    if (zh) REVERSE_EXACT.set(zh, english);
  }
}

async function loadEntries() {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    try {
      const url = chrome.runtime.getURL('src/locales/Items.json');
      const data = await (await fetch(url)).json();
      buildMaps(data.entries || {});
      return;
    } catch (err) {
      console.warn('[item-name] 从扩展资源加载 Items.json 失败:', err);
    }
  }

  try {
    const mod = await import('../locales/Items.json');
    buildMaps(mod.default?.entries || mod.entries || {});
  } catch {
    buildMaps({});
  }
}

export function initItemNames() {
  if (!itemNamesReady) {
    itemNamesReady = loadEntries();
  }
  return itemNamesReady;
}

function hasChinese(text) {
  return /[\u4e00-\u9fff]/.test(text);
}

export function getCanonicalItemNames() {
  return Object.keys(ENTRIES);
}

export function resolveCanonicalItemName(name) {
  const term = String(name || '').trim();
  if (!term) return '';

  const itemNames = Object.keys(ENTRIES);
  if (itemNames.includes(term)) return term;

  const lower = term.toLowerCase();
  const exactEnglish = itemNames.find((item) => item.toLowerCase() === lower);
  if (exactEnglish) return exactEnglish;

  if (!hasChinese(term)) return term;

  if (REVERSE_EXACT.has(term)) return REVERSE_EXACT.get(term);

  const itemMatches = itemNames
    .map((english) => ({
      english,
      chinese: String(ENTRIES[english] || '').trim(),
    }))
    .filter(({ chinese }) => chinese === term || chinese.includes(term));

  if (itemMatches.length > 0) {
    itemMatches.sort((a, b) => a.chinese.length - b.chinese.length || a.english.length - b.english.length);
    return itemMatches[0].english;
  }

  return term;
}
