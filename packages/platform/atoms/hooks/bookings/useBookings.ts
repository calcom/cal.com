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

export const useBookings = (input: GetBookingsInput_2024_08_13) => {
  const pathname = `/${V2_ENDPOINTS.bookings}`;
  const headers = {
    [CAL_API_VERSION_HEADER]: VERSION_2024_08_13,
  };

  const bookingsQuery = useQuery({
    queryKey: [
      "use-bookings",
      input.status,
      input.attendeeEmail,
      input.attendeeName,
      input.eventTypeIds,
      input.eventTypeId,
      input.teamsIds,
      input.teamId,
      input.afterStart,
      input.beforeEnd,
      input.sortStart,
      input.sortEnd,
      input.sortCreated,
      input.take,
      input.skip,
    ],
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
