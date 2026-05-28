(async () => {
  const baseDictionary = window.DARKTRANS_DICTIONARY || {};
  const translator = new window.DarkTransTranslator(baseDictionary);

  async function getMergedDictionary() {
    const { customDictionary = {} } = await chrome.storage.local.get({
      customDictionary: {},
    });
    return { ...baseDictionary, ...customDictionary };
  }

  async function applyDictionary() {
    translator.setDictionary(await getMergedDictionary());
  }

  async function loadSettings() {
    const settings = await chrome.storage.sync.get({ enabled: true });
    translator.setEnabled(settings.enabled);
  }

  function start() {
    translator.translateDocument(document.body);
    translator.observe();
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync" && changes.enabled) {
      translator.setEnabled(changes.enabled.newValue);
      return;
    }

    if (areaName === "local" && changes.customDictionary) {
      applyDictionary();
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "SET_ENABLED") {
      translator.setEnabled(message.enabled);
    }
  });

  await loadSettings();
  await applyDictionary();
  start();
})();
