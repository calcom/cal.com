import { useMutation } from "@tanstack/react-query";

import { V2_ENDPOINTS, SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiSuccessResponse } from "@calcom/platform-types";
import type { EventType } from "@calcom/prisma/client";

import http from "../../../lib/http";

export const QUERY_KEY = "bulk-update-event-types-to-default-location";

export type UseAtomBulkUpdateEventTypesToDefaultLocationProps = {
  onSuccess?: () => void;
  onError?: (err: Error) => void;
  onSettled?: () => void;
};
export const useAtomBulkUpdateEventTypesToDefaultLocation = ({
  onSuccess = () => {
    return;
  },
  onError = () => {
    return;
  },
  onSettled = () => {
    return;
  },
}: UseAtomBulkUpdateEventTypesToDefaultLocationProps) => {
  return useMutation({
    onSuccess,
    onError,
    onSettled,
    mutationFn: (eventTypeIds: number[]) => {
      if (!eventTypeIds || eventTypeIds.length < 1) throw new Error("Event type ids are required");
      const pathname = `/atoms/${V2_ENDPOINTS.eventTypes}/bulk-update-to-default-location`;

      return http?.patch(pathname, { eventTypeIds }).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return (res.data as ApiSuccessResponse<EventType>).data;
        }
        throw new Error(res.data.error.message);
      });
    },
  });
};
