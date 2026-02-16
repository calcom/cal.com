"use client";

import { WEBHOOK_TRIGGER_EVENTS } from "@calcom/features/webhooks/lib/constants";
import { subscriberUrlReserved } from "@calcom/features/webhooks/lib/subscriberUrlReserved";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { revalidateWebhooksList } from "@calcom/web/app/(use-page-wrapper)/settings/(settings-layout)/developer/webhooks/(with-loader)/actions";
import { CardFrame } from "@coss/ui/components/card";
import { toastManager } from "@coss/ui/components/toast";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { WebhookFormSubmitData } from "../components/WebhookForm";
import WebhookForm from "../components/WebhookForm";
import { WebhookVersionCTA } from "../components/WebhookVersionCTA";
import { WebhookFormHeader } from "./webhook-form-header";

type Props = {
  webhooks: RouterOutputs["viewer"]["webhook"]["list"];
  installedApps: RouterOutputs["viewer"]["apps"]["integrations"];
};

export const NewWebhookView = ({ webhooks, installedApps }: Props) => {
  const searchParams = useCompatSearchParams();
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const router = useRouter();
  const session = useSession();

  const teamId = searchParams?.get("teamId") ? Number(searchParams.get("teamId")) : undefined;
  const platform = searchParams?.get("platform") ? Boolean(searchParams.get("platform")) : false;

  const createWebhookMutation = trpc.viewer.webhook.create.useMutation({
    async onSuccess() {
      toastManager.add({ title: t("webhook_created_successfully"), type: "success" });
      await utils.viewer.webhook.list.invalidate();
      revalidateWebhooksList();
      router.push("/settings/developer/webhooks");
    },
    onError(error) {
      toastManager.add({ title: error.message, type: "error" });
    },
  });

  const onCreateWebhook = async (values: WebhookFormSubmitData) => {
    if (
      subscriberUrlReserved({
        subscriberUrl: values.subscriberUrl,
        id: values.id,
        webhooks,
        teamId,
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
      teamId,
      platform,
    });
  };

  return (
    <WebhookForm
      noRoutingFormTriggers={false}
      onSubmit={onCreateWebhook}
      apps={installedApps?.items.map((app) => app.slug)}
      headerWrapper={(formMethods, children) => (
        <CardFrame>
          <WebhookFormHeader CTA={<WebhookVersionCTA formMethods={formMethods} />} />
          {children}
        </CardFrame>
      )}
    />
  );
};

export default NewWebhookView;
