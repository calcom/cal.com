import { useMutation } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, CreateOAuthClientInput, DeleteOAuthClientInput } from "@calcom/platform-types";

interface IPersistOAuthClient {
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
  const mutation = useMutation<
    ApiResponse<{ client_id: string; client_secret: string }>,
    unknown,
    CreateOAuthClientInput
  >({
    mutationFn: (data) => {
      return fetch("/api/v2/oauth-clients", {
        method: "post",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify(data),
      }).then((res) => res.json());
    },
    onSuccess: (data, variables, context) => {
      if (data.status === SUCCESS_STATUS) {
        onSuccess?.();
      } else {
        // handle api errors
        // error
      }
    },
    onError: (error, variables, context) => {
      onError?.();
    },
  });

  return mutation;
};

export const useDeleteOAuthClient = ({ onSuccess, onError }: IPersistOAuthClient) => {
  const mutation = useMutation<
    ApiResponse<{ client_id: string; client_secret: string }>,
    unknown,
    DeleteOAuthClientInput
  >({
    mutationFn: (data) => {
      const { id } = data;
      console.log("Data for delete oauth client input:", data, id);

      return fetch(`/api/v2/oauth-clients/${id}`, {
        method: "delete",
        headers: { "Content-type": "application/json" },
      }).then((res) => {
        console.log("This is the response", res.json());

        return res.json();
      });
    },
    onSuccess: (data, variables, context) => {
      if (data.status === SUCCESS_STATUS) {
        console.log("Deleted client successfully");

        onSuccess?.();
      } else {
        // handle api errors
        // error
      }
    },
    onError: (error, variables, context) => {
      onError?.();
    },
  });

  return mutation;
};
