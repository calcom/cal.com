import { useQuery } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
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
        .then((res) => {
          if (res.data.status === SUCCESS_STATUS) {
            return res.data;
          }
          throw new Error(res.data.error.message);
        });
    },
  });
  return availableSlots;
};
