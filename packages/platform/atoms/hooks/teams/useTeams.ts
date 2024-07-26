import { useQuery } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiSuccessResponse } from "@calcom/platform-types";
import type { ApiResponse } from "@calcom/platform-types";
import type { OrgTeamOutputDto } from "@calcom/platform-types";

import http from "../../lib/http";
import { useAtomsContext } from "../useAtomsContext";

export const QUERY_KEY = "use-teams";

export const useTeams = () => {
  const { orgId } = useAtomsContext();

  const pathname = `/organizations/${orgId}/teams/me`;

  const event = useQuery({
    queryKey: [QUERY_KEY, orgId],
    queryFn: async () => {
      return http?.get<ApiResponse<OrgTeamOutputDto[]>>(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return (res.data as ApiSuccessResponse<OrgTeamOutputDto[]>).data;
        }
        throw new Error(res.data.error.message);
      });
    },
    enabled: !!orgId,
  });

  return event;
};
