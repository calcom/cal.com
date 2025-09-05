import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, CreateOAuthClientInput, CreateOAuthClientOutput } from "@calcom/platform-types";
import { useMutation } from "@tanstack/react-query";

export interface IPersistOAuthClient {
  onSuccess?: () => void;
  onError?: () => void;
}

export const useCreateOAuthClient = (
  { onSuccess, onError }: IPersistOAuthClient = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  return useMutation<ApiResponse<CreateOAuthClientOutput>, unknown, CreateOAuthClientInput>({
    mutationFn: async (data) => {
      return fetch("/api/v2/oauth-clients", {
        method: "post",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify(data),
      }).then((res) => res.json());
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
};
