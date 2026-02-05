export interface DeviceDetails {
  ip?: string;
  browser: string;
  deviceType: "Mobile" | "Desktop" | "Tablet";
  deviceOS: string;
  screenResolution: string;
}

/**
 * Safely detects device details using built-in browser APIs
 * Returns null if detection fails to avoid blocking signup
 */
export function detectDeviceDetails(): Omit<DeviceDetails, "ip"> | null {
  try {
    const userAgent = navigator?.userAgent || "";
    const platform = navigator?.platform || "";

    return {
      browser: getBrowser(userAgent),
      deviceType: getDeviceType(userAgent),
      deviceOS: getOS(userAgent, platform),
      screenResolution: getScreenResolution(),
    };
  } catch (error) {
    console.warn("Device detection failed:", error);
    return null;
  }
}

function getBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  if (ua.includes("edg/")) return "Edge";
  if (ua.includes("brave/") || ua.includes("brave")) return "Brave";
  if (ua.includes("chrome/") && !ua.includes("edg/")) return "Chrome";
  if (ua.includes("firefox/")) return "Firefox";
  if (ua.includes("safari/") && !ua.includes("chrome/")) return "Safari";
  if (ua.includes("opera/") || ua.includes("opr/")) return "Opera";

  return "Unknown";
}

function getDeviceType(userAgent: string): "Mobile" | "Desktop" | "Tablet" {
  const ua = userAgent.toLowerCase();

  if (ua.includes("ipad") || ua.includes("tablet")) return "Tablet";
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) return "Mobile";

  return "Desktop";
}

function getOS(userAgent: string, platform: string): string {
  const ua = userAgent.toLowerCase();

  if (ua.includes("windows")) return "Windows";
  if (ua.includes("mac os") || platform.includes("Mac")) return "macOS";
  if (ua.includes("linux")) return "Linux";
  if (ua.includes("android")) return "Android";
  if (ua.includes("ios") || ua.includes("iphone") || ua.includes("ipad")) return "iOS";

  return "Unknown";
}

function getScreenResolution(): string {
  try {
    if (typeof screen !== "undefined" && screen.width && screen.height) {
      return `${screen.width}x${screen.height}`;
    }
    return "Unknown";
  } catch {
    return "Unknown";
  }
}

/**
 * Sanitizes string input to prevent XSS and limit length
 */
export function sanitizeDeviceString(input: string): string {
  if (!input || typeof input !== "string") return "Unknown";

  return input
    .replace(/[<>"'&]/g, "") // Remove potential XSS characters
    .substring(0, 100) // Limit length
    .trim();
}
