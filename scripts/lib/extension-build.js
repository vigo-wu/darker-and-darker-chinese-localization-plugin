const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..", "..");
const INCLUDE_PATHS = ["icons", "src"];
const RELOAD_PORT = 35729;

function readManifest() {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8")
  );
}

function readVersion() {
  return readManifest().version || "1.0.0";
}

function ensureIcons() {
  const icon16 = path.join(ROOT, "icons", "icon16.png");
  if (!fs.existsSync(icon16)) {
    require("../generate-icons.js");
  }
}

function removePath(targetPath) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

function copyPath(source, target) {
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      copyPath(path.join(source, entry), path.join(target, entry));
    }
    return;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function patchManifestForDev(manifest) {
  const permissions = [...new Set([...(manifest.permissions || []), "tabs"])];
  const hostPermissions = [
    ...(manifest.host_permissions || []),
    `http://127.0.0.1:${RELOAD_PORT}/*`,
    `ws://127.0.0.1:${RELOAD_PORT}/*`,
  ];

  const contentScripts = (manifest.content_scripts || []).map((entry) => {
    const scripts = [...(entry.js || [])];
    if (entry.world === "MAIN") {
      return { ...entry, js: scripts };
    }
    if (!scripts.includes("src/content/dev.js")) {
      scripts.splice(scripts.length - 1, 0, "src/content/dev.js");
    }
    return { ...entry, js: scripts };
  });

  return {
    ...manifest,
    name: `[DEV] ${manifest.name}`,
    description: `${manifest.description}（开发构建）`,
    permissions,
    host_permissions: hostPermissions,
    content_scripts: contentScripts,
  };
}

function appendDevReloader(serviceWorkerPath) {
  const content = fs.readFileSync(serviceWorkerPath, "utf8");
  const marker = "importScripts('./dev-reloader.js');";

  if (content.includes(marker)) {
    return;
  }

  fs.writeFileSync(
    serviceWorkerPath,
    `${content.trim()}\n\n${marker}\n`,
    "utf8"
  );
}

function writeDevMeta(outDir) {
  const meta = {
    mode: "dev",
    builtAt: new Date().toISOString(),
    reloadPort: RELOAD_PORT,
    outputDir: outDir,
  };

  fs.writeFileSync(
    path.join(outDir, "dev-meta.json"),
    `${JSON.stringify(meta, null, 2)}\n`,
    "utf8"
  );
}

function buildExtension(options = {}) {
  const mode = options.mode || "prod";
  const outDir =
    options.outDir ||
    path.join(ROOT, "dist", mode === "dev" ? "dev" : "extension");

  ensureIcons();
  removePath(outDir);
  fs.mkdirSync(outDir, { recursive: true });

  for (const item of INCLUDE_PATHS) {
    const source = path.join(ROOT, item);
    if (!fs.existsSync(source)) {
      throw new Error(`Missing required path: ${item}`);
    }
    copyPath(source, path.join(outDir, item));
  }

  const manifest =
    mode === "dev" ? patchManifestForDev(readManifest()) : readManifest();

  fs.writeFileSync(
    path.join(outDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );

  if (mode === "dev") {
    appendDevReloader(
      path.join(outDir, "src", "background", "service-worker.js")
    );
    writeDevMeta(outDir);
  }

  return {
    mode,
    outDir,
    version: manifest.version || readVersion(),
  };
}

function createZip(sourceDir, outputFile) {
  removePath(outputFile);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });

  if (process.platform === "win32") {
    const zipPath = outputFile.replace(/\\/g, "/");
    const sourcePath = sourceDir.replace(/\\/g, "/");
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path '${sourcePath}/*' -DestinationPath '${zipPath}' -Force"`,
      { stdio: "inherit" }
    );
    return outputFile;
  }

  execSync(`cd "${sourceDir}" && zip -r "${outputFile}" .`, {
    stdio: "inherit",
  });
  return outputFile;
}

function packageExtension(options = {}) {
  const buildResult = buildExtension({ mode: "prod", ...options });
  const outputFile =
    options.zipFile ||
    path.join(ROOT, "dist", `darktrans-v${buildResult.version}.zip`);

  createZip(buildResult.outDir, outputFile);

  return {
    ...buildResult,
    zipFile: outputFile,
    sizeKb: (fs.statSync(outputFile).size / 1024).toFixed(1),
  };
}

module.exports = {
  ROOT,
  RELOAD_PORT,
  buildExtension,
  packageExtension,
  ensureIcons,
};
