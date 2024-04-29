import { useQuery } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, CalendarBusyTimesInput } from "@calcom/platform-types";
import type { EventBusyDate } from "@calcom/types/Calendar";

import http from "../lib/http";

export const QUERY_KEY = "get-calendars-busy-times";

type UseCalendarsBusyTimesProps = CalendarBusyTimesInput & { onError?: () => void; enabled: boolean };

export const useCalendarsBusyTimes = ({ onError, enabled, ...rest }: UseCalendarsBusyTimesProps) => {
  const availableSlots = useQuery({
    queryKey: [
      QUERY_KEY,
      rest?.calendarsToLoad?.toString() ?? "",
      rest.dateFrom ?? "",
      rest.dateTo ?? "",
      rest.loggedInUsersTz,
    ],
    queryFn: () => {
      return http
        .get<ApiResponse<EventBusyDate[]>>("/calendars/busy-times", {
          params: rest,
        })
        .then((res) => {
          if (res.data.status === SUCCESS_STATUS) {
            return res.data;
          }
          onError?.();
          throw new Error(res.data.error.message);
        });
    },
    enabled,
  });
  return availableSlots;
};
