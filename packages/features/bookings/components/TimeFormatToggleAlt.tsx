import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

import { TimeFormat } from "@calcom/lib/timeFormat";

import { useTimePreferences } from "../lib";

type TimeFormatQueryParam = "12h" | "24h";
const timeFormatMap = {
  "12h": TimeFormat.TWELVE_HOUR,
  "24h": TimeFormat.TWENTY_FOUR_HOUR,
};

export const TimeFormatToggleAlt = () => {
  const timeFormat = useTimePreferences((state) => state.timeFormat);
  const setTimeFormat = useTimePreferences((state) => state.setTimeFormat);
  const searchParams = useSearchParams();

  const timeFormatQueryParamValue = useMemo(
    () => (searchParams?.get("timeFormat") as TimeFormatQueryParam) ?? "12h",
    [searchParams]
  );
  const timeFormatValue = timeFormatMap[timeFormatQueryParamValue] ?? timeFormat;

  useEffect(() => {
    if (timeFormatValue !== timeFormat) {
      setTimeFormat(timeFormatValue);
    }
  }, [setTimeFormat, timeFormatValue, timeFormat]);

  return null;
};
