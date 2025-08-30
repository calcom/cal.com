import type { UseQueryResult } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import type {
  GetAvailableSlotsInput_2024_04_15,
  ApiResponse,
  ApiSuccessResponse,
} from "@calcom/platform-types";
import type { GetAvailableSlotsResponse } from "@calcom/trpc/server/routers/viewer/slots/util";

export const QUERY_KEY = "get-available-slots";

export function useApiV2AvailableSlots({
  enabled,
  ...rest
}: GetAvailableSlotsInput_2024_04_15 & {
  enabled: boolean;
  isTeamEvent?: boolean;
  teamId?: number;
  embedConnectVersion?: string;
}): UseQueryResult<GetAvailableSlotsResponse, Error> {
  return useQuery<GetAvailableSlotsResponse, Error>({
    queryKey: [
      QUERY_KEY,
      rest.startTime,
      rest.endTime,
      rest.eventTypeId,
      rest.eventTypeSlug,
      rest.isTeamEvent ?? false,
      rest.teamId ?? false,
      rest.usernameList,
      rest.routedTeamMemberIds,
      rest.skipContactOwner,
      rest.shouldServeCache,
      rest.teamMemberEmail,
      rest.embedConnectVersion ?? false,
    ],
    queryFn: async (): Promise<GetAvailableSlotsResponse> => {
      const res = await axios.get<ApiResponse<GetAvailableSlotsResponse>>("/api/v2/slots/available", {
        params: rest,
      });
      if (res.data.status === "success") {
        return (res.data as ApiSuccessResponse<GetAvailableSlotsResponse>).data;
      }
      throw new Error(res.data.error.message);
    },
    enabled,
  });
}
