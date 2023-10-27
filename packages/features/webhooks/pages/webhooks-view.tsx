import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import classNames from "@calcom/lib/classNames";
import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import { useBookerUrl } from "@calcom/lib/hooks/useBookerUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { WebhooksByViewer } from "@calcom/trpc/server/routers/viewer/webhook/getByViewer.handler";
import {
  Avatar,
  CreateButtonWithTeamsList,
  EmptyScreen,
  Meta,
  SkeletonContainer,
  SkeletonText,
} from "@calcom/ui";
import { Link as LinkIcon } from "@calcom/ui/components/icon";

import { getLayout } from "../../settings/layouts/SettingsLayout";
import { WebhookListItem } from "../components";

const SkeletonLoader = ({
  title,
  description,
  borderInShellHeader,
}: {
  title: string;
  description: string;
  borderInShellHeader: boolean;
}) => {
  return (
    <SkeletonContainer>
      <Meta title={title} description={description} borderInShellHeader={borderInShellHeader} />
      <div className="divide-subtle border-subtle space-y-6 rounded-b-lg border border-t-0 px-6 py-4">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
      </div>
    </SkeletonContainer>
  );
};

const WebhooksView = () => {
  const { t } = useLocale();
  const router = useRouter();
  const session = useSession();

  const { data, isLoading } = trpc.viewer.webhook.getByViewer.useQuery(undefined, {
    enabled: session.status === "authenticated",
  });

  if (isLoading || !data) {
    return (
      <SkeletonLoader
        title={t("webhooks")}
        description={t("add_webhook_description", { appName: APP_NAME })}
        borderInShellHeader={true}
      />
    );
  }

  return (
    <>
      <Meta
        title={t("webhooks")}
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
        borderInShellHeader={data && data.profiles.length === 1}
      />
      <div>
        <WebhooksList webhooksByViewer={data} />
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
                        "border-subtle rounded-lg rounded-t-none border border-t-0",
                        hasTeams && "mb-8 mt-3 rounded-t-lg border-t"
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
              className="rounded-b-lg rounded-t-none border-t-0"
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
