<script setup>
import {
  BellOutlined,
  DeleteOutlined,
  MailOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue';
import EmailSettingsModal from '@/components/EmailSettingsModal.vue';
import { useMarketI18n } from '@/composables/useMarketI18n';
import { formatPrice } from '@/utils/market';

const props = defineProps({
  subscriptions: {
    type: Array,
    default: () => [],
  },
  emailSettings: {
    type: Object,
    default: () => ({}),
  },
  emailSettingsSummary: {
    type: Object,
    default: () => ({}),
  },
  loading: Boolean,
  savingSettings: Boolean,
  testingEmail: Boolean,
  checking: Boolean,
  settingsOpen: Boolean,
});

const emit = defineEmits([
  'subscribe',
  'remove',
  'toggle',
  'save-settings',
  'test-email',
  'check-now',
  'update:settings-open',
]);

const { t, td, translateRarity } = useMarketI18n();

function displayItemName(name) {
  return td(name) || name;
}

function displayFilters(sub) {
  const parts = [];
  if (sub.rarity) parts.push(translateRarity(sub.rarity));
  if (sub.maxPrice != null && sub.maxPrice !== '') {
    parts.push(t('subscription.maxPriceTag', { price: formatPrice(sub.maxPrice) }));
  }
  return parts.length ? parts.join(' · ') : t('subscription.noFilter');
}

function openSettings() {
  emit('update:settings-open', true);
}
</script>

<template>
  <a-card class="subscription-card" :bordered="false">
    <div class="subscription-header">
      <div class="subscription-title">
        <BellOutlined class="title-icon" />
        <h2>{{ t('subscription.title') }}</h2>
        <a-tag color="gold">{{ subscriptions.length }}</a-tag>
        <a-tag v-if="emailSettingsSummary.emailReady" color="success">{{ t('subscription.emailReady') }}</a-tag>
        <a-tag v-else color="default">{{ t('subscription.emailNotReady') }}</a-tag>
      </div>
      <a-space wrap>
        <a-button type="primary" @click="emit('subscribe')">
          <template #icon><BellOutlined /></template>
          {{ t('subscription.add') }}
        </a-button>
        <a-button :loading="checking" @click="emit('check-now')">
          <template #icon><ReloadOutlined /></template>
          {{ t('subscription.checkNow') }}
        </a-button>
        <a-button @click="openSettings">
          <template #icon><SettingOutlined /></template>
          {{ t('subscription.emailSettings') }}
        </a-button>
      </a-space>
    </div>

    <p class="subscription-desc">{{ t('subscription.description') }}</p>
    <p v-if="emailSettingsSummary.lastUsedEmail" class="subscription-notify-email">
      <MailOutlined />
      {{ t('subscription.notifyEmailTarget', { email: emailSettingsSummary.lastUsedEmail }) }}
    </p>

    <a-spin :spinning="loading">
      <a-empty v-if="!subscriptions.length" :description="t('subscription.empty')" />

      <a-list v-else class="subscription-list" :data-source="subscriptions" :split="false">
        <template #renderItem="{ item }">
          <a-list-item class="subscription-item">
            <a-list-item-meta>
              <template #title>
                <span class="item-name">{{ displayItemName(item.itemName) }}</span>
                <a-tag v-if="item.enabled === false" color="default">{{ t('subscription.paused') }}</a-tag>
              </template>
              <template #description>
                <div class="item-meta">
                  <span>{{ displayFilters(item) }}</span>
                </div>
              </template>
            </a-list-item-meta>

            <template #actions>
              <a-switch
                :checked="item.enabled !== false"
                size="small"
                @change="(checked) => emit('toggle', item.id, checked)"
              />
              <a-button type="text" danger size="small" @click="emit('remove', item.id)">
                <template #icon><DeleteOutlined /></template>
              </a-button>
            </template>
          </a-list-item>
        </template>
      </a-list>
    </a-spin>

    <EmailSettingsModal
      :open="settingsOpen"
      :email-settings="emailSettings"
      :saving="savingSettings"
      :testing="testingEmail"
      @update:open="(value) => emit('update:settings-open', value)"
      @save="(payload) => emit('save-settings', payload)"
      @test="(payload) => emit('test-email', payload)"
    />
  </a-card>
</template>

<style scoped>
.subscription-card {
  background: #1a1a1a;
  border: 1px solid #333;
}

.subscription-header {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
}

.subscription-title {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.subscription-title h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.title-icon {
  color: #c6a46c;
}

.subscription-desc {
  color: rgba(255, 255, 255, 0.55);
  font-size: 13px;
  margin: 12px 0 8px;
}

.subscription-notify-email {
  align-items: center;
  color: rgba(255, 255, 255, 0.55);
  display: flex;
  font-size: 13px;
  gap: 6px;
  margin: 0 0 16px;
}

.subscription-list {
  margin-top: 4px;
}

.subscription-item {
  background: #141414;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  margin-bottom: 8px;
  padding: 8px 12px;
}

.item-name {
  font-weight: 600;
}

.item-meta {
  color: rgba(255, 255, 255, 0.55);
  display: flex;
  flex-direction: column;
  font-size: 12px;
  gap: 4px;
}
</style>
