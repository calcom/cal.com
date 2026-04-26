"use client";

import { WEBHOOK_TRIGGER_EVENTS } from "@calcom/features/webhooks/lib/constants";
import type { WebhookVersion } from "@calcom/features/webhooks/lib/interface/IWebhookRepository";
import { subscriberUrlReserved } from "@calcom/features/webhooks/lib/subscriberUrlReserved";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { AppRouter } from "@calcom/trpc/types/server/routers/_app";
import { revalidateWebhooksList } from "@calcom/web/app/(use-page-wrapper)/settings/(settings-layout)/developer/webhooks/(with-loader)/actions";
import { toastManager } from "@coss/ui/components/toast";
import type { TRPCClientErrorLike } from "@trpc/client";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { WebhookFormSubmitData, WebhookFormValues } from "../components/WebhookForm";
import WebhookForm from "../components/WebhookForm";
import { WebhookVersionCTA } from "../components/WebhookVersionCTA";
import { WebhookFormHeader } from "./webhook-form-header";
import { WebhookFormSkeleton } from "./webhook-form-skeleton";

type WebhookProps = {
  id: string;
  userId: number | null;
  subscriberUrl: string;
  payloadTemplate: string | null;
  active: boolean;
  eventTriggers: WebhookTriggerEvents[];
  secret: string | null;
  platform: boolean;
  version: WebhookVersion;
};

export function EditWebhookView({ webhook }: { webhook?: WebhookProps }): JSX.Element {
  const { t } = useLocale();
  const router = useRouter();
  const { data: installedApps, isPending } = trpc.viewer.apps.integrations.useQuery(
    { variant: "other", onlyInstalled: true },
    {
      suspense: true,
      enabled: !!webhook,
    }
  );

  const { data: webhooks } = trpc.viewer.webhook.list.useQuery(undefined, {
    suspense: true,
    enabled: !!webhook,
  });
  const editWebhookMutation = trpc.viewer.webhook.edit.useMutation({
    onSuccess(): void {
      toastManager.add({ title: t("webhook_updated_successfully"), type: "success" });
      router.push("/settings/developer/webhooks");
      revalidateWebhooksList();
    },
    onError(error: TRPCClientErrorLike<AppRouter>): void {
      toastManager.add({ title: error.message, type: "error" });
    },
  });

  if (isPending || !webhook) return <WebhookFormSkeleton titleKey="edit_webhook" />;

  return (
    <WebhookForm
      webhook={webhook}
      headerWrapper={(formMethods: UseFormReturn<WebhookFormValues>, children: ReactNode): JSX.Element => (
        <>
          <WebhookFormHeader titleKey="edit_webhook" CTA={<WebhookVersionCTA formMethods={formMethods} />} />
          {children}
        </>
      )}
      onSubmit={(values: WebhookFormSubmitData): void => {
        if (
          subscriberUrlReserved({
            subscriberUrl: values.subscriberUrl,
            id: webhook.id,
            webhooks,
            userId: webhook.userId ?? undefined,
            platform: webhook.platform ?? undefined,
          })
        ) {
          toastManager.add({ title: t("webhook_subscriber_url_reserved"), type: "error" });
          return;
        }

        if (values.changeSecret) {
          if (values.newSecret.trim().length) {
            values.secret = values.newSecret;
          } else {
            values.secret = null;
          }
        }

        if (!values.payloadTemplate) {
          values.payloadTemplate = null;
        }

        editWebhookMutation.mutate({
          id: webhook.id,
          subscriberUrl: values.subscriberUrl,
          eventTriggers: values.eventTriggers.filter((trigger) =>
            WEBHOOK_TRIGGER_EVENTS.includes(trigger as (typeof WEBHOOK_TRIGGER_EVENTS)[number])
          ) as unknown as Parameters<typeof editWebhookMutation.mutate>[0]["eventTriggers"],
          active: values.active,
          payloadTemplate: values.payloadTemplate,
          secret: values.secret,
          time: values.time,
          timeUnit: values.timeUnit,
          version: values.version,
        });
      }}
      apps={installedApps?.items.map((app) => app.slug)}
    />
  );
}

export default EditWebhookView;
