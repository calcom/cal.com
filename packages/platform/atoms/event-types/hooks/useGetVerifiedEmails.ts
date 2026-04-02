import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, ApiSuccessResponse } from "@calcom/platform-types";
import { useQuery } from "@tanstack/react-query";
import { useAtomsContext } from "../../hooks/useAtomsContext";
import http from "../../lib/http";

export const QUERY_KEY = "use-get-verified-emails";
export const useGetVerifiedEmails = (teamId?: number) => {
  const pathname = `/atoms/emails/verified-emails${teamId ? `?teamId=${teamId}` : ""}`;
  const { isInit, accessToken } = useAtomsContext();

  return useQuery({
    queryKey: [QUERY_KEY, teamId],
    queryFn: () => {
      return http?.get<ApiResponse<string[]>>(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return (res.data as ApiSuccessResponse<string[]>).data;
        }
        throw new Error(res.data.error.message);
      });
    },
    enabled: isInit && !!accessToken,
    staleTime: 5000,
  });
};
