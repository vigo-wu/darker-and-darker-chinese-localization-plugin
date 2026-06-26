import {
  STORAGE_KEYS,
  ALARM_NAME,
  DEFAULT_EMAIL_SETTINGS,
  buildListingId,
  buildEmailHtml,
  isEmailDeliveryConfigured,
  buildTestEmailContent,
  mergeEmailSettings,
  resolveCanonicalItemName,
  getPollIntervalSeconds,
  showMarketNotification,
} from '../shared/market-subscription.js';
import { getResendConfig, hasResendApiKey } from '../shared/resend-config.js';
import { runSubscriptionCheck } from '../shared/run-subscription-check.js';
import { initItemNames } from '../shared/item-name.js';

const API_BASE = 'https://api.darkerdb.com';

async function readStorage() {
  const data = await chrome.storage.local.get({
    [STORAGE_KEYS.SUBSCRIPTIONS]: [],
    [STORAGE_KEYS.EMAIL_SETTINGS]: DEFAULT_EMAIL_SETTINGS,
  });
  return {
    subscriptions: data[STORAGE_KEYS.SUBSCRIPTIONS] || [],
    emailSettings: mergeEmailSettings(data[STORAGE_KEYS.EMAIL_SETTINGS] || {}),
  };
}

async function saveSubscriptions(subscriptions) {
  await chrome.storage.local.set({ [STORAGE_KEYS.SUBSCRIPTIONS]: subscriptions });
}

async function fetchMarketListings(itemName, subscription = {}) {
  const queryItem = resolveCanonicalItemName(itemName);
  const url = new URL(`${API_BASE}/v1/market`);
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

  const response = await fetch(url.toString(), { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`市场 API 请求失败 (${response.status})`);
  }

  const data = await response.json();
  if (data.status !== 'OK') {
    throw new Error(data.message || '市场 API 返回异常');
  }

  return data.body || [];
}

async function sendEmail(emailSettings, to, subject, html) {
  if (!isEmailDeliveryConfigured(emailSettings, hasResendApiKey())) {
    return false;
  }

  const { apiKey, fromEmail } = getResendConfig();
  if (!apiKey) {
    throw new Error('MISSING_RESEND_API_KEY');
  }

  const response = await fetch('https://api.resend.com/emails', {
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
  return true;
}

export async function sendTestEmail(emailSettings, to) {
  const { subject, html } = buildTestEmailContent();
  const sent = await sendEmail(emailSettings, to, subject, html);
  if (!sent) {
    throw new Error('EMAIL_NOT_CONFIGURED');
  }
  return true;
}

function showChromeNotification(subscription, listing, emailSettings) {
  showMarketNotification(subscription, listing, emailSettings).catch((err) => {
    console.error('[market-subscription] 浏览器通知异常:', err);
  });
}

async function notifyNewListing(subscription, listing, emailSettings) {
  const listingId = buildListingId(listing);
  const subject = `[DarkTrans] 市场提醒：${subscription.itemName} 有新挂单`;
  const html = buildEmailHtml(listing, subscription.itemName);
  const notifyEmail = String(emailSettings.lastUsedEmail || '').trim();

  if (notifyEmail) {
    try {
      await sendEmail(emailSettings, notifyEmail, subject, html);
    } catch (err) {
      console.error('[market-subscription] 邮件发送失败:', err);
    }
  }

  showChromeNotification(subscription, listing, emailSettings);
  return { listingId };
}

export async function scheduleSubscriptionAlarm() {
  const { subscriptions, emailSettings } = await readStorage();
  const activeCount = subscriptions.filter((sub) => sub.enabled !== false).length;
  await chrome.alarms.clear(ALARM_NAME);

  if (activeCount === 0) {
    console.info('[market-subscription] 无活跃订阅，已清除轮询');
    return null;
  }

  const seconds = getPollIntervalSeconds(emailSettings);
  const when = Date.now() + seconds * 1000;
  await chrome.alarms.create(ALARM_NAME, { when });
  const alarm = await chrome.alarms.get(ALARM_NAME);
  console.info('[market-subscription] 轮询已调度', { seconds, when, alarm });
  return alarm;
}

export async function checkSubscriptions() {
  return runSubscriptionCheck({
    readState: readStorage,
    saveSubscriptions,
    fetchMarketListings,
    notifyNewListing,
  });
}

function logCheckSummary(label, result) {
  console.info(`[market-subscription] ${label}`, result);
  if (result.checked > 0 && result.fetched === 0) {
    console.info(
      '[market-subscription] 未拉取到挂单：可能市场暂无符合条件的数据，或订阅物品名/稀有度/价格筛选不匹配',
    );
  }
}

export async function initMarketSubscription() {
  await initItemNames();

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== ALARM_NAME) return;
    console.info('[market-subscription] 定时轮询触发', alarm);
    checkSubscriptions()
      .then((result) => {
        logCheckSummary('轮询完成', result);
        return scheduleSubscriptionAlarm();
      })
      .catch((err) => {
        console.error('[market-subscription] 定时检查失败:', err);
      });
  });

  try {
    await scheduleSubscriptionAlarm();
    const result = await checkSubscriptions();
    logCheckSummary('初始化检查完成', result);
  } catch (err) {
    console.error('[market-subscription] 初始化失败:', err);
  }
}
