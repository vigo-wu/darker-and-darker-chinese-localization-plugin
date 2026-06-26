<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { MailOutlined, SendOutlined, BellOutlined } from '@ant-design/icons-vue';
import { useMarketI18n } from '@/composables/useMarketI18n';
import {
  validateEmailSettings,
  getEmailSettingsSummary,
  isEmailDeliveryConfigured,
  isValidEmail,
  splitPollIntervalSeconds,
  toPollIntervalSeconds,
  getPollIntervalLimits,
} from '@shared/market-subscription.js';
import { hasResendApiKey } from '@shared/resend-config.js';

const props = defineProps({
  open: Boolean,
  emailSettings: {
    type: Object,
    default: () => ({}),
  },
  saving: Boolean,
  testing: Boolean,
  testingNotification: Boolean,
});

const emit = defineEmits(['update:open', 'save', 'test', 'test-notification']);

const { t } = useMarketI18n();

const form = reactive({
  pollIntervalValue: 5,
  pollIntervalUnit: 'minutes',
  lastUsedEmail: '',
  enableEmail: true,
  enableNotifications: true,
});

const formErrors = ref({});

const resendReady = computed(() => hasResendApiKey());

const settingsSummary = computed(() => getEmailSettingsSummary(props.emailSettings, resendReady.value));

const emailConfigured = computed(() => isEmailDeliveryConfigured(
  { ...props.emailSettings, ...form },
  resendReady.value,
));

const pollIntervalLimits = computed(() => getPollIntervalLimits(form.pollIntervalUnit));

const pollIntervalSeconds = computed(() => toPollIntervalSeconds(
  form.pollIntervalValue,
  form.pollIntervalUnit,
));

const statusIntervalText = computed(() => {
  const seconds = pollIntervalSeconds.value;
  if (seconds % 60 === 0) {
    return t('subscription.statusIntervalMinutes', { minutes: seconds / 60 });
  }
  return t('subscription.statusIntervalSeconds', { seconds });
});

watch(
  () => props.open,
  (visible) => {
    if (!visible) return;
    resetForm();
  },
  { immediate: true },
);

function resetForm() {
  const settings = props.emailSettings || {};
  const split = splitPollIntervalSeconds(settings.pollIntervalSeconds);
  form.pollIntervalValue = split.value;
  form.pollIntervalUnit = split.unit;
  form.lastUsedEmail = settings.lastUsedEmail || '';
  form.enableEmail = settings.enableEmail !== false;
  form.enableNotifications = settings.enableNotifications !== false;
  formErrors.value = {};
}

function close() {
  emit('update:open', false);
}

function validateForm() {
  const errors = validateEmailSettings(form, {
    hasResendApiKey: resendReady.value,
  });
  formErrors.value = errors;
  return Object.keys(errors).length === 0;
}

function buildPayload() {
  return {
    pollIntervalSeconds: toPollIntervalSeconds(form.pollIntervalValue, form.pollIntervalUnit),
    lastUsedEmail: form.lastUsedEmail.trim(),
    enableEmail: form.enableEmail,
    enableNotifications: form.enableNotifications,
  };
}

function handleSave() {
  if (!validateForm()) return;
  emit('save', { payload: buildPayload() });
}

function handleTestEmail() {
  if (!form.enableEmail) {
    formErrors.value = { ...formErrors.value, lastUsedEmail: 'EMAIL_NOT_CONFIGURED' };
    return;
  }
  if (!resendReady.value) {
    formErrors.value = { ...formErrors.value, resendConfig: 'MISSING_RESEND_API_KEY' };
    return;
  }
  if (!form.lastUsedEmail.trim()) {
    formErrors.value = { ...formErrors.value, lastUsedEmail: 'MISSING_NOTIFY_EMAIL' };
    return;
  }
  if (!isValidEmail(form.lastUsedEmail.trim())) {
    formErrors.value = { ...formErrors.value, lastUsedEmail: 'INVALID_EMAIL' };
    return;
  }
  if (!validateForm()) return;
  emit('test', {
    payload: buildPayload(),
    testEmail: form.lastUsedEmail.trim(),
  });
}

function handleTestNotification() {
  if (!form.enableNotifications) {
    formErrors.value = { ...formErrors.value, notifications: 'NOTIFICATIONS_DISABLED' };
    return;
  }
  emit('test-notification', { payload: buildPayload() });
}

function errorText(key) {
  const code = formErrors.value[key];
  if (!code) return '';
  return t(`subscription.errors.${code}`);
}
</script>

