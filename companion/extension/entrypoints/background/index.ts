/// <reference types="chrome" />
import type { OAuthTokens } from "../../../services/oauthService";
import type { Booking } from "../../../services/types/bookings.types";

const DEV_API_KEY = import.meta.env.EXPO_PUBLIC_CAL_API_KEY as string | undefined;
const IS_DEV_MODE = Boolean(DEV_API_KEY && DEV_API_KEY.length > 0);
const BROWSER_TARGET = import.meta.env.BROWSER_TARGET || "chrome";

const devLog = {
  log: (...args: unknown[]) => IS_DEV_MODE && console.log("[Cal.com]", ...args),
  warn: (...args: unknown[]) => IS_DEV_MODE && console.warn("[Cal.com]", ...args),
  error: (...args: unknown[]) => console.error("[Cal.com]", ...args),
};

/**
 * Request timeout in milliseconds (30 seconds)
 */
const REQUEST_TIMEOUT_MS = 30000;

/**
 * Fetch with timeout to prevent hanging requests
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Safely parse JSON with validation for OAuthTokens
 */
function safeParseOAuthTokens(jsonString: string): OAuthTokens | null {
  if (typeof jsonString !== "string" || !jsonString.trim()) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(jsonString);

    // Validate it's a plain object (not null, array, or primitive)
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      Object.getPrototypeOf(parsed) !== Object.prototype
    ) {
      devLog.warn("Invalid OAuth tokens structure - not a plain object");
      return null;
    }

    const obj = parsed as Record<string, unknown>;

    // Validate required fields: accessToken and tokenType must be strings
    if (typeof obj.accessToken !== "string") {
      devLog.warn("Invalid OAuth tokens structure - missing accessToken");
      return null;
    }

    if (typeof obj.tokenType !== "string") {
      devLog.warn("Invalid OAuth tokens structure - missing tokenType");
      return null;
    }

    // Validate optional fields have correct types if present
    if (obj.refreshToken !== undefined && typeof obj.refreshToken !== "string") {
      devLog.warn("Invalid OAuth tokens structure - invalid refreshToken type");
      return null;
    }

    if (obj.expiresAt !== undefined && typeof obj.expiresAt !== "number") {
      devLog.warn("Invalid OAuth tokens structure - invalid expiresAt type");
      return null;
    }

    if (obj.scope !== undefined && typeof obj.scope !== "string") {
      devLog.warn("Invalid OAuth tokens structure - invalid scope type");
      return null;
    }

    // Construct validated OAuthTokens object
    const tokens: OAuthTokens = {
      accessToken: obj.accessToken,
      tokenType: obj.tokenType,
    };

    if (typeof obj.refreshToken === "string") {
      tokens.refreshToken = obj.refreshToken;
    }

    if (typeof obj.expiresAt === "number") {
      tokens.expiresAt = obj.expiresAt;
    }

    if (typeof obj.scope === "string") {
      tokens.scope = obj.scope;
    }

    return tokens;
  } catch (error) {
    devLog.warn("Failed to parse OAuth tokens:", error);
    return null;
  }
}

/**
 * Safely parse JSON error response with structure validation.
 * Validates the expected error response structure before returning.
 */
function safeParseErrorJson(
  jsonString: string
): { error?: { message?: string }; message?: string } | null {
  if (typeof jsonString !== "string" || !jsonString.trim()) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(jsonString);

    // Validate it's a plain object
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      Object.getPrototypeOf(parsed) !== Object.prototype
    ) {
      return null;
    }

    const obj = parsed as Record<string, unknown>;

    // Validate expected error structure - must have error or message property with correct types
    const hasValidErrorProp =
      obj.error === undefined ||
      (typeof obj.error === "object" &&
        obj.error !== null &&
        !Array.isArray(obj.error) &&
        ((obj.error as Record<string, unknown>).message === undefined ||
          typeof (obj.error as Record<string, unknown>).message === "string"));

    const hasValidMessageProp = obj.message === undefined || typeof obj.message === "string";

    if (hasValidErrorProp && hasValidMessageProp) {
      return obj as { error?: { message?: string }; message?: string };
    }

    return null;
  } catch {
    return null;
  }
}

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

/**
 * Extended browser API interface that includes browserAction (Manifest V2)
 * Safari uses browserAction instead of action
 */
