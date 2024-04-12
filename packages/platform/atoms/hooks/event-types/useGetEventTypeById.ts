import { useQuery } from "@tanstack/react-query";

import { V2_ENDPOINTS, SUCCESS_STATUS } from "@calcom/platform-constants";
import type { EventType as AtomEventType } from "@calcom/platform-libraries";
import type { ApiResponse, ApiSuccessResponse } from "@calcom/platform-types";

import http from "../../lib/http";

export const QUERY_KEY = "get-event-by-id";
export const useGetEventTypeById = (id: number | null) => {
  const pathname = `/${V2_ENDPOINTS.eventTypes}/${id}?for=atom`;

  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => {
      return http?.get<ApiResponse<AtomEventType>>(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return (res.data as ApiSuccessResponse<AtomEventType>).data;
        }
        throw new Error(res.data.error.message);
      });
    },
  });
};
