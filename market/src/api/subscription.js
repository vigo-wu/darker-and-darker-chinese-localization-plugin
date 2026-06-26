import {
  STORAGE_KEYS,
  DEFAULT_EMAIL_SETTINGS,
  createSubscriptionId,
  normalizeItemName,
  sanitizeEmailSettingsForUi,
  mergeEmailSettings,
  isValidEmail,
  buildTestEmailContent,
  buildEmailHtml,
  isEmailDeliveryConfigured,
  resolveCanonicalItemName,
  showMarketNotification,
  sendTestBrowserNotification,
} from '@shared/market-subscription.js';
import { getResendConfig, hasResendApiKey } from '@shared/resend-config.js';
import { initItemNames } from '@shared/item-name.js';
import { runSubscriptionCheck } from '@shared/run-subscription-check.js';

const DEV_STORAGE_PREFIX = 'darktrans-market-';

function isExtensionContext() {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
}

function readDevStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(`${DEV_STORAGE_PREFIX}${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeDevStorage(key, value) {
  localStorage.setItem(`${DEV_STORAGE_PREFIX}${key}`, JSON.stringify(value));
}

async function getLocal(keys) {
  if (isExtensionContext()) {
    return chrome.storage.local.get(keys);
  }

  const result = {};
  Object.entries(keys).forEach(([key, fallback]) => {
    result[key] = readDevStorage(key, fallback);
  });
  return result;
}

async function setLocal(data) {
  if (isExtensionContext()) {
    await chrome.storage.local.set(data);
    return;
  }

  Object.entries(data).forEach(([key, value]) => {
    writeDevStorage(key, value);
  });
}

async function loadRawEmailSettings() {
  const data = await getLocal({ [STORAGE_KEYS.EMAIL_SETTINGS]: DEFAULT_EMAIL_SETTINGS });
  return mergeEmailSettings(data[STORAGE_KEYS.EMAIL_SETTINGS] || {});
}

async function saveRawEmailSettings(settings) {
  await setLocal({ [STORAGE_KEYS.EMAIL_SETTINGS]: settings });
  notifyBackgroundSettingsUpdated();
}

export async function loadSubscriptions() {
  const data = await getLocal({ [STORAGE_KEYS.SUBSCRIPTIONS]: [] });
  const subscriptions = data[STORAGE_KEYS.SUBSCRIPTIONS] || [];
  const normalized = subscriptions.map((sub) => {
    const itemName = resolveCanonicalItemName(sub.itemName);
    if (itemName === sub.itemName) return sub;
    return {
      ...sub,
      itemName,
      lastCheckedAt: null,
      lastNotifiedIds: [],
    };
  });
  const migrated = normalized.some((sub, index) => sub.itemName !== subscriptions[index].itemName);
  if (migrated) {
    await setLocal({ [STORAGE_KEYS.SUBSCRIPTIONS]: normalized });
    notifyBackground();
  }
  return normalized;
}

export async function saveSubscriptions(subscriptions) {
  await setLocal({ [STORAGE_KEYS.SUBSCRIPTIONS]: subscriptions });
  notifyBackground();
}

export async function loadEmailSettings() {
  const raw = await loadRawEmailSettings();
  return sanitizeEmailSettingsForUi(raw);
}

export async function saveEmailSettings(nextSettings) {
  const stored = await loadRawEmailSettings();
  const merged = mergeEmailSettings(stored, nextSettings);
  await saveRawEmailSettings(merged);
  return sanitizeEmailSettingsForUi(merged);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error('REQUEST_TIMEOUT');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function sendEmailDirect(settings, to, subject, html) {
  if (!isEmailDeliveryConfigured(settings, hasResendApiKey())) {
    throw new Error('EMAIL_NOT_CONFIGURED');
  }

  const { apiKey, fromEmail } = getResendConfig();
  if (!apiKey) {
    throw new Error('MISSING_RESEND_API_KEY');
  }

  const response = await fetchWithTimeout('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Resend 邮件发送失败 (${response.status})${detail ? `: ${detail}` : ''}`);
  }
  return { ok: true };
}

export async function testEmailSettings(formSettings, testEmail) {
  if (!isValidEmail(testEmail)) {
    throw new Error('INVALID_TEST_EMAIL');
  }

  const stored = await loadRawEmailSettings();
  const merged = mergeEmailSettings(stored, formSettings);
  const { subject, html } = buildTestEmailContent();
  return sendEmailDirect(merged, testEmail.trim(), subject, html);
}

