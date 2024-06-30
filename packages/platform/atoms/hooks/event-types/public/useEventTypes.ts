import { useQuery } from "@tanstack/react-query";

import { V2_ENDPOINTS, SUCCESS_STATUS } from "@calcom/platform-constants";
import type { EventTypeOutput_2024_06_14 } from "@calcom/platform-types";
import type { ApiResponse, ApiSuccessResponse } from "@calcom/platform-types";

import http from "../../../lib/http";

export const QUERY_KEY = "use-event-types";
export const useEventTypes = (username: string) => {
  const pathname = `/${V2_ENDPOINTS.eventTypes}?username=${username}`;

  return useQuery({
    queryKey: [QUERY_KEY, username],
    queryFn: () => {
      return http?.get<ApiResponse<EventTypeOutput_2024_06_14[]>>(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return (res.data as ApiSuccessResponse<EventTypeOutput_2024_06_14[]>).data;
        }
        throw new Error(res.data.error.message);
      });
    },
  });
};
