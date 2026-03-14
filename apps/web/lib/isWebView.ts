export function isOpenedInWebView(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;

  const webViewPatterns = [
    /FBAN|FBAV|FB_IAB/i, // Facebook
    /Instagram/i,
    /LinkedIn/i,
    /Twitter/i,
    /Line\//i,
    /WhatsApp/i,
    /Snapchat/i,
    /Messenger/i,
    /MicroMessenger/i, // WeChat
    /Pinterest/i,
    /Reddit/i,
    /TikTok/i,
  ];

  if (webViewPatterns.some((pattern) => pattern.test(ua))) return true;

  // iOS: WebKit without Safari = in-app browser
  if (/iPhone|iPad|iPod/i.test(ua) && /WebKit/i.test(ua) && !/Safari/i.test(ua)) return true;

  // Android: explicit `wv` flag in Chrome WebView UA, or old stock browser (Version/x.x without Chrome)
  // Avoids matching regular Chrome (which has Chrome/ but no wv)
  if (/Android/i.test(ua)) {
    if (/\bwv\b/.test(ua)) return true; // Chrome WebView: "wv" token
    if (/Version\/[\d.]+ .*Mobile.*Safari/i.test(ua) && !/Chrome/i.test(ua)) return true; // Stock browser
  }

  return false;
}

function buildAndroidIntentUrl(currentUrl: string, packageName?: string): string {
  const strippedUrl = currentUrl.replace(/^https?:\/\//, "");
  const pkg = packageName ? `;package=${packageName}` : "";
  const fallback = `;S.browser_fallback_url=${encodeURIComponent(currentUrl)}`;
  return `intent://${strippedUrl}#Intent;scheme=https${pkg}${fallback};end`;
}

/**
 * Returns whether a redirect was *attempted* (not guaranteed to succeed).
 * On iOS, programmatic escaping from WebViews is unreliable — always show
 * manual fallback after a short delay regardless.
 */
export function autoOpenInExternalBrowser(): { attempted: boolean; likelySucceeded: boolean } {
  if (typeof window === "undefined") return { attempted: false, likelySucceeded: false };

  const currentUrl = window.location.href;
  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  if (isAndroid) {
    // Try Chrome first; if not installed, intent without package falls back via browser_fallback_url
    let chromeAttempted = false;
    try {
      window.location.href = buildAndroidIntentUrl(currentUrl, "com.android.chrome");
      chromeAttempted = true;
    } catch (_) {}

    // If Chrome isn't installed, the intent fails silently — fire a fallback to default browser
    // after enough time for Chrome to have launched if it was going to
    const fallbackTimer = window.setTimeout(() => {
      window.location.href = buildAndroidIntentUrl(currentUrl);
    }, 800);

    // Cancel fallback if page is navigating away (Chrome opened)
    window.addEventListener("blur", () => window.clearTimeout(fallbackTimer), { once: true });

    return { attempted: true, likelySucceeded: chromeAttempted };
  }

  if (isIOS) {
    // iOS WebViews block almost all programmatic escape attempts.
    // The only partially-working approach: _blank in some apps.
    // Do NOT use fake schemes like safari-https:// — they throw errors.
    try {
      const opened = window.open(currentUrl, "_blank");
      if (opened) {
        return { attempted: true, likelySucceeded: true };
      }
    } catch (_) {}

    // Nothing worked — caller must show manual instructions
    return { attempted: true, likelySucceeded: false };
  }

  return { attempted: false, likelySucceeded: false };
}

export function openInExternalBrowser(): void {
  if (typeof window === "undefined") return;

  const currentUrl = window.location.href;
  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);

  if (isAndroid) {
    // For manual tap: try Chrome, fallback to any browser
    window.location.href = buildAndroidIntentUrl(currentUrl, "com.android.chrome");
    window.setTimeout(() => {
      window.location.href = buildAndroidIntentUrl(currentUrl);
    }, 800);
    return;
  }

  // iOS and others: _blank is the best we can do programmatically
  // (copy-link is handled in the UI as a manual fallback)
  try {
    window.open(currentUrl, "_blank", "noopener,noreferrer");
  } catch (_) {}
}
