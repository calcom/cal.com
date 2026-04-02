import {
  CAL_API_VERSION_HEADER,
  SUCCESS_STATUS,
  V2_ENDPOINTS,
  VERSION_2024_08_13,
} from "@calcom/platform-constants";
import type { GetBookingOutput_2024_08_13 } from "@calcom/platform-types";
import { useQuery } from "@tanstack/react-query";
import http from "../../lib/http";

export const useBooking = (uid: string) => {
  const pathname = `/${V2_ENDPOINTS.bookings}/${uid}`;
  const headers = {
    [CAL_API_VERSION_HEADER]: VERSION_2024_08_13,
  };

  const bookingQuery = useQuery({
    queryKey: ["use-booking", uid],
    queryFn: async () => {
      return http.get<GetBookingOutput_2024_08_13>(pathname, { headers }).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return res.data.data;
        }
        throw new Error(res.data?.error?.message);
      });
    },
    enabled: !!uid,
  });

  return bookingQuery;
};
