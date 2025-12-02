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
      // Handle OAuth flow using Chrome extension APIs
      handleExtensionOAuth(message.authUrl)
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
      handleTokenExchange(message.tokenRequest, message.tokenEndpoint)
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
    console.log("Background script starting OAuth flow with URL:", authUrl);

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
          console.log("OAuth flow successful, response URL:", responseUrl);
          resolve(responseUrl);
        } else {
          console.error("OAuth flow returned no response URL");
          reject(new Error("OAuth flow cancelled or failed"));
        }
      }
    );
  });
}

async function handleTokenExchange(tokenRequest: any, tokenEndpoint: string): Promise<any> {
  console.log("Background script handling token exchange:", tokenEndpoint);

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
    console.log("Token exchange successful");

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
    throw error;
  }
}

async function fetchEventTypes() {
  try {
    const API_BASE_URL = "https://api.cal.com/v2";

    // Get OAuth tokens from storage
    const result = await chrome.storage.local.get(["cal_oauth_tokens"]);
    const oauthTokens = result.cal_oauth_tokens ? JSON.parse(result.cal_oauth_tokens) : null;

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
