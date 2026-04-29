"use client";

import { WEBHOOK_TRIGGER_EVENTS } from "@calcom/features/webhooks/lib/constants";
import { subscriberUrlReserved } from "@calcom/features/webhooks/lib/subscriberUrlReserved";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import type { AppRouter } from "@calcom/trpc/types/server/routers/_app";
import { revalidateWebhooksList } from "@calcom/web/app/(use-page-wrapper)/settings/(settings-layout)/developer/webhooks/(with-loader)/actions";
import { toastManager } from "@coss/ui/components/toast";
import type { TRPCClientErrorLike } from "@trpc/client";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { WebhookFormSubmitData, WebhookFormValues } from "../components/WebhookForm";
import WebhookForm from "../components/WebhookForm";
import { WebhookVersionCTA } from "../components/WebhookVersionCTA";
import { WebhookFormHeader } from "./webhook-form-header";

type Props = {
  webhooks: RouterOutputs["viewer"]["webhook"]["list"];
  installedApps: RouterOutputs["viewer"]["apps"]["integrations"];
};

export const NewWebhookView = ({ webhooks, installedApps }: Props): JSX.Element => {
  const searchParams = useCompatSearchParams();
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const router = useRouter();
  const session = useSession();
  let platform = false;

  if (searchParams?.get("platform")) {
    platform = Boolean(searchParams.get("platform"));
  }

  const createWebhookMutation = trpc.viewer.webhook.create.useMutation({
    async onSuccess(): Promise<void> {
      toastManager.add({ title: t("webhook_created_successfully"), type: "success" });
      await utils.viewer.webhook.list.invalidate();
      revalidateWebhooksList();
      router.push("/settings/developer/webhooks");
    },
    onError(error: TRPCClientErrorLike<AppRouter>): void {
      toastManager.add({ title: error.message, type: "error" });
    },
  });

  const onCreateWebhook = async (values: WebhookFormSubmitData): Promise<void> => {
    if (
      subscriberUrlReserved({
        subscriberUrl: values.subscriberUrl,
        id: values.id,
        webhooks,
        userId: session.data?.user.id,
        platform,
      })
    ) {
      toastManager.add({ title: t("webhook_subscriber_url_reserved"), type: "error" });
      return;
    }

    if (!values.payloadTemplate) {
      values.payloadTemplate = null;
    }

    createWebhookMutation.mutate({
      subscriberUrl: values.subscriberUrl,
      eventTriggers: values.eventTriggers.filter((trigger) =>
        WEBHOOK_TRIGGER_EVENTS.includes(trigger as (typeof WEBHOOK_TRIGGER_EVENTS)[number])
      ) as unknown as Parameters<typeof createWebhookMutation.mutate>[0]["eventTriggers"],
      active: values.active,
      payloadTemplate: values.payloadTemplate,
      secret: values.secret,
      time: values.time,
      timeUnit: values.timeUnit,
      version: values.version,
      platform,
    });
  };

  return (
    <WebhookForm
      onSubmit={onCreateWebhook}
      apps={installedApps?.items.map((app) => app.slug)}
      headerWrapper={(formMethods: UseFormReturn<WebhookFormValues>, children: ReactNode): JSX.Element => (
        <>
          <WebhookFormHeader CTA={<WebhookVersionCTA formMethods={formMethods} />} />
          {children}
        </>
      )}
    />
  );
};

export default NewWebhookView;
