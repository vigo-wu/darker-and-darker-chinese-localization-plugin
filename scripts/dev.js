const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const WebSocket = require("ws");
const {
  ROOT,
  RELOAD_PORT,
  buildExtension,
} = require("./lib/extension-build");

const WATCH_PATHS = [
  path.join(ROOT, "manifest.json"),
  path.join(ROOT, "logo.png"),
  path.join(ROOT, "logo.jpg"),
  path.join(ROOT, "icons"),
  path.join(ROOT, "src"),
];

let rebuildTimer = null;
let isBuilding = false;

function log(message) {
  console.log(`[dev] ${message}`);
}

function broadcastReload(clients) {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send("reload");
    }
  });
}

function scheduleRebuild(reloadClients) {
  if (rebuildTimer) {
    clearTimeout(rebuildTimer);
  }

  rebuildTimer = setTimeout(() => {
    rebuildTimer = null;
    runRebuild(reloadClients);
  }, 120);
}

async function runRebuild(reloadClients) {
  if (isBuilding) {
    return;
  }

  isBuilding = true;
  const startedAt = Date.now();

  try {
    const result = buildExtension({ mode: "dev" });
    const elapsedMs = Date.now() - startedAt;
    log(`rebuilt in ${elapsedMs}ms -> ${result.outDir}`);
    broadcastReload(reloadClients);
    log("reload signal sent to extension");
  } catch (error) {
    console.error("[dev] build failed:", error.message);
  } finally {
    isBuilding = false;
  }
}

function startReloadServer() {
  const clients = new Set();
  const server = new WebSocket.Server({ host: "127.0.0.1", port: RELOAD_PORT });

  server.on("connection", (socket) => {
    clients.add(socket);
    log(`reload client connected (${clients.size} total)`);

    socket.on("close", () => {
      clients.delete(socket);
      log(`reload client disconnected (${clients.size} total)`);
    });
  });

  server.on("listening", () => {
    log(`reload server listening on ws://127.0.0.1:${RELOAD_PORT}`);
  });

  return { server, clients };
}

function startWatcher(reloadClients) {
  const watcher = chokidar.watch(WATCH_PATHS, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 150,
      pollInterval: 50,
    },
  });

  const onChange = (filePath) => {
    const relativePath = path.relative(ROOT, filePath);
    log(`changed: ${relativePath}`);
    scheduleRebuild(reloadClients);
  };

  watcher.on("add", onChange);
  watcher.on("change", onChange);
  watcher.on("unlink", onChange);

  return watcher;
}

function printInstructions(outDir) {
  console.log("");
  console.log("本地开发说明：");
  console.log(`1. 在 Chrome 打开 chrome://extensions/`);
  console.log(`2. 开启开发者模式，加载已解压扩展：${outDir}`);
  console.log("3. 修改 src/ 或 manifest.json 后会自动重建并热重载扩展");
  console.log("4. 生产打包请运行：npm run build");
  console.log("");
}

function main() {
  const { clients } = startReloadServer();
  const result = buildExtension({ mode: "dev" });

  log(`initial build complete -> ${result.outDir}`);
  printInstructions(result.outDir);

  startWatcher(clients);
  log("watching for changes...");
}

main();
