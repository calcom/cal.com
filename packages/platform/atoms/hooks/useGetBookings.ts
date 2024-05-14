import { useQuery } from "@tanstack/react-query";

import { SUCCESS_STATUS, V2_ENDPOINTS } from "@calcom/platform-constants";
import type { getAllUserBookings } from "@calcom/platform-libraries";
import type { ApiResponse, ApiSuccessResponse } from "@calcom/platform-types";
import type { GetBookingsInput } from "@calcom/platform-types/bookings";

import http from "../lib/http";

export const QUERY_KEY = "user-bookings";

export const useGetBookings = (input: GetBookingsInput) => {
  const pathname = `/${V2_ENDPOINTS.bookings}`;

  const bookingsQuery = useQuery({
    queryKey: [QUERY_KEY, input?.limit ?? 50, input?.cursor ?? 0, input?.filters?.status ?? "upcoming"],
    queryFn: () => {
      return http
        .get<ApiResponse<Awaited<ReturnType<typeof getAllUserBookings>>>>(pathname, {
          params: input,
        })
        .then((res) => {
          if (res.data.status === SUCCESS_STATUS) {
            return (res.data as ApiSuccessResponse<Awaited<ReturnType<typeof getAllUserBookings>>>).data;
          }
          throw new Error(res.data.error.message);
        });
    },
  });

  return bookingsQuery;
};
