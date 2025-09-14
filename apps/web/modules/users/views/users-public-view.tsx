"use client";

import { Branding } from "@calid/features/ui/Branding";
import { Avatar } from "@calid/features/ui/components/avatar";
import { Button } from "@calid/features/ui/components/button";
import { Icon, type IconName } from "@calid/features/ui/components/icon";
import classNames from "classnames";
import type { InferGetServerSidePropsType } from "next";
import Link from "next/link";
import type { z } from "zod";

import {
  sdkActionManager,
  useEmbedNonStylesConfig,
  useEmbedStyles,
  useIsEmbed,
} from "@calcom/embed-core/embed-iframe";
import { EventTypeDescriptionLazy as EventTypeDescription } from "@calcom/features/eventtypes/components";
import EmptyPage from "@calcom/features/eventtypes/components/EmptyPage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import useTheme from "@calcom/lib/hooks/useTheme";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import type { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";
import { UnpublishedEntity } from "@calcom/ui/components/unpublished-entity";

import type { getServerSideProps } from "@server/lib/[user]/getServerSideProps";

export type PageProps = InferGetServerSidePropsType<typeof getServerSideProps> & {
  slug?: string;
};
interface IconParams {
  icon: IconName;
  color: string;
}

function getIconParamsFromMetadata(metadata: any): IconParams {
  const iconParams = metadata?.iconParams as IconParams;
  return iconParams || { icon: "calendar", color: "#6B7280" };
}

function UserNotFound(props: { slug: string }) {
  const { slug } = props;
  const { t } = useLocale();

  return (
    <>
      <div className="flex min-h-screen flex-col items-center justify-center px-10 md:p-0">
        <div className="bg-default w-full max-w-xl rounded-lg p-10 text-center shadow-lg">
          <div className="flex flex-col items-center">
            <h2 className="mt-4 text-3xl font-semibold text-gray-800">No man’s land - Conquer it today!</h2>
            <p className="mt-4 text-lg text-gray-600">
              Claim username <span className="font-semibold">{`'${slug}'`}</span> on{" "}
              <span className="font-semibold">Cal ID</span> now before someone else does! 🗓️🔥
            </p>
          </div>

          <div className="mt-6">
            <Link href="/auth/signup">
              <Button color="primary" target="_blank">
                {t("register_now")}
              </Button>
            </Link>
          </div>

          <div className="mt-6 text-base text-gray-500">
            Or Lost your way? &nbsp;
            <Link href="/auth/login" className="text-blue-600 hover:underline">
              Log in to your personal space
            </Link>
          </div>
        </div>
        <div key="logo" className={classNames("mt-6 flex w-full justify-center [&_img]:h-[32px]")}>
          <Branding />
        </div>
      </div>
    </>
  );
}

