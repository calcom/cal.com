import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";

import Shell from "@calcom/features/shell/Shell";
import { WebhookForm } from "@calcom/features/webhooks/components";
import { showToast } from "@calcom/ui";

import {
  useOAuthClientWebhooks,
  useCreateOAuthClientWebhook,
  useUpdateOAuthClientWebhook,
} from "@lib/hooks/settings/platform/oauth-clients/useOAuthClientWebhooks";

import PageWrapper from "@components/PageWrapper";
import NoPlatformPlan from "@components/settings/platform/dashboard/NoPlatformPlan";
import { useGetUserAttributes } from "@components/settings/platform/hooks/useGetUserAttributes";

export default function EditOAuthClientWebhooks() {
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

  if (isUserLoading) return <div className="m-5">Loading...</div>;

  if (isPlatformUser && isPaidUser) {
    return (
      <div>
        <Shell title="OAuth client updation form" isPlatformUser={true}>
          <div className="m-2 md:mx-5">
            <div className="border-subtle mx-auto block justify-between rounded-t-lg border px-4 py-6 sm:flex sm:px-6">
              <div className="flex w-full flex-col">
                <h1 className="font-cal text-emphasis mb-1 text-xl font-semibold leading-5 tracking-wide">
                  Webhook update form
                </h1>
                <p className="text-default text-sm ltr:mr-4 rtl:ml-4">Add a webhook to your OAuthClient.</p>
              </div>
            </div>

            {webhooksStatus !== "success" && <p>Error while trying to access webhooks.</p>}

            {isWebhooksFetched && webhooksStatus === "success" && (
              <WebhookForm
                onSubmit={async (data) => {
                  try {
                    const body = {
                      active: data.active,
                      payloadTemplate: data.payloadTemplate ?? undefined,
                      subscriberUrl: data.subscriberUrl,
                      triggers: data.eventTriggers,
                      secret: data.secret ?? undefined,
                    };
                    if (webhook) {
                      await updateWebhook({
                        webhookId,
                        body,
                      });
                      showToast("Webhook updated successfully.", "success");
                      router.push("/settings/platform/");
                      return;
                    }
                    await createWebhook(body);
                    showToast("Webhook created successfully.", "success");
                    await refetchWebhooks();
                    router.push("/settings/platform/");
                  } catch (err) {
                    showToast(`Failed to ${webhookId ? "update" : "create"} webhook.`, "error");
                  }
                }}
                onCancel={() => {
                  router.push("/settings/platform/");
                }}
                noRoutingFormTriggers={true}
                webhook={
                  webhook
                    ? { ...webhook, eventTriggers: webhook.triggers, secret: webhook.secret ?? null }
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
      <Shell isPlatformUser={true} hideHeadingOnMobile withoutMain={false} SidebarContainer={<></>}>
        <NoPlatformPlan />
      </Shell>
    </div>
  );
}

EditOAuthClientWebhooks.PageWrapper = PageWrapper;
