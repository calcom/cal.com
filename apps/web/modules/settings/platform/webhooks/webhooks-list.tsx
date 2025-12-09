"use client";

import { useRouter } from "next/navigation";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import Shell from "@calcom/features/shell/Shell";
import { WebhookListItem } from "@calcom/features/webhooks/components";
import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { showToast } from "@calcom/ui/components/toast";
import NoPlatformPlan from "@calcom/web/components/settings/platform/dashboard/NoPlatformPlan";
import { useGetUserAttributes } from "@calcom/web/components/settings/platform/hooks/useGetUserAttributes";
import { PlatformPricing } from "@calcom/web/components/settings/platform/pricing/platform-pricing/index";

import { useDeleteOAuthClientWebhook } from "@lib/hooks/settings/platform/oauth-clients/useOAuthClientWebhooks";

type WebhooksByOrg = RouterOutputs["viewer"]["webhook"]["getByOrg"];

type Props = {
  data: WebhooksByOrg;
};

const WebhooksView = ({ data }: Props) => {
  return (
    <div>
      <WebhooksList data={data} />
    </div>
  );
};

const WebhooksList = ({ data }: Props) => {
  const { hasWritePermission, webhooks } = data;
  const { t } = useLocale();
  const { isPlatformUser, isPaidUser, userOrgId, isUserLoading, isUserBillingDataLoading, userBillingData } =
    useGetUserAttributes();
  const { mutateAsync: deleteWebhook } = useDeleteOAuthClientWebhook();
  const router = useRouter();

  const handleDelete = async (clientId: string, webhookId: string) => {
    try {
      await deleteWebhook({ clientId, webhookId });
      showToast(t("webhook_removed_successfully"), "success");

      router.refresh();
    } catch {
      showToast(t("webhook_delete_failed"), "error");
    }
  };

  if (isUserLoading || (isUserBillingDataLoading && !userBillingData)) {
    return <div className="m-5">{t("loading")}</div>;
  }

  if (isPlatformUser && !isPaidUser)
    return (
      <PlatformPricing
        teamId={userOrgId}
        heading={
          <div className="mb-5 text-center text-2xl font-semibold">
            <h1>{t("subscribe_to_platform")}</h1>
          </div>
        }
      />
    );

  if (!isPlatformUser)
    return (
      <div>
        <Shell isPlatformUser={true} withoutMain={false} SidebarContainer={<></>}>
          <NoPlatformPlan />
        </Shell>
      </div>
    );

  return (
    <SettingsHeader
      title={t("platform_webhooks")}
      description={t("platform_webhooks_description", { appName: APP_NAME })}
      CTA={
        <Button
          variant="fab"
          StartIcon="plus"
          size="sm"
          color="secondary"
          onClick={() => {
            window.location.href = "/settings/platform/webhooks/add";
          }}
          data-testid="create-new-webhook-btn">
          {t("new")}
        </Button>
      }
      borderInShellHeader={false}>
      {webhooks.length ? (
        <div className={classNames("mt-6")}>
          {
            <div>
              <div className={classNames("border-subtle mb-8 mt-3 rounded-lg border border-t")}>
                {webhooks.map((webhook, index) => (
                  <WebhookListItem
                    key={webhook.id}
                    webhook={webhook}
                    lastItem={webhooks.length === index + 1}
                    permissions={{
                      canEditWebhook: hasWritePermission ?? false,
                      canDeleteWebhook: hasWritePermission ?? false,
                    }}
                    onEditWebhook={() =>
                      router.push(
                        `${WEBAPP_URL}/settings/platform/webhooks/edit?clientId=${webhook.platformOAuthClientId}&webhookId=${webhook.id}`
                      )
                    }
                    onDeleteWebhook={() => {
                      if (webhook.platformOAuthClientId) {
                        handleDelete(webhook.platformOAuthClientId, webhook.id);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          }
        </div>
      ) : (
        <EmptyScreen
          Icon="link"
          headline={t("create_your_first_webhook")}
          description={t("create_your_first_webhook_description", { appName: APP_NAME })}
          className="mt-6 rounded-b-lg"
          buttonRaw={
            <Button
              variant="fab"
              StartIcon="plus"
              size="sm"
              color="secondary"
              onClick={() => {
                window.location.href = "/settings/platform/webhooks/add";
              }}
              data-testid="create-new-webhook-btn">
              {t("new")}
            </Button>
          }
          border={true}
        />
      )}
    </SettingsHeader>
  );
};

export default WebhooksView;
