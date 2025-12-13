"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

import Shell from "@calcom/features/shell/Shell";
import { WebhookForm } from "@calcom/features/webhooks/components";
import type { WebhookFormSubmitData } from "@calcom/features/webhooks/components/WebhookForm";
import { PLATFORM_WEBHOOK_TRIGGER_OPTIONS } from "@calcom/features/webhooks/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { showToast } from "@calcom/ui/components/toast";

import {
  useOAuthClientWebhooks,
  useUpdateOAuthClientWebhook,
  useOAuthClientWebhook,
} from "@lib/hooks/settings/platform/oauth-clients/useOAuthClientWebhooks";

import NoPlatformPlan from "@components/settings/platform/dashboard/NoPlatformPlan";
import { useGetUserAttributes } from "@components/settings/platform/hooks/useGetUserAttributes";

export default function EditOAuthClientWebhook() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const clientId = searchParams?.get("clientId") || "";
  const webhookId = searchParams?.get("webhookId") || "";

  const { isUserLoading, isPlatformUser, isPaidUser } = useGetUserAttributes();

  const { refetch: refetchWebhooks } = useOAuthClientWebhooks(clientId);

  const {
    data: existingWebhook,
    status: webhookStatus,
    isFetched: isWebhookFetched,
  } = useOAuthClientWebhook(clientId, webhookId);

  const { mutateAsync: updateWebhook } = useUpdateOAuthClientWebhook(clientId);

  const handleSubmit = async (data: WebhookFormSubmitData) => {
    try {
      const body = {
        active: data.active,
        payloadTemplate: data.payloadTemplate ?? undefined,
        subscriberUrl: data.subscriberUrl,
        triggers: data.eventTriggers,
        secret: data.secret ?? undefined,
      };

      await updateWebhook({
        webhookId,
        body,
      });
      showToast(t("webhook_updated_successfully"), "success");

      await refetchWebhooks();
      window.location.href = "/settings/platform/webhooks";
    } catch {
      showToast(t("webhook_update_failed"), "error");
    }
  };

  if (isUserLoading) return <div className="m-5">{t("loading")}</div>;

  if (isPlatformUser && isPaidUser) {
    return (
      <div>
        <Shell title={t("webhook_update_form")} isPlatformUser={true}>
          {isWebhookFetched && webhookStatus === "success" ? (
            <>
              <div className="m-2 md:mx-5">
                <div className="border-subtle mx-auto block justify-between rounded-t-lg border px-4 py-6 sm:flex sm:px-6">
                  <div className="flex w-full flex-col">
                    <h1 className="font-cal text-emphasis mb-1 text-xl font-semibold leading-5 tracking-wide">
                      {t("webhook_update_form")}
                    </h1>
                    <p className="text-default text-sm ltr:mr-4 rtl:ml-4">
                      {t("webhook_update_form_description")}
                    </p>
                  </div>
                </div>

                <WebhookForm
                  overrideTriggerOptions={PLATFORM_WEBHOOK_TRIGGER_OPTIONS}
                  onSubmit={handleSubmit}
                  onCancel={() => {
                    router.push("/settings/platform/");
                  }}
                  noRoutingFormTriggers={true}
                  webhook={
                    existingWebhook && !Array.isArray(existingWebhook) && "id" in existingWebhook
                      ? {
                          ...existingWebhook,
                          eventTriggers: existingWebhook.triggers,
                          secret: existingWebhook.secret ?? null,
                        }
                      : undefined
                  }
                />
              </div>
            </>
          ) : (
            <EmptyScreen
              headline={t("error_accessing_webhooks")}
              className="mt-6 rounded-b-lg"
              border={true}
            />
          )}
        </Shell>
      </div>
    );
  }

  return (
    <div>
      <Shell isPlatformUser={true} withoutMain={false} SidebarContainer={<></>}>
        <NoPlatformPlan />
      </Shell>
    </div>
  );
}
