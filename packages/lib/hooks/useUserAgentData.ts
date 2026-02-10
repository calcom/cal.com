import { useEffect, useState } from "react";

export type OperatingSystem = "macos" | "windows" | "linux" | "ios" | "android" | "unknown";
export type Browser = "chrome" | "safari" | "firefox" | "edge" | "unknown";

export interface UserAgentData {
  os: OperatingSystem;
  browser: Browser;
  isMobile: boolean;
}

function detectOS(userAgent: string): OperatingSystem {
  const ua = userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(ua)) {
    return "ios";
  }
  if (/android/.test(ua)) {
    return "android";
  }
  if (/macintosh|mac os x/.test(ua)) {
    return "macos";
  }
  if (/windows/.test(ua)) {
    return "windows";
  }
  if (/linux/.test(ua)) {
    return "linux";
  }
  return "unknown";
}

function detectBrowser(userAgent: string): Browser {
  const ua = userAgent.toLowerCase();

  if (/edg\//.test(ua)) {
    return "edge";
  }
  if (/chrome|chromium|crios/.test(ua) && !/edg\//.test(ua)) {
    return "chrome";
  }
  if (/firefox|fxios/.test(ua)) {
    return "firefox";
  }
  if (/safari/.test(ua) && !/chrome|chromium|crios/.test(ua)) {
    return "safari";
  }
  return "unknown";
}

export function useUserAgentData(): UserAgentData {
  const [userAgentData, setUserAgentData] = useState<UserAgentData>({
    os: "unknown",
    browser: "unknown",
    isMobile: false,
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }

    const userAgent = navigator.userAgent;
    const os = detectOS(userAgent);
    const browser = detectBrowser(userAgent);
    const isMobile = os === "ios" || os === "android";

    setUserAgentData({ os, browser, isMobile });
  }, []);

  return userAgentData;
}
