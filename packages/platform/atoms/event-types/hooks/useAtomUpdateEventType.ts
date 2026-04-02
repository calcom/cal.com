import type { EventTypeUpdateInput } from "@calcom/features/eventtypes/lib/types";
import { SUCCESS_STATUS, V2_ENDPOINTS } from "@calcom/platform-constants";
import type { ApiErrorResponse, ApiResponse, ApiSuccessResponse } from "@calcom/platform-types";
import type { EventType } from "@calcom/prisma/client";
import { useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useAtomsContext } from "../../hooks/useAtomsContext";
import http from "../../lib/http";

export const QUERY_KEY = "use-event-by-id";
export type UseAtomUpdateEventTypeProps = {
  onSuccess?: () => void;
  onError?: (err: Error) => void;
  onSettled?: () => void;
  teamId?: number;
};
export const useAtomUpdateEventType = ({
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
}: UseAtomUpdateEventTypeProps) => {
  const { organizationId } = useAtomsContext();
  return useMutation({
    onSuccess,
    onError,
    onSettled,
    mutationFn: async (data: EventTypeUpdateInput) => {
      if (!data.id) throw new Error("Event type id is required");
      let pathname = `/atoms/${V2_ENDPOINTS.eventTypes}/${data.id}`;

      if (teamId) {
        pathname = `/atoms/organizations/${organizationId}/teams/${teamId}/${V2_ENDPOINTS.eventTypes}/${data.id}`;
      }
      try {
        const res = await http?.patch<ApiResponse<EventType>>(pathname, data);
        if (res?.data.status === SUCCESS_STATUS) {
          return (res.data as ApiSuccessResponse<EventType>).data;
        }
        throw new Error(res?.data.error.message);
      } catch (err) {
        const axiosError = err as AxiosError<ApiErrorResponse>;
        if (axiosError.response?.data?.error?.message) {
          throw new Error(axiosError.response.data.error.message);
        }
        throw err;
      }
    },
  });
};
