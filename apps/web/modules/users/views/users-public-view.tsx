"use client";

import classNames from "classnames";
import type { InferGetServerSidePropsType } from "next";
import Link from "next/link";
import { Toaster } from "sonner";

import {
  sdkActionManager,
  useEmbedNonStylesConfig,
  useEmbedStyles,
  useIsEmbed,
} from "@calcom/embed-core/embed-iframe";
import { EventTypeDescriptionLazy as EventTypeDescription } from "@calcom/features/eventtypes/components";
import EmptyPage from "@calcom/features/eventtypes/components/EmptyPage";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import useTheme from "@calcom/lib/hooks/useTheme";
import { UserAvatar } from "@calcom/ui/components/avatar";
import { Icon } from "@calcom/ui/components/icon";
import { UnpublishedEntity } from "@calcom/ui/components/unpublished-entity";

import type { getServerSideProps } from "@server/lib/[user]/getServerSideProps";

export type PageProps = InferGetServerSidePropsType<typeof getServerSideProps>;
export function UserPage(props: PageProps) {
  const { users, profile, eventTypes, entity } = props;

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
    <>
      <div className={classNames(shouldAlignCentrally ? "mx-auto" : "", isEmbed ? "max-w-3xl" : "")}>
        <main
          className={classNames(
            shouldAlignCentrally ? "mx-auto" : "",
            isEmbed ? "border-booker border-booker-width  bg-default rounded-md" : "",
            "max-w-3xl px-4 py-24"
          )}>
          <div className="border-subtle bg-default text-default mb-8 rounded-xl border p-4">
            <UserAvatar
              size="lg"
              user={{
                avatarUrl: user.avatarUrl,
                profile: user.profile,
                name: profile.name,
                username: profile.username,
              }}
            />
            <h1 className="font-cal text-emphasis mb-1 mt-4 text-xl" data-testid="name-title">
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
                  className="text-default wrap-break-word text-sm [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600"
                  dangerouslySetInnerHTML={{ __html: props.safeBio }}
                />
              </>
            )}
          </div>

          <div
            className={classNames("rounded-md ", !isEventListEmpty && "border-subtle border")}
            data-testid="event-types">
            {eventTypes.map((type) => (
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
                }}
                className="bg-default border-subtle dark:bg-cal-muted dark:hover:bg-subtle hover:bg-cal-muted group relative border-b transition first:rounded-t-md last:rounded-b-md last:border-b-0"
                data-testid="event-type-link">
                <Icon
                  name="arrow-right"
                  className="text-emphasis absolute right-4 top-4 h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
                />
                {/* Don't prefetch till the time we drop the amount of javascript in [user][type] page which is impacting score for [user] page */}
                <div className="block w-full p-5">
                  <div className="flex flex-wrap items-center">
                    <h2 className="text-default pr-2 text-sm font-semibold">{type.title}</h2>
                  </div>
                  <EventTypeDescription eventType={type} isPublic={true} shortenDescription />
                </div>
              </Link>
            ))}
          </div>

          {isEventListEmpty && <EmptyPage name={profile.name || "User"} />}
        </main>
        <Toaster position="bottom-right" />
      </div>
    </>
  );
}

export default UserPage;
