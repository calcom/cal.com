import { useQuery } from "@tanstack/react-query";

import { BASE_URL, API_VERSION, V2_ENDPOINTS, SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ScheduleWithAvailabilitiesForWeb } from "@calcom/platform-libraries";
import type { ApiResponse } from "@calcom/platform-types";

import http from "../lib/http";

export const QUERY_KEY = "user-schedule";

const useClientSchedule = (id?: string) => {
  const endpoint = new URL(BASE_URL);

  endpoint.pathname = id
    ? `api/${API_VERSION}/${V2_ENDPOINTS.availability}/${id}`
    : `api/${API_VERSION}/${V2_ENDPOINTS.availability}/default`;

  endpoint.searchParams.set("for", "atom");

  const { isLoading, error, data } = useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => {
      return http.get<ApiResponse<ScheduleWithAvailabilitiesForWeb>>(endpoint.toString()).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return res.data;
        }
        throw new Error(res.data.error.message);
      });
    },
  });

  return { isLoading, error, data };
};

export default useClientSchedule;
