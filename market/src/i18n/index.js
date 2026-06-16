import { createI18n } from 'vue-i18n';
import dictData from '@locales/zh-CN.json';
import { createDictionaryTranslator } from './dictionary';
import zhCN from './messages/zh-CN';

const { translate: td, toEnglish } = createDictionaryTranslator(dictData);

export const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
  },
});

export { td, toEnglish };

export function labelEnum(t, category, value) {
  if (!value) {
    const filterKey = {
      rarity: 'filter.allRarity',
      slot: 'filter.allSlot',
      type: 'filter.allType',
      status: 'filter.allStatus',
    }[category];
    return filterKey ? t(filterKey) : t('filter.all');
  }

  const translated = td(value);
  if (translated !== value) return translated;

  const messageKey = `enum.${category}.${value}`;
  const fallback = t(messageKey);
  return fallback !== messageKey ? fallback : value;
}
