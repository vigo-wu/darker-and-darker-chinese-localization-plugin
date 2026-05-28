(async () => {
  const dictionary = window.DARKTRANS_DICTIONARY || {};
  const translator = new window.DarkTransTranslator(dictionary);

  async function loadSettings() {
    const settings = await chrome.storage.sync.get({ enabled: true });
    translator.setEnabled(settings.enabled);
  }

  function start() {
    translator.translateDocument(document.body);
    translator.observe();
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync" || !changes.enabled) return;
    translator.setEnabled(changes.enabled.newValue);
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "SET_ENABLED") {
      translator.setEnabled(message.enabled);
    }
  });

  await loadSettings();
  start();
})();
