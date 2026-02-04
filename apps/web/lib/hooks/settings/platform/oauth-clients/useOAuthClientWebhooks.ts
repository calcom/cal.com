import { useMutation, useQuery } from "@tanstack/react-query";

import type { ApiSuccessResponse } from "@calcom/platform-types";
import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { WebhookVersion } from "@calcom/features/webhooks/lib/interface/IWebhookRepository";

type Input = {
  active: boolean;
  subscriberUrl: string;
  triggers: WebhookTriggerEvents[];
  secret?: string;
  payloadTemplate?: string;
};

type Output = {
  id: string;
  OAuthClientId: string;
  active: boolean;
  subscriberUrl: string;
  triggers: WebhookTriggerEvents[];
  secret?: string;
  payloadTemplate: string | undefined | null;
  version?: WebhookVersion;
};

export const useOAuthClientWebhooks = (clientId: string) => {
  const query = useQuery<ApiSuccessResponse<Output[]>>({
    queryKey: ["oauth-clients-webhooks", "findMany", clientId],
    queryFn: () => {
      return fetch(`/api/v2/oauth-clients/${clientId}/webhooks`, {
        method: "get",
        headers: { "Content-type": "application/json" },
      }).then((res) => res.json());
    },
    enabled: !!clientId,
  });

  return { ...query, data: query.data?.data ?? [], status: query.data?.status };
};

export const useOAuthClientWebhook = (clientId: string, webhookId: string) => {
  const query = useQuery<ApiSuccessResponse<Output>>({
    queryKey: ["oauth-clients-webhooks", "findOne", clientId, webhookId],
    queryFn: () => {
      return fetch(`/api/v2/oauth-clients/${clientId}/webhooks/${webhookId}`, {
        method: "get",
        headers: { "Content-type": "application/json" },
      }).then((res) => res.json());
    },
    enabled: !!clientId,
  });

  return { ...query, data: query.data?.data ?? [], status: query.data?.status };
};

export const useUpdateOAuthClientWebhook = (clientId: string) => {
  const mutation = useMutation<
    ApiSuccessResponse<Output>,
    unknown,
    { webhookId: string; body: Partial<Input> }
  >({
    mutationFn: ({ webhookId, body }) => {
      return fetch(`/api/v2/oauth-clients/${clientId}/webhooks/${webhookId}`, {
        method: "PATCH",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify(body),
      }).then((res) => res.json());
    },
  });

  return mutation;
};

export const useCreateOAuthClientWebhook = (clientId: string) => {
  const mutation = useMutation<ApiSuccessResponse<Output>, unknown, Input>({
    mutationFn: (body: Input) => {
      return fetch(`/api/v2/oauth-clients/${clientId}/webhooks`, {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify(body),
      }).then((res) => res.json());
    },
  });

  return mutation;
};
