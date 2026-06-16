function preserveWhitespace(original, translated) {
  const leading = original.match(/^\s*/)?.[0] || '';
  const trailing = original.match(/\s*$/)?.[0] || '';
  return `${leading}${translated}${trailing}`;
}

function hasChinese(text) {
  return /[\u4e00-\u9fff]/.test(text);
}

export function createDictionaryTranslator(rawEntries) {
  const entries = rawEntries?.entries && typeof rawEntries.entries === 'object'
    ? rawEntries.entries
    : rawEntries || {};

  const sortedEntries = Object.entries(entries).sort((a, b) => b[0].length - a[0].length);
  const reversePairs = [];

  for (const [en, zh] of Object.entries(entries)) {
    if (zh == null || String(zh).trim() === '') continue;
    reversePairs.push({ en, zh: String(zh).trim() });
  }

  reversePairs.sort((a, b) => a.zh.length - b.zh.length || a.en.length - b.en.length);

  const reverseExact = new Map();
  for (const { en, zh } of reversePairs) {
    if (!reverseExact.has(zh)) reverseExact.set(zh, en);
  }

  function translate(text) {
    if (text == null || text === '') return text;

    const source = String(text);
    const trimmed = source.trim();
    if (!trimmed) return source;

    if (Object.prototype.hasOwnProperty.call(entries, trimmed)) {
      const translated = entries[trimmed];
      if (translated == null || String(translated).trim() === '') return source;
      return preserveWhitespace(source, translated);
    }

    let result = source;
    for (const [key, value] of sortedEntries) {
      if (value == null || String(value).trim() === '') continue;
      if (result.includes(key)) {
        result = result.split(key).join(value);
      }
    }

    return result;
  }

  function toEnglish(search, itemNames = []) {
    const term = String(search).trim();
    if (!term) return '';

    const lower = term.toLowerCase();
    const exactItem = itemNames.find((name) => name.toLowerCase() === lower);
    if (exactItem) return exactItem;

    if (Object.prototype.hasOwnProperty.call(entries, term)) return term;

    if (!hasChinese(term)) return term;

    const itemMatches = itemNames
      .map((name) => ({ en: name, zh: translate(name) }))
      .filter(({ zh }) => zh === term || zh.includes(term));

    if (itemMatches.length > 0) {
      itemMatches.sort((a, b) => a.zh.length - b.zh.length || a.en.length - b.en.length);
      return itemMatches[0].en;
    }

    if (reverseExact.has(term)) return reverseExact.get(term);

    const dictMatches = reversePairs.filter(({ zh }) => zh === term || zh.includes(term));
    if (dictMatches.length > 0) {
      dictMatches.sort((a, b) => a.zh.length - b.zh.length || a.en.length - b.en.length);
      return dictMatches[0].en;
    }

    return term;
  }

  return { entries, translate, toEnglish };
}
