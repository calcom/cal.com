import { useQuery } from "@tanstack/react-query";

import {
  CAL_API_VERSION_HEADER,
  SUCCESS_STATUS,
  V2_ENDPOINTS,
  VERSION_2024_08_13,
} from "@calcom/platform-constants";
import type { GetBookingsOutput_2024_08_13 } from "@calcom/platform-types";
import type { GetBookingsInput_2024_08_13 } from "@calcom/platform-types";

import http from "../../lib/http";

const QUERY_KEY = "use-bookings";

export const useBookings = (input: GetBookingsInput_2024_08_13) => {
  const pathname = `/${V2_ENDPOINTS.bookings}`;
  const headers = {
    [CAL_API_VERSION_HEADER]: VERSION_2024_08_13,
  };

  const bookingsQuery = useQuery({
    queryKey: [QUERY_KEY, ...extractBookingsQueryKeys(input)],
    queryFn: async () => {
      return http
        .get<GetBookingsOutput_2024_08_13>(pathname, {
          params: input,
          headers,
        })
        .then((res) => {
          if (res.data.status === SUCCESS_STATUS) {
            return res.data.data;
          }
          throw new Error(res.data?.error?.message);
        });
    },
  });

  return bookingsQuery;
};

export function extractBookingsQueryKeys(query: GetBookingsInput_2024_08_13) {
  return [
    query.status,
    query.attendeeEmail,
    query.attendeeName,
    query.eventTypeIds,
    query.eventTypeId,
    query.teamsIds,
    query.teamId,
    query.afterStart,
    query.beforeEnd,
    query.afterCreatedAt,
    query.beforeCreatedAt,
    query.afterUpdatedAt,
    query.beforeUpdatedAt,
    query.sortStart,
    query.sortEnd,
    query.sortCreated,
    query.sortUpdatedAt,
    query.take,
    query.skip,
  ];
}
