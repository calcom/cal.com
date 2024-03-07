import { useQuery } from "@tanstack/react-query";

import { BASE_URL, API_VERSION, V2_ENDPOINTS, SUCCESS_STATUS } from "@calcom/platform-constants";

import http from "../lib/http";

export const QUERY_KEY = "user-booking";

const useGetBooking = (uid: string) => {
  const endpoint = new URL(BASE_URL);

  endpoint.pathname = `api/${API_VERSION}/${V2_ENDPOINTS.bookings}/${uid}`;

  const { isLoading, error, data } = useQuery({
    queryKey: [QUERY_KEY, uid],
    queryFn: () => {
      return http.get(endpoint.toString()).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return res.data;
        }
        throw new Error(res.data.error.message);
      });
    },
  });

  return { isLoading, error, data };
};

export default useGetBooking;
