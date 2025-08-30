import { useMutation } from "@tanstack/react-query";

import { V2_ENDPOINTS, SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, ApiSuccessResponse } from "@calcom/platform-types";
import type { EventType } from "@calcom/prisma/client";

import http from "../../../lib/http";
import { useAtomsContext } from "../../useAtomsContext";

export const QUERY_KEY = "use-delete-team-event-by-id";
export type UseDeleteTeamEventTypeProps = {
  onSuccess?: (data: ResponseDataType) => void;
  onError?: (err: Error) => void;
  onSettled?: () => void;
};

export type ResponseDataType = NonNullable<
  Pick<EventType, "id" | "slug" | "title"> & { lengthInMinutes: number }
>;

export const useDeleteTeamEventTypeById = ({
  onSuccess,
  onError,
  onSettled,
}: UseDeleteTeamEventTypeProps) => {
  const { organizationId } = useAtomsContext();

  return useMutation({
    onSuccess,
    onError,
    onSettled,
    mutationFn: ({ eventTypeId, teamId }: { eventTypeId: number; teamId: number }) => {
      if (!eventTypeId) throw new Error("Event type id is required");
      if (!teamId) throw new Error("team id is required");
      if (!organizationId) throw new Error("organization id is required");

      const pathname = `/organizations/${organizationId}/teams/${teamId}/${V2_ENDPOINTS.eventTypes}/${eventTypeId}`;
      return http?.delete<ApiResponse<ResponseDataType>>(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return (res.data as ApiSuccessResponse<ResponseDataType>).data;
        }
        throw new Error(res.data.error.message);
      });
    },
  });
};
