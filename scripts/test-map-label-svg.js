/**
 * 快速验证 widenCjkLabelSvg / translateSvgString 逻辑（非 CI，本地手动运行）
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const sourcePath = path.join(__dirname, "../src/content/map-canvas-page.js");
const source = fs.readFileSync(sourcePath, "utf8");

const dictionary = {
  "Goblin Maze A": "哥布林迷宫 A",
  "Ice Cavern": "冰窟",
};

const sandbox = {
  window: {
    __darktransCanvasHookInstalled: false,
    location: { origin: "https://darkanddarkertracker.com" },
    fetch: async () => ({ ok: false }),
    setTimeout: (fn) => fn(),
    clearTimeout() {},
    setInterval: () => 0,
    clearInterval() {},
    dispatchEvent() {},
    encodeURIComponent: (v) => encodeURIComponent(v),
    btoa: (v) => Buffer.from(v, "binary").toString("base64"),
    setInterval: () => 0,
    clearInterval() {},
    Worker: class Worker {
      static __darktransMapWorkerPatched = true;
    },
    PIXI: null,
  },
  document: {
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
    documentElement: { dataset: {} },
  },
  CanvasRenderingContext2D: { prototype: {} },
  OffscreenCanvasRenderingContext2D: undefined,
  CustomEvent: class CustomEvent {
    constructor(type, init) {
      this.type = type;
      this.detail = init?.detail;
    }
  },
  Event: class Event {
    constructor(type) {
      this.type = type;
    }
  },
  Map,
  Promise,
  JSON,
  Math,
  Number,
  String,
  Object,
  Array,
  Error,
  setTimeout: (fn) => fn(),
  clearTimeout() {},
  setInterval: () => 0,
  clearInterval() {},
};

vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const { DarkTransCanvas } = sandbox.window;
DarkTransCanvas.setDictionary(dictionary);

function buildSampleSvg(label, width) {
  const p = width ?? Math.min(170, Math.max(40, label.length * 12 * 0.6 + 16));
  const u = 28;
  const m = p / 2;
  const h = u / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${p}" height="${u}" viewBox="0 0 ${p} ${u}"><title>${label}</title><rect x="0" y="0" width="${p}" height="${u}" fill="rgba(40, 45, 55, 0.88)" rx="5" ry="5"/><text x="${m}" y="${h}" font-family="'Inter', 'Arial', sans-serif" font-size="12px" font-weight="500" fill="#F0F0F0" letter-spacing="0.3px" stroke="rgba(0,0,0,0.7)" stroke-width="0.7px" stroke-linejoin="round" text-anchor="middle" dominant-baseline="middle" style="text-transform: none; paint-order: stroke;">${label}</text></svg>`;
}

function siteDataUrl(win, svg) {
  const encoded = win.encodeURIComponent(svg);
  const binary = unescape(encoded);
  return `data:image/svg+xml;base64,${win.btoa(binary)}`;
}

function decodeDataUrl(dataUrl) {
  const b64 = dataUrl.split(",")[1];
  const binary = Buffer.from(b64, "base64").toString("binary");
  return decodeURIComponent(
    binary
      .split("")
      .map((ch) => `%${(`00${ch.charCodeAt(0).toString(16)}`).slice(-2)}`)
      .join("")
  );
}

const samples = [
  buildSampleSvg("Goblin Maze A"),
  buildSampleSvg("Ice Cavern", 72),
];

let failed = 0;

for (const svg of samples) {
  const decoded = decodeDataUrl(siteDataUrl(sandbox.window, svg));
  const widthMatch = decoded.match(/\bwidth="(\d+(?:\.\d+)?)"/);
  const textMatch = decoded.match(/<text[^>]*>([\s\S]*?)<\/text>/i);
  const width = Number(widthMatch?.[1] || 0);
  const text = textMatch?.[1] || "";

  console.log("\n--- input:", svg.match(/<text[^>]*>([^<]+)/)?.[1], "---");
  console.log("translated text:", text);
  console.log("width:", width);

  if (!/[\u3400-\u9fff]/.test(text)) {
    console.error("FAIL: text not translated");
    failed += 1;
  }
  if (width <= 72) {
    console.error("FAIL: width not widened enough for CJK");
    failed += 1;
  }
  const textTag = decoded.match(/<text\b[^>]*>/)?.[0] || "";
  if (!/font-size="/i.test(textTag)) {
    console.error("FAIL: text attributes malformed after processing");
    failed += 1;
  }
  if (/font-family="[^"]*",/i.test(textTag)) {
    console.error("FAIL: font-family attribute is malformed XML");
    failed += 1;
  }
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}

console.log("\nAll map label SVG checks passed.");
