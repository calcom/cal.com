import { useMemo } from "react";

import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";

import { preserveLocalTime } from "../lib/preserveLocalTime";
import { useDataTable } from "./useDataTable";

/**
 * Converts a timestamp to maintain the same local time in a different timezone.
 * Fore more info, read packages/features/data-table/lib/preserveLocalTime.ts
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
