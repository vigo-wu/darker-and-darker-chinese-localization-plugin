export function formatPrice(price) {
  if (price == null) return '-';
  return `${Number(price).toLocaleString('en-US')}G`;
}

export function formatTime(iso, t) {
  if (!iso) return '-';
  const date = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now - date) / 60000);

  if (diffMin < 1) return t('time.justNow');
  if (diffMin < 60) return t('time.minutesAgo', { n: diffMin });
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return t('time.hoursAgo', { n: diffHour });
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return t('time.daysAgo', { n: diffDay });

  return date
    .toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(/\//g, '-');
}

function formatStatValue(field, value) {
  if (
    typeof value === 'number' &&
    (field.includes('bonus') ||
      field.includes('penetration') ||
      field.includes('reduction') ||
      field.includes('speed'))
  ) {
    return value > 0 && value < 10 ? `${value}%` : value;
  }
  return value;
}

export function parseStats(item, attributeMap = {}, translate) {
  const primary = [];
  const secondary = [];

  for (const [key, value] of Object.entries(item)) {
    if (value == null || key.startsWith('socket_')) continue;

    if (key.startsWith('primary_')) {
      const field = key.slice(8);
      const rawName = attributeMap[field] || field.replace(/_/g, ' ');
      primary.push({
        name: translate ? translate(rawName) : rawName,
        value: formatStatValue(field, value),
      });
    } else if (key.startsWith('secondary_')) {
      const field = key.slice(10);
      const rawName = attributeMap[field] || field.replace(/_/g, ' ');
      secondary.push({
        name: translate ? translate(rawName) : rawName,
        value: formatStatValue(field, value),
      });
    }
  }

  return { primary, secondary };
}

export function getItemId(item) {
  return item.item_id || item.id;
}

export function getItemName(item, translate) {
  const name = item.item || item.name;
  if (!name) return '';
  return translate ? translate(name) : name;
}

export function getRowId(item) {
  if (item?.cursor != null) return `market-${item.cursor}`;
  const id = getItemId(item);
  if (item?.created_at) return `listing-${id}-${item.created_at}`;
  return `item-${id}`;
}

export function isCatalogItem(item) {
  return !item.created_at && (item.vendor_price != null || item.gear_score != null);
}
