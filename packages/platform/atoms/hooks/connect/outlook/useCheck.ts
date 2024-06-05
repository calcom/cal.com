import { useQuery } from "@tanstack/react-query";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, ApiErrorResponse } from "@calcom/platform-types";

import http from "../../../lib/http";

export interface UseCheckProps {
  isAuth: boolean;
  onCheckError?: OnCheckErrorType;
}
export type OnCheckErrorType = (err: ApiErrorResponse) => void;
export const QUERY_KEY = ["get-office-365-check"];

export const useCheck = ({ isAuth, onCheckError }: UseCheckProps) => {
  const { data: check } = useQuery({
    queryKey: QUERY_KEY,
    staleTime: 6000,
    enabled: isAuth,
    queryFn: () => {
      return http
        ?.get<ApiResponse<{ checked: boolean; allowConnect: boolean }>>(`/calendars/office365/check`)
        .then(({ data: responseBody }) => {
          if (responseBody.status === SUCCESS_STATUS) {
            return { status: SUCCESS_STATUS, data: { allowConnect: false, checked: true } };
          }
          onCheckError?.(responseBody);
          return { status: ERROR_STATUS, data: { allowConnect: true, checked: true } };
        });
    },
  });

  return { allowConnect: check?.data?.allowConnect ?? true, checked: check?.data?.checked ?? true };
};
