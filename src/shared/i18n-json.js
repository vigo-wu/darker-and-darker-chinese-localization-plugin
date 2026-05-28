/**
 * 中英文对照 JSON 的解析与导出（popup / content 共用）
 */
(function () {
  const META_KEYS = new Set(["version", "exportedAt", "scope", "entries"]);

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function flattenDictionary(obj, out = {}) {
    if (!isPlainObject(obj)) return out;

    for (const [key, value] of Object.entries(obj)) {
      if (META_KEYS.has(key)) continue;

      if (typeof value === "string") {
        if (key.trim() && value.trim()) {
          out[key] = value;
        }
      } else if (isPlainObject(value)) {
        flattenDictionary(value, out);
      }
    }

    return out;
  }

  function parseArrayFormat(arr) {
    const out = {};

    for (const item of arr) {
      if (!isPlainObject(item)) continue;

      const en =
        item.en ?? item.english ?? item.source ?? item.key ?? item["en-US"];
      const zh =
        item.zh ??
        item["zh-CN"] ??
        item.chinese ??
        item.target ??
        item.value;

      if (typeof en === "string" && typeof zh === "string" && en && zh) {
        out[en] = zh;
      }
    }

    return out;
  }

  function parseImportJson(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("JSON 格式无效");
    }

    if (Array.isArray(data)) {
      return parseArrayFormat(data);
    }

    if (!isPlainObject(data)) {
      throw new Error("JSON 须为对象或数组");
    }

    if (Array.isArray(data.entries)) {
      return parseArrayFormat(data.entries);
    }

    if (isPlainObject(data.entries)) {
      return flattenDictionary(data.entries);
    }

    const withoutMeta = Object.fromEntries(
      Object.entries(data).filter(([key]) => !META_KEYS.has(key))
    );

    return flattenDictionary(withoutMeta);
  }

  function serializeExport(entries, meta = {}) {
    return JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        ...meta,
        entries,
      },
      null,
      2
    );
  }

  window.DarkTransI18nJson = {
    flattenDictionary,
    parseImportJson,
    serializeExport,
  };
})();
