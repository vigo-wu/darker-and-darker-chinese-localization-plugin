(() => {
  const SKIP_TAGS = new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "CODE",
    "PRE",
    "TEXTAREA",
    "SVG",
  ]);

  const TRANSLATABLE_ATTRIBUTES = ["placeholder", "title", "aria-label", "alt"];

  class DarkTransTranslator {
    constructor(dictionary) {
      this.enabled = true;
      this.dictionary = dictionary || {};
      this.sortedEntries = Object.entries(this.dictionary).sort(
        (a, b) => b[0].length - a[0].length
      );
      this.originalTextNodes = new WeakMap();
      this.originalAttributes = new WeakMap();
      this.observer = null;
      this.pendingFrame = null;
    }

    setEnabled(enabled) {
      this.enabled = enabled;
      if (enabled) {
        this.translateDocument(document.body);
      } else {
        this.restoreDocument(document.body);
      }
    }

    setDictionary(dictionary) {
      this.dictionary = dictionary || {};
      this.sortedEntries = Object.entries(this.dictionary).sort(
        (a, b) => b[0].length - a[0].length
      );

      if (!this.enabled) return;

      this.restoreDocument(document.body);
      this.translateDocument(document.body);
    }

    shouldSkipElement(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return true;
      if (SKIP_TAGS.has(element.tagName)) return true;
      if (element.closest("[data-darktrans-skip]")) return true;
      if (element.isContentEditable) return true;
      return false;
    }

    translateString(text) {
      if (!text || !this.enabled) return text;

      const trimmed = text.trim();
      if (!trimmed) return text;

      if (Object.prototype.hasOwnProperty.call(this.dictionary, trimmed)) {
        return this.preserveWhitespace(text, this.dictionary[trimmed]);
      }

      let result = text;
      for (const [source, target] of this.sortedEntries) {
        if (result.includes(source)) {
          result = result.split(source).join(target);
        }
      }

      return result;
    }

    preserveWhitespace(original, translated) {
      const leading = original.match(/^\s*/)?.[0] || "";
      const trailing = original.match(/\s*$/)?.[0] || "";
      return `${leading}${translated}${trailing}`;
    }

    translateTextNode(node) {
      if (!node || node.nodeType !== Node.TEXT_NODE) return;

      const parent = node.parentElement;
      if (!parent || this.shouldSkipElement(parent)) return;

      const original = node.textContent;
      if (!original || !original.trim()) return;

      if (!this.originalTextNodes.has(node)) {
        this.originalTextNodes.set(node, original);
      }

      const translated = this.translateString(original);
      if (translated !== original) {
        node.textContent = translated;
      }
    }

    restoreTextNode(node) {
      const original = this.originalTextNodes.get(node);
      if (original !== undefined) {
        node.textContent = original;
      }
    }

    translateAttributes(element) {
      if (this.shouldSkipElement(element)) return;

      for (const attributeName of TRANSLATABLE_ATTRIBUTES) {
        if (!element.hasAttribute(attributeName)) continue;

        const original = element.getAttribute(attributeName);
        if (!original) continue;

        const key = `${attributeName}:${original}`;
        const store = this.originalAttributes.get(element) || {};
        if (!store[key]) {
          store[key] = original;
          this.originalAttributes.set(element, store);
        }

        const translated = this.translateString(original);
        if (translated !== original) {
          element.setAttribute(attributeName, translated);
        }
      }
    }

    restoreAttributes(element) {
      const store = this.originalAttributes.get(element);
      if (!store) return;

      for (const [key, original] of Object.entries(store)) {
        const attributeName = key.split(":")[0];
        element.setAttribute(attributeName, original);
      }
    }

    walkElement(element) {
      if (!element) return;

      if (element.tagName === "svg" || element.tagName === "SVG") {
        for (const child of element.childNodes) {
          if (child.nodeType === Node.ELEMENT_NODE) {
            this.walkElement(child);
          }
        }
        return;
      }

      if (this.shouldSkipElement(element)) return;

      this.translateAttributes(element);

      for (const child of element.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          this.translateTextNode(child);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          this.walkElement(child);
        }
      }
    }

    restoreElement(element) {
      if (!element || this.shouldSkipElement(element)) return;

      this.restoreAttributes(element);

      for (const child of element.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          this.restoreTextNode(child);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          this.restoreElement(child);
        }
      }
    }

    translateDocument(root) {
      if (!root || !this.enabled) return;
      this.walkElement(root);
    }

    restoreDocument(root) {
      if (!root) return;
      this.restoreElement(root);
    }

    observe() {
      if (this.observer) return;

      this.observer = new MutationObserver((mutations) => {
        if (!this.enabled) return;

        let shouldTranslate = false;
        for (const mutation of mutations) {
          if (mutation.type === "characterData" || mutation.type === "childList") {
            shouldTranslate = true;
            break;
          }
        }

        if (!shouldTranslate) return;

        if (this.pendingFrame) {
          cancelAnimationFrame(this.pendingFrame);
        }

        this.pendingFrame = requestAnimationFrame(() => {
          this.pendingFrame = null;
          this.translateDocument(document.body);
        });
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  }

  window.DarkTransTranslator = DarkTransTranslator;
})();
