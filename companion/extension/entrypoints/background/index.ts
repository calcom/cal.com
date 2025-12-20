/// <reference types="chrome" />

import type { OAuthTokens } from "../../../services/oauthService";

const DEV_API_KEY = import.meta.env.EXPO_PUBLIC_CAL_API_KEY as string | undefined;
const IS_DEV_MODE = Boolean(DEV_API_KEY && DEV_API_KEY.length > 0);
const BROWSER_TARGET = import.meta.env.BROWSER_TARGET || "chrome";

const devLog = {
  log: (...args: unknown[]) => IS_DEV_MODE && console.log("[Cal.com]", ...args),
  warn: (...args: unknown[]) => IS_DEV_MODE && console.warn("[Cal.com]", ...args),
  error: (...args: unknown[]) => console.error("[Cal.com]", ...args),
};

/**
 * Browser type enum (inlined to avoid import issues in service worker)
 */
enum BrowserType {
  Chrome = "chrome",
  Firefox = "firefox",
  Safari = "safari",
  Edge = "edge",
  Brave = "brave",
  Unknown = "unknown",
}

/**
 * Detect browser type based on user agent and APIs
 */
function detectBrowser(): BrowserType {
  if (typeof navigator === "undefined") {
    return BrowserType.Unknown;
  }

  const userAgent = navigator.userAgent.toLowerCase();

  // Check for Brave
  // @ts-ignore - Brave adds this to navigator
  if (navigator.brave && typeof navigator.brave.isBrave === "function") {
    return BrowserType.Brave;
  }

  // Check for Edge
  if (userAgent.includes("edg/")) {
    return BrowserType.Edge;
  }

  // Check for Firefox
  if (userAgent.includes("firefox")) {
    return BrowserType.Firefox;
  }

  // Check for Safari
  if (
    userAgent.includes("safari") &&
    !userAgent.includes("chrome") &&
    !userAgent.includes("chromium")
  ) {
    return BrowserType.Safari;
  }

  // Default to Chrome
  if (userAgent.includes("chrome") || userAgent.includes("chromium")) {
    return BrowserType.Chrome;
  }

  return BrowserType.Unknown;
}

/**
 * Get browser display name for logging
 */
function getBrowserDisplayName(): string {
  const browser = detectBrowser();
  switch (browser) {
    case BrowserType.Chrome:
      return "Chrome";
    case BrowserType.Firefox:
      return "Firefox";
    case BrowserType.Safari:
      return "Safari";
    case BrowserType.Edge:
      return "Microsoft Edge";
    case BrowserType.Brave:
      return "Brave";
    default:
      return "Unknown Browser";
  }
}

/**
 * Cross-browser API helpers
 * These provide unified access to browser extension APIs across Chrome, Firefox, Safari, and Edge
 */

// Get the appropriate browser API namespace
function getBrowserAPI(): typeof chrome {
  // @ts-ignore - Firefox/Safari use browser namespace
  if (typeof browser !== "undefined" && browser.runtime) {
    // @ts-ignore
    return browser;
  }
  return chrome;
}

// Get identity API with cross-browser support
function getIdentityAPI(): typeof chrome.identity | null {
  const api = getBrowserAPI();
  return api?.identity || null;
}

// Get storage API with cross-browser support
function getStorageAPI(): typeof chrome.storage | null {
  const api = getBrowserAPI();
  return api?.storage || null;
}

// Get runtime API with cross-browser support
function getRuntimeAPI(): typeof chrome.runtime | null {
  const api = getBrowserAPI();
  return api?.runtime || null;
}

// Get tabs API with cross-browser support
function getTabsAPI(): typeof chrome.tabs | null {
  const api = getBrowserAPI();
  return api?.tabs || null;
}

// Get action API with cross-browser support
function getActionAPI(): typeof chrome.action | null {
  const api = getBrowserAPI();
  // @ts-ignore - Some browsers use browserAction instead of action
  return api?.action || api?.browserAction || null;
}

