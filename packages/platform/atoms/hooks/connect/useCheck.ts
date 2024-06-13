import { useQuery } from "@tanstack/react-query";

import type { CALENDARS } from "@calcom/platform-constants";
import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, ApiErrorResponse } from "@calcom/platform-types";

import http from "../../lib/http";
import { useAtomsContext } from "../useAtomsContext";

export interface UseCheckProps {
  onCheckError?: OnCheckErrorType;
  calendar: (typeof CALENDARS)[number];
}
export type OnCheckErrorType = (err: ApiErrorResponse) => void;
export const getQueryKey = (calendar: (typeof CALENDARS)[number]) => [`get-${calendar}-check`];

export const useCheck = ({ onCheckError, calendar }: UseCheckProps) => {
  const { isInit } = useAtomsContext();
  const { data: check } = useQuery({
    queryKey: getQueryKey(calendar),
    staleTime: 6000,
    enabled: isInit,
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
  });
  return { allowConnect: check?.data?.allowConnect ?? false, checked: check?.data?.checked ?? false };
};
