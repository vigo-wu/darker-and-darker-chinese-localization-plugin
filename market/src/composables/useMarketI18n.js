import { inject } from 'vue';
import { useI18n } from 'vue-i18n';
import { labelEnum } from '@/i18n';

export function useMarketI18n() {
  const { t } = useI18n();
  const td = inject('td');
  const toEnglish = inject('toEnglish');

  function translateText(text) {
    if (text == null || text === '') return text;
    return td(String(text));
  }

  function resolveEnglishSearch(search, itemNames = []) {
    if (search == null || search === '') return '';
    return toEnglish(String(search), itemNames);
  }

  function translateRarity(rarity) {
    if (!rarity) return '-';
    return labelEnum(t, 'rarity', rarity);
  }

  function translateSlotOrType(value) {
    if (!value) return '-';
    const slot = labelEnum(t, 'slot', value);
    if (slot !== value) return slot;
    return labelEnum(t, 'type', value);
  }

  return {
    t,
    td: translateText,
    toEnglish: resolveEnglishSearch,
    translateRarity,
    translateSlotOrType,
    labelEnum: (category, value) => labelEnum(t, category, value),
  };
}
