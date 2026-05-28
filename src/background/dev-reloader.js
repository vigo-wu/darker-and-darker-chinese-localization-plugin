const RELOAD_PORT = 35729;
const TARGET_URL = "https://darkanddarkertracker.com/*";

let socket;
let reconnectTimer;

function connect() {
  socket = new WebSocket(`ws://127.0.0.1:${RELOAD_PORT}`);

  socket.addEventListener("open", () => {
    console.info("[DarkTrans Dev] 已连接热重载服务");
  });

  socket.addEventListener("message", async (event) => {
    if (event.data !== "reload") {
      return;
    }

    try {
      const tabs = await chrome.tabs.query({ url: TARGET_URL });
      await Promise.all(tabs.map((tab) => chrome.tabs.reload(tab.id)));
    } catch (error) {
      console.warn("[DarkTrans Dev] 自动刷新页面失败:", error);
    }

    setTimeout(() => {
      chrome.runtime.reload();
    }, 120);
  });

  socket.addEventListener("close", () => {
    reconnectTimer = setTimeout(connect, 1000);
  });

  socket.addEventListener("error", () => {
    socket.close();
  });
}

connect();

self.addEventListener("activate", () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
});
