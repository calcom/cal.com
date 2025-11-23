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

    if (message.action === "fetch-bookings") {
      // Fetch bookings from Cal.com API
      fetchBookings()
        .then((bookings) => {
          sendResponse({ data: bookings });
        })
        .catch((error) => {
          sendResponse({ error: error.message });
        });

      return true;
    }

    if (message.action === "mark-no-show") {
      // Mark attendee as no-show
      markAttendeeNoShow(message.bookingUid, message.attendeeEmail, message.noShow)
        .then((result) => {
          sendResponse({ success: true, data: result });
        })
        .catch((error) => {
          sendResponse({ error: error.message });
        });

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

async function fetchBookings() {
  try {
    // @ts-ignore - Vite injects this at build time
    const API_KEY = import.meta.env.EXPO_PUBLIC_CAL_API_KEY;
    const API_BASE_URL = "https://api.cal.com/v2";

    if (!API_KEY) {
      throw new Error("API key not found. Please set EXPO_PUBLIC_CAL_API_KEY in your .env file");
    }

    // Fetch PAST bookings (meetings that already happened)
    // This is for marking no-show after the meeting has ended
    const params = new URLSearchParams();
    params.append("status", "past");
    params.append("limit", "200"); // Increased limit to get more past bookings

    const queryString = params.toString();
    const endpoint = `${API_BASE_URL}/bookings${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "cal-api-version": "2024-08-13",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch bookings: ${response.statusText}`);
    }

    const data = await response.json();

    // Extract bookings array from response
    let bookingsArray = [];
    if (Array.isArray(data)) {
      bookingsArray = data;
    } else if (data?.data && Array.isArray(data.data)) {
      bookingsArray = data.data;
    } else if (data?.bookings && Array.isArray(data.bookings)) {
      bookingsArray = data.bookings;
    }

    console.log(`[Background] Fetched ${bookingsArray.length} bookings from API with status=past`);

    // Log first few bookings to verify they are actually past bookings
    if (bookingsArray.length > 0) {
      const now = new Date();
      console.log(`[Background] Current time: ${now.toISOString()}`);
      bookingsArray.slice(0, 5).forEach((booking, index) => {
        const startTime = new Date(booking.startTime || booking.start);
        const endTime = new Date(booking.endTime || booking.end);
        console.log(
          `[Background] Booking ${index + 1}: "${booking.title}" | Start: ${startTime.toISOString()} | End: ${endTime.toISOString()} | Booking Status: ${booking.status} | Is Past: ${endTime < now}`
        );
      });
    }

    return bookingsArray;
  } catch (error) {
    throw error;
  }
}

async function markAttendeeNoShow(bookingUid: string, attendeeEmail: string, noShow: boolean) {
  try {
    // @ts-ignore - Vite injects this at build time
    const API_KEY = import.meta.env.EXPO_PUBLIC_CAL_API_KEY;

    if (!API_KEY) {
      throw new Error("API key not found. Please set EXPO_PUBLIC_CAL_API_KEY in your .env file");
    }

    // Use the internal Cal.com API endpoint (not v2 public API)
    // This calls the tRPC endpoint that the web app uses
    const WEBAPP_URL = "https://app.cal.com";
    const endpoint = `${WEBAPP_URL}/api/trpc/viewer.loggedInViewerRouter.markNoShow`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bookingUid,
        attendees: [
          {
            email: attendeeEmail,
            noShow: noShow,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to mark no-show: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}
