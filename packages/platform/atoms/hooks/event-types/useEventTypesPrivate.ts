import { useQuery } from "@tanstack/react-query";

import { V2_ENDPOINTS, SUCCESS_STATUS } from "@calcom/platform-constants";
import type { EventTypesByViewer } from "@calcom/platform-libraries";
import type { ApiResponse, ApiSuccessResponse } from "@calcom/platform-types";

import http from "../../lib/http";

export const QUERY_KEY = "get-private-events";
export const useEventTypesPrivate = () => {
  const pathname = `/${V2_ENDPOINTS.eventTypes}`;

  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => {
      return http?.get<ApiResponse<EventTypesByViewer>>(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return (res.data as ApiSuccessResponse<EventTypesByViewer>).data;
        }
        throw new Error(res.data.error.message);
      });
    },
  });
};
