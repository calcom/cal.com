import { useQuery } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiSuccessResponse } from "@calcom/platform-types";
import type { ApiResponse } from "@calcom/platform-types";
import type { OrgTeamOutputDto } from "@calcom/platform-types";

import http from "../../lib/http";
import { useAtomsContext } from "../useAtomsContext";

export const QUERY_KEY = "use-teams";

export const useTeams = () => {
  const { organizationId } = useAtomsContext();

  const pathname = `/organizations/${organizationId}/teams/me`;

  const event = useQuery({
    queryKey: [QUERY_KEY, organizationId],
    queryFn: async () => {
      return http
        ?.get<ApiResponse<(OrgTeamOutputDto & { accepted: boolean; role: string })[]>>(pathname)
        .then((res) => {
          if (res.data.status === SUCCESS_STATUS) {
            return (
              res.data as ApiSuccessResponse<(OrgTeamOutputDto & { accepted: boolean; role: string })[]>
            ).data;
          }
          throw new Error(res.data.error.message);
        });
    },
    enabled: !!organizationId,
  });

  return event;
};
