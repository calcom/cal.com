/**
 * Detects if smooth scrolling behavior is available in the current user agent
 * Used for feature detection and fallbacks for iOS Safari compatibility
 *
 * Safari on iOS versions below 14 does not support scrollIntoView({ behavior: "smooth" })
 * and will silently ignore the option, so we need to use scrollIntoView(true) as fallback
 */
export const isSmoothScrollAvailableInUserAgent = (): boolean => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent;

  const isIOSLegacy = /iPad|iPhone|iPod/.test(userAgent);

  const isIPadOS13Plus = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

  const isIOS = isIOSLegacy || isIPadOS13Plus;

  if (!isIOS) {
    return true;
  }

  const iosVersionMatch = userAgent.match(/OS (\d+)[._](\d+)/);

  if (!iosVersionMatch) {
    return false;
  }

  const majorVersion = parseInt(iosVersionMatch[1], 10);

  return majorVersion >= 14;
};
