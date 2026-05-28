const toggle = document.getElementById("enabledToggle");
const statusText = document.getElementById("statusText");
const dictStats = document.getElementById("dictStats");
const dictMessage = document.getElementById("dictMessage");
const exportAllBtn = document.getElementById("exportAllBtn");
const exportCustomBtn = document.getElementById("exportCustomBtn");
const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");
const importMergeToggle = document.getElementById("importMergeToggle");

const { parseImportJson, serializeExport } = window.DarkTransI18nJson;

function getBaseDictionary() {
  return window.DARKTRANS_DICTIONARY || {};
}

async function getCustomDictionary() {
  const { customDictionary = {} } = await chrome.storage.local.get({
    customDictionary: {},
  });
  return customDictionary;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function updateStatus(enabled) {
  statusText.textContent = enabled ? "汉化已开启" : "汉化已关闭";
}

function showDictMessage(text, isError = false) {
  dictMessage.hidden = false;
  dictMessage.textContent = text;
  dictMessage.classList.toggle("popup__dict-message--error", isError);
}

function hideDictMessage() {
  dictMessage.hidden = true;
}

async function refreshDictStats() {
  const base = getBaseDictionary();
  const custom = await getCustomDictionary();
  const baseCount = Object.keys(base).length;
  const customCount = Object.keys(custom).length;
  dictStats.textContent = `内置 ${baseCount} 条，自定义 ${customCount} 条`;
}

function downloadJson(filename, content) {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportFilename(kind) {
  const date = new Date().toISOString().slice(0, 10);
  return `darktrans-${kind}-${date}.json`;
}

async function loadSettings() {
  const settings = await chrome.storage.sync.get({ enabled: true });
  toggle.checked = settings.enabled;
  updateStatus(settings.enabled);
}

toggle.addEventListener("change", async () => {
  const enabled = toggle.checked;
  await chrome.storage.sync.set({ enabled });

  const tab = await getActiveTab();
  if (tab?.id && tab.url?.includes("darkanddarkertracker.com")) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: "SET_ENABLED",
        enabled,
      });
    } catch {
      // 目标页尚未注入 content script 时可忽略
    }
  }

  updateStatus(enabled);
});

exportAllBtn.addEventListener("click", async () => {
  hideDictMessage();
  try {
    const base = getBaseDictionary();
    const custom = await getCustomDictionary();
    const merged = { ...base, ...custom };
    const content = serializeExport(merged, { scope: "all" });
    downloadJson(exportFilename("all"), content);
    showDictMessage(`已导出 ${Object.keys(merged).length} 条词条`);
  } catch (error) {
    showDictMessage(error.message || "导出失败", true);
  }
});

exportCustomBtn.addEventListener("click", async () => {
  hideDictMessage();
  try {
    const custom = await getCustomDictionary();
    const count = Object.keys(custom).length;
    if (count === 0) {
      showDictMessage("暂无自定义词条可导出", true);
      return;
    }
    const content = serializeExport(custom, { scope: "custom" });
    downloadJson(exportFilename("custom"), content);
    showDictMessage(`已导出 ${count} 条自定义词条`);
  } catch (error) {
    showDictMessage(error.message || "导出失败", true);
  }
});

importBtn.addEventListener("click", () => {
  hideDictMessage();
  importFile.value = "";
  importFile.click();
});

importFile.addEventListener("change", async () => {
  const file = importFile.files?.[0];
  if (!file) return;

  hideDictMessage();

  try {
    const text = await file.text();
    const imported = parseImportJson(text);
    const importCount = Object.keys(imported).length;

    if (importCount === 0) {
      showDictMessage("未解析到有效词条", true);
      return;
    }

    let custom = imported;
    if (importMergeToggle.checked) {
      const existing = await getCustomDictionary();
      custom = { ...existing, ...imported };
    }

    await chrome.storage.local.set({ customDictionary: custom });
    await refreshDictStats();
    showDictMessage(
      `已导入 ${importCount} 条，当前自定义共 ${Object.keys(custom).length} 条`
    );
  } catch (error) {
    showDictMessage(error.message || "导入失败", true);
  }
});

loadSettings();
refreshDictStats();
