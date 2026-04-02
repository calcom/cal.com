import { SUCCESS_STATUS, V2_ENDPOINTS } from "@calcom/platform-constants";
import type { ApiSuccessResponse } from "@calcom/platform-types";
import type { EventType } from "@calcom/prisma/client";
import { useMutation } from "@tanstack/react-query";
import { useAtomsContext } from "../../../hooks/useAtomsContext";
import http from "../../../lib/http";

export const QUERY_KEY = "bulk-update-event-types-to-default-location";

export type UseAtomBulkUpdateEventTypesToDefaultLocationProps = {
  onSuccess?: () => void;
  onError?: (err: Error) => void;
  onSettled?: () => void;
  teamId?: number;
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
  teamId,
}: UseAtomBulkUpdateEventTypesToDefaultLocationProps) => {
  const { organizationId } = useAtomsContext();
  return useMutation({
    onSuccess,
    onError,
    onSettled,
    mutationFn: (eventTypeIds: number[]) => {
      if (!eventTypeIds || eventTypeIds.length < 1) throw new Error("Event type ids are required");
      let pathname = `/atoms/${V2_ENDPOINTS.eventTypes}/bulk-update-to-default-location`;

      if (teamId) {
        pathname = `/atoms/organizations/${organizationId}/teams/${teamId}/${V2_ENDPOINTS.eventTypes}/bulk-update-to-default-location`;
      }

      return http?.patch(pathname, { eventTypeIds }).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return (res.data as ApiSuccessResponse<EventType>).data;
        }
        throw new Error(res.data.error.message);
      });
    },
  });
};
