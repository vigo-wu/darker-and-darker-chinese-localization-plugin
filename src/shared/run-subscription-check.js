import {
  buildListingId,
  matchListing,
  MAX_TRACKED_LISTING_IDS,
  resolveCanonicalItemName,
} from './market-subscription.js';

function trimTrackedIds(ids) {
  if (ids.length <= MAX_TRACKED_LISTING_IDS) return ids;
  return ids.slice(ids.length - MAX_TRACKED_LISTING_IDS);
}

function withCanonicalItemName(subscription) {
  const itemName = resolveCanonicalItemName(subscription.itemName);
  if (itemName === subscription.itemName) return subscription;
  return {
    ...subscription,
    itemName,
    lastCheckedAt: null,
    lastNotifiedIds: [],
  };
}

function buildFetchKey(subscription) {
  const itemName = resolveCanonicalItemName(subscription.itemName);
  const rarity = String(subscription.rarity || '').trim();
  const maxPrice = subscription.maxPrice != null && subscription.maxPrice !== ''
    ? String(Number(subscription.maxPrice))
    : '';
  return `${itemName}|${rarity}|${maxPrice}`;
}

/**
 * @param {{
 *   readState: () => Promise<{ subscriptions: Array, emailSettings: object }>,
 *   saveSubscriptions: (subscriptions: Array) => Promise<void>,
 *   fetchMarketListings: (itemName: string, subscription?: object) => Promise<Array>,
 *   notifyNewListing: (subscription: object, listing: object, emailSettings: object) => Promise<void>,
 * }} deps
 */
export async function runSubscriptionCheck(deps) {
  const { subscriptions: rawSubscriptions, emailSettings } = await deps.readState();
  const subscriptions = rawSubscriptions.map(withCanonicalItemName);
  const activeSubscriptions = subscriptions.filter((sub) => sub.enabled !== false);
  if (!activeSubscriptions.length) {
    return { checked: 0, notified: 0, matched: 0, seeded: 0, fetched: 0 };
  }

  const fetchGroups = new Map();
  for (const subscription of activeSubscriptions) {
    const key = buildFetchKey(subscription);
    if (!fetchGroups.has(key)) {
      fetchGroups.set(key, subscription);
    }
  }

  const listingsByKey = {};
  let fetchedCount = 0;

  for (const [key, sampleSubscription] of fetchGroups) {
    const itemName = resolveCanonicalItemName(sampleSubscription.itemName);
    try {
      const listings = await deps.fetchMarketListings(itemName, sampleSubscription);
      listingsByKey[key] = listings;
      fetchedCount += listings.length;
    } catch (err) {
      console.error(`[market-subscription] 拉取 ${itemName} 失败:`, err);
      listingsByKey[key] = [];
    }
  }

  let notifiedCount = 0;
  let matchedCount = 0;
  let seededCount = 0;
  const updatedSubscriptions = [];

  for (const subscription of subscriptions) {
    const canonicalName = resolveCanonicalItemName(subscription.itemName);
    const baseSubscription = { ...subscription, itemName: canonicalName };

    if (subscription.enabled === false) {
      updatedSubscriptions.push(baseSubscription);
      continue;
    }

    const listings = listingsByKey[buildFetchKey(baseSubscription)] || [];
    const knownIds = new Set(subscription.lastNotifiedIds || []);
    const matchingListings = listings.filter((listing) => matchListing(baseSubscription, listing));
    matchedCount += matchingListings.length;

    if (!subscription.lastCheckedAt) {
      const seededIds = [
        ...(subscription.lastNotifiedIds || []),
        ...matchingListings.map((listing) => buildListingId(listing)),
      ];
      seededCount += matchingListings.length;
      updatedSubscriptions.push({
        ...baseSubscription,
        lastCheckedAt: new Date().toISOString(),
        lastNotifiedIds: trimTrackedIds(seededIds),
      });
      continue;
    }

    const newListings = matchingListings.filter(
      (listing) => !knownIds.has(buildListingId(listing)),
    );

    if (!newListings.length) {
      updatedSubscriptions.push({
        ...baseSubscription,
        lastCheckedAt: new Date().toISOString(),
      });
      continue;
    }

    const newIds = [...(subscription.lastNotifiedIds || [])];
    for (const listing of newListings) {
      await deps.notifyNewListing(baseSubscription, listing, emailSettings);
      newIds.push(buildListingId(listing));
      notifiedCount += 1;
    }

    updatedSubscriptions.push({
      ...baseSubscription,
      lastCheckedAt: new Date().toISOString(),
      lastNotifiedAt: new Date().toISOString(),
      lastNotifiedIds: trimTrackedIds(newIds),
    });
  }

  await deps.saveSubscriptions(updatedSubscriptions);
  return {
    checked: activeSubscriptions.length,
    notified: notifiedCount,
    matched: matchedCount,
    seeded: seededCount,
    fetched: fetchedCount,
  };
}
