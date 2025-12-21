"use client";

import { useRouter } from "next/navigation";

import SettingsHeaderWithBackButton from "@calcom/features/settings/appDir/SettingsHeaderWithBackButton";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { WebhookVersion } from "../lib/interface/IWebhookRepository";
import { WEBHOOK_VERSION_OPTIONS, getWebhookVersionLabel } from "../lib/constants";
import { trpc } from "@calcom/trpc/react";
import { Select } from "@calcom/ui/components/form";
import { SkeletonContainer } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { revalidateWebhooksList } from "@calcom/web/app/(use-page-wrapper)/settings/(settings-layout)/developer/webhooks/(with-loader)/actions";

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
  version: WebhookVersion;
};

export function EditWebhookView({ webhook }: { webhook?: WebhookProps }) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
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
    async onSuccess() {
      await utils.viewer.webhook.list.invalidate();
      await utils.viewer.webhook.get.invalidate({ webhookId: webhook?.id });
      showToast(t("webhook_updated_successfully"), "success");
      revalidateWebhooksList();
      router.push("/settings/developer/webhooks");
    },
    onError(error) {
      showToast(`${error.message}`, "error");
    },
  });

  if (isPending || !webhook) return <SkeletonContainer />;

  return (
    <WebhookForm
      noRoutingFormTriggers={false}
      webhook={webhook}
      headerWrapper={(formMethods, children) => (
        <SettingsHeaderWithBackButton
          title={t("edit_webhook")}
          description={t("add_webhook_description", { appName: APP_NAME })}
          borderInShellHeader={true}
          CTA={
            <Tooltip content={t("webhook_version")}>
              <div>
                <Select
                  className="min-w-36"
                  options={WEBHOOK_VERSION_OPTIONS}
                  value={{
                    value: formMethods.watch("version"),
                    label: getWebhookVersionLabel(formMethods.watch("version")),
                  }}
                  onChange={(option) => {
                    if (option) {
                      formMethods.setValue("version", option.value, { shouldDirty: true });
                    }
                  }}
                />
              </div>
            </Tooltip>
          }>
          {children}
        </SettingsHeaderWithBackButton>
      )}
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
