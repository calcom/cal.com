import { useRouter } from "next/router";

import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Meta, showToast, SkeletonContainer } from "@calcom/ui";

import { getLayout } from "../../settings/layouts/SettingsLayout";
import type { WebhookFormSubmitData } from "../components/WebhookForm";
import WebhookForm from "../components/WebhookForm";

const NewWebhookView = () => {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const router = useRouter();
  const { data: installedApps, isLoading } = trpc.viewer.integrations.useQuery(
    { variant: "other", onlyInstalled: true },
    {
      suspense: true,
      enabled: router.isReady,
    }
  );
  const { data: webhooks } = trpc.viewer.webhook.list.useQuery(undefined, {
    suspense: true,
    enabled: router.isReady,
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

  const subscriberUrlReserved = (subscriberUrl: string, id?: string): boolean => {
    return !!webhooks?.find(
      (webhook) => webhook.subscriberUrl === subscriberUrl && (!id || webhook.id !== id)
    );
  };

  const onCreateWebhook = async (values: WebhookFormSubmitData) => {
    if (subscriberUrlReserved(values.subscriberUrl, values.id)) {
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
    });
  };

  if (isLoading) return <SkeletonContainer />;

  return (
    <>
      <Meta
        title={t("add_webhook")}
        description={t("add_webhook_description", { appName: APP_NAME })}
        backButton
      />

      <WebhookForm onSubmit={onCreateWebhook} apps={installedApps?.items.map((app) => app.slug)} />
    </>
  );
};

NewWebhookView.getLayout = getLayout;

export default NewWebhookView;
