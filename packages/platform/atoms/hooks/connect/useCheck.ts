import type { CALENDARS } from "@calcom/platform-constants";
import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiErrorResponse, ApiResponse } from "@calcom/platform-types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import http from "../../lib/http";
import { useAtomsContext } from "../useAtomsContext";

export interface UseCheckProps {
  onCheckError?: OnCheckErrorType;
  calendar: (typeof CALENDARS)[number];
  initialData?: {
    status: typeof SUCCESS_STATUS | typeof ERROR_STATUS;
    data: {
      allowConnect: boolean;
      checked: boolean;
    };
  };
}

export type OnCheckErrorType = (err: ApiErrorResponse) => void;
export const getQueryKey = (calendar: (typeof CALENDARS)[number]) => [`get-${calendar}-check`];

export const useCheck = ({ onCheckError, calendar, initialData }: UseCheckProps) => {
  const { isInit, accessToken } = useAtomsContext();
  const queryClient = useQueryClient();

  const { data: check, refetch } = useQuery({
    queryKey: getQueryKey(calendar),
    staleTime: 6000,
    enabled: isInit && !!accessToken,
    queryFn: () => {
      return http
        ?.get<ApiResponse<{ checked: boolean; allowConnect: boolean }>>(`/calendars/${calendar}/check`)
        .then(({ data: responseBody }) => {
          if (responseBody.status === SUCCESS_STATUS) {
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
      queryClient.setQueryData(getQueryKey(calendar), {
        status: SUCCESS_STATUS,
        data: { allowConnect: false, checked: false },
      });
      refetch();
    },
  };
};
