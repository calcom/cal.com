/**
 * Parser for Google Calendar scheduling chips in Gmail
 * Extracts time slots from the Gmail ad-hoc scheduling chip
 */

export interface GoogleTimeSlot {
  date: string; // "Wed, 26 November"
  startTime: string; // "3:30 pm"
  endTime: string; // "4:30 pm"
  durationMinutes: number; // 60
  isoDate: string; // "2025-11-27"
  isoTimestamp: string; // "2025-11-27T05:30:00.000Z"
  googleUrl: string; // Original Google Calendar URL
}

export interface ParsedGoogleChip {
  scheduleId: string;
  timezone: string; // "Asia/Kolkata"
  timezoneOffset: string; // "GMT+05:30"
  slots: GoogleTimeSlot[];
  detectedDuration: number; // 15, 30, 45, or 60
}

/**
 * Parse Google Calendar scheduling chip from Gmail
 */
export function parseGoogleChip(chipElement: HTMLElement): ParsedGoogleChip | null {
  try {
    // 1. Get schedule ID from data attribute
    const scheduleId = chipElement.getAttribute("data-ad-hoc-schedule-id");
    if (!scheduleId) {
      console.warn("No schedule ID found in Google chip");
      return null;
    }

    // 2. Parse timezone - first try to get IANA timezone from data attribute
    let timezone = "UTC";
    let timezoneOffset = "GMT+00:00";

    // Try to get IANA timezone from data-ad-hoc-v2-params
    const paramsAttr = chipElement.getAttribute("data-ad-hoc-v2-params");
    if (paramsAttr) {
      // The timezone is at the end of the params string, like: "Asia/Kolkata"
      // Try multiple patterns as Gmail might format it differently
      let tzMatch = paramsAttr.match(/&quot;([^&]+)&quot;\]/);

      // Also try without HTML entities
      if (!tzMatch) {
        tzMatch = paramsAttr.match(/"([^"]+)"\]/);
      }

      // Also try with escaped quotes
      if (!tzMatch) {
        tzMatch = paramsAttr.match(/\\"([^\\]+)\\"\]/);
      }

      if (tzMatch && tzMatch[1]) {
        timezone = tzMatch[1]; // e.g., "Asia/Kolkata"
      }
    }

    // Also get the display timezone offset from the UI text
    const timezoneText = chipElement.querySelector("td")?.textContent?.trim() || "";
    const timezoneMatch = timezoneText.match(/^(.+?)\s*-\s*(.+?)\s*\((.+?)\)$/);

    if (timezoneMatch) {
      timezoneOffset = timezoneMatch[3].trim(); // e.g., "GMT+05:30"
    }

    // 3. Find all time slot links
    const slotLinks = Array.from(chipElement.querySelectorAll("a[href*='slotStartTime']"));

    if (slotLinks.length === 0) {
      console.warn("No time slot links found in Google chip");
      return null;
    }

    const slots: GoogleTimeSlot[] = [];
    let detectedDuration = 60; // Default

    slotLinks.forEach((link) => {
      const href = (link as HTMLAnchorElement).href;
      const url = new URL(href);

      // Extract parameters
      const slotStartTime = url.searchParams.get("slotStartTime");
      const slotDurationMinutes = url.searchParams.get("slotDurationMinutes");

      if (!slotStartTime || !slotDurationMinutes) {
        return;
      }

      const durationMinutes = parseInt(slotDurationMinutes, 10);
      detectedDuration = durationMinutes; // Use the duration from slots

      // Convert Unix timestamp (milliseconds) to Date
      const startDate = new Date(parseInt(slotStartTime, 10));
      const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

      // Format date and time using the chip's timezone for consistency
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: "short",
        day: "numeric",
        month: "long",
        timeZone: timezone, // Use chip's timezone
      };
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: timezone, // Use chip's timezone
      };

      const date = startDate.toLocaleDateString("en-US", dateOptions);
      const startTime = startDate
        .toLocaleTimeString("en-US", timeOptions)
        .toLowerCase()
        .replace(/\s/g, " ");
      const endTime = endDate
        .toLocaleTimeString("en-US", timeOptions)
        .toLowerCase()
        .replace(/\s/g, " ");

      // ISO format for Cal.com
      const isoDate = startDate.toISOString().split("T")[0]; // "2025-11-27"
      const isoTimestamp = startDate.toISOString(); // "2025-11-27T05:30:00.000Z"

      slots.push({
        date,
        startTime,
        endTime,
        durationMinutes,
        isoDate,
        isoTimestamp,
        googleUrl: href,
      });
    });

    if (slots.length === 0) {
      console.warn("No valid slots parsed from Google chip");
      return null;
    }

    return {
      scheduleId,
      timezone,
      timezoneOffset,
      slots,
      detectedDuration,
    };
  } catch (error) {
    console.error("Error parsing Google chip:", error);
    return null;
  }
}
