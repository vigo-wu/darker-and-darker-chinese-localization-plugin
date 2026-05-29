/**
 * 英文 -> 简体中文 翻译词典（入口）
 * 合并 category/*.js 与地图/UI 词条（UI 优先级最高）
 * 物品词条：npm run extract-item-names
 * 地图/怪物/战利品等：npm run merge-transition
 */
(function () {
  window.DARKTRANS_DICTIONARY = Object.assign(
    {},
    window.DARKTRANS_CATEGORY_QUESTS || {},
    window.DARKTRANS_CATEGORY_ITEMS || {},
    window.DARKTRANS_CATEGORY_LOOT || {},
    window.DARKTRANS_CATEGORY_MAP_LOCATION || {},
    window.DARKTRANS_CATEGORY_CONTAINERS || {},
    window.DARKTRANS_CATEGORY_MONSTERS || {},
    window.DARKTRANS_CATEGORY_HERBS || {},
    window.DARKTRANS_CATEGORY_TRAPS || {},
    window.DARKTRANS_MAP_UI || {}
  );
})();
