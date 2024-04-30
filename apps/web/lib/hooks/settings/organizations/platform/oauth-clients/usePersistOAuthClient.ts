import { useMutation } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, CreateOAuthClientInput, DeleteOAuthClientInput } from "@calcom/platform-types";
import type { OAuthClient } from "@calcom/prisma/client";

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
  return useMutation<
    ApiResponse<{ clientId: string; clientSecret: string }>,
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

export const useUpdateOAuthClient = (
  { onSuccess, onError, clientId }: IPersistOAuthClient & { clientId?: string } = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  const mutation = useMutation<
    ApiResponse<{ clientId: string; clientSecret: string }>,
    unknown,
    Omit<CreateOAuthClientInput, "permissions">
  >({
    mutationFn: (data) => {
      return fetch(`/api/v2/oauth-clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify(data),
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
  const mutation = useMutation<ApiResponse<OAuthClient>, unknown, DeleteOAuthClientInput>({
    mutationFn: (data) => {
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
