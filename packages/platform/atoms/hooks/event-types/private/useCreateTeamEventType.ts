import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_06_14 } from "@calcom/platform-constants";
import type {
  ApiResponse,
  ApiSuccessResponse,
  CreateTeamEventTypeInput_2024_06_14,
} from "@calcom/platform-types";
import type { EventType } from "@calcom/prisma/client";
import { useMutation } from "@tanstack/react-query";
import http from "../../../lib/http";
import { useAtomsContext } from "../../useAtomsContext";

export const QUERY_KEY = "use-create-team-event";
export type UseCreateTeamEventTypeProps = {
  onSuccess?: (eventType: EventType) => void;
  onError?: (err: Error) => void;
  onSettled?: () => void;
};
export const useCreateTeamEventType = ({ onSuccess, onError, onSettled }: UseCreateTeamEventTypeProps) => {
  const { organizationId } = useAtomsContext();

  return useMutation({
    onSuccess,
    onError,
    onSettled,
    mutationFn: ({ teamId, ...body }: CreateTeamEventTypeInput_2024_06_14 & { teamId: number }) => {
      if (!teamId) throw new Error("Event type id is required");
      const pathname = `/organizations/${organizationId}/teams/${teamId}/event-types`;
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
