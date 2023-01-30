import { useCallback, useState } from "react";

import dayjs, { Dayjs } from "@calcom/dayjs";

import { MONTH_QUERY_PARAM } from "../config";

/**
 * Gets the first minute of the month.
 */
export const getBrowsingMonthStart = (month: string | undefined) => {
  const monthFromQueryParam =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get(MONTH_QUERY_PARAM) : null;
  const browsingMonth = month || monthFromQueryParam || dayjs(new Date()).format("YYYY-MM");

  // @TODO: Old code got month in specific TZ. But if you request january, you always
  // want january, right? Not dec if you're in a different timezone.
  return dayjs(browsingMonth).set("date", 1).set("hour", 0).set("minute", 0).set("second", 0);
};

/**
 * Uses getBrowsingMonthStart function but memoizes it as well.
 */
export const useGetBrowsingMonthStart = (month: string | undefined) => {
  const [browsingMonthStart, setBrowsingMonthStart] = useState(getBrowsingMonthStart(month));

  const setBrowsingMonthStartAndUpdateQueryParam = useCallback(
    (newMonth: Dayjs) => {
      const url = new URL(window.location.href);
      url.searchParams.set(MONTH_QUERY_PARAM, newMonth.format("YYYY-MM-DD"));
      window.history.pushState({}, "", url.href);
      setBrowsingMonthStart(newMonth);
    },
    [setBrowsingMonthStart]
  );

  return [browsingMonthStart, setBrowsingMonthStartAndUpdateQueryParam] as const;
};
