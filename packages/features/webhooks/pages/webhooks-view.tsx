import Link from "next/link";
import { useRouter } from "next/router";
import { Suspense } from "react";

import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { WebhooksByViewer } from "@calcom/trpc/server/routers/viewer/webhook/getByViewer.handler";
import {
  Button,
  Meta,
  SkeletonText,
  EmptyScreen,
  Dropdown,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownItem,
  DropdownMenuLabel,
} from "@calcom/ui";
import { Avatar } from "@calcom/ui";
import { Plus, Link as LinkIcon } from "@calcom/ui/components/icon";

import { getLayout } from "../../settings/layouts/SettingsLayout";
import { WebhookListItem, WebhookListSkeleton } from "../components";

const WebhooksView = () => {
  const { t } = useLocale();
  const router = useRouter();

  const { data } = trpc.viewer.webhook.getByViewer.useQuery(undefined, {
    suspense: true,
    enabled: router.isReady,
  });

  const profiles = data?.profiles.filter((profile) => !profile.readOnly);

  return (
    <>
      <Meta
        title="Webhooks"
        description={t("add_webhook_description", { appName: APP_NAME })}
        CTA={data && data.webhookGroups.length > 0 ? <NewWebhookButton profiles={profiles} /> : <></>}
      />
      <div>
        <Suspense fallback={<WebhookListSkeleton />}>
          {data && <WebhooksList webhooksByViewer={data} />}
        </Suspense>
      </div>
    </>
  );
};

const NewWebhookButton = ({
  teamId,
  profiles,
}: {
  teamId?: number | null;
  profiles?: {
    readOnly?: boolean | undefined;
    slug: string | null;
    name: string | null;
    image?: string | undefined;
    teamId: number | null | undefined;
  }[];
}) => {
  const { t, isLocaleReady } = useLocale();

  const url = new URL(`${WEBAPP_URL}/settings/developer/webhooks/new`);
  if (!!teamId) {
    url.searchParams.set("teamId", `${teamId}`);
  }
  const href = url.href;

  if (!profiles || profiles.length < 2) {
    return (
      <Button color="primary" data-testid="new_webhook" StartIcon={Plus} href={href}>
        {isLocaleReady ? t("new") : <SkeletonText className="h-4 w-24" />}
      </Button>
    );
  }
  return (
    <Dropdown>
      <DropdownMenuTrigger asChild>
        <Button color="primary" StartIcon={Plus}>
          {isLocaleReady ? t("new") : <SkeletonText className="h-4 w-24" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent sideOffset={14} align="end">
        <DropdownMenuLabel>
          <div className="text-xs">{t("create_for").toUpperCase()}</div>
        </DropdownMenuLabel>
        {profiles.map((profile, idx) => (
          <DropdownMenuItem key={profile.slug}>
            <DropdownItem
              type="button"
              StartIcon={(props) => (
                <Avatar
                  alt={profile.slug || ""}
                  imageSrc={profile.image || `${WEBAPP_URL}/${profile.name}/avatar.png`}
                  size="sm"
                  {...props}
                />
              )}>
              <Link href={`webhooks/new${profile.teamId ? `?teamId=${profile.teamId}` : ""}`}>
                {profile.name}
              </Link>
            </DropdownItem>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </Dropdown>
  );
};

const WebhooksList = ({ webhooksByViewer }: { webhooksByViewer: WebhooksByViewer }) => {
  const { t } = useLocale();
  const router = useRouter();

  const { profiles, webhookGroups } = webhooksByViewer;

  const hasTeams = profiles && profiles.length > 1;

  return (
    <>
      {webhookGroups && (
        <>
          {!!webhookGroups.length && (
            <>
              {webhookGroups.map((group) => (
                <div key={group.teamId}>
                  {hasTeams && (
                    <div className="items-centers flex ">
                      <Avatar
                        alt={group.profile.image || ""}
                        imageSrc={group.profile.image || `${WEBAPP_URL}/${group.profile.name}/avatar.png`}
                        size="md"
                        className="inline-flex justify-center"
                      />
                      <div className="text-emphasis ml-2 flex flex-grow items-center font-bold">
                        {group.profile.name || ""}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col" key={group.profile.slug}>
                    <div className="border-subtle mt-3 mb-8 rounded-md border">
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
            </>
          )}
          {!webhookGroups.length && (
            <EmptyScreen
              Icon={LinkIcon}
              headline={t("create_your_first_webhook")}
              description={t("create_your_first_webhook_description", { appName: APP_NAME })}
              buttonRaw={<NewWebhookButton profiles={profiles} />}
            />
          )}
        </>
      )}
    </>
  );
};

WebhooksView.getLayout = getLayout;

export default WebhooksView;
