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

  const fallbackCountryCode = headers["x-country-code"] || 
                             headers["cf-ipcountry"] || 
                             headers["x-cloudfront-viewer-country"];

  const region = headers["x-vercel-ip-region"] || headers["cf-ipregion"];
  const city = headers["x-vercel-ip-city"] || headers["cf-ipcity"];
  const timezone = headers["x-vercel-ip-timezone"] || headers["cf-iptimezone"];

  const countryCode = primaryCountryCode || fallbackCountryCode || "";
  const detectionMethod = primaryCountryCode ? "vercel-ip" : fallbackCountryCode ? "fallback-header" : "none";

  return {
    countryCode,
    region: Array.isArray(region) ? region[0] : region,
    city: Array.isArray(city) ? city[0] : city,
    timezone: Array.isArray(timezone) ? timezone[0] : timezone,
    detectionMethod,
    fallbackCountryCode: Array.isArray(fallbackCountryCode) ? fallbackCountryCode[0] : fallbackCountryCode,
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    const data = await response.json();
    return data.countryCode || null;
  } catch (error) {
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
