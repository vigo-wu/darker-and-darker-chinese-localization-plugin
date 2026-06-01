const { mergeDictionary, writeDictionaryJson, writeDictionaryJs } = require("./rebuild-dictionary");

const entries = mergeDictionary();
writeDictionaryJson(entries);
writeDictionaryJs(entries);
console.log(`已重建 src/locales/zh-CN.json（${Object.keys(entries).length} 条）`);
