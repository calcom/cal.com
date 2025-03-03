import { useQuery } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiSuccessResponse } from "@calcom/platform-types";
import type { ApiResponse } from "@calcom/platform-types";

import { useAtomsContext } from "../../../hooks/useAtomsContext";
import http from "../../../lib/http";

export const QUERY_KEY = "use-get-default-conferencing-app";

type ResponseDataType =
  | {
      appSlug?: string;
      appLink?: string;
    }
  | undefined;
export const useGetDefaultConferencingApp = (teamId?: number, orgId?: number) => {
  const { isInit, accessToken } = useAtomsContext();

  let pathname = `/conferencing/default`;

  if (teamId && orgId) {
    pathname = `/organizations/${orgId}/teams/${teamId}/conferencing/default`;
  }

  return useQuery({
    queryKey: [QUERY_KEY, teamId, orgId],
    queryFn: () => {
      return http?.get<ApiResponse<ResponseDataType>>(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return (res.data as ApiSuccessResponse<ResponseDataType>).data;
        }
        throw new Error(res.data.error.message);
      });
    },
    enabled: isInit && !!accessToken,
  });
};
