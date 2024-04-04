import { useQuery } from "@tanstack/react-query";

import { V2_ENDPOINTS, SUCCESS_STATUS } from "@calcom/platform-constants";
import type { getBookingInfo } from "@calcom/platform-libraries";
import type { ApiResponse, ApiSuccessResponse } from "@calcom/platform-types";

import http from "../lib/http";

export const QUERY_KEY = "user-booking";

export const useGetBooking = (uid = "") => {
  const pathname = `/${V2_ENDPOINTS.bookings}/${uid}`;

  const bookingQuery = useQuery({
    queryKey: [QUERY_KEY, uid],
    queryFn: () => {
      return http
        .get<ApiResponse<Awaited<ReturnType<typeof getBookingInfo>>["bookingInfo"]>>(pathname)
        .then((res) => {
          if (res.data.status === SUCCESS_STATUS) {
            return (res.data as ApiSuccessResponse<Awaited<ReturnType<typeof getBookingInfo>>["bookingInfo"]>)
              .data;
          }
          throw new Error(res.data.error.message);
        });
    },
    enabled: !!uid,
  });

  return bookingQuery;
};
