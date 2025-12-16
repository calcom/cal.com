/// <reference types="chrome" />

// ============================================
// DEV ONLY: API Key for localhost testing
// TODO: REMOVE THIS ENTIRE SECTION BEFORE PRODUCTION
// ============================================
const DEV_API_KEY = import.meta.env.EXPO_PUBLIC_CAL_API_KEY as string | undefined;
const IS_DEV_MODE = DEV_API_KEY && DEV_API_KEY.length > 0;
if (IS_DEV_MODE) {
  console.log("Cal.com Extension: DEV MODE - API Key authentication enabled for testing");
}
// ============================================
// END DEV ONLY SECTION
// ============================================

// @ts-ignore - WXT provides this globally
export default defineBackground(() => {
  chrome.action.onClicked.addListener((tab) => {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: "icon-clicked" }, (response) => {
        if (chrome.runtime.lastError) {
          // Expected on pages where content script isn't loaded
        }
      });
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "fetch-event-types") {
      fetchEventTypes()
        .then((eventTypes) => {
          sendResponse({ data: eventTypes });
        })
        .catch((error) => {
          sendResponse({ error: error.message });
        });

      return true;
    }

    if (message.action === "start-extension-oauth") {
      const authUrl = message.authUrl;
      const urlObj = new URL(authUrl);
      const state = urlObj.searchParams.get("state");

      if (state) {
        chrome.storage.local.set({ oauth_state: state }, () => {
          if (chrome.runtime.lastError) {
            console.warn("Failed to store OAuth state:", chrome.runtime.lastError.message);
          }
        });
      }

      handleExtensionOAuth(authUrl)
        .then((responseUrl) => {
          sendResponse({ success: true, responseUrl });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });

      return true;
    }

    if (message.action === "exchange-oauth-tokens") {
      handleTokenExchange(message.tokenRequest, message.tokenEndpoint, message.state)
        .then((tokens) => {
          sendResponse({ success: true, tokens });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });

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

    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl,
        interactive: true,
      },
      (responseUrl) => {
        if (chrome.runtime.lastError) {
          console.error("OAuth flow failed:", chrome.runtime.lastError.message);
          reject(new Error(`OAuth flow failed: ${chrome.runtime.lastError.message}`));
        } else if (responseUrl) {
          resolve(responseUrl);
        } else {
          console.error("OAuth flow returned no response URL");
          reject(new Error("OAuth flow cancelled or failed"));
        }
      }
    );
  });
}

async function handleTokenExchange(
  tokenRequest: any,
  tokenEndpoint: string,
  state?: string
): Promise<any> {
  // CSRF protection: validate state parameter (defense-in-depth)
  // State is already validated in iframe context; this validates in background script
  if (state) {
    try {
      const result = await chrome.storage.local.get(["oauth_state"]);
      const storedState = result.oauth_state;

      if (storedState && storedState !== state) {
        await chrome.storage.local.remove("oauth_state");
        console.error("State parameter mismatch - possible CSRF attack");
        throw new Error("Invalid state parameter - possible CSRF attack");
      }

      if (storedState && storedState === state) {
        await chrome.storage.local.remove("oauth_state");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("Invalid state parameter")) {
        throw error;
      }
      // For storage errors, log but continue (non-blocking)
      console.warn("State validation warning (non-blocking):", error);
    }
  }

  const body = new URLSearchParams();
  Object.keys(tokenRequest).forEach((key) => {
    body.append(key, tokenRequest[key]);
  });

  try {
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
      console.error("Token exchange error response:", errorData);
      throw new Error(`Token exchange failed: ${response.status} ${errorData}`);
    }

    const tokenData = await response.json();

    const tokens = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenType: tokenData.token_type || "Bearer",
      expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
      scope: tokenData.scope,
    };

    return tokens;
  } catch (error) {
    console.error("Token exchange failed:", error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

async function fetchEventTypes() {
  const API_BASE_URL = "https://api.cal.com/v2";

  // Determine authentication method
  let authHeader: string;
  let authMethod: "oauth" | "apikey";

  const result = await chrome.storage.local.get(["cal_oauth_tokens"]);
  const oauthTokens = result.cal_oauth_tokens
    ? JSON.parse(result.cal_oauth_tokens as string)
    : null;

  if (oauthTokens?.accessToken) {
    // Use OAuth token if available
    authHeader = `Bearer ${oauthTokens.accessToken}`;
    authMethod = "oauth";
  } else if (IS_DEV_MODE && DEV_API_KEY) {
    // ============================================
    // DEV ONLY: Fallback to API key for localhost testing
    // TODO: REMOVE THIS BLOCK BEFORE PRODUCTION
    // ============================================
    console.log("Cal.com Extension: Using API Key for authentication (DEV MODE)");
    authHeader = `Bearer ${DEV_API_KEY}`;
    authMethod = "apikey";
    // ============================================
    // END DEV ONLY BLOCK
    // ============================================
  } else {
    throw new Error("No OAuth access token found. Please sign in with OAuth.");
  }

  // Get current user to retrieve username
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
  const username = userData?.data?.username;

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

  // Handle different response formats
  if (Array.isArray(data)) {
    return data;
  } else if (data?.data && Array.isArray(data.data)) {
    return data.data;
  } else if (data?.eventTypes && Array.isArray(data.eventTypes)) {
    return data.eventTypes;
  }

  return [];
}
