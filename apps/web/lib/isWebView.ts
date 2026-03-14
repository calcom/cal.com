export function isOpenedInWebView(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";

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

type IOSOpenStrategy = "x-safari" | "safari" | "manual";

const IOS_UA_OPEN_STRATEGIES: Array<{ pattern: RegExp; strategy: IOSOpenStrategy }> = [
  { pattern: /LinkedIn/i, strategy: "x-safari" },
  { pattern: /FBAN|FBAV|Instagram|Messenger/i, strategy: "safari" },
  // These app WebViews are commonly restrictive; prefer immediate manual fallback.
  { pattern: /Twitter|Snapchat|Reddit|TikTok|WhatsApp|Line\/|Pinterest|MicroMessenger/i, strategy: "manual" },
];

function getIOSOpenStrategy(ua: string): IOSOpenStrategy {
  const match = IOS_UA_OPEN_STRATEGIES.find((entry) => entry.pattern.test(ua));
  return match?.strategy ?? "manual";
}

export function autoOpenInExternalBrowser(): boolean {
  if (typeof window === "undefined") return false;

  const currentUrl = window.location.href;
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  if (isAndroid) {
    const intentUrl = `intent://${currentUrl.replace(
      /^https?:\/\//,
      ""
    )}#Intent;scheme=https;package=com.android.chrome;end`;
    window.location.href = intentUrl;

    window.setTimeout(() => {
      window.location.href = `intent://${currentUrl.replace(/^https?:\/\//, "")}#Intent;scheme=https;end`;
    }, 700);

    return true;
  }

  if (isIOS) {
    const strategy = getIOSOpenStrategy(ua);

    if (strategy === "x-safari") {
      window.location.href = `x-safari-https://${currentUrl.replace(/^https?:\/\//, "")}`;
      return true;
    }

    if (strategy === "safari") {
      window.location.href = currentUrl.replace(/^https?:\/\//, "safari-https://");
      return true;
    }

    return false;
  }

  return false;
}

export function openInExternalBrowser(): void {
  if (typeof window === "undefined") return;

  autoOpenInExternalBrowser();
}
