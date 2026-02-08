"use client";

import { useBookerUrl } from "@calcom/features/bookings/hooks/useBookerUrl";
import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@coss/ui/components/frame";
import { useRouter } from "next/navigation";
import React from "react";
import { CreateNewWebhookButton, WebhookListItem } from "../components";

type WebhooksByViewer = RouterOutputs["viewer"]["webhook"]["getByViewer"];

type Props = {
  data: WebhooksByViewer;
};

const WebhooksView = ({ data }: Props) => {
  return (
    <div>
      <WebhooksList webhooksByViewer={data} />
    </div>
  );
};

const WebhooksList = ({ webhooksByViewer }: { webhooksByViewer: WebhooksByViewer }) => {
  const { t } = useLocale();
  const router = useRouter();
  const { profiles, webhookGroups } = webhooksByViewer;
  const bookerUrl = useBookerUrl();

  const hasTeams = profiles && profiles.length > 1;

  return (
    <Frame>
      <FrameHeader className="mb-2 flex-row items-center justify-between">
        <div>
          <FrameTitle className="text-lg">{t("webhooks")}</FrameTitle>
          <FrameDescription>{t("add_webhook_description", { appName: APP_NAME })}</FrameDescription>
        </div>
        <CreateNewWebhookButton />
      </FrameHeader>
      {webhookGroups.length ? (
        <>
          {webhookGroups.map((group) => (
            <React.Fragment key={group.teamId}>
              {hasTeams && (
                <div className="mb-2 mt-4 flex items-center px-1">
                  <Avatar
                    alt={group.profile.image || ""}
                    imageSrc={group.profile.image || `${bookerUrl}/${group.profile.name}/avatar.png`}
                    size="md"
                    className="inline-flex justify-center"
                  />
                  <div className="text-emphasis ml-2 flex grow items-center font-bold">
                    {group.profile.name || ""}
                  </div>
                </div>
              )}
              {group.webhooks.map((webhook) => (
                <FramePanel key={webhook.id} className="mt-2">
                  <WebhookListItem
                    webhook={webhook}
                    lastItem={true}
                    permissions={{
                      canEditWebhook: group?.metadata?.canModify ?? false,
                      canDeleteWebhook: group?.metadata?.canDelete ?? false,
                    }}
                    onEditWebhook={() =>
                      router.push(`${WEBAPP_URL}/settings/developer/webhooks/${webhook.id}`)
                    }
                  />
                </FramePanel>
              ))}
            </React.Fragment>
          ))}
        </>
      ) : (
        <FramePanel>
          <EmptyScreen
            Icon="link"
            headline={t("create_your_first_webhook")}
            description={t("create_your_first_webhook_description", { appName: APP_NAME })}
            buttonRaw={<CreateNewWebhookButton />}
          />
        </FramePanel>
      )}
    </Frame>
  );
};

export default WebhooksView;
