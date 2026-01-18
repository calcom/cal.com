/**
 * Ambient declarations for browser extension APIs
 * These provide proper typing for Firefox/Safari browser namespace
 * and Brave-specific navigator properties used in oauthService.ts
 */

// Firefox/Safari use 'browser' namespace instead of 'chrome'
// This is a WebExtension API that mirrors chrome.* APIs
// Firefox/Safari browser.identity API is Promise-based (unlike Chrome's callback-based API)
declare const browser:
  | {
      identity?: {
        launchWebAuthFlow: (options: {
          url: string;
          interactive: boolean;
        }) => Promise<string | undefined>;
      };
      runtime?: {
        lastError?: { message?: string };
      };
    }
  | undefined;

// Brave adds isBrave() to navigator
interface Navigator {
  brave?: {
    isBrave: () => Promise<boolean>;
  };
}
