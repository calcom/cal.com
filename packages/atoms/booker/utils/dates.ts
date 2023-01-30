import { useMemo } from "react";

import dayjs from "@calcom/dayjs";

/**
 * Gets the first minute of the month in the given time zone.
 */
export const getBrowsingMonthStart = (month: string | undefined, timeZone: string) => {
  const monthFromQueryParam =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("month") : null;
  const browsingMonth = month || monthFromQueryParam || dayjs(new Date()).format("YYYY-MM");

  // Etc/GMT is not actually a timeZone, so handle this select option explicitly.
  if (timeZone === "Etc/GMT") {
    dayjs.utc(browsingMonth).set("date", 1).set("hour", 0).set("minute", 0).set("second", 0);
  }

  // Set the start of the month without shifting time like startOf() may do.
  return dayjs.tz(browsingMonth, timeZone).set("date", 1).set("hour", 0).set("minute", 0).set("second", 0);
};

/**
 * Uses getBrowsingMonthStart function but memoizes it as well.
 */
export const useGetBrowsingMonthStart = (month: string | undefined, timeZone: string) =>
  useMemo(() => getBrowsingMonthStart(month, timeZone), [month, timeZone]);
