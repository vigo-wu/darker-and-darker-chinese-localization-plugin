import { resolveCanonicalItemName } from './item-name.js';

export { resolveCanonicalItemName };

export const STORAGE_KEYS = {
  SUBSCRIPTIONS: 'marketSubscriptions',
  EMAIL_SETTINGS: 'marketEmailSettings',
};

export const ALARM_NAME = 'market-subscription-check';

export const MIN_POLL_INTERVAL_SECONDS = 10;
export const MAX_POLL_INTERVAL_SECONDS = 3600;
export const DEFAULT_POLL_INTERVAL_SECONDS = 300;

export const DEFAULT_EMAIL_SETTINGS = {
  pollIntervalSeconds: DEFAULT_POLL_INTERVAL_SECONDS,
  lastUsedEmail: '',
  enableEmail: true,
  enableNotifications: true,
};

export const MAX_TRACKED_LISTING_IDS = 100;

const LEGACY_EMAIL_SETTING_KEYS = [
  'emailProvider',
  'resendApiKey',
  'hasResendApiKey',
  'fromEmail',
  'clearResendApiKey',
  'webhookUrl',
  'webhookSecret',
  'pollIntervalMinutes',
];

export function getPollIntervalSeconds(settings = {}) {
  const rawSeconds = Number(settings.pollIntervalSeconds);
  if (Number.isFinite(rawSeconds) && rawSeconds > 0) {
    return Math.max(MIN_POLL_INTERVAL_SECONDS, Math.min(MAX_POLL_INTERVAL_SECONDS, Math.round(rawSeconds)));
  }

  const legacyMinutes = Number(settings.pollIntervalMinutes);
  if (Number.isFinite(legacyMinutes) && legacyMinutes > 0) {
    return Math.max(
      MIN_POLL_INTERVAL_SECONDS,
      Math.min(MAX_POLL_INTERVAL_SECONDS, Math.round(legacyMinutes * 60)),
    );
  }

  return DEFAULT_POLL_INTERVAL_SECONDS;
}

export function splitPollIntervalSeconds(seconds) {
  const normalized = getPollIntervalSeconds({ pollIntervalSeconds: seconds });
  if (normalized % 60 === 0) {
    return { value: normalized / 60, unit: 'minutes' };
  }
  return { value: normalized, unit: 'seconds' };
}

export function toPollIntervalSeconds(value, unit) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const seconds = unit === 'minutes' ? Math.round(amount * 60) : Math.round(amount);
  return Math.max(MIN_POLL_INTERVAL_SECONDS, Math.min(MAX_POLL_INTERVAL_SECONDS, seconds));
}

export function getPollIntervalLimits(unit) {
  if (unit === 'minutes') {
    return {
      min: Math.ceil(MIN_POLL_INTERVAL_SECONDS / 60),
      max: Math.floor(MAX_POLL_INTERVAL_SECONDS / 60),
    };
  }
  return { min: MIN_POLL_INTERVAL_SECONDS, max: MAX_POLL_INTERVAL_SECONDS };
}

export function createSubscriptionId() {
  return crypto.randomUUID();
}

export function buildListingId(listing) {
  if (listing?.cursor != null) return `market-${listing.cursor}`;
  const id = listing.item_id || listing.id || 'unknown';
  if (listing?.created_at) return `listing-${id}-${listing.created_at}`;
  return `listing-${id}`;
}

export function normalizeItemName(name) {
  return String(name || '').trim();
}

export function getListingItemName(listing) {
  return resolveCanonicalItemName(listing?.item || listing?.archetype || listing?.name);
}

export function matchListing(subscription, listing) {
  const listingName = getListingItemName(listing);
  const targetName = resolveCanonicalItemName(subscription.itemName);
  if (!listingName || !targetName) return false;
  if (listingName.toLowerCase() !== targetName.toLowerCase()) return false;

  const rarityFilter = String(subscription.rarity || '').trim();
  if (rarityFilter) {
    const listingRarity = String(listing.rarity || '').trim();
    if (listingRarity.toLowerCase() !== rarityFilter.toLowerCase()) return false;
  }

  if (subscription.maxPrice != null && subscription.maxPrice !== '') {
    const price = Number(listing.price ?? 0);
    if (price > Number(subscription.maxPrice)) return false;
  }
  return true;
}

export function buildEmailHtml(listing, itemName) {
  const price = listing.price != null ? `${Number(listing.price).toLocaleString('en-US')}G` : '-';
  const seller = listing.seller || '-';
  const quantity = listing.quantity || 1;
  const time = listing.created_at
    ? new Date(listing.created_at).toLocaleString('zh-CN', { hour12: false })
    : '-';
  const rarity = listing.rarity || '-';

  return `
    <h2>市场挂单提醒</h2>
    <p>您订阅的物品 <strong>${itemName}</strong> 出现了新挂单：</p>
    <ul>
      <li>稀有度：${rarity}</li>
      <li>价格：${price}</li>
      <li>数量：${quantity}</li>
      <li>卖家：${seller}</li>
      <li>发布时间：${time}</li>
    </ul>
    <p>请打开 DarkTrans 市场查询页面查看详情。</p>
  `.trim();
}

export function buildNotificationBody(listing) {
  const price = listing.price != null ? `${Number(listing.price).toLocaleString('en-US')}G` : '-';
  const seller = listing.seller || '-';
  return `价格 ${price} · 卖家 ${seller}`;
}

