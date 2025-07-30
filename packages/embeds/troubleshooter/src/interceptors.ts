import type { ConsoleError, NetworkLogEntry } from "./types";
import { isCalcomUrl } from "./utils";

export function setupConsoleInterception(consoleErrors: ConsoleError[]): void {
  const originalError = console.error;

  console.error = function (...args) {
    const errorString = args
      .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
      .join(" ");

    if (errorString.toLowerCase().includes("cal") || errorString.toLowerCase().includes("embed")) {
      consoleErrors.push({
        timestamp: new Date(),
        message: errorString,
        stack: new Error().stack,
      });
    }

    originalError.apply(console, args);
  };
}

function getResourceType(entry: PerformanceResourceTiming): string {
  const url = entry.name.toLowerCase();
  const urlObject = new URL(entry.name);
  // Check for embed.js specifically
  if (url.includes("/embed.js") || url.includes("/embed-core")) return "Library";

  // Check for Cal.com links (documents)
  if (urlObject.pathname.endsWith("/embed") && entry.initiatorType === "iframe") {
    // Check if it's a prerendered link
    try {
      const urlObj = new URL(entry.name);
      if (urlObj.searchParams.get("prerendered") === "true") {
        return "Prerender Cal.com link";
      }
    } catch (e) {
      // URL parsing failed, continue
    }
    return "Cal.com link";
  }

  // API calls
  if (entry.initiatorType === "xmlhttprequest") return "API Call";
  if (entry.initiatorType === "fetch") return "API Call";

  // Other resources
  if (url.endsWith(".js") || url.endsWith(".mjs")) return "Script";
  if (url.endsWith(".css")) return "Styles";
  if (
    url.endsWith(".png") ||
    url.endsWith(".jpg") ||
    url.endsWith(".jpeg") ||
    url.endsWith(".gif") ||
    url.endsWith(".svg")
  )
    return "Image";
  if (url.endsWith(".woff") || url.endsWith(".woff2") || url.endsWith(".ttf")) return "Font";

  // Default based on initiatorType
  if (entry.initiatorType === "script") return "Script";
  if (entry.initiatorType === "link") return "Styles";
  if (entry.initiatorType === "img") return "Image";
  if (entry.initiatorType === "iframe") return "Document";

  return entry.initiatorType || "Other";
}

export function getNetworkEntriesFromPerformance(): NetworkLogEntry[] {
  const entries: NetworkLogEntry[] = [];
  const performanceEntries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];

  performanceEntries.forEach((entry) => {
    if (isCalcomUrl(entry.name)) {
      entries.push({
        url: entry.name,
        method: "GET", // Performance API doesn't provide method info
        status: 200, // Performance API doesn't provide status directly
        duration: Math.round(entry.duration),
        timestamp: new Date(entry.startTime + performance.timeOrigin),
        type: getResourceType(entry),
      });
    }
  });

  return entries;
}