// Check if the URL is a restricted page where content scripts can't run
function isRestrictedUrl(url: string | undefined): boolean {
  if (!url) return true;

  // List of restricted URL patterns for all supported browsers
  const restrictedPatterns = [
    /^chrome:\/\//i, // Chrome internal pages (newtab, settings, extensions, etc.)
    /^chrome-extension:\/\//i, // Chrome extension pages
    /^edge:\/\//i, // Edge internal pages
    /^about:/i, // about:blank, about:newtab, etc.
    /^brave:\/\//i, // Brave internal pages
    /^opera:\/\//i, // Opera internal pages
    /^vivaldi:\/\//i, // Vivaldi internal pages
    /^file:\/\//i, // Local files (content scripts often blocked)
    /^view-source:/i, // View source pages
    /^devtools:\/\//i, // DevTools pages
    /^data:/i, // Data URLs
    /^blob:/i, // Blob URLs
    /^moz-extension:\/\//i, // Firefox extension pages
    /^safari-extension:\/\//i, // Safari extension pages
    /^safari-web-extension:\/\//i, // Safari web extension pages
  ];

  return restrictedPatterns.some((pattern) => pattern.test(url));
}

// Open cal.com/app (Framer marketing page) in a new tab with auto-open parameter
function openAppPage(): void {
  const tabsAPI = getTabsAPI();
  if (tabsAPI) {
    tabsAPI.create({ url: "https://cal.com/app?openExtension=true" });
  }
}

// @ts-ignore - WXT provides this globally
export default defineBackground(() => {
  const browserType = detectBrowser();
  const browserName = getBrowserDisplayName();

  if (IS_DEV_MODE) {
    devLog.log("DEV MODE - API Key authentication enabled for testing");
    devLog.log(`Browser: ${browserName}, Target: ${BROWSER_TARGET}`);
  }

  const actionAPI = getActionAPI();
  const runtimeAPI = getRuntimeAPI();
  const tabsAPI = getTabsAPI();
  const storageAPI = getStorageAPI();

  if (actionAPI) {
    actionAPI.onClicked.addListener((tab) => {
      // Check if this is a restricted URL where content scripts can't run
      if (isRestrictedUrl(tab.url)) {
        devLog.log("Restricted URL detected, opening app page:", tab.url);
        openAppPage();
        return;
      }

      if (tab.id && tabsAPI) {
        tabsAPI.sendMessage(tab.id, { action: "icon-clicked" }, () => {
          // Ignore errors - expected on pages where content script hasn't loaded yet
          // The restricted URL check above handles pages where content scripts can't run
          const runtime = getRuntimeAPI();
          if (runtime) void runtime.lastError;
        });
      }
    });
  }

  if (runtimeAPI) {
    runtimeAPI.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "fetch-event-types") {
        fetchEventTypes()
          .then((eventTypes) => sendResponse({ data: eventTypes }))
          .catch((error) => sendResponse({ error: error.message }));
        return true;
      }

      if (message.action === "start-extension-oauth") {
        const authUrl = message.authUrl as string;
        const state = new URL(authUrl).searchParams.get("state");

        if (state && storageAPI?.local) {
          storageAPI.local.set({ oauth_state: state }, () => {
            const runtime = getRuntimeAPI();
            if (runtime?.lastError) {
              devLog.warn("Failed to store OAuth state:", runtime.lastError.message);
            }
          });
        }

        handleExtensionOAuth(authUrl)
          .then((responseUrl) => sendResponse({ success: true, responseUrl }))
          .catch((error) => sendResponse({ success: false, error: error.message }));
        return true;
      }

      if (message.action === "exchange-oauth-tokens") {
        handleTokenExchange(message.tokenRequest, message.tokenEndpoint, message.state)
          .then((tokens) => sendResponse({ success: true, tokens }))
          .catch((error) => sendResponse({ success: false, error: error.message }));
        return true;
      }

      if (message.action === "sync-oauth-tokens") {
        const tokens = message.tokens as OAuthTokens | null;

        if (isRateLimited()) {
          devLog.warn("Token sync rate limited");
          sendResponse({ success: false, error: "Rate limited. Please try again later." });
          return true;
        }

        if (!tokens || !tokens.accessToken) {
          sendResponse({ success: false, error: "No valid tokens provided" });
          return true;
        }

        validateTokens(tokens)
          .then((isValid) => {
            if (!isValid) {
              devLog.warn("Token sync rejected: invalid tokens");
              sendResponse({ success: false, error: "Invalid tokens" });
              return;
            }

            recordTokenOperation();
            if (storageAPI?.local) {
              storageAPI.local.set({ cal_oauth_tokens: JSON.stringify(tokens) }, () => {
                const runtime = getRuntimeAPI();
                if (runtime?.lastError) {
                  devLog.error("Failed to sync OAuth tokens:", runtime.lastError.message);
                  sendResponse({ success: false, error: runtime.lastError.message });
                } else {
                  devLog.log("OAuth tokens synced to storage (validated)");
                  sendResponse({ success: true });
                }
              });
            }
          })
          .catch((error) => {
            devLog.error("Token validation failed:", error);
            sendResponse({ success: false, error: "Token validation failed" });
          });

        return true;
      }

      if (message.action === "clear-oauth-tokens") {
        if (isRateLimited()) {
          devLog.warn("Token clear rate limited");
          sendResponse({ success: false, error: "Rate limited. Please try again later." });
          return true;
        }

        recordTokenOperation();
        if (storageAPI?.local) {
          storageAPI.local.remove(["cal_oauth_tokens", "oauth_state"], () => {
            const runtime = getRuntimeAPI();
            if (runtime?.lastError) {
              devLog.error("Failed to clear OAuth tokens:", runtime.lastError.message);
              sendResponse({ success: false, error: runtime.lastError.message });
            } else {
              devLog.log("OAuth tokens cleared from storage");
              sendResponse({ success: true });
            }
          });
        }
        return true;
      }

      return false;
    });
  }
});

