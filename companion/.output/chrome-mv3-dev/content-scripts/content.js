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
      if (window.location.hostname === "mail.google.com") {
        initGmailIntegration();
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
      toggleButton.style.display = "flex";
      toggleButton.style.alignItems = "center";
      toggleButton.style.justifyContent = "center";
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
      closeButton.style.display = "flex";
      closeButton.style.alignItems = "center";
      closeButton.style.justifyContent = "center";
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
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
          sendResponse({ success: true });
        }
      });
      function initGmailIntegration() {
        function injectCalButton() {
          const sendButtons = document.querySelectorAll('div[role="button"][data-tooltip="Send ‪(Ctrl-Enter)‬"], div[role="button"][data-tooltip*="Send"], div[role="button"][aria-label*="Send"]');
          sendButtons.forEach((sendButton) => {
            var _a2;
            const sendButtonCell = sendButton.closest("td");
            if (!sendButtonCell) return;
            const tableRow = sendButtonCell.closest("tr");
            if (!tableRow) return;
            const existingCalButton = (_a2 = sendButtonCell.parentElement) == null ? void 0 : _a2.querySelector(".cal-companion-gmail-button");
            if (existingCalButton) return;
            const composeWindow = sendButton.closest('[role="dialog"]') || sendButton.closest(".nH");
            if (!composeWindow) return;
            const calButtonCell = document.createElement("td");
            calButtonCell.className = "cal-companion-gmail-button";
            calButtonCell.style.cssText = `
            padding: 0;
            margin: 0;
            vertical-align: middle;
            border: none;
          `;
            const calButton = document.createElement("div");
            calButton.style.cssText = `
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            margin: 2px 4px;
            border-radius: 50%;
            background-color: #000000;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          `;
            calButton.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.4688 5H17.0887V13.76H15.4688V5Z" fill="white"/>
              <path d="M10.918 13.9186C10.358 13.9186 9.84198 13.7746 9.36998 13.4866C8.89798 13.1906 8.52198 12.7946 8.24198 12.2986C7.96998 11.8026 7.83398 11.2586 7.83398 10.6666C7.83398 10.0746 7.96998 9.53063 8.24198 9.03463C8.52198 8.53063 8.89798 8.13062 9.36998 7.83462C9.84198 7.53862 10.358 7.39062 10.918 7.39062C11.43 7.39062 11.842 7.48662 12.154 7.67862C12.474 7.87062 12.722 8.14662 12.898 8.50662V7.52262H14.506V13.7626H12.934V12.7426C12.75 13.1186 12.498 13.4106 12.178 13.6186C11.866 13.8186 11.446 13.9186 10.918 13.9186ZM9.45398 10.6546C9.45398 10.9746 9.52598 11.2746 9.66998 11.5546C9.82198 11.8266 10.026 12.0466 10.282 12.2146C10.546 12.3746 10.846 12.4546 11.182 12.4546C11.526 12.4546 11.83 12.3746 12.094 12.2146C12.366 12.0546 12.574 11.8386 12.718 11.5666C12.862 11.2946 12.934 10.9946 12.934 10.6666C12.934 10.3386 12.862 10.0386 12.718 9.76662C12.574 9.48662 12.366 9.26662 12.094 9.10663C11.83 8.93863 11.526 8.85463 11.182 8.85463C10.846 8.85463 10.546 8.93863 10.282 9.10663C10.018 9.26662 9.81398 9.48262 9.66998 9.75462C9.52598 10.0266 9.45398 10.3266 9.45398 10.6546Z" fill="white"/>
              <path d="M4.68078 13.919C3.86478 13.919 3.12078 13.727 2.44878 13.343C1.78478 12.951 1.26078 12.423 0.876781 11.759C0.492781 11.095 0.300781 10.367 0.300781 9.57503C0.300781 8.77503 0.484781 8.04303 0.852781 7.37903C1.22878 6.70703 1.74878 6.17903 2.41278 5.79503C3.07678 5.40303 3.83278 5.20703 4.68078 5.20703C5.36078 5.20703 5.94478 5.31503 6.43278 5.53103C6.92878 5.73903 7.36878 6.07103 7.75278 6.52703L6.56478 7.55903C6.06078 7.03103 5.43278 6.76703 4.68078 6.76703C4.15278 6.76703 3.68878 6.89503 3.28878 7.15103C2.88878 7.39903 2.58078 7.73903 2.36478 8.17103C2.14878 8.59503 2.04078 9.06303 2.04078 9.57503C2.04078 10.087 2.14878 10.555 2.36478 10.979C2.58878 11.403 2.90078 11.739 3.30078 11.987C3.70878 12.235 4.18078 12.359 4.71678 12.359C5.50078 12.359 6.14078 12.087 6.63678 11.543L7.86078 12.587C7.52478 12.995 7.08478 13.319 6.54078 13.559C6.00478 13.799 5.38478 13.919 4.68078 13.919Z" fill="white"/>
            </svg>
          `;
            calButton.addEventListener("mouseenter", () => {
              calButton.style.backgroundColor = "#333333";
              calButton.style.transform = "scale(1.05)";
            });
            calButton.addEventListener("mouseleave", () => {
              calButton.style.backgroundColor = "#000000";
              calButton.style.transform = "scale(1)";
            });
            calButton.addEventListener("click", (e) => {
              e.preventDefault();
              e.stopPropagation();
              const existingMenu = document.querySelector(".cal-companion-gmail-menu");
              if (existingMenu) {
                existingMenu.remove();
                return;
              }
              const menu = document.createElement("div");
              menu.className = "cal-companion-gmail-menu";
              menu.style.cssText = `
              position: absolute;
              bottom: 100%;
              left: 0;
              min-width: 250px;
              max-width: 350px;
              max-height: 300px;
              background: white;
              border-radius: 4px;
              box-shadow: 0 1px 2px 0 rgba(60,64,67,.3),0 2px 6px 2px rgba(60,64,67,.15);
              font-family: "Google Sans",Roboto,RobotoDraft,Helvetica,Arial,sans-serif;
              font-size: 14px;
              z-index: 9999;
              overflow-y: auto;
              margin-bottom: 4px;
            `;
              menu.innerHTML = `
              <div style="padding: 16px; text-align: center; color: #5f6368;">
                Loading event types...
              </div>
            `;
              fetchEventTypes(menu);
              calButtonCell.style.position = "relative";
              calButtonCell.appendChild(menu);
              setTimeout(() => {
                document.addEventListener("click", function closeMenu(e2) {
                  if (!menu.contains(e2.target)) {
                    menu.remove();
                    document.removeEventListener("click", closeMenu);
                  }
                });
              }, 0);
            });
            async function fetchEventTypes(menu) {
              var _a3;
              try {
                if (!((_a3 = chrome.runtime) == null ? void 0 : _a3.id)) {
                  throw new Error("Extension context invalidated. Please reload the page.");
                }
                const response = await new Promise((resolve, reject) => {
                  try {
                    chrome.runtime.sendMessage(
                      { action: "fetch-event-types" },
                      (response2) => {
                        console.log("Raw response from background:", response2);
                        if (chrome.runtime.lastError) {
                          console.log("Chrome runtime error:", chrome.runtime.lastError);
                          reject(new Error(chrome.runtime.lastError.message));
                        } else if (response2 && response2.error) {
                          console.log("Response has error:", response2.error);
                          reject(new Error(response2.error));
                        } else {
                          console.log("Resolving with response:", response2);
                          resolve(response2);
                        }
                      }
                    );
                  } catch (err) {
                    console.error("Error sending message:", err);
                    reject(err);
                  }
                });
                console.log("Final response from background script:", response);
                let eventTypes = [];
                if (response && response.data) {
                  eventTypes = response.data;
                } else if (Array.isArray(response)) {
                  eventTypes = response;
                } else {
                  console.log("Unexpected response format:", response);
                  eventTypes = [];
                }
                if (!Array.isArray(eventTypes)) {
                  console.log("EventTypes is not an array:", typeof eventTypes, eventTypes);
                  eventTypes = [];
                }
                console.log("Final eventTypes array:", eventTypes, "Length:", eventTypes.length);
                menu.innerHTML = "";
                if (eventTypes.length === 0) {
                  menu.innerHTML = `
                  <div style="padding: 16px; text-align: center; color: #5f6368;">
                    No event types found
                  </div>
                `;
                  return;
                }
                const header = document.createElement("div");
                header.style.cssText = `
                padding: 12px 16px;
                border-bottom: 1px solid #e8eaed;
                background-color: #f8f9fa;
                font-weight: 500;
                color: #3c4043;
                font-size: 13px;
              `;
                header.textContent = "Select an event type to share";
                menu.appendChild(header);
                try {
                  eventTypes.forEach((eventType, index) => {
                    if (!eventType || typeof eventType !== "object") {
                      console.warn("Invalid event type object:", eventType);
                      return;
                    }
                    const title = eventType.title || "Untitled Event";
                    const length = eventType.length || eventType.duration || 30;
                    const description = eventType.description || "No description";
                    const menuItem = document.createElement("div");
                    menuItem.style.cssText = `
                    padding: 12px 16px;
                    display: flex;
                    flex-direction: column;
                    cursor: pointer;
                    transition: background-color 0.1s ease;
                    border-bottom: ${index < eventTypes.length - 1 ? "1px solid #e8eaed" : "none"};
                  `;
                    menuItem.innerHTML = `
                    <div style="display: flex; align-items: center; margin-bottom: 4px;">
                      <span style="margin-right: 8px; font-size: 14px;">📅</span>
                      <span style="color: #3c4043; font-weight: 500;">${title}</span>
                    </div>
                    <div style="color: #5f6368; font-size: 12px; margin-left: 22px;">
                      ${length}min • ${description}
                    </div>
                  `;
                    menuItem.addEventListener("mouseenter", () => {
                      menuItem.style.backgroundColor = "#f8f9fa";
                    });
                    menuItem.addEventListener("mouseleave", () => {
                      menuItem.style.backgroundColor = "transparent";
                    });
                    menuItem.addEventListener("click", (e) => {
                      e.stopPropagation();
                      menu.remove();
                      copyEventTypeLink(eventType);
                    });
                    menu.appendChild(menuItem);
                  });
                } catch (forEachError) {
                  console.error("Error in forEach loop:", forEachError);
                  menu.innerHTML = `
                  <div style="padding: 16px; text-align: center; color: #ea4335;">
                    Error displaying event types
                  </div>
                `;
                }
              } catch (error) {
                console.error("Failed to fetch event types:", error);
                console.log("Error details:", error.message, error.stack);
                menu.innerHTML = `
                <div style="padding: 16px; text-align: center; color: #ea4335;">
                  Failed to load event types
                </div>
                <div style="padding: 0 16px; text-align: center; color: #5f6368; font-size: 12px;">
                  Error: ${error.message}
                </div>
                <div style="padding: 16px 16px; text-align: center;">
                  <button onclick="this.parentElement.parentElement.remove()" style="
                    background: #1a73e8;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    font-size: 14px;
                    cursor: pointer;
                  ">Close</button>
                </div>
              `;
              }
            }
            function copyEventTypeLink(eventType) {
              var _a3, _b2;
              const bookingUrl = `https://cal.com/${((_b2 = (_a3 = eventType.users) == null ? void 0 : _a3[0]) == null ? void 0 : _b2.username) || "user"}/${eventType.slug}`;
              navigator.clipboard.writeText(bookingUrl).then(() => {
                showNotification("Link copied to clipboard!", "success");
              }).catch((err) => {
                console.error("Failed to copy link:", err);
                showNotification("Failed to copy link", "error");
              });
            }
            function showNotification(message, type) {
              const notification = document.createElement("div");
              notification.style.cssText = `
              position: fixed;
              top: 20px;
              right: 20px;
              padding: 12px 16px;
              background: ${type === "success" ? "#137333" : "#d93025"};
              color: white;
              border-radius: 4px;
              font-family: "Google Sans",Roboto,RobotoDraft,Helvetica,Arial,sans-serif;
              font-size: 14px;
              z-index: 10000;
              box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            `;
              notification.textContent = message;
              document.body.appendChild(notification);
              setTimeout(() => {
                notification.remove();
              }, 3e3);
            }
            calButton.title = "Schedule with Cal.com";
            calButtonCell.appendChild(calButton);
            if (sendButtonCell.nextSibling) {
              tableRow.insertBefore(calButtonCell, sendButtonCell.nextSibling);
            } else {
              tableRow.appendChild(calButtonCell);
            }
          });
        }
        setTimeout(injectCalButton, 1e3);
        const observer = new MutationObserver(() => {
          injectCalButton();
        });
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        let currentUrl = window.location.href;
        setInterval(() => {
          if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;
            setTimeout(injectCalButton, 500);
          }
        }, 1e3);
      }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vZXh0ZW5zaW9uL2VudHJ5cG9pbnRzL2NvbnRlbnQudHMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvQHd4dC1kZXYvYnJvd3Nlci9zcmMvaW5kZXgubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2ludGVybmFsL2xvZ2dlci5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvaW50ZXJuYWwvY3VzdG9tLWV2ZW50cy5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvaW50ZXJuYWwvbG9jYXRpb24td2F0Y2hlci5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvY29udGVudC1zY3JpcHQtY29udGV4dC5tanMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29udGVudFNjcmlwdCh7XG4gIG1hdGNoZXM6IFsnPGFsbF91cmxzPiddLFxuICBtYWluKCkge1xuICAgIGNvbnN0IGV4aXN0aW5nU2lkZWJhciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYWwtY29tcGFuaW9uLXNpZGViYXInKTtcbiAgICBpZiAoZXhpc3RpbmdTaWRlYmFyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSW5pdGlhbGl6ZSBHbWFpbCBpbnRlZ3JhdGlvbiBpZiBvbiBHbWFpbFxuICAgIGlmICh3aW5kb3cubG9jYXRpb24uaG9zdG5hbWUgPT09ICdtYWlsLmdvb2dsZS5jb20nKSB7XG4gICAgICBpbml0R21haWxJbnRlZ3JhdGlvbigpO1xuICAgIH1cblxuICAgIGxldCBpc1Zpc2libGUgPSBmYWxzZTtcbiAgICBsZXQgaXNDbG9zZWQgPSB0cnVlO1xuXG4gICAgLy8gQ3JlYXRlIHNpZGViYXIgY29udGFpbmVyXG4gICAgY29uc3Qgc2lkZWJhckNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHNpZGViYXJDb250YWluZXIuaWQgPSAnY2FsLWNvbXBhbmlvbi1zaWRlYmFyJztcbiAgICBzaWRlYmFyQ29udGFpbmVyLnN0eWxlLnBvc2l0aW9uID0gJ2ZpeGVkJztcbiAgICBzaWRlYmFyQ29udGFpbmVyLnN0eWxlLnRvcCA9ICcwJztcbiAgICBzaWRlYmFyQ29udGFpbmVyLnN0eWxlLnJpZ2h0ID0gJzAnO1xuICAgIHNpZGViYXJDb250YWluZXIuc3R5bGUud2lkdGggPSAnNDAwcHgnO1xuICAgIHNpZGViYXJDb250YWluZXIuc3R5bGUuaGVpZ2h0ID0gJzEwMHZoJztcbiAgICBzaWRlYmFyQ29udGFpbmVyLnN0eWxlLnpJbmRleCA9ICcyMTQ3NDgzNjQ3JztcbiAgICBzaWRlYmFyQ29udGFpbmVyLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICd3aGl0ZSc7XG4gICAgc2lkZWJhckNvbnRhaW5lci5zdHlsZS5ib3JkZXIgPSAnMXB4IHNvbGlkICNjY2MnO1xuICAgIHNpZGViYXJDb250YWluZXIuc3R5bGUuYm9yZGVyVG9wID0gJ25vbmUnO1xuICAgIHNpZGViYXJDb250YWluZXIuc3R5bGUuYm9yZGVyQm90dG9tID0gJ25vbmUnO1xuICAgIHNpZGViYXJDb250YWluZXIuc3R5bGUuYm94U2hhZG93ID0gJy0ycHggMCAxMHB4IHJnYmEoMCwwLDAsMC4xKSc7XG4gICAgc2lkZWJhckNvbnRhaW5lci5zdHlsZS50cmFuc2l0aW9uID0gJ3RyYW5zZm9ybSAwLjNzIGVhc2UtaW4tb3V0JztcbiAgICBzaWRlYmFyQ29udGFpbmVyLnN0eWxlLnRyYW5zZm9ybSA9ICd0cmFuc2xhdGVYKDEwMCUpJztcbiAgICBzaWRlYmFyQ29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG5cbiAgICAvLyBDcmVhdGUgaWZyYW1lXG4gICAgY29uc3QgaWZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaWZyYW1lJyk7XG4gICAgaWZyYW1lLnNyYyA9ICdodHRwOi8vbG9jYWxob3N0OjgwODEnO1xuICAgIGlmcmFtZS5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgICBpZnJhbWUuc3R5bGUuaGVpZ2h0ID0gJzEwMCUnO1xuICAgIGlmcmFtZS5zdHlsZS5ib3JkZXIgPSAnbm9uZSc7XG4gICAgaWZyYW1lLnN0eWxlLmJvcmRlclJhZGl1cyA9ICcwJztcblxuICAgIHNpZGViYXJDb250YWluZXIuYXBwZW5kQ2hpbGQoaWZyYW1lKTtcblxuICAgIC8vIENyZWF0ZSBmbG9hdGluZyBidXR0b25zIGNvbnRhaW5lclxuICAgIGNvbnN0IGJ1dHRvbnNDb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBidXR0b25zQ29udGFpbmVyLmlkID0gJ2NhbC1jb21wYW5pb24tYnV0dG9ucyc7XG4gICAgYnV0dG9uc0NvbnRhaW5lci5zdHlsZS5wb3NpdGlvbiA9ICdmaXhlZCc7XG4gICAgYnV0dG9uc0NvbnRhaW5lci5zdHlsZS50b3AgPSAnMjBweCc7XG4gICAgYnV0dG9uc0NvbnRhaW5lci5zdHlsZS5yaWdodCA9ICc0MjBweCc7XG4gICAgYnV0dG9uc0NvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xuICAgIGJ1dHRvbnNDb250YWluZXIuc3R5bGUuZmxleERpcmVjdGlvbiA9ICdjb2x1bW4nO1xuICAgIGJ1dHRvbnNDb250YWluZXIuc3R5bGUuZ2FwID0gJzhweCc7XG4gICAgYnV0dG9uc0NvbnRhaW5lci5zdHlsZS56SW5kZXggPSAnMjE0NzQ4MzY0OCc7XG4gICAgYnV0dG9uc0NvbnRhaW5lci5zdHlsZS50cmFuc2l0aW9uID0gJ3JpZ2h0IDAuM3MgZWFzZS1pbi1vdXQnO1xuICAgIGJ1dHRvbnNDb250YWluZXIuc3R5bGUuZGlzcGxheSA9ICdub25lJztcblxuICAgIC8vIENyZWF0ZSB0b2dnbGUgYnV0dG9uXG4gICAgY29uc3QgdG9nZ2xlQnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG4gICAgdG9nZ2xlQnV0dG9uLmlubmVySFRNTCA9ICfil4AnO1xuICAgIHRvZ2dsZUJ1dHRvbi5zdHlsZS53aWR0aCA9ICc0MHB4JztcbiAgICB0b2dnbGVCdXR0b24uc3R5bGUuaGVpZ2h0ID0gJzQwcHgnO1xuICAgIHRvZ2dsZUJ1dHRvbi5zdHlsZS5ib3JkZXJSYWRpdXMgPSAnNTAlJztcbiAgICB0b2dnbGVCdXR0b24uc3R5bGUuYm9yZGVyID0gJ25vbmUnO1xuICAgIHRvZ2dsZUJ1dHRvbi5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAncmdiYSgwLCAwLCAwLCAwLjUpJztcbiAgICB0b2dnbGVCdXR0b24uc3R5bGUuYmFja2Ryb3BGaWx0ZXIgPSAnYmx1cigxMHB4KSc7XG4gICAgdG9nZ2xlQnV0dG9uLnN0eWxlLmNvbG9yID0gJ3doaXRlJztcbiAgICB0b2dnbGVCdXR0b24uc3R5bGUuY3Vyc29yID0gJ3BvaW50ZXInO1xuICAgIHRvZ2dsZUJ1dHRvbi5zdHlsZS5mb250U2l6ZSA9ICcxNnB4JztcbiAgICB0b2dnbGVCdXR0b24uc3R5bGUuYm94U2hhZG93ID0gJzAgMnB4IDhweCByZ2JhKDAsMCwwLDAuMiknO1xuICAgIHRvZ2dsZUJ1dHRvbi5zdHlsZS50cmFuc2l0aW9uID0gJ2FsbCAwLjJzIGVhc2UnO1xuICAgIHRvZ2dsZUJ1dHRvbi5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xuICAgIHRvZ2dsZUJ1dHRvbi5zdHlsZS5hbGlnbkl0ZW1zID0gJ2NlbnRlcic7XG4gICAgdG9nZ2xlQnV0dG9uLnN0eWxlLmp1c3RpZnlDb250ZW50ID0gJ2NlbnRlcic7XG4gICAgdG9nZ2xlQnV0dG9uLnRpdGxlID0gJ1RvZ2dsZSBzaWRlYmFyJztcblxuICAgIC8vIENyZWF0ZSBjbG9zZSBidXR0b25cbiAgICBjb25zdCBjbG9zZUJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuICAgIGNsb3NlQnV0dG9uLmlubmVySFRNTCA9IGA8c3ZnIHdpZHRoPVwiMTRcIiBoZWlnaHQ9XCIxNFwiIHZpZXdCb3g9XCIwIDAgMTQgMTRcIiBmaWxsPVwibm9uZVwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj5cbjxwYXRoIGQ9XCJNMTMgMUwxIDEzXCIgc3Ryb2tlPVwid2hpdGVcIiBzdHJva2Utd2lkdGg9XCIyXCIgc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIvPlxuPHBhdGggZD1cIk0xIDFMMTMgMTNcIiBzdHJva2U9XCJ3aGl0ZVwiIHN0cm9rZS13aWR0aD1cIjJcIiBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIi8+XG48L3N2Zz5cbmA7XG4gICAgY2xvc2VCdXR0b24uc3R5bGUud2lkdGggPSAnNDBweCc7XG4gICAgY2xvc2VCdXR0b24uc3R5bGUuaGVpZ2h0ID0gJzQwcHgnO1xuICAgIGNsb3NlQnV0dG9uLnN0eWxlLmJvcmRlclJhZGl1cyA9ICc1MCUnO1xuICAgIGNsb3NlQnV0dG9uLnN0eWxlLmJvcmRlciA9ICdub25lJztcbiAgICBjbG9zZUJ1dHRvbi5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAncmdiYSgwLCAwLCAwLCAwLjUpJztcbiAgICBjbG9zZUJ1dHRvbi5zdHlsZS5iYWNrZHJvcEZpbHRlciA9ICdibHVyKDEwcHgpJztcbiAgICBjbG9zZUJ1dHRvbi5zdHlsZS5jb2xvciA9ICd3aGl0ZSc7XG4gICAgY2xvc2VCdXR0b24uc3R5bGUuY3Vyc29yID0gJ3BvaW50ZXInO1xuICAgIGNsb3NlQnV0dG9uLnN0eWxlLmZvbnRTaXplID0gJzE2cHgnO1xuICAgIGNsb3NlQnV0dG9uLnN0eWxlLmJveFNoYWRvdyA9ICcwIDJweCA4cHggcmdiYSgwLDAsMCwwLjIpJztcbiAgICBjbG9zZUJ1dHRvbi5zdHlsZS50cmFuc2l0aW9uID0gJ2FsbCAwLjJzIGVhc2UnO1xuICAgIGNsb3NlQnV0dG9uLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XG4gICAgY2xvc2VCdXR0b24uc3R5bGUuYWxpZ25JdGVtcyA9ICdjZW50ZXInO1xuICAgIGNsb3NlQnV0dG9uLnN0eWxlLmp1c3RpZnlDb250ZW50ID0gJ2NlbnRlcic7XG4gICAgY2xvc2VCdXR0b24udGl0bGUgPSAnQ2xvc2Ugc2lkZWJhcic7XG5cbiAgICAvLyBBZGQgaG92ZXIgZWZmZWN0c1xuICAgIHRvZ2dsZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWVudGVyJywgKCkgPT4ge1xuICAgICAgdG9nZ2xlQnV0dG9uLnN0eWxlLnRyYW5zZm9ybSA9ICdzY2FsZSgxLjEpJztcbiAgICB9KTtcbiAgICB0b2dnbGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignbW91c2VsZWF2ZScsICgpID0+IHtcbiAgICAgIHRvZ2dsZUJ1dHRvbi5zdHlsZS50cmFuc2Zvcm0gPSAnc2NhbGUoMSknO1xuICAgIH0pO1xuXG4gICAgY2xvc2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignbW91c2VlbnRlcicsICgpID0+IHtcbiAgICAgIGNsb3NlQnV0dG9uLnN0eWxlLnRyYW5zZm9ybSA9ICdzY2FsZSgxLjEpJztcbiAgICB9KTtcbiAgICBjbG9zZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWxlYXZlJywgKCkgPT4ge1xuICAgICAgY2xvc2VCdXR0b24uc3R5bGUudHJhbnNmb3JtID0gJ3NjYWxlKDEpJztcbiAgICB9KTtcblxuICAgIC8vIFRvZ2dsZSBmdW5jdGlvbmFsaXR5XG4gICAgdG9nZ2xlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgaWYgKGlzQ2xvc2VkKSByZXR1cm47XG4gICAgICBcbiAgICAgIGlzVmlzaWJsZSA9ICFpc1Zpc2libGU7XG4gICAgICBpZiAoaXNWaXNpYmxlKSB7XG4gICAgICAgIHNpZGViYXJDb250YWluZXIuc3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZVgoMCknO1xuICAgICAgICBidXR0b25zQ29udGFpbmVyLnN0eWxlLnJpZ2h0ID0gJzQyMHB4JztcbiAgICAgICAgdG9nZ2xlQnV0dG9uLmlubmVySFRNTCA9IGA8c3ZnIHdpZHRoPVwiMTRcIiBoZWlnaHQ9XCIxMlwiIHZpZXdCb3g9XCIwIDAgMTQgMTJcIiBmaWxsPVwibm9uZVwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj5cbjxwYXRoIGQ9XCJNMSAxMUw2IDZMMSAxXCIgc3Ryb2tlPVwid2hpdGVcIiBzdHJva2Utd2lkdGg9XCIyXCIgc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIvPlxuPHBhdGggZD1cIk04IDExTDEzIDZMOCAxXCIgc3Ryb2tlPVwid2hpdGVcIiBzdHJva2Utd2lkdGg9XCIyXCIgc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIvPlxuPC9zdmc+YDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNpZGViYXJDb250YWluZXIuc3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZVgoMTAwJSknO1xuICAgICAgICBidXR0b25zQ29udGFpbmVyLnN0eWxlLnJpZ2h0ID0gJzIwcHgnO1xuICAgICAgICB0b2dnbGVCdXR0b24uaW5uZXJIVE1MID0gYDxzdmcgd2lkdGg9XCIxNFwiIGhlaWdodD1cIjEyXCIgdmlld0JveD1cIjAgMCAxNCAxMlwiIGZpbGw9XCJub25lXCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiPlxuPHBhdGggZD1cIk0xMyAxTDggNkwxMyAxMVwiIHN0cm9rZT1cIndoaXRlXCIgc3Ryb2tlLXdpZHRoPVwiMlwiIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiLz5cbjxwYXRoIGQ9XCJNNiAxTDEgNkw2IDExXCIgc3Ryb2tlPVwid2hpdGVcIiBzdHJva2Utd2lkdGg9XCIyXCIgc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIvPlxuPC9zdmc+YDtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIENsb3NlIGZ1bmN0aW9uYWxpdHlcbiAgICBjbG9zZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIGlzQ2xvc2VkID0gdHJ1ZTtcbiAgICAgIGlzVmlzaWJsZSA9IGZhbHNlO1xuICAgICAgc2lkZWJhckNvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgYnV0dG9uc0NvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgIH0pO1xuXG4gICAgLy8gQWRkIGJ1dHRvbnMgdG8gY29udGFpbmVyXG4gICAgYnV0dG9uc0NvbnRhaW5lci5hcHBlbmRDaGlsZCh0b2dnbGVCdXR0b24pO1xuICAgIGJ1dHRvbnNDb250YWluZXIuYXBwZW5kQ2hpbGQoY2xvc2VCdXR0b24pO1xuXG4gICAgLy8gQWRkIGV2ZXJ5dGhpbmcgdG8gRE9NXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzaWRlYmFyQ29udGFpbmVyKTtcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGJ1dHRvbnNDb250YWluZXIpO1xuXG4gICAgLy8gTGlzdGVuIGZvciBleHRlbnNpb24gaWNvbiBjbGlja1xuICAgIGNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcbiAgICAgIGlmIChtZXNzYWdlLmFjdGlvbiA9PT0gJ2ljb24tY2xpY2tlZCcpIHtcbiAgICAgICAgaWYgKGlzQ2xvc2VkKSB7XG4gICAgICAgICAgLy8gUmVvcGVuIGNsb3NlZCBzaWRlYmFyXG4gICAgICAgICAgaXNDbG9zZWQgPSBmYWxzZTtcbiAgICAgICAgICBpc1Zpc2libGUgPSB0cnVlO1xuICAgICAgICAgIHNpZGViYXJDb250YWluZXIuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG4gICAgICAgICAgYnV0dG9uc0NvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xuICAgICAgICAgIHNpZGViYXJDb250YWluZXIuc3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZVgoMCknO1xuICAgICAgICAgIGJ1dHRvbnNDb250YWluZXIuc3R5bGUucmlnaHQgPSAnNDIwcHgnO1xuICAgICAgICAgIHRvZ2dsZUJ1dHRvbi5pbm5lckhUTUwgPSBgPHN2ZyB3aWR0aD1cIjE0XCIgaGVpZ2h0PVwiMTJcIiB2aWV3Qm94PVwiMCAwIDE0IDEyXCIgZmlsbD1cIm5vbmVcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+XG48cGF0aCBkPVwiTTEgMTFMNiA2TDEgMVwiIHN0cm9rZT1cIndoaXRlXCIgc3Ryb2tlLXdpZHRoPVwiMlwiIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiLz5cbjxwYXRoIGQ9XCJNOCAxMUwxMyA2TDggMVwiIHN0cm9rZT1cIndoaXRlXCIgc3Ryb2tlLXdpZHRoPVwiMlwiIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiLz5cbjwvc3ZnPmA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gVG9nZ2xlIHZpc2libGUgc2lkZWJhclxuICAgICAgICAgIGlzVmlzaWJsZSA9ICFpc1Zpc2libGU7XG4gICAgICAgICAgaWYgKGlzVmlzaWJsZSkge1xuICAgICAgICAgICAgc2lkZWJhckNvbnRhaW5lci5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlWCgwKSc7XG4gICAgICAgICAgICBidXR0b25zQ29udGFpbmVyLnN0eWxlLnJpZ2h0ID0gJzQyMHB4JztcbiAgICAgICAgICAgIHRvZ2dsZUJ1dHRvbi5pbm5lckhUTUwgPSBgPHN2ZyB3aWR0aD1cIjE0XCIgaGVpZ2h0PVwiMTJcIiB2aWV3Qm94PVwiMCAwIDE0IDEyXCIgZmlsbD1cIm5vbmVcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+XG48cGF0aCBkPVwiTTEgMTFMNiA2TDEgMVwiIHN0cm9rZT1cIndoaXRlXCIgc3Ryb2tlLXdpZHRoPVwiMlwiIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiLz5cbjxwYXRoIGQ9XCJNOCAxMUwxMyA2TDggMVwiIHN0cm9rZT1cIndoaXRlXCIgc3Ryb2tlLXdpZHRoPVwiMlwiIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiLz5cbjwvc3ZnPmA7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNpZGViYXJDb250YWluZXIuc3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZVgoMTAwJSknO1xuICAgICAgICAgICAgYnV0dG9uc0NvbnRhaW5lci5zdHlsZS5yaWdodCA9ICcyMHB4JztcbiAgICAgICAgICAgIHRvZ2dsZUJ1dHRvbi5pbm5lckhUTUwgPSBgPHN2ZyB3aWR0aD1cIjE0XCIgaGVpZ2h0PVwiMTJcIiB2aWV3Qm94PVwiMCAwIDE0IDEyXCIgZmlsbD1cIm5vbmVcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+XG48cGF0aCBkPVwiTTEzIDFMOCA2TDEzIDExXCIgc3Ryb2tlPVwid2hpdGVcIiBzdHJva2Utd2lkdGg9XCIyXCIgc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIvPlxuPHBhdGggZD1cIk02IDFMMSA2TDYgMTFcIiBzdHJva2U9XCJ3aGl0ZVwiIHN0cm9rZS13aWR0aD1cIjJcIiBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIi8+XG48L3N2Zz5gO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlIH0pOyAvLyBTZW5kIHJlc3BvbnNlIHRvIGFja25vd2xlZGdlXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBHbWFpbCBpbnRlZ3JhdGlvbiBmdW5jdGlvblxuICAgIGZ1bmN0aW9uIGluaXRHbWFpbEludGVncmF0aW9uKCkge1xuICAgICAgLy8gRnVuY3Rpb24gdG8gaW5qZWN0IENhbC5jb20gYnV0dG9uIGFzIGEgbmV3IHRhYmxlIGNlbGwgYWZ0ZXIgU2VuZCBidXR0b25cbiAgICAgIGZ1bmN0aW9uIGluamVjdENhbEJ1dHRvbigpIHtcbiAgICAgICAgLy8gTG9vayBzcGVjaWZpY2FsbHkgZm9yIEdtYWlsIGNvbXBvc2UgU2VuZCBidXR0b25zIC0gdGhleSBoYXZlIHNwZWNpZmljIGF0dHJpYnV0ZXNcbiAgICAgICAgLy8gR21haWwgU2VuZCBidXR0b24gdXN1YWxseSBoYXMgZGl2W3JvbGU9XCJidXR0b25cIl0gd2l0aCBzcGVjaWZpYyBkYXRhIGF0dHJpYnV0ZXMgaW5zaWRlIGEgdGRcbiAgICAgICAgY29uc3Qgc2VuZEJ1dHRvbnMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdkaXZbcm9sZT1cImJ1dHRvblwiXVtkYXRhLXRvb2x0aXA9XCJTZW5kIOKAqihDdHJsLUVudGVyKeKArFwiXSwgZGl2W3JvbGU9XCJidXR0b25cIl1bZGF0YS10b29sdGlwKj1cIlNlbmRcIl0sIGRpdltyb2xlPVwiYnV0dG9uXCJdW2FyaWEtbGFiZWwqPVwiU2VuZFwiXScpO1xuICAgICAgICBcbiAgICAgICAgc2VuZEJ1dHRvbnMuZm9yRWFjaCgoc2VuZEJ1dHRvbikgPT4ge1xuICAgICAgICAgIC8vIEZpbmQgdGhlIHBhcmVudCB0ZCBjZWxsIHRoYXQgY29udGFpbnMgdGhlIHNlbmQgYnV0dG9uXG4gICAgICAgICAgY29uc3Qgc2VuZEJ1dHRvbkNlbGwgPSBzZW5kQnV0dG9uLmNsb3Nlc3QoJ3RkJyk7XG4gICAgICAgICAgaWYgKCFzZW5kQnV0dG9uQ2VsbCkgcmV0dXJuO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIEZpbmQgdGhlIHBhcmVudCB0YWJsZSByb3dcbiAgICAgICAgICBjb25zdCB0YWJsZVJvdyA9IHNlbmRCdXR0b25DZWxsLmNsb3Nlc3QoJ3RyJyk7XG4gICAgICAgICAgaWYgKCF0YWJsZVJvdykgcmV0dXJuO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIENoZWNrIGlmIHdlIGFscmVhZHkgaW5qZWN0ZWQgb3VyIGJ1dHRvbiBmb3IgdGhpcyBzcGVjaWZpYyBzZW5kIGJ1dHRvblxuICAgICAgICAgIGNvbnN0IGV4aXN0aW5nQ2FsQnV0dG9uID0gc2VuZEJ1dHRvbkNlbGwucGFyZW50RWxlbWVudD8ucXVlcnlTZWxlY3RvcignLmNhbC1jb21wYW5pb24tZ21haWwtYnV0dG9uJyk7XG4gICAgICAgICAgaWYgKGV4aXN0aW5nQ2FsQnV0dG9uKSByZXR1cm47XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gQWRkaXRpb25hbCBjaGVjazogbWFrZSBzdXJlIHRoaXMgaXMgYWN0dWFsbHkgaW4gYSBjb21wb3NlIHdpbmRvd1xuICAgICAgICAgIC8vIEdtYWlsIGNvbXBvc2Ugd2luZG93cyBoYXZlIHNwZWNpZmljIGNvbnRhaW5lcnNcbiAgICAgICAgICBjb25zdCBjb21wb3NlV2luZG93ID0gc2VuZEJ1dHRvbi5jbG9zZXN0KCdbcm9sZT1cImRpYWxvZ1wiXScpIHx8IHNlbmRCdXR0b24uY2xvc2VzdCgnLm5IJyk7XG4gICAgICAgICAgaWYgKCFjb21wb3NlV2luZG93KSByZXR1cm47XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gQ3JlYXRlIG5ldyB0YWJsZSBjZWxsIGZvciBDYWwuY29tIGJ1dHRvblxuICAgICAgICAgIGNvbnN0IGNhbEJ1dHRvbkNlbGwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZCcpO1xuICAgICAgICAgIGNhbEJ1dHRvbkNlbGwuY2xhc3NOYW1lID0gJ2NhbC1jb21wYW5pb24tZ21haWwtYnV0dG9uJztcbiAgICAgICAgICBjYWxCdXR0b25DZWxsLnN0eWxlLmNzc1RleHQgPSBgXG4gICAgICAgICAgICBwYWRkaW5nOiAwO1xuICAgICAgICAgICAgbWFyZ2luOiAwO1xuICAgICAgICAgICAgdmVydGljYWwtYWxpZ246IG1pZGRsZTtcbiAgICAgICAgICAgIGJvcmRlcjogbm9uZTtcbiAgICAgICAgICBgO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIENyZWF0ZSBDYWwuY29tIGJ1dHRvblxuICAgICAgICAgIGNvbnN0IGNhbEJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgIGNhbEJ1dHRvbi5zdHlsZS5jc3NUZXh0ID0gYFxuICAgICAgICAgICAgZGlzcGxheTogaW5saW5lLWZsZXg7XG4gICAgICAgICAgICBhbGlnbi1pdGVtczogY2VudGVyO1xuICAgICAgICAgICAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG4gICAgICAgICAgICB3aWR0aDogMzJweDtcbiAgICAgICAgICAgIGhlaWdodDogMzJweDtcbiAgICAgICAgICAgIG1hcmdpbjogMnB4IDRweDtcbiAgICAgICAgICAgIGJvcmRlci1yYWRpdXM6IDUwJTtcbiAgICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6ICMwMDAwMDA7XG4gICAgICAgICAgICBjdXJzb3I6IHBvaW50ZXI7XG4gICAgICAgICAgICB0cmFuc2l0aW9uOiBhbGwgMC4ycyBlYXNlO1xuICAgICAgICAgICAgYm94LXNoYWRvdzogMCAxcHggM3B4IHJnYmEoMCwwLDAsMC4xKTtcbiAgICAgICAgICBgO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIEFkZCBDYWwuY29tIGljb24gKG9mZmljaWFsIGxvZ28pXG4gICAgICAgICAgY2FsQnV0dG9uLmlubmVySFRNTCA9IGBcbiAgICAgICAgICAgIDxzdmcgd2lkdGg9XCIxOFwiIGhlaWdodD1cIjE4XCIgdmlld0JveD1cIjAgMCAxOCAxOFwiIGZpbGw9XCJub25lXCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiPlxuICAgICAgICAgICAgICA8cGF0aCBkPVwiTTE1LjQ2ODggNUgxNy4wODg3VjEzLjc2SDE1LjQ2ODhWNVpcIiBmaWxsPVwid2hpdGVcIi8+XG4gICAgICAgICAgICAgIDxwYXRoIGQ9XCJNMTAuOTE4IDEzLjkxODZDMTAuMzU4IDEzLjkxODYgOS44NDE5OCAxMy43NzQ2IDkuMzY5OTggMTMuNDg2NkM4Ljg5Nzk4IDEzLjE5MDYgOC41MjE5OCAxMi43OTQ2IDguMjQxOTggMTIuMjk4NkM3Ljk2OTk4IDExLjgwMjYgNy44MzM5OCAxMS4yNTg2IDcuODMzOTggMTAuNjY2NkM3LjgzMzk4IDEwLjA3NDYgNy45Njk5OCA5LjUzMDYzIDguMjQxOTggOS4wMzQ2M0M4LjUyMTk4IDguNTMwNjMgOC44OTc5OCA4LjEzMDYyIDkuMzY5OTggNy44MzQ2MkM5Ljg0MTk4IDcuNTM4NjIgMTAuMzU4IDcuMzkwNjIgMTAuOTE4IDcuMzkwNjJDMTEuNDMgNy4zOTA2MiAxMS44NDIgNy40ODY2MiAxMi4xNTQgNy42Nzg2MkMxMi40NzQgNy44NzA2MiAxMi43MjIgOC4xNDY2MiAxMi44OTggOC41MDY2MlY3LjUyMjYySDE0LjUwNlYxMy43NjI2SDEyLjkzNFYxMi43NDI2QzEyLjc1IDEzLjExODYgMTIuNDk4IDEzLjQxMDYgMTIuMTc4IDEzLjYxODZDMTEuODY2IDEzLjgxODYgMTEuNDQ2IDEzLjkxODYgMTAuOTE4IDEzLjkxODZaTTkuNDUzOTggMTAuNjU0NkM5LjQ1Mzk4IDEwLjk3NDYgOS41MjU5OCAxMS4yNzQ2IDkuNjY5OTggMTEuNTU0NkM5LjgyMTk4IDExLjgyNjYgMTAuMDI2IDEyLjA0NjYgMTAuMjgyIDEyLjIxNDZDMTAuNTQ2IDEyLjM3NDYgMTAuODQ2IDEyLjQ1NDYgMTEuMTgyIDEyLjQ1NDZDMTEuNTI2IDEyLjQ1NDYgMTEuODMgMTIuMzc0NiAxMi4wOTQgMTIuMjE0NkMxMi4zNjYgMTIuMDU0NiAxMi41NzQgMTEuODM4NiAxMi43MTggMTEuNTY2NkMxMi44NjIgMTEuMjk0NiAxMi45MzQgMTAuOTk0NiAxMi45MzQgMTAuNjY2NkMxMi45MzQgMTAuMzM4NiAxMi44NjIgMTAuMDM4NiAxMi43MTggOS43NjY2MkMxMi41NzQgOS40ODY2MiAxMi4zNjYgOS4yNjY2MiAxMi4wOTQgOS4xMDY2M0MxMS44MyA4LjkzODYzIDExLjUyNiA4Ljg1NDYzIDExLjE4MiA4Ljg1NDYzQzEwLjg0NiA4Ljg1NDYzIDEwLjU0NiA4LjkzODYzIDEwLjI4MiA5LjEwNjYzQzEwLjAxOCA5LjI2NjYyIDkuODEzOTggOS40ODI2MiA5LjY2OTk4IDkuNzU0NjJDOS41MjU5OCAxMC4wMjY2IDkuNDUzOTggMTAuMzI2NiA5LjQ1Mzk4IDEwLjY1NDZaXCIgZmlsbD1cIndoaXRlXCIvPlxuICAgICAgICAgICAgICA8cGF0aCBkPVwiTTQuNjgwNzggMTMuOTE5QzMuODY0NzggMTMuOTE5IDMuMTIwNzggMTMuNzI3IDIuNDQ4NzggMTMuMzQzQzEuNzg0NzggMTIuOTUxIDEuMjYwNzggMTIuNDIzIDAuODc2NzgxIDExLjc1OUMwLjQ5Mjc4MSAxMS4wOTUgMC4zMDA3ODEgMTAuMzY3IDAuMzAwNzgxIDkuNTc1MDNDMC4zMDA3ODEgOC43NzUwMyAwLjQ4NDc4MSA4LjA0MzAzIDAuODUyNzgxIDcuMzc5MDNDMS4yMjg3OCA2LjcwNzAzIDEuNzQ4NzggNi4xNzkwMyAyLjQxMjc4IDUuNzk1MDNDMy4wNzY3OCA1LjQwMzAzIDMuODMyNzggNS4yMDcwMyA0LjY4MDc4IDUuMjA3MDNDNS4zNjA3OCA1LjIwNzAzIDUuOTQ0NzggNS4zMTUwMyA2LjQzMjc4IDUuNTMxMDNDNi45Mjg3OCA1LjczOTAzIDcuMzY4NzggNi4wNzEwMyA3Ljc1Mjc4IDYuNTI3MDNMNi41NjQ3OCA3LjU1OTAzQzYuMDYwNzggNy4wMzEwMyA1LjQzMjc4IDYuNzY3MDMgNC42ODA3OCA2Ljc2NzAzQzQuMTUyNzggNi43NjcwMyAzLjY4ODc4IDYuODk1MDMgMy4yODg3OCA3LjE1MTAzQzIuODg4NzggNy4zOTkwMyAyLjU4MDc4IDcuNzM5MDMgMi4zNjQ3OCA4LjE3MTAzQzIuMTQ4NzggOC41OTUwMyAyLjA0MDc4IDkuMDYzMDMgMi4wNDA3OCA5LjU3NTAzQzIuMDQwNzggMTAuMDg3IDIuMTQ4NzggMTAuNTU1IDIuMzY0NzggMTAuOTc5QzIuNTg4NzggMTEuNDAzIDIuOTAwNzggMTEuNzM5IDMuMzAwNzggMTEuOTg3QzMuNzA4NzggMTIuMjM1IDQuMTgwNzggMTIuMzU5IDQuNzE2NzggMTIuMzU5QzUuNTAwNzggMTIuMzU5IDYuMTQwNzggMTIuMDg3IDYuNjM2NzggMTEuNTQzTDcuODYwNzggMTIuNTg3QzcuNTI0NzggMTIuOTk1IDcuMDg0NzggMTMuMzE5IDYuNTQwNzggMTMuNTU5QzYuMDA0NzggMTMuNzk5IDUuMzg0NzggMTMuOTE5IDQuNjgwNzggMTMuOTE5WlwiIGZpbGw9XCJ3aGl0ZVwiLz5cbiAgICAgICAgICAgIDwvc3ZnPlxuICAgICAgICAgIGA7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gQWRkIGhvdmVyIGVmZmVjdFxuICAgICAgICAgIGNhbEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWVudGVyJywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsQnV0dG9uLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICcjMzMzMzMzJztcbiAgICAgICAgICAgIGNhbEJ1dHRvbi5zdHlsZS50cmFuc2Zvcm0gPSAnc2NhbGUoMS4wNSknO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIFxuICAgICAgICAgIGNhbEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWxlYXZlJywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsQnV0dG9uLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICcjMDAwMDAwJztcbiAgICAgICAgICAgIGNhbEJ1dHRvbi5zdHlsZS50cmFuc2Zvcm0gPSAnc2NhbGUoMSknO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIEFkZCBjbGljayBoYW5kbGVyIHRvIHNob3cgQ2FsLmNvbSBtZW51XG4gICAgICAgICAgY2FsQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgbWVudXNcbiAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nTWVudSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5jYWwtY29tcGFuaW9uLWdtYWlsLW1lbnUnKTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZ01lbnUpIHtcbiAgICAgICAgICAgICAgZXhpc3RpbmdNZW51LnJlbW92ZSgpO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENyZWF0ZSBtZW51XG4gICAgICAgICAgICBjb25zdCBtZW51ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICBtZW51LmNsYXNzTmFtZSA9ICdjYWwtY29tcGFuaW9uLWdtYWlsLW1lbnUnO1xuICAgICAgICAgICAgbWVudS5zdHlsZS5jc3NUZXh0ID0gYFxuICAgICAgICAgICAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgICAgICAgICAgIGJvdHRvbTogMTAwJTtcbiAgICAgICAgICAgICAgbGVmdDogMDtcbiAgICAgICAgICAgICAgbWluLXdpZHRoOiAyNTBweDtcbiAgICAgICAgICAgICAgbWF4LXdpZHRoOiAzNTBweDtcbiAgICAgICAgICAgICAgbWF4LWhlaWdodDogMzAwcHg7XG4gICAgICAgICAgICAgIGJhY2tncm91bmQ6IHdoaXRlO1xuICAgICAgICAgICAgICBib3JkZXItcmFkaXVzOiA0cHg7XG4gICAgICAgICAgICAgIGJveC1zaGFkb3c6IDAgMXB4IDJweCAwIHJnYmEoNjAsNjQsNjcsLjMpLDAgMnB4IDZweCAycHggcmdiYSg2MCw2NCw2NywuMTUpO1xuICAgICAgICAgICAgICBmb250LWZhbWlseTogXCJHb29nbGUgU2Fuc1wiLFJvYm90byxSb2JvdG9EcmFmdCxIZWx2ZXRpY2EsQXJpYWwsc2Fucy1zZXJpZjtcbiAgICAgICAgICAgICAgZm9udC1zaXplOiAxNHB4O1xuICAgICAgICAgICAgICB6LWluZGV4OiA5OTk5O1xuICAgICAgICAgICAgICBvdmVyZmxvdy15OiBhdXRvO1xuICAgICAgICAgICAgICBtYXJnaW4tYm90dG9tOiA0cHg7XG4gICAgICAgICAgICBgO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgIG1lbnUuaW5uZXJIVE1MID0gYFxuICAgICAgICAgICAgICA8ZGl2IHN0eWxlPVwicGFkZGluZzogMTZweDsgdGV4dC1hbGlnbjogY2VudGVyOyBjb2xvcjogIzVmNjM2ODtcIj5cbiAgICAgICAgICAgICAgICBMb2FkaW5nIGV2ZW50IHR5cGVzLi4uXG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRmV0Y2ggZXZlbnQgdHlwZXMgZnJvbSBDYWwuY29tIEFQSVxuICAgICAgICAgICAgZmV0Y2hFdmVudFR5cGVzKG1lbnUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBQb3NpdGlvbiBtZW51IHJlbGF0aXZlIHRvIGJ1dHRvblxuICAgICAgICAgICAgY2FsQnV0dG9uQ2VsbC5zdHlsZS5wb3NpdGlvbiA9ICdyZWxhdGl2ZSc7XG4gICAgICAgICAgICBjYWxCdXR0b25DZWxsLmFwcGVuZENoaWxkKG1lbnUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDbG9zZSBtZW51IHdoZW4gY2xpY2tpbmcgb3V0c2lkZVxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gY2xvc2VNZW51KGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW1lbnUuY29udGFpbnMoZS50YXJnZXQpKSB7XG4gICAgICAgICAgICAgICAgICBtZW51LnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjbG9zZU1lbnUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCAwKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBcbiAgICAgICAgICBmdW5jdGlvbiBvcGVuQ2FsU2lkZWJhcigpIHtcbiAgICAgICAgICAgIC8vIE9wZW4gQ2FsLmNvbSBzaWRlYmFyIG9yIHF1aWNrIHNjaGVkdWxlIGZsb3dcbiAgICAgICAgICAgIGlmIChpc0Nsb3NlZCkge1xuICAgICAgICAgICAgICAvLyBUcmlnZ2VyIHNpZGViYXIgb3BlblxuICAgICAgICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7YWN0aW9uOiAnaWNvbi1jbGlja2VkJ30pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gVG9nZ2xlIHNpZGViYXIgdmlzaWJpbGl0eVxuICAgICAgICAgICAgICBpc1Zpc2libGUgPSAhaXNWaXNpYmxlO1xuICAgICAgICAgICAgICBpZiAoaXNWaXNpYmxlKSB7XG4gICAgICAgICAgICAgICAgc2lkZWJhckNvbnRhaW5lci5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlWCgwKSc7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2lkZWJhckNvbnRhaW5lci5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlWCgxMDAlKSc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgYXN5bmMgZnVuY3Rpb24gZmV0Y2hFdmVudFR5cGVzKG1lbnUpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIC8vIENoZWNrIGlmIGV4dGVuc2lvbiBjb250ZXh0IGlzIHZhbGlkXG4gICAgICAgICAgICAgIGlmICghY2hyb21lLnJ1bnRpbWU/LmlkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdFeHRlbnNpb24gY29udGV4dCBpbnZhbGlkYXRlZC4gUGxlYXNlIHJlbG9hZCB0aGUgcGFnZS4nKTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIFVzZSBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSB0byBtYWtlIEFQSSBjYWxsIHRocm91Z2ggYmFja2dyb3VuZCBzY3JpcHRcbiAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKFxuICAgICAgICAgICAgICAgICAgICB7IGFjdGlvbjogJ2ZldGNoLWV2ZW50LXR5cGVzJyB9LFxuICAgICAgICAgICAgICAgICAgICAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnUmF3IHJlc3BvbnNlIGZyb20gYmFja2dyb3VuZDonLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0Nocm9tZSBydW50aW1lIGVycm9yOicsIGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlKSk7XG4gICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1Jlc3BvbnNlIGhhcyBlcnJvcjonLCByZXNwb25zZS5lcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKHJlc3BvbnNlLmVycm9yKSk7XG4gICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdSZXNvbHZpbmcgd2l0aCByZXNwb25zZTonLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBzZW5kaW5nIG1lc3NhZ2U6JywgZXJyKTtcbiAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRmluYWwgcmVzcG9uc2UgZnJvbSBiYWNrZ3JvdW5kIHNjcmlwdDonLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICBsZXQgZXZlbnRUeXBlcyA9IFtdO1xuICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGV2ZW50VHlwZXMgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocmVzcG9uc2UpKSB7XG4gICAgICAgICAgICAgICAgZXZlbnRUeXBlcyA9IHJlc3BvbnNlO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdVbmV4cGVjdGVkIHJlc3BvbnNlIGZvcm1hdDonLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgZXZlbnRUeXBlcyA9IFtdO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAvLyBFbnN1cmUgZXZlbnRUeXBlcyBpcyBhbiBhcnJheVxuICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZXZlbnRUeXBlcykpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRXZlbnRUeXBlcyBpcyBub3QgYW4gYXJyYXk6JywgdHlwZW9mIGV2ZW50VHlwZXMsIGV2ZW50VHlwZXMpO1xuICAgICAgICAgICAgICAgIGV2ZW50VHlwZXMgPSBbXTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0ZpbmFsIGV2ZW50VHlwZXMgYXJyYXk6JywgZXZlbnRUeXBlcywgJ0xlbmd0aDonLCBldmVudFR5cGVzLmxlbmd0aCk7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAvLyBDbGVhciBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICAgIG1lbnUuaW5uZXJIVE1MID0gJyc7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICBpZiAoZXZlbnRUeXBlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBtZW51LmlubmVySFRNTCA9IGBcbiAgICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9XCJwYWRkaW5nOiAxNnB4OyB0ZXh0LWFsaWduOiBjZW50ZXI7IGNvbG9yOiAjNWY2MzY4O1wiPlxuICAgICAgICAgICAgICAgICAgICBObyBldmVudCB0eXBlcyBmb3VuZFxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8vIEFkZCBoZWFkZXJcbiAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICAgIGhlYWRlci5zdHlsZS5jc3NUZXh0ID0gYFxuICAgICAgICAgICAgICAgIHBhZGRpbmc6IDEycHggMTZweDtcbiAgICAgICAgICAgICAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2U4ZWFlZDtcbiAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjZjhmOWZhO1xuICAgICAgICAgICAgICAgIGZvbnQtd2VpZ2h0OiA1MDA7XG4gICAgICAgICAgICAgICAgY29sb3I6ICMzYzQwNDM7XG4gICAgICAgICAgICAgICAgZm9udC1zaXplOiAxM3B4O1xuICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICBoZWFkZXIudGV4dENvbnRlbnQgPSAnU2VsZWN0IGFuIGV2ZW50IHR5cGUgdG8gc2hhcmUnO1xuICAgICAgICAgICAgICBtZW51LmFwcGVuZENoaWxkKGhlYWRlcik7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAvLyBBZGQgZXZlbnQgdHlwZXMgLSB3aXRoIGFkZGl0aW9uYWwgc2FmZXR5IGNoZWNrc1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGV2ZW50VHlwZXMuZm9yRWFjaCgoZXZlbnRUeXBlLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgICAgLy8gVmFsaWRhdGUgZXZlbnRUeXBlIG9iamVjdFxuICAgICAgICAgICAgICAgICAgaWYgKCFldmVudFR5cGUgfHwgdHlwZW9mIGV2ZW50VHlwZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdJbnZhbGlkIGV2ZW50IHR5cGUgb2JqZWN0OicsIGV2ZW50VHlwZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgY29uc3QgdGl0bGUgPSBldmVudFR5cGUudGl0bGUgfHwgJ1VudGl0bGVkIEV2ZW50JztcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGxlbmd0aCA9IGV2ZW50VHlwZS5sZW5ndGggfHwgZXZlbnRUeXBlLmR1cmF0aW9uIHx8IDMwO1xuICAgICAgICAgICAgICAgICAgY29uc3QgZGVzY3JpcHRpb24gPSBldmVudFR5cGUuZGVzY3JpcHRpb24gfHwgJ05vIGRlc2NyaXB0aW9uJztcbiAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgY29uc3QgbWVudUl0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICAgIG1lbnVJdGVtLnN0eWxlLmNzc1RleHQgPSBgXG4gICAgICAgICAgICAgICAgICAgIHBhZGRpbmc6IDEycHggMTZweDtcbiAgICAgICAgICAgICAgICAgICAgZGlzcGxheTogZmxleDtcbiAgICAgICAgICAgICAgICAgICAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAgICAgICAgICAgICAgICAgICAgY3Vyc29yOiBwb2ludGVyO1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2l0aW9uOiBiYWNrZ3JvdW5kLWNvbG9yIDAuMXMgZWFzZTtcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyLWJvdHRvbTogJHtpbmRleCA8IGV2ZW50VHlwZXMubGVuZ3RoIC0gMSA/ICcxcHggc29saWQgI2U4ZWFlZCcgOiAnbm9uZSd9O1xuICAgICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgbWVudUl0ZW0uaW5uZXJIVE1MID0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IHN0eWxlPVwiZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjsgbWFyZ2luLWJvdHRvbTogNHB4O1wiPlxuICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIHN0eWxlPVwibWFyZ2luLXJpZ2h0OiA4cHg7IGZvbnQtc2l6ZTogMTRweDtcIj7wn5OFPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIHN0eWxlPVwiY29sb3I6ICMzYzQwNDM7IGZvbnQtd2VpZ2h0OiA1MDA7XCI+JHt0aXRsZX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IHN0eWxlPVwiY29sb3I6ICM1ZjYzNjg7IGZvbnQtc2l6ZTogMTJweDsgbWFyZ2luLWxlZnQ6IDIycHg7XCI+XG4gICAgICAgICAgICAgICAgICAgICAgJHtsZW5ndGh9bWluIOKAoiAke2Rlc2NyaXB0aW9ufVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgIC8vIEhvdmVyIGVmZmVjdFxuICAgICAgICAgICAgICAgICAgbWVudUl0ZW0uYWRkRXZlbnRMaXN0ZW5lcignbW91c2VlbnRlcicsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbWVudUl0ZW0uc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJyNmOGY5ZmEnO1xuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgIG1lbnVJdGVtLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbGVhdmUnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIG1lbnVJdGVtLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICd0cmFuc3BhcmVudCc7XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgbWVudUl0ZW0uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICBtZW51LnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAvLyBDb3B5IHNjaGVkdWxpbmcgbGluayB0byBjbGlwYm9hcmQgYW5kIHNob3cgY29uZmlybWF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGNvcHlFdmVudFR5cGVMaW5rKGV2ZW50VHlwZSk7XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgbWVudS5hcHBlbmRDaGlsZChtZW51SXRlbSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGZvckVhY2hFcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluIGZvckVhY2ggbG9vcDonLCBmb3JFYWNoRXJyb3IpO1xuICAgICAgICAgICAgICAgIG1lbnUuaW5uZXJIVE1MID0gYFxuICAgICAgICAgICAgICAgICAgPGRpdiBzdHlsZT1cInBhZGRpbmc6IDE2cHg7IHRleHQtYWxpZ246IGNlbnRlcjsgY29sb3I6ICNlYTQzMzU7XCI+XG4gICAgICAgICAgICAgICAgICAgIEVycm9yIGRpc3BsYXlpbmcgZXZlbnQgdHlwZXNcbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gZmV0Y2ggZXZlbnQgdHlwZXM6JywgZXJyb3IpO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgZGV0YWlsczonLCBlcnJvci5tZXNzYWdlLCBlcnJvci5zdGFjayk7XG4gICAgICAgICAgICAgIG1lbnUuaW5uZXJIVE1MID0gYFxuICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9XCJwYWRkaW5nOiAxNnB4OyB0ZXh0LWFsaWduOiBjZW50ZXI7IGNvbG9yOiAjZWE0MzM1O1wiPlxuICAgICAgICAgICAgICAgICAgRmFpbGVkIHRvIGxvYWQgZXZlbnQgdHlwZXNcbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IHN0eWxlPVwicGFkZGluZzogMCAxNnB4OyB0ZXh0LWFsaWduOiBjZW50ZXI7IGNvbG9yOiAjNWY2MzY4OyBmb250LXNpemU6IDEycHg7XCI+XG4gICAgICAgICAgICAgICAgICBFcnJvcjogJHtlcnJvci5tZXNzYWdlfVxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9XCJwYWRkaW5nOiAxNnB4IDE2cHg7IHRleHQtYWxpZ246IGNlbnRlcjtcIj5cbiAgICAgICAgICAgICAgICAgIDxidXR0b24gb25jbGljaz1cInRoaXMucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnJlbW92ZSgpXCIgc3R5bGU9XCJcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogIzFhNzNlODtcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IHdoaXRlO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXI6IG5vbmU7XG4gICAgICAgICAgICAgICAgICAgIHBhZGRpbmc6IDhweCAxNnB4O1xuICAgICAgICAgICAgICAgICAgICBib3JkZXItcmFkaXVzOiA0cHg7XG4gICAgICAgICAgICAgICAgICAgIGZvbnQtc2l6ZTogMTRweDtcbiAgICAgICAgICAgICAgICAgICAgY3Vyc29yOiBwb2ludGVyO1xuICAgICAgICAgICAgICAgICAgXCI+Q2xvc2U8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgZnVuY3Rpb24gY29weUV2ZW50VHlwZUxpbmsoZXZlbnRUeXBlKSB7XG4gICAgICAgICAgICAvLyBDb25zdHJ1Y3QgdGhlIENhbC5jb20gYm9va2luZyBsaW5rXG4gICAgICAgICAgICBjb25zdCBib29raW5nVXJsID0gYGh0dHBzOi8vY2FsLmNvbS8ke2V2ZW50VHlwZS51c2Vycz8uWzBdPy51c2VybmFtZSB8fCAndXNlcid9LyR7ZXZlbnRUeXBlLnNsdWd9YDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ29weSB0byBjbGlwYm9hcmRcbiAgICAgICAgICAgIG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGJvb2tpbmdVcmwpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAvLyBTaG93IHN1Y2Nlc3Mgbm90aWZpY2F0aW9uXG4gICAgICAgICAgICAgIHNob3dOb3RpZmljYXRpb24oJ0xpbmsgY29waWVkIHRvIGNsaXBib2FyZCEnLCAnc3VjY2VzcycpO1xuICAgICAgICAgICAgfSkuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGNvcHkgbGluazonLCBlcnIpO1xuICAgICAgICAgICAgICBzaG93Tm90aWZpY2F0aW9uKCdGYWlsZWQgdG8gY29weSBsaW5rJywgJ2Vycm9yJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgZnVuY3Rpb24gc2hvd05vdGlmaWNhdGlvbihtZXNzYWdlLCB0eXBlKSB7XG4gICAgICAgICAgICBjb25zdCBub3RpZmljYXRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIG5vdGlmaWNhdGlvbi5zdHlsZS5jc3NUZXh0ID0gYFxuICAgICAgICAgICAgICBwb3NpdGlvbjogZml4ZWQ7XG4gICAgICAgICAgICAgIHRvcDogMjBweDtcbiAgICAgICAgICAgICAgcmlnaHQ6IDIwcHg7XG4gICAgICAgICAgICAgIHBhZGRpbmc6IDEycHggMTZweDtcbiAgICAgICAgICAgICAgYmFja2dyb3VuZDogJHt0eXBlID09PSAnc3VjY2VzcycgPyAnIzEzNzMzMycgOiAnI2Q5MzAyNSd9O1xuICAgICAgICAgICAgICBjb2xvcjogd2hpdGU7XG4gICAgICAgICAgICAgIGJvcmRlci1yYWRpdXM6IDRweDtcbiAgICAgICAgICAgICAgZm9udC1mYW1pbHk6IFwiR29vZ2xlIFNhbnNcIixSb2JvdG8sUm9ib3RvRHJhZnQsSGVsdmV0aWNhLEFyaWFsLHNhbnMtc2VyaWY7XG4gICAgICAgICAgICAgIGZvbnQtc2l6ZTogMTRweDtcbiAgICAgICAgICAgICAgei1pbmRleDogMTAwMDA7XG4gICAgICAgICAgICAgIGJveC1zaGFkb3c6IDAgMnB4IDhweCByZ2JhKDAsMCwwLDAuMik7XG4gICAgICAgICAgICBgO1xuICAgICAgICAgICAgbm90aWZpY2F0aW9uLnRleHRDb250ZW50ID0gbWVzc2FnZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChub3RpZmljYXRpb24pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgYWZ0ZXIgMyBzZWNvbmRzXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgbm90aWZpY2F0aW9uLnJlbW92ZSgpO1xuICAgICAgICAgICAgfSwgMzAwMCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIC8vIEFkZCB0b29sdGlwXG4gICAgICAgICAgY2FsQnV0dG9uLnRpdGxlID0gJ1NjaGVkdWxlIHdpdGggQ2FsLmNvbSc7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gQWRkIGJ1dHRvbiB0byBjZWxsXG4gICAgICAgICAgY2FsQnV0dG9uQ2VsbC5hcHBlbmRDaGlsZChjYWxCdXR0b24pO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIEluc2VydCB0aGUgbmV3IGNlbGwgYWZ0ZXIgdGhlIHNlbmQgYnV0dG9uIGNlbGxcbiAgICAgICAgICBpZiAoc2VuZEJ1dHRvbkNlbGwubmV4dFNpYmxpbmcpIHtcbiAgICAgICAgICAgIHRhYmxlUm93Lmluc2VydEJlZm9yZShjYWxCdXR0b25DZWxsLCBzZW5kQnV0dG9uQ2VsbC5uZXh0U2libGluZyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRhYmxlUm93LmFwcGVuZENoaWxkKGNhbEJ1dHRvbkNlbGwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIEluaXRpYWwgaW5qZWN0aW9uXG4gICAgICBzZXRUaW1lb3V0KGluamVjdENhbEJ1dHRvbiwgMTAwMCk7XG4gICAgICBcbiAgICAgIC8vIFdhdGNoIGZvciBET00gY2hhbmdlcyAoR21haWwgaXMgYSBTUEEpXG4gICAgICBjb25zdCBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKCgpID0+IHtcbiAgICAgICAgaW5qZWN0Q2FsQnV0dG9uKCk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgb2JzZXJ2ZXIub2JzZXJ2ZShkb2N1bWVudC5ib2R5LCB7XG4gICAgICAgIGNoaWxkTGlzdDogdHJ1ZSxcbiAgICAgICAgc3VidHJlZTogdHJ1ZVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIEFsc28gaW5qZWN0IG9uIFVSTCBjaGFuZ2VzIChHbWFpbCBuYXZpZ2F0aW9uKVxuICAgICAgbGV0IGN1cnJlbnRVcmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZjtcbiAgICAgIHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5ocmVmICE9PSBjdXJyZW50VXJsKSB7XG4gICAgICAgICAgY3VycmVudFVybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmO1xuICAgICAgICAgIHNldFRpbWVvdXQoaW5qZWN0Q2FsQnV0dG9uLCA1MDApO1xuICAgICAgICB9XG4gICAgICB9LCAxMDAwKTtcbiAgICB9XG4gIH0sXG59KTtcblxuZnVuY3Rpb24gZGVmaW5lQ29udGVudFNjcmlwdChjb25maWc6IHsgbWF0Y2hlczogc3RyaW5nW10sIG1haW46ICgpID0+IHZvaWQgfSkge1xuICByZXR1cm4gY29uZmlnO1xufSIsIi8vICNyZWdpb24gc25pcHBldFxuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBnbG9iYWxUaGlzLmJyb3dzZXI/LnJ1bnRpbWU/LmlkXG4gID8gZ2xvYmFsVGhpcy5icm93c2VyXG4gIDogZ2xvYmFsVGhpcy5jaHJvbWU7XG4vLyAjZW5kcmVnaW9uIHNuaXBwZXRcbiIsImltcG9ydCB7IGJyb3dzZXIgYXMgX2Jyb3dzZXIgfSBmcm9tIFwiQHd4dC1kZXYvYnJvd3NlclwiO1xuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBfYnJvd3NlcjtcbmV4cG9ydCB7fTtcbiIsImZ1bmN0aW9uIHByaW50KG1ldGhvZCwgLi4uYXJncykge1xuICBpZiAoaW1wb3J0Lm1ldGEuZW52Lk1PREUgPT09IFwicHJvZHVjdGlvblwiKSByZXR1cm47XG4gIGlmICh0eXBlb2YgYXJnc1swXSA9PT0gXCJzdHJpbmdcIikge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBhcmdzLnNoaWZ0KCk7XG4gICAgbWV0aG9kKGBbd3h0XSAke21lc3NhZ2V9YCwgLi4uYXJncyk7XG4gIH0gZWxzZSB7XG4gICAgbWV0aG9kKFwiW3d4dF1cIiwgLi4uYXJncyk7XG4gIH1cbn1cbmV4cG9ydCBjb25zdCBsb2dnZXIgPSB7XG4gIGRlYnVnOiAoLi4uYXJncykgPT4gcHJpbnQoY29uc29sZS5kZWJ1ZywgLi4uYXJncyksXG4gIGxvZzogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUubG9nLCAuLi5hcmdzKSxcbiAgd2FybjogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUud2FybiwgLi4uYXJncyksXG4gIGVycm9yOiAoLi4uYXJncykgPT4gcHJpbnQoY29uc29sZS5lcnJvciwgLi4uYXJncylcbn07XG4iLCJpbXBvcnQgeyBicm93c2VyIH0gZnJvbSBcInd4dC9icm93c2VyXCI7XG5leHBvcnQgY2xhc3MgV3h0TG9jYXRpb25DaGFuZ2VFdmVudCBleHRlbmRzIEV2ZW50IHtcbiAgY29uc3RydWN0b3IobmV3VXJsLCBvbGRVcmwpIHtcbiAgICBzdXBlcihXeHRMb2NhdGlvbkNoYW5nZUV2ZW50LkVWRU5UX05BTUUsIHt9KTtcbiAgICB0aGlzLm5ld1VybCA9IG5ld1VybDtcbiAgICB0aGlzLm9sZFVybCA9IG9sZFVybDtcbiAgfVxuICBzdGF0aWMgRVZFTlRfTkFNRSA9IGdldFVuaXF1ZUV2ZW50TmFtZShcInd4dDpsb2NhdGlvbmNoYW5nZVwiKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBnZXRVbmlxdWVFdmVudE5hbWUoZXZlbnROYW1lKSB7XG4gIHJldHVybiBgJHticm93c2VyPy5ydW50aW1lPy5pZH06JHtpbXBvcnQubWV0YS5lbnYuRU5UUllQT0lOVH06JHtldmVudE5hbWV9YDtcbn1cbiIsImltcG9ydCB7IFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQgfSBmcm9tIFwiLi9jdXN0b20tZXZlbnRzLm1qc1wiO1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUxvY2F0aW9uV2F0Y2hlcihjdHgpIHtcbiAgbGV0IGludGVydmFsO1xuICBsZXQgb2xkVXJsO1xuICByZXR1cm4ge1xuICAgIC8qKlxuICAgICAqIEVuc3VyZSB0aGUgbG9jYXRpb24gd2F0Y2hlciBpcyBhY3RpdmVseSBsb29raW5nIGZvciBVUkwgY2hhbmdlcy4gSWYgaXQncyBhbHJlYWR5IHdhdGNoaW5nLFxuICAgICAqIHRoaXMgaXMgYSBub29wLlxuICAgICAqL1xuICAgIHJ1bigpIHtcbiAgICAgIGlmIChpbnRlcnZhbCAhPSBudWxsKSByZXR1cm47XG4gICAgICBvbGRVcmwgPSBuZXcgVVJMKGxvY2F0aW9uLmhyZWYpO1xuICAgICAgaW50ZXJ2YWwgPSBjdHguc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICBsZXQgbmV3VXJsID0gbmV3IFVSTChsb2NhdGlvbi5ocmVmKTtcbiAgICAgICAgaWYgKG5ld1VybC5ocmVmICE9PSBvbGRVcmwuaHJlZikge1xuICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBXeHRMb2NhdGlvbkNoYW5nZUV2ZW50KG5ld1VybCwgb2xkVXJsKSk7XG4gICAgICAgICAgb2xkVXJsID0gbmV3VXJsO1xuICAgICAgICB9XG4gICAgICB9LCAxZTMpO1xuICAgIH1cbiAgfTtcbn1cbiIsImltcG9ydCB7IGJyb3dzZXIgfSBmcm9tIFwid3h0L2Jyb3dzZXJcIjtcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gXCIuLi91dGlscy9pbnRlcm5hbC9sb2dnZXIubWpzXCI7XG5pbXBvcnQge1xuICBnZXRVbmlxdWVFdmVudE5hbWVcbn0gZnJvbSBcIi4vaW50ZXJuYWwvY3VzdG9tLWV2ZW50cy5tanNcIjtcbmltcG9ydCB7IGNyZWF0ZUxvY2F0aW9uV2F0Y2hlciB9IGZyb20gXCIuL2ludGVybmFsL2xvY2F0aW9uLXdhdGNoZXIubWpzXCI7XG5leHBvcnQgY2xhc3MgQ29udGVudFNjcmlwdENvbnRleHQge1xuICBjb25zdHJ1Y3Rvcihjb250ZW50U2NyaXB0TmFtZSwgb3B0aW9ucykge1xuICAgIHRoaXMuY29udGVudFNjcmlwdE5hbWUgPSBjb250ZW50U2NyaXB0TmFtZTtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMuYWJvcnRDb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICAgIGlmICh0aGlzLmlzVG9wRnJhbWUpIHtcbiAgICAgIHRoaXMubGlzdGVuRm9yTmV3ZXJTY3JpcHRzKHsgaWdub3JlRmlyc3RFdmVudDogdHJ1ZSB9KTtcbiAgICAgIHRoaXMuc3RvcE9sZFNjcmlwdHMoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5saXN0ZW5Gb3JOZXdlclNjcmlwdHMoKTtcbiAgICB9XG4gIH1cbiAgc3RhdGljIFNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRSA9IGdldFVuaXF1ZUV2ZW50TmFtZShcbiAgICBcInd4dDpjb250ZW50LXNjcmlwdC1zdGFydGVkXCJcbiAgKTtcbiAgaXNUb3BGcmFtZSA9IHdpbmRvdy5zZWxmID09PSB3aW5kb3cudG9wO1xuICBhYm9ydENvbnRyb2xsZXI7XG4gIGxvY2F0aW9uV2F0Y2hlciA9IGNyZWF0ZUxvY2F0aW9uV2F0Y2hlcih0aGlzKTtcbiAgcmVjZWl2ZWRNZXNzYWdlSWRzID0gLyogQF9fUFVSRV9fICovIG5ldyBTZXQoKTtcbiAgZ2V0IHNpZ25hbCgpIHtcbiAgICByZXR1cm4gdGhpcy5hYm9ydENvbnRyb2xsZXIuc2lnbmFsO1xuICB9XG4gIGFib3J0KHJlYXNvbikge1xuICAgIHJldHVybiB0aGlzLmFib3J0Q29udHJvbGxlci5hYm9ydChyZWFzb24pO1xuICB9XG4gIGdldCBpc0ludmFsaWQoKSB7XG4gICAgaWYgKGJyb3dzZXIucnVudGltZS5pZCA9PSBudWxsKSB7XG4gICAgICB0aGlzLm5vdGlmeUludmFsaWRhdGVkKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnNpZ25hbC5hYm9ydGVkO1xuICB9XG4gIGdldCBpc1ZhbGlkKCkge1xuICAgIHJldHVybiAhdGhpcy5pc0ludmFsaWQ7XG4gIH1cbiAgLyoqXG4gICAqIEFkZCBhIGxpc3RlbmVyIHRoYXQgaXMgY2FsbGVkIHdoZW4gdGhlIGNvbnRlbnQgc2NyaXB0J3MgY29udGV4dCBpcyBpbnZhbGlkYXRlZC5cbiAgICpcbiAgICogQHJldHVybnMgQSBmdW5jdGlvbiB0byByZW1vdmUgdGhlIGxpc3RlbmVyLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBicm93c2VyLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKGNiKTtcbiAgICogY29uc3QgcmVtb3ZlSW52YWxpZGF0ZWRMaXN0ZW5lciA9IGN0eC5vbkludmFsaWRhdGVkKCgpID0+IHtcbiAgICogICBicm93c2VyLnJ1bnRpbWUub25NZXNzYWdlLnJlbW92ZUxpc3RlbmVyKGNiKTtcbiAgICogfSlcbiAgICogLy8gLi4uXG4gICAqIHJlbW92ZUludmFsaWRhdGVkTGlzdGVuZXIoKTtcbiAgICovXG4gIG9uSW52YWxpZGF0ZWQoY2IpIHtcbiAgICB0aGlzLnNpZ25hbC5hZGRFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgY2IpO1xuICAgIHJldHVybiAoKSA9PiB0aGlzLnNpZ25hbC5yZW1vdmVFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgY2IpO1xuICB9XG4gIC8qKlxuICAgKiBSZXR1cm4gYSBwcm9taXNlIHRoYXQgbmV2ZXIgcmVzb2x2ZXMuIFVzZWZ1bCBpZiB5b3UgaGF2ZSBhbiBhc3luYyBmdW5jdGlvbiB0aGF0IHNob3VsZG4ndCBydW5cbiAgICogYWZ0ZXIgdGhlIGNvbnRleHQgaXMgZXhwaXJlZC5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogY29uc3QgZ2V0VmFsdWVGcm9tU3RvcmFnZSA9IGFzeW5jICgpID0+IHtcbiAgICogICBpZiAoY3R4LmlzSW52YWxpZCkgcmV0dXJuIGN0eC5ibG9jaygpO1xuICAgKlxuICAgKiAgIC8vIC4uLlxuICAgKiB9XG4gICAqL1xuICBibG9jaygpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKCkgPT4ge1xuICAgIH0pO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnNldEludGVydmFsYCB0aGF0IGF1dG9tYXRpY2FsbHkgY2xlYXJzIHRoZSBpbnRlcnZhbCB3aGVuIGludmFsaWRhdGVkLlxuICAgKlxuICAgKiBJbnRlcnZhbHMgY2FuIGJlIGNsZWFyZWQgYnkgY2FsbGluZyB0aGUgbm9ybWFsIGBjbGVhckludGVydmFsYCBmdW5jdGlvbi5cbiAgICovXG4gIHNldEludGVydmFsKGhhbmRsZXIsIHRpbWVvdXQpIHtcbiAgICBjb25zdCBpZCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWQpIGhhbmRsZXIoKTtcbiAgICB9LCB0aW1lb3V0KTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2xlYXJJbnRlcnZhbChpZCkpO1xuICAgIHJldHVybiBpZDtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5zZXRUaW1lb3V0YCB0aGF0IGF1dG9tYXRpY2FsbHkgY2xlYXJzIHRoZSBpbnRlcnZhbCB3aGVuIGludmFsaWRhdGVkLlxuICAgKlxuICAgKiBUaW1lb3V0cyBjYW4gYmUgY2xlYXJlZCBieSBjYWxsaW5nIHRoZSBub3JtYWwgYHNldFRpbWVvdXRgIGZ1bmN0aW9uLlxuICAgKi9cbiAgc2V0VGltZW91dChoYW5kbGVyLCB0aW1lb3V0KSB7XG4gICAgY29uc3QgaWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWQpIGhhbmRsZXIoKTtcbiAgICB9LCB0aW1lb3V0KTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2xlYXJUaW1lb3V0KGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZWAgdGhhdCBhdXRvbWF0aWNhbGx5IGNhbmNlbHMgdGhlIHJlcXVlc3Qgd2hlblxuICAgKiBpbnZhbGlkYXRlZC5cbiAgICpcbiAgICogQ2FsbGJhY2tzIGNhbiBiZSBjYW5jZWxlZCBieSBjYWxsaW5nIHRoZSBub3JtYWwgYGNhbmNlbEFuaW1hdGlvbkZyYW1lYCBmdW5jdGlvbi5cbiAgICovXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZShjYWxsYmFjaykge1xuICAgIGNvbnN0IGlkID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCguLi5hcmdzKSA9PiB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkKSBjYWxsYmFjayguLi5hcmdzKTtcbiAgICB9KTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2FuY2VsQW5pbWF0aW9uRnJhbWUoaWQpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cucmVxdWVzdElkbGVDYWxsYmFja2AgdGhhdCBhdXRvbWF0aWNhbGx5IGNhbmNlbHMgdGhlIHJlcXVlc3Qgd2hlblxuICAgKiBpbnZhbGlkYXRlZC5cbiAgICpcbiAgICogQ2FsbGJhY2tzIGNhbiBiZSBjYW5jZWxlZCBieSBjYWxsaW5nIHRoZSBub3JtYWwgYGNhbmNlbElkbGVDYWxsYmFja2AgZnVuY3Rpb24uXG4gICAqL1xuICByZXF1ZXN0SWRsZUNhbGxiYWNrKGNhbGxiYWNrLCBvcHRpb25zKSB7XG4gICAgY29uc3QgaWQgPSByZXF1ZXN0SWRsZUNhbGxiYWNrKCguLi5hcmdzKSA9PiB7XG4gICAgICBpZiAoIXRoaXMuc2lnbmFsLmFib3J0ZWQpIGNhbGxiYWNrKC4uLmFyZ3MpO1xuICAgIH0sIG9wdGlvbnMpO1xuICAgIHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiBjYW5jZWxJZGxlQ2FsbGJhY2soaWQpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgYWRkRXZlbnRMaXN0ZW5lcih0YXJnZXQsIHR5cGUsIGhhbmRsZXIsIG9wdGlvbnMpIHtcbiAgICBpZiAodHlwZSA9PT0gXCJ3eHQ6bG9jYXRpb25jaGFuZ2VcIikge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgdGhpcy5sb2NhdGlvbldhdGNoZXIucnVuKCk7XG4gICAgfVxuICAgIHRhcmdldC5hZGRFdmVudExpc3RlbmVyPy4oXG4gICAgICB0eXBlLnN0YXJ0c1dpdGgoXCJ3eHQ6XCIpID8gZ2V0VW5pcXVlRXZlbnROYW1lKHR5cGUpIDogdHlwZSxcbiAgICAgIGhhbmRsZXIsXG4gICAgICB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIHNpZ25hbDogdGhpcy5zaWduYWxcbiAgICAgIH1cbiAgICApO1xuICB9XG4gIC8qKlxuICAgKiBAaW50ZXJuYWxcbiAgICogQWJvcnQgdGhlIGFib3J0IGNvbnRyb2xsZXIgYW5kIGV4ZWN1dGUgYWxsIGBvbkludmFsaWRhdGVkYCBsaXN0ZW5lcnMuXG4gICAqL1xuICBub3RpZnlJbnZhbGlkYXRlZCgpIHtcbiAgICB0aGlzLmFib3J0KFwiQ29udGVudCBzY3JpcHQgY29udGV4dCBpbnZhbGlkYXRlZFwiKTtcbiAgICBsb2dnZXIuZGVidWcoXG4gICAgICBgQ29udGVudCBzY3JpcHQgXCIke3RoaXMuY29udGVudFNjcmlwdE5hbWV9XCIgY29udGV4dCBpbnZhbGlkYXRlZGBcbiAgICApO1xuICB9XG4gIHN0b3BPbGRTY3JpcHRzKCkge1xuICAgIHdpbmRvdy5wb3N0TWVzc2FnZShcbiAgICAgIHtcbiAgICAgICAgdHlwZTogQ29udGVudFNjcmlwdENvbnRleHQuU0NSSVBUX1NUQVJURURfTUVTU0FHRV9UWVBFLFxuICAgICAgICBjb250ZW50U2NyaXB0TmFtZTogdGhpcy5jb250ZW50U2NyaXB0TmFtZSxcbiAgICAgICAgbWVzc2FnZUlkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyKVxuICAgICAgfSxcbiAgICAgIFwiKlwiXG4gICAgKTtcbiAgfVxuICB2ZXJpZnlTY3JpcHRTdGFydGVkRXZlbnQoZXZlbnQpIHtcbiAgICBjb25zdCBpc1NjcmlwdFN0YXJ0ZWRFdmVudCA9IGV2ZW50LmRhdGE/LnR5cGUgPT09IENvbnRlbnRTY3JpcHRDb250ZXh0LlNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRTtcbiAgICBjb25zdCBpc1NhbWVDb250ZW50U2NyaXB0ID0gZXZlbnQuZGF0YT8uY29udGVudFNjcmlwdE5hbWUgPT09IHRoaXMuY29udGVudFNjcmlwdE5hbWU7XG4gICAgY29uc3QgaXNOb3REdXBsaWNhdGUgPSAhdGhpcy5yZWNlaXZlZE1lc3NhZ2VJZHMuaGFzKGV2ZW50LmRhdGE/Lm1lc3NhZ2VJZCk7XG4gICAgcmV0dXJuIGlzU2NyaXB0U3RhcnRlZEV2ZW50ICYmIGlzU2FtZUNvbnRlbnRTY3JpcHQgJiYgaXNOb3REdXBsaWNhdGU7XG4gIH1cbiAgbGlzdGVuRm9yTmV3ZXJTY3JpcHRzKG9wdGlvbnMpIHtcbiAgICBsZXQgaXNGaXJzdCA9IHRydWU7XG4gICAgY29uc3QgY2IgPSAoZXZlbnQpID0+IHtcbiAgICAgIGlmICh0aGlzLnZlcmlmeVNjcmlwdFN0YXJ0ZWRFdmVudChldmVudCkpIHtcbiAgICAgICAgdGhpcy5yZWNlaXZlZE1lc3NhZ2VJZHMuYWRkKGV2ZW50LmRhdGEubWVzc2FnZUlkKTtcbiAgICAgICAgY29uc3Qgd2FzRmlyc3QgPSBpc0ZpcnN0O1xuICAgICAgICBpc0ZpcnN0ID0gZmFsc2U7XG4gICAgICAgIGlmICh3YXNGaXJzdCAmJiBvcHRpb25zPy5pZ25vcmVGaXJzdEV2ZW50KSByZXR1cm47XG4gICAgICAgIHRoaXMubm90aWZ5SW52YWxpZGF0ZWQoKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGNiKTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gcmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgY2IpKTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbIl9hIiwiZSIsInJlc3BvbnNlIiwiX2IiLCJicm93c2VyIiwiX2Jyb3dzZXIiLCJwcmludCIsImxvZ2dlciJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsUUFBQSxhQUFlLG9CQUFvQjtBQUFBLElBQ2pDLFNBQVMsQ0FBQyxZQUFZO0FBQUEsSUFDdEIsT0FBTztBQUNMLFlBQU0sa0JBQWtCLFNBQVMsZUFBZSx1QkFBdUI7QUFDdkUsVUFBSSxpQkFBaUI7QUFDbkI7QUFBQSxNQUNGO0FBR0EsVUFBSSxPQUFPLFNBQVMsYUFBYSxtQkFBbUI7QUFDbEQsNkJBQUE7QUFBQSxNQUNGO0FBRUEsVUFBSSxZQUFZO0FBQ2hCLFVBQUksV0FBVztBQUdmLFlBQU0sbUJBQW1CLFNBQVMsY0FBYyxLQUFLO0FBQ3JELHVCQUFpQixLQUFLO0FBQ3RCLHVCQUFpQixNQUFNLFdBQVc7QUFDbEMsdUJBQWlCLE1BQU0sTUFBTTtBQUM3Qix1QkFBaUIsTUFBTSxRQUFRO0FBQy9CLHVCQUFpQixNQUFNLFFBQVE7QUFDL0IsdUJBQWlCLE1BQU0sU0FBUztBQUNoQyx1QkFBaUIsTUFBTSxTQUFTO0FBQ2hDLHVCQUFpQixNQUFNLGtCQUFrQjtBQUN6Qyx1QkFBaUIsTUFBTSxTQUFTO0FBQ2hDLHVCQUFpQixNQUFNLFlBQVk7QUFDbkMsdUJBQWlCLE1BQU0sZUFBZTtBQUN0Qyx1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
content;