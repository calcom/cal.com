import { useQuery } from "@tanstack/react-query";

import { BASE_URL, SUCCESS_STATUS, API_VERSION, V2_ENDPOINTS } from "@calcom/platform-constants";

import http from "../lib/http";

export const QUERY_KEY = "user-bookings";

const useGetBookings = () => {
  const endpoint = new URL(BASE_URL);

  endpoint.pathname = `api/${API_VERSION}/${V2_ENDPOINTS.bookings}`;

  const { data: bookings } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => {
      return http.get(endpoint.toString()).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return res.data;
        }
        throw new Error(res.data.error.message);
      });
    },
  });

  return bookings;
};

export default useGetBookings;
