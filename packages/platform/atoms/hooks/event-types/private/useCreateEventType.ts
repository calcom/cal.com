import { useMutation } from "@tanstack/react-query";

import {
  V2_ENDPOINTS,
  SUCCESS_STATUS,
  CAL_API_VERSION_HEADER,
  VERSION_2024_06_14,
} from "@calcom/platform-constants";
import type { ApiResponse, ApiSuccessResponse } from "@calcom/platform-types";
import type { CreateEventTypeInput_2024_06_14 } from "@calcom/platform-types";
import type { EventType } from "@calcom/prisma/client";

import http from "../../../lib/http";

export const QUERY_KEY = "use-create-event";
export type UseCreateEventTypeProps = {
  onSuccess?: (eventType: EventType) => void;
  onError?: (err: Error) => void;
  onSettled?: () => void;
};
export const useCreateEventType = ({ onSuccess, onError, onSettled }: UseCreateEventTypeProps) => {
  return useMutation({
    onSuccess,
    onError,
    onSettled,
    mutationFn: (body: CreateEventTypeInput_2024_06_14) => {
      const pathname = `/${V2_ENDPOINTS.eventTypes}`;
      return http
        ?.post<ApiResponse<EventType>>(pathname, body, {
          headers: { [CAL_API_VERSION_HEADER]: VERSION_2024_06_14 },
        })
        .then((res) => {
          if (res.data.status === SUCCESS_STATUS) {
            return (res.data as ApiSuccessResponse<EventType>).data;
          }
          throw new Error(res.data.error.message);
        });
    },
  });
};
