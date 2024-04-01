import { useQuery } from "@tanstack/react-query";

import { BASE_URL, API_VERSION, V2_ENDPOINTS, SUCCESS_STATUS } from "@calcom/platform-constants";
import type { EventTypesByViewer } from "@calcom/platform-libraries";
import type { ApiResponse, ApiSuccessResponse } from "@calcom/platform-types";

import http from "../../lib/http";

export const QUERY_KEY = "get-private-events";
export const useEventTypesPrivate = () => {
  const endpoint = new URL(BASE_URL);

  endpoint.pathname = `api/${API_VERSION}/${V2_ENDPOINTS.eventTypes}`;

  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => {
      return http?.get<ApiResponse<EventTypesByViewer>>(endpoint.toString()).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return (res.data as ApiSuccessResponse<EventTypesByViewer>).data;
        }
        throw new Error(res.data.error.message);
      });
    },
  });
};
