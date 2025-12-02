/// <reference types="chrome" />

// @ts-ignore - WXT provides this globally
export default defineBackground(() => {
  chrome.action.onClicked.addListener((tab) => {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: "icon-clicked" }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not loaded or not responding - this is expected on some pages
        }
      });
    }
  });

  // Handle messages from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "fetch-event-types") {
      // Fetch event types from Cal.com API
      fetchEventTypes()
        .then((eventTypes) => {
          sendResponse({ data: eventTypes });
        })
        .catch((error) => {
          sendResponse({ error: error.message });
        });

      // Return true to indicate we'll respond asynchronously
      return true;
    }

    if (message.action === "start-extension-oauth") {
      // Extract and store state from authUrl for CSRF validation
      const authUrl = message.authUrl;
      const urlObj = new URL(authUrl);
      const state = urlObj.searchParams.get("state");

      if (state) {
        // Store state in chrome.storage for later validation during token exchange
        chrome.storage.local.set({ oauth_state: state }, () => {
          if (chrome.runtime.lastError) {
            console.warn("Failed to store OAuth state:", chrome.runtime.lastError.message);
          }
        });
      }

      // Handle OAuth flow using Chrome extension APIs
      handleExtensionOAuth(authUrl)
        .then((responseUrl) => {
          sendResponse({ success: true, responseUrl });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });

      // Return true to indicate we'll respond asynchronously
      return true;
    }

    if (message.action === "exchange-oauth-tokens") {
      // Handle token exchange using background script to avoid CORS
      handleTokenExchange(message.tokenRequest, message.tokenEndpoint, message.state)
        .then((tokens) => {
          sendResponse({ success: true, tokens });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });

      // Return true to indicate we'll respond asynchronously
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
  // CSRF Protection: Validate state parameter if provided
  // Note: State is already validated in the iframe context before token exchange is initiated.
  // This is defense-in-depth validation. If state validation fails here, we log but don't block
  // to avoid breaking the flow if chrome.storage is unavailable in iframe context.
  if (state) {
    try {
      // Retrieve stored state from chrome.storage
      const result = await chrome.storage.local.get(["oauth_state"]);
      const storedState = result.oauth_state;

      if (storedState && storedState !== state) {
        // Clean up stored state on mismatch
        await chrome.storage.local.remove("oauth_state");
        console.error("State parameter mismatch - possible CSRF attack");
        throw new Error("Invalid state parameter - possible CSRF attack");
      }

      if (storedState && storedState === state) {
        // State is valid, clean it up
        await chrome.storage.local.remove("oauth_state");
      }
    } catch (error) {
      // Only throw if it's a state mismatch error
      if (error instanceof Error && error.message.includes("Invalid state parameter")) {
        throw error;
      }
      // For other errors (like storage unavailable), log but continue
      console.warn("State validation warning (non-blocking):", error);
    }
  }

  // Use URLSearchParams for proper form encoding
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
  try {
    const API_BASE_URL = "https://api.cal.com/v2";

    // Get OAuth tokens from storage
    const result = await chrome.storage.local.get(["cal_oauth_tokens"]);
    const oauthTokens = result.cal_oauth_tokens
      ? JSON.parse(result.cal_oauth_tokens as string)
      : null;

    if (!oauthTokens?.accessToken) {
      throw new Error("No OAuth access token found. Please sign in with OAuth.");
    }

    // First, get current user to get username
    const userResponse = await fetch(`${API_BASE_URL}/me`, {
      headers: {
        Authorization: `Bearer ${oauthTokens.accessToken}`,
        "Content-Type": "application/json",
        "cal-api-version": "2024-06-11",
      },
    });

    if (!userResponse.ok) {
      throw new Error(`Failed to get user: ${userResponse.statusText}`);
    }

    const userData = await userResponse.json();
    const username = userData?.data?.username;

    // Build query string with username
    const params = new URLSearchParams();
    if (username) {
      params.append("username", username);
    }

    const queryString = params.toString();
    const endpoint = `${API_BASE_URL}/event-types${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${oauthTokens.accessToken}`,
        "Content-Type": "application/json",
        "cal-api-version": "2024-06-14",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch event types: ${response.statusText}`);
    }

    const data = await response.json();

    // Extract event types array from response
    let eventTypesArray = [];
    if (Array.isArray(data)) {
      eventTypesArray = data;
    } else if (data?.data && Array.isArray(data.data)) {
      eventTypesArray = data.data;
    } else if (data?.eventTypes && Array.isArray(data.eventTypes)) {
      eventTypesArray = data.eventTypes;
    }

    return eventTypesArray;
  } catch (error) {
    throw error;
  }
}
