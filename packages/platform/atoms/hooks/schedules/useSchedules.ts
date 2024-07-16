import { useQuery } from "@tanstack/react-query";

import { V2_ENDPOINTS, SUCCESS_STATUS } from "@calcom/platform-constants";
import type { GetSchedulesOutput_2024_06_11 } from "@calcom/platform-types";

import http from "../../lib/http";

export const QUERY_KEY = "user-schedules";

export const useSchedules = () => {
  const pathname = `/${V2_ENDPOINTS.availability}`;

  const { isLoading, error, data } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => {
      return http.get<GetSchedulesOutput_2024_06_11>(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return res.data.data;
        }
        throw new Error(res.data.error?.message);
      });
    },
  });

  return { isLoading, error, data };
};