export function isBrowserNotificationEnabled(settings = {}) {
  return settings.enableNotifications !== false;
}

export function buildTestNotificationContent() {
  return {
    title: '[DarkTrans] 浏览器通知测试',
    message: '如果您看到这条通知，说明市场订阅的浏览器提醒已配置正确。',
  };
}

export function showMarketNotification(subscription, listing, emailSettings = {}) {
  if (!isBrowserNotificationEnabled(emailSettings)) {
    return Promise.resolve(false);
  }

  if (typeof chrome === 'undefined' || !chrome.notifications?.create || !chrome.runtime?.getURL) {
    return Promise.resolve(false);
  }

  const listingId = buildListingId(listing);
  const title = `新挂单：${subscription.itemName}`;
  const message = buildNotificationBody(listing);

  return new Promise((resolve) => {
    chrome.notifications.create(`market-sub-${listingId}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title,
      message,
      priority: 2,
    }, (notificationId) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        console.error('[market-subscription] 浏览器通知失败:', lastError.message);
        resolve(false);
        return;
      }
      resolve(Boolean(notificationId));
    });
  });
}

export function sendTestBrowserNotification(emailSettings = {}) {
  if (!isBrowserNotificationEnabled(emailSettings)) {
    return Promise.reject(new Error('NOTIFICATIONS_DISABLED'));
  }

  if (typeof chrome === 'undefined' || !chrome.notifications?.create || !chrome.runtime?.getURL) {
    return Promise.reject(new Error('NOTIFICATIONS_UNAVAILABLE'));
  }

  const { title, message } = buildTestNotificationContent();

  return new Promise((resolve, reject) => {
    chrome.notifications.create(`market-sub-test-${Date.now()}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title,
      message,
      priority: 2,
    }, (notificationId) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }
      resolve({ ok: true, notificationId });
    });
  });
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  return EMAIL_PATTERN.test(String(email || '').trim());
}

export function getNotifyEmail(settings = {}) {
  return String(settings.lastUsedEmail || '').trim();
}

export function isEmailDeliveryConfigured(settings = {}, hasResendApiKey = false) {
  if (settings.enableEmail === false) return false;
  if (!hasResendApiKey) return false;
  return Boolean(getNotifyEmail(settings));
}

export function getEmailSettingsSummary(settings = {}, hasResendApiKey = false) {
  const emailReady = isEmailDeliveryConfigured(settings, hasResendApiKey);

  return {
    emailReady,
    notificationsReady: settings.enableNotifications !== false,
    pollIntervalSeconds: getPollIntervalSeconds(settings),
    lastUsedEmail: settings.lastUsedEmail || '',
    hasResendApiKey,
  };
}

export function sanitizeEmailSettingsForUi(settings = {}) {
  const merged = mergeEmailSettings(settings);
  return {
    ...merged,
    hasResendApiKey: undefined,
  };
}

export function mergeEmailSettings(stored = {}, next = {}) {
  const merged = {
    ...DEFAULT_EMAIL_SETTINGS,
    ...stored,
    ...next,
  };

  merged.pollIntervalSeconds = getPollIntervalSeconds({
    pollIntervalSeconds: next.pollIntervalSeconds ?? stored.pollIntervalSeconds,
    pollIntervalMinutes: next.pollIntervalMinutes ?? stored.pollIntervalMinutes,
  });
  merged.lastUsedEmail = String(merged.lastUsedEmail || '').trim();
  merged.enableEmail = merged.enableEmail !== false;
  merged.enableNotifications = merged.enableNotifications !== false;

  LEGACY_EMAIL_SETTING_KEYS.forEach((key) => {
    delete merged[key];
  });

  return merged;
}

export function validateEmailSettings(form = {}, options = {}) {
  const errors = {};

  const pollIntervalSeconds = Number.isFinite(Number(form.pollIntervalSeconds))
    ? Number(form.pollIntervalSeconds)
    : (() => {
      const amount = Number(form.pollIntervalValue);
      if (!Number.isFinite(amount) || amount <= 0) return 0;
      return form.pollIntervalUnit === 'minutes'
        ? Math.round(amount * 60)
        : Math.round(amount);
    })();

  if (
    !pollIntervalSeconds
    || pollIntervalSeconds < MIN_POLL_INTERVAL_SECONDS
    || pollIntervalSeconds > MAX_POLL_INTERVAL_SECONDS
  ) {
    errors.pollInterval = 'INVALID_POLL_INTERVAL';
  }

  if (form.lastUsedEmail && !isValidEmail(form.lastUsedEmail)) {
    errors.lastUsedEmail = 'INVALID_EMAIL';
  }

  if (form.enableEmail !== false) {
    if (!options.hasResendApiKey) {
      errors.resendConfig = 'MISSING_RESEND_API_KEY';
    }
    if (!String(form.lastUsedEmail || '').trim()) {
      errors.lastUsedEmail = 'MISSING_NOTIFY_EMAIL';
    }
  }

  return errors;
}

export function buildTestEmailContent() {
  const now = new Date().toLocaleString('zh-CN', { hour12: false });
  return {
    subject: '[DarkTrans] 市场订阅邮件测试',
    html: `
      <h2>DarkTrans 邮件测试</h2>
      <p>这是一封测试邮件，说明您的市场订阅邮件配置可以正常工作。</p>
      <p>发送时间：${now}</p>
      <p>收到此邮件后，当订阅物品出现新挂单时，您将收到类似格式的通知邮件。</p>
    `.trim(),
  };
}
