"use client";

import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";

import { DEFAULT_WEBHOOK_VERSION } from "@calcom/features/webhooks/lib/interface/IWebhookRepository";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { showToast } from "@calcom/ui/components/toast";

import {
  useOAuthClientWebhooks,
  useCreateOAuthClientWebhook,
  useUpdateOAuthClientWebhook,
} from "@lib/hooks/settings/platform/oauth-clients/useOAuthClientWebhooks";

import NoPlatformPlan from "@components/settings/platform/dashboard/NoPlatformPlan";
import { useGetUserAttributes } from "@components/settings/platform/hooks/useGetUserAttributes";

import Shell from "~/shell/Shell";
import { WebhookForm } from "~/webhooks/components";

export default function EditOAuthClientWebhooks() {
  const { t } = useLocale();
  const router = useRouter();
  const params = useParams<{ clientId: string }>();
  const clientId = params?.clientId || "";

  const { isUserLoading, isPlatformUser, isPaidUser } = useGetUserAttributes();

  const {
    data: webhooks,
    status: webhooksStatus,
    isFetched: isWebhooksFetched,
    refetch: refetchWebhooks,
  } = useOAuthClientWebhooks(clientId);
  const webhookId = webhooks?.[0]?.id ?? "";
  const webhook = webhooks?.[0];
  const { mutateAsync: createWebhook } = useCreateOAuthClientWebhook(clientId);
  const { mutateAsync: updateWebhook } = useUpdateOAuthClientWebhook(clientId);

  if (isUserLoading) return <div className="m-5">{t("loading")}</div>;

  if (isPlatformUser && isPaidUser) {
    return (
      <div>
        <Shell title={t("webhook_update_form")} isPlatformUser={true}>
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

            {webhooksStatus !== "success" && <p>{t("error_accessing_webhooks")}</p>}

            {isWebhooksFetched && webhooksStatus === "success" && (
              <WebhookForm
                overrideTriggerOptions={[
                  { value: WebhookTriggerEvents.BOOKING_CANCELLED, label: "booking_cancelled" },
                  { value: WebhookTriggerEvents.BOOKING_CREATED, label: "booking_created" },
                  { value: WebhookTriggerEvents.BOOKING_REJECTED, label: "booking_rejected" },
                  { value: WebhookTriggerEvents.BOOKING_REQUESTED, label: "booking_requested" },
                  { value: WebhookTriggerEvents.BOOKING_RESCHEDULED, label: "booking_rescheduled" },
                  { value: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED, label: "booking_no_show_updated" },
                  { value: WebhookTriggerEvents.MEETING_ENDED, label: "meeting_ended" },
                  { value: WebhookTriggerEvents.MEETING_STARTED, label: "meeting_started" },
                  { value: WebhookTriggerEvents.RECORDING_READY, label: "recording_ready" },
                  {
                    value: WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED,
                    label: "recording_transcription_generated",
                  },
                ]}
                onSubmit={async (data) => {
                  try {
                    const body = {
                      active: data.active,
                      payloadTemplate: data.payloadTemplate ?? undefined,
                      subscriberUrl: data.subscriberUrl,
                      triggers: data.eventTriggers,
                      secret: data.secret ?? undefined,
                      version: data.version,
                    };
                    if (webhook) {
                      await updateWebhook({
                        webhookId,
                        body,
                      });
                      showToast(t("webhook_updated_successfully"), "success");
                    } else {
                      await createWebhook(body);
                      showToast(t("webhook_created_successfully"), "success");
                    }
                    await refetchWebhooks();
                    router.push("/settings/platform/");
                  } catch {
                    showToast(t(webhookId ? "webhook_update_failed" : "webhook_create_failed"), "error");
                  }
                }}
                onCancel={() => {
                  router.push("/settings/platform/");
                }}
                noRoutingFormTriggers={true}
                webhook={
                  webhook
                    ? {
                        ...webhook,
                        eventTriggers: webhook.triggers,
                        secret: webhook.secret ?? null,
                        version: webhook.version ?? DEFAULT_WEBHOOK_VERSION,
                      }
                    : undefined
                }
              />
            )}
          </div>
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
