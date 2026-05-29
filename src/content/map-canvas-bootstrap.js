/**
 * 隔离世界：预加载地图词条，经 DOM 事件同步到主世界 Canvas Hook
 */
(() => {
  function buildEarlyDictionary() {
    return (
      window.DARKTRANS_DICTIONARY ||
      Object.assign(
        {},
        window.DARKTRANS_CATEGORY_MAP_LOCATION || {},
        window.DARKTRANS_MAP_UI || {}
      )
    );
  }

  function publishUpdate(detail) {
    document.dispatchEvent(new CustomEvent("darktrans-update", { detail }));
  }

  publishUpdate({ dictionary: buildEarlyDictionary() });

  document.addEventListener("darktrans-hook-ready", () => {
    publishUpdate({ dictionary: buildEarlyDictionary() });
  });

  window.DarkTransCanvas = {
    setDictionary(dict) {
      publishUpdate({ dictionary: dict });
    },
    setEnabled(enabled) {
      publishUpdate({ enabled });
    },
  };
})();
