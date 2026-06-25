export const STORAGE_KEYS = {
  SUBSCRIPTIONS: 'marketSubscriptions',
  EMAIL_SETTINGS: 'marketEmailSettings',
};

export const ALARM_NAME = 'market-subscription-check';

export const DEFAULT_EMAIL_SETTINGS = {
  pollIntervalMinutes: 5,
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
];

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

import { resolveCanonicalItemName } from './item-name.js';

export { resolveCanonicalItemName };

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
    pollIntervalMinutes: Math.max(1, Number(settings.pollIntervalMinutes) || 5),
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

  merged.pollIntervalMinutes = Math.max(1, Math.min(60, Number(merged.pollIntervalMinutes) || 5));
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

  if (form.pollIntervalMinutes == null || Number(form.pollIntervalMinutes) < 1 || Number(form.pollIntervalMinutes) > 60) {
    errors.pollIntervalMinutes = 'INVALID_POLL_INTERVAL';
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
