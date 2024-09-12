"use client";

import { useRouter } from "next/navigation";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AppRepository } from "@calcom/lib/server/repository/app";
import type { WebhookRepository } from "@calcom/lib/server/repository/webhook";
import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { showToast, SkeletonContainer } from "@calcom/ui";

import type { WebhookFormSubmitData } from "../components/WebhookForm";
import WebhookForm from "../components/WebhookForm";
import { subscriberUrlReserved } from "../lib/subscriberUrlReserved";

type WebhookProps = {
  id: string;
  userId: number | null;
  teamId: number | null;
  subscriberUrl: string;
  payloadTemplate: string | null;
  active: boolean;
  eventTriggers: WebhookTriggerEvents[];
  secret: string | null;
  platform: boolean;
};

type PageProps = {
  webhook?: WebhookProps;
  ssrProps?: {
    webhooks?: Awaited<ReturnType<typeof WebhookRepository.getWebhooks>>;
    installedApps?: Awaited<ReturnType<typeof AppRepository.getInstalledApps>>;
  };
};

export function EditWebhookView({ ssrProps, webhook }: PageProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const router = useRouter();
  const { data: _installedApps, isPending: isPendingInstalledApps } = trpc.viewer.integrations.useQuery(
    { variant: "other", onlyInstalled: true },
    {
      suspense: true,
      enabled: ssrProps?.installedApps ? false : !!webhook,
    }
  );
  const installedApps = ssrProps?.installedApps ?? _installedApps;
  const isPending = ssrProps?.installedApps ? false : isPendingInstalledApps;

  const { data: _webhooks } = trpc.viewer.webhook.list.useQuery(undefined, {
    suspense: true,
    enabled: ssrProps?.webhooks ? false : !!webhook,
  });
  const webhooks = ssrProps?.webhooks ?? _webhooks;

  const editWebhookMutation = trpc.viewer.webhook.edit.useMutation({
    async onSuccess() {
      await utils.viewer.webhook.list.invalidate();
      await utils.viewer.webhook.get.invalidate({ webhookId: webhook?.id });
      showToast(t("webhook_updated_successfully"), "success");
      router.back();
    },
    onError(error) {
      showToast(`${error.message}`, "error");
    },
  });

  if (isPending || !webhook) return <SkeletonContainer />;

  return (
    <>
      <WebhookForm
        noRoutingFormTriggers={false}
        webhook={webhook}
        onSubmit={(values: WebhookFormSubmitData) => {
          if (
            subscriberUrlReserved({
              subscriberUrl: values.subscriberUrl,
              id: webhook.id,
              webhooks,
              teamId: webhook.teamId ?? undefined,
              userId: webhook.userId ?? undefined,
              platform: webhook.platform ?? undefined,
            })
          ) {
            showToast(t("webhook_subscriber_url_reserved"), "error");
            return;
          }

          if (values.changeSecret) {
            values.secret = values.newSecret.trim().length ? values.newSecret : null;
          }

          if (!values.payloadTemplate) {
            values.payloadTemplate = null;
          }

          editWebhookMutation.mutate({
            id: webhook.id,
            subscriberUrl: values.subscriberUrl,
            eventTriggers: values.eventTriggers,
            active: values.active,
            payloadTemplate: values.payloadTemplate,
            secret: values.secret,
          });
        }}
        apps={installedApps?.items.map((app) => app.slug)}
      />
    </>
  );
}

export default EditWebhookView;
