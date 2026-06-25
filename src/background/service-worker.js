import {
  scheduleSubscriptionAlarm,
  checkSubscriptions,
  initMarketSubscription,
  sendTestEmail,
} from './market-subscription.js';

const DEFAULT_SETTINGS = {
  enabled: true,
};

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  await chrome.storage.sync.set({ ...DEFAULT_SETTINGS, ...stored });
  await scheduleSubscriptionAlarm();
});

initMarketSubscription().catch((err) => {
  console.error('[market-subscription] 后台初始化失败:', err);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SET_ENABLED') {
    chrome.storage.sync
      .set({ enabled: Boolean(message.enabled) })
      .then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === 'FETCH_JSON') {
    const url = message.url;
    fetch(url, { cache: 'no-cache' })
      .then(async (res) => {
        sendResponse({
          ok: res.ok,
          status: res.status,
          text: await res.text(),
        });
      })
      .catch((err) => {
        sendResponse({ error: err?.message || String(err) });
      });
    return true;
  }

  if (message.type === 'SUBSCRIPTIONS_UPDATED' || message.type === 'EMAIL_SETTINGS_UPDATED') {
    scheduleSubscriptionAlarm()
      .then((alarm) => sendResponse({ ok: true, alarm }))
      .catch((err) => sendResponse({ ok: false, error: err?.message || String(err) }));
    return true;
  }

  if (message.type === 'CHECK_SUBSCRIPTIONS_NOW') {
    checkSubscriptions()
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((err) => sendResponse({ ok: false, error: err?.message || String(err) }));
    return true;
  }

  if (message.type === 'TEST_EMAIL_SETTINGS') {
    sendTestEmail(message.settings, message.to)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err?.message || String(err) }));
    return true;
  }

  return false;
});
