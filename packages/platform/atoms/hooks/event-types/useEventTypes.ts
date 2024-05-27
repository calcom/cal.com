import { useQuery } from "@tanstack/react-query";

import { V2_ENDPOINTS, SUCCESS_STATUS } from "@calcom/platform-constants";
import type { EventTypeOutput } from "@calcom/platform-types";
import type { ApiResponse, ApiSuccessResponse } from "@calcom/platform-types";

import http from "../../lib/http";

export const QUERY_KEY = "use-event-types";
export const useEventTypes = (username: string) => {
  const pathname = `/${V2_ENDPOINTS.users}/${username}/event-types`;

  return useQuery({
    queryKey: [QUERY_KEY, username],
    queryFn: () => {
      return http?.get<ApiResponse<EventTypeOutput>>(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return (res.data as ApiSuccessResponse<EventTypeOutput>).data;
        }
        throw new Error(res.data.error.message);
      });
    },
  });
};
