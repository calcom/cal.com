import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { CALENDARS } from "@calcom/platform-constants";
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
}
const stripeQueryKey = ["get-stripe-check"];
const stripeTeamQueryKey = ["get-stripe-team-check"];

export type OnCheckErrorType = (err: ApiErrorResponse) => void;
export const getQueryKey = (calendar: (typeof CALENDARS)[number]) => [`get-${calendar}-check`];

export const useCheck = ({ onCheckError, initialData, onCheckSuccess }: UseCheckProps) => {
  const { isInit, accessToken } = useAtomsContext();
  const queryClient = useQueryClient();

  const { data: check, refetch } = useQuery({
    queryKey: stripeQueryKey,
    enabled: isInit && !!accessToken,
    queryFn: () => {
      return http
        ?.get<ApiResponse<{ checked: boolean; allowConnect: boolean }>>(`/stripe/check`)
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
      queryClient.setQueryData(stripeQueryKey, {
        status: SUCCESS_STATUS,
        data: { allowConnect: false, checked: false },
      });
      refetch();
    },
  };
};

export const useTeamCheck = ({
  teamId,
  onCheckError,
  initialData,
  onCheckSuccess,
}: UseCheckProps & { teamId?: number | null }) => {
  const { isInit, accessToken } = useAtomsContext();
  const queryClient = useQueryClient();

  const { data: check, refetch } = useQuery({
    queryKey: stripeTeamQueryKey,
    enabled: isInit && !!accessToken && !!teamId,
    queryFn: () => {
      return http
        ?.get<ApiResponse<{ checked: boolean; allowConnect: boolean }>>(`/stripe/check/${teamId}`)
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
      queryClient.setQueryData(stripeQueryKey, {
        status: SUCCESS_STATUS,
        data: { allowConnect: false, checked: false },
      });
      refetch();
    },
  };
};
