export function isWebView(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
  // Detect common in-app browsers / WebViews
  const webViewPatterns = [
    /FBAN|FBAV/i, // Facebook
    /Instagram/i, // Instagram
    /LinkedIn/i, // LinkedIn
    /Twitter/i, // Twitter
    /Line\//i, // Line
    /WhatsApp/i, // WhatsApp
    /Snapchat/i, // Snapchat
    /Messenger/i, // Facebook Messenger
    /WeChat/i, // WeChat
    /Pinterest/i, // Pinterest
    /Reddit/i, // Reddit app
    /TikTok/i, // TikTok
    /Quora/i, // Quora
  ];

  if (webViewPatterns.some((pattern) => pattern.test(ua))) {
    return true;
  }

  // iOS WebView detection (excluding Safari)
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isSafari = /Safari/i.test(ua);
  const isWebKit = /WebKit/i.test(ua);

  if (isIOS && isWebKit && !isSafari) {
    return true;
  }

  // Android WebView detection
  if (/wv|Version\/[\d.]+.*Chrome\/[.0-9]*/.test(ua)) {
    return true;
  }

  return false;
}

export function autoOpenInExternalBrowser(): boolean {
  if (typeof window === "undefined") return false;

  const currentUrl = window.location.href;
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  // Android: Auto-redirect using intent URL
  if (isAndroid) {
    const intentUrl = `intent://${currentUrl.replace(
      /^https?:\/\//,
      ""
    )}#Intent;scheme=https;package=com.android.chrome;end`;
    window.location.href = intentUrl;

    // Fallback to default browser if Chrome not installed
    setTimeout(() => {
      window.location.href = `intent://${currentUrl.replace(/^https?:\/\//, "")}#Intent;scheme=https;end`;
    }, 500);

    return true;
  }

  // iOS: Try different approaches based on the app
  if (isIOS) {
    // Detect specific apps and use their URL schemes
    if (/LinkedIn/i.test(ua)) {
      // LinkedIn-specific: Try to open in Safari
      window.location.href = `x-safari-https://${currentUrl.replace(/^https?:\/\//, "")}`;
      return true;
    }

    if (/FBAN|FBAV/i.test(ua)) {
      // Facebook: Use their external browser scheme
      window.location.href = currentUrl.replace(/^https?:\/\//, "safari-https://");
      return true;
    }

    if (/Instagram/i.test(ua)) {
      // Instagram: Similar approach
      window.location.href = currentUrl.replace(/^https?:\/\//, "safari-https://");
      return true;
    }

    // Generic iOS fallback - this may not work consistently
    // iOS restricts programmatic browser opening from WebViews
    return false;
  }

  return false;
}
