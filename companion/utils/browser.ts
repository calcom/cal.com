/**
 * Browser Utilities
 *
 * Centralized utility for opening links in the in-app browser.
 * Configured for session sharing with Safari/Chrome to maintain login state.
 */

import * as WebBrowser from "expo-web-browser";
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
 * Open a URL in the in-app browser with session sharing enabled.
 *
 * Session sharing allows cookies to be shared between the in-app browser
 * and Safari (iOS) or Chrome (Android). This means users who authenticate
 * via OAuth will remain logged in when opening Cal.com links.
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
    // Configure browser options
    // Session sharing happens automatically when using Safari View Controller (iOS)
    // or Chrome Custom Tabs (Android) - no special configuration needed
    const browserOptions: WebBrowser.WebBrowserOpenOptions = {
      ...(options?.toolbarColor && { toolbarColor: options.toolbarColor }),
      ...(options?.controlsColor && { controlsColor: options.controlsColor }),
    };

    await WebBrowser.openBrowserAsync(url, browserOptions);
  } catch (error) {
    console.error(`Failed to open ${url}:`, error);
    showErrorAlert("Error", `Failed to open ${fallbackMessage || "link"}. Please try again.`);
  }
};
