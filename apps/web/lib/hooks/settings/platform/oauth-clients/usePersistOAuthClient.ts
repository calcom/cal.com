import { useMutation, useQuery } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type {
  ApiResponse,
  CreateOAuthClientInput,
  DeleteOAuthClientInput,
  SubscribeTeamInput,
} from "@calcom/platform-types";
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

export const useCheckTeamBilling = (teamId?: number | null) => {
  const QUERY_KEY = "check-team-billing";
  const isTeamBilledAlready = useQuery({
    queryKey: [QUERY_KEY, teamId],
    queryFn: async () => {
      const response = await fetch(`/api/v2/billing/${teamId}/check`, {
        method: "get",
        headers: { "Content-type": "application/json" },
      });
      const data = await response.json();

      return data.data;
    },
    enabled: !!teamId,
  });

  return isTeamBilledAlready;
};

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
