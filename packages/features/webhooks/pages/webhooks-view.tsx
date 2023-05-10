import { useRouter } from "next/router";
import { Suspense } from "react";

import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, Meta, SkeletonText } from "@calcom/ui";
import { Avatar } from "@calcom/ui";
import { Plus } from "@calcom/ui/components/icon";

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

const NewWebhookButton = ({ teamId }: { teamId?: number | null }) => {
  const { t, isLocaleReady } = useLocale();
  return (
    <Button
      color="secondary"
      data-testid="new_webhook"
      StartIcon={Plus}
      href={`${WEBAPP_URL}/settings/developer/webhooks/new${!!teamId ? `?teamId=${teamId}` : ""}`}>
      {isLocaleReady ? t("new") : <SkeletonText className="h-4 w-24" />}
    </Button>
  );
};

const WebhooksList = () => {
  const { t } = useLocale();
  const router = useRouter();

  const { data, isLoading } = trpc.viewer.webhook.getByViewer.useQuery(undefined, {
    suspense: true,
    enabled: router.isReady,
  });

  if (isLoading) {
    <WebhookListSkeleton />;
  }

  return (
    <>
      {data && data.webhookGroups.length > 0 && (
        <>
          {data.webhookGroups && data.webhookGroups?.length > 0 ? (
            data.webhookGroups.map((group, index) => (
              <>
                <div className="items-centers flex ">
                  <Avatar
                    alt={group.profile.image || ""}
                    imageSrc={group.profile.image}
                    size="md"
                    className="inline-flex justify-center"
                    //todo: fallback is missing
                  />
                  <div className="text-emphasis ml-2 flex flex-grow items-center font-bold">
                    {group.profile.name || ""}
                  </div>
                  <div className="text-emphasis ml-auto font-bold">
                    <NewWebhookButton teamId={group.teamId} />
                  </div>
                </div>

                <div className="flex flex-col" key={group.profile.slug}>
                  <div className="border-subtle mt-3 mb-8 rounded-md border">
                    {group.webhooks.map((webhook, index) => (
                      <WebhookListItem
                        key={webhook.id}
                        webhook={webhook}
                        lastItem={group.webhooks.length === index + 1}
                        onEditWebhook={() =>
                          router.push(`${WEBAPP_URL}/settings/developer/webhooks/${webhook.id} `)
                        }
                      />
                    ))}
                  </div>
                </div>
              </>
            ))
          ) : (
            <div className="flex flex-col" key={data.webhookGroups[0].profile.slug}>
              test
              <div className="border-subtle mt-6 mb-8 rounded-md border">
                <NewWebhookButton />
                {data?.webhookGroups[0].webhooks.map((webhook, index) => (
                  <WebhookListItem
                    key={webhook.id}
                    webhook={webhook}
                    lastItem={data.webhookGroups[0].webhooks.length === index + 1}
                    onEditWebhook={() =>
                      router.push(`${WEBAPP_URL}/settings/developer/webhooks/${webhook.id} `)
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* {webhooks?.length ? (
        <>
          <div className="mt-6 mb-8 border rounded-md border-subtle">
            <NewWebhookButton />
            {webhooks.map((webhook, index) => (
              <WebhookListItem
                key={webhook.id}
                webhook={webhook}
                lastItem={webhooks.length === index + 1}
                onEditWebhook={() => router.push(`${WEBAPP_URL}/settings/developer/webhooks/${webhook.id} `)}
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyScreen
          Icon={LinkIcon}
          headline={t("create_your_first_webhook")}
          description={t("create_your_first_webhook_description", { appName: APP_NAME })}
          buttonRaw={<NewWebhookButton />}
        />
      )} */}
    </>
  );
};

WebhooksView.getLayout = getLayout;

export default WebhooksView;
