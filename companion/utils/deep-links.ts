/**
 * Deep Links Utility
 *
 * This module provides utilities for opening Cal.com web pages from the mobile app.
 * Used for features that require server-side behavior that cannot be safely reproduced
 * client-side (e.g., request reschedule).
 */
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Alert, Platform } from "react-native";

import { showErrorAlert } from "@/utils/alerts";

// Default Cal.com web URL - can be overridden for self-hosted instances
const DEFAULT_CAL_WEB_URL = "https://app.cal.com";

/**
 * Get the Cal.com web URL from environment or use default
 */
function getCalWebUrl(): string {
  // In a real implementation, this would read from environment config
  // For now, use the default Cal.com URL
  return DEFAULT_CAL_WEB_URL;
}

/**
 * Appends ?standalone=true to Cal.com URLs on iOS.
 * This hides navigation elements when pages are opened in the in-app browser,
 * which is required for Apple App Store compliance.
 *
 * @param url - The URL to process
 * @returns The URL with standalone=true appended if it's a Cal.com URL on iOS
 */
function appendStandaloneParam(url: string): string {
  // Only apply to iOS
  if (Platform.OS !== "ios") {
    return url;
  }

  try {
    const urlObj = new URL(url);

    // Only apply to app.cal.com URLs
    if (urlObj.hostname !== "app.cal.com") {
      return url;
    }

    // Don't add if already present
    if (urlObj.searchParams.has("standalone")) {
      return url;
    }

    urlObj.searchParams.set("standalone", "true");
    return urlObj.toString();
  } catch {
    // If URL parsing fails, return original
    return url;
  }
}

/**
 * Open a booking detail page in the web browser.
 * This is used for actions that require the full web experience.
 *
 * @param bookingUid - The unique identifier of the booking
 */
export async function openBookingInWeb(bookingUid: string): Promise<void> {
  const webUrl = getCalWebUrl();
  const url = appendStandaloneParam(`${webUrl}/booking/${bookingUid}`);

  try {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
    });
  } catch {
    console.error("Failed to open booking in web browser");
    // Fallback to system browser
    try {
      await Linking.openURL(url);
    } catch {
      showErrorAlert("Error", "Failed to open booking in browser. Please try again.");
    }
  }
}

/**
 * Open the request reschedule flow in the web browser.
 * Since request reschedule is a server-driven operation with complex side effects
 * (emails, webhooks, calendar updates), we open the web page where the user can
 * trigger it safely.
 *
 * Note: The web flow uses a dialog (RescheduleDialog.tsx) that calls
 * trpc.viewer.bookings.requestReschedule.useMutation. There's no direct URL route
 * for request reschedule, so we open the booking detail page.
 *
 * @param bookingUid - The unique identifier of the booking
 */
export async function openRequestRescheduleInWeb(bookingUid: string): Promise<void> {
  // Show an informational alert before opening the web page
  Alert.alert(
    "Request Reschedule",
    "You will be redirected to the web app to request a reschedule. This ensures all notifications and calendar updates are handled correctly.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Open in Browser",
        onPress: () => openBookingInWeb(bookingUid),
      },
    ]
  );
}

/**
 * Open the reschedule page for an attendee to pick a new time.
 * This is the public reschedule page that attendees use.
 *
 * @param bookingUid - The unique identifier of the booking
 * @param rescheduleUid - The reschedule token/uid (optional)
 */
export async function openReschedulePage(
  bookingUid: string,
  rescheduleUid?: string
): Promise<void> {
  const webUrl = getCalWebUrl();
  const url = appendStandaloneParam(
    rescheduleUid ? `${webUrl}/reschedule/${rescheduleUid}` : `${webUrl}/booking/${bookingUid}`
  );

  try {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
    });
  } catch {
    console.error("Failed to open reschedule page in web browser");
    try {
      await Linking.openURL(url);
    } catch {
      showErrorAlert("Error", "Failed to open reschedule page. Please try again.");
    }
  }
}

/**
 * Open the cancel booking page in the web browser.
 * This is a fallback for cases where the API cancel doesn't work.
 *
 * @param bookingUid - The unique identifier of the booking
 */
export async function openCancelBookingInWeb(bookingUid: string): Promise<void> {
  const webUrl = getCalWebUrl();
  const url = appendStandaloneParam(`${webUrl}/booking/${bookingUid}`);

  try {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
    });
  } catch {
    console.error("Failed to open cancel booking page in web browser");
    try {
      await Linking.openURL(url);
    } catch {
      showErrorAlert("Error", "Failed to open booking page. Please try again.");
    }
  }
}
