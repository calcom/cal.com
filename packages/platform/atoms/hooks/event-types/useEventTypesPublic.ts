import { useQuery } from "@tanstack/react-query";

import { V2_ENDPOINTS, SUCCESS_STATUS } from "@calcom/platform-constants";
import type { EventTypesPublic } from "@calcom/platform-libraries";
import type { ApiResponse, ApiSuccessResponse } from "@calcom/platform-types";

import http from "../../lib/http";

export const QUERY_KEY = "get-public-events";
export const useEventTypesPublic = (username: string) => {
  const pathname = `/${V2_ENDPOINTS.eventTypes}/${username}/public`;

  return useQuery({
    queryKey: [QUERY_KEY, username],
    queryFn: () => {
      return http?.get<ApiResponse<EventTypesPublic>>(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return (res.data as ApiSuccessResponse<EventTypesPublic>).data;
        }
        throw new Error(res.data.error.message);
      });
    },
  });
};
