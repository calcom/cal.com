import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiErrorResponse, ApiResponse } from "@calcom/platform-types";

import http from "../../lib/http";
import { useAtomsContext } from "../useAtomsContext";

export interface UseCheckProps {
  onCheckError?: OnCheckErrorType;
  onCheckSuccess?: () => void;
  initialData?: {
    status: typeof SUCCESS_STATUS | typeof ERROR_STATUS;
    data: {
      allowConnect: boolean;
      checked: boolean;
    };
  };
  teamId?: number | null;
}
const stripeTeamQueryKey = "get-stripe-check";

export type OnCheckErrorType = (err: ApiErrorResponse) => void;

export const useCheck = ({ teamId, onCheckError, initialData, onCheckSuccess }: UseCheckProps) => {
  const { isInit, accessToken, organizationId } = useAtomsContext();
  const queryClient = useQueryClient();

  // Determine the appropriate endpoint based on whether teamId is provided
  let pathname = "/stripe/check";

  if (teamId && organizationId) {
    pathname = `/organizations/${organizationId}/teams/${teamId}/stripe/check`;
  }

  const {
    data: check,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: [stripeTeamQueryKey, teamId, organizationId],
    enabled: isInit && !!accessToken,
    queryFn: () => {
      return http
        ?.get<ApiResponse<{ checked: boolean; allowConnect: boolean }>>(pathname)
        .then(({ data: responseBody }) => {
          if (responseBody.status === SUCCESS_STATUS) {
            onCheckSuccess?.();
            return { status: SUCCESS_STATUS, data: { allowConnect: false, checked: true } };
          }
          onCheckError?.(responseBody);
          return { status: ERROR_STATUS, data: { allowConnect: true, checked: true } };
        })
        .catch((err) => {
          onCheckError?.(err);
          return { status: ERROR_STATUS, data: { allowConnect: true, checked: true } };
        });
    },
    initialData,
  });
  return {
    allowConnect: check?.data?.allowConnect ?? false,
    checked: check?.data?.checked ?? false,
    refetch: () => {
      queryClient.setQueryData([stripeTeamQueryKey, teamId, organizationId], {
        status: SUCCESS_STATUS,
        data: { allowConnect: false, checked: false },
      });
      refetch();
    },
    isLoading,
  };
};
