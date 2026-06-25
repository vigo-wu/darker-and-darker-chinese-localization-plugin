import { ref, onMounted, computed } from 'vue';
import { message } from 'ant-design-vue';
import {
  loadSubscriptions,
  loadEmailSettings,
  saveEmailSettings,
  testEmailSettings,
  addSubscription,
  removeSubscription,
  toggleSubscription,
  triggerCheckNow,
  isSubscribedToItem,
} from '@/api/subscription';
import { useMarketI18n } from '@/composables/useMarketI18n';
import { getEmailSettingsSummary, isEmailDeliveryConfigured } from '@shared/market-subscription.js';
import { hasResendApiKey } from '@shared/resend-config.js';

export function useItemSubscription() {
  const { t } = useMarketI18n();

  const subscriptions = ref([]);
  const emailSettings = ref({});
  const loading = ref(false);
  const savingSettings = ref(false);
  const testingEmail = ref(false);
  const checking = ref(false);
  const settingsOpen = ref(false);
  const subscribeOpen = ref(false);
  const subscribeDefaults = ref({
    itemName: '',
    maxPrice: '',
    rarity: '',
  });

  const emailSettingsSummary = computed(() => getEmailSettingsSummary(emailSettings.value, hasResendApiKey()));

  async function refresh() {
    loading.value = true;
    try {
      const [subs, settings] = await Promise.all([loadSubscriptions(), loadEmailSettings()]);
      subscriptions.value = subs;
      emailSettings.value = settings;
    } finally {
      loading.value = false;
    }
  }

  function openSettings() {
    settingsOpen.value = true;
  }

  function closeSettings() {
    settingsOpen.value = false;
  }

  function setSettingsOpen(value) {
    settingsOpen.value = value;
  }

  function openSubscribe(itemName = '', rarity = '') {
    subscribeDefaults.value = {
      itemName,
      maxPrice: '',
      rarity,
    };
    subscribeOpen.value = true;
  }

  function closeSubscribe() {
    subscribeOpen.value = false;
  }

  async function submitSubscribe(form) {
    try {
      await addSubscription(form);
      message.success(t('subscription.addSuccess'));
      subscribeOpen.value = false;
      await refresh();
    } catch (err) {
      if (err?.message === 'DUPLICATE') {
        message.warning(t('subscription.duplicate'));
        return;
      }
      if (err?.message === 'INVALID_ITEM') {
        message.error(t('subscription.invalidItem'));
        return;
      }
      message.error(t('subscription.addFailed'));
    }
  }

  async function deleteSubscription(id) {
    await removeSubscription(id);
    message.success(t('subscription.removeSuccess'));
    await refresh();
  }

  async function setSubscriptionEnabled(id, enabled) {
    await toggleSubscription(id, enabled);
    await refresh();
  }

  function mapSettingsError(code) {
    if (!code) return t('subscription.settingsFailed');
    const key = `subscription.errors.${code}`;
    const translated = t(key);
    if (translated !== key) return translated;
    if (String(code).includes('Resend') || String(code).includes('失败')) {
      return String(code);
    }
    return t('subscription.settingsFailed');
  }

  async function updateEmailSettings({ payload }) {
    savingSettings.value = true;
    try {
      const saved = await saveEmailSettings(payload);
      emailSettings.value = saved;
      message.success(t('subscription.settingsSaved'));
      settingsOpen.value = false;
      await refresh();
    } catch (err) {
      message.error(mapSettingsError(err?.message));
    } finally {
      savingSettings.value = false;
    }
  }

  async function sendTestEmail({ payload, testEmail }) {
    testingEmail.value = true;
    try {
      const result = await testEmailSettings(payload, testEmail);
      if (!result?.ok) {
        message.error(result?.error || t('subscription.testFailed'));
        return;
      }
      message.success(t('subscription.testSuccess', { email: testEmail }));
    } catch (err) {
      message.error(mapSettingsError(err?.message));
    } finally {
      testingEmail.value = false;
    }
  }

  function showCheckResult(result) {
    const matched = result.matched || 0;
    const notified = result.notified || 0;
    const fetched = result.fetched || 0;
    const seeded = result.seeded || 0;

    if (fetched === 0) {
      message.warning(t('subscription.checkNoListings'));
      return;
    }
    if (matched === 0) {
      message.warning(t('subscription.checkNoMatch', { fetched }));
      return;
    }
    if (seeded > 0 && notified === 0) {
      message.success(t('subscription.checkDoneSeeded', { matched }));
      return;
    }
    message.success(t('subscription.checkDone', { matched, count: notified }));
  }

  async function checkNow() {
    checking.value = true;
    try {
      const result = await triggerCheckNow();
      if (!result?.ok) {
        message.warning(result?.error || t('subscription.checkUnavailable'));
        return;
      }
      await refresh();
      showCheckResult(result);
    } catch (err) {
      message.warning(err?.message || t('subscription.checkUnavailable'));
    } finally {
      checking.value = false;
    }
  }

  function hasSubscriptionFor(itemName) {
    return isSubscribedToItem(subscriptions.value, itemName);
  }

  function isEmailConfigured() {
    return isEmailDeliveryConfigured(emailSettings.value, hasResendApiKey());
  }

  onMounted(() => {
    refresh();
  });

  return {
    subscriptions,
    emailSettings,
    emailSettingsSummary,
    loading,
    savingSettings,
    testingEmail,
    checking,
    settingsOpen,
    subscribeOpen,
    subscribeDefaults,
    refresh,
    openSettings,
    closeSettings,
    setSettingsOpen,
    openSubscribe,
    closeSubscribe,
    submitSubscribe,
    deleteSubscription,
    setSubscriptionEnabled,
    updateEmailSettings,
    sendTestEmail,
    checkNow,
    hasSubscriptionFor,
    isEmailConfigured,
  };
}
