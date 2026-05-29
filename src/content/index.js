(async () => {
  const baseDictionary = window.DARKTRANS_DICTIONARY || {};
  const translator = new window.DarkTransTranslator(baseDictionary);

  async function getMergedDictionary() {
    const { customDictionary = {} } = await chrome.storage.local.get({
      customDictionary: {},
    });
    return { ...baseDictionary, ...customDictionary };
  }

  function syncCanvasHook(dict, enabled) {
    const canvas = window.DarkTransCanvas;
    if (!canvas) return;
    canvas.setDictionary(dict);
    canvas.setEnabled(enabled);
  }

  async function applyDictionary() {
    const dict = await getMergedDictionary();
    translator.setDictionary(dict);
    syncCanvasHook(dict, translator.enabled);
  }

  async function loadSettings() {
    const settings = await chrome.storage.sync.get({ enabled: true });
    translator.setEnabled(settings.enabled);
    syncCanvasHook(
      translator.dictionary || (await getMergedDictionary()),
      settings.enabled
    );
  }

  function start() {
    translator.translateDocument(document.body);
    translator.observe();
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync" && changes.enabled) {
      translator.setEnabled(changes.enabled.newValue);
      syncCanvasHook(translator.dictionary, changes.enabled.newValue);
      return;
    }

    if (areaName === "local" && changes.customDictionary) {
      applyDictionary();
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "SET_ENABLED") {
      translator.setEnabled(message.enabled);
      syncCanvasHook(translator.dictionary, message.enabled);
    }
  });

  await loadSettings();
  await applyDictionary();
  start();

  if (/\/maps(?:$|[?#])/.test(location.pathname)) {
    window.setTimeout(async () => {
      await applyDictionary();
      translator.translateDocument(document.body);
      document.dispatchEvent(new CustomEvent("darktrans-map-labels-refresh"));
    }, 1500);
  }
})();
