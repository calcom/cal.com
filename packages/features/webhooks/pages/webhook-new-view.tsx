"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast, SkeletonContainer, SkeletonText } from "@calcom/ui";

import type { WebhookFormSubmitData } from "../components/WebhookForm";
import WebhookForm from "../components/WebhookForm";
import { subscriberUrlReserved } from "../lib/subscriberUrlReserved";

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div className="divide-subtle border-subtle space-y-6 rounded-b-lg border border-t-0 px-6 py-4">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
      </div>
    </SkeletonContainer>
  );
};
export const NewWebhookView = () => {
  const searchParams = useCompatSearchParams();
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const router = useRouter();
  const session = useSession();

  const teamId = searchParams?.get("teamId") ? Number(searchParams.get("teamId")) : undefined;
  const platform = searchParams?.get("platform") ? Boolean(searchParams.get("platform")) : false;

  const { data: installedApps, isPending } = trpc.viewer.integrations.useQuery(
    { variant: "other", onlyInstalled: true },
    {
      suspense: true,
      enabled: session.status === "authenticated",
    }
  );
  const { data: webhooks } = trpc.viewer.webhook.list.useQuery(undefined, {
    suspense: true,
    enabled: session.status === "authenticated",
  });

  const createWebhookMutation = trpc.viewer.webhook.create.useMutation({
    async onSuccess() {
      showToast(t("webhook_created_successfully"), "success");
      await utils.viewer.webhook.list.invalidate();
      router.back();
    },
    onError(error) {
      showToast(`${error.message}`, "error");
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
      showToast(t("webhook_subscriber_url_reserved"), "error");
      return;
    }

    if (!values.payloadTemplate) {
      values.payloadTemplate = null;
    }

    createWebhookMutation.mutate({
      subscriberUrl: values.subscriberUrl,
      eventTriggers: values.eventTriggers,
      active: values.active,
      payloadTemplate: values.payloadTemplate,
      secret: values.secret,
      time: values.time,
      timeUnit: values.timeUnit,
      teamId,
      platform,
    });
  };

  if (isPending) return <SkeletonLoader />;

  return (
    <WebhookForm
      noRoutingFormTriggers={false}
      onSubmit={onCreateWebhook}
      apps={installedApps?.items.map((app) => app.slug)}
    />
  );
};

export default NewWebhookView;