interface BrowserAPIWithLegacyAction {
  action?: typeof chrome.action;
  browserAction?: typeof chrome.action;
}

// Get the appropriate browser API namespace
function getBrowserAPI(): typeof chrome {
  if (typeof browser !== "undefined" && browser?.runtime) {
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
  // Safari uses browserAction (Manifest V2), Chrome uses action (Manifest V3)
  const apiWithLegacyAction = api as unknown as BrowserAPIWithLegacyAction;
  return api?.action || apiWithLegacyAction?.browserAction || null;
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

export default defineBackground(() => {
  const _browserType = detectBrowser();
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
    runtimeAPI.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.action === "fetch-event-types") {
        fetchEventTypes()
          .then((eventTypes) => sendResponse({ data: eventTypes }))
          .catch((error) => sendResponse({ error: error.message }));
        return true;
      }

      if (message.action === "start-extension-oauth") {
        const authUrl = message.authUrl as string;
        const state = new URL(authUrl).searchParams.get("state");

        // Store state before starting OAuth to prevent race conditions
        const storeState = async () => {
          if (!state) {
            throw new Error("No state parameter in auth URL");
          }
          if (!storageAPI?.local) {
            throw new Error("Storage API not available");
          }
          try {
            await storageAPI.local.set({ oauth_state: state });
          } catch (error) {
            devLog.error("Failed to store OAuth state:", error);
            throw new Error("Failed to initialize OAuth flow - cannot store state");
          }
        };

        storeState()
          .then(() => handleExtensionOAuth(authUrl))
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

      if (message.action === "check-auth-status") {
        checkAuthStatus()
          .then((isAuthenticated) => sendResponse({ isAuthenticated }))
          .catch((error) => sendResponse({ isAuthenticated: false, error: error.message }));
        return true;
      }

      if (message.action === "get-booking-status") {
        const { bookingUid } = message.payload as { bookingUid: string };

        getBookingStatus(bookingUid)
          .then((result) => sendResponse({ success: true, data: result }))
          .catch((error) => {
            devLog.error("Get booking status failed:", error);
            sendResponse({ success: false, error: error.message });
          });
        return true;
      }

      if (message.action === "mark-no-show") {
        const { bookingUid, attendeeEmail, absent } = message.payload as {
          bookingUid: string;
          attendeeEmail: string;
          absent: boolean;
        };

        markAttendeeNoShow(bookingUid, attendeeEmail, absent)
          .then((result) => sendResponse({ success: true, data: result }))
          .catch((error) => {
            devLog.error("Mark no-show failed:", error);
            sendResponse({ success: false, error: error.message });
          });
        return true;
      }

      return false;
    });
  }
});

