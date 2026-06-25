<script setup>
import { computed } from 'vue';
import {
  ShopOutlined,
  SearchOutlined,
  ReloadOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  UserOutlined,
  TeamOutlined,
  BellOutlined,
  EyeOutlined,
} from '@ant-design/icons-vue';
import ItemIcon from '@/components/ItemIcon.vue';
import ItemDetailModal from '@/components/ItemDetailModal.vue';
import SubscriptionPanel from '@/components/SubscriptionPanel.vue';
import SubscribeItemModal from '@/components/SubscribeItemModal.vue';
import { useMarket } from '@/composables/useMarket';
import { useItemSubscription } from '@/composables/useItemSubscription';
import { useMarketI18n } from '@/composables/useMarketI18n';
import { toEnglish } from '@/i18n';
import itemsData from '@locales/Items.json';
import { rarityColor } from '@/constants/market';
import {
  formatPrice,
  formatTime,
  parseStats,
  getItemId,
  getItemName,
  getRowId,
} from '@/utils/market';

const { t, td, translateRarity, translateSlotOrType } = useMarketI18n();

const canonicalItemNames = Object.keys(itemsData.entries || {});

const {
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
  itemSelectOptions,
  filterItemOption,
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
} = useMarket();

const {
  subscriptions,
  emailSettings,
  emailSettingsSummary,
  loading: subscriptionLoading,
  savingSettings,
  testingEmail,
  checking,
  settingsOpen,
  subscribeOpen,
  subscribeDefaults,
  openSubscribe,
  setSettingsOpen,
  submitSubscribe,
  deleteSubscription,
  setSubscriptionEnabled,
  updateEmailSettings,
  sendTestEmail,
  checkNow,
  hasSubscriptionFor,
} = useItemSubscription();

const selectedSearchItem = computed(() => toEnglish(filters.search, canonicalItemNames) || filters.search || '');

function handleSubscribeCurrentItem() {
  openSubscribe(toEnglish(filters.search, canonicalItemNames), filters.rarity || '');
}

function handleSubscribeRow(record) {
  openSubscribe(record.item || record.name || '', record.rarity || '');
}

function getRowItemName(record) {
  return record.item || record.name || '';
}

function isRowSubscribed(record) {
  return hasSubscriptionFor(getRowItemName(record));
}

const tableColumns = computed(() => {
  if (isCatalogMode.value) {
    return [
      { title: t('table.item'), key: 'item', ellipsis: true },
      { title: t('table.slotType'), dataIndex: 'slot_type', key: 'slot', width: 120 },
      { title: t('table.gearScore'), dataIndex: 'gear_score', key: 'gear_score', width: 100 },
      { title: t('table.vendorPrice'), key: 'vendor_price', width: 120, align: 'right' },
      { title: t('table.action'), key: 'action', width: 56, align: 'center' },
    ];
  }
  return [
    { title: t('table.item'), key: 'item', ellipsis: true },
    { title: t('table.time'), key: 'time', width: 130 },
    { title: t('table.quantity'), dataIndex: 'quantity', key: 'quantity', width: 80, align: 'center' },
    { title: t('table.price'), key: 'price', width: 120, align: 'right' },
    { title: t('table.action'), key: 'action', width: 72, align: 'center' },
  ];
});

function getPreviewStats(record) {
  return parseStats(record, attributeMap.value, td);
}

function displayItemName(record) {
  return getItemName(record, td);
}

function displayDescription(record) {
  const text = record.description || '';
  const translated = td(text);
  const preview = translated.slice(0, 80);
  return translated.length > 80 ? `${preview}...` : preview;
}

</script>

