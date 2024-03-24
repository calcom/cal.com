"use client";

import classNames from "classnames";
import type { InferGetServerSidePropsType } from "next";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Toaster } from "react-hot-toast";

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
import { HeadSeo, UnpublishedEntity, UserAvatar } from "@calcom/ui";
import { ArrowRight, Verified } from "@calcom/ui/components/icon";

import { type getServerSideProps } from "./users-public-view.getServerSideProps";

export function UserPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { users, profile, eventTypes, markdownStrippedBio, entity } = props;
  const searchParams = useSearchParams();

  const [user] = users; //To be used when we only have a single user, not dynamic group
  useTheme(profile.theme);
  const { t } = useLocale();

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

  const isRedirect = searchParams?.get("redirected") === "true" || false;
  const fromUserNameRedirected = searchParams?.get("username") || "";
  /*
   const telemetry = useTelemetry();
   useEffect(() => {
    if (top !== window) {
      //page_view will be collected automatically by _middleware.ts
      telemetry.event(telemetryEventTypes.embedView, collectPageParameters("/[user]"));
    }
  }, [telemetry, router.asPath]); */

  if (entity?.isUnpublished) {
    return (
      <div className="flex h-full min-h-[100dvh] items-center justify-center">
        <UnpublishedEntity {...entity} />
      </div>
    );
  }

  const isEventListEmpty = eventTypes.length === 0;
  const isOrg = !!user?.profile?.organization;

  return (
    <>
      <HeadSeo
        title={profile.name}
        description={markdownStrippedBio}
        meeting={{
          title: markdownStrippedBio,
          profile: { name: `${profile.name}`, image: user.avatarUrl || null },
          users: [{ username: `${user.username}`, name: `${user.name}` }],
        }}
        nextSeoProps={{
          noindex: !profile.allowSEOIndexing,
          nofollow: !profile.allowSEOIndexing,
        }}
      />

      <div className={classNames(shouldAlignCentrally ? "mx-auto" : "", isEmbed ? "max-w-3xl" : "")}>
        <main
          className={classNames(
            shouldAlignCentrally ? "mx-auto" : "",
            isEmbed ? "border-booker border-booker-width  bg-default rounded-md border" : "",
            "max-w-3xl px-4 py-24"
          )}>
          {isRedirect && (
            <div className="mb-8 rounded-md bg-blue-100 p-4 dark:border dark:bg-transparent">
              <h2 className="text-default mb-2 text-sm font-semibold dark:text-white">
                {t("user_redirect_title", {
                  username: fromUserNameRedirected,
                })}{" "}
                🏝️
              </h2>
              <p className="text-default text-sm">
                {t("user_redirect_description", {
                  profile: {
                    username: user.username,
                  },
                  username: fromUserNameRedirected,
                })}{" "}
                😄
              </p>
            </div>
          )}
          <div className="mb-8 text-center">
            <UserAvatar
              size="xl"
              user={{
                avatarUrl: user.avatarUrl,
                profile: user.profile,
                name: profile.name,
                username: profile.username,
              }}
            />
            <h1 className="font-cal text-emphasis my-1 text-3xl" data-testid="name-title">
              {profile.name}
              {!isOrg && user.verified && (
                <Verified className=" mx-1 -mt-1 inline h-6 w-6 fill-blue-500 text-white dark:text-black" />
              )}
              {isOrg && (
                <Verified className=" mx-1 -mt-1 inline h-6 w-6 fill-yellow-500 text-white dark:text-black" />
              )}
            </h1>
            {!isBioEmpty && (
              <>
                <div
                  className="  text-subtle break-words text-sm [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600"
                  dangerouslySetInnerHTML={{ __html: props.safeBio }}
                />
              </>
            )}
          </div>

          <div
            className={classNames("rounded-md ", !isEventListEmpty && "border-subtle border")}
            data-testid="event-types">
            {user.away ? (
              <div className="overflow-hidden rounded-sm border ">
                <div className="text-muted  p-8 text-center">
                  <h2 className="font-cal text-default mb-2 text-3xl">😴{` ${t("user_away")}`}</h2>
                  <p className="mx-auto max-w-md">{t("user_away_description") as string}</p>
                </div>
              </div>
            ) : (
              eventTypes.map((type) => (
                <div
                  key={type.id}
                  style={{ display: "flex", ...eventTypeListItemEmbedStyles }}
                  className="bg-default border-subtle dark:bg-muted dark:hover:bg-emphasis hover:bg-muted group relative border-b first:rounded-t-md last:rounded-b-md last:border-b-0">
                  <ArrowRight className="text-emphasis  absolute right-4 top-4 h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  {/* Don't prefetch till the time we drop the amount of javascript in [user][type] page which is impacting score for [user] page */}
                  <div className="block w-full p-5">
                    <Link
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
                      }}
                      data-testid="event-type-link">
                      <div className="flex flex-wrap items-center">
                        <h2 className=" text-default pr-2 text-sm font-semibold">{type.title}</h2>
                      </div>
                      <EventTypeDescription eventType={type} isPublic={true} shortenDescription />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {isEventListEmpty && <EmptyPage name={profile.name || "User"} />}
        </main>
        <Toaster position="bottom-right" />
      </div>
    </>
  );
}

export default UserPage;
