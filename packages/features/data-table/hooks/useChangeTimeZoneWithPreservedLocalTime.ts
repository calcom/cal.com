import { useMemo } from "react";

import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";

import { preserveLocalTime } from "../lib/preserveLocalTime";
import { useDataTable } from "./useDataTable";

/**
 * Converts a timestamp to maintain the same local time in a different timezone.
 *
 * For example, if it's midnight (00:00) in Paris time:
 * - Input : "2025-05-22T22:00:00.000Z" (Midnight/00:00 in Paris)
 * - Output: "2025-05-22T15:00:00.000Z" (Midnight/00:00 in Seoul)
 *
 * This ensures that times like midnight (00:00) or end of day (23:59)
 * remain at those exact local times when converting between timezones.
 * The output timestamp is based on the timezone in the user's profile settings.
 */
export function useChangeTimeZoneWithPreservedLocalTime(isoString: string) {
  const { timeZone: profileTimeZone } = useDataTable();
  return useMemo(() => {
    if (!profileTimeZone || CURRENT_TIMEZONE === profileTimeZone) {
      return isoString;
    }
    return preserveLocalTime(isoString, CURRENT_TIMEZONE, profileTimeZone);
  }, [isoString, profileTimeZone]);
}
