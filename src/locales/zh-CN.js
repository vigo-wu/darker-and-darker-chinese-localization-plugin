/**
 * 英文 -> 简体中文 翻译词典（入口）
 * 合并 category/*.js 与地图/UI 词条（UI 优先级最高）
 * 物品词条：npm run extract-item-names
 * 地图/怪物/战利品等：npm run merge-transition
 */
(function () {
  const ui = {
    "Ruins of Forgotten Castle": "城堡一层",
    Crypts: "城堡二层",
    Inferno: "城堡三层",
    "Goblin Cave": "哥布林洞穴一层",
    Firedeep: "哥布林洞穴二层",
    "Frost Mountain": "冰霜山脉一层",
    "Ice Abyss": "冰霜山脉二层",
    "Ship Graveyard": "蔚蓝漩涡",
    Miscellaneous: "杂项",
    "Loot Spawns": "战利品刷新点",
    Resources: "资源",
    Monsters: "怪物",
    Shrines: "祭坛",
    Hazards: "危险物",
    Traps: "陷阱",
    Chests: "宝箱",
    Destructibles: "可破坏物",
    "High Tier": "高级",
    "Low Tier": "低级",
    "Herbs": "植物",
    "Ores": "矿石",
  };

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
    ui
  );
})();
