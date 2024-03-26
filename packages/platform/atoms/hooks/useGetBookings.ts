import { useQuery } from "@tanstack/react-query";

import { BASE_URL, SUCCESS_STATUS, API_VERSION, V2_ENDPOINTS } from "@calcom/platform-constants";
import type { getAllUserBookings } from "@calcom/platform-libraries";
import type { ApiResponse } from "@calcom/platform-types";
import type { GetBookingsInput } from "@calcom/platform-types/bookings";

import http from "../lib/http";

export const QUERY_KEY = "user-bookings";

export const useGetBookings = (input: GetBookingsInput) => {
  const endpoint = new URL(BASE_URL);

  endpoint.pathname = `api/${API_VERSION}/${V2_ENDPOINTS.bookings}`;

  const bookingsQuery = useQuery({
    queryKey: [QUERY_KEY, input?.limit ?? 50, input?.cursor ?? 0, input?.filters?.status ?? "upcoming"],
    queryFn: () => {
      return http
        .get<ApiResponse<Awaited<ReturnType<typeof getAllUserBookings>>>>(endpoint.toString(), {
          params: input,
        })
        .then((res) => {
          if (res.data.status === SUCCESS_STATUS) {
            return res.data.data;
          }
          throw new Error(res.data.error.message);
        });
    },
  });

  return bookingsQuery;
};