<template>
  <a-modal
    :open="open"
    :title="t('subscription.emailSettingsTitle')"
    width="560px"
    destroy-on-close
    :confirm-loading="saving"
    @cancel="close"
    @update:open="(value) => emit('update:open', value)"
  >
    <div class="settings-status">
      <a-tag :color="emailConfigured ? 'success' : 'default'">
        {{ emailConfigured ? t('subscription.emailReady') : t('subscription.emailNotReady') }}
      </a-tag>
      <a-tag :color="resendReady ? 'processing' : 'warning'">
        {{ resendReady ? t('subscription.resendConfigReady') : t('subscription.resendConfigMissing') }}
      </a-tag>
      <a-tag :color="form.enableNotifications ? 'processing' : 'default'">
        {{ form.enableNotifications ? t('subscription.notificationOn') : t('subscription.notificationOff') }}
      </a-tag>
      <span class="status-interval">
        {{ statusIntervalText }}
      </span>
    </div>

    <a-form layout="vertical" class="settings-form">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item :label="t('subscription.enableEmail')">
            <a-switch v-model:checked="form.enableEmail" :disabled="!resendReady" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="t('subscription.enableNotifications')">
            <a-switch v-model:checked="form.enableNotifications" />
            <a-form-item-rest>
              <a-button
                class="notify-test-btn"
                block
                type="default"
                :loading="testingNotification"
                :disabled="!form.enableNotifications"
                @click="handleTestNotification"
              >
                <template #icon><BellOutlined /></template>
                {{ t('subscription.sendTestNotification') }}
              </a-button>
            </a-form-item-rest>
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item
        :label="t('subscription.notifyEmail')"
        :validate-status="formErrors.lastUsedEmail ? 'error' : undefined"
        :extra="formErrors.lastUsedEmail ? errorText('lastUsedEmail') : t('subscription.notifyEmailHint')"
      >
        <a-input
          v-model:value="form.lastUsedEmail"
          :placeholder="t('subscription.emailPlaceholder')"
        />
        <a-form-item-rest>
          <a-button
            class="notify-email-test-btn"
            block
            type="default"
            :loading="testing"
            :disabled="!resendReady || !form.enableEmail"
            @click="handleTestEmail"
          >
            <template #icon><SendOutlined /></template>
            {{ t('subscription.sendTest') }}
          </a-button>
        </a-form-item-rest>
      </a-form-item>

      <a-form-item
        :label="t('subscription.pollInterval')"
        :validate-status="formErrors.pollInterval ? 'error' : ''"
        :help="errorText('pollInterval')"
      >
        <div class="poll-interval-field">
          <a-input-number
            v-model:value="form.pollIntervalValue"
            :min="pollIntervalLimits.min"
            :max="pollIntervalLimits.max"
          />
          <a-select v-model:value="form.pollIntervalUnit" class="poll-interval-unit">
            <a-select-option value="seconds">{{ t('subscription.seconds') }}</a-select-option>
            <a-select-option value="minutes">{{ t('subscription.minutes') }}</a-select-option>
          </a-select>
        </div>
      </a-form-item>

      <a-alert
        v-if="!resendReady"
        type="warning"
        show-icon
        :message="t('subscription.resendConfigHint')"
      />

      <a-alert type="info" show-icon class="settings-hint">
        <template #message>
          <span><MailOutlined /> {{ t('subscription.emailSettingsHint') }}</span>
        </template>
      </a-alert>
    </a-form>

    <template #footer>
      <a-button @click="close">{{ t('subscription.cancel') }}</a-button>
      <a-button type="primary" :loading="saving" @click="handleSave">
        {{ t('subscription.saveSettings') }}
      </a-button>
    </template>
  </a-modal>
</template>

<style scoped>
.settings-status {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.status-interval {
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
}

.settings-form {
  margin-top: 4px;
}

.settings-form :deep(.ant-form-item) {
  margin-bottom: 16px;
}

.notify-email-test-btn {
  margin-top: 8px;
}

.notify-test-btn {
  margin-top: 8px;
}

.poll-interval-field {
  align-items: center;
  display: flex;
  gap: 8px;
}

.settings-form :deep(.ant-input-number) {
  background: #141414;
  border-color: #434343;
  width: 120px;
}

.settings-form :deep(.ant-input-number-input) {
  color: rgba(255, 255, 255, 0.88);
}

.poll-interval-unit {
  width: 88px;
}

.settings-hint {
  margin-top: 8px;
}
</style>
