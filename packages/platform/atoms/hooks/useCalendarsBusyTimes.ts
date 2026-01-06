import { useQuery } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, CalendarBusyTimesInput } from "@calcom/platform-types";
import type { EventBusyDate } from "@calcom/types/Calendar";

import http from "../lib/http";

export const QUERY_KEY = "get-calendars-busy-times";

type UseCalendarsBusyTimesProps = Omit<CalendarBusyTimesInput, "dateFrom" | "dateTo"> & {
  dateFrom: string | null;
  dateTo: string | null;
} & { onError?: () => void; enabled: boolean };

export const useCalendarsBusyTimes = ({ onError, enabled, ...rest }: UseCalendarsBusyTimesProps) => {
  const availableSlots = useQuery({
    queryKey: [
      QUERY_KEY,
      rest?.calendarsToLoad?.length ?? 0,
      rest.dateFrom ?? "",
      rest.dateTo ?? "",
      rest.loggedInUsersTz,
    ],
    queryFn: () => {
      return http
        .get<ApiResponse<EventBusyDate[]>>("/calendars/busy-times", {
          params: rest,
          paramsSerializer: (params) => {
            const searchParams = new URLSearchParams();

            if (params.dateFrom) searchParams.append("dateFrom", params.dateFrom);
            if (params.dateTo) searchParams.append("dateTo", params.dateTo);
            if (params.loggedInUsersTz) searchParams.append("loggedInUsersTz", params.loggedInUsersTz);

            // calendarsToLoad expects an array of objects but since this is a GET request, we cant pass the data directly inside the body
            // hence serializing calendarsToLoad array of objects in the query params
            if (params.calendarsToLoad && Array.isArray(params.calendarsToLoad)) {
              params.calendarsToLoad.forEach(
                (calendar: { credentialId: number; externalId: string }, index: number) => {
                  searchParams.append(
                    `calendarsToLoad[${index}][credentialId]`,
                    String(calendar.credentialId)
                  );
                  searchParams.append(`calendarsToLoad[${index}][externalId]`, calendar.externalId);
                }
              );
            }

            return searchParams.toString();
          },
        })
        .then((res) => {
          if (res.data.status === SUCCESS_STATUS) {
            return res.data;
          }
          onError?.();
          throw new Error(res.data.error.message);
        });
    },
    enabled: enabled && !!rest.dateFrom && !!rest.dateTo,
  });
  return availableSlots;
};
