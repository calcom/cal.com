"use client";

import { useBookerUrl } from "@calcom/features/bookings/hooks/useBookerUrl";
import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import {
  AppHeader,
  AppHeaderActions,
  AppHeaderContent,
  AppHeaderDescription,
} from "@components/app/app-header";
import { Avatar, AvatarImage } from "@coss/ui/components/avatar";
import { Card, CardFrame, CardPanel } from "@coss/ui/components/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@coss/ui/components/empty";
import { WebhookIcon } from "lucide-react";
import { useRouter } from "next/navigation";
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
    <>
      <AppHeader>
        <AppHeaderContent title={t("webhooks")}>
          <AppHeaderDescription>{t("add_webhook_description", { appName: APP_NAME })}</AppHeaderDescription>
        </AppHeaderContent>
        <AppHeaderActions>
          <CreateNewWebhookButton />
        </AppHeaderActions>
      </AppHeader>

      <div className="flex flex-col gap-6">
        {webhookGroups.length ? (
          webhookGroups.map((group) => {
            const userName = group.profile.name ?? group.profile.slug ?? "";
            const userAvatar =
              group.profile.image ??
              (group.profile.slug ? `${bookerUrl}/${group.profile.slug}/avatar.png` : undefined);
            return (
              <section key={group.teamId ?? group.profile.slug ?? ""}>
                {hasTeams && (
                  <div className="mb-3 flex items-center gap-2">
                    <Avatar className="size-5">
                      {userAvatar ? <AvatarImage alt={userName} src={userAvatar} /> : null}
                    </Avatar>
                    <span className="font-medium text-sm">{userName}</span>
                  </div>
                )}
                <CardFrame>
                  <Card className="[--card:var(--popover)]">
                    <CardPanel className="p-0">
                      {[...group.webhooks]
                        .sort((a, b) => a.id.localeCompare(b.id))
                        .map((webhook) => (
                          <WebhookListItem
                            key={webhook.id}
                            webhook={webhook}
                            editHref={`${WEBAPP_URL}/settings/developer/webhooks/${webhook.id}`}
                            permissions={{
                              canEditWebhook: group?.metadata?.canModify ?? false,
                              canDeleteWebhook: group?.metadata?.canDelete ?? false,
                            }}
                            onEditWebhookAction={() =>
                              router.push(`${WEBAPP_URL}/settings/developer/webhooks/${webhook.id}`)
                            }
                          />
                        ))}
                    </CardPanel>
                  </Card>
                </CardFrame>
              </section>
            );
          })
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <WebhookIcon />
              </EmptyMedia>
              <EmptyTitle>{t("create_your_first_webhook")}</EmptyTitle>
              <EmptyDescription>
                {t("create_your_first_webhook_description", { appName: APP_NAME })}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <CreateNewWebhookButton isEmptyState />
            </EmptyContent>
          </Empty>
        )}
      </div>
    </>
  );
};

export default WebhooksView;
