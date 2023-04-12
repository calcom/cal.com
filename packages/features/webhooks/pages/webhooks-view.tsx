import { useRouter } from "next/router";
import { Suspense } from "react";

import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, EmptyScreen, Meta, SkeletonText } from "@calcom/ui";
import { Plus, Link as LinkIcon } from "@calcom/ui/components/icon";

import { getLayout } from "../../settings/layouts/SettingsLayout";
import { WebhookListItem, WebhookListSkeleton } from "../components";

const WebhooksView = () => {
  const { t } = useLocale();
  return (
    <>
      <Meta title="Webhooks" description={t("webhooks_description", { appName: APP_NAME })} />
      <div>
        <Suspense fallback={<WebhookListSkeleton />}>
          <WebhooksList />
        </Suspense>
      </div>
    </>
  );
};

const NewWebhookButton = () => {
  const { t, isLocaleReady } = useLocale();
  return (
    <Button
      color="secondary"
      data-testid="new_webhook"
      StartIcon={Plus}
      href={`${WEBAPP_URL}/settings/developer/webhooks/new`}>
      {isLocaleReady ? t("new_webhook") : <SkeletonText className="h-4 w-24" />}
    </Button>
  );
};

const WebhooksList = () => {
  const { t } = useLocale();
  const router = useRouter();

  const { data: webhooks } = trpc.viewer.webhook.list.useQuery(undefined, {
    suspense: true,
    enabled: router.isReady,
  });

  return (
    <>
      {webhooks?.length ? (
        <>
          <div className="border-subtle mt-6 mb-8 rounded-md border">
            {webhooks.map((webhook, index) => (
              <WebhookListItem
                key={webhook.id}
                webhook={webhook}
                lastItem={webhooks.length === index + 1}
                onEditWebhook={() => router.push(`${WEBAPP_URL}/settings/developer/webhooks/${webhook.id} `)}
              />
            ))}
          </div>
          <NewWebhookButton />
        </>
      ) : (
        <EmptyScreen
          Icon={LinkIcon}
          headline={t("create_your_first_webhook")}
          description={t("create_your_first_webhook_description", { appName: APP_NAME })}
          buttonRaw={<NewWebhookButton />}
        />
      )}
    </>
  );
};

WebhooksView.getLayout = getLayout;

export default WebhooksView;
