const toggle = document.getElementById("enabledToggle");
const statusText = document.getElementById("statusText");

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function loadSettings() {
  const settings = await chrome.storage.sync.get({ enabled: true });
  toggle.checked = settings.enabled;
  updateStatus(settings.enabled);
}

function updateStatus(enabled) {
  statusText.textContent = enabled ? "汉化已开启" : "汉化已关闭";
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

loadSettings();
