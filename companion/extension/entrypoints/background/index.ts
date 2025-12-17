/// <reference types="chrome" />

import type { OAuthTokens } from "../../../services/oauthService";

const DEV_API_KEY = import.meta.env.EXPO_PUBLIC_CAL_API_KEY as string | undefined;
const IS_DEV_MODE = Boolean(DEV_API_KEY && DEV_API_KEY.length > 0);

const devLog = {
  log: (...args: unknown[]) => IS_DEV_MODE && console.log("[Cal.com]", ...args),
  warn: (...args: unknown[]) => IS_DEV_MODE && console.warn("[Cal.com]", ...args),
  error: (...args: unknown[]) => console.error("[Cal.com]", ...args),
};

// Check if the URL is a restricted page where content scripts can't run
function isRestrictedUrl(url: string | undefined): boolean {
  if (!url) return true;

  // List of restricted URL patterns
  const restrictedPatterns = [
    /^chrome:\/\//i, // Chrome internal pages (newtab, settings, extensions, etc.)
    /^chrome-extension:\/\//i, // Other extension pages
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
  ];

  return restrictedPatterns.some((pattern) => pattern.test(url));
}

// Open cal.com/app (Framer marketing page) in a new tab with auto-open parameter
function openAppPage(): void {
  chrome.tabs.create({ url: "https://cal.com/app?openExtension=true" });
}

// @ts-ignore - WXT provides this globally
export default defineBackground(() => {
  if (IS_DEV_MODE) {
    devLog.log("DEV MODE - API Key authentication enabled for testing");
  }

  chrome.action.onClicked.addListener((tab) => {
    // Check if this is a restricted URL where content scripts can't run
    if (isRestrictedUrl(tab.url)) {
      devLog.log("Restricted URL detected, opening app page:", tab.url);
      openAppPage();
      return;
    }

    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: "icon-clicked" }, () => {
        // Ignore errors - expected on pages where content script hasn't loaded yet
        // The restricted URL check above handles pages where content scripts can't run
        void chrome.runtime.lastError;
      });
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "fetch-event-types") {
      fetchEventTypes()
        .then((eventTypes) => sendResponse({ data: eventTypes }))
        .catch((error) => sendResponse({ error: error.message }));
      return true;
    }

    if (message.action === "start-extension-oauth") {
      const authUrl = message.authUrl as string;
      const state = new URL(authUrl).searchParams.get("state");

      if (state) {
        chrome.storage.local.set({ oauth_state: state }, () => {
          if (chrome.runtime.lastError) {
            devLog.warn("Failed to store OAuth state:", chrome.runtime.lastError.message);
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

    return false;
  });
});

async function handleExtensionOAuth(authUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!chrome.identity) {
      reject(new Error("Chrome identity API not available"));
      return;
    }

    if (IS_DEV_MODE) {
      const expectedRedirectUrl = chrome.identity.getRedirectURL();
      const redirectUri = new URL(authUrl).searchParams.get("redirect_uri");

      devLog.log("Starting OAuth flow");
      devLog.log("Expected redirect URL:", expectedRedirectUrl);
      devLog.log("Auth URL redirect_uri:", redirectUri);

      if (redirectUri && !redirectUri.startsWith(expectedRedirectUrl.replace(/\/$/, ""))) {
        devLog.warn(
          "MISMATCH! redirect_uri does not match Chrome's expected URL.",
          "\nExpected:",
          expectedRedirectUrl,
          "\nGot:",
          redirectUri
        );
      }
    }

    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (responseUrl) => {
      if (chrome.runtime.lastError) {
        devLog.error("OAuth flow failed:", chrome.runtime.lastError.message);
        reject(new Error(`OAuth flow failed: ${chrome.runtime.lastError.message}`));
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

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    tokenType: tokenData.token_type || "Bearer",
    expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
    scope: tokenData.scope,
  };
}

async function validateOAuthState(state: string): Promise<void> {
  try {
    const result = await chrome.storage.local.get(["oauth_state"]);
    const storedState = result.oauth_state as string | undefined;

    if (storedState && storedState !== state) {
      await chrome.storage.local.remove("oauth_state");
      devLog.error("State parameter mismatch - possible CSRF attack");
      throw new Error("Invalid state parameter - possible CSRF attack");
    }

    if (storedState === state) {
      await chrome.storage.local.remove("oauth_state");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Invalid state parameter")) {
      throw error;
    }
    devLog.warn("State validation warning:", error);
  }
}

const API_BASE_URL = "https://api.cal.com/v2";

async function getAuthHeader(): Promise<string> {
  const result = await chrome.storage.local.get(["cal_oauth_tokens"]);
  const oauthTokens = result.cal_oauth_tokens
    ? (JSON.parse(result.cal_oauth_tokens as string) as OAuthTokens)
    : null;

  if (oauthTokens?.accessToken) {
    return `Bearer ${oauthTokens.accessToken}`;
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
