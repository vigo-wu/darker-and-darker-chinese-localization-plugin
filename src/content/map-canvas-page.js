/**
 * 页面主世界：Canvas 汉化 + 地图 JSON 加载（限流队列 + 扩展后台 fetch 回退）
 */
(() => {
  if (window.__darktransCanvasHookInstalled) return;
  window.__darktransCanvasHookInstalled = true;

  let dictionary = {};
  let sortedEntries = [];
  let enabled = true;

  document.addEventListener("darktrans-update", (e) => {
    const detail = e?.detail;
    if (!detail) return;
    if (detail.dictionary) setDictionary(detail.dictionary);
    if (typeof detail.enabled === "boolean") enabled = !!detail.enabled;
  });

  const MAX_CONCURRENT = 2;
  const PAGE_FETCH_RETRIES = 2;
  const jsonCache = new Map();
  const queue = [];
  let inFlight = 0;

  function cacheKey(url) {
    try {
      const parsed = new URL(url, window.location.origin);
      parsed.searchParams.delete("_cb");
      return parsed.href;
    } catch {
      return url;
    }
  }

  async function fetchJsonPage(url) {
    let lastError = null;
    for (let attempt = 0; attempt <= PAGE_FETCH_RETRIES; attempt += 1) {
      try {
        const response = await window.fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      } catch (error) {
        lastError = error;
        if (attempt < PAGE_FETCH_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        }
      }
    }
    throw lastError || new Error("Failed to fetch");
  }

  function fetchJsonExtension(url) {
    return new Promise((resolve, reject) => {
      const requestId = `dt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const timeoutMs = 60000;

      const timer = window.setTimeout(() => {
        document.removeEventListener("darktrans-fetch-result", onResult);
        reject(new Error("Extension fetch timeout"));
      }, timeoutMs);

      function onResult(event) {
        const detail = event?.detail;
        if (!detail || detail.requestId !== requestId) return;

        window.clearTimeout(timer);
        document.removeEventListener("darktrans-fetch-result", onResult);

        if (detail.error) {
          reject(new Error(detail.error));
          return;
        }
        if (!detail.ok) {
          reject(new Error(`HTTP ${detail.status || "unknown"}`));
          return;
        }
        try {
          resolve(JSON.parse(detail.text));
        } catch (parseError) {
          reject(parseError);
        }
      }

      document.addEventListener("darktrans-fetch-result", onResult);
      document.dispatchEvent(
        new CustomEvent("darktrans-fetch", { detail: { requestId, url } })
      );
    });
  }

  async function loadJson(url) {
    const key = cacheKey(url);
    if (jsonCache.has(key)) return translateCachedJson(key);

    let raw;
    try {
      raw = await fetchJsonPage(url);
    } catch {
      raw = await fetchJsonExtension(url);
    }
    jsonCache.set(key, raw);
    return translateCachedJson(key);
  }

  function enqueueJson(url) {
    const key = cacheKey(url);
    if (jsonCache.has(key)) {
      return Promise.resolve(translateCachedJson(key));
    }

    return new Promise((resolve, reject) => {
      queue.push({ url, resolve, reject });
      drainQueue();
    });
  }

  function drainQueue() {
    if (inFlight >= MAX_CONCURRENT || queue.length === 0) return;

    const job = queue.shift();
    inFlight += 1;

    loadJson(job.url)
      .then(job.resolve)
      .catch(job.reject)
      .finally(() => {
        inFlight -= 1;
        drainQueue();
      });
  }

  function patchMapDataWorker() {
    if (window.Worker.__darktransMapWorkerPatched) return;
    const NativeWorker = window.Worker;

    function createProxyWorker() {
      const handlers = { onmessage: null, onerror: null };
      return {
        get onmessage() {
          return handlers.onmessage;
        },
        set onmessage(fn) {
          handlers.onmessage = typeof fn === "function" ? fn : null;
        },
        get onerror() {
          return handlers.onerror;
        },
        set onerror(fn) {
          handlers.onerror = typeof fn === "function" ? fn : null;
        },
        postMessage(msg) {
          if (!msg?.url) return;
          const { id, url } = msg;
          enqueueJson(url)
            .then((data) => {
              handlers.onmessage?.({ data: { id, data } });
            })
            .catch((error) => {
              handlers.onmessage?.({
                data: { id, error: error?.message || String(error) },
              });
            });
        },
        terminate() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() {
          return false;
        },
      };
    }

    function PatchedWorker(scriptURL, options) {
      const href =
        typeof scriptURL === "string"
          ? scriptURL
          : scriptURL instanceof URL
            ? scriptURL.href
            : String(scriptURL);

      if (href.startsWith("blob:")) {
        return createProxyWorker();
      }
      return new NativeWorker(scriptURL, options);
    }

    PatchedWorker.prototype = NativeWorker.prototype;
    PatchedWorker.__darktransMapWorkerPatched = true;
    window.Worker = PatchedWorker;
  }

  patchMapDataWorker();

  const CJK_FONT_FAMILY =
    '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "SimHei", sans-serif';

  let redrawScheduled = false;

  function scheduleMapRedrawOnce() {
    if (redrawScheduled || !enabled) return;
    redrawScheduled = true;
    window.setTimeout(() => {
      redrawScheduled = false;
      window.dispatchEvent(new Event("resize"));
    }, 300);
  }

  function setDictionary(dict) {
    dictionary = dict || {};
    sortedEntries = Object.entries(dictionary).sort((a, b) => b[0].length - a[0].length);
    scheduleMapRedrawOnce();
  }

  function setEnabled(value) {
    enabled = !!value;
  }

  function preserveWhitespace(original, translated) {
    const leading = original.match(/^\s*/)?.[0] || "";
    const trailing = original.match(/\s*$/)?.[0] || "";
    return `${leading}${translated}${trailing}`;
  }

  function shouldSkipGlyphTranslate(text) {
    if (typeof text !== "string" || text.length > 2) return false;
    const trimmed = text.trim();
    return trimmed.length <= 1;
  }

  function translateString(text) {
    if (!enabled || !text || typeof text !== "string") return text;

    const trimmed = text.trim();
    if (!trimmed) return text;

    if (shouldSkipGlyphTranslate(text)) {
      if (!Object.prototype.hasOwnProperty.call(dictionary, trimmed)) return text;
    }

    if (Object.prototype.hasOwnProperty.call(dictionary, trimmed)) {
      const translated = dictionary[trimmed];
      if (typeof translated === "string" && translated.trim()) {
        return preserveWhitespace(text, translated);
      }
      return text;
    }

    if (shouldSkipGlyphTranslate(text)) return text;

    let result = text;
    for (const [source, target] of sortedEntries) {
      if (result.includes(source)) {
        result = result.split(source).join(target);
      }
    }
    return result;
  }

  /** 地图标注：仅精确匹配，避免子串替换破坏 imagePath / object_name 等 */
  function translateMapLabel(text) {
    if (!enabled || !text || typeof text !== "string") return text;
    const trimmed = text.trim();
    if (!trimmed) return text;
    if (!Object.prototype.hasOwnProperty.call(dictionary, trimmed)) return text;
    const translated = dictionary[trimmed];
    if (typeof translated === "string" && translated.trim()) {
      return preserveWhitespace(text, translated);
    }
    return text;
  }

  const MAP_JSON_LABEL_KEYS = new Set([
    "Module_LocalizedString",
    "LocalizedString",
    "moduleDisplayName",
    "displayName",
    "tabLabel",
    "label",
  ]);

  function formatModuleKey(name) {
    if (!name || typeof name !== "string") return "";
    let result = name.replace(/_/g, " ");
    result = result.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
    return result.trim();
  }

  function resolveModuleLabel(moduleKey, existing) {
    if (existing && String(existing).trim()) return translateMapLabel(String(existing).trim());
    const candidates = [moduleKey, formatModuleKey(moduleKey)];
    for (const candidate of candidates) {
      if (!candidate) continue;
      const translated = translateMapLabel(candidate);
      if (translated !== candidate) return translated;
      if (Object.prototype.hasOwnProperty.call(dictionary, candidate)) {
        return dictionary[candidate];
      }
    }
    return translateMapLabel(formatModuleKey(moduleKey)) || formatModuleKey(moduleKey);
  }

  function isMapModulesRoot(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const entries = Object.entries(value);
    if (entries.length === 0) return false;
    return entries.some(([, mod]) => mod && typeof mod === "object" && mod.imagePath);
  }

  function translateJsonDeep(value, parentKey) {
    if (typeof value === "string") {
      return parentKey && MAP_JSON_LABEL_KEYS.has(parentKey)
        ? translateMapLabel(value)
        : value;
    }
    if (Array.isArray(value)) {
      return value.map((item) => translateJsonDeep(item, parentKey));
    }
    if (value && typeof value === "object") {
      if (isMapModulesRoot(value)) {
        const out = {};
        for (const [moduleKey, moduleVal] of Object.entries(value)) {
          const translated = translateJsonDeep(moduleVal, parentKey);
          if (translated && typeof translated === "object") {
            const mls = translated.Module_LocalizedString;
            const resolved = resolveModuleLabel(moduleKey, mls);
            out[moduleKey] = {
              ...translated,
              Module_LocalizedString: resolved || mls || formatModuleKey(moduleKey),
            };
          } else {
            out[moduleKey] = translated;
          }
        }
        return out;
      }
      const out = {};
      for (const key of Object.keys(value)) {
        out[key] = translateJsonDeep(value[key], key);
      }
      return out;
    }
    return value;
  }

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function translateCachedJson(key) {
    return translateJsonDeep(cloneJson(jsonCache.get(key)));
  }

  const SVG_TEXT_RE = /(<text[^>]*>)([\s\S]*?)(<\/text>)/gi;

  function decodeSvgText(text) {
    return String(text)
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  function isMapLabelSvg(value) {
    return typeof value === "string" && value.includes("<svg") && value.includes("<text");
  }

  /**
   * 站点按英文字宽 (len * fontSize * 0.6) 算标签背景，中文更宽会被 viewBox 裁切。
   * 须在 encodeURIComponent 之前处理原始 Unicode SVG（btoa 入参已是 UTF-8 字节串，无法识别中文）。
   */
  function widenCjkLabelSvg(svg) {
    if (!/[\u3400-\u9fff]/.test(svg)) return svg;

    const textMatch = svg.match(/<text\b[^>]*>([\s\S]*?)<\/text>/i);
    const svgAttrsMatch = svg.match(/<svg\b([^>]*)>/i);
    if (!textMatch || !svgAttrsMatch) return svg;

    const labelText = decodeSvgText(textMatch[1].trim());
    const attrs = svgAttrsMatch[1];
    const widthMatch = attrs.match(/\bwidth="(\d+(?:\.\d+)?)"/);
    if (!widthMatch) return svg;

    const fontSizeMatch = svg.match(/font-size="(\d+(?:\.\d+)?)px"/i);
    const fontSize = fontSizeMatch ? Number(fontSizeMatch[1]) : 12;
    const letterSpacingMatch = svg.match(/letter-spacing="([^"]+)"/i);
    const letterSpacing = letterSpacingMatch ? parseFloat(letterSpacingMatch[1]) || 0 : 0.3;
    const strokeMatch = svg.match(/stroke-width="(\d+(?:\.\d+)?)px"/i);
    const strokeWidth = strokeMatch ? Number(strokeMatch[1]) : 0.7;

    const currentWidth = Number(widthMatch[1]);
    const heightMatch = attrs.match(/\bheight="(\d+(?:\.\d+)?)"/);
    const viewBoxMatch = attrs.match(/viewBox="0\s+0\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)"/i);
    const height = heightMatch
      ? Number(heightMatch[1])
      : viewBoxMatch
        ? Number(viewBoxMatch[2])
        : fontSize + 16;

    const padding = 14;
    const latinEstimate = labelText.length * fontSize * 0.6;
    const cjkCharWidth = fontSize * 1.22 + letterSpacing;
    const textWidth = labelText.length * cjkCharWidth + strokeWidth * 4;
    const neededWidth = Math.ceil(Math.max(textWidth, latinEstimate * 1.85) + padding * 2);
    const newWidth = Math.max(currentWidth, neededWidth, Math.ceil(currentWidth * 1.6));

    const centerX = newWidth / 2;
    let result = svg;

    result = result.replace(/<svg\b([^>]*)>/i, (full, attrPart) => {
      let nextAttrs = attrPart.replace(/\bwidth="\d+(?:\.\d+)?"/, `width="${newWidth}"`);
      if (/viewBox="/i.test(nextAttrs)) {
        nextAttrs = nextAttrs.replace(
          /viewBox="0\s+0\s+\d+(?:\.\d+)?\s+\d+(?:\.\d+)?"/i,
          `viewBox="0 0 ${newWidth} ${height}"`
        );
      } else {
        nextAttrs += ` viewBox="0 0 ${newWidth} ${height}"`;
      }
      if (!/overflow="/i.test(nextAttrs)) {
        nextAttrs += ' overflow="visible"';
      }
      return `<svg${nextAttrs}>`;
    });

    result = result.replace(
      /<rect\b x="0"\s+y="0"\s+width="\d+(?:\.\d+)?"/i,
      `<rect x="0" y="0" width="${newWidth}"`
    );

    result = result.replace(/<text\b([^>]*)>/i, (full, attrPart) => {
      const nextAttrs = /\bx="/.test(attrPart)
        ? attrPart.replace(/\bx="[^"]*"/, `x="${centerX}"`)
        : `${attrPart} x="${centerX}"`;
      return `<text${nextAttrs}>`;
    });

    return result;
  }

  function translateSvgString(svg) {
    if (!enabled || !isMapLabelSvg(svg)) return svg;
    const nextSvg = svg.replace(SVG_TEXT_RE, (match, open, text, close) => {
      const next = translateMapLabel(text);
      return next === text ? match : `${open}${next}${close}`;
    });
    return widenCjkLabelSvg(nextSvg);
  }

  function needsCjkFont(text) {
    return typeof text === "string" && /[\u3400-\u9fff]/.test(text);
  }

  function buildCjkFont(originalFont) {
    const font = String(originalFont || "");
    const px = (font.match(/(\d+(?:\.\d+)?)\s*px/i) || [])[1] || "12";
    const weight = font.match(/\b(bold|normal|lighter|bolder|[1-9]00)\b/i)?.[0] || "";
    const style = font.match(/\b(italic|oblique)\b/i)?.[0] || "";
    return [style, weight, `${px}px`, CJK_FONT_FAMILY].filter(Boolean).join(" ");
  }

  function withCanvasTextDraw(ctx, text, drawFn) {
    const next = typeof text === "string" ? translateString(text) : text;
    if (!needsCjkFont(next)) return drawFn(next);

    const prev = ctx.font;
    ctx.font = buildCjkFont(prev);
    try {
      return drawFn(next);
    } finally {
      ctx.font = prev;
    }
  }

  function patchCanvasTextContext(proto) {
    if (!proto || proto.__darktransPatched) return;

    const origFillText = proto.fillText;
    const origStrokeText = proto.strokeText;
    const origMeasureText = proto.measureText;

    proto.fillText = function (text, ...args) {
      return withCanvasTextDraw(this, text, (value) => origFillText.call(this, value, ...args));
    };

    proto.strokeText = function (text, ...args) {
      return withCanvasTextDraw(this, text, (value) => origStrokeText.call(this, value, ...args));
    };

    proto.measureText = function (text) {
      return withCanvasTextDraw(this, text, (value) => origMeasureText.call(this, value));
    };

    proto.__darktransPatched = true;
  }

  patchCanvasTextContext(CanvasRenderingContext2D.prototype);
  if (typeof OffscreenCanvasRenderingContext2D !== "undefined") {
    patchCanvasTextContext(OffscreenCanvasRenderingContext2D.prototype);
  }

  const nativeEncodeURIComponent = window.encodeURIComponent;

  window.encodeURIComponent = function (value) {
    if (isMapLabelSvg(value)) {
      return nativeEncodeURIComponent(translateSvgString(value));
    }
    return nativeEncodeURIComponent(value);
  };

  if (document.documentElement) {
    document.documentElement.dataset.darktransHook = "1";
  }

  document.dispatchEvent(new Event("darktrans-hook-ready"));

  window.DarkTransCanvas = {
    setDictionary,
    setEnabled,
    translateString,
  };
})();
