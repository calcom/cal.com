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

  const inWebView =
    webViewPatterns.some((pattern) => pattern.test(ua)) ||
    (/iPhone|iPad|iPod/i.test(ua) && /WebKit/i.test(ua) && !/Safari/i.test(ua)) ||
    /Android.*(wv|Version\/[\d.]+.*Chrome\/[.0-9]*)/.test(ua);
  return inWebView;
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
