import { createParser, useQueryState } from "nuqs";

import dayjs from "@calcom/dayjs";
import { weekdayToWeekIndex } from "@calcom/lib/dayjs";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";

import { getWeekStart } from "../lib/weekUtils";

/**
 * Parser for the weekStart query parameter
 * This parser simply parses the date from the URL and ensures it's at the start of the day.
 * The week start logic based on user preference is applied when determining the default value.
 */
const weekStartParser = createParser({
  parse: (value: string) => {
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.startOf("day") : dayjs().startOf("day");
  },
  serialize: (value: dayjs.Dayjs) => value.format("YYYY-MM-DD"),
});

/**
 * Custom hook to manage the current week start based on user preferences
 * @returns Object containing currentWeekStart state and userWeekStart preference
 */
export function useCurrentWeekStart() {
  const user = useMeQuery().data;

  // Get the user's preferred week start day (0-6, where 0 = Sunday)
  const userWeekStart = weekdayToWeekIndex(user?.weekStart);

  const [currentWeekStart, setCurrentWeekStart] = useQueryState(
    "weekStart",
    weekStartParser.withDefault(getWeekStart(dayjs(), userWeekStart))
  );

  return {
    currentWeekStart,
    setCurrentWeekStart,
    userWeekStart,
  };
}
