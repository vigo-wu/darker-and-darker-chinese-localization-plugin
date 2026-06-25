<script setup>
import { computed } from 'vue';
import { BellOutlined } from '@ant-design/icons-vue';
import ItemIcon from '@/components/ItemIcon.vue';
import { useMarketI18n } from '@/composables/useMarketI18n';
import { rarityColor } from '@/constants/market';
import {
  formatPrice,
  formatTime,
  parseStats,
  getItemId,
  getItemName,
  isCatalogItem,
} from '@/utils/market';

const props = defineProps({
  open: Boolean,
  item: Object,
  attributeMap: { type: Object, default: () => ({}) },
  catalogMode: Boolean,
});

const emit = defineEmits(['update:open', 'subscribe']);

const { t, td, translateRarity, translateSlotOrType } = useMarketI18n();

const visible = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
});

const itemId = computed(() => (props.item ? getItemId(props.item) : ''));
const itemName = computed(() => (props.item ? getItemName(props.item, td) : ''));
const isCatalog = computed(() => props.catalogMode || (props.item && isCatalogItem(props.item)));

const stats = computed(() =>
  props.item && !isCatalog.value
    ? parseStats(props.item, props.attributeMap, td)
    : { primary: [], secondary: [] },
);

const itemDescription = computed(() => {
  if (!props.item?.description) return '';
  return td(props.item.description);
});

const saleStatus = computed(() => {
  if (!props.item) return '-';
  if (props.item.has_sold) return t('detail.sold');
  if (props.item.has_expired) return t('detail.expired');
  return t('detail.onSale');
});

function close() {
  visible.value = false;
}

function subscribeItem() {
  if (props.item) {
    emit('subscribe', props.item);
  }
}
</script>

<template>
  <a-modal
    v-model:open="visible"
    :title="itemName"
    width="520px"
    destroy-on-close
    @cancel="close"
  >
    <div v-if="item" class="detail">
      <div class="detail-header">
        <ItemIcon :item-id="itemId" :alt="itemName" :size="64" />
        <div>
          <a-tag :color="rarityColor(item.rarity)" class="rarity-tag">
            {{ translateRarity(item.rarity) }}
          </a-tag>
        </div>
      </div>

      <a-descriptions v-if="isCatalog" bordered size="small" :column="2" class="desc-block">
        <a-descriptions-item :label="t('detail.vendorPrice')">
          <span class="price-gold">{{ formatPrice(item.vendor_price) }}</span>
        </a-descriptions-item>
        <a-descriptions-item :label="t('detail.gearScore')">{{ item.gear_score ?? '-' }}</a-descriptions-item>
        <a-descriptions-item :label="t('detail.type')">
          {{ translateSlotOrType(item.type) }}
        </a-descriptions-item>
        <a-descriptions-item :label="t('detail.slot')">
          {{ translateSlotOrType(item.slot_type) }}
        </a-descriptions-item>
        <a-descriptions-item :label="t('detail.adventurePoints')">{{ item.adventure_points ?? '-' }}</a-descriptions-item>
        <a-descriptions-item :label="t('detail.itemId')">{{ itemId }}</a-descriptions-item>
      </a-descriptions>

      <a-descriptions v-else bordered size="small" :column="2" class="desc-block">
        <a-descriptions-item :label="t('detail.price')">
          <span class="price-gold">{{ formatPrice(item.price) }}</span>
        </a-descriptions-item>
        <a-descriptions-item :label="t('detail.unitPrice')">{{ formatPrice(item.price_per_unit) }}</a-descriptions-item>
        <a-descriptions-item :label="t('detail.seller')">{{ item.seller || '-' }}</a-descriptions-item>
        <a-descriptions-item :label="t('detail.quantity')">{{ item.quantity || 1 }}</a-descriptions-item>
        <a-descriptions-item :label="t('detail.createdAt')">{{ formatTime(item.created_at, t) }}</a-descriptions-item>
        <a-descriptions-item :label="t('detail.status')">{{ saleStatus }}</a-descriptions-item>
      </a-descriptions>

      <template v-if="itemDescription">
        <a-divider orientation="left">{{ t('detail.description') }}</a-divider>
        <p class="description">{{ itemDescription }}</p>
      </template>

      <template v-if="stats.primary.length">
        <a-divider orientation="left">{{ t('detail.primaryStats') }}</a-divider>
        <a-descriptions bordered size="small" :column="1">
          <a-descriptions-item v-for="(stat, idx) in stats.primary" :key="`p-${idx}`" :label="stat.name">
            {{ stat.value }}
          </a-descriptions-item>
        </a-descriptions>
      </template>

      <template v-if="stats.secondary.length">
        <a-divider orientation="left">{{ t('detail.secondaryStats') }}</a-divider>
        <a-descriptions bordered size="small" :column="1">
          <a-descriptions-item v-for="(stat, idx) in stats.secondary" :key="`s-${idx}`" :label="stat.name">
            <span class="stat-secondary">{{ stat.value }}</span>
          </a-descriptions-item>
        </a-descriptions>
      </template>
    </div>

    <template #footer>
      <a-button @click="close">{{ t('subscription.cancel') }}</a-button>
      <a-button v-if="!isCatalog" type="primary" @click="subscribeItem">
        <template #icon><BellOutlined /></template>
        {{ t('subscription.subscribe') }}
      </a-button>
    </template>
  </a-modal>
</template>

<style scoped>
.detail-header {
  align-items: center;
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.desc-block {
  margin-bottom: 8px;
}

.description {
  color: rgba(255, 255, 255, 0.65);
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
}
</style>
