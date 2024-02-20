import { useQuery } from "@tanstack/react-query";

import type { ApiResponse, CalendarBusyTimesInput } from "@calcom/platform-types";
import type { EventBusyDate } from "@calcom/types/Calendar";

import http from "../lib/http";

export const QUERY_KEY = "get-calendars-busy-times";

export const useCalendarsBusyTimes = (props: CalendarBusyTimesInput) => {
  const availableSlots = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => {
      return http
        .get<ApiResponse<EventBusyDate[]>>("/ee/calendars/busy-times", {
          params: props,
        })
        .then((res) => res.data);
    },
  });
  return availableSlots;
};