async function handleExtensionOAuth(authUrl: string): Promise<string> {
  const identityAPI = getIdentityAPI();
  const browserType = detectBrowser();

  if (!identityAPI) {
    throw new Error(`Identity API not available in ${getBrowserDisplayName()}`);
  }

  if (IS_DEV_MODE && identityAPI.getRedirectURL) {
    const expectedRedirectUrl = identityAPI.getRedirectURL();
    const redirectUri = new URL(authUrl).searchParams.get("redirect_uri");

    devLog.log("Starting OAuth flow");
    devLog.log("Browser:", getBrowserDisplayName());
    devLog.log("Expected redirect URL:", expectedRedirectUrl);
    devLog.log("Auth URL redirect_uri:", redirectUri);

    if (redirectUri && !redirectUri.startsWith(expectedRedirectUrl.replace(/\/$/, ""))) {
      devLog.warn(
        "MISMATCH! redirect_uri does not match expected URL.",
        "\nExpected:",
        expectedRedirectUrl,
        "\nGot:",
        redirectUri
      );
    }
  }

  return new Promise((resolve, reject) => {
    // Firefox and Safari use Promise-based API
    if (browserType === BrowserType.Firefox || browserType === BrowserType.Safari) {
      try {
        // @ts-ignore - Firefox/Safari return Promises
        const result = identityAPI.launchWebAuthFlow({ url: authUrl, interactive: true });

        if (result && typeof result.then === "function") {
          result
            .then((responseUrl: string | undefined) => {
              if (responseUrl) {
                devLog.log("OAuth successful");
                resolve(responseUrl);
              } else {
                devLog.error("OAuth flow returned no response URL");
                reject(new Error("OAuth flow cancelled or failed"));
              }
            })
            .catch((error: Error) => {
              devLog.error("OAuth flow failed:", error.message);
              reject(new Error(`OAuth flow failed: ${error.message}`));
            });
          return;
        }
      } catch {
        // Fall through to callback-based API
      }
    }

    // Chrome/Edge use callback-based API
    identityAPI.launchWebAuthFlow({ url: authUrl, interactive: true }, (responseUrl) => {
      const runtimeAPI = getRuntimeAPI();
      if (runtimeAPI?.lastError) {
        devLog.error("OAuth flow failed:", runtimeAPI.lastError.message);
        reject(new Error(`OAuth flow failed: ${runtimeAPI.lastError.message}`));
      } else if (responseUrl) {
        devLog.log("OAuth successful");
        resolve(responseUrl);
      } else {
        devLog.error("OAuth flow returned no response URL");
        reject(new Error("OAuth flow cancelled or failed"));
      }
    });
  });
}

