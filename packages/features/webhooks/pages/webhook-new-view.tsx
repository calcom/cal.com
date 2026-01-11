"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import SettingsHeaderWithBackButton from "@calcom/features/settings/appDir/SettingsHeaderWithBackButton";
import { APP_NAME } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WEBHOOK_VERSION_OPTIONS, getWebhookVersionLabel } from "../lib/constants";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Select } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { revalidateWebhooksList } from "@calcom/web/app/(use-page-wrapper)/settings/(settings-layout)/developer/webhooks/(with-loader)/actions";

import type { WebhookFormSubmitData } from "../components/WebhookForm";
import WebhookForm from "../components/WebhookForm";
import { subscriberUrlReserved } from "../lib/subscriberUrlReserved";

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
      showToast(t("webhook_created_successfully"), "success");
      await utils.viewer.webhook.list.invalidate();
      revalidateWebhooksList();
      router.push("/settings/developer/webhooks");
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
        <SettingsHeaderWithBackButton
          title={t("add_webhook")}
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
    />
  );
};

export default NewWebhookView;
