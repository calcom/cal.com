"use client";

import { useRouter } from "next/navigation";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import { useBookerUrl } from "@calcom/lib/hooks/useBookerUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import type { WebhooksByViewer } from "@calcom/trpc/server/routers/viewer/webhook/getByViewer.handler";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";

import { WebhookListItem, CreateNewWebhookButton } from "../components";

type Props = {
  data: RouterOutputs["viewer"]["webhook"]["getByViewer"];
  isAdmin: boolean;
};

const WebhooksView = ({ data, isAdmin }: Props) => {
  return (
    <div>
      <WebhooksList webhooksByViewer={data} isAdmin={isAdmin} />
    </div>
  );
};

const WebhooksList = ({
  webhooksByViewer,
  isAdmin,
}: {
  webhooksByViewer: WebhooksByViewer;
  isAdmin: boolean;
}) => {
  const { t } = useLocale();
  const router = useRouter();
  const { profiles, webhookGroups } = webhooksByViewer;
  const bookerUrl = useBookerUrl();

  const hasTeams = profiles && profiles.length > 1;

  return (
    <SettingsHeader
      title={t("webhooks")}
      description={t("add_webhook_description", { appName: APP_NAME })}
      CTA={webhooksByViewer.webhookGroups.length > 0 ? <CreateNewWebhookButton isAdmin={isAdmin} /> : null}
      borderInShellHeader={false}>
      {!!webhookGroups.length ? (
        <div className={classNames("mt-6")}>
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
                <div className={classNames("border-subtle mb-8 mt-3 rounded-lg border border-t")}>
                  {group.webhooks.map((webhook, index) => (
                    <WebhookListItem
                      key={webhook.id}
                      webhook={webhook}
                      readOnly={group.metadata?.readOnly ?? false}
                      lastItem={group.webhooks.length === index + 1}
                      onEditWebhook={() =>
                        router.push(`${WEBAPP_URL}/settings/developer/webhooks/${webhook.id}`)
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyScreen
          Icon="link"
          headline={t("create_your_first_webhook")}
          description={t("create_your_first_webhook_description", { appName: APP_NAME })}
          className="mt-6 rounded-b-lg"
          buttonRaw={<CreateNewWebhookButton isAdmin={isAdmin} />}
          border={true}
        />
      )}
    </SettingsHeader>
  );
};

export default WebhooksView;
