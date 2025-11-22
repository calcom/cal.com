var content = (function() {
  "use strict";var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  var _a, _b;
  const definition = defineContentScript({
    matches: ["<all_urls>"],
    main() {
      const existingSidebar = document.getElementById("cal-companion-sidebar");
      if (existingSidebar) {
        return;
      }
      let isVisible = false;
      let isClosed = true;
      const sidebarContainer = document.createElement("div");
      sidebarContainer.id = "cal-companion-sidebar";
      sidebarContainer.style.position = "fixed";
      sidebarContainer.style.top = "0";
      sidebarContainer.style.right = "0";
      sidebarContainer.style.width = "400px";
      sidebarContainer.style.height = "100vh";
      sidebarContainer.style.zIndex = "2147483647";
      sidebarContainer.style.backgroundColor = "white";
      sidebarContainer.style.border = "1px solid #ccc";
      sidebarContainer.style.borderTop = "none";
      sidebarContainer.style.borderBottom = "none";
      sidebarContainer.style.boxShadow = "-2px 0 10px rgba(0,0,0,0.1)";
      sidebarContainer.style.transition = "transform 0.3s ease-in-out";
      sidebarContainer.style.transform = "translateX(100%)";
      sidebarContainer.style.display = "none";
      const iframe = document.createElement("iframe");
      iframe.src = "http://localhost:8081";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      iframe.style.borderRadius = "0";
      sidebarContainer.appendChild(iframe);
      const buttonsContainer = document.createElement("div");
      buttonsContainer.id = "cal-companion-buttons";
      buttonsContainer.style.position = "fixed";
      buttonsContainer.style.top = "20px";
      buttonsContainer.style.right = "420px";
      buttonsContainer.style.display = "flex";
      buttonsContainer.style.flexDirection = "column";
      buttonsContainer.style.gap = "8px";
      buttonsContainer.style.zIndex = "2147483648";
      buttonsContainer.style.transition = "right 0.3s ease-in-out";
      buttonsContainer.style.display = "none";
      const toggleButton = document.createElement("button");
      toggleButton.innerHTML = "◀";
      toggleButton.style.width = "40px";
      toggleButton.style.height = "40px";
      toggleButton.style.borderRadius = "50%";
      toggleButton.style.border = "none";
      toggleButton.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
      toggleButton.style.backdropFilter = "blur(10px)";
      toggleButton.style.color = "white";
      toggleButton.style.cursor = "pointer";
      toggleButton.style.fontSize = "16px";
      toggleButton.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
      toggleButton.style.transition = "all 0.2s ease";
      toggleButton.title = "Toggle sidebar";
      const closeButton = document.createElement("button");
      closeButton.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13 1L1 13" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M1 1L13 13" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;
      closeButton.style.width = "40px";
      closeButton.style.height = "40px";
      closeButton.style.borderRadius = "50%";
      closeButton.style.border = "none";
      closeButton.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
      closeButton.style.backdropFilter = "blur(10px)";
      closeButton.style.color = "white";
      closeButton.style.cursor = "pointer";
      closeButton.style.fontSize = "16px";
      closeButton.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
      closeButton.style.transition = "all 0.2s ease";
      closeButton.title = "Close sidebar";
      toggleButton.addEventListener("mouseenter", () => {
        toggleButton.style.transform = "scale(1.1)";
      });
      toggleButton.addEventListener("mouseleave", () => {
        toggleButton.style.transform = "scale(1)";
      });
      closeButton.addEventListener("mouseenter", () => {
        closeButton.style.transform = "scale(1.1)";
      });
      closeButton.addEventListener("mouseleave", () => {
        closeButton.style.transform = "scale(1)";
      });
      toggleButton.addEventListener("click", () => {
        if (isClosed) return;
        isVisible = !isVisible;
        if (isVisible) {
          sidebarContainer.style.transform = "translateX(0)";
          buttonsContainer.style.right = "420px";
          toggleButton.innerHTML = `<svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1 11L6 6L1 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M8 11L13 6L8 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
        } else {
          sidebarContainer.style.transform = "translateX(100%)";
          buttonsContainer.style.right = "20px";
          toggleButton.innerHTML = `<svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13 1L8 6L13 11" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M6 1L1 6L6 11" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
        }
      });
      closeButton.addEventListener("click", () => {
        isClosed = true;
        isVisible = false;
        sidebarContainer.style.display = "none";
        buttonsContainer.style.display = "none";
      });
      buttonsContainer.appendChild(toggleButton);
      buttonsContainer.appendChild(closeButton);
      document.body.appendChild(sidebarContainer);
      document.body.appendChild(buttonsContainer);
      chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "icon-clicked") {
          if (isClosed) {
            isClosed = false;
            isVisible = true;
            sidebarContainer.style.display = "block";
            buttonsContainer.style.display = "flex";
            sidebarContainer.style.transform = "translateX(0)";
            buttonsContainer.style.right = "420px";
            toggleButton.innerHTML = `<svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1 11L6 6L1 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M8 11L13 6L8 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
          } else {
            isVisible = !isVisible;
            if (isVisible) {
              sidebarContainer.style.transform = "translateX(0)";
              buttonsContainer.style.right = "420px";
              toggleButton.innerHTML = `<svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1 11L6 6L1 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M8 11L13 6L8 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
            } else {
              sidebarContainer.style.transform = "translateX(100%)";
              buttonsContainer.style.right = "20px";
              toggleButton.innerHTML = `<svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13 1L8 6L13 11" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M6 1L1 6L6 11" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
            }
          }
        }
      });
    }
  });
  function defineContentScript(config) {
    return config;
  }
  const browser$1 = ((_b = (_a = globalThis.browser) == null ? void 0 : _a.runtime) == null ? void 0 : _b.id) ? globalThis.browser : globalThis.chrome;
  const browser = browser$1;
  function print$1(method, ...args) {
    if (typeof args[0] === "string") {
      const message = args.shift();
      method(`[wxt] ${message}`, ...args);
    } else {
      method("[wxt]", ...args);
    }
  }
  const logger$1 = {
    debug: (...args) => print$1(console.debug, ...args),
    log: (...args) => print$1(console.log, ...args),
    warn: (...args) => print$1(console.warn, ...args),
    error: (...args) => print$1(console.error, ...args)
  };
  const _WxtLocationChangeEvent = class _WxtLocationChangeEvent extends Event {
    constructor(newUrl, oldUrl) {
      super(_WxtLocationChangeEvent.EVENT_NAME, {});
      this.newUrl = newUrl;
      this.oldUrl = oldUrl;
    }
  };
  __publicField(_WxtLocationChangeEvent, "EVENT_NAME", getUniqueEventName("wxt:locationchange"));
  let WxtLocationChangeEvent = _WxtLocationChangeEvent;
  function getUniqueEventName(eventName) {
    var _a2;
    return `${(_a2 = browser == null ? void 0 : browser.runtime) == null ? void 0 : _a2.id}:${"content"}:${eventName}`;
  }
  function createLocationWatcher(ctx) {
    let interval;
    let oldUrl;
    return {
      /**
       * Ensure the location watcher is actively looking for URL changes. If it's already watching,
       * this is a noop.
       */
      run() {
        if (interval != null) return;
        oldUrl = new URL(location.href);
        interval = ctx.setInterval(() => {
          let newUrl = new URL(location.href);
          if (newUrl.href !== oldUrl.href) {
            window.dispatchEvent(new WxtLocationChangeEvent(newUrl, oldUrl));
            oldUrl = newUrl;
          }
        }, 1e3);
      }
    };
  }
  const _ContentScriptContext = class _ContentScriptContext {
    constructor(contentScriptName, options) {
      __publicField(this, "isTopFrame", window.self === window.top);
      __publicField(this, "abortController");
      __publicField(this, "locationWatcher", createLocationWatcher(this));
      __publicField(this, "receivedMessageIds", /* @__PURE__ */ new Set());
      this.contentScriptName = contentScriptName;
      this.options = options;
      this.abortController = new AbortController();
      if (this.isTopFrame) {
        this.listenForNewerScripts({ ignoreFirstEvent: true });
        this.stopOldScripts();
      } else {
        this.listenForNewerScripts();
      }
    }
    get signal() {
      return this.abortController.signal;
    }
    abort(reason) {
      return this.abortController.abort(reason);
    }
    get isInvalid() {
      if (browser.runtime.id == null) {
        this.notifyInvalidated();
      }
      return this.signal.aborted;
    }
    get isValid() {
      return !this.isInvalid;
    }
    /**
     * Add a listener that is called when the content script's context is invalidated.
     *
     * @returns A function to remove the listener.
     *
     * @example
     * browser.runtime.onMessage.addListener(cb);
     * const removeInvalidatedListener = ctx.onInvalidated(() => {
     *   browser.runtime.onMessage.removeListener(cb);
     * })
     * // ...
     * removeInvalidatedListener();
     */
    onInvalidated(cb) {
      this.signal.addEventListener("abort", cb);
      return () => this.signal.removeEventListener("abort", cb);
    }
    /**
     * Return a promise that never resolves. Useful if you have an async function that shouldn't run
     * after the context is expired.
     *
     * @example
     * const getValueFromStorage = async () => {
     *   if (ctx.isInvalid) return ctx.block();
     *
     *   // ...
     * }
     */
    block() {
      return new Promise(() => {
      });
    }
    /**
     * Wrapper around `window.setInterval` that automatically clears the interval when invalidated.
     *
     * Intervals can be cleared by calling the normal `clearInterval` function.
     */
    setInterval(handler, timeout) {
      const id = setInterval(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearInterval(id));
      return id;
    }
    /**
     * Wrapper around `window.setTimeout` that automatically clears the interval when invalidated.
     *
     * Timeouts can be cleared by calling the normal `setTimeout` function.
     */
    setTimeout(handler, timeout) {
      const id = setTimeout(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearTimeout(id));
      return id;
    }
    /**
     * Wrapper around `window.requestAnimationFrame` that automatically cancels the request when
     * invalidated.
     *
     * Callbacks can be canceled by calling the normal `cancelAnimationFrame` function.
     */
    requestAnimationFrame(callback) {
      const id = requestAnimationFrame((...args) => {
        if (this.isValid) callback(...args);
      });
      this.onInvalidated(() => cancelAnimationFrame(id));
      return id;
    }
    /**
     * Wrapper around `window.requestIdleCallback` that automatically cancels the request when
     * invalidated.
     *
     * Callbacks can be canceled by calling the normal `cancelIdleCallback` function.
     */
    requestIdleCallback(callback, options) {
      const id = requestIdleCallback((...args) => {
        if (!this.signal.aborted) callback(...args);
      }, options);
      this.onInvalidated(() => cancelIdleCallback(id));
      return id;
    }
    addEventListener(target, type, handler, options) {
      var _a2;
      if (type === "wxt:locationchange") {
        if (this.isValid) this.locationWatcher.run();
      }
      (_a2 = target.addEventListener) == null ? void 0 : _a2.call(
        target,
        type.startsWith("wxt:") ? getUniqueEventName(type) : type,
        handler,
        {
          ...options,
          signal: this.signal
        }
      );
    }
    /**
     * @internal
     * Abort the abort controller and execute all `onInvalidated` listeners.
     */
    notifyInvalidated() {
      this.abort("Content script context invalidated");
      logger$1.debug(
        `Content script "${this.contentScriptName}" context invalidated`
      );
    }
    stopOldScripts() {
      window.postMessage(
        {
          type: _ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE,
          contentScriptName: this.contentScriptName,
          messageId: Math.random().toString(36).slice(2)
        },
        "*"
      );
    }
    verifyScriptStartedEvent(event) {
      var _a2, _b2, _c;
      const isScriptStartedEvent = ((_a2 = event.data) == null ? void 0 : _a2.type) === _ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE;
      const isSameContentScript = ((_b2 = event.data) == null ? void 0 : _b2.contentScriptName) === this.contentScriptName;
      const isNotDuplicate = !this.receivedMessageIds.has((_c = event.data) == null ? void 0 : _c.messageId);
      return isScriptStartedEvent && isSameContentScript && isNotDuplicate;
    }
    listenForNewerScripts(options) {
      let isFirst = true;
      const cb = (event) => {
        if (this.verifyScriptStartedEvent(event)) {
          this.receivedMessageIds.add(event.data.messageId);
          const wasFirst = isFirst;
          isFirst = false;
          if (wasFirst && (options == null ? void 0 : options.ignoreFirstEvent)) return;
          this.notifyInvalidated();
        }
      };
      addEventListener("message", cb);
      this.onInvalidated(() => removeEventListener("message", cb));
    }
  };
  __publicField(_ContentScriptContext, "SCRIPT_STARTED_MESSAGE_TYPE", getUniqueEventName(
    "wxt:content-script-started"
  ));
  let ContentScriptContext = _ContentScriptContext;
  function initPlugins() {
  }
  function print(method, ...args) {
    if (typeof args[0] === "string") {
      const message = args.shift();
      method(`[wxt] ${message}`, ...args);
    } else {
      method("[wxt]", ...args);
    }
  }
  const logger = {
    debug: (...args) => print(console.debug, ...args),
    log: (...args) => print(console.log, ...args),
    warn: (...args) => print(console.warn, ...args),
    error: (...args) => print(console.error, ...args)
  };
  const result = (async () => {
    try {
      initPlugins();
      const { main, ...options } = definition;
      const ctx = new ContentScriptContext("content", options);
      return await main(ctx);
    } catch (err) {
      logger.error(
        `The content script "${"content"}" crashed on startup!`,
        err
      );
      throw err;
    }
  })();
  return result;
})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vZW50cnlwb2ludHMvY29udGVudC50cyIsIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9Ad3h0LWRldi9icm93c2VyL3NyYy9pbmRleC5tanMiLCIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvYnJvd3Nlci5tanMiLCIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvaW50ZXJuYWwvbG9nZ2VyLm1qcyIsIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9pbnRlcm5hbC9jdXN0b20tZXZlbnRzLm1qcyIsIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9pbnRlcm5hbC9sb2NhdGlvbi13YXRjaGVyLm1qcyIsIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9jb250ZW50LXNjcmlwdC1jb250ZXh0Lm1qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZGVmYXVsdCBkZWZpbmVDb250ZW50U2NyaXB0KHtcbiAgbWF0Y2hlczogWyc8YWxsX3VybHM+J10sXG4gIG1haW4oKSB7XG4gICAgY29uc3QgZXhpc3RpbmdTaWRlYmFyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbC1jb21wYW5pb24tc2lkZWJhcicpO1xuICAgIGlmIChleGlzdGluZ1NpZGViYXIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgaXNWaXNpYmxlID0gZmFsc2U7XG4gICAgbGV0IGlzQ2xvc2VkID0gdHJ1ZTtcblxuICAgIC8vIENyZWF0ZSBzaWRlYmFyIGNvbnRhaW5lclxuICAgIGNvbnN0IHNpZGViYXJDb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBzaWRlYmFyQ29udGFpbmVyLmlkID0gJ2NhbC1jb21wYW5pb24tc2lkZWJhcic7XG4gICAgc2lkZWJhckNvbnRhaW5lci5zdHlsZS5wb3NpdGlvbiA9ICdmaXhlZCc7XG4gICAgc2lkZWJhckNvbnRhaW5lci5zdHlsZS50b3AgPSAnMCc7XG4gICAgc2lkZWJhckNvbnRhaW5lci5zdHlsZS5yaWdodCA9ICcwJztcbiAgICBzaWRlYmFyQ29udGFpbmVyLnN0eWxlLndpZHRoID0gJzQwMHB4JztcbiAgICBzaWRlYmFyQ29udGFpbmVyLnN0eWxlLmhlaWdodCA9ICcxMDB2aCc7XG4gICAgc2lkZWJhckNvbnRhaW5lci5zdHlsZS56SW5kZXggPSAnMjE0NzQ4MzY0Nyc7XG4gICAgc2lkZWJhckNvbnRhaW5lci5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAnd2hpdGUnO1xuICAgIHNpZGViYXJDb250YWluZXIuc3R5bGUuYm9yZGVyID0gJzFweCBzb2xpZCAjY2NjJztcbiAgICBzaWRlYmFyQ29udGFpbmVyLnN0eWxlLmJvcmRlclRvcCA9ICdub25lJztcbiAgICBzaWRlYmFyQ29udGFpbmVyLnN0eWxlLmJvcmRlckJvdHRvbSA9ICdub25lJztcbiAgICBzaWRlYmFyQ29udGFpbmVyLnN0eWxlLmJveFNoYWRvdyA9ICctMnB4IDAgMTBweCByZ2JhKDAsMCwwLDAuMSknO1xuICAgIHNpZGViYXJDb250YWluZXIuc3R5bGUudHJhbnNpdGlvbiA9ICd0cmFuc2Zvcm0gMC4zcyBlYXNlLWluLW91dCc7XG4gICAgc2lkZWJhckNvbnRhaW5lci5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlWCgxMDAlKSc7XG4gICAgc2lkZWJhckNvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuXG4gICAgLy8gQ3JlYXRlIGlmcmFtZVxuICAgIGNvbnN0IGlmcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lmcmFtZScpO1xuICAgIGlmcmFtZS5zcmMgPSAnaHR0cDovL2xvY2FsaG9zdDo4MDgxJztcbiAgICBpZnJhbWUuc3R5bGUud2lkdGggPSAnMTAwJSc7XG4gICAgaWZyYW1lLnN0eWxlLmhlaWdodCA9ICcxMDAlJztcbiAgICBpZnJhbWUuc3R5bGUuYm9yZGVyID0gJ25vbmUnO1xuICAgIGlmcmFtZS5zdHlsZS5ib3JkZXJSYWRpdXMgPSAnMCc7XG5cbiAgICBzaWRlYmFyQ29udGFpbmVyLmFwcGVuZENoaWxkKGlmcmFtZSk7XG5cbiAgICAvLyBDcmVhdGUgZmxvYXRpbmcgYnV0dG9ucyBjb250YWluZXJcbiAgICBjb25zdCBidXR0b25zQ29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgYnV0dG9uc0NvbnRhaW5lci5pZCA9ICdjYWwtY29tcGFuaW9uLWJ1dHRvbnMnO1xuICAgIGJ1dHRvbnNDb250YWluZXIuc3R5bGUucG9zaXRpb24gPSAnZml4ZWQnO1xuICAgIGJ1dHRvbnNDb250YWluZXIuc3R5bGUudG9wID0gJzIwcHgnO1xuICAgIGJ1dHRvbnNDb250YWluZXIuc3R5bGUucmlnaHQgPSAnNDIwcHgnO1xuICAgIGJ1dHRvbnNDb250YWluZXIuc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcbiAgICBidXR0b25zQ29udGFpbmVyLnN0eWxlLmZsZXhEaXJlY3Rpb24gPSAnY29sdW1uJztcbiAgICBidXR0b25zQ29udGFpbmVyLnN0eWxlLmdhcCA9ICc4cHgnO1xuICAgIGJ1dHRvbnNDb250YWluZXIuc3R5bGUuekluZGV4ID0gJzIxNDc0ODM2NDgnO1xuICAgIGJ1dHRvbnNDb250YWluZXIuc3R5bGUudHJhbnNpdGlvbiA9ICdyaWdodCAwLjNzIGVhc2UtaW4tb3V0JztcbiAgICBidXR0b25zQ29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG5cbiAgICAvLyBDcmVhdGUgdG9nZ2xlIGJ1dHRvblxuICAgIGNvbnN0IHRvZ2dsZUJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuICAgIHRvZ2dsZUJ1dHRvbi5pbm5lckhUTUwgPSAn4peAJztcbiAgICB0b2dnbGVCdXR0b24uc3R5bGUud2lkdGggPSAnNDBweCc7XG4gICAgdG9nZ2xlQnV0dG9uLnN0eWxlLmhlaWdodCA9ICc0MHB4JztcbiAgICB0b2dnbGVCdXR0b24uc3R5bGUuYm9yZGVyUmFkaXVzID0gJzUwJSc7XG4gICAgdG9nZ2xlQnV0dG9uLnN0eWxlLmJvcmRlciA9ICdub25lJztcbiAgICB0b2dnbGVCdXR0b24uc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJ3JnYmEoMCwgMCwgMCwgMC41KSc7XG4gICAgdG9nZ2xlQnV0dG9uLnN0eWxlLmJhY2tkcm9wRmlsdGVyID0gJ2JsdXIoMTBweCknO1xuICAgIHRvZ2dsZUJ1dHRvbi5zdHlsZS5jb2xvciA9ICd3aGl0ZSc7XG4gICAgdG9nZ2xlQnV0dG9uLnN0eWxlLmN1cnNvciA9ICdwb2ludGVyJztcbiAgICB0b2dnbGVCdXR0b24uc3R5bGUuZm9udFNpemUgPSAnMTZweCc7XG4gICAgdG9nZ2xlQnV0dG9uLnN0eWxlLmJveFNoYWRvdyA9ICcwIDJweCA4cHggcmdiYSgwLDAsMCwwLjIpJztcbiAgICB0b2dnbGVCdXR0b24uc3R5bGUudHJhbnNpdGlvbiA9ICdhbGwgMC4ycyBlYXNlJztcbiAgICB0b2dnbGVCdXR0b24udGl0bGUgPSAnVG9nZ2xlIHNpZGViYXInO1xuXG4gICAgLy8gQ3JlYXRlIGNsb3NlIGJ1dHRvblxuICAgIGNvbnN0IGNsb3NlQnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG4gICAgY2xvc2VCdXR0b24uaW5uZXJIVE1MID0gYDxzdmcgd2lkdGg9XCIxNFwiIGhlaWdodD1cIjE0XCIgdmlld0JveD1cIjAgMCAxNCAxNFwiIGZpbGw9XCJub25lXCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiPlxuPHBhdGggZD1cIk0xMyAxTDEgMTNcIiBzdHJva2U9XCJ3aGl0ZVwiIHN0cm9rZS13aWR0aD1cIjJcIiBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIi8+XG48cGF0aCBkPVwiTTEgMUwxMyAxM1wiIHN0cm9rZT1cIndoaXRlXCIgc3Ryb2tlLXdpZHRoPVwiMlwiIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiLz5cbjwvc3ZnPlxuYDtcbiAgICBjbG9zZUJ1dHRvbi5zdHlsZS53aWR0aCA9ICc0MHB4JztcbiAgICBjbG9zZUJ1dHRvbi5zdHlsZS5oZWlnaHQgPSAnNDBweCc7XG4gICAgY2xvc2VCdXR0b24uc3R5bGUuYm9yZGVyUmFkaXVzID0gJzUwJSc7XG4gICAgY2xvc2VCdXR0b24uc3R5bGUuYm9yZGVyID0gJ25vbmUnO1xuICAgIGNsb3NlQnV0dG9uLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICdyZ2JhKDAsIDAsIDAsIDAuNSknO1xuICAgIGNsb3NlQnV0dG9uLnN0eWxlLmJhY2tkcm9wRmlsdGVyID0gJ2JsdXIoMTBweCknO1xuICAgIGNsb3NlQnV0dG9uLnN0eWxlLmNvbG9yID0gJ3doaXRlJztcbiAgICBjbG9zZUJ1dHRvbi5zdHlsZS5jdXJzb3IgPSAncG9pbnRlcic7XG4gICAgY2xvc2VCdXR0b24uc3R5bGUuZm9udFNpemUgPSAnMTZweCc7XG4gICAgY2xvc2VCdXR0b24uc3R5bGUuYm94U2hhZG93ID0gJzAgMnB4IDhweCByZ2JhKDAsMCwwLDAuMiknO1xuICAgIGNsb3NlQnV0dG9uLnN0eWxlLnRyYW5zaXRpb24gPSAnYWxsIDAuMnMgZWFzZSc7XG4gICAgY2xvc2VCdXR0b24udGl0bGUgPSAnQ2xvc2Ugc2lkZWJhcic7XG5cbiAgICAvLyBBZGQgaG92ZXIgZWZmZWN0c1xuICAgIHRvZ2dsZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWVudGVyJywgKCkgPT4ge1xuICAgICAgdG9nZ2xlQnV0dG9uLnN0eWxlLnRyYW5zZm9ybSA9ICdzY2FsZSgxLjEpJztcbiAgICB9KTtcbiAgICB0b2dnbGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignbW91c2VsZWF2ZScsICgpID0+IHtcbiAgICAgIHRvZ2dsZUJ1dHRvbi5zdHlsZS50cmFuc2Zvcm0gPSAnc2NhbGUoMSknO1xuICAgIH0pO1xuXG4gICAgY2xvc2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignbW91c2VlbnRlcicsICgpID0+IHtcbiAgICAgIGNsb3NlQnV0dG9uLnN0eWxlLnRyYW5zZm9ybSA9ICdzY2FsZSgxLjEpJztcbiAgICB9KTtcbiAgICBjbG9zZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWxlYXZlJywgKCkgPT4ge1xuICAgICAgY2xvc2VCdXR0b24uc3R5bGUudHJhbnNmb3JtID0gJ3NjYWxlKDEpJztcbiAgICB9KTtcblxuICAgIC8vIFRvZ2dsZSBmdW5jdGlvbmFsaXR5XG4gICAgdG9nZ2xlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgaWYgKGlzQ2xvc2VkKSByZXR1cm47XG4gICAgICBcbiAgICAgIGlzVmlzaWJsZSA9ICFpc1Zpc2libGU7XG4gICAgICBpZiAoaXNWaXNpYmxlKSB7XG4gICAgICAgIHNpZGViYXJDb250YWluZXIuc3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZVgoMCknO1xuICAgICAgICBidXR0b25zQ29udGFpbmVyLnN0eWxlLnJpZ2h0ID0gJzQyMHB4JztcbiAgICAgICAgdG9nZ2xlQnV0dG9uLmlubmVySFRNTCA9IGA8c3ZnIHdpZHRoPVwiMTRcIiBoZWlnaHQ9XCIxMlwiIHZpZXdCb3g9XCIwIDAgMTQgMTJcIiBmaWxsPVwibm9uZVwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj5cbjxwYXRoIGQ9XCJNMSAxMUw2IDZMMSAxXCIgc3Ryb2tlPVwid2hpdGVcIiBzdHJva2Utd2lkdGg9XCIyXCIgc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIvPlxuPHBhdGggZD1cIk04IDExTDEzIDZMOCAxXCIgc3Ryb2tlPVwid2hpdGVcIiBzdHJva2Utd2lkdGg9XCIyXCIgc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIvPlxuPC9zdmc+YDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNpZGViYXJDb250YWluZXIuc3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZVgoMTAwJSknO1xuICAgICAgICBidXR0b25zQ29udGFpbmVyLnN0eWxlLnJpZ2h0ID0gJzIwcHgnO1xuICAgICAgICB0b2dnbGVCdXR0b24uaW5uZXJIVE1MID0gYDxzdmcgd2lkdGg9XCIxNFwiIGhlaWdodD1cIjEyXCIgdmlld0JveD1cIjAgMCAxNCAxMlwiIGZpbGw9XCJub25lXCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiPlxuPHBhdGggZD1cIk0xMyAxTDggNkwxMyAxMVwiIHN0cm9rZT1cIndoaXRlXCIgc3Ryb2tlLXdpZHRoPVwiMlwiIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiLz5cbjxwYXRoIGQ9XCJNNiAxTDEgNkw2IDExXCIgc3Ryb2tlPVwid2hpdGVcIiBzdHJva2Utd2lkdGg9XCIyXCIgc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIvPlxuPC9zdmc+YDtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIENsb3NlIGZ1bmN0aW9uYWxpdHlcbiAgICBjbG9zZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIGlzQ2xvc2VkID0gdHJ1ZTtcbiAgICAgIGlzVmlzaWJsZSA9IGZhbHNlO1xuICAgICAgc2lkZWJhckNvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgYnV0dG9uc0NvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgIH0pO1xuXG4gICAgLy8gQWRkIGJ1dHRvbnMgdG8gY29udGFpbmVyXG4gICAgYnV0dG9uc0NvbnRhaW5lci5hcHBlbmRDaGlsZCh0b2dnbGVCdXR0b24pO1xuICAgIGJ1dHRvbnNDb250YWluZXIuYXBwZW5kQ2hpbGQoY2xvc2VCdXR0b24pO1xuXG4gICAgLy8gQWRkIGV2ZXJ5dGhpbmcgdG8gRE9NXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzaWRlYmFyQ29udGFpbmVyKTtcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGJ1dHRvbnNDb250YWluZXIpO1xuXG4gICAgLy8gTGlzdGVuIGZvciBleHRlbnNpb24gaWNvbiBjbGlja1xuICAgIGNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobWVzc2FnZSkgPT4ge1xuICAgICAgaWYgKG1lc3NhZ2UuYWN0aW9uID09PSAnaWNvbi1jbGlja2VkJykge1xuICAgICAgICBpZiAoaXNDbG9zZWQpIHtcbiAgICAgICAgICAvLyBSZW9wZW4gY2xvc2VkIHNpZGViYXJcbiAgICAgICAgICBpc0Nsb3NlZCA9IGZhbHNlO1xuICAgICAgICAgIGlzVmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgc2lkZWJhckNvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbiAgICAgICAgICBidXR0b25zQ29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XG4gICAgICAgICAgc2lkZWJhckNvbnRhaW5lci5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlWCgwKSc7XG4gICAgICAgICAgYnV0dG9uc0NvbnRhaW5lci5zdHlsZS5yaWdodCA9ICc0MjBweCc7XG4gICAgICAgICAgdG9nZ2xlQnV0dG9uLmlubmVySFRNTCA9IGA8c3ZnIHdpZHRoPVwiMTRcIiBoZWlnaHQ9XCIxMlwiIHZpZXdCb3g9XCIwIDAgMTQgMTJcIiBmaWxsPVwibm9uZVwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj5cbjxwYXRoIGQ9XCJNMSAxMUw2IDZMMSAxXCIgc3Ryb2tlPVwid2hpdGVcIiBzdHJva2Utd2lkdGg9XCIyXCIgc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIvPlxuPHBhdGggZD1cIk04IDExTDEzIDZMOCAxXCIgc3Ryb2tlPVwid2hpdGVcIiBzdHJva2Utd2lkdGg9XCIyXCIgc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIvPlxuPC9zdmc+YDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBUb2dnbGUgdmlzaWJsZSBzaWRlYmFyXG4gICAgICAgICAgaXNWaXNpYmxlID0gIWlzVmlzaWJsZTtcbiAgICAgICAgICBpZiAoaXNWaXNpYmxlKSB7XG4gICAgICAgICAgICBzaWRlYmFyQ29udGFpbmVyLnN0eWxlLnRyYW5zZm9ybSA9ICd0cmFuc2xhdGVYKDApJztcbiAgICAgICAgICAgIGJ1dHRvbnNDb250YWluZXIuc3R5bGUucmlnaHQgPSAnNDIwcHgnO1xuICAgICAgICAgICAgdG9nZ2xlQnV0dG9uLmlubmVySFRNTCA9IGA8c3ZnIHdpZHRoPVwiMTRcIiBoZWlnaHQ9XCIxMlwiIHZpZXdCb3g9XCIwIDAgMTQgMTJcIiBmaWxsPVwibm9uZVwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj5cbjxwYXRoIGQ9XCJNMSAxMUw2IDZMMSAxXCIgc3Ryb2tlPVwid2hpdGVcIiBzdHJva2Utd2lkdGg9XCIyXCIgc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIvPlxuPHBhdGggZD1cIk04IDExTDEzIDZMOCAxXCIgc3Ryb2tlPVwid2hpdGVcIiBzdHJva2Utd2lkdGg9XCIyXCIgc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIvPlxuPC9zdmc+YDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2lkZWJhckNvbnRhaW5lci5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlWCgxMDAlKSc7XG4gICAgICAgICAgICBidXR0b25zQ29udGFpbmVyLnN0eWxlLnJpZ2h0ID0gJzIwcHgnO1xuICAgICAgICAgICAgdG9nZ2xlQnV0dG9uLmlubmVySFRNTCA9IGA8c3ZnIHdpZHRoPVwiMTRcIiBoZWlnaHQ9XCIxMlwiIHZpZXdCb3g9XCIwIDAgMTQgMTJcIiBmaWxsPVwibm9uZVwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj5cbjxwYXRoIGQ9XCJNMTMgMUw4IDZMMTMgMTFcIiBzdHJva2U9XCJ3aGl0ZVwiIHN0cm9rZS13aWR0aD1cIjJcIiBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIi8+XG48cGF0aCBkPVwiTTYgMUwxIDZMNiAxMVwiIHN0cm9rZT1cIndoaXRlXCIgc3Ryb2tlLXdpZHRoPVwiMlwiIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiLz5cbjwvc3ZnPmA7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG59KTtcblxuZnVuY3Rpb24gZGVmaW5lQ29udGVudFNjcmlwdChjb25maWc6IHsgbWF0Y2hlczogc3RyaW5nW10sIG1haW46ICgpID0+IHZvaWQgfSkge1xuICByZXR1cm4gY29uZmlnO1xufSIsIi8vICNyZWdpb24gc25pcHBldFxuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBnbG9iYWxUaGlzLmJyb3dzZXI/LnJ1bnRpbWU/LmlkXG4gID8gZ2xvYmFsVGhpcy5icm93c2VyXG4gIDogZ2xvYmFsVGhpcy5jaHJvbWU7XG4vLyAjZW5kcmVnaW9uIHNuaXBwZXRcbiIsImltcG9ydCB7IGJyb3dzZXIgYXMgX2Jyb3dzZXIgfSBmcm9tIFwiQHd4dC1kZXYvYnJvd3NlclwiO1xuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBfYnJvd3NlcjtcbmV4cG9ydCB7fTtcbiIsImZ1bmN0aW9uIHByaW50KG1ldGhvZCwgLi4uYXJncykge1xuICBpZiAoaW1wb3J0Lm1ldGEuZW52Lk1PREUgPT09IFwicHJvZHVjdGlvblwiKSByZXR1cm47XG4gIGlmICh0eXBlb2YgYXJnc1swXSA9PT0gXCJzdHJpbmdcIikge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBhcmdzLnNoaWZ0KCk7XG4gICAgbWV0aG9kKGBbd3h0XSAke21lc3NhZ2V9YCwgLi4uYXJncyk7XG4gIH0gZWxzZSB7XG4gICAgbWV0aG9kKFwiW3d4dF1cIiwgLi4uYXJncyk7XG4gIH1cbn1cbmV4cG9ydCBjb25zdCBsb2dnZXIgPSB7XG4gIGRlYnVnOiAoLi4uYXJncykgPT4gcHJpbnQoY29uc29sZS5kZWJ1ZywgLi4uYXJncyksXG4gIGxvZzogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUubG9nLCAuLi5hcmdzKSxcbiAgd2FybjogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUud2FybiwgLi4uYXJncyksXG4gIGVycm9yOiAoLi4uYXJncykgPT4gcHJpbnQoY29uc29sZS5lcnJvciwgLi4uYXJncylcbn07XG4iLCJpbXBvcnQgeyBicm93c2VyIH0gZnJvbSBcInd4dC9icm93c2VyXCI7XG5leHBvcnQgY2xhc3MgV3h0TG9jYXRpb25DaGFuZ2VFdmVudCBleHRlbmRzIEV2ZW50IHtcbiAgY29uc3RydWN0b3IobmV3VXJsLCBvbGRVcmwpIHtcbiAgICBzdXBlcihXeHRMb2NhdGlvbkNoYW5nZUV2ZW50LkVWRU5UX05BTUUsIHt9KTtcbiAgICB0aGlzLm5ld1VybCA9IG5ld1VybDtcbiAgICB0aGlzLm9sZFVybCA9IG9sZFVybDtcbiAgfVxuICBzdGF0aWMgRVZFTlRfTkFNRSA9IGdldFVuaXF1ZUV2ZW50TmFtZShcInd4dDpsb2NhdGlvbmNoYW5nZVwiKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBnZXRVbmlxdWVFdmVudE5hbWUoZXZlbnROYW1lKSB7XG4gIHJldHVybiBgJHticm93c2VyPy5ydW50aW1lPy5pZH06JHtpbXBvcnQubWV0YS5lbnYuRU5UUllQT0lOVH06JHtldmVudE5hbWV9YDtcbn1cbiIsImltcG9ydCB7IFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQgfSBmcm9tIFwiLi9jdXN0b20tZXZlbnRzLm1qc1wiO1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUxvY2F0aW9uV2F0Y2hlcihjdHgpIHtcbiAgbGV0IGludGVydmFsO1xuICBsZXQgb2xkVXJsO1xuICByZXR1cm4ge1xuICAgIC8qKlxuICAgICAqIEVuc3VyZSB0aGUgbG9jYXRpb24gd2F0Y2hlciBpcyBhY3RpdmVseSBsb29raW5nIGZvciBVUkwgY2hhbmdlcy4gSWYgaXQncyBhbHJlYWR5IHdhdGNoaW5nLFxuICAgICAqIHRoaXMgaXMgYSBub29wLlxuICAgICAqL1xuICAgIHJ1bigpIHtcbiAgICAgIGlmIChpbnRlcnZhbCAhPSBudWxsKSByZXR1cm47XG4gICAgICBvbGRVcmwgPSBuZXcgVVJMKGxvY2F0aW9uLmhyZWYpO1xuICAgICAgaW50ZXJ2YWwgPSBjdHguc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICBsZXQgbmV3VXJsID0gbmV3IFVSTChsb2NhdGlvbi5ocmVmKTtcbiAgICAgICAgaWYgKG5ld1VybC5ocmVmICE9PSBvbGRVcmwuaHJlZikge1xuICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBXeHRMb2NhdGlvbkNoYW5nZUV2ZW50KG5ld1VybCwgb2xkVXJsKSk7XG4gICAgICAgICAgb2xkVXJsID0gbmV3VXJsO1xuICAgICAgICB9XG4gICAgICB9LCAxZTMpO1xuICAgIH1cbiAgfTtcbn1cbiIsImltcG9ydCB7IGJyb3dzZXIgfSBmcm9tIFwid3h0L2Jyb3dzZXJcIjtcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gXCIuLi91dGlscy9pbnRlcm5hbC9sb2dnZXIubWpzXCI7XG5pbXBvcnQge1xuICBnZXRVbmlxdWVFdmVudE5hbWVcbn0gZnJvbSBcIi4vaW50ZXJuYWwvY3VzdG9tLWV2ZW50cy5tanNcIjtcbmltcG9ydCB7IGNyZWF0ZUxvY2F0aW9uV2F0Y2hlciB9IGZyb20gXCIuL2ludGVybmFsL2xvY2F0aW9uLXdhdGNoZXIubWpzXCI7XG5leHBvcnQgY2xhc3MgQ29udGVudFNjcmlwdENvbnRleHQge1xuICBjb25zdHJ1Y3Rvcihjb250ZW50U2NyaXB0TmFtZSwgb3B0aW9ucykge1xuICAgIHRoaXMuY29udGVudFNjcmlwdE5hbWUgPSBjb250ZW50U2NyaXB0TmFtZTtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMuYWJvcnRDb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICAgIGlmICh0aGlzLmlzVG9wRnJhbWUpIHtcbiAgICAgIHRoaXMubGlzdGVuRm9yTmV3ZXJTY3JpcHRzKHsgaWdub3JlRmlyc3RFdmVudDogdHJ1ZSB9KTtcbiAgICAgIHRoaXMuc3RvcE9sZFNjcmlwdHMoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5saXN0ZW5Gb3JOZXdlclNjcmlwdHMoKTtcbiAgICB9XG4gIH1cbiAgc3RhdGljIFNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRSA9IGdldFVuaXF1ZUV2ZW50TmFtZShcbiAgICBcInd4dDpjb250ZW50LXNjcmlwdC1zdGFydGVkXCJcbiAgKTtcbiAgaXNUb3BGcmFtZSA9IHdpbmRvdy5zZWxmID09PSB3aW5kb3cudG9wO1xuICBhYm9ydENvbnRyb2xsZXI7XG4gIGxvY2F0aW9uV2F0Y2hlciA9IGNyZWF0ZUxvY2F0aW9uV2F0Y2hlcih0aGlzKTtcbiAgcmVjZWl2ZWRNZXNzYWdlSWRzID0gLyogQF9fUFVSRV9fICovIG5ldyBTZXQoKTtcbiAgZ2V0IHNpZ25hbCgpIHtcbiAgICByZXR1cm4gdGhpcy5hYm9ydENvbnRyb2xsZXIuc2lnbmFsO1xuICB9XG4gIGFib3J0KHJlYXNvbikge1xuICAgIHJldHVybiB0aGlzLmFib3J0Q29udHJvbGxlci5hYm9ydChyZWFzb24pO1xuICB9XG4gIGdldCBpc0ludmFsaWQoKSB7XG4gICAgaWYgKGJyb3dzZXIucnVudGltZS5pZCA9PSBudWxsKSB7XG4gICAgICB0aGlzLm5vdGlmeUludmFsaWRhdGVkKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnNpZ25hbC5hYm9ydGVkO1xuICB9XG4gIGdldCBpc1ZhbGlkKCkge1xuICAgIHJldHVybiAhdGhpcy5pc0ludmFsaWQ7XG4gIH1cbiAgLyoqXG4gICAqIEFkZCBhIGxpc3RlbmVyIHRoYXQgaXMgY2FsbGVkIHdoZW4gdGhlIGNvbnRlbnQgc2NyaXB0J3MgY29udGV4dCBpcyBpbnZhbGlkYXRlZC5cbiAgICpcbiAgICogQHJldHVybnMgQSBmdW5jdGlvbiB0byByZW1vdmUgdGhlIGxpc3RlbmVyLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBicm93c2VyLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKGNiKTtcbiAgICogY29uc3QgcmVtb3ZlSW52YWxpZGF0ZWRMaXN0ZW5lciA9IGN0eC5vbkludmFsaWRhdGVkKCgpID0+IHtcbiAgICogICBicm93c2VyLnJ1bnRpbWUub25NZXNzYWdlLnJlbW92ZUxpc3RlbmVyKGNiKTtcbiAgICogfSlcbiAgICogLy8gLi4uXG4gICAqIHJlbW92ZUludmFsaWRhdGVkTGlzdGVuZXIoKTtcbiAgICovXG4gIG9uSW52YWxpZGF0ZWQoY2IpIHtcbiAgICB0aGlzLnNpZ25hbC5hZGRFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgY2IpO1xuICAgIHJldHVybiAoKSA9PiB0aGlzLnNpZ25hbC5yZW1vdmVFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgY2IpO1xuICB9XG4gIC8qKlxuICAgKiBSZXR1cm4gYSBwcm9taXNlIHRoYXQgbmV2ZXIgcmVzb2x2ZXMuIFVzZWZ1bCBpZiB5b3UgaGF2ZSBhbiBhc3luYyBmdW5jdGlvbiB0aGF0IHNob3VsZG4ndCBydW5cbiAgICogYWZ0ZXIgdGhlIGNvbnRleHQgaXMgZXhwaXJlZC5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogY29uc3QgZ2V0VmFsdWVGcm9tU3RvcmFnZSA9IGFzeW5jICgpID0+IHtcbiAgICogICBpZiAoY3R4LmlzSW52YWxpZCkgcmV0dXJuIGN0eC5ibG9jaygpO1xuICAgKlxuICAgKiAgIC8vIC4uLlxuICAgKiB9XG4gICAqL1xuICBibG9jaygpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKCkgPT4ge1xuICAgIH0pO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnNldEludGVydmFsYCB0aGF0IGF1dG9tYXRpY2FsbHkgY2xlYXJzIHRoZSBpbnRlcnZhbCB3aGVuIGludmFsaWRhdGVkLlxuICAgKlxuICAgKiBJbnRlcnZhbHMgY2FuIGJlIGNsZWFyZWQgYnkgY2FsbGluZyB0aGUgbm9ybWFsIGBjbGVhckludGVydmFsYCBmdW5jdGlvbi5cbiAgICovXG4gIHNldEludGVydmFsKGhhbmRsZXIsIHRpbWVvdXQpIHtcbiAgICBjb25zdCBpZCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWQpIGhhbmRsZXIoKTtcbiAgICB9LCB0aW1lb3V0KTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2xlYXJJbnRlcnZhbChpZCkpO1xuICAgIHJldHVybiBpZDtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5zZXRUaW1lb3V0YCB0aGF0IGF1dG9tYXRpY2FsbHkgY2xlYXJzIHRoZSBpbnRlcnZhbCB3aGVuIGludmFsaWRhdGVkLlxuICAgKlxuICAgKiBUaW1lb3V0cyBjYW4gYmUgY2xlYXJlZCBieSBjYWxsaW5nIHRoZSBub3JtYWwgYHNldFRpbWVvdXRgIGZ1bmN0aW9uLlxuICAgKi9cbiAgc2V0VGltZW91dChoYW5kbGVyLCB0aW1lb3V0KSB7XG4gICAgY29uc3QgaWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWQpIGhhbmRsZXIoKTtcbiAgICB9LCB0aW1lb3V0KTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2xlYXJUaW1lb3V0KGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZWAgdGhhdCBhdXRvbWF0aWNhbGx5IGNhbmNlbHMgdGhlIHJlcXVlc3Qgd2hlblxuICAgKiBpbnZhbGlkYXRlZC5cbiAgICpcbiAgICogQ2FsbGJhY2tzIGNhbiBiZSBjYW5jZWxlZCBieSBjYWxsaW5nIHRoZSBub3JtYWwgYGNhbmNlbEFuaW1hdGlvbkZyYW1lYCBmdW5jdGlvbi5cbiAgICovXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZShjYWxsYmFjaykge1xuICAgIGNvbnN0IGlkID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCguLi5hcmdzKSA9PiB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkKSBjYWxsYmFjayguLi5hcmdzKTtcbiAgICB9KTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2FuY2VsQW5pbWF0aW9uRnJhbWUoaWQpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cucmVxdWVzdElkbGVDYWxsYmFja2AgdGhhdCBhdXRvbWF0aWNhbGx5IGNhbmNlbHMgdGhlIHJlcXVlc3Qgd2hlblxuICAgKiBpbnZhbGlkYXRlZC5cbiAgICpcbiAgICogQ2FsbGJhY2tzIGNhbiBiZSBjYW5jZWxlZCBieSBjYWxsaW5nIHRoZSBub3JtYWwgYGNhbmNlbElkbGVDYWxsYmFja2AgZnVuY3Rpb24uXG4gICAqL1xuICByZXF1ZXN0SWRsZUNhbGxiYWNrKGNhbGxiYWNrLCBvcHRpb25zKSB7XG4gICAgY29uc3QgaWQgPSByZXF1ZXN0SWRsZUNhbGxiYWNrKCguLi5hcmdzKSA9PiB7XG4gICAgICBpZiAoIXRoaXMuc2lnbmFsLmFib3J0ZWQpIGNhbGxiYWNrKC4uLmFyZ3MpO1xuICAgIH0sIG9wdGlvbnMpO1xuICAgIHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiBjYW5jZWxJZGxlQ2FsbGJhY2soaWQpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgYWRkRXZlbnRMaXN0ZW5lcih0YXJnZXQsIHR5cGUsIGhhbmRsZXIsIG9wdGlvbnMpIHtcbiAgICBpZiAodHlwZSA9PT0gXCJ3eHQ6bG9jYXRpb25jaGFuZ2VcIikge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgdGhpcy5sb2NhdGlvbldhdGNoZXIucnVuKCk7XG4gICAgfVxuICAgIHRhcmdldC5hZGRFdmVudExpc3RlbmVyPy4oXG4gICAgICB0eXBlLnN0YXJ0c1dpdGgoXCJ3eHQ6XCIpID8gZ2V0VW5pcXVlRXZlbnROYW1lKHR5cGUpIDogdHlwZSxcbiAgICAgIGhhbmRsZXIsXG4gICAgICB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIHNpZ25hbDogdGhpcy5zaWduYWxcbiAgICAgIH1cbiAgICApO1xuICB9XG4gIC8qKlxuICAgKiBAaW50ZXJuYWxcbiAgICogQWJvcnQgdGhlIGFib3J0IGNvbnRyb2xsZXIgYW5kIGV4ZWN1dGUgYWxsIGBvbkludmFsaWRhdGVkYCBsaXN0ZW5lcnMuXG4gICAqL1xuICBub3RpZnlJbnZhbGlkYXRlZCgpIHtcbiAgICB0aGlzLmFib3J0KFwiQ29udGVudCBzY3JpcHQgY29udGV4dCBpbnZhbGlkYXRlZFwiKTtcbiAgICBsb2dnZXIuZGVidWcoXG4gICAgICBgQ29udGVudCBzY3JpcHQgXCIke3RoaXMuY29udGVudFNjcmlwdE5hbWV9XCIgY29udGV4dCBpbnZhbGlkYXRlZGBcbiAgICApO1xuICB9XG4gIHN0b3BPbGRTY3JpcHRzKCkge1xuICAgIHdpbmRvdy5wb3N0TWVzc2FnZShcbiAgICAgIHtcbiAgICAgICAgdHlwZTogQ29udGVudFNjcmlwdENvbnRleHQuU0NSSVBUX1NUQVJURURfTUVTU0FHRV9UWVBFLFxuICAgICAgICBjb250ZW50U2NyaXB0TmFtZTogdGhpcy5jb250ZW50U2NyaXB0TmFtZSxcbiAgICAgICAgbWVzc2FnZUlkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyKVxuICAgICAgfSxcbiAgICAgIFwiKlwiXG4gICAgKTtcbiAgfVxuICB2ZXJpZnlTY3JpcHRTdGFydGVkRXZlbnQoZXZlbnQpIHtcbiAgICBjb25zdCBpc1NjcmlwdFN0YXJ0ZWRFdmVudCA9IGV2ZW50LmRhdGE/LnR5cGUgPT09IENvbnRlbnRTY3JpcHRDb250ZXh0LlNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRTtcbiAgICBjb25zdCBpc1NhbWVDb250ZW50U2NyaXB0ID0gZXZlbnQuZGF0YT8uY29udGVudFNjcmlwdE5hbWUgPT09IHRoaXMuY29udGVudFNjcmlwdE5hbWU7XG4gICAgY29uc3QgaXNOb3REdXBsaWNhdGUgPSAhdGhpcy5yZWNlaXZlZE1lc3NhZ2VJZHMuaGFzKGV2ZW50LmRhdGE/Lm1lc3NhZ2VJZCk7XG4gICAgcmV0dXJuIGlzU2NyaXB0U3RhcnRlZEV2ZW50ICYmIGlzU2FtZUNvbnRlbnRTY3JpcHQgJiYgaXNOb3REdXBsaWNhdGU7XG4gIH1cbiAgbGlzdGVuRm9yTmV3ZXJTY3JpcHRzKG9wdGlvbnMpIHtcbiAgICBsZXQgaXNGaXJzdCA9IHRydWU7XG4gICAgY29uc3QgY2IgPSAoZXZlbnQpID0+IHtcbiAgICAgIGlmICh0aGlzLnZlcmlmeVNjcmlwdFN0YXJ0ZWRFdmVudChldmVudCkpIHtcbiAgICAgICAgdGhpcy5yZWNlaXZlZE1lc3NhZ2VJZHMuYWRkKGV2ZW50LmRhdGEubWVzc2FnZUlkKTtcbiAgICAgICAgY29uc3Qgd2FzRmlyc3QgPSBpc0ZpcnN0O1xuICAgICAgICBpc0ZpcnN0ID0gZmFsc2U7XG4gICAgICAgIGlmICh3YXNGaXJzdCAmJiBvcHRpb25zPy5pZ25vcmVGaXJzdEV2ZW50KSByZXR1cm47XG4gICAgICAgIHRoaXMubm90aWZ5SW52YWxpZGF0ZWQoKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGNiKTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gcmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgY2IpKTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbImJyb3dzZXIiLCJfYnJvd3NlciIsInByaW50IiwibG9nZ2VyIiwiX2EiLCJfYiJdLCJtYXBwaW5ncyI6Ijs7Ozs7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
content;