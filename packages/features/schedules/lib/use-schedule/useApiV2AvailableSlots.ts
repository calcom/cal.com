import { keepPreviousData, useQuery } from "@tanstack/react-query";
import axios from "axios";

import type {
  GetAvailableSlotsInput_2024_04_15,
  ApiResponse,
  ApiSuccessResponse,
} from "@calcom/platform-types";
import type { GetAvailableSlotsResponse } from "@calcom/trpc/server/routers/viewer/slots/util";

export const QUERY_KEY = "get-available-slots";

export const useApiV2AvailableSlots = ({
  enabled,
  overlapsWithPreviousRange = false,
  ...rest
}: GetAvailableSlotsInput_2024_04_15 & { enabled: boolean; overlapsWithPreviousRange?: boolean }) => {
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
    ],
    queryFn: () => {
      return axios
        .get<ApiResponse<GetAvailableSlotsResponse>>("/api/v2/slots/available", {
          params: rest,
        })
        .then((res) => {
          if (res.data.status === "success") {
            return (res.data as ApiSuccessResponse<GetAvailableSlotsResponse>).data;
          }
          throw new Error(res.data.error.message);
        });
    },
    enabled: enabled,
    // When the date range changes but overlaps with the previous range (e.g. bookerState
    // transition widens endTime), keep showing the previous slots instead of a skeleton.
    ...(overlapsWithPreviousRange ? { placeholderData: keepPreviousData } : {}),
  });
  return availableSlots;
};
