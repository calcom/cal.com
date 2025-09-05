import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse } from "@calcom/platform-types";
import { useMutation } from "@tanstack/react-query";

export const useUnsubscribeTeamToStripe = (
  { onSuccess, onError, teamId }: { teamId?: number | null; onSuccess: () => void; onError: () => void } = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  const mutation = useMutation<ApiResponse, unknown>({
    mutationFn: (data) => {
      return fetch(`/api/v2/billing/${teamId}/unsubscribe`, {
        method: "delete",
        headers: { "Content-type": "application/json" },
      }).then((res) => res?.json());
    },
    onSuccess: (data) => {
      if (data.status === SUCCESS_STATUS) {
        onSuccess?.();
      } else {
        onError?.();
      }
    },
    onError: () => {
      onError?.();
    },
  });

  return mutation;
};