async function handleTokenExchange(
  tokenRequest: Record<string, string>,
  tokenEndpoint: string,
  state?: string
): Promise<OAuthTokens> {
  if (state) {
    await validateOAuthState(state);
  }

  const body = new URLSearchParams(tokenRequest);

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorData = await response.text();
    devLog.error("Token exchange error response:", errorData);
    throw new Error(`Token exchange failed: ${response.status} ${errorData}`);
  }

  const tokenData = await response.json();

  const tokens: OAuthTokens = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    tokenType: tokenData.token_type || "Bearer",
    expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
    scope: tokenData.scope,
  };

  try {
    const storageAPI = getStorageAPI();
    if (storageAPI?.local) {
      await storageAPI.local.set({ cal_oauth_tokens: JSON.stringify(tokens) });
      devLog.log("OAuth tokens stored in storage");
    }
  } catch (storageError) {
    devLog.error("Failed to store OAuth tokens:", storageError);
  }

  return tokens;
}

async function validateOAuthState(state: string): Promise<void> {
  const storageAPI = getStorageAPI();
  if (!storageAPI?.local) {
    devLog.warn("Storage API not available for state validation");
    return;
  }

  try {
    const result = await storageAPI.local.get(["oauth_state"]);
    const storedState = result.oauth_state as string | undefined;

    if (storedState && storedState !== state) {
      await storageAPI.local.remove("oauth_state");
      devLog.error("State parameter mismatch - possible CSRF attack");
      throw new Error("Invalid state parameter - possible CSRF attack");
    }

    if (storedState === state) {
      await storageAPI.local.remove("oauth_state");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Invalid state parameter")) {
      throw error;
    }
    devLog.warn("State validation warning:", error);
  }
}

const API_BASE_URL = "https://api.cal.com/v2";

const tokenOperationTimestamps: number[] = [];
const TOKEN_RATE_LIMIT_WINDOW_MS = 60000;
const TOKEN_RATE_LIMIT_MAX_OPS = 5;

function isRateLimited(): boolean {
  const now = Date.now();
  while (
    tokenOperationTimestamps.length > 0 &&
    tokenOperationTimestamps[0] < now - TOKEN_RATE_LIMIT_WINDOW_MS
  ) {
    tokenOperationTimestamps.shift();
  }
  return tokenOperationTimestamps.length >= TOKEN_RATE_LIMIT_MAX_OPS;
}

function recordTokenOperation(): void {
  tokenOperationTimestamps.push(Date.now());
}

async function validateTokens(tokens: OAuthTokens): Promise<boolean> {
  if (!tokens.accessToken) {
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/me`, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Content-Type": "application/json",
        "cal-api-version": "2024-06-11",
      },
    });

    if (response.ok) {
      devLog.log("Token validation successful");
      return true;
    }

    devLog.warn("Token validation failed:", response.status);
    return false;
  } catch (error) {
    devLog.error("Token validation error:", error);
    return false;
  }
}

async function getAuthHeader(): Promise<string> {
  const storageAPI = getStorageAPI();

  if (storageAPI?.local) {
    const result = await storageAPI.local.get(["cal_oauth_tokens"]);
    const oauthTokens = result.cal_oauth_tokens
      ? (JSON.parse(result.cal_oauth_tokens as string) as OAuthTokens)
      : null;

    if (oauthTokens?.accessToken) {
      return `Bearer ${oauthTokens.accessToken}`;
    }
  }

  if (IS_DEV_MODE && DEV_API_KEY) {
    devLog.log("Using API Key for authentication (DEV MODE)");
    return `Bearer ${DEV_API_KEY}`;
  }

  throw new Error("No OAuth access token found. Please sign in with OAuth.");
}

async function fetchEventTypes(): Promise<unknown[]> {
  const authHeader = await getAuthHeader();

  const userResponse = await fetch(`${API_BASE_URL}/me`, {
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
      "cal-api-version": "2024-06-11",
    },
  });

  if (!userResponse.ok) {
    throw new Error(`Failed to get user: ${userResponse.statusText}`);
  }

  const userData = await userResponse.json();
  const username = userData?.data?.username as string | undefined;

  const params = new URLSearchParams();
  if (username) {
    params.append("username", username);
  }
  const queryString = params.toString();
  const endpoint = `${API_BASE_URL}/event-types${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(endpoint, {
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
      "cal-api-version": "2024-06-14",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch event types: ${response.statusText}`);
  }

  const data = await response.json();

  if (Array.isArray(data)) {
    return data;
  }
  if (data?.data && Array.isArray(data.data)) {
    return data.data;
  }
  if (data?.eventTypes && Array.isArray(data.eventTypes)) {
    return data.eventTypes;
  }

  return [];
}
