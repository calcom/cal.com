"use client";

import { Button } from "@calid/features/ui/components/button";
import { Icon } from "@calid/features/ui/components/icon";
import classNames from "classnames";
import type { InferGetServerSidePropsType } from "next";
import Link from "next/link";

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
import { UserAvatar } from "@calcom/ui/components/avatar";
import { UnpublishedEntity } from "@calcom/ui/components/unpublished-entity";

import type { getServerSideProps } from "@server/lib/[user]/getServerSideProps";

export type PageProps = InferGetServerSidePropsType<typeof getServerSideProps>;
export function UserPage(props: PageProps) {
  const { users, profile, eventTypes, entity } = props;
  const { t } = useLocale();
  const [user] = users; //To be used when we only have a single user, not dynamic group

  useTheme(profile.theme);

  const isBioEmpty = !user.bio || !user.bio.replace("<p><br></p>", "").length;

  const isEmbed = useIsEmbed(props.isEmbed);
  const eventTypeListItemEmbedStyles = useEmbedStyles("eventTypeListItem");
  const shouldAlignCentrallyInEmbed = useEmbedNonStylesConfig("align") !== "left";
  const shouldAlignCentrally = !isEmbed || shouldAlignCentrallyInEmbed;
  const {
    // So it doesn't display in the Link (and make tests fail)
    user: _user,
    orgSlug: _orgSlug,
    redirect: _redirect,
    ...query
  } = useRouterQuery();

  /*
   const telemetry = useTelemetry();
   useEffect(() => {
    if (top !== window) {
      //page_view will be collected automatically by _middleware.ts
      telemetry.event(telemetryEventTypes.embedView, collectPageParameters("/[user]"));
    }
  }, [telemetry, router.asPath]); */
  if (entity.considerUnpublished) {
    return (
      <div className="flex h-full min-h-[calc(100dvh)] items-center justify-center">
        <UnpublishedEntity {...entity} />
      </div>
    );
  }

  const isEventListEmpty = eventTypes.length === 0;
  const isOrg = !!user?.profile?.organization;

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
          isEmbed ? "border-booker border-booker-width  bg-default rounded-md" : "bg-default",
          "h-full  w-full"
        )}>
        <div
          className={classNames(
            "border-subtle bg-cal-gradient text-default mb-8 flex flex-col items-center bg-cover bg-center p-4"
          )}
          style={{ backgroundImage: user.headerUrl ? `url(${user.headerUrl})` : undefined }}>
          <UserAvatar
            size="xl"
            user={{
              avatarUrl: user.avatarUrl,
              profile: user.profile,
              name: profile.name,
              username: profile.username,
            }}
          />
          <h1 className="font-cal text-emphasis mb-4 mt-4 text-3xl" data-testid="name-title">
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
                className="text-subtle break-words px-[30%] text-center text-sm font-medium sm:px-[10%] [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: props.safeBio }}
              />
            </>
          )}
        </div>

        <DividerWithText />

        <div
          className={classNames("bg-default flex flex-col gap-5 rounded-md px-[15%] py-[1%]")}
          data-testid="event-types">
          {eventTypes.map((type) => (
            <div
              key={type.id}
              className="bg-muted border-subtle dark:bg-muted dark:hover:bg-emphasis hover:bg-muted group relative rounded-md border transition"
              data-testid="event-type-link">
              {/* <Icon
                  name="arrow-right"
                  className="text-emphasis absolute right-4 top-4 h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
                /> */}
              {/* Don't prefetch till the time we drop the amount of javascript in [user][type] page which is impacting score for [user] page */}
              <div className="block w-full p-4">
                <div className="flex flex-row items-center gap-2">
                  <div className="bg-default rounded-lg p-2">
                    <Icon name="calendar" className="h-8 w-8" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center">
                      <h2 className="text-default pr-2 text-base font-semibold">{type.title}</h2>
                    </div>

                    {type.descriptionAsSafeHTML && (
                      <div
                        className={classNames(
                          "text-subtle line-clamp-3 break-words text-sm sm:max-w-[650px] [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600",
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
                <div className="mt-1 flex w-full flex-row justify-between">
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
                    <Button variant="fab">{t("schedule")}</Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {isEventListEmpty && <EmptyPage name={profile.name || "User"} />}
      </main>
      {/* <Toaster position="bottom-right" className="bg-default" /> */}
    </div>
  );
}

function DividerWithText() {
  const { t } = useLocale();
  return (
    <div className="mx-[35%] mb-2 mt-6 flex items-center">
      <div className="bg-subtle h-px flex-1" />
      <span className="text-subtle mx-4 whitespace-nowrap text-sm font-medium">
        {t("choose_a_meeting_type")}
      </span>
      <div className="bg-subtle h-px flex-1" />
    </div>
  );
}

export default UserPage;
