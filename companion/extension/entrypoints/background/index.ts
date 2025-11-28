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

    return false;
  });
});

async function fetchEventTypes() {
  try {
    // Get API key from environment variable (injected at build time)
    // @ts-ignore - Vite injects this at build time
    const API_KEY = import.meta.env.EXPO_PUBLIC_CAL_API_KEY;
    const API_BASE_URL = "https://api.cal.com/v2";

    if (!API_KEY) {
      throw new Error("API key not found. Please set EXPO_PUBLIC_CAL_API_KEY in your .env file");
    }

    // First, get current user to get username
    const userResponse = await fetch(`${API_BASE_URL}/me`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
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
        Authorization: `Bearer ${API_KEY}`,
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
