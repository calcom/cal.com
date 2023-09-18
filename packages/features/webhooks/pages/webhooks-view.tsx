import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";

import classNames from "@calcom/lib/classNames";
import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import { useBookerUrl } from "@calcom/lib/hooks/useBookerUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { WebhooksByViewer } from "@calcom/trpc/server/routers/viewer/webhook/getByViewer.handler";
import { Avatar, CreateButtonWithTeamsList, EmptyScreen, Meta } from "@calcom/ui";
import { Link as LinkIcon } from "@calcom/ui/components/icon";

import { getLayout } from "../../settings/layouts/SettingsLayout";
import { WebhookListItem, WebhookListSkeleton } from "../components";

const WebhooksView = () => {
  const { t } = useLocale();
  const router = useRouter();
  const session = useSession();

  const { data } = trpc.viewer.webhook.getByViewer.useQuery(undefined, {
    suspense: true,
    enabled: session.status === "authenticated",
  });

  return (
    <>
      <Meta
        title="Webhooks"
        description={t("add_webhook_description", { appName: APP_NAME })}
        CTA={
          data && data.webhookGroups.length > 0 ? (
            <CreateButtonWithTeamsList
              color="secondary"
              subtitle={t("create_for").toUpperCase()}
              createFunction={(teamId?: number) => {
                router.push(`webhooks/new${teamId ? `?teamId=${teamId}` : ""}`);
              }}
              data-testid="new_webhook"
            />
          ) : (
            <></>
          )
        }
        borderInShellHeader={!(data && data.webhookGroups.length > 0)}
      />
      <div>
        <Suspense fallback={<WebhookListSkeleton />}>
          {data && <WebhooksList webhooksByViewer={data} />}
        </Suspense>
      </div>
    </>
  );
};

const WebhooksList = ({ webhooksByViewer }: { webhooksByViewer: WebhooksByViewer }) => {
  const { t } = useLocale();
  const router = useRouter();

  const { profiles, webhookGroups } = webhooksByViewer;
  const bookerUrl = useBookerUrl();

  const hasTeams = profiles && profiles.length > 1;

  return (
    <>
      {webhookGroups && (
        <>
          {!!webhookGroups.length && (
            <div className={classNames("mt-0", hasTeams && "mt-6")}>
              {webhookGroups.map((group) => (
                <div key={group.teamId}>
                  {hasTeams && (
                    <div className="items-centers flex">
                      <Avatar
                        alt={group.profile.image || ""}
                        imageSrc={group.profile.image || `${bookerUrl}/${group.profile.name}/avatar.png`}
                        size="md"
                        className="inline-flex justify-center"
                      />
                      <div className="text-emphasis ml-2 flex flex-grow items-center font-bold">
                        {group.profile.name || ""}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col" key={group.profile.slug}>
                    <div
                      className={classNames(
                        "border-subtle rounded-md rounded-t-none border border-t-0",
                        hasTeams && "mb-8 mt-3 rounded-t-md border-t"
                      )}>
                      {group.webhooks.map((webhook, index) => (
                        <WebhookListItem
                          key={webhook.id}
                          webhook={webhook}
                          readOnly={group.metadata?.readOnly ?? false}
                          lastItem={group.webhooks.length === index + 1}
                          onEditWebhook={() =>
                            router.push(`${WEBAPP_URL}/settings/developer/webhooks/${webhook.id} `)
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!webhookGroups.length && (
            <EmptyScreen
              Icon={LinkIcon}
              headline={t("create_your_first_webhook")}
              description={t("create_your_first_webhook_description", { appName: APP_NAME })}
              className="mt-6"
              buttonRaw={
                <CreateButtonWithTeamsList
                  subtitle={t("create_for").toUpperCase()}
                  createFunction={(teamId?: number) => {
                    router.push(`webhooks/new${teamId ? `?teamId=${teamId}` : ""}`);
                  }}
                  data-testid="new_webhook"
                />
              }
            />
          )}
        </>
      )}
    </>
  );
};

WebhooksView.getLayout = getLayout;

export default WebhooksView;
