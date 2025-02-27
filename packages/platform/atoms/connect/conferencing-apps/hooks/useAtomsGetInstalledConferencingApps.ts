import { useQuery } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ConnectedApps } from "@calcom/platform-libraries";
import type { ApiResponse, ApiSuccessResponse } from "@calcom/platform-types";

import { useAtomsContext } from "../../../hooks/useAtomsContext";
import http from "../../../lib/http";

export const QUERY_KEY = "get-installed-conferencing-apps";

export const useAtomsGetInstalledConferencingApps = (teamId?: number) => {
  const { isInit, accessToken, organizationId } = useAtomsContext();
  const pathname = `/atoms/conferencing?${teamId ? `teamId=${teamId}` : ""}${
    organizationId ? `&orgId=${organizationId}` : ""
  }`;

  return useQuery({
    queryKey: [QUERY_KEY, teamId, organizationId],
    queryFn: () => {
      return http?.get<ApiResponse<ConnectedApps>>(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return (res.data as ApiSuccessResponse<ConnectedApps>).data;
        }
        throw new Error(res.data.error.message);
      });
    },
    enabled: isInit && !!accessToken,
  });
};
