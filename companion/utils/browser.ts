/**
 * Browser Utilities
 *
 * Centralized utility for opening links in the in-app browser.
 * Configured for session sharing with Safari/Chrome to maintain login state.
 */

import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { showErrorAlert } from "./alerts";

/**
 * Configuration options for in-app browser
 */
export interface BrowserOptions {
  /** iOS: Toolbar color (hex string) */
  toolbarColor?: string;
  /** iOS: Controls color (hex string) */
  controlsColor?: string;
}

/**
 * Appends ?standalone=true to app.cal.com URLs on iOS.
 * This hides navigation elements when pages are opened in the in-app browser,
 * which is required for Apple App Store compliance.
 *
 * @param url - The URL to process
 * @returns The URL with standalone=true appended if it's an app.cal.com URL on iOS
 */
const appendStandaloneParam = (url: string): string => {
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
};

/**
 * Open a URL in the in-app browser with session sharing enabled.
 *
 * Session sharing allows cookies to be shared between the in-app browser
 * and Safari (iOS) or Chrome (Android). This means users who authenticate
 * via OAuth will remain logged in when opening Cal.com links.
 *
 * On iOS, app.cal.com URLs automatically get ?standalone=true appended
 * to hide navigation elements for Apple App Store compliance.
 *
 * @param url - The URL to open
 * @param fallbackMessage - Optional message to show in error alert (defaults to "link")
 * @param options - Optional browser customization options
 *
 * @example
 * ```tsx
 * // Open a link with session sharing
 * await openInAppBrowser("https://app.cal.com");
 *
 * // With custom error message
 * await openInAppBrowser("https://app.cal.com/settings", "Settings page");
 *
 * // With custom toolbar color
 * await openInAppBrowser("https://app.cal.com", "Cal.com", { toolbarColor: "#111827" });
 * ```
 */
export const openInAppBrowser = async (
  url: string,
  fallbackMessage?: string,
  options?: BrowserOptions
): Promise<void> => {
  try {
    // Append standalone=true for app.cal.com URLs on iOS
    const processedUrl = appendStandaloneParam(url);

    // Configure browser options
    // Session sharing happens automatically when using Safari View Controller (iOS)
    // or Chrome Custom Tabs (Android) - no special configuration needed
    const browserOptions: WebBrowser.WebBrowserOpenOptions = {
      ...(options?.toolbarColor && { toolbarColor: options.toolbarColor }),
      ...(options?.controlsColor && { controlsColor: options.controlsColor }),
    };

    await WebBrowser.openBrowserAsync(processedUrl, browserOptions);
  } catch (error) {
    console.error("Failed to open link");
    if (__DEV__) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      console.debug("[openInAppBrowser] failed", { message, stack, fallbackMessage });
    }
    showErrorAlert("Error", `Failed to open ${fallbackMessage || "link"}. Please try again.`);
  }
};
