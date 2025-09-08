import type { IncomingMessage } from "http";

export interface CountryDetectionResult {
  countryCode: string;
  region?: string;
  city?: string;
  timezone?: string;
  detectionMethod: "vercel-ip" | "fallback-header" | "none";
  fallbackCountryCode?: string;
}

export function detectCountryFromHeaders(req: IncomingMessage): CountryDetectionResult {
  const headers = req.headers;

  const vercelCountryCode: string | string[] = headers["x-vercel-ip-country"] ?? "";
  const primaryCountryCode = Array.isArray(vercelCountryCode) ? vercelCountryCode[0] : vercelCountryCode;

  const fallbackCountryCodeHeader =
    headers["x-country-code"] ||
    headers["cf-ipcountry"] ||
    headers["cloudfront-viewer-country"];

  const regionHeader = headers["x-vercel-ip-country-region"] || headers["cf-region"] || headers["cf-region-code"];
  const cityHeader = headers["x-vercel-ip-city"] || headers["cf-ipcity"];
  const timezoneHeader = headers["x-vercel-ip-timezone"] || headers["cf-timezone"];

  const normalizedFallback = Array.isArray(fallbackCountryCodeHeader)
    ? fallbackCountryCodeHeader[0]
    : fallbackCountryCodeHeader ?? "";
  const normalizedRegion = Array.isArray(regionHeader) ? regionHeader[0] : regionHeader;
  const normalizedCity = Array.isArray(cityHeader) ? cityHeader[0] : cityHeader;
  const normalizedTimezone = Array.isArray(timezoneHeader) ? timezoneHeader[0] : timezoneHeader;

  const countryCode = primaryCountryCode || normalizedFallback || "";
  const detectionMethod = primaryCountryCode
    ? "vercel-ip"
    : normalizedFallback
    ? "fallback-header"
    : "none";

  return {
    countryCode,
    region: normalizedRegion,
    city: normalizedCity,
    timezone: normalizedTimezone,
    detectionMethod,
    fallbackCountryCode: normalizedFallback || undefined,
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.countryCode || null;
  } catch (error) {
    clearTimeout(timeoutId);
    return null;
  }
}

export function getCountryFromTimezone(): string | null {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    const timezoneToCountry: Record<string, string> = {
      "America/New_York": "US",
      "America/Chicago": "US",
      "America/Denver": "US",
      "America/Los_Angeles": "US",
      "America/Phoenix": "US",
      "America/Anchorage": "US",
      "Pacific/Honolulu": "US",
      "Europe/London": "GB",
      "Europe/Paris": "FR",
      "Europe/Berlin": "DE",
      "Europe/Rome": "IT",
      "Europe/Madrid": "ES",
      "Europe/Amsterdam": "NL",
      "Europe/Brussels": "BE",
      "Europe/Vienna": "AT",
      "Europe/Zurich": "CH",
      "Europe/Stockholm": "SE",
      "Europe/Oslo": "NO",
      "Europe/Copenhagen": "DK",
      "Europe/Helsinki": "FI",
      "Europe/Warsaw": "PL",
      "Europe/Prague": "CZ",
      "Europe/Budapest": "HU",
      "Europe/Bucharest": "RO",
      "Europe/Sofia": "BG",
      "Europe/Athens": "GR",
      "Europe/Istanbul": "TR",
      "Europe/Moscow": "RU",
      "Asia/Tokyo": "JP",
      "Asia/Shanghai": "CN",
      "Asia/Hong_Kong": "HK",
      "Asia/Singapore": "SG",
      "Asia/Seoul": "KR",
      "Asia/Taipei": "TW",
      "Asia/Bangkok": "TH",
      "Asia/Jakarta": "ID",
      "Asia/Manila": "PH",
      "Asia/Kuala_Lumpur": "MY",
      "Asia/Ho_Chi_Minh": "VN",
      "Asia/Dubai": "AE",
      "Asia/Riyadh": "SA",
      "Asia/Tehran": "IR",
      "Asia/Karachi": "PK",
      "Asia/Kolkata": "IN",
      "Asia/Dhaka": "BD",
      "Asia/Kathmandu": "NP",
      "Asia/Colombo": "LK",
      "Asia/Yangon": "MM",
      "Australia/Sydney": "AU",
      "Australia/Melbourne": "AU",
      "Australia/Perth": "AU",
      "Australia/Adelaide": "AU",
      "Australia/Brisbane": "AU",
      "Australia/Darwin": "AU",
      "Pacific/Auckland": "NZ",
      "Pacific/Fiji": "FJ",
      "America/Toronto": "CA",
      "America/Vancouver": "CA",
      "America/Montreal": "CA",
      "America/Winnipeg": "CA",
      "America/Edmonton": "CA",
      "America/Halifax": "CA",
      "America/St_Johns": "CA",
      "America/Sao_Paulo": "BR",
      "America/Argentina/Buenos_Aires": "AR",
      "America/Santiago": "CL",
      "America/Lima": "PE",
      "America/Bogota": "CO",
      "America/Mexico_City": "MX",
      "Africa/Cairo": "EG",
      "Africa/Johannesburg": "ZA",
      "Africa/Lagos": "NG",
      "Africa/Nairobi": "KE",
      "Africa/Casablanca": "MA",
      "Africa/Tunis": "TN",
      "Africa/Algiers": "DZ",
    };

    return timezoneToCountry[timezone] || null;
  } catch (error) {
    return null;
  }
}
