import { useMutation } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiErrorResponse, ApiResponse } from "@calcom/platform-types";

import http from "../../lib/http";

interface IUseRemoveSelectedCalendar {
  onSuccess?: (res: ApiResponse) => void;
  onError?: (err: ApiErrorResponse | Error) => void;
}

export const useRemoveSelectedCalendar = (
  { onSuccess, onError }: IUseRemoveSelectedCalendar = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  const deletedCalendarEntry = useMutation<
    ApiResponse<{
      status: string;
      data: {
        userId: number;
        integration: string;
        externalId: string;
        credentialId: number | null;
      };
    }>,
    unknown,
    {
      credentialId: number;
      integration: string;
      externalId: string;
      delegationCredentialId: string | null;
    }
  >({
    mutationFn: (data) => {
      const { credentialId, externalId, integration, delegationCredentialId } = data;

      return http
        .delete(
          `/selected-calendars?credentialId=${credentialId}&integration=${integration}&externalId=${encodeURIComponent(
            externalId
          )}${delegationCredentialId ? `&delegationCredentialId=${delegationCredentialId}` : ""}`
        )
        .then((res) => {
          return res.data;
        });
    },
    onSuccess: (data) => {
      if (data.status === SUCCESS_STATUS) {
        onSuccess?.(data);
      } else {
        onError?.(data);
      }
    },
    onError: (err) => {
      onError?.(err as ApiErrorResponse);
    },
  });

  return deletedCalendarEntry;
};
