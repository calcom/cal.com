import { useQuery } from "@tanstack/react-query";

import { V2_ENDPOINTS, SUCCESS_STATUS } from "@calcom/platform-constants";
import type { GetScheduleOutput } from "@calcom/platform-types";

import http from "../lib/http";

export const QUERY_KEY = "user-schedule";

export const useClientSchedule = (id?: string) => {
  const pathname = id
    ? `/${V2_ENDPOINTS.availability}/${id}?for=atom`
    : `/${V2_ENDPOINTS.availability}/default?for=atom`;

  const { isLoading, error, data } = useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => {
      return http.get<GetScheduleOutput>(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return res.data.data;
        }
        throw new Error(res.data.error?.message);
      });
    },
  });

  return { isLoading, error, data };
};
