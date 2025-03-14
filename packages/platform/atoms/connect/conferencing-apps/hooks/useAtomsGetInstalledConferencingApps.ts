import { useQuery } from "@tanstack/react-query";

import type { ConnectedApps } from "@calcom/lib/getConnectedApps";
import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, ApiSuccessResponse } from "@calcom/platform-types";

import { useAtomsContext } from "../../../hooks/useAtomsContext";
import http from "../../../lib/http";

export const QUERY_KEY = "get-installed-conferencing-apps";

export const useAtomsGetInstalledConferencingApps = (teamId?: number, organizationId?: number) => {
  const { isInit, accessToken } = useAtomsContext();

  let pathname = "/atoms/conferencing";

  if (organizationId) {
    if (teamId) {
      // Team-level operation
      pathname = `/atoms/organizations/${organizationId}/teams/${teamId}/conferencing`;
    } else {
      // Organization-level operation
      pathname = `/atoms/organizations/${organizationId}/conferencing`;
    }
  }

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
