import { useMutation } from "@tanstack/react-query";

import { V2_ENDPOINTS, SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, ApiSuccessResponse } from "@calcom/platform-types";
import type { EventType } from "@calcom/prisma/client";

import http from "../../../lib/http";

export const QUERY_KEY = "use-delete-event-by-id";
export type UseDeleteEventTypeProps = {
  onSuccess?: () => void;
  onError?: (err: Error) => void;
  onSettled?: () => void;
};
export const useDeleteEventTypeById = ({ onSuccess, onError, onSettled }: UseDeleteEventTypeProps) => {
  return useMutation({
    onSuccess,
    onError,
    onSettled,
    mutationFn: (id: number) => {
      if (!id) throw new Error("Event type id is required");
      const pathname = `/${V2_ENDPOINTS.eventTypes}/${id}`;
      return http?.delete<ApiResponse<EventType>>(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return (res.data as ApiSuccessResponse<EventType>).data;
        }
        throw new Error(res.data.error.message);
      });
    },
  });
};
