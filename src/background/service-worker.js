const DEFAULT_SETTINGS = {
  enabled: true,
};

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  await chrome.storage.sync.set({ ...DEFAULT_SETTINGS, ...stored });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_SETTINGS") {
    chrome.storage.sync.get(DEFAULT_SETTINGS).then(sendResponse);
    return true;
  }

  if (message.type === "SET_ENABLED") {
    chrome.storage.sync
      .set({ enabled: Boolean(message.enabled) })
      .then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});
