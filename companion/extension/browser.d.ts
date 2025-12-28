/**
 * Ambient declarations for browser extension APIs
 * These provide proper typing for Firefox/Safari browser namespace
 * and Brave-specific navigator properties
 */

// Firefox/Safari use 'browser' namespace instead of 'chrome'
// This is a WebExtension API that mirrors chrome.* APIs
declare const browser: typeof chrome | undefined;

// Brave adds isBrave() to navigator
interface Navigator {
  brave?: {
    isBrave: () => Promise<boolean>;
  };
}

// WXT global function for defining background scripts
declare function defineBackground(fn: () => void): void;
