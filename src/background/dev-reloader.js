const RELOAD_PORT = 35729;
const TARGET_URL = 'https://darkanddarkertracker.com/*';
const MAX_RECONNECT_ATTEMPTS = 4;
const BASE_RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_DELAY_MS = 30000;

let socket;
let reconnectTimer;
let reconnectAttempts = 0;
let gaveUp = false;

function getReconnectDelay() {
  return Math.min(
    BASE_RECONNECT_DELAY_MS * (2 ** reconnectAttempts),
    MAX_RECONNECT_DELAY_MS,
  );
}

function scheduleReconnect() {
  if (gaveUp || reconnectTimer) return;

  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    gaveUp = true;
    console.info(
      `[DarkTrans Dev] 未连接热重载服务 (ws://127.0.0.1:${RELOAD_PORT})。`
      + ' 开发时请运行 npm run dev；若已加载 dist/dev 但未开发，可改用仓库根目录或 dist/extension。',
    );
    return;
  }

  const delay = getReconnectDelay();
  reconnectAttempts += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
}

async function reloadTargets() {
  try {
    const tabs = await chrome.tabs.query({ url: TARGET_URL });
    await Promise.all(tabs.map((tab) => chrome.tabs.reload(tab.id)));
  } catch (error) {
    console.warn('[DarkTrans Dev] 自动刷新页面失败:', error);
  }

  setTimeout(() => {
    chrome.runtime.reload();
  }, 120);
}

function connect() {
  if (gaveUp) return;

  socket = new WebSocket(`ws://127.0.0.1:${RELOAD_PORT}`);

  socket.addEventListener('open', () => {
    reconnectAttempts = 0;
    console.info('[DarkTrans Dev] 已连接热重载服务');
  });

  socket.addEventListener('message', async (event) => {
    if (event.data !== 'reload') return;
    await reloadTargets();
  });

  socket.addEventListener('close', () => {
    scheduleReconnect();
  });

  socket.addEventListener('error', () => {
    socket.close();
  });
}

async function initDevReloader() {
  try {
    const metaUrl = chrome.runtime.getURL('dev-meta.json');
    const response = await fetch(metaUrl);
    if (!response.ok) return;
  } catch {
    return;
  }

  connect();
}

initDevReloader();
