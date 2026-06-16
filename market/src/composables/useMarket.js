import { ref, reactive, computed, onMounted } from 'vue';
import {
  fetchMarket,
  fetchItems,
  fetchAttributes,
  fetchPopulation,
  fetchHealthCheck,
} from '@/api/darkerdb';
import {
  RARITY_OPTIONS,
  SLOT_OPTIONS,
  TYPE_OPTIONS,
  SOLD_OPTIONS,
  DEFAULT_HAS_SOLD,
} from '@/constants/market';
import { useMarketI18n } from '@/composables/useMarketI18n';
import { getRowId } from '@/utils/market';

export function useMarket() {
  const { t, td, toEnglish, translateRarity, labelEnum } = useMarketI18n();

  const mode = ref('market');
  const items = ref([]);
  const loading = ref(false);
  const loadingMore = ref(false);
  const error = ref('');
  const hasMore = ref(true);
  const pageTo = ref(null);
  const currentPage = ref(1);
  const sortMode = ref(null);
  const attributeMap = ref({});
  const itemNames = ref([]);
  const expandedKeys = ref([]);

  const meta = reactive({
    apiVersion: '-',
    numOnline: '-',
    numDungeon: '-',
    numLobby: '-',
  });

  const filters = reactive({
    search: '',
    rarity: '',
    slot: '',
    type: '',
    minPrice: '',
    maxPrice: '',
    seller: '',
    hasSold: DEFAULT_HAS_SOLD,
  });

  const showAdvanced = ref(false);
  const detailItem = ref(null);
  const detailOpen = ref(false);

  const isCatalogMode = computed(() => mode.value === 'items');

  const RARITIES = computed(() =>
    RARITY_OPTIONS.map((opt) => ({
      ...opt,
      label: labelEnum('rarity', opt.value),
    })),
  );

  const SLOT_TYPES = computed(() =>
    SLOT_OPTIONS.map((opt) => ({
      ...opt,
      label: labelEnum('slot', opt.value),
    })),
  );

  const ITEM_TYPES = computed(() =>
    TYPE_OPTIONS.map((opt) => ({
      ...opt,
      label: labelEnum('type', opt.value),
    })),
  );

  const SOLD_FILTER_OPTIONS = computed(() =>
    SOLD_OPTIONS.map((opt) => {
      if (opt.value === '') return { ...opt, label: t('filter.all') };
      if (opt.value === 'false') return { ...opt, label: t('filter.onSale') };
      return { ...opt, label: t('filter.sold') };
    }),
  );

  const activeFilterTags = computed(() => {
    const tags = [];
    if (filters.search) tags.push({ key: 'search', label: td(resolveSearchTerm()) || filters.search });
    if (filters.rarity) tags.push({ key: 'rarity', label: translateRarity(filters.rarity) });
    if (filters.slot) tags.push({ key: 'slot', label: labelEnum('slot', filters.slot) });
    if (filters.type) tags.push({ key: 'type', label: labelEnum('type', filters.type) });
    if (filters.minPrice || filters.maxPrice) {
      tags.push({
        key: 'price',
        label: `${filters.minPrice || '0'}-${filters.maxPrice || '∞'}G`,
      });
    }
    if (filters.seller) tags.push({ key: 'seller', label: filters.seller });
    if (filters.hasSold !== '' && filters.hasSold !== DEFAULT_HAS_SOLD) {
      tags.push({
        key: 'hasSold',
        label: filters.hasSold === 'true' ? t('filter.sold') : t('filter.onSale'),
      });
    }
    return tags;
  });

  const searchOptions = computed(() => {
    if (!filters.search) return [];
    const lower = filters.search.toLowerCase();
    return itemNames.value
      .filter((name) => {
        const translated = td(name);
        return (
          name.toLowerCase().includes(lower) ||
          translated.toLowerCase().includes(lower)
        );
      })
      .slice(0, 20)
      .map((name) => ({
        value: name,
        label: td(name),
      }));
  });

  function resolveMode() {
    mode.value = filters.slot || filters.type ? 'items' : 'market';
  }

  function resolveSearchTerm() {
    if (!filters.search) return '';
    return toEnglish(filters.search, itemNames.value);
  }

  function buildMarketParams(forLoadMore = false) {
    const params = { condense: 'true', limit: '25', order: 'desc' };
    const searchTerm = resolveSearchTerm();
    if (searchTerm) params.item = searchTerm;
    if (filters.rarity) params.rarity = filters.rarity;
    if (filters.minPrice) params.price = `${filters.minPrice}:${filters.maxPrice || ''}`.replace(/:$/, '');
    else if (filters.maxPrice) params.price = `:${filters.maxPrice}`;
    if (filters.seller) params.seller = filters.seller;
    if (filters.hasSold !== '') params.has_sold = filters.hasSold;
    if (forLoadMore && pageTo.value) params.to = pageTo.value;
    return params;
  }

  function buildItemsParams(page) {
    const params = { condense: 'true', limit: '25', page: String(page || 1) };
    const searchTerm = resolveSearchTerm();
    if (searchTerm) params.name = searchTerm;
    if (filters.rarity) params.rarity = filters.rarity;
    if (filters.slot) params.slot_type = filters.slot;
    if (filters.type) params.type = filters.type;
    return params;
  }

  function applyDisplaySort(list) {
    if (sortMode.value) {
      return [...list].sort((a, b) => {
        const priceA = a.price ?? a.vendor_price ?? 0;
        const priceB = b.price ?? b.vendor_price ?? 0;
        const diff = priceA - priceB;
        return sortMode.value === 'asc' ? diff : -diff;
      });
    }
    return [...list].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });
  }

  function appendItems(existing, batch) {
    if (!batch.length) return existing;
    const seen = new Set(existing.map((item) => getRowId(item)));
    const uniqueBatch = batch.filter((item) => !seen.has(getRowId(item)));
    return [...existing, ...uniqueBatch];
  }

  async function loadData(reset = true) {
    if (loading.value || loadingMore.value) return;

    resolveMode();
    error.value = '';

    if (reset) {
      loading.value = true;
      items.value = [];
      pageTo.value = null;
      currentPage.value = 1;
      hasMore.value = true;
      expandedKeys.value = [];
    } else {
      loadingMore.value = true;
    }

    try {
      if (mode.value === 'items') {
        const page = reset ? 1 : currentPage.value + 1;
        const data = await fetchItems(buildItemsParams(page));
        const batch = data.body || [];

        items.value = applyDisplaySort(reset ? batch : appendItems(items.value, batch));
        currentPage.value = page;

        const pagination = data.pagination || {};
        hasMore.value = pagination.page < pagination.num_pages;
      } else {
        const params = buildMarketParams(!reset);
        const data = await fetchMarket(params);
        const batch = data.body || [];

        items.value = applyDisplaySort(reset ? batch : appendItems(items.value, batch));

        const lastItem = batch[batch.length - 1];
        if (lastItem?.created_at) {
          pageTo.value = lastItem.created_at;
        }

        hasMore.value = batch.length >= Number(params.limit || 25);
      }
    } catch (err) {
      if (reset) {
        error.value = err.message || t('error.loadFailed');
      } else {
        throw err;
      }
    } finally {
      loading.value = false;
      loadingMore.value = false;
    }
  }

  function search() {
    loadData(true);
  }

  function refresh() {
    loadData(true);
  }

  function loadMore() {
    return loadData(false);
  }

  function toggleSort(mode) {
    sortMode.value = sortMode.value === mode ? null : mode;
    loadData(true);
  }

  function clearFilter(key) {
    if (key === 'search') filters.search = '';
    else if (key === 'rarity') filters.rarity = '';
    else if (key === 'slot') filters.slot = '';
    else if (key === 'type') filters.type = '';
    else if (key === 'price') {
      filters.minPrice = '';
      filters.maxPrice = '';
    } else if (key === 'seller') filters.seller = '';
    else if (key === 'hasSold') filters.hasSold = DEFAULT_HAS_SOLD;
    loadData(true);
  }

  function clearAllFilters() {
    Object.assign(filters, {
      search: '',
      rarity: '',
      slot: '',
      type: '',
      minPrice: '',
      maxPrice: '',
      seller: '',
      hasSold: DEFAULT_HAS_SOLD,
    });
    loadData(true);
  }

  function openDetail(item) {
    detailItem.value = item;
    detailOpen.value = true;
  }

  function closeDetail() {
    detailOpen.value = false;
    detailItem.value = null;
  }

  async function loadItemNames() {
    try {
      const names = new Set();
      for (let page = 1; page <= 5; page++) {
        const data = await fetchItems({ limit: '50', page: String(page) });
        const batch = data.body || [];
        batch.forEach((item) => names.add(item.name));
        if (batch.length < 50) break;
      }
      itemNames.value = [...names].sort((a, b) => a.localeCompare(b, 'zh-CN'));
    } catch {
      itemNames.value = [];
    }
  }

  async function loadMeta() {
    try {
      const [health, population] = await Promise.all([fetchHealthCheck(), fetchPopulation()]);
      meta.apiVersion = health.version || '-';
      meta.numOnline = population.num_online?.toLocaleString() || '-';
      meta.numDungeon = population.num_dungeon?.toLocaleString() || '-';
      meta.numLobby = population.num_lobby?.toLocaleString() || '-';
    } catch {
      meta.apiVersion = '-';
    }
  }

  async function loadAttributeMap() {
    try {
      const attrs = await fetchAttributes();
      const map = {};
      attrs.forEach((attr) => {
        map[attr.field] = attr.display;
      });
      attributeMap.value = map;
    } catch {
      attributeMap.value = {};
    }
  }

  onMounted(async () => {
    await Promise.all([loadAttributeMap(), loadItemNames(), loadMeta()]);
    await loadData(true);
  });

  return {
    mode,
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    sortMode,
    attributeMap,
    meta,
    filters,
    showAdvanced,
    detailItem,
    detailOpen,
    isCatalogMode,
    activeFilterTags,
    searchOptions,
    RARITIES,
    SLOT_TYPES,
    ITEM_TYPES,
    SOLD_FILTER_OPTIONS,
    search,
    refresh,
    loadMore,
    toggleSort,
    clearFilter,
    clearAllFilters,
    openDetail,
    closeDetail,
  };
}
