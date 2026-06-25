<script setup>
import { reactive, watch } from 'vue';
import { BellOutlined } from '@ant-design/icons-vue';
import { useMarketI18n } from '@/composables/useMarketI18n';

const props = defineProps({
  open: Boolean,
  defaults: {
    type: Object,
    default: () => ({
      itemName: '',
      maxPrice: '',
      rarity: '',
    }),
  },
  rarityOptions: {
    type: Array,
    default: () => [],
  },
  itemOptions: {
    type: Array,
    default: () => [],
  },
  filterItemOption: {
    type: Function,
    default: () => true,
  },
});

const emit = defineEmits(['update:open', 'submit']);

const { t } = useMarketI18n();

const form = reactive({
  itemName: '',
  maxPrice: '',
  rarity: '',
});

watch(
  () => props.open,
  (visible) => {
    if (!visible) return;
    form.itemName = props.defaults.itemName || '';
    form.maxPrice = props.defaults.maxPrice || '';
    form.rarity = props.defaults.rarity || '';
  },
  { immediate: true },
);

function close() {
  emit('update:open', false);
}

function handleSubmit() {
  emit('submit', { ...form });
}
</script>

<template>
  <a-modal
    :open="open"
    :title="t('subscription.subscribeTitle')"
    width="480px"
    destroy-on-close
    @cancel="close"
    @update:open="(value) => emit('update:open', value)"
  >
    <a-form layout="vertical" class="subscribe-form">
      <a-form-item :label="t('subscription.item')" required>
        <a-select
          v-model:value="form.itemName"
          :options="itemOptions"
          :filter-option="filterItemOption"
          show-search
          allow-clear
          :placeholder="t('subscription.itemPlaceholder')"
        />
      </a-form-item>

      <a-form-item :label="t('subscription.maxPrice')">
        <a-input
          v-model:value="form.maxPrice"
          :placeholder="t('subscription.maxPricePlaceholder')"
        />
      </a-form-item>

      <a-form-item :label="t('subscription.rarity')">
        <a-select v-model:value="form.rarity" allow-clear :placeholder="t('subscription.rarityAny')">
          <a-select-option v-for="opt in rarityOptions" :key="opt.value || 'all'" :value="opt.value">
            {{ opt.label }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <a-alert type="info" show-icon :message="t('subscription.hint')" />
    </a-form>

    <template #footer>
      <a-button @click="close">{{ t('subscription.cancel') }}</a-button>
      <a-button type="primary" @click="handleSubmit">
        <template #icon><BellOutlined /></template>
        {{ t('subscription.confirm') }}
      </a-button>
    </template>
  </a-modal>
</template>

<style scoped>
.subscribe-form {
  margin-top: 8px;
}
</style>
