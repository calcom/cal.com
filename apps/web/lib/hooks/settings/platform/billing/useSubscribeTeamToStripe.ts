import { useMutation } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, SubscribeTeamInput } from "@calcom/platform-types";

export const useSubscribeTeamToStripe = (
  {
    onSuccess,
    onError,
    teamId,
  }: { teamId?: number | null; onSuccess: (redirectUrl: string) => void; onError: () => void } = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  const mutation = useMutation<ApiResponse<{ action: string; url: string }>, unknown, SubscribeTeamInput>({
    mutationFn: (data) => {
      return fetch(`/api/v2/billing/${teamId}/subscribe`, {
        method: "post",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify(data),
      }).then((res) => res?.json());
    },
    onSuccess: (data) => {
      if (data.status === SUCCESS_STATUS) {
        onSuccess?.(data.data?.url);
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
