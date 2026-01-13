import { useQuery } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type {
  GetAvailableSlotsInput_2024_04_15,
  ApiResponse,
  ApiSuccessResponse,
} from "@calcom/platform-types";

import http from "../lib/http";
import type { GetAvailableSlotsResponse } from "../booker/types";

export const QUERY_KEY = "get-available-slots";

export const useAvailableSlots = ({
  enabled,
  ...rest
}: GetAvailableSlotsInput_2024_04_15 & { enabled: boolean }) => {
  const availableSlots = useQuery({
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
      rest.teamMemberEmail,
      rest.rrHostSubsetIds,
    ],
    queryFn: () => {
      return http
        .get<ApiResponse<GetAvailableSlotsResponse>>("/slots/available", {
          params: rest,
        })
        .then((res) => {
          if (res.data.status === SUCCESS_STATUS) {
            return (res.data as ApiSuccessResponse<GetAvailableSlotsResponse>).data;
          }
          throw new Error(res.data.error.message);
        });
    },
    enabled: enabled,
  });
  return availableSlots;
};
