"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import Shell from "@calcom/features/shell/Shell";
import { WebhookForm } from "@calcom/features/webhooks/components";
import type { WebhookFormSubmitData } from "@calcom/features/webhooks/components/WebhookForm";
import { PLATFORM_WEBHOOK_TRIGGER_OPTIONS } from "@calcom/features/webhooks/lib/constants";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SelectField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import {
  useOAuthClientWebhooks,
  useCreateOAuthClientWebhook,
} from "@lib/hooks/settings/platform/oauth-clients/useOAuthClientWebhooks";
import { useOAuthClients } from "@lib/hooks/settings/platform/oauth-clients/useOAuthClients";

import NoPlatformPlan from "@components/settings/platform/dashboard/NoPlatformPlan";
import { useGetUserAttributes } from "@components/settings/platform/hooks/useGetUserAttributes";

export default function AddOAuthClientWebhook() {
  const { t } = useLocale();
  const router = useRouter();
  const [clientId, setClientId] = useState<string>("");

  const { isUserLoading, isPlatformUser, isPaidUser } = useGetUserAttributes();
  const { data: OAuthClients, isLoading: isOAuthClientLoading } = useOAuthClients();

  useEffect(() => {
    if (OAuthClients && OAuthClients.length > 0 && !clientId) {
      setClientId(OAuthClients[0].id);
    }
  }, [OAuthClients, clientId]);

  const { refetch: refetchWebhooks } = useOAuthClientWebhooks(clientId);
  const { mutateAsync: createWebhook } = useCreateOAuthClientWebhook(clientId);

  const handleSubmit = async (data: WebhookFormSubmitData) => {
    try {
      const body = {
        active: data.active,
        payloadTemplate: data.payloadTemplate ?? undefined,
        subscriberUrl: data.subscriberUrl,
        triggers: data.eventTriggers,
        secret: data.secret ?? undefined,
      };

      await createWebhook(body);
      showToast(t("webhook_created_successfully"), "success");

      await refetchWebhooks();
      router.push("/settings/platform/webhooks");
    } catch {
      showToast(t("webhook_create_failed"), "error");
    }
  };

  if (isUserLoading || isOAuthClientLoading) return <div className="m-5">{t("loading")}</div>;

  if (isPlatformUser && isPaidUser) {
    return (
      <div>
        <Shell title={t("webhook_update_form")} isPlatformUser={true}>
          <div className="m-2 md:mx-5">
            <div className="border-subtle mx-auto flex items-center justify-between rounded-t-lg border px-4 py-6 sm:flex sm:px-6">
              <div className="flex flex-col">
                <h1 className="font-cal text-emphasis mb-1 text-xl font-semibold leading-5 tracking-wide">
                  {t("add_webhook")}
                </h1>
                <p className="text-default text-sm ltr:mr-4 rtl:ml-4">
                  {t("platform_webhooks_description", { appName: APP_NAME })}
                </p>
              </div>
              <div>
                <h2 className="font-semi-bold font-cal text-emphasis mb-2  tracking-wide">
                  {t("oauth_client")}
                </h2>
                <SelectField
                  styles={{
                    singleValue: (baseStyles) => ({
                      ...baseStyles,
                      fontSize: "14px",
                    }),
                    option: (baseStyles) => ({
                      ...baseStyles,
                      fontSize: "14px",
                    }),
                  }}
                  containerClassName="data-testid-field-type"
                  options={OAuthClients?.map((client) => ({ label: client.name, value: client.id }))}
                  onChange={(option) => {
                    if (!option) {
                      return;
                    }

                    setClientId(option.value);
                  }}
                  defaultValue={{ label: OAuthClients[0]?.name, value: OAuthClients[0]?.id }}
                />
              </div>
            </div>

            <WebhookForm
              overrideTriggerOptions={PLATFORM_WEBHOOK_TRIGGER_OPTIONS}
              onSubmit={handleSubmit}
              onCancel={() => {
                router.push("/settings/platform/webhooks");
              }}
              noRoutingFormTriggers={true}
              webhook={undefined}
            />
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
