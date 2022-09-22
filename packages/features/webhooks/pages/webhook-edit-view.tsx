import { useRouter } from "next/router";
import z from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { SkeletonContainer } from "@calcom/ui/v2";
import Meta from "@calcom/ui/v2/core/Meta";
import { getLayout } from "@calcom/ui/v2/core/layouts/SettingsLayout";
import showToast from "@calcom/ui/v2/core/notifications";

import WebhookForm, { WebhookFormSubmitData } from "../components/WebhookForm";

const querySchema = z.object({ id: z.string() });

const EditWebhook = () => {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const router = useRouter();
  const { id: webhookId } = querySchema.parse(router.query);

  const { data: installedApps, isLoading } = trpc.useQuery(
    ["viewer.integrations", { variant: "other", onlyInstalled: true }],
    {
      suspense: true,
      enabled: router.isReady,
    }
  );
  const { data: webhook } = trpc.useQuery(["viewer.webhook.get", { webhookId }], {
    suspense: true,
    enabled: router.isReady,
  });
  const { data: webhooks } = trpc.useQuery(["viewer.webhook.list"], {
    suspense: true,
    enabled: router.isReady,
  });
  const editWebhookMutation = trpc.useMutation("viewer.webhook.edit", {
    async onSuccess() {
      await utils.invalidateQueries(["viewer.webhook.list"]);
    },
    onError(error) {
      showToast(`${error.message}`, "error");
    },
  });

  const subscriberUrlReserved = (subscriberUrl: string, id: string): boolean => {
    return !!webhooks?.find((webhook) => webhook.subscriberUrl === subscriberUrl && webhook.id !== id);
  };

  if (isLoading || !webhook) return <SkeletonContainer />;

  return (
    <>
      <Meta
        title="Edit Webhook"
        description="Receive meeting data in real-time when something happens in Cal.com"
        backButton
      />
      <WebhookForm
        webhook={webhook}
        onSubmit={(values: WebhookFormSubmitData) => {
          if (subscriberUrlReserved(values.subscriberUrl, webhook.id)) {
            showToast(t("webhook_subscriber_url_reserved"), "error");
            return;
          }

          if (values.changeSecret) {
            values.secret = values.newSecret.length ? values.newSecret : null;
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
          showToast(t("webhook_updated_successfully"), "success");
          router.back();
        }}
        apps={installedApps?.items.map((app) => app.slug)}
      />
    </>
  );
};

EditWebhook.getLayout = getLayout;

export default EditWebhook;
