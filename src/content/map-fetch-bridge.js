/**
 * 隔离世界：代主世界发起扩展后台 fetch（独立连接，避免页面连接池耗尽）
 */
document.addEventListener("darktrans-fetch", (event) => {
  const { requestId, url } = event.detail || {};
  if (!requestId || !url) return;

  chrome.runtime.sendMessage({ type: "FETCH_JSON", url }, (response) => {
    const detail = {
      requestId,
      ...(response || {
        error: chrome.runtime.lastError?.message || "Extension fetch failed",
      }),
    };
    document.dispatchEvent(new CustomEvent("darktrans-fetch-result", { detail }));
  });
});
