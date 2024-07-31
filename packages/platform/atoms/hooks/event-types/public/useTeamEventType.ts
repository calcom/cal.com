import { useQuery } from "@tanstack/react-query";
import { shallow } from "zustand/shallow";

import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiSuccessResponse, TeamEventTypeOutput_2024_06_14 } from "@calcom/platform-types";
import type { ApiResponse } from "@calcom/platform-types";

import http from "../../../lib/http";
import { useAtomsContext } from "../../useAtomsContext";

export const QUERY_KEY = "use-team-event-type";

export const useTeamEventType = (teamId: number  | undefined, eventSlug: string, isTeamEvent: boolean | undefined) => {
  const { organizationId } = useAtomsContext();

  const [stateEventSlug] = useBookerStore(
    (state) => [state.eventSlug],
    shallow
  );

  const requestEventSlug = stateEventSlug ?? eventSlug;

  const pathname = `/organizations/${organizationId}/teams/${teamId}/event-types?eventSlug=${requestEventSlug}`;

  const event = useQuery({
    queryKey: [QUERY_KEY, eventSlug, organizationId, teamId],
    queryFn: async () => {
      if(organizationId && teamId && eventSlug && isTeamEvent) {
        return http?.get<ApiResponse<TeamEventTypeOutput_2024_06_14[]>>(pathname).then((res) => {
          if (res.data.status === SUCCESS_STATUS) {
            return (res.data as ApiSuccessResponse<TeamEventTypeOutput_2024_06_14[]>).data;
          }
          throw new Error(res.data.error.message);
        });
      }
    },
  });

  return event;
};