async function handleExtensionOAuth(authUrl: string): Promise<string> {
  const browserType = detectBrowser();

  // Safari uses tabs-based OAuth flow
  if (browserType === BrowserType.Safari) {
    return handleSafariTabsOAuth(authUrl);
  }

  const identityAPI = getIdentityAPI();

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
    // Firefox uses Promise-based API
    if (browserType === BrowserType.Firefox) {
      try {
        const result = identityAPI.launchWebAuthFlow({
          url: authUrl,
          interactive: true,
        }) as Promise<string | undefined> | undefined;

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

/**
 * Handle Safari OAuth using tabs-based flow
 * Opens OAuth in a new tab and captures the redirect callback
 */
async function handleSafariTabsOAuth(authUrl: string): Promise<string> {
  // Extract the redirect URI to know what to watch for
  const redirectUri = new URL(authUrl).searchParams.get("redirect_uri");
  if (!redirectUri) {
    throw new Error("redirect_uri not found in auth URL");
  }

  const redirectUrlObj = new URL(redirectUri);
  const redirectOrigin = redirectUrlObj.origin; // scheme + host + port
  const redirectPath = redirectUrlObj.pathname;

  return new Promise((resolve, reject) => {
    const tabsAPI = getTabsAPI();
    if (!tabsAPI) {
      reject(new Error("Tabs API not available"));
      return;
    }

    let oauthTabId: number | null = null;
    let isResolved = false;

    const timeoutId = setTimeout(
      () => {
        if (!isResolved) {
          cleanup();
          reject(new Error("OAuth flow timed out after 5 minutes"));
        }
      },
      5 * 60 * 1000
    );

    const tabUpdateListener = (tabId: number, _changeInfo: unknown, tab: chrome.tabs.Tab) => {
      // Only process updates for our OAuth tab
      if (tabId !== oauthTabId) return;

      // Check if the tab navigated to the redirect URI
      if (tab.url) {
        try {
          const tabUrl = new URL(tab.url);

          // Check if this is our OAuth callback URL - exact origin and path match
          if (tabUrl.origin === redirectOrigin && tabUrl.pathname === redirectPath) {
            if (!isResolved) {
              const error = tabUrl.searchParams.get("error");
              if (error) {
                isResolved = true;
                cleanup();
                const errorDescription = tabUrl.searchParams.get("error_description") || error;

                // Close the tab after capturing error
                if (oauthTabId !== null) {
                  tabsAPI.remove(oauthTabId).catch(() => {
                    // Ignore errors when closing tab
                  });
                }

                reject(new Error(`OAuth error: ${errorDescription}`));
                return;
              }

              const code = tabUrl.searchParams.get("code");
              if (!code) {
                // No code yet, keep listening (might be an intermediate redirect)
                return;
              }

              const state = tabUrl.searchParams.get("state");
              if (!state) {
                isResolved = true;
                cleanup();

                // Close the tab
                if (oauthTabId !== null) {
                  tabsAPI.remove(oauthTabId).catch(() => {
                    // Ignore errors when closing tab
                  });
                }

                reject(new Error("No state parameter in OAuth callback"));
                return;
              }

              // State validation - only close tab after validation succeeds
              isResolved = true;
              cleanup();

              validateOAuthStateWithoutCleanup(state)
                .then(() => {
                  // State is valid, close the tab and resolve
                  // Note: State is NOT cleaned up here, token exchange will clean it up
                  if (oauthTabId !== null) {
                    tabsAPI.remove(oauthTabId).catch(() => {
                      // Ignore errors when closing tab
                    });
                  }
                  if (!tab.url) {
                    reject(new Error("Tab URL is undefined"));
                    return;
                  }
                  resolve(tab.url);
                })
                .catch((error) => {
                  // State validation failed, close the tab and reject
                  if (oauthTabId !== null) {
                    tabsAPI.remove(oauthTabId).catch(() => {
                      // Ignore errors when closing tab
                    });
                  }
                  reject(error);
                });
            }
          }
        } catch (_error) {
          // Invalid URL, ignore
        }
      }
    };

    // Listen for tab removal (user closed the OAuth tab)
    const tabRemovedListener = (tabId: number) => {
      if (tabId === oauthTabId && !isResolved) {
        isResolved = true;
        cleanup();
        reject(new Error("OAuth cancelled by user"));
      }
    };

    const cleanup = () => {
      clearTimeout(timeoutId);
      tabsAPI.onUpdated.removeListener(tabUpdateListener);
      tabsAPI.onRemoved.removeListener(tabRemovedListener);
    };

    // Register listeners
    tabsAPI.onUpdated.addListener(tabUpdateListener);
    tabsAPI.onRemoved.addListener(tabRemovedListener);

    // Open OAuth URL in a new tab
    tabsAPI
      .create({
        url: authUrl,
        active: true,
      })
      .then((tab) => {
        if (tab.id) {
          oauthTabId = tab.id;
        } else {
          cleanup();
          reject(new Error("Failed to create OAuth tab"));
        }
      })
      .catch((error) => {
        cleanup();
        reject(new Error(`Failed to open OAuth tab: ${error.message}`));
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

  const response = await fetchWithTimeout(tokenEndpoint, {
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

/**
 * Validates OAuth state without cleaning it up (for Safari flow)
 * Token exchange will clean up the state after successful validation
 */
async function validateOAuthStateWithoutCleanup(state: string): Promise<void> {
  const storageAPI = getStorageAPI();
  if (!storageAPI?.local) {
    // Fail closed: if we can't access storage, we can't validate state
    throw new Error("Storage API not available - cannot validate OAuth state");
  }

  const result = await storageAPI.local.get(["oauth_state"]);
  const storedState = result.oauth_state as string | undefined;

  if (!storedState) {
    throw new Error("No stored OAuth state found - possible CSRF attack");
  }

  if (storedState !== state) {
    devLog.error("State parameter mismatch - possible CSRF attack");
    throw new Error("Invalid state parameter - possible CSRF attack");
  }
}

async function validateOAuthState(state: string): Promise<void> {
  const storageAPI = getStorageAPI();
  if (!storageAPI?.local) {
    // Fail closed: if we can't access storage, we can't validate state
    throw new Error("Storage API not available - cannot validate OAuth state");
  }

  try {
    const result = await storageAPI.local.get(["oauth_state"]);
    const storedState = result.oauth_state as string | undefined;

    // Fail closed: state must exist and match exactly
    if (!storedState) {
      throw new Error("No stored OAuth state found");
    }

    if (storedState !== state) {
      await storageAPI.local.remove("oauth_state");
      devLog.error("State parameter mismatch - possible CSRF attack");
      throw new Error("Invalid state parameter - possible CSRF attack");
    }

    await storageAPI.local.remove("oauth_state");
  } catch (error) {
    // Clean up on any error
    try {
      await storageAPI.local.remove("oauth_state");
    } catch {
      // Ignore cleanup errors
    }
    throw error;
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
    const response = await fetchWithTimeout(`${API_BASE_URL}/me`, {
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
      ? safeParseOAuthTokens(result.cal_oauth_tokens as string)
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

  // For authenticated users, no username/orgSlug params needed - API uses auth token
  // This also ensures hidden event types are returned (they're filtered out when username is provided)
  const response = await fetchWithTimeout(`${API_BASE_URL}/event-types`, {
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

/**
 * Check if user is authenticated by verifying tokens exist in storage
 */
async function checkAuthStatus(): Promise<boolean> {
  const storageAPI = getStorageAPI();

  if (!storageAPI?.local) {
    return false;
  }

  try {
    const result = await storageAPI.local.get(["cal_oauth_tokens"]);
    const oauthTokens = result.cal_oauth_tokens
      ? safeParseOAuthTokens(result.cal_oauth_tokens as string)
      : null;

    return Boolean(oauthTokens?.accessToken);
  } catch (error) {
    devLog.error("Failed to check auth status:", error);
    return false;
  }
}

/**
 * Get booking status to check attendee no-show status
 */
async function getBookingStatus(bookingUid: string): Promise<Booking> {
  const authHeader = await getAuthHeader();

  const response = await fetchWithTimeout(`${API_BASE_URL}/bookings/${bookingUid}`, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
      "cal-api-version": "2024-08-13",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage = response.statusText;

    const errorJson = safeParseErrorJson(errorBody);
    if (errorJson) {
      errorMessage = errorJson?.error?.message || errorJson?.message || response.statusText;
    } else {
      errorMessage = errorBody || response.statusText;
    }

    if (response.status === 401) {
      throw new Error("Session expired. Please login again.");
    }
    if (response.status === 403) {
      throw new Error("You don't have permission to view this booking.");
    }
    if (response.status === 404) {
      throw new Error("Booking not found in Cal.com.");
    }

    throw new Error(`Failed to get booking status: ${errorMessage}`);
  }

  const data = await response.json();
  return (data?.data ?? data) as Booking;
}

/**
 * Mark an attendee as no-show for a booking
 */
async function markAttendeeNoShow(
  bookingUid: string,
  attendeeEmail: string,
  absent: boolean
): Promise<Booking> {
  const authHeader = await getAuthHeader();

  const response = await fetchWithTimeout(`${API_BASE_URL}/bookings/${bookingUid}/mark-absent`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
      "cal-api-version": "2024-08-13",
    },
    body: JSON.stringify({
      attendees: [{ email: attendeeEmail, absent }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage = response.statusText;

    const errorJson = safeParseErrorJson(errorBody);
    if (errorJson) {
      errorMessage = errorJson?.error?.message || errorJson?.message || response.statusText;
    } else {
      errorMessage = errorBody || response.statusText;
    }

    if (response.status === 401) {
      throw new Error("Session expired. Please login again.");
    }
    if (response.status === 403) {
      throw new Error("You don't have permission to modify this booking.");
    }
    if (response.status === 404) {
      throw new Error("Booking not found in Cal.com.");
    }

    throw new Error(`Failed to mark no-show: ${errorMessage}`);
  }

  const data = await response.json();
  return (data?.data ?? data) as Booking;
}