export function UserPage(props: PageProps) {
  const { t } = useLocale();
  const { profile, eventTypes, entity } = props;
  const [user] = props.users || [];
  const isEventListEmpty = (eventTypes || []).length === 0;
  const isOrg = !!user?.profile?.organization;
  const isBioEmpty = !user?.bio || !user.bio.replace("<p><br></p>", "").length;
  const isEmbed = useIsEmbed(props.isEmbed);
  const eventTypeListItemEmbedStyles = useEmbedStyles("eventTypeListItem");
  const shouldAlignCentrallyInEmbed = useEmbedNonStylesConfig("align") !== "left";
  const shouldAlignCentrally = !isEmbed || shouldAlignCentrallyInEmbed;
  const { user: _user, orgSlug: _orgSlug, redirect: _redirect, ...query } = useRouterQuery();

  useTheme(profile?.theme, false, false);

  const headerUrl = (user?.metadata as z.infer<typeof userMetadataSchema> | null)?.headerUrl ?? undefined;

  if (entity?.considerUnpublished) {
    return (
      <div className="flex h-full min-h-[calc(100dvh)] items-center justify-center">
        <UnpublishedEntity {...entity} />
      </div>
    );
  }

  if (props.userNotFound) {
    return <UserNotFound slug={props.slug ?? "User"} />;
  }

  return (
    <div
      className={classNames(
        shouldAlignCentrally ? "mx-auto" : "",
        isEmbed ? "max-w-3xl" : "",
        "bg-default flex min-h-screen w-full flex-col"
      )}>
      <main
        className={classNames(
          shouldAlignCentrally ? "mx-auto" : "",
          isEmbed ? "border-booker border-booker-width bg-default rounded-md" : "bg-default",
          "h-full w-full"
        )}>
        <div
          className={classNames(
            "border-subtle bg-cal-gradient text-default mb-4 flex flex-col items-center bg-cover bg-center p-4"
          )}
          style={{
            backgroundImage: headerUrl ? `url(${headerUrl})` : undefined,
          }}>
          <Avatar
            size="xl"
            imageSrc={user.avatarUrl}
            alt={profile.name || "User Avatar"}
            title={profile.name || "User"}
          />
          <h1 className="text-default mt-2 text-2xl font-bold" data-testid="name-title">
            {profile.name}
            {!isOrg && user.verified && (
              <Icon
                name="badge-check"
                className="mx-1 -mt-1 inline h-6 w-6 fill-blue-500 text-white dark:text-black"
              />
            )}
            {isOrg && (
              <Icon
                name="badge-check"
                className="mx-1 -mt-1 inline h-6 w-6 fill-yellow-500 text-white dark:text-black"
              />
            )}
          </h1>
          {!isBioEmpty && (
            <>
              <div
                className="text-subtle break-words text-center text-sm font-medium md:px-[10%] lg:px-[20%]"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: props.safeBio }}
              />
            </>
          )}
        </div>

        <DividerWithText />

        <div
          className={classNames("flex flex-col gap-4 rounded-md bg-white px-4 pb-8 pt-2 lg:px-[15%]")}
          data-testid="event-types">
          {eventTypes.map((type) => {
            const iconParams = getIconParamsFromMetadata(type.metadata);
            return (
              <div
                key={type.id}
                className="dark:bg-muted dark:hover:bg-emphasis hover:bg-muted border-subtle group relative rounded-md border bg-white shadow-md transition hover:scale-[1.02]"
                data-testid="event-type-link">
                {/* Don't prefetch till the time we drop the amount of javascript in [user][type] page which is impacting score for [user] page */}
                <div className="block w-full px-2 py-4">
                  <div className="mb-2 flex flex-row items-center gap-2">
                    <div className="self-start p-2">
                      <Icon name={iconParams.icon} className="h-6 w-6" style={{ color: iconParams.color }} />
                    </div>
                    <div className="mr-20">
                      <h3 className="text-default text-base font-semibold">{type.title}</h3>
                      {type.descriptionAsSafeHTML && (
                        <div
                          className={classNames(
                            "text-subtle line-clamp-3 break-words text-sm",
                            "line-clamp-4 [&>*:not(:first-child)]:hidden"
                          )}
                          // eslint-disable-next-line react/no-danger
                          dangerouslySetInnerHTML={{
                            __html: markdownToSafeHTML(type.descriptionAsSafeHTML || ""),
                          }}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex w-full flex-row justify-between">
                    <EventTypeDescription eventType={type} isPublic={true} shortenDescription />
                    <Link
                      key={type.id}
                      style={{ display: "flex", ...eventTypeListItemEmbedStyles }}
                      prefetch={false}
                      href={{
                        pathname: `/${user.profile.username}/${type.slug}`,
                        query,
                      }}
                      passHref
                      onClick={async () => {
                        sdkActionManager?.fire("eventTypeSelected", {
                          eventType: type,
                        });
                      }}>
                      <Button variant="button" brandColor={profile?.brandColor} type="button" size="base">
                        {t("schedule")}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {isEventListEmpty && <EmptyPage name={profile.name || "User"} />}

        <div key="logo" className={classNames("mb-8 flex w-full justify-center [&_img]:h-[32px]")}>
          <Branding faviconUrl={user?.faviconUrl} />
        </div>
      </main>
    </div>
  );
}

function DividerWithText() {
  const { t } = useLocale();
  return (
    <div className="mb-2 flex items-center justify-center">
      <div className="bg-subtle h-px w-1/5 max-w-32 flex-none" />
      <span className="text-subtle mx-4 whitespace-nowrap text-sm font-medium">
        {t("choose_a_meeting_type")}
      </span>
      <div className="bg-subtle h-px w-1/5 max-w-32 flex-none" />
    </div>
  );
}

export default UserPage;
