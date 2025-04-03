import { useQuery } from "@tanstack/react-query";

import type { ConnectedApps } from "@calcom/lib/getConnectedApps";
import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, ApiSuccessResponse } from "@calcom/platform-types";

import { useAtomsContext } from "../../../hooks/useAtomsContext";
import http from "../../../lib/http";

export const QUERY_KEY = "get-installed-conferencing-apps";

export const useAtomsGetInstalledConferencingApps = (teamId?: number) => {
  const { isInit, accessToken, organizationId } = useAtomsContext();

  let pathname = "/atoms/conferencing";

  if (teamId) {
    pathname = `/atoms/organizations/${organizationId}/teams/${teamId}/conferencing`;
  }

  return useQuery({
    queryKey: [QUERY_KEY, teamId, organizationId],
    queryFn: () => {
      return http
        ?.get<ApiResponse<ConnectedApps>>(pathname)
        .then((res) => {
          if (res.data.status === SUCCESS_STATUS) {
            return (res.data as ApiSuccessResponse<ConnectedApps>).data;
          }
          throw new Error(res.data.error.message);
        })
        .catch(() => {
          throw new Error("Failed to get installed conferencing apps");
        });
    },
    enabled: isInit && !!accessToken,
  });
};