export async function addSubscription(payload) {
  const subscriptions = await loadSubscriptions();
  const itemName = resolveCanonicalItemName(payload.itemName);
  if (!itemName) {
    throw new Error('INVALID_ITEM');
  }

  const duplicate = subscriptions.find(
    (sub) =>
      resolveCanonicalItemName(sub.itemName).toLowerCase() === itemName.toLowerCase() &&
      (sub.rarity || '') === (payload.rarity || '') &&
      String(sub.maxPrice ?? '') === String(payload.maxPrice ?? ''),
  );
  if (duplicate) {
    throw new Error('DUPLICATE');
  }

  const subscription = {
    id: createSubscriptionId(),
    itemName,
    maxPrice: payload.maxPrice === '' || payload.maxPrice == null ? null : Number(payload.maxPrice),
    rarity: payload.rarity || '',
    enabled: true,
    createdAt: new Date().toISOString(),
    lastNotifiedIds: [],
  };

  subscriptions.push(subscription);
  await saveSubscriptions(subscriptions);
  return subscription;
}

export async function removeSubscription(id) {
  const subscriptions = await loadSubscriptions();
  const next = subscriptions.filter((sub) => sub.id !== id);
  await saveSubscriptions(next);
}

export async function toggleSubscription(id, enabled) {
  const subscriptions = await loadSubscriptions();
  const next = subscriptions.map((sub) => (sub.id === id ? { ...sub, enabled } : sub));
  await saveSubscriptions(next);
}

async function fetchMarketListings(itemName, subscription = {}) {
  const queryItem = resolveCanonicalItemName(itemName);
  const url = new URL('https://api.darkerdb.com/v1/market');
  url.searchParams.set('condense', 'true');
  url.searchParams.set('limit', '50');
  url.searchParams.set('order', 'desc');
  url.searchParams.set('has_sold', 'false');
  url.searchParams.set('item', queryItem);

  const rarity = String(subscription.rarity || '').trim();
  if (rarity) {
    url.searchParams.set('rarity', rarity);
  }

  if (subscription.maxPrice != null && subscription.maxPrice !== '') {
    url.searchParams.set('price', `:${Number(subscription.maxPrice)}`);
  }

  const response = await fetchWithTimeout(url.toString(), { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`市场 API 请求失败 (${response.status})`);
  }

  const data = await response.json();
  if (data.status !== 'OK') {
    throw new Error(data.message || '市场 API 返回异常');
  }

  return data.body || [];
}

function showChromeNotification(subscription, listing, emailSettings) {
  showMarketNotification(subscription, listing, emailSettings).catch((err) => {
    console.error('[market-subscription] 浏览器通知异常:', err);
  });
}

export async function testBrowserNotificationSettings(formSettings) {
  const stored = await loadRawEmailSettings();
  const merged = mergeEmailSettings(stored, formSettings);
  return sendTestBrowserNotification(merged);
}

async function notifyNewListing(subscription, listing, emailSettings) {
  const notifyEmail = String(emailSettings.lastUsedEmail || '').trim();
  if (notifyEmail) {
    const subject = `[DarkTrans] 市场提醒：${subscription.itemName} 有新挂单`;
    const html = buildEmailHtml(listing, subscription.itemName);
    try {
      await sendEmailDirect(emailSettings, notifyEmail, subject, html);
    } catch (err) {
      console.error('[market-subscription] 邮件发送失败:', err);
    }
  }

  showChromeNotification(subscription, listing, emailSettings);
}

async function runCheckInPage() {
  await initItemNames();
  return runSubscriptionCheck({
    readState: async () => {
      const [subscriptions, emailSettings] = await Promise.all([
        loadSubscriptions(),
        loadRawEmailSettings(),
      ]);
      return { subscriptions, emailSettings };
    },
    saveSubscriptions,
    fetchMarketListings,
    notifyNewListing,
  });
}

export async function triggerCheckNow() {
  if (!isExtensionContext()) {
    return { ok: false, error: 'NOT_IN_EXTENSION' };
  }

  try {
    const result = await runCheckInPage();
    notifyBackground();
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: err?.message || 'CHECK_FAILED' };
  }
}

function notifyBackground() {
  if (isExtensionContext() && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ type: 'SUBSCRIPTIONS_UPDATED' }).catch(() => {});
  }
}

function notifyBackgroundSettingsUpdated() {
  if (isExtensionContext() && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ type: 'EMAIL_SETTINGS_UPDATED' }).catch(() => {});
  }
}

export function isSubscribedToItem(subscriptions, itemName) {
  const normalized = resolveCanonicalItemName(itemName).toLowerCase();
  return subscriptions.some(
    (sub) => sub.enabled !== false && resolveCanonicalItemName(sub.itemName).toLowerCase() === normalized,
  );
}
