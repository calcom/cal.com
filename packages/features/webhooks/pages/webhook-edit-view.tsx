import { useRouter } from "next/navigation";

import { APP_NAME } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Meta, showToast, SkeletonContainer } from "@calcom/ui";

import { getLayout } from "../../settings/layouts/SettingsLayout";
import type { WebhookFormSubmitData } from "../components/WebhookForm";
import WebhookForm from "../components/WebhookForm";
import { subscriberUrlReserved } from "../lib/subscriberUrlReserved";

const EditWebhook = () => {
  const searchParams = useCompatSearchParams();
  const id = searchParams?.get("id");

  if (!id) return <SkeletonContainer />;

  // I think we should do SSR for this page
  return <Component webhookId={id} />;
};

function Component({ webhookId }: { webhookId: string }) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const router = useRouter();
  const { data: installedApps, isPending } = trpc.viewer.integrations.useQuery(
    { variant: "other", onlyInstalled: true },
    {
      suspense: true,
      enabled: !!webhookId,
    }
  );
  const { data: webhook } = trpc.viewer.webhook.get.useQuery(
    { webhookId },
    {
      suspense: true,
      enabled: !!webhookId,
    }
  );
  const { data: webhooks } = trpc.viewer.webhook.list.useQuery(undefined, {
    suspense: true,
    enabled: !!webhookId,
  });
  const editWebhookMutation = trpc.viewer.webhook.edit.useMutation({
    async onSuccess() {
      await utils.viewer.webhook.list.invalidate();
      await utils.viewer.webhook.get.invalidate({ webhookId });
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
      <Meta
        title={t("edit_webhook")}
        description={t("add_webhook_description", { appName: APP_NAME })}
        borderInShellHeader={true}
        backButton
      />
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

EditWebhook.getLayout = getLayout;

export default EditWebhook;
