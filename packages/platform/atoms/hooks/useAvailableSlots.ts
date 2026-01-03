import { useQuery } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type {
  GetAvailableSlotsInput_2024_04_15,
  ApiResponse,
  ApiSuccessResponse,
} from "@calcom/platform-types";
import type { GetAvailableSlotsResponse } from "@calcom/trpc/server/routers/viewer/slots/util";

import http from "../lib/http";

export const QUERY_KEY = "get-available-slots";

export const useAvailableSlots = ({
  enabled,
  // When true, include `timeZone` in the query key so react-query will refetch
  // when the booker timezone changes for restriction schedules using booker timezone.
  includeBookerTimezoneInQueryKey,
  ...rest
}: GetAvailableSlotsInput_2024_04_15 & { enabled: boolean; includeBookerTimezoneInQueryKey?: boolean }) => {
  const baseKey = [
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
  ];

  const queryKey = includeBookerTimezoneInQueryKey ? [...baseKey, rest.timeZone] : baseKey;

  const availableSlots = useQuery({
    queryKey,
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
