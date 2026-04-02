import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse } from "@calcom/platform-types";
import { useQuery } from "@tanstack/react-query";
import http from "../../lib/http";
import { useAtomsContext } from "../useAtomsContext";

export const useGetRedirectUrl = (returnTo?: string, onErrorReturnTo?: string, teamId?: number | null) => {
  const { organizationId } = useAtomsContext();

  // Determine the appropriate endpoint based on whether teamId is provided
  let pathname = "/stripe/connect";

  if (teamId && organizationId) {
    pathname = `/organizations/${organizationId}/teams/${teamId}/stripe/connect`;
  }

  // Add query parameters
  const queryParams = new URLSearchParams();
  if (returnTo) queryParams.append("returnTo", returnTo);
  if (onErrorReturnTo) queryParams.append("onErrorReturnTo", onErrorReturnTo);

  const fullPath = queryParams.toString() ? `${pathname}?${queryParams.toString()}` : pathname;

  return useQuery({
    queryKey: ["get-stripe-connect-redirect-uri", teamId, organizationId],
    staleTime: Infinity,
    enabled: false,
    queryFn: () => {
      return http?.get<ApiResponse<{ authUrl: string }>>(fullPath).then(({ data: responseBody }) => {
        if (responseBody.status === SUCCESS_STATUS) {
          return responseBody.data.authUrl;
        }
        if (responseBody.status === ERROR_STATUS) throw new Error(responseBody.error.message);
        return "";
      });
    },
  });
};

export const useConnect = (returnTo?: string, onErrorReturnTo?: string, teamId?: number | null) => {
  const { refetch } = useGetRedirectUrl(returnTo, onErrorReturnTo, teamId);

  const connect = async () => {
    const redirectUri = await refetch();

    if (redirectUri.data) {
      window.location.href = redirectUri.data;
    }
  };

  return { connect };
};
