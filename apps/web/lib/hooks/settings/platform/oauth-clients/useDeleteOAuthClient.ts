import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, DeleteOAuthClientInput, PlatformOAuthClientDto } from "@calcom/platform-types";
import type { IPersistOAuthClient } from "@lib/hooks/settings/platform/oauth-clients/useCreateOAuthClient";
import { useMutation } from "@tanstack/react-query";

export const useDeleteOAuthClient = (
  { onSuccess, onError }: IPersistOAuthClient = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  const mutation = useMutation<ApiResponse<PlatformOAuthClientDto>, unknown, DeleteOAuthClientInput>({
    mutationFn: async (data) => {
      const { id } = data;
      return fetch(`/api/v2/oauth-clients/${id}`, {
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
