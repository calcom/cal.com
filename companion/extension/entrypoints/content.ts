/// <reference types="chrome" />

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    const existingSidebar = document.getElementById("cal-companion-sidebar");
    if (existingSidebar) {
      return;
    }

    // Initialize Gmail integration if on Gmail
    // Wrapped in try-catch to prevent breaking Gmail if anything fails
    if (window.location.hostname === "mail.google.com") {
      try {
        initGmailIntegration();
        console.log("Cal.com: Gmail integration initialized successfully");
      } catch (error) {
        // Fail silently - don't break Gmail UI
        console.error("Cal.com: Failed to initialize Gmail integration:", error);
      }
    }

    const sessionToken = generateSecureToken();
    let iframeSessionValidated = false;

    function generateSecureToken(): string {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
    }

    let isVisible = false;
    let isClosed = true;

    // Create sidebar container
    const sidebarContainer = document.createElement("div");
    sidebarContainer.id = "cal-companion-sidebar";
    sidebarContainer.style.position = "fixed";
    sidebarContainer.style.top = "0";
    sidebarContainer.style.right = "0";
    sidebarContainer.style.pointerEvents = "none";
    sidebarContainer.style.width = "100vw";
    sidebarContainer.style.height = "100vh";
    sidebarContainer.style.zIndex = "2147483647";
    sidebarContainer.style.backgroundColor = "transparent";
    sidebarContainer.style.transition = "none";
    sidebarContainer.style.transform = "translateX(100%)";
    sidebarContainer.style.display = "none";

    // Create iframe container - positioned to right side
    const iframeContainer = document.createElement("div");
    iframeContainer.style.position = "absolute";
    iframeContainer.style.top = "0";
    iframeContainer.style.right = "0";
    iframeContainer.style.bottom = "0";
    iframeContainer.style.width = "400px";
    iframeContainer.style.overflow = "hidden";

    const iframe = document.createElement("iframe");
    // URL is determined at build time:
    // - ext:build-dev  → uses EXPO_PUBLIC_COMPANION_DEV_URL (localhost)
    // - ext:build-prod → uses https://companion.cal.com
    const COMPANION_URL =
      (import.meta.env.EXPO_PUBLIC_COMPANION_DEV_URL as string) || "https://companion.cal.com";
    iframe.src = COMPANION_URL;
    // Use explicit dimensions - Brave has issues with percentage-based sizing
    iframe.style.cssText = `
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 400px !important;
      height: 100vh !important;
      border: none !important;
      background-color: transparent !important;
      pointer-events: auto !important;
      display: block !important;
    `;

    iframeContainer.appendChild(iframe);

    // Listen for messages from iframe to control width and handle OAuth
    window.addEventListener("message", (event) => {
      // Security: Only accept messages from our iframe's origin
      // This prevents malicious scripts on the host page from manipulating the companion
      const iframeOrigin = new URL(iframe.src).origin;
      if (event.source !== iframe.contentWindow || event.origin !== iframeOrigin) {
        return;
      }

      if (event.data.type === "cal-extension-request-session") {
        iframeSessionValidated = true;
        iframe.contentWindow?.postMessage(
          {
            type: "cal-extension-session-token",
            sessionToken: sessionToken,
          },
          iframeOrigin
        );
        return;
      }

      const validateSessionToken = (providedToken: string | undefined): boolean => {
        if (!iframeSessionValidated) {
          console.warn("Cal.com: Session not validated yet");
          return false;
        }
        if (providedToken !== sessionToken) {
          console.warn("Cal.com: Invalid session token");
          return false;
        }
        return true;
      };

      if (event.data.type === "cal-companion-expand") {
        // Disable transition for instant expansion
        iframe.style.transition = "none";
        iframe.style.width = "100vw";
        iframeContainer.style.width = "100%";
        iframeContainer.style.left = "0";
        iframeContainer.style.right = "0";
      } else if (event.data.type === "cal-companion-collapse") {
        // Disable transition for instant collapse
        iframe.style.transition = "none";
        iframe.style.width = "400px";
        iframeContainer.style.width = "400px";
        iframeContainer.style.left = "auto";
        iframeContainer.style.right = "0";
      } else if (event.data.type === "cal-extension-oauth-request") {
        // Handle OAuth request from iframe
        handleOAuthRequest(event.data.authUrl, iframe.contentWindow);
      } else if (event.data.type === "cal-extension-token-exchange-request") {
        // Handle token exchange request from iframe
        handleTokenExchangeRequest(
          event.data.tokenRequest,
          event.data.tokenEndpoint,
          event.data.state, // Pass state for CSRF validation
          iframe.contentWindow
        );
      } else if (event.data.type === "cal-extension-sync-tokens") {
        if (!validateSessionToken(event.data.sessionToken)) {
          iframe.contentWindow?.postMessage(
            {
              type: "cal-extension-sync-tokens-result",
              success: false,
              error: "Invalid session token",
            },
            iframeOrigin
          );
          return;
        }
        handleTokenSyncRequest(event.data.tokens, iframe.contentWindow);
      } else if (event.data.type === "cal-extension-clear-tokens") {
        if (!validateSessionToken(event.data.sessionToken)) {
          iframe.contentWindow?.postMessage(
            {
              type: "cal-extension-clear-tokens-result",
              success: false,
              error: "Invalid session token",
            },
            iframeOrigin
          );
          return;
        }
        handleClearTokensRequest(iframe.contentWindow);
      }
    });

    // Handle OAuth requests by forwarding to background script
    function handleOAuthRequest(authUrl: string, iframeWindow: Window | null) {
      // Send request to background script
      chrome.runtime.sendMessage(
        { action: "start-extension-oauth", authUrl: authUrl },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Failed to communicate with background script:",
              chrome.runtime.lastError.message
            );
            iframeWindow?.postMessage(
              {
                type: "cal-extension-oauth-result",
                success: false,
                error: `Extension communication failed: ${chrome.runtime.lastError.message}`,
              },
              "*"
            );
            return;
          }

          // Forward the response back to iframe
          if (response.success) {
            iframeWindow?.postMessage(
              {
                type: "cal-extension-oauth-result",
                success: true,
                responseUrl: response.responseUrl,
              },
              "*"
            );
          } else {
            iframeWindow?.postMessage(
              {
                type: "cal-extension-oauth-result",
                success: false,
                error: response.error || "OAuth flow failed",
              },
              "*"
            );
          }
        }
      );
    }

    // Handle token exchange requests by forwarding to background script
    function handleTokenExchangeRequest(
      tokenRequest: any,
      tokenEndpoint: string,
      state: string | undefined,
      iframeWindow: Window | null
    ) {
      // Send request to background script
      chrome.runtime.sendMessage(
        {
          action: "exchange-oauth-tokens",
          tokenRequest: tokenRequest,
          tokenEndpoint: tokenEndpoint,
          state: state, // Include state for CSRF validation
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Failed to communicate with background script:",
              chrome.runtime.lastError.message
            );
            iframeWindow?.postMessage(
              {
                type: "cal-extension-token-exchange-result",
                success: false,
                error: `Extension communication failed: ${chrome.runtime.lastError.message}`,
              },
              "*"
            );
            return;
          }

          // Forward the response back to iframe
          if (response.success) {
            iframeWindow?.postMessage(
              {
                type: "cal-extension-token-exchange-result",
                success: true,
                tokens: response.tokens,
              },
              "*"
            );
          } else {
            iframeWindow?.postMessage(
              {
                type: "cal-extension-token-exchange-result",
                success: false,
                error: response.error || "Token exchange failed",
              },
              "*"
            );
          }
        }
      );
    }

    function handleTokenSyncRequest(tokens: any, iframeWindow: Window | null) {
      chrome.runtime.sendMessage({ action: "sync-oauth-tokens", tokens }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Failed to communicate with background script:",
            chrome.runtime.lastError.message
          );
          iframeWindow?.postMessage(
            {
              type: "cal-extension-sync-tokens-result",
              success: false,
              error: `Extension communication failed: ${chrome.runtime.lastError.message}`,
            },
            "*"
          );
          return;
        }

        iframeWindow?.postMessage(
          {
            type: "cal-extension-sync-tokens-result",
            success: response?.success ?? false,
            error: response?.error,
          },
          "*"
        );
      });
    }

    function handleClearTokensRequest(iframeWindow: Window | null) {
      chrome.runtime.sendMessage({ action: "clear-oauth-tokens" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Failed to communicate with background script:",
            chrome.runtime.lastError.message
          );
          iframeWindow?.postMessage(
            {
              type: "cal-extension-clear-tokens-result",
              success: false,
              error: `Extension communication failed: ${chrome.runtime.lastError.message}`,
            },
            "*"
          );
          return;
        }

        iframeWindow?.postMessage(
          {
            type: "cal-extension-clear-tokens-result",
            success: response?.success ?? false,
            error: response?.error,
          },
          "*"
        );
      });
    }

    sidebarContainer.appendChild(iframeContainer);

    // Create floating buttons container
    const buttonsContainer = document.createElement("div");
    buttonsContainer.id = "cal-companion-buttons";
    buttonsContainer.style.position = "fixed";
    buttonsContainer.style.top = "20px";
    buttonsContainer.style.right = "420px";
    buttonsContainer.style.display = "flex";
    buttonsContainer.style.flexDirection = "column";
    buttonsContainer.style.gap = "8px";
    buttonsContainer.style.zIndex = "2147483648";
    buttonsContainer.style.transition = "none";
    buttonsContainer.style.display = "none";

    // Create toggle button
    const toggleButton = document.createElement("button");
    toggleButton.innerHTML = "◀";
    toggleButton.style.width = "40px";
    toggleButton.style.height = "40px";
    toggleButton.style.borderRadius = "50%";
    toggleButton.style.border = "1px solid white";
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

    // Create reload button
    const reloadButton = document.createElement("button");
    reloadButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1 4V10H7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M23 20V14H17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14L18.36 18.36A9 9 0 0 1 3.51 15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
    reloadButton.style.width = "40px";
    reloadButton.style.height = "40px";
    reloadButton.style.borderRadius = "50%";
    reloadButton.style.border = "1px solid rgba(255, 255, 255, 0.5)";
    reloadButton.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    reloadButton.style.backdropFilter = "blur(10px)";
    reloadButton.style.color = "white";
    reloadButton.style.cursor = "pointer";
    reloadButton.style.fontSize = "16px";
    reloadButton.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
    reloadButton.style.transition = "all 0.2s ease";
    reloadButton.style.display = "flex";
    reloadButton.style.alignItems = "center";
    reloadButton.style.justifyContent = "center";
    reloadButton.title = "Reload data";

    // Create close button
    const closeButton = document.createElement("button");
    closeButton.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13 1L1 13" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M1 1L13 13" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;
    closeButton.style.width = "40px";
    closeButton.style.height = "40px";
    closeButton.style.borderRadius = "50%";
    closeButton.style.border = "1px solid rgba(255, 255, 255, 0.5)";
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

    // Add hover effects
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

    reloadButton.addEventListener("mouseenter", () => {
      reloadButton.style.transform = "scale(1.1)";
    });
    reloadButton.addEventListener("mouseleave", () => {
      reloadButton.style.transform = "scale(1)";
    });

    // Reload functionality - sends message to iframe to invalidate cache
    reloadButton.addEventListener("click", () => {
      // Add spinning animation
      reloadButton.style.animation = "spin 0.5s ease-in-out";
      setTimeout(() => {
        reloadButton.style.animation = "";
      }, 500);

      // Send message to iframe to reload cache
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: "cal-companion-reload-cache" }, "*");
      }
    });

    // Add spin animation style
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleSheet);

    // Toggle functionality
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

    // Close functionality
    closeButton.addEventListener("click", () => {
      isClosed = true;
      isVisible = false;
      sidebarContainer.style.display = "none";
      buttonsContainer.style.display = "none";
    });

    // Add buttons to container
    buttonsContainer.appendChild(toggleButton);
    buttonsContainer.appendChild(reloadButton);
    buttonsContainer.appendChild(closeButton);

    // Add everything to DOM
    document.body.appendChild(sidebarContainer);
    document.body.appendChild(buttonsContainer);

    // Function to open the sidebar
    function openSidebar() {
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
      } else if (!isVisible) {
        isVisible = true;
        sidebarContainer.style.transform = "translateX(0)";
        buttonsContainer.style.right = "420px";
        toggleButton.innerHTML = `<svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1 11L6 6L1 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M8 11L13 6L8 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
      }
    }

    // Function to close/hide the sidebar
    function hideSidebar() {
      if (isVisible) {
        isVisible = false;
        sidebarContainer.style.transform = "translateX(100%)";
        buttonsContainer.style.right = "20px";
        toggleButton.innerHTML = `<svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13 1L8 6L13 11" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M6 1L1 6L6 11" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
      }
    }

    // Listen for extension icon click
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Skip debug-log messages to avoid infinite loop
      if (message.action === "icon-clicked") {
        if (isClosed) {
          openSidebar();
        } else {
          // Toggle visible sidebar
          if (isVisible) {
            hideSidebar();
          } else {
            openSidebar();
          }
        }
        sendResponse({ success: true }); // Send response to acknowledge
      }
    });

    // Auto-open sidebar when redirected from restricted pages (like new tab)
    // Detects ?openExtension=true parameter on cal.com/app or companion.cal.com
    const urlParams = new URLSearchParams(window.location.search);
    const shouldAutoOpen =
      urlParams.get("openExtension") === "true" || window.location.hostname === "companion.cal.com";

    if (shouldAutoOpen) {
      // Function to open sidebar and clean up URL
      const autoOpenAndCleanup = () => {
        openSidebar();
        // Clean up the URL parameter without triggering a reload
        if (urlParams.get("openExtension")) {
          const url = new URL(window.location.href);
          url.searchParams.delete("openExtension");
          window.history.replaceState({}, document.title, url.toString());
        }
      };

      // Wait for page to fully load before auto-opening
      // This handles Framer pages which load dynamically
      if (document.readyState === "complete") {
        // Page already loaded (cached), use small delay
        setTimeout(autoOpenAndCleanup, 300);
      } else {
        // Page still loading (first visit), wait for load event
        window.addEventListener(
          "load",
          () => {
            // Additional delay after load for Framer's JS to initialize
            setTimeout(autoOpenAndCleanup, 500);
          },
          { once: true }
        );
      }
    }

    // Gmail integration function
    function initGmailIntegration() {
      // Cache for event types (refreshed on page reload)
      let eventTypesCache: any[] | null = null;
      let cacheTimestamp: number | null = null;
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

      // Function to inject Cal.com button as a new table cell after Send button
      function injectCalButton() {
        // Look specifically for Gmail compose Send buttons - they have specific attributes
        // Gmail Send button usually has div[role="button"] with specific data attributes inside a td
        const sendButtons = document.querySelectorAll(
          'div[role="button"][data-tooltip="Send ‪(Ctrl-Enter)‬"], div[role="button"][data-tooltip*="Send"], div[role="button"][aria-label*="Send"]'
        );

        sendButtons.forEach((sendButton) => {
          // Find the parent td cell that contains the send button
          const sendButtonCell = sendButton.closest("td");
          if (!sendButtonCell) return;

          // Find the parent table row
          const tableRow = sendButtonCell.closest("tr");
          if (!tableRow) return;

          // Check if we already injected our button for this specific send button
          const existingCalButton = sendButtonCell.parentElement?.querySelector(
            ".cal-companion-gmail-button"
          );
          if (existingCalButton) return;

          // Additional check: make sure this is actually in a compose window
          // Gmail compose windows have specific containers
          const composeWindow = sendButton.closest('[role="dialog"]') || sendButton.closest(".nH");
          if (!composeWindow) return;

          // Create new table cell for Cal.com button
          const calButtonCell = document.createElement("td");
          calButtonCell.className = "cal-companion-gmail-button";
          calButtonCell.style.cssText = `
            padding: 0;
            margin: 0;
            vertical-align: middle;
            border: none;
          `;

          // Create Cal.com button
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
            border: 2px solid #ffffff;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          `;

          // Add Cal.com icon (official logo)
          calButton.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.4688 5H17.0887V13.76H15.4688V5Z" fill="white"/>
              <path d="M10.918 13.9186C10.358 13.9186 9.84198 13.7746 9.36998 13.4866C8.89798 13.1906 8.52198 12.7946 8.24198 12.2986C7.96998 11.8026 7.83398 11.2586 7.83398 10.6666C7.83398 10.0746 7.96998 9.53063 8.24198 9.03463C8.52198 8.53063 8.89798 8.13062 9.36998 7.83462C9.84198 7.53862 10.358 7.39062 10.918 7.39062C11.43 7.39062 11.842 7.48662 12.154 7.67862C12.474 7.87062 12.722 8.14662 12.898 8.50662V7.52262H14.506V13.7626H12.934V12.7426C12.75 13.1186 12.498 13.4106 12.178 13.6186C11.866 13.8186 11.446 13.9186 10.918 13.9186ZM9.45398 10.6546C9.45398 10.9746 9.52598 11.2746 9.66998 11.5546C9.82198 11.8266 10.026 12.0466 10.282 12.2146C10.546 12.3746 10.846 12.4546 11.182 12.4546C11.526 12.4546 11.83 12.3746 12.094 12.2146C12.366 12.0546 12.574 11.8386 12.718 11.5666C12.862 11.2946 12.934 10.9946 12.934 10.6666C12.934 10.3386 12.862 10.0386 12.718 9.76662C12.574 9.48662 12.366 9.26662 12.094 9.10663C11.83 8.93863 11.526 8.85463 11.182 8.85463C10.846 8.85463 10.546 8.93863 10.282 9.10663C10.018 9.26662 9.81398 9.48262 9.66998 9.75462C9.52598 10.0266 9.45398 10.3266 9.45398 10.6546Z" fill="white"/>
              <path d="M4.68078 13.919C3.86478 13.919 3.12078 13.727 2.44878 13.343C1.78478 12.951 1.26078 12.423 0.876781 11.759C0.492781 11.095 0.300781 10.367 0.300781 9.57503C0.300781 8.77503 0.484781 8.04303 0.852781 7.37903C1.22878 6.70703 1.74878 6.17903 2.41278 5.79503C3.07678 5.40303 3.83278 5.20703 4.68078 5.20703C5.36078 5.20703 5.94478 5.31503 6.43278 5.53103C6.92878 5.73903 7.36878 6.07103 7.75278 6.52703L6.56478 7.55903C6.06078 7.03103 5.43278 6.76703 4.68078 6.76703C4.15278 6.76703 3.68878 6.89503 3.28878 7.15103C2.88878 7.39903 2.58078 7.73903 2.36478 8.17103C2.14878 8.59503 2.04078 9.06303 2.04078 9.57503C2.04078 10.087 2.14878 10.555 2.36478 10.979C2.58878 11.403 2.90078 11.739 3.30078 11.987C3.70878 12.235 4.18078 12.359 4.71678 12.359C5.50078 12.359 6.14078 12.087 6.63678 11.543L7.86078 12.587C7.52478 12.995 7.08478 13.319 6.54078 13.559C6.00478 13.799 5.38478 13.919 4.68078 13.919Z" fill="white"/>
            </svg>
          `;

          // Add hover effect
          calButton.addEventListener("mouseenter", () => {
            calButton.style.backgroundColor = "#333333";
            calButton.style.transform = "scale(1.05)";
          });

          calButton.addEventListener("mouseleave", () => {
            calButton.style.backgroundColor = "#000000";
            calButton.style.transform = "scale(1)";
          });

          // Add click handler to show Cal.com menu
          calButton.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Remove any existing menus
            const existingMenu = document.querySelector(".cal-companion-gmail-menu");
            if (existingMenu) {
              existingMenu.remove();
              return;
            }

            // Create menu
            const menu = document.createElement("div");
            menu.className = "cal-companion-gmail-menu";
            menu.style.cssText = `
              position: absolute;
              bottom: 100%;
              left: 0;
              width: 400px;
              max-height: 280px;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.15);
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              font-size: 14px;
              z-index: 9999;
              overflow-y: auto;
              margin-bottom: 8px;
            `;

            // Show loading state
            menu.innerHTML = `
              <div style="padding: 16px; text-align: center; color: #5f6368;">
                Loading event types...
              </div>
            `;

            // Array to track tooltips for cleanup
            const tooltipsToCleanup: HTMLElement[] = [];

            // Fetch event types from Cal.com API
            fetchEventTypes(menu, tooltipsToCleanup);

            // Position menu relative to button
            calButtonCell.style.position = "relative";
            calButtonCell.appendChild(menu);

            // Close menu when clicking outside
            setTimeout(() => {
              document.addEventListener("click", function closeMenu(e) {
                if (!menu.contains(e.target as Node)) {
                  // Clean up all tooltips
                  tooltipsToCleanup.forEach((tooltip) => tooltip.remove());
                  menu.remove();
                  document.removeEventListener("click", closeMenu);
                }
              });
            }, 0);
          });

          function createTooltip(text, buttonElement) {
            const tooltip = document.createElement("div");
            tooltip.className = "cal-tooltip";
            tooltip.style.cssText = `
              position: fixed;
              background-color: #1a1a1a;
              color: white;
              padding: 4px 8px;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 600;
              white-space: nowrap;
              pointer-events: none;
              opacity: 0;
              transition: opacity 0.15s ease;
              z-index: 10002;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              display: none;
            `;
            tooltip.textContent = text;
            document.body.appendChild(tooltip);

            // Position tooltip on hover
            const updatePosition = () => {
              const rect = buttonElement.getBoundingClientRect();
              tooltip.style.left = `${rect.left + rect.width / 2}px`;
              tooltip.style.top = `${rect.top - 8}px`;
              tooltip.style.transform = "translate(-50%, -100%)";
            };

            buttonElement.addEventListener("mouseenter", () => {
              updatePosition();
              tooltip.style.display = "block";
              tooltip.style.opacity = "1";
            });

            buttonElement.addEventListener("mouseleave", () => {
              tooltip.style.opacity = "0";
              setTimeout(() => {
                if (tooltip.style.opacity === "0") {
                  tooltip.style.display = "none";
                }
              }, 150);
            });

            return tooltip;
          }

          function openCalSidebar() {
            // Open Cal.com sidebar or quick schedule flow
            if (isClosed) {
              // Trigger sidebar open
              chrome.runtime.sendMessage({ action: "icon-clicked" });
            } else {
              // Toggle sidebar visibility
              isVisible = !isVisible;
              if (isVisible) {
                sidebarContainer.style.transform = "translateX(0)";
              } else {
                sidebarContainer.style.transform = "translateX(100%)";
              }
            }
          }

          async function fetchEventTypes(menu, tooltipsToCleanup) {
            try {
              // Check cache first
              const now = Date.now();
              const isCacheValid =
                eventTypesCache && cacheTimestamp && now - cacheTimestamp < CACHE_DURATION;

              let eventTypes: any[] = [];

              if (isCacheValid) {
                // Use cached data
                eventTypes = eventTypesCache!;
              } else {
                // Check if extension context is valid
                if (!chrome.runtime?.id) {
                  throw new Error("Extension context invalidated. Please reload the page.");
                }

                // Fetch fresh data from background script
                const response = await new Promise((resolve, reject) => {
                  try {
                    chrome.runtime.sendMessage({ action: "fetch-event-types" }, (response) => {
                      if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                      } else if (response && response.error) {
                        reject(new Error(response.error));
                      } else {
                        resolve(response);
                      }
                    });
                  } catch (err) {
                    reject(err);
                  }
                });

                if (response && (response as any).data) {
                  eventTypes = (response as any).data;
                } else if (Array.isArray(response)) {
                  eventTypes = response;
                } else {
                  eventTypes = [];
                }

                // Ensure eventTypes is an array
                if (!Array.isArray(eventTypes)) {
                  eventTypes = [];
                }

                // Update cache
                eventTypesCache = eventTypes;
                cacheTimestamp = now;
              }

              // Clear loading state
              menu.innerHTML = "";

              if (eventTypes.length === 0) {
                menu.innerHTML = `
                  <div style="padding: 16px; text-align: center; color: #5f6368;">
                    No event types found
                  </div>
                `;
                return;
              }

              // Add event types - with additional safety checks
              try {
                eventTypes.forEach((eventType, index) => {
                  // Validate eventType object
                  if (!eventType || typeof eventType !== "object") {
                    return;
                  }

                  const title = eventType.title || "Untitled Event";
                  const length =
                    eventType.lengthInMinutes || eventType.length || eventType.duration || 30;
                  const description = eventType.description || "";

                  const menuItem = document.createElement("div");
                  menuItem.style.cssText = `
                    padding: 14px 16px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    transition: background-color 0.1s ease;
                    border-bottom: ${index < eventTypes.length - 1 ? "1px solid #E5E5EA" : "none"};
                  `;

                  // Create content wrapper
                  const contentWrapper = document.createElement("div");
                  contentWrapper.style.cssText = `
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    cursor: pointer;
                    margin-right: 12px;
                    position: relative;
                    min-width: 0;
                    overflow: hidden;
                  `;

                  contentWrapper.innerHTML = `
                    <div style="display: flex; align-items: center; margin-bottom: 6px; overflow: hidden;">
                      <span style="color: #3c4043; font-weight: 500; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${title}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
                      <span style="
                        display: inline-flex;
                        align-items: center;
                        background-color: #E5E5EA;
                        border: 1px solid #E5E5EA;
                        border-radius: 6px;
                        padding: 3px 8px;
                        font-size: 12px;
                        color: #000;
                        font-weight: 600;
                        flex-shrink: 0;
                      ">
                        ${length}min
                      </span>
                      ${description ? `<span style="color: #5f6368; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0;">${description}</span>` : ""}
                    </div>
                  `;

                  // Create tooltip for content wrapper
                  const contentTooltip = document.createElement("div");
                  contentTooltip.className = "cal-tooltip";
                  contentTooltip.style.cssText = `
                    position: fixed;
                    background-color: #1a1a1a;
                    color: white;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 600;
                    white-space: nowrap;
                    pointer-events: none;
                    opacity: 0;
                    transition: opacity 0.15s ease;
                    z-index: 10002;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                    display: none;
                  `;
                  contentTooltip.textContent = "Insert link";
                  document.body.appendChild(contentTooltip);
                  tooltipsToCleanup.push(contentTooltip);

                  // Show/hide tooltip
                  contentWrapper.addEventListener("mouseenter", (e) => {
                    const rect = contentWrapper.getBoundingClientRect();
                    // Shift right to better center on the visible content
                    contentTooltip.style.left = `${rect.left + rect.width / 2 + 80}px`;
                    contentTooltip.style.top = `${rect.top + 35}px`;
                    contentTooltip.style.transform = "translate(-50%, -100%)";
                    contentTooltip.style.display = "block";
                    contentTooltip.style.opacity = "1";
                  });
                  contentWrapper.addEventListener("mouseleave", () => {
                    contentTooltip.style.opacity = "0";
                    setTimeout(() => {
                      if (contentTooltip.style.opacity === "0") {
                        contentTooltip.style.display = "none";
                      }
                    }, 150);
                  });

                  // Add click handler to content wrapper to insert link
                  contentWrapper.addEventListener("click", (e) => {
                    e.stopPropagation();
                    // Remove tooltip
                    contentTooltip.remove();
                    menu.remove();
                    // Insert link into email text
                    insertEventTypeLink(eventType);
                  });

                  // Create buttons container
                  const buttonsContainer = document.createElement("div");
                  buttonsContainer.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 0;
                    flex-shrink: 0;
                  `;

                  // Preview button
                  const previewBtn = document.createElement("button");
                  previewBtn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3C3F44" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                  `;
                  previewBtn.style.cssText = `
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid #e5e5ea;
                    border-right: none;
                    border-radius: 6px 0 0 6px;
                    background: white;
                    cursor: pointer;
                    transition: background-color 0.1s ease;
                    padding: 0;
                    position: relative;
                  `;

                  // Create tooltip for preview button
                  const previewTooltip = createTooltip("Preview", previewBtn);
                  tooltipsToCleanup.push(previewTooltip);

                  previewBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const bookingUrl = `https://cal.com/${eventType.users?.[0]?.username || "user"}/${eventType.slug}`;
                    window.open(bookingUrl, "_blank");
                  });
                  previewBtn.addEventListener("mouseenter", () => {
                    previewBtn.style.backgroundColor = "#f8f9fa";
                  });
                  previewBtn.addEventListener("mouseleave", () => {
                    previewBtn.style.backgroundColor = "white";
                  });

                  // Copy link button
                  const copyBtn = document.createElement("button");
                  copyBtn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3C3F44" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                  `;
                  copyBtn.style.cssText = `
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid #e5e5ea;
                    border-right: none;
                    background: white;
                    cursor: pointer;
                    transition: background-color 0.1s ease;
                    padding: 0;
                    position: relative;
                  `;

                  // Create tooltip for copy button
                  const copyTooltip = createTooltip("Copy link", copyBtn);
                  tooltipsToCleanup.push(copyTooltip);

                  copyBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    // Copy to clipboard
                    const bookingUrl = `https://cal.com/${eventType.users?.[0]?.username || "user"}/${eventType.slug}`;
                    navigator.clipboard
                      .writeText(bookingUrl)
                      .then(() => {
                        showNotification("Link copied!", "success");
                        // Change icon to checkmark
                        copyBtn.innerHTML = `
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      `;
                        setTimeout(() => {
                          copyBtn.innerHTML = `
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3C3F44" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                          </svg>
                        `;
                        }, 2000);
                      })
                      .catch(() => {
                        showNotification("Failed to copy link", "error");
                      });
                  });
                  copyBtn.addEventListener("mouseenter", () => {
                    copyBtn.style.backgroundColor = "#f8f9fa";
                  });
                  copyBtn.addEventListener("mouseleave", () => {
                    copyBtn.style.backgroundColor = "white";
                  });

                  // Edit button (replaces three dots menu)
                  const editBtn = document.createElement("button");
                  editBtn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3C3F44" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  `;
                  editBtn.style.cssText = `
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid #e5e5ea;
                    border-radius: 0 6px 6px 0;
                    background: white;
                    cursor: pointer;
                    transition: background-color 0.1s ease;
                    padding: 0;
                    position: relative;
                  `;

                  // Create tooltip for edit button
                  const editTooltip = createTooltip("Edit", editBtn);
                  tooltipsToCleanup.push(editTooltip);

                  editBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const editUrl = `https://app.cal.com/event-types/${eventType.id}`;
                    window.open(editUrl, "_blank");
                  });
                  editBtn.addEventListener("mouseenter", () => {
                    editBtn.style.backgroundColor = "#f8f9fa";
                  });
                  editBtn.addEventListener("mouseleave", () => {
                    editBtn.style.backgroundColor = "white";
                  });

                  // Assemble buttons
                  buttonsContainer.appendChild(previewBtn);
                  buttonsContainer.appendChild(copyBtn);
                  buttonsContainer.appendChild(editBtn);

                  // Hover effect for whole item
                  menuItem.addEventListener("mouseenter", () => {
                    menuItem.style.backgroundColor = "#f8f9fa";
                  });

                  menuItem.addEventListener("mouseleave", () => {
                    menuItem.style.backgroundColor = "transparent";
                  });

                  // Assemble menu item
                  menuItem.appendChild(contentWrapper);
                  menuItem.appendChild(buttonsContainer);

                  menu.appendChild(menuItem);
                });
              } catch (forEachError) {
                menu.innerHTML = `
                  <div style="padding: 16px; text-align: center; color: #ea4335;">
                    Error displaying event types
                  </div>
                `;
              }
            } catch (error) {
              const errorMessage = (error as Error).message || "";
              const isAuthError =
                errorMessage.includes("OAuth") ||
                errorMessage.includes("access token") ||
                errorMessage.includes("sign in") ||
                errorMessage.includes("authentication");

              if (isAuthError) {
                // Not logged in - open sidebar directly
                tooltipsToCleanup.forEach((tooltip) => tooltip.remove());
                menu.remove();
                openSidebar();
                return;
              } else {
                // Show generic error for non-auth errors
                menu.innerHTML = `
                  <div style="padding: 20px; text-align: center;">
                    <div style="margin-bottom: 12px;">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                    </div>
                    <div style="font-size: 14px; font-weight: 600; color: #111827; margin-bottom: 8px;">
                      Something went wrong
                    </div>
                    <div style="font-size: 13px; color: #6B7280; margin-bottom: 16px;">
                      ${errorMessage || "Failed to load event types"}
                    </div>
                    <button class="cal-gmail-close-btn" style="
                      background: #F3F4F6;
                      color: #374151;
                      border: none;
                      padding: 10px 20px;
                      border-radius: 8px;
                    font-size: 14px;
                      font-weight: 500;
                    cursor: pointer;
                      transition: background 0.2s ease;
                  ">Close</button>
                </div>
              `;

                const closeBtn = menu.querySelector(".cal-gmail-close-btn") as HTMLButtonElement;
                if (closeBtn) {
                  closeBtn.addEventListener("mouseenter", () => {
                    closeBtn.style.background = "#E5E7EB";
                  });
                  closeBtn.addEventListener("mouseleave", () => {
                    closeBtn.style.background = "#F3F4F6";
                  });
                  closeBtn.addEventListener("click", () => {
                    tooltipsToCleanup.forEach((tooltip) => tooltip.remove());
                    menu.remove();
                  });
                }
              }
            }
          }

          function insertEventTypeLink(eventType) {
            // Construct the Cal.com booking link
            const bookingUrl = `https://cal.com/${eventType.users?.[0]?.username || "user"}/${eventType.slug}`;

            // Try to insert at cursor position in the compose field
            const inserted = insertTextAtCursor(bookingUrl);

            if (inserted) {
              showNotification("Link inserted", "success");
            } else {
              // Fallback: copy to clipboard if insertion fails
              navigator.clipboard
                .writeText(bookingUrl)
                .then(() => {
                  showNotification("Link copied!", "success");
                })
                .catch(() => {
                  showNotification("Failed to copy link", "error");
                });
            }
          }

          function copyEventTypeLink(eventType) {
            // Construct the Cal.com booking link
            const bookingUrl = `https://cal.com/${eventType.users?.[0]?.username || "user"}/${eventType.slug}`;

            // Try to insert at cursor position in the compose field
            const inserted = insertTextAtCursor(bookingUrl);

            if (inserted) {
              showNotification("Link inserted", "success");
            } else {
              // Fallback: copy to clipboard if insertion fails
              navigator.clipboard
                .writeText(bookingUrl)
                .then(() => {
                  showNotification("Link copied!", "success");
                })
                .catch(() => {
                  showNotification("Failed to copy link", "error");
                });
            }
          }

          function insertTextAtCursor(text) {
            // Find the active compose field
            // Gmail uses contenteditable divs for the compose body
            const composeBody =
              document.querySelector('[role="textbox"][aria-label*="Message Body"]') ||
              document.querySelector('[role="textbox"][g_editable="true"]') ||
              document.querySelector('div[contenteditable="true"][role="textbox"]');

            if (!composeBody) {
              return false;
            }

            // Focus the compose field
            (composeBody as HTMLElement).focus();

            // Get the current selection
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) {
              // If no selection, append to the end
              const textNode = document.createTextNode(" " + text + " ");
              composeBody.appendChild(textNode);

              // Move cursor after inserted text
              const range = document.createRange();
              range.setStartAfter(textNode);
              range.collapse(true);
              selection?.removeAllRanges();
              selection?.addRange(range);

              return true;
            }

            // Insert at cursor position
            const range = selection.getRangeAt(0);
            range.deleteContents();

            // Create a text node with the link (with spaces around it)
            const textNode = document.createTextNode(" " + text + " ");
            range.insertNode(textNode);

            // Move cursor after inserted text
            range.setStartAfter(textNode);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);

            // Trigger input event so Gmail knows content changed
            composeBody.dispatchEvent(new Event("input", { bubbles: true }));
            composeBody.dispatchEvent(new Event("change", { bubbles: true }));

            return true;
          }

          function showNotification(message, type) {
            const notification = document.createElement("div");
            notification.style.cssText = `
              position: fixed;
              bottom: 80px;
              right: 80px;
              padding: 10px 12px;
              background: ${type === "success" ? "#111827" : "#752522"};
              color: white;
              border: 1px solid #2b2b2b;
              border-radius: 8px;
              font-family: "Google Sans",Roboto,RobotoDraft,Helvetica,Arial,sans-serif;
              font-size: 14px;
              font-weight: 600;
              z-index: 10000;
              box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.3), 0 2px 6px 2px rgba(0, 0, 0, 0.15);
              display: flex;
              align-items: center;
              gap: 8px;
              opacity: 0;
              transform: translateY(10px);
              transition: opacity 0.2s ease, transform 0.2s ease;
            `;

            // Add check icon for success
            if (type === "success") {
              const checkIcon = document.createElement("span");
              checkIcon.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.3332 4L5.99984 11.3333L2.6665 8" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              `;
              checkIcon.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
              `;
              notification.appendChild(checkIcon);
            }

            // Add message text
            const messageText = document.createElement("span");
            messageText.textContent = message;
            notification.appendChild(messageText);

            document.body.appendChild(notification);

            // Trigger fade-in animation
            requestAnimationFrame(() => {
              notification.style.opacity = "1";
              notification.style.transform = "translateY(0)";
            });

            // Fade out and remove after 3 seconds
            setTimeout(() => {
              notification.style.opacity = "0";
              notification.style.transform = "translateY(10px)";
              setTimeout(() => {
                notification.remove();
              }, 200);
            }, 3000);
          }

          // Add tooltip
          calButton.title = "Schedule with Cal.com";

          // Add button to cell
          calButtonCell.appendChild(calButton);

          // Insert the new cell after the send button cell
          if (sendButtonCell.nextSibling) {
            tableRow.insertBefore(calButtonCell, sendButtonCell.nextSibling);
          } else {
            tableRow.appendChild(calButtonCell);
          }
        });
      }

      // Initial injection
      setTimeout(injectCalButton, 1000);

      // Watch for DOM changes (Gmail is a SPA)
      const observer = new MutationObserver(() => {
        injectCalButton();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // Also inject on URL changes (Gmail navigation)
      let currentUrl = window.location.href;
      setInterval(() => {
        if (window.location.href !== currentUrl) {
          currentUrl = window.location.href;
          setTimeout(injectCalButton, 500);
        }
      }, 1000);

      // ========== Google Calendar Chip Integration ==========

      /**
       * Generate HTML email embed for Cal.com booking
       * Based on the email embed feature in main Cal.com codebase
       */
      function generateEmailEmbedHTML(params: {
        eventType: any;
        username: string;
        slots: any[];
        duration: number;
        timezone: string;
        timezoneOffset: string;
      }): string {
        const { eventType, username, slots, duration, timezone, timezoneOffset } = params;

        // Group slots by date
        const slotsByDate: { [date: string]: any[] } = {};
        slots.forEach((slot) => {
          if (!slotsByDate[slot.isoDate]) {
            slotsByDate[slot.isoDate] = [];
          }
          slotsByDate[slot.isoDate].push(slot);
        });

        // Generate time slot buttons HTML
        const datesHTML = Object.keys(slotsByDate)
          .sort()
          .map((date) => {
            const dateSlots = slotsByDate[date];
            const formattedDate = dateSlots[0].date; // Already formatted like "Thu, 27 November"

            const slotsHTML = dateSlots
              .map((slot) => {
                // URL-encode the timezone to handle special characters like "/"
                const encodedTimezone = encodeURIComponent(timezone);
                const bookingURL = `https://cal.com/${username}/${eventType.slug}?duration=${duration}&date=${slot.isoDate}&slot=${slot.isoTimestamp}&cal.tz=${encodedTimezone}`;

                return `
                  <td style="padding: 0px; width: 64px; display: inline-block; margin-right: 4px; margin-bottom: 4px; height: 24px; border: 1px solid #111827; border-radius: 3px;">
                    <table style="height: 21px;">
                      <tbody>
                        <tr style="height: 21px;">
                          <td style="width: 7px;"></td>
                          <td style="width: 50px; text-align: center; margin-right: 1px;">
                            <a href="${bookingURL}" style="font-family: 'Proxima Nova', sans-serif; text-decoration: none; text-align: center; color: #111827; font-size: 12px; line-height: 16px;">
                              <b style="font-weight: normal; text-decoration: none;">${slot.startTime}</b>
                            </a>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                `;
              })
              .join("");

            return `
              <table key="${date}" style="margin-top: 16px; text-align: left; border-collapse: collapse; border-spacing: 0px;">
                <tbody>
                  <tr>
                    <td style="text-align: left; margin-top: 16px;">
                      <span style="font-size: 14px; line-height: 16px; padding-bottom: 8px; color: rgb(26, 26, 26); font-weight: bold;">
                        ${formattedDate}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <table style="border-collapse: separate; border-spacing: 0px 4px;">
                        <tbody>
                          <tr style="height: 25px;">
                            ${slotsHTML}
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
            `;
          })
          .join("");

        // Complete HTML structure
        return `
          <div style="padding-bottom: 3px; font-size: 13px; color: black; line-height: 1.4; background-color: white; border: 1px solid #e5e5ea; border-radius: 8px; padding: 16px; margin: 8px 0; font-family: 'Google Sans', Roboto, Arial, sans-serif;">
            <div style="font-style: normal; font-size: 20px; font-weight: bold; line-height: 19px; margin-top: 15px; margin-bottom: 15px;">
              <b style="color: black;">${eventType.title}</b>
            </div>
            <div style="font-style: normal; font-weight: normal; font-size: 14px; line-height: 17px; color: #333333;">
              Duration: <b style="color: black;">${duration} mins</b>
            </div>
            <div>
              <span style="font-style: normal; font-weight: normal; font-size: 14px; line-height: 17px; color: #333333;">
                Timezone: <b style="color: black;">${timezone} (${timezoneOffset})</b>
              </span>
            </div>
            ${datesHTML}
            <div style="margin-top: 13px;">
              <a href="https://cal.com/${username}/${eventType.slug}?cal.tz=${encodeURIComponent(timezone)}" style="text-decoration: none; cursor: pointer; color: #0B57D0; font-size: 14px;">
                See all available times →
              </a>
            </div>
            <div style="border-top: 1px solid #CCCCCC; margin-top: 8px; padding-top: 8px; text-align: right; font-size: 12px; color: #666;">
              <span>Powered by</span> <b style="color: black;">Cal.com</b>
            </div>
          </div>
          <p><br></p>
        `;
      }

      /**
       * Helper function to insert HTML into Gmail compose field
       * @param html - The HTML content to insert
       * @param targetComposeElement - Optional: The chip's compose element to ensure we insert in the correct window
       */
      function insertGmailHTML(html: string, targetComposeElement?: HTMLElement): boolean {
        try {
          // Validate input
          if (!html || typeof html !== "string") {
            console.warn("Cal.com: Invalid HTML to insert");
            return false;
          }

          // If a target compose element is provided, find the compose body within its scope
          let composeBody: Element | null = null;

          if (targetComposeElement) {
            const composeWindow =
              targetComposeElement.closest('[role="dialog"]') ||
              targetComposeElement.closest(".nH") ||
              targetComposeElement.closest('div[contenteditable="true"]')?.parentElement;

            if (composeWindow) {
              composeBody =
                composeWindow.querySelector('[role="textbox"][aria-label*="Message Body"]') ||
                composeWindow.querySelector('[role="textbox"][g_editable="true"]') ||
                composeWindow.querySelector('div[contenteditable="true"][role="textbox"]');
            }
          }

          // Fallback: Try global selectors
          if (!composeBody) {
            composeBody =
              document.querySelector('[role="textbox"][aria-label*="Message Body"]') ||
              document.querySelector('[role="textbox"][g_editable="true"]') ||
              document.querySelector('div[contenteditable="true"][role="textbox"]');
          }

          if (!composeBody) {
            console.warn("Cal.com: Gmail compose field not found");
            return false;
          }

          // Focus the compose body
          try {
            (composeBody as HTMLElement).focus();
          } catch (focusError) {
            console.warn("Cal.com: Failed to focus compose field:", focusError);
          }

          const selection = window.getSelection();
          if (!selection || selection.rangeCount === 0) {
            // No selection - append at end
            try {
              const tempDiv = document.createElement("div");
              tempDiv.innerHTML = html;
              composeBody.appendChild(tempDiv);
              return true;
            } catch (appendError) {
              console.warn("Cal.com: Failed to append HTML:", appendError);
              return false;
            }
          }

          // Insert at cursor position
          try {
            const range = selection.getRangeAt(0);
            range.deleteContents();

            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = html;

            // Insert all child nodes
            const fragment = document.createDocumentFragment();
            while (tempDiv.firstChild) {
              fragment.appendChild(tempDiv.firstChild);
            }

            range.insertNode(fragment);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);

            // Trigger input events
            (composeBody as HTMLElement).dispatchEvent(new Event("input", { bubbles: true }));
            (composeBody as HTMLElement).dispatchEvent(new Event("change", { bubbles: true }));

            return true;
          } catch (insertError) {
            console.warn("Cal.com: Failed to insert HTML at cursor:", insertError);
            return false;
          }
        } catch (error) {
          console.error("Cal.com: Critical error inserting HTML:", error);
          return false;
        }
      }

      /**
       * Helper function to insert text into Gmail compose field
       * @param text - The text to insert
       * @param targetComposeElement - Optional: The chip's compose element to ensure we insert in the correct window
       */
      function insertGmailText(text: string, targetComposeElement?: HTMLElement): boolean {
        try {
          // Validate input
          if (!text || typeof text !== "string") {
            console.warn("Cal.com: Invalid text to insert");
            return false;
          }

          // If a target compose element is provided, find the compose body within its scope
          // Otherwise, fall back to the first compose field (legacy behavior)
          let composeBody: Element | null = null;

          if (targetComposeElement) {
            // Find the compose window that contains the chip
            const composeWindow =
              targetComposeElement.closest('[role="dialog"]') ||
              targetComposeElement.closest(".nH") ||
              targetComposeElement.closest('div[contenteditable="true"]')?.parentElement;

            if (composeWindow) {
              // Look for compose body within this specific window
              composeBody =
                composeWindow.querySelector('[role="textbox"][aria-label*="Message Body"]') ||
                composeWindow.querySelector('[role="textbox"][g_editable="true"]') ||
                composeWindow.querySelector('div[contenteditable="true"][role="textbox"]');
            }
          }

          // Fallback: Try global selectors if no target or if scoped search failed
          if (!composeBody) {
            composeBody =
              document.querySelector('[role="textbox"][aria-label*="Message Body"]') ||
              document.querySelector('[role="textbox"][g_editable="true"]') ||
              document.querySelector('div[contenteditable="true"][role="textbox"]');
          }

          if (!composeBody) {
            console.warn("Cal.com: Gmail compose field not found (structure may have changed)");
            return false;
          }

          // Try to focus the compose body
          try {
            (composeBody as HTMLElement).focus();
          } catch (focusError) {
            console.warn("Cal.com: Failed to focus compose field:", focusError);
            // Continue anyway - might still work
          }

          const selection = window.getSelection();
          if (!selection || selection.rangeCount === 0) {
            try {
              const textNode = document.createTextNode(" " + text + " ");
              composeBody.appendChild(textNode);
              const range = document.createRange();
              range.setStartAfter(textNode);
              range.collapse(true);
              selection?.removeAllRanges();
              selection?.addRange(range);
              return true;
            } catch (appendError) {
              console.warn("Cal.com: Failed to append text (fallback method):", appendError);
              return false;
            }
          }

          try {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const textNode = document.createTextNode(" " + text + " ");
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            composeBody.dispatchEvent(new Event("input", { bubbles: true }));
            composeBody.dispatchEvent(new Event("change", { bubbles: true }));
            return true;
          } catch (insertError) {
            console.warn("Cal.com: Failed to insert text at cursor:", insertError);
            return false;
          }
        } catch (error) {
          console.error(
            "Cal.com: Critical error inserting text (Gmail structure may have changed):",
            error
          );
          return false;
        }
      }

      /**
       * Helper function to show notification
       * Fail silently if DOM manipulation fails (prevents breaking Gmail)
       */
      function showGmailNotification(message: string, type: "success" | "error"): void {
        try {
          const notification = document.createElement("div");
          notification.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 80px;
            padding: 10px 12px;
            background: ${type === "success" ? "#111827" : "#752522"};
            color: white;
            border: 1px solid #2b2b2b;
            border-radius: 8px;
            font-family: "Google Sans",Roboto,Arial,sans-serif;
            font-size: 14px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.3), 0 2px 6px 2px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            gap: 8px;
            opacity: 0;
            transform: translateY(10px);
            transition: opacity 0.2s ease, transform 0.2s ease;
          `;

          if (type === "success") {
            const icon = document.createElement("span");
            icon.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.3332 4L5.99984 11.3333L2.6665 8" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            `;
            icon.style.cssText =
              "display: flex; align-items: center; justify-content: center; flex-shrink: 0;";
            notification.appendChild(icon);
          }

          const text = document.createElement("span");
          text.textContent = message;
          notification.appendChild(text);

          document.body.appendChild(notification);

          requestAnimationFrame(() => {
            try {
              notification.style.opacity = "1";
              notification.style.transform = "translateY(0)";
            } catch (e) {
              // Ignore animation errors
            }
          });

          setTimeout(() => {
            try {
              notification.style.opacity = "0";
              notification.style.transform = "translateY(10px)";
              setTimeout(() => {
                try {
                  notification.remove();
                } catch (e) {
                  // Ignore removal errors
                }
              }, 200);
            } catch (e) {
              // Ignore animation errors
            }
          }, 3000);
        } catch (error) {
          // Silently fail - notifications are non-critical
          console.warn("Cal.com: Failed to show notification:", error);
        }
      }

      /**
       * Watch for Google Calendar scheduling chips and add Cal.com suggestion button
       */
      function watchForGoogleChips() {
        try {
          const observer = new MutationObserver((mutations) => {
            try {
              const chips = document.querySelectorAll(
                ".gmail_chip.gmail_ad_hoc_v2_content:not([data-calcom-chip-processed])"
              );

              chips.forEach((chip) => {
                try {
                  chip.setAttribute("data-calcom-chip-processed", "true");
                  handleGoogleChipDetected(chip as HTMLElement);
                } catch (error) {
                  // Silently fail for individual chips to prevent breaking other chips
                  console.warn("Cal.com: Failed to process chip:", error);
                }
              });
            } catch (error) {
              // Silently fail to prevent Gmail UI from breaking
              console.warn("Cal.com: Failed to detect chips:", error);
            }
          });

          observer.observe(document.body, {
            childList: true,
            subtree: true,
          });

          // Also check for existing chips on page load
          setTimeout(() => {
            try {
              const existingChips = document.querySelectorAll(
                ".gmail_chip.gmail_ad_hoc_v2_content:not([data-calcom-chip-processed])"
              );
              existingChips.forEach((chip) => {
                try {
                  chip.setAttribute("data-calcom-chip-processed", "true");
                  handleGoogleChipDetected(chip as HTMLElement);
                } catch (error) {
                  console.warn("Cal.com: Failed to process existing chip:", error);
                }
              });
            } catch (error) {
              console.warn("Cal.com: Failed to find existing chips:", error);
            }
          }, 1000);
        } catch (error) {
          // Critical failure - log but don't break Gmail
          console.error("Cal.com: Failed to initialize chip watcher:", error);
        }
      }

      /**
       * Handle when a Google Calendar chip is detected
       */
      function handleGoogleChipDetected(chipElement: HTMLElement) {
        try {
          console.log("Cal.com: handleGoogleChipDetected called");

          // Validate chip element exists and is in DOM
          if (!chipElement || !chipElement.isConnected) {
            console.warn("Cal.com: Invalid or disconnected chip element");
            return;
          }

          // Only show action bars in ACTIVE compose windows (not in sent/inbox emails)
          // Check if chip is in a contenteditable area (compose window)
          const composeBody = chipElement.closest('[contenteditable="true"]');

          if (!composeBody) {
            // Silently skip - chip not in compose area (likely in sent/inbox)
            return;
          }

          const parsedData = parseGoogleChip(chipElement);

          if (!parsedData || parsedData.slots.length === 0) {
            // Silently skip - chip not fully loaded or invalid
            return;
          }

          console.log(
            `Cal.com: ✅ Google chip detected - ${parsedData.slots.length} slot${parsedData.slots.length > 1 ? "s" : ""} (${parsedData.detectedDuration}min)`
          );

          // Safely check for parent element
          if (!chipElement.parentElement) {
            return;
          }

          // Check if button already exists
          const existingActionBar = chipElement.parentElement.querySelector(
            ".cal-companion-action-bar"
          );
          const scheduleId = chipElement.getAttribute("data-ad-hoc-schedule-id");

          if (existingActionBar) {
            // Action bar exists - check if schedule ID or duration changed
            const existingScheduleId = existingActionBar.getAttribute("data-schedule-id");
            const existingDuration = existingActionBar.getAttribute("data-duration");

            if (
              existingScheduleId === scheduleId &&
              existingDuration === String(parsedData.detectedDuration)
            ) {
              // Nothing changed, no need to recreate
              return;
            }
            // Something changed - remove old action bar and create new one
            console.log(`Cal.com: 🔄 Chip updated - ${parsedData.detectedDuration}min`);
            try {
              existingActionBar.remove();
            } catch (e) {
              // Silently ignore removal errors
            }
          }

          // Watch for mutations on this chip to detect ANY changes
          const observer = new MutationObserver(() => {
            try {
              const newScheduleId = chipElement.getAttribute("data-ad-hoc-schedule-id");
              const actionBar = chipElement.parentElement?.querySelector(
                ".cal-companion-action-bar"
              );
              const currentScheduleId = actionBar?.getAttribute("data-schedule-id");

              // Check if schedule ID changed (this changes when time range or duration changes)
              if (currentScheduleId && newScheduleId && currentScheduleId !== newScheduleId) {
                console.log(`Cal.com: 🔄 Time range/duration changed`);
                try {
                  actionBar?.remove();
                  // Recreate action bar with new data
                  handleGoogleChipDetected(chipElement);
                } catch (e) {
                  // Silently ignore recreation errors
                }
              }
            } catch (error) {
              // Silently ignore observer errors - expected during DOM updates
            }
          });

          try {
            observer.observe(chipElement, {
              childList: true,
              subtree: true,
              attributes: true,
              attributeFilter: ["data-ad-hoc-v2-params"],
            });
          } catch (error) {
            // Silently ignore observer setup errors
          }

          // Create our own action bar below the chip
          const actionBar = document.createElement("div");
          actionBar.className = "cal-companion-action-bar";
          actionBar.setAttribute("contenteditable", "false"); // Make non-editable
          actionBar.setAttribute("data-cal-companion", "true"); // Marker for our elements
          actionBar.setAttribute("data-duration", String(parsedData.detectedDuration));
          actionBar.setAttribute("data-slot-count", String(parsedData.slots.length));
          if (scheduleId) {
            actionBar.setAttribute("data-schedule-id", scheduleId);
          }
          actionBar.style.cssText = `
          position: absolute;
          z-index: 1000;
          padding: 10px 14px;
          background: #f8f9fa;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'Google Sans', Roboto, Arial, sans-serif;
          font-size: 14px;
          width: 434px;
          max-width: 100%;
          box-sizing: border-box;
          user-select: none;
          pointer-events: auto;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        `;

          // Cal.com icon with circular background
          const icon = document.createElement("div");
          icon.style.cssText = `
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #111827;
          border-radius: 50%;
        `;
          icon.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.4688 5H17.0887V13.76H15.4688V5Z" fill="#FFFFFF"/>
            <path d="M10.918 13.9186C10.358 13.9186 9.84198 13.7746 9.36998 13.4866C8.89798 13.1906 8.52198 12.7946 8.24198 12.2986C7.96998 11.8026 7.83398 11.2586 7.83398 10.6666C7.83398 10.0746 7.96998 9.53063 8.24198 9.03463C8.52198 8.53063 8.89798 8.13062 9.36998 7.83462C9.84198 7.53862 10.358 7.39062 10.918 7.39062C11.43 7.39062 11.842 7.48662 12.154 7.67862C12.474 7.87062 12.722 8.14662 12.898 8.50662V7.52262H14.506V13.7626H12.934V12.7426C12.75 13.1186 12.498 13.4106 12.178 13.6186C11.866 13.8186 11.446 13.9186 10.918 13.9186ZM9.45398 10.6546C9.45398 10.9746 9.52598 11.2746 9.66998 11.5546C9.82198 11.8266 10.026 12.0466 10.282 12.2146C10.546 12.3746 10.846 12.4546 11.182 12.4546C11.526 12.4546 11.83 12.3746 12.094 12.2146C12.366 12.0546 12.574 11.8386 12.718 11.5666C12.862 11.2946 12.934 10.9946 12.934 10.6666C12.934 10.3386 12.862 10.0386 12.718 9.76662C12.574 9.48662 12.366 9.26662 12.094 9.10663C11.83 8.93863 11.526 8.85463 11.182 8.85463C10.846 8.85463 10.546 8.93863 10.282 9.10663C10.018 9.26662 9.81398 9.48262 9.66998 9.75462C9.52598 10.0266 9.45398 10.3266 9.45398 10.6546Z" fill="#FFFFFF"/>
            <path d="M4.68078 13.919C3.86478 13.919 3.12078 13.727 2.44878 13.343C1.78478 12.951 1.26078 12.423 0.876781 11.759C0.492781 11.095 0.300781 10.367 0.300781 9.57503C0.300781 8.77503 0.484781 8.04303 0.852781 7.37903C1.22878 6.70703 1.74878 6.17903 2.41278 5.79503C3.07678 5.40303 3.83278 5.20703 4.68078 5.20703C5.36078 5.20703 5.94478 5.31503 6.43278 5.53103C6.92878 5.73903 7.36878 6.07103 7.75278 6.52703L6.56478 7.55903C6.06078 7.03103 5.43278 6.76703 4.68078 6.76703C4.15278 6.76703 3.68878 6.89503 3.28878 7.15103C2.88878 7.39903 2.58078 7.73903 2.36478 8.17103C2.14878 8.59503 2.04078 9.06303 2.04078 9.57503C2.04078 10.087 2.14878 10.555 2.36478 10.979C2.58878 11.403 2.90078 11.739 3.30078 11.987C3.70878 12.235 4.18078 12.359 4.71678 12.359C5.50078 12.359 6.14078 12.087 6.63678 11.543L7.86078 12.587C7.52478 12.995 7.08478 13.319 6.54078 13.559C6.00478 13.799 5.38478 13.919 4.68078 13.919Z" fill="#FFFFFF"/>
          </svg>
        `;

          // Text with duration indicator
          const text = document.createElement("span");
          text.textContent = `Suggest ${parsedData.detectedDuration}min Cal.com links`;
          text.setAttribute("contenteditable", "false"); // Make text non-editable
          text.style.cssText = `
          color: #1f1f1f;
          font-weight: 500;
          flex: 1;
          user-select: none;
        `;

          // Buttons container
          const buttonsContainer = document.createElement("div");
          buttonsContainer.style.cssText = `
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        `;

          // "Suggest Links" Button
          const suggestButton = document.createElement("button");
          suggestButton.className = "cal-companion-suggest-button";
          suggestButton.textContent = "Suggest Links";
          suggestButton.style.cssText = `
          padding: 8px 16px;
          background: #111827;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s ease;
          font-family: 'Google Sans', Roboto, Arial, sans-serif;
        `;

          suggestButton.addEventListener("mouseenter", () => {
            suggestButton.style.background = "#1f2937";
          });

          suggestButton.addEventListener("mouseleave", () => {
            suggestButton.style.background = "#111827";
          });

          suggestButton.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Re-parse the chip to get fresh data (in case it changed)
            const freshParsedData = parseGoogleChip(chipElement);
            console.log(
              "Cal.com: Suggest Links clicked, fresh parsed data:",
              freshParsedData?.detectedDuration,
              "min"
            );
            if (freshParsedData && freshParsedData.slots.length > 0) {
              showCalcomSuggestionMenu(chipElement, freshParsedData);
            } else {
              console.log("Cal.com: Failed to parse fresh data or no slots found");
            }
          });

          // "Insert Embed" Button
          const embedButton = document.createElement("button");
          embedButton.className = "cal-companion-embed-button";
          embedButton.textContent = "Insert Embed";
          embedButton.style.cssText = `
          padding: 8px 16px;
          background: white;
          color: #111827;
          border: 1px solid #111827;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Google Sans', Roboto, Arial, sans-serif;
        `;

          embedButton.addEventListener("mouseenter", () => {
            embedButton.style.background = "#f8f9fa";
          });

          embedButton.addEventListener("mouseleave", () => {
            embedButton.style.background = "white";
          });

          embedButton.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Re-parse the chip to get fresh data
            const freshParsedData = parseGoogleChip(chipElement);
            console.log(
              "Cal.com: Insert Embed clicked, fresh parsed data:",
              freshParsedData?.detectedDuration,
              "min"
            );

            if (!freshParsedData || freshParsedData.slots.length === 0) {
              showGmailNotification("No time slots found", "error");
              return;
            }

            // Fetch event types to get the matching one
            try {
              // Disable button and show loading state with opacity
              embedButton.disabled = true;
              embedButton.style.opacity = "0.6";
              embedButton.style.cursor = "not-allowed";

              const response: any = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ action: "fetch-event-types" }, (result) => {
                  if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                  } else if (result && result.error) {
                    reject(new Error(result.error));
                  } else {
                    resolve(result);
                  }
                });
              });

              const eventTypes = response?.data || (Array.isArray(response) ? response : []);
              const matchingEventType = eventTypes.find(
                (et: any) => et.lengthInMinutes === freshParsedData.detectedDuration
              );

              if (!matchingEventType) {
                showGmailNotification(
                  `No ${freshParsedData.detectedDuration}min event type found`,
                  "error"
                );
                embedButton.disabled = false;
                embedButton.style.opacity = "1";
                embedButton.style.cursor = "pointer";
                return;
              }

              const username = matchingEventType.users?.[0]?.username || "user";

              // Generate HTML embed
              const embedHTML = generateEmailEmbedHTML({
                eventType: matchingEventType,
                username: username,
                slots: freshParsedData.slots,
                duration: freshParsedData.detectedDuration,
                timezone: freshParsedData.timezone,
                timezoneOffset: freshParsedData.timezoneOffset,
              });

              // Insert HTML into Gmail
              const inserted = insertGmailHTML(embedHTML, chipElement);

              if (inserted) {
                showGmailNotification("Cal.com embed inserted!", "success");
                console.log("Cal.com: ✅ Email embed inserted successfully");

                // Immediately remove the Google chip and action bar
                try {
                  chipElement.remove();
                  if ((actionBar as any).__cleanup) {
                    (actionBar as any).__cleanup();
                  }
                  actionBar.remove();
                } catch (removeError) {
                  console.warn("Cal.com: Failed to remove chip/action bar:", removeError);
                }
              } else {
                showGmailNotification("Failed to insert embed", "error");
              }

              embedButton.disabled = false;
              embedButton.style.opacity = "1";
              embedButton.style.cursor = "pointer";
            } catch (error) {
              console.error("Cal.com: Failed to insert embed:", error);

              // Check if this is the "Extension context invalidated" error
              const isContextInvalidated =
                error instanceof Error && error.message.includes("Extension context invalidated");

              if (isContextInvalidated) {
                showGmailNotification("Extension reloaded - please reload Gmail", "error");
              } else {
                showGmailNotification("Failed to insert embed", "error");
              }

              embedButton.disabled = false;
              embedButton.style.opacity = "1";
              embedButton.style.cursor = "pointer";
            }
          });

          buttonsContainer.appendChild(suggestButton);
          buttonsContainer.appendChild(embedButton);

          // Close button (×) to remove the action bar completely
          const closeBtn = document.createElement("button");
          closeBtn.className = "cal-companion-close-btn";
          closeBtn.setAttribute("aria-label", "Close");
          closeBtn.style.cssText = `
          padding: 6px;
          background: transparent;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
          flex-shrink: 0;
          color: #5f6368;
        `;
          closeBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;

          closeBtn.addEventListener("mouseenter", () => {
            closeBtn.style.background = "#e8eaed";
          });

          closeBtn.addEventListener("mouseleave", () => {
            closeBtn.style.background = "transparent";
          });

          closeBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Remove the action bar completely
            try {
              // Call cleanup function if it exists
              if ((actionBar as any).__cleanup) {
                (actionBar as any).__cleanup();
              }
              actionBar.remove();
            } catch (error) {
              // Silently ignore removal errors
            }
          });

          // Assemble action bar
          try {
            actionBar.appendChild(icon);
            actionBar.appendChild(text);
            actionBar.appendChild(buttonsContainer);
            actionBar.appendChild(closeBtn);

            // Position the action bar as an overlay (like Grammarly)
            // This ensures it never becomes part of the email body
            const positionActionBar = () => {
              try {
                if (!document.body.contains(chipElement)) {
                  // Chip removed, clean up
                  actionBar.remove();
                  return;
                }

                const chipRect = chipElement.getBoundingClientRect();

                // Position below the chip with 8px gap
                const top = chipRect.bottom + window.scrollY + 8;
                const left = chipRect.left + window.scrollX;

                actionBar.style.top = `${top}px`;
                actionBar.style.left = `${left}px`;
              } catch (error) {
                // Silently ignore positioning errors
              }
            };

            // Before appending, clean up orphaned or duplicate action bars for THIS chip only
            // (happens when Google changes duration - creates new chip, but old action bar still floating)
            const existingOverlayBars = document.querySelectorAll(".cal-companion-action-bar");
            existingOverlayBars.forEach((bar) => {
              const barScheduleId = bar.getAttribute("data-schedule-id");

              // Only remove action bars that:
              // 1. Belong to THIS chip (same schedule ID) - we're about to create a new one
              // 2. OR their chip no longer exists (orphaned)
              if (barScheduleId === scheduleId) {
                // This bar belongs to the current chip - remove it (we'll create a fresh one)
                try {
                  if ((bar as any).__cleanup) {
                    (bar as any).__cleanup();
                  }
                  bar.remove();
                } catch (e) {
                  // Ignore removal errors
                }
              } else {
                // This bar belongs to a different chip - check if that chip still exists
                try {
                  const chipForBar = document.querySelector(
                    `.gmail_chip.gmail_ad_hoc_v2_content[data-ad-hoc-schedule-id="${barScheduleId}"]`
                  );
                  if (!chipForBar) {
                    // Chip is gone, this is an orphaned action bar - remove it
                    if ((bar as any).__cleanup) {
                      (bar as any).__cleanup();
                    }
                    bar.remove();
                  }
                  // Else: chip exists, keep this action bar (belongs to another chip)
                } catch (e) {
                  // Ignore errors when checking
                }
              }
            });

            // Append to document.body (outside email content, like Grammarly)
            document.body.appendChild(actionBar);

            // Initial positioning with slight delay to ensure chip is rendered
            setTimeout(() => {
              positionActionBar();
            }, 100);

            // Update position on scroll and resize
            const updatePosition = () => {
              if (document.body.contains(chipElement) && document.body.contains(actionBar)) {
                positionActionBar();
              } else {
                // Chip removed, clean up
                try {
                  actionBar.remove();
                } catch (e) {
                  // Ignore
                }
              }
            };

            window.addEventListener("scroll", updatePosition, true);
            window.addEventListener("resize", updatePosition);

            // Store cleanup function
            (actionBar as any).__cleanup = () => {
              window.removeEventListener("scroll", updatePosition, true);
              window.removeEventListener("resize", updatePosition);
            };
          } catch (error) {
            console.error("Cal.com: Failed to create or insert action bar:", error);
            // Clean up if something failed
            try {
              actionBar.remove();
            } catch (e) {
              // Ignore cleanup errors
            }
          }
        } catch (error) {
          // Catch-all to prevent breaking Gmail UI
          console.error("Cal.com: Error handling Google chip:", error);
          return;
        }
      }

      /**
       * Show Cal.com suggestion menu for Google Calendar chip - CENTERED FULL-SCREEN MODAL
       */
      async function showCalcomSuggestionMenu(chipElement: HTMLElement, parsedData: any) {
        console.log(
          "Cal.com: Opening menu for",
          parsedData.detectedDuration,
          "min with",
          parsedData.slots.length,
          "slots"
        );

        // Remove existing menu if any (to support reopening with new data)
        const existingBackdrop = document.querySelector(".cal-companion-google-chip-backdrop");
        if (existingBackdrop) {
          console.log("Cal.com: Removing existing backdrop");
          existingBackdrop.remove();
          // Wait a tick to ensure DOM is updated before creating new menu
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        // Create full-screen backdrop (like FullScreenModal in companion)
        const backdrop = document.createElement("div");
        backdrop.className = "cal-companion-google-chip-backdrop";
        backdrop.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 2147483647;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
        `;

        // Create menu (centered modal content)
        const menu = document.createElement("div");
        menu.className = "cal-companion-google-chip-menu";
        menu.style.cssText = `
          width: 480px;
          max-width: 90vw;
          max-height: 80vh;
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          font-family: "Google Sans", Roboto, Arial, sans-serif;
          pointer-events: auto;
        `;

        // Header
        const header = document.createElement("div");
        header.style.cssText = `
          padding: 20px 24px;
          border-bottom: 1px solid #e5e5ea;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
          flex-shrink: 0;
        `;
        header.innerHTML = `
          <div>
            <div style="font-weight: 600; font-size: 16px; color: #000;">📅 Suggest Cal.com Links</div>
            <div style="font-size: 13px; color: #666; margin-top: 4px;">${parsedData.slots.length} time slot${parsedData.slots.length > 1 ? "s" : ""} • ${parsedData.detectedDuration}min each</div>
          </div>
          <button class="close-menu" style="background: none; border: none; cursor: pointer; font-size: 28px; color: #666; line-height: 1; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background 0.2s ease;">×</button>
        `;

        menu.appendChild(header);
        backdrop.appendChild(menu);
        document.body.appendChild(backdrop);

        // Close on backdrop click
        backdrop.addEventListener("click", (e) => {
          if (e.target === backdrop) {
            backdrop.remove();
          }
        });

        // Close button click and hover
        const closeBtn = header.querySelector(".close-menu") as HTMLButtonElement;
        closeBtn.addEventListener("click", () => {
          backdrop.remove();
        });
        closeBtn.addEventListener("mouseenter", () => {
          closeBtn.style.background = "#f0f0f0";
        });
        closeBtn.addEventListener("mouseleave", () => {
          closeBtn.style.background = "none";
        });

        // Create scrollable content container
        const contentContainer = document.createElement("div");
        contentContainer.className = "cal-companion-menu-content";
        contentContainer.style.cssText = `
          overflow-y: auto;
          flex: 1;
        `;
        menu.appendChild(contentContainer);

        // Show loading
        const loadingDiv = document.createElement("div");
        loadingDiv.style.cssText =
          "padding: 32px 20px; text-align: center; color: #666; font-size: 14px;";
        loadingDiv.textContent = "Loading event types...";
        contentContainer.appendChild(loadingDiv);

        try {
          // Fetch event types (will use cache if available)
          let eventTypes: any[] = [];

          // Check cache first
          const now = Date.now();
          const isCacheValid =
            eventTypesCache && cacheTimestamp && now - cacheTimestamp < CACHE_DURATION;

          if (isCacheValid) {
            eventTypes = eventTypesCache!;
          } else {
            // Fetch from background script
            const response: any = await new Promise((resolve, reject) => {
              chrome.runtime.sendMessage({ action: "fetch-event-types" }, (response) => {
                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message));
                } else if (response && response.error) {
                  reject(new Error(response.error));
                } else {
                  resolve(response);
                }
              });
            });

            if (response && response.data) {
              eventTypes = response.data;
            } else if (Array.isArray(response)) {
              eventTypes = response;
            }

            // Update cache
            eventTypesCache = eventTypes;
            cacheTimestamp = now;
          }

          if (!eventTypes || eventTypes.length === 0) {
            loadingDiv.textContent = "No event types found";
            return;
          }

          loadingDiv.remove();

          // Filter event types by matching duration
          const matchingEventTypes = eventTypes.filter(
            (et: any) => et.lengthInMinutes === parsedData.detectedDuration
          );

          // If no matching event types, show create prompt
          if (matchingEventTypes.length === 0) {
            const noMatchDiv = document.createElement("div");
            noMatchDiv.style.cssText = "padding: 20px 16px; text-align: center;";
            noMatchDiv.innerHTML = `
              <div style="margin-bottom: 12px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="1.5" style="margin: 0 auto;">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <div style="font-size: 14px; font-weight: 600; color: #000; margin-bottom: 8px;">
                No ${parsedData.detectedDuration}min Event Type Found
              </div>
              <div style="font-size: 13px; color: #666; margin-bottom: 16px; line-height: 1.5;">
                Google is suggesting ${parsedData.detectedDuration}-minute time slots, but you don't have any ${parsedData.detectedDuration}min event types configured.
              </div>
              <button class="create-event-type-btn" style="
                background: #000;
                color: #fff;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                font-family: inherit;
                transition: background 0.15s;
              ">
                Create ${parsedData.detectedDuration}min Event Type
              </button>
            `;
            contentContainer.appendChild(noMatchDiv);

            // Add click handler for create button
            const createBtn = noMatchDiv.querySelector(".create-event-type-btn");
            createBtn?.addEventListener("click", () => {
              // Get username from any existing event type, or use a default
              const username =
                eventTypes.length > 0 ? eventTypes[0].users?.[0]?.username || "user" : "user";

              const createUrl = `https://app.cal.com/event-types?dialog=new&eventPage=${username}`;
              window.open(createUrl, "_blank");
              showGmailNotification(
                `Opening Cal.com to create ${parsedData.detectedDuration}min event type`,
                "success"
              );

              console.log("Cal.com: Opening create URL:", createUrl);
            });

            createBtn?.addEventListener("mouseenter", (e) => {
              (e.target as HTMLElement).style.backgroundColor = "#333";
            });

            createBtn?.addEventListener("mouseleave", (e) => {
              (e.target as HTMLElement).style.backgroundColor = "#000";
            });

            return; // Don't show slots if no matching event types
          }

          // Event type selector (only show matching event types)
          const selectorDiv = document.createElement("div");
          selectorDiv.style.cssText =
            "padding: 12px 16px; border-bottom: 1px solid #e5e5ea; background: #f8f9fa; position: relative; z-index: 5; pointer-events: auto;";

          // Create label
          const label = document.createElement("label");
          label.style.cssText =
            "font-size: 12px; color: #666; font-weight: 500; display: block; margin-bottom: 6px;";
          label.textContent =
            matchingEventTypes.length === 1
              ? `Event Type (${parsedData.detectedDuration}min)`
              : `Select ${parsedData.detectedDuration}min Event Type`;
          selectorDiv.appendChild(label);

          // Track selected event type
          let selectedEventTypeIndex = 0;

          if (matchingEventTypes.length === 1) {
            // Single event type - just show it
            const displayDiv = document.createElement("div");
            displayDiv.style.cssText = `
              padding: 10px 12px;
              border: 1px solid #e5e5ea;
              border-radius: 8px;
              font-size: 14px;
              background: white;
              font-family: inherit;
              color: #000;
              font-weight: 500;
              box-sizing: border-box;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            `;
            displayDiv.textContent = matchingEventTypes[0].title;
            selectorDiv.appendChild(displayDiv);
          } else {
            // Multiple event types - custom dropdown
            const customDropdown = document.createElement("div");
            customDropdown.className = "custom-event-type-dropdown";
            customDropdown.style.cssText = "position: relative;";

            // Selected display button
            const selectedDisplay = document.createElement("div");
            selectedDisplay.style.cssText = `
              padding: 10px 12px;
              border: 1px solid #e5e5ea;
              border-radius: 8px;
              font-size: 14px;
              background: white;
              font-family: inherit;
              color: #000;
              cursor: pointer;
              box-sizing: border-box;
              display: flex;
              justify-content: space-between;
              align-items: center;
              transition: border-color 0.15s;
              pointer-events: auto;
            `;
            selectedDisplay.innerHTML = `
              <span class="selected-text">${matchingEventTypes[0].title} (${matchingEventTypes[0].lengthInMinutes}min)</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="flex-shrink: 0; margin-left: 8px;">
                <path d="M2 4L6 8L10 4" stroke="#666" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            `;

            // Dropdown options container
            const optionsContainer = document.createElement("div");
            optionsContainer.style.cssText = `
              position: absolute;
              top: 100%;
              left: 0;
              right: 0;
              margin-top: 4px;
              background: white;
              border: 1px solid #e5e5ea;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
              max-height: 200px;
              overflow-y: auto;
              display: none;
              z-index: 1000;
              pointer-events: auto;
            `;

            // Create options
            matchingEventTypes.forEach((et: any, index: number) => {
              const option = document.createElement("div");
              option.className = "dropdown-option";
              option.style.cssText = `
                padding: 10px 12px;
                font-size: 14px;
                color: #000;
                cursor: pointer;
                transition: background-color 0.1s;
                border-bottom: ${index < matchingEventTypes.length - 1 ? "1px solid #f0f0f0" : "none"};
                pointer-events: auto;
              `;
              option.textContent = `${et.title} (${et.lengthInMinutes}min)`;
              option.setAttribute("data-index", index.toString());

              // Hover effect
              option.addEventListener("mouseenter", () => {
                option.style.backgroundColor = "#f8f9fa";
              });
              option.addEventListener("mouseleave", () => {
                option.style.backgroundColor = "white";
              });

              // Click to select
              option.addEventListener("click", (e) => {
                e.stopPropagation();
                selectedEventTypeIndex = index;
                const selectedText = selectedDisplay.querySelector(".selected-text");
                if (selectedText) {
                  selectedText.textContent = `${et.title} (${et.lengthInMinutes}min)`;
                }
                optionsContainer.style.display = "none";
                console.log("Cal.com: Event type changed to:", et.slug);
              });

              optionsContainer.appendChild(option);
            });

            // Toggle dropdown on click
            selectedDisplay.addEventListener("click", (e) => {
              e.stopPropagation();
              const isOpen = optionsContainer.style.display === "block";
              optionsContainer.style.display = isOpen ? "none" : "block";
              selectedDisplay.style.borderColor = isOpen ? "#e5e5ea" : "#000";
            });

            // Hover effect on selected display
            selectedDisplay.addEventListener("mouseenter", () => {
              selectedDisplay.style.borderColor = "#000";
            });
            selectedDisplay.addEventListener("mouseleave", () => {
              if (optionsContainer.style.display !== "block") {
                selectedDisplay.style.borderColor = "#e5e5ea";
              }
            });

            customDropdown.appendChild(selectedDisplay);
            customDropdown.appendChild(optionsContainer);
            selectorDiv.appendChild(customDropdown);

            // Close dropdown when clicking outside (with cleanup)
            const closeDropdown = (e: MouseEvent) => {
              if (!customDropdown.contains(e.target as Node)) {
                optionsContainer.style.display = "none";
                selectedDisplay.style.borderColor = "#e5e5ea";
              }
            };
            document.addEventListener("click", closeDropdown);

            // Clean up listener when modal closes
            backdrop.addEventListener(
              "remove",
              () => {
                document.removeEventListener("click", closeDropdown);
              },
              { once: true }
            );
          }

          contentContainer.appendChild(selectorDiv);

          // Time slots list
          const slotsContainer = document.createElement("div");
          slotsContainer.style.cssText = "padding: 12px;";

          parsedData.slots.forEach((slot: any, index: number) => {
            const slotItem = document.createElement("div");
            slotItem.style.cssText = `
              padding: 14px;
              margin: 6px 0;
              border: 1px solid #e5e5ea;
              border-radius: 10px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              transition: all 0.15s;
              cursor: default;
              background: white;
            `;

            slotItem.innerHTML = `
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 13px; font-weight: 600; color: #000; margin-bottom: 4px;">${slot.date}</div>
                <div style="font-size: 12px; color: #666;">${slot.startTime} – ${slot.endTime}</div>
              </div>
              <button class="insert-slot-btn" data-slot-index="${index}" style="
                background: #000;
                color: #fff;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
                transition: background 0.15s;
                white-space: nowrap;
                font-family: inherit;
                pointer-events: auto;
              ">Insert Link</button>
            `;

            // Add pointer events to slot item
            slotItem.style.pointerEvents = "auto";

            // Hover effect on entire slot item
            slotItem.addEventListener("mouseenter", () => {
              console.log("Cal.com: Mouse entered slot", index);
              slotItem.style.borderColor = "#000";
              slotItem.style.backgroundColor = "#f8f9fa";
              const btn = slotItem.querySelector(".insert-slot-btn") as HTMLElement;
              if (btn) btn.style.backgroundColor = "#333";
            });

            slotItem.addEventListener("mouseleave", () => {
              slotItem.style.borderColor = "#e5e5ea";
              slotItem.style.backgroundColor = "white";
              const btn = slotItem.querySelector(".insert-slot-btn") as HTMLElement;
              if (btn) btn.style.backgroundColor = "#000";
            });

            slotsContainer.appendChild(slotItem);
          });

          contentContainer.appendChild(slotsContainer);

          // Add event listeners for insert buttons
          const insertButtons = menu.querySelectorAll(".insert-slot-btn");

          console.log("Cal.com: Found", insertButtons.length, "insert buttons");

          insertButtons.forEach((btn) => {
            btn.addEventListener("click", (e) => {
              console.log("Cal.com: Insert button clicked!");
              e.preventDefault();
              e.stopPropagation();
              const slotIndex = parseInt(btn.getAttribute("data-slot-index")!);
              const slot = parsedData.slots[slotIndex];
              console.log("Cal.com: Inserting link for slot", slotIndex, slot);

              // Get selected event type from the tracked index
              const selectedEventType = matchingEventTypes[selectedEventTypeIndex];
              const selectedSlug = selectedEventType.slug;
              const selectedUsername = selectedEventType.users?.[0]?.username || "user";

              // Generate Cal.com URL with slot parameters
              const baseUrl = `https://cal.com/${selectedUsername}/${selectedSlug}`;
              const params = new URLSearchParams({
                overlayCalendar: "true",
                date: slot.isoDate,
                slot: slot.isoTimestamp,
              });
              const calcomUrl = `${baseUrl}?${params.toString()}`;

              console.log("Cal.com: Generated URL:", calcomUrl);

              // Insert link into Gmail compose (pass chipElement to target the correct compose window)
              const inserted = insertGmailText(calcomUrl, chipElement);

              if (inserted) {
                showGmailNotification("Cal.com link inserted!", "success");
                backdrop.remove();

                // Immediately remove the Google chip and its action bar
                try {
                  const scheduleId = chipElement.getAttribute("data-ad-hoc-schedule-id");
                  const actionBar = scheduleId
                    ? document.querySelector(
                        `.cal-companion-action-bar[data-schedule-id="${scheduleId}"]`
                      )
                    : chipElement.parentElement?.querySelector(".cal-companion-action-bar");

                  chipElement.remove();

                  if (actionBar) {
                    if ((actionBar as any).__cleanup) {
                      (actionBar as any).__cleanup();
                    }
                    actionBar.remove();
                  }
                } catch (removeError) {
                  console.warn("Cal.com: Failed to remove chip/action bar:", removeError);
                }
              } else {
                showGmailNotification("Failed to insert link", "error");
              }
            });
          });
        } catch (error) {
          console.error("Error showing Cal.com suggestion menu:", error);
          loadingDiv.remove();

          const errorMessage = error instanceof Error ? error.message : "";
          const isContextInvalidated = errorMessage.includes("Extension context invalidated");
          const isAuthError =
            errorMessage.includes("OAuth") ||
            errorMessage.includes("access token") ||
            errorMessage.includes("sign in") ||
            errorMessage.includes("authentication");

          // Show user-friendly error message
          const errorDiv = document.createElement("div");
          errorDiv.style.cssText = "padding: 24px 20px; text-align: center;";

          if (isAuthError) {
            // Not logged in - close backdrop and open sidebar directly
            backdrop.remove();
            openSidebar();
            return;
          } else if (isContextInvalidated) {
            // Extension reloaded error
            errorDiv.innerHTML = `
            <div style="margin-bottom: 12px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" stroke-width="1.5" style="margin: 0 auto;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>
            <div style="font-size: 14px; font-weight: 600; color: #000; margin-bottom: 8px;">
                Extension Reloaded
            </div>
            <div style="font-size: 13px; color: #666; margin-bottom: 16px; line-height: 1.5;">
                The extension was updated. Please reload this page to continue.
            </div>
              <button class="reload-page-btn" style="
                  background: #ff6b6b;
                  color: #fff;
                  border: none;
                  padding: 10px 20px;
                  border-radius: 8px;
                  cursor: pointer;
                  font-size: 14px;
                  font-weight: 600;
                  font-family: inherit;
                  transition: background 0.15s;
                ">
                  Reload Page
              </button>
          `;

            contentContainer.appendChild(errorDiv);

            const reloadBtn = errorDiv.querySelector(".reload-page-btn");
            reloadBtn?.addEventListener("click", () => {
              window.location.reload();
            });
            reloadBtn?.addEventListener("mouseenter", (e) => {
              (e.target as HTMLElement).style.backgroundColor = "#ff5252";
            });
            reloadBtn?.addEventListener("mouseleave", (e) => {
              (e.target as HTMLElement).style.backgroundColor = "#ff6b6b";
            });
          } else {
            // Generic error
            errorDiv.innerHTML = `
              <div style="margin-bottom: 12px;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto; display: block;">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div style="font-size: 14px; font-weight: 600; color: #111827; margin-bottom: 8px;">
                Something went wrong
              </div>
              <div style="font-size: 13px; color: #6B7280; margin-bottom: 16px;">
                Failed to load event types. Please try again.
              </div>
            `;

            contentContainer.appendChild(errorDiv);
          }
        }
      }

      /**
       * Parse Google Calendar scheduling chip
       * Returns null if structure has changed or parsing fails (fail gracefully)
       */
      function parseGoogleChip(chipElement: HTMLElement): any {
        try {
          // Validate input
          if (!chipElement || typeof chipElement.getAttribute !== "function") {
            console.warn("Cal.com: Invalid chip element passed to parser");
            return null;
          }

          // Get schedule ID - if this is missing, this might not be a valid chip
          const scheduleId = chipElement.getAttribute("data-ad-hoc-schedule-id");

          if (!scheduleId) {
            // Silently return - this is likely not a fully-loaded chip
            // (happens frequently during Gmail DOM updates)
            return null;
          }

          console.log(
            "Cal.com: Valid chip detected - Schedule ID:",
            scheduleId?.slice(0, 20) + "..."
          );

          // Parse timezone (non-critical - fallback to UTC if structure changed)
          let timezone = "UTC";
          let timezoneOffset = "GMT+00:00";

          try {
            // First, try to get the IANA timezone from data-ad-hoc-v2-params
            const paramsAttr = chipElement.getAttribute("data-ad-hoc-v2-params");
            console.log("Cal.com: data-ad-hoc-v2-params:", paramsAttr);

            if (paramsAttr) {
              // The timezone is at the end of the params string, like: "Asia/Kolkata"
              // Try multiple patterns as Gmail might format it differently
              let tzMatch = paramsAttr.match(/&quot;([^&]+)&quot;\]/);

              // Also try without HTML entities
              if (!tzMatch) {
                tzMatch = paramsAttr.match(/"([^"]+)"\]/);
              }

              // Also try with escaped quotes
              if (!tzMatch) {
                tzMatch = paramsAttr.match(/\\"([^\\]+)\\"\]/);
              }

              if (tzMatch && tzMatch[1]) {
                timezone = tzMatch[1]; // e.g., "Asia/Kolkata"
                console.log("Cal.com: ✅ Parsed IANA timezone from data attribute:", timezone);
              } else {
                console.warn("Cal.com: ⚠️ Failed to extract timezone from params attribute");
              }
            } else {
              console.warn("Cal.com: ⚠️ No data-ad-hoc-v2-params attribute found");
            }

            // Also get the display timezone and offset from the UI text
            const timezoneText = chipElement.querySelector("td")?.textContent?.trim() || "";
            const timezoneMatch = timezoneText.match(/^(.+?)\s*-\s*(.+?)\s*\((.+?)\)$/);

            if (timezoneMatch) {
              timezoneOffset = timezoneMatch[3]?.trim() || "GMT+00:00";
              console.log("Cal.com: Parsed timezone offset from UI:", timezoneOffset);
            }
          } catch (tzError) {
            // Non-critical error - continue with default timezone
            console.warn("Cal.com: Failed to parse timezone, using UTC:", tzError);
          }

          // Find all time slot links - critical for functionality
          let slotLinks: Element[] = [];
          try {
            slotLinks = Array.from(chipElement.querySelectorAll("a[href*='slotStartTime']"));
          } catch (error) {
            console.warn("Cal.com: Failed to find slot links:", error);
            return null;
          }

          if (slotLinks.length === 0) {
            // Gmail structure might have changed or chip not fully loaded
            return null;
          }

          const slots: any[] = [];
          let detectedDuration = 60;

          slotLinks.forEach((link) => {
            try {
              const href = (link as HTMLAnchorElement).href;
              if (!href) return;

              const url = new URL(href);

              const slotStartTime = url.searchParams.get("slotStartTime");
              const slotDurationMinutes = url.searchParams.get("slotDurationMinutes");

              if (!slotStartTime || !slotDurationMinutes) return;

              const durationMinutes = parseInt(slotDurationMinutes, 10);
              if (isNaN(durationMinutes) || durationMinutes <= 0) return;

              detectedDuration = durationMinutes;

              const startTimestamp = parseInt(slotStartTime, 10);
              if (isNaN(startTimestamp)) return;

              const startDate = new Date(startTimestamp);
              const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

              // Validate dates
              if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return;

              const dateOptions: Intl.DateTimeFormatOptions = {
                weekday: "short",
                day: "numeric",
                month: "long",
              };
              const timeOptions: Intl.DateTimeFormatOptions = {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              };

              const date = startDate.toLocaleDateString("en-US", dateOptions);
              const startTime = startDate.toLocaleTimeString("en-US", timeOptions).toLowerCase();
              const endTime = endDate.toLocaleTimeString("en-US", timeOptions).toLowerCase();

              const isoDate = startDate.toISOString().split("T")[0];
              const isoTimestamp = startDate.toISOString();

              slots.push({
                date,
                startTime,
                endTime,
                durationMinutes,
                isoDate,
                isoTimestamp,
                googleUrl: href,
              });
            } catch (slotError) {
              // Skip individual slot if it fails - don't break entire parsing
              console.warn("Cal.com: Failed to parse individual slot:", slotError);
            }
          });

          if (slots.length === 0) {
            // No valid slots found - Gmail structure might have changed
            return null;
          }

          console.log(
            `Cal.com: ✅ Parsed chip - ${slots.length} slots, ${detectedDuration}min, timezone: ${timezone}`
          );

          return {
            scheduleId,
            timezone,
            timezoneOffset,
            slots,
            detectedDuration,
          };
        } catch (error) {
          // Critical error in parsing - fail gracefully without breaking Gmail
          console.warn(
            "Cal.com: Failed to parse Google chip (Gmail structure may have changed):",
            error
          );
          return null;
        }
      }

      // Start watching for Google Calendar chips
      watchForGoogleChips();
    }
  },
});

function defineContentScript(config: { matches: string[]; main: () => void }) {
  return config;
}
