import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { AvailableSlotsType } from "@calcom/platform-libraries";
import type {
  GetAvailableSlotsInput_2024_04_15,
  ApiResponse,
  ApiSuccessResponse,
} from "@calcom/platform-types";

export const QUERY_KEY = "get-available-slots";

export const useApiV2AvailableSlots = ({
  enabled,
  ...rest
}: GetAvailableSlotsInput_2024_04_15 & { enabled: boolean; isTeamEvent?: boolean; teamId?: number }) => {
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
      rest.shouldServeCache,
      rest.teamMemberEmail,
    ],
    queryFn: () => {
      return axios
        .get<ApiResponse<AvailableSlotsType>>(`${process.env.NEXT_PUBLIC_API_V2_URL}/slots/available`, {
          params: rest,
        })
        .then((res) => {
          if (res.data.status === SUCCESS_STATUS) {
            return (res.data as ApiSuccessResponse<AvailableSlotsType>).data;
          }
          throw new Error(res.data.error.message);
        });
    },
    enabled: enabled,
  });
  return availableSlots;
};