<template>
  <div class="market-page">
    <a-card class="header-card" :bordered="false">
      <div class="header-row">
        <div class="header-title">
          <ShopOutlined class="header-icon" />
          <h1>{{ t('market.title') }}</h1>
          <a-tag v-if="isCatalogMode" color="blue">{{ t('market.catalogMode') }}</a-tag>
          <a-tag v-else color="orange">{{ t('market.marketMode') }}</a-tag>
        </div>
        <a-space wrap class="header-stats">
          <a-statistic :title="t('market.online')" :value="meta.numOnline" />
          <a-statistic :title="t('market.dungeon')" :value="meta.numDungeon">
            <template #prefix><UserOutlined /></template>
          </a-statistic>
          <a-statistic :title="t('market.lobby')" :value="meta.numLobby">
            <template #prefix><TeamOutlined /></template>
          </a-statistic>
          <a-statistic :title="t('market.api')" :value="meta.apiVersion" />
        </a-space>
      </div>
    </a-card>

    <a-card class="filter-card" :bordered="false">
      <a-space wrap class="filter-row">
        <a-select
          v-model:value="filters.search"
          :options="itemSelectOptions"
          :filter-option="filterItemOption"
          show-search
          allow-clear
          style="width: 280px"
          :placeholder="t('market.searchPlaceholder')"
          @change="search"
        />

        <a-select v-model:value="filters.rarity" style="width: 140px" @change="search">
          <a-select-option v-for="opt in RARITIES" :key="opt.value || 'all'" :value="opt.value">
            {{ opt.label }}
          </a-select-option>
        </a-select>

        <a-select v-model:value="filters.slot" style="width: 120px" @change="search">
          <a-select-option v-for="opt in SLOT_TYPES" :key="opt.value || 'all'" :value="opt.value">
            {{ opt.label }}
          </a-select-option>
        </a-select>

        <a-select v-model:value="filters.type" style="width: 120px" @change="search">
          <a-select-option v-for="opt in ITEM_TYPES" :key="opt.value || 'all'" :value="opt.value">
            {{ opt.label }}
          </a-select-option>
        </a-select>

        <a-button type="primary" @click="search">
          <template #icon><SearchOutlined /></template>
          {{ t('market.search') }}
        </a-button>

        <a-button @click="showAdvanced = !showAdvanced">{{ t('market.advancedFilters') }}</a-button>

        <a-button @click="refresh">
          <template #icon><ReloadOutlined /></template>
          {{ t('market.refresh') }}
        </a-button>

        <a-button
          v-if="selectedSearchItem"
          :type="hasSubscriptionFor(selectedSearchItem) ? 'default' : 'primary'"
          ghost
          @click="handleSubscribeCurrentItem"
        >
          <template #icon><BellOutlined /></template>
          {{ hasSubscriptionFor(selectedSearchItem) ? t('subscription.subscribed') : t('subscription.subscribe') }}
        </a-button>

        <a-button-group>
          <a-button
            :type="sortMode === 'asc' ? 'primary' : 'default'"
            @click="toggleSort('asc')"
          >
            <SortAscendingOutlined />
          </a-button>
          <a-button
            :type="sortMode === 'desc' ? 'primary' : 'default'"
            @click="toggleSort('desc')"
          >
            <SortDescendingOutlined />
          </a-button>
        </a-button-group>
      </a-space>

      <a-form v-if="showAdvanced" layout="inline" class="advanced-form">
        <a-form-item :label="t('market.minPrice')">
          <a-input v-model:value="filters.minPrice" placeholder="0" style="width: 100px" @press-enter="search" />
        </a-form-item>
        <a-form-item :label="t('market.maxPrice')">
          <a-input
            v-model:value="filters.maxPrice"
            :placeholder="t('market.unlimited')"
            style="width: 100px"
            @press-enter="search"
          />
        </a-form-item>
        <a-form-item :label="t('market.seller')">
          <a-input
            v-model:value="filters.seller"
            :placeholder="t('market.sellerPlaceholder')"
            allow-clear
            @press-enter="search"
          />
        </a-form-item>
        <a-form-item :label="t('market.status')">
          <a-select v-model:value="filters.hasSold" style="width: 120px" @change="search">
            <a-select-option
              v-for="opt in SOLD_FILTER_OPTIONS"
              :key="opt.value || 'all'"
              :value="opt.value"
            >
              {{ opt.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>

      <div v-if="activeFilterTags.length" class="quick-filters">
        <span class="quick-label">{{ t('market.selected') }}</span>
        <a-tag
          v-for="tag in activeFilterTags"
          :key="tag.key"
          closable
          @close="clearFilter(tag.key)"
        >
          {{ tag.label }}
        </a-tag>
        <a-button type="link" size="small" @click="clearAllFilters">{{ t('market.clearAll') }}</a-button>
      </div>
    </a-card>

    <SubscriptionPanel
      :subscriptions="subscriptions"
      :email-settings="emailSettings"
      :email-settings-summary="emailSettingsSummary"
      :loading="subscriptionLoading"
      :saving-settings="savingSettings"
      :testing-email="testingEmail"
      :checking="checking"
      :settings-open="settingsOpen"
      @update:settings-open="setSettingsOpen"
      @subscribe="openSubscribe()"
      @remove="deleteSubscription"
      @toggle="setSubscriptionEnabled"
      @save-settings="updateEmailSettings"
      @test-email="sendTestEmail"
      @check-now="checkNow"
    />

    <a-card class="list-card" :bordered="false">
      <a-spin :spinning="loading">
        <a-alert
          v-if="error"
          type="error"
          :message="t('market.loadFailed', { error })"
          show-icon
          class="error-alert"
        >
          <template #action>
            <a-button size="small" @click="refresh">{{ t('market.retry') }}</a-button>
          </template>
        </a-alert>

        <a-empty v-else-if="!items.length && !loading" :description="t('market.empty')" />

        <a-table
          v-else
          class="market-table"
          :columns="tableColumns"
          :data-source="items"
          :row-key="getRowId"
          :pagination="false"
          size="middle"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'item'">
              <div class="item-cell">
                <ItemIcon
                  :item-id="getItemId(record)"
                  :alt="displayItemName(record)"
                  :size="48"
                />
                <div class="item-meta">
                  <div class="item-title">
                    <span class="rarity-text" :style="{ color: rarityColor(record.rarity) }">
                      [{{ translateRarity(record.rarity) }}]
                    </span>
                    {{ displayItemName(record) }}
                  </div>
                  <div v-if="isCatalogMode && record.description" class="item-desc">
                    {{ displayDescription(record) }}
                  </div>
                  <div v-else-if="!isCatalogMode" class="item-stats">
                    <a-tag
                      v-for="(stat, idx) in getPreviewStats(record).primary.slice(0, 3)"
                      :key="`p-${idx}`"
                      class="mini-tag"
                    >
                      {{ stat.name }}: {{ stat.value }}
                    </a-tag>
                    <a-tag
                      v-for="(stat, idx) in getPreviewStats(record).secondary.slice(0, 3)"
                      :key="`s-${idx}`"
                      color="orange"
                      class="mini-tag"
                    >
                      {{ stat.name }}: {{ stat.value }}
                    </a-tag>
                  </div>
                </div>
              </div>
            </template>

            <template v-else-if="column.key === 'slot'">
              {{ translateSlotOrType(record.slot_type || record.type) }}
            </template>

            <template v-else-if="column.key === 'time'">
              {{ formatTime(record.created_at, t) }}
            </template>

            <template v-else-if="column.key === 'quantity'">
              {{ record.quantity || 1 }}
            </template>

            <template v-else-if="column.key === 'price'">
              <span class="price-gold">{{ formatPrice(record.price) }}</span>
            </template>

            <template v-else-if="column.key === 'vendor_price'">
              <span class="price-gold">{{ formatPrice(record.vendor_price) }}</span>
            </template>

            <template v-else-if="column.key === 'action'">
              <div class="action-cell">
                <a-tooltip :title="t('market.detail')">
                  <a-button type="text" size="small" class="action-btn" @click="openDetail(record)">
                    <template #icon><EyeOutlined /></template>
                  </a-button>
                </a-tooltip>
                <a-tooltip
                  v-if="!isCatalogMode"
                  :title="isRowSubscribed(record) ? t('table.subscribed') : t('table.subscribe')"
                >
                  <a-button
                    type="text"
                    size="small"
                    class="action-btn"
                    :class="{ 'action-btn--subscribed': isRowSubscribed(record) }"
                    @click="handleSubscribeRow(record)"
                  >
                    <template #icon><BellOutlined /></template>
                  </a-button>
                </a-tooltip>
              </div>
            </template>
          </template>

          <template v-if="!isCatalogMode" #expandedRowRender="{ record }">
            <a-row :gutter="16">
              <a-col :span="12">
                <div class="expand-title">{{ t('table.primaryStats') }}</div>
                <a-descriptions v-if="getPreviewStats(record).primary.length" size="small" :column="1">
                  <a-descriptions-item
                    v-for="(stat, idx) in getPreviewStats(record).primary"
                    :key="idx"
                    :label="stat.name"
                  >
                    {{ stat.value }}
                  </a-descriptions-item>
                </a-descriptions>
                <span v-else class="empty-stat">{{ t('table.noPrimaryStats') }}</span>
              </a-col>
              <a-col :span="12">
                <div class="expand-title">{{ t('table.secondaryStats') }}</div>
                <a-descriptions v-if="getPreviewStats(record).secondary.length" size="small" :column="1">
                  <a-descriptions-item
                    v-for="(stat, idx) in getPreviewStats(record).secondary"
                    :key="idx"
                    :label="stat.name"
                  >
                    <span class="stat-secondary">{{ stat.value }}</span>
                  </a-descriptions-item>
                </a-descriptions>
                <span v-else class="empty-stat">{{ t('table.noSecondaryStats') }}</span>
              </a-col>
            </a-row>
          </template>
        </a-table>

        <div v-if="hasMore && items.length" class="load-more">
          <a-button :loading="loadingMore" @click="loadMore">{{ t('market.loadMore') }}</a-button>
        </div>
      </a-spin>
    </a-card>

    <footer class="page-footer">
      {{ t('market.dataSource') }}
      <a href="https://darkerdb.com" target="_blank" rel="noopener">DarkerDB API</a>
      · {{ t('market.reference') }}
      <a href="https://dnd.wiki/market" target="_blank" rel="noopener">dnd.wiki/market</a>
    </footer>

    <ItemDetailModal
      v-model:open="detailOpen"
      :item="detailItem"
      :attribute-map="attributeMap"
      :catalog-mode="isCatalogMode"
      @update:open="(v) => !v && closeDetail()"
      @subscribe="handleSubscribeRow"
    />

    <SubscribeItemModal
      v-model:open="subscribeOpen"
      :defaults="subscribeDefaults"
      :rarity-options="RARITIES"
      :item-options="itemSelectOptions"
      :filter-item-option="filterItemOption"
      @submit="submitSubscribe"
    />
  </div>
</template>

<style scoped>
.market-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.header-card,
.filter-card,
.list-card {
  background: #1a1a1a;
  border: 1px solid #333;
}

.header-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: space-between;
}

.header-title {
  align-items: center;
  display: flex;
  gap: 12px;
}

.header-title h1 {
  font-size: 22px;
  font-weight: 700;
  margin: 0;
}

.header-icon {
  color: #c6a46c;
  font-size: 24px;
}

.header-stats :deep(.ant-statistic-title) {
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
}

.header-stats :deep(.ant-statistic-content) {
  color: rgba(255, 255, 255, 0.85);
  font-size: 18px;
}

.filter-row {
  width: 100%;
}

.advanced-form {
  border-top: 1px solid #333;
  margin-top: 12px;
  padding-top: 12px;
}

.quick-filters {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.quick-label {
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
}

.error-alert {
  margin-bottom: 16px;
}

.item-cell {
  align-items: flex-start;
  display: flex;
  gap: 12px;
}

.item-meta {
  min-width: 0;
}

.item-title {
  font-weight: 600;
  line-height: 1.4;
}

.item-desc,
.item-stats {
  color: rgba(255, 255, 255, 0.55);
  font-size: 12px;
  margin-top: 4px;
}

.mini-tag {
  font-size: 11px;
  margin-bottom: 4px;
}

.expand-title {
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
  margin-bottom: 8px;
}

.empty-stat {
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
  font-style: italic;
}

.load-more {
  margin-top: 16px;
  text-align: center;
}

.action-cell {
  align-items: center;
  display: inline-flex;
  gap: 2px;
  justify-content: center;
}

.action-btn {
  color: rgba(255, 255, 255, 0.55);
  height: 28px;
  width: 28px;
}

.action-btn:hover {
  color: #c6a46c;
}

.action-btn--subscribed {
  color: #c6a46c;
}

.page-footer {
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
  padding: 8px 0 16px;
  text-align: center;
}
</style>
