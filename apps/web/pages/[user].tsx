import type { DehydratedState } from "@tanstack/react-query";
import classNames from "classnames";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Link from "next/link";
import { Toaster } from "react-hot-toast";
import type { z } from "zod";

import {
  sdkActionManager,
  useEmbedNonStylesConfig,
  useEmbedStyles,
  useIsEmbed,
} from "@calcom/embed-core/embed-iframe";
import OrganizationMemberAvatar from "@calcom/features/ee/organizations/components/OrganizationMemberAvatar";
import { getSlugOrRequestedSlug } from "@calcom/features/ee/organizations/lib/orgDomains";
import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { EventTypeDescriptionLazy as EventTypeDescription } from "@calcom/features/eventtypes/components";
import EmptyPage from "@calcom/features/eventtypes/components/EmptyPage";
import { getUsernameList } from "@calcom/lib/defaultEvents";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import useTheme from "@calcom/lib/hooks/useTheme";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { stripMarkdown } from "@calcom/lib/stripMarkdown";
import prisma from "@calcom/prisma";
import { RedirectType, type EventType, type User } from "@calcom/prisma/client";
import { baseEventTypeSelect } from "@calcom/prisma/selects";
import { EventTypeMetaDataSchema, teamMetadataSchema } from "@calcom/prisma/zod-utils";
import { HeadSeo, UnpublishedEntity } from "@calcom/ui";
import { Verified, ArrowRight } from "@calcom/ui/components/icon";

import type { EmbedProps } from "@lib/withEmbedSsr";

import PageWrapper from "@components/PageWrapper";

import { ssrInit } from "@server/lib/ssr";

import { getTemporaryOrgRedirect } from "../lib/getTemporaryOrgRedirect";

export function UserPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { users, profile, eventTypes, markdownStrippedBio, entity } = props;

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
          <div className="mb-8 text-center">
            <OrganizationMemberAvatar
              size="xl"
              user={{
                organizationId: profile.organization?.id,
                name: profile.name,
                username: profile.username,
              }}
              organization={
                profile.organization?.id
                  ? {
                      id: profile.organization.id,
                      slug: profile.organization.slug,
                      requestedSlug: null,
                    }
                  : null
              }
            />
            <h1 className="font-cal text-emphasis my-1 text-3xl" data-testid="name-title">
              {profile.name}
              {user.verified && (
                <Verified className=" mx-1 -mt-1 inline h-6 w-6 fill-blue-500 text-white dark:text-black" />
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
                        pathname: `/${user.username}/${type.slug}`,
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

UserPage.isBookingPage = true;
UserPage.PageWrapper = PageWrapper;

const getEventTypesWithHiddenFromDB = async (userId: number) => {
  return (
    await prisma.eventType.findMany({
      where: {
        AND: [
          {
            teamId: null,
          },
          {
            OR: [
              {
                userId,
              },
              {
                users: {
                  some: {
                    id: userId,
                  },
                },
              },
            ],
          },
        ],
      },
      orderBy: [
        {
          position: "desc",
        },
        {
          id: "asc",
        },
      ],
      select: {
        ...baseEventTypeSelect,
        metadata: true,
      },
    })
  ).map((eventType) => ({
    ...eventType,
    metadata: EventTypeMetaDataSchema.parse(eventType.metadata),
  }));
};

export type UserPageProps = {
  trpcState: DehydratedState;
  profile: {
    name: string;
    image: string;
    theme: string | null;
    brandColor: string;
    darkBrandColor: string;
    organization: {
      requestedSlug: string | null;
      slug: string | null;
      id: number | null;
    };
    allowSEOIndexing: boolean;
    username: string | null;
  };
  users: Pick<User, "away" | "name" | "username" | "bio" | "verified" | "avatarUrl">[];
  themeBasis: string | null;
  markdownStrippedBio: string;
  safeBio: string;
  entity: {
    isUnpublished?: boolean;
    orgSlug?: string | null;
    name?: string | null;
  };
  eventTypes: ({
    descriptionAsSafeHTML: string;
    metadata: z.infer<typeof EventTypeMetaDataSchema>;
  } & Pick<
    EventType,
    | "id"
    | "title"
    | "slug"
    | "length"
    | "hidden"
    | "lockTimeZoneToggleOnBookingPage"
    | "requiresConfirmation"
    | "requiresBookerEmailVerification"
    | "price"
    | "currency"
    | "recurringEvent"
  >)[];
} & EmbedProps;

export const getServerSideProps: GetServerSideProps<UserPageProps> = async (context) => {
  const ssr = await ssrInit(context);
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(context.req, context.params?.orgSlug);
  const usernameList = getUsernameList(context.query.user as string);
  const isOrgContext = isValidOrgDomain && currentOrgDomain;
  const dataFetchStart = Date.now();
  const usersWithoutAvatar = await prisma.user.findMany({
    where: {
      username: {
        in: usernameList,
      },
      organization: isOrgContext ? getSlugOrRequestedSlug(currentOrgDomain) : null,
    },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      bio: true,
      metadata: true,
      brandColor: true,
      darkBrandColor: true,
      avatarUrl: true,
      organizationId: true,
      organization: {
        select: {
          slug: true,
          name: true,
          metadata: true,
        },
      },
      theme: true,
      away: true,
      verified: true,
      allowDynamicBooking: true,
      allowSEOIndexing: true,
    },
  });

  const isDynamicGroup = usersWithoutAvatar.length > 1;
  if (isDynamicGroup) {
    return {
      redirect: {
        permanent: false,
        destination: `/${usernameList.join("+")}/dynamic`,
      },
    } as {
      redirect: {
        permanent: false;
        destination: string;
      };
    };
  }

  const users = usersWithoutAvatar.map((user) => ({
    ...user,
    organization: {
      ...user.organization,
      metadata: user.organization?.metadata ? teamMetadataSchema.parse(user.organization.metadata) : null,
    },
    avatar: `/${user.username}/avatar.png`,
  }));

  if (!isOrgContext) {
    const redirect = await getTemporaryOrgRedirect({
      slug: usernameList[0],
      redirectType: RedirectType.User,
      eventTypeSlug: null,
      currentQuery: context.query,
    });

    if (redirect) {
      return redirect;
    }
  }

  if (!users.length || (!isValidOrgDomain && !users.some((user) => user.organizationId === null))) {
    return {
      notFound: true,
    } as {
      notFound: true;
    };
  }

  const [user] = users; //to be used when dealing with single user, not dynamic group

  const profile = {
    name: user.name || user.username || "",
    image: user.avatar,
    theme: user.theme,
    brandColor: user.brandColor,
    avatarUrl: user.avatarUrl,
    darkBrandColor: user.darkBrandColor,
    allowSEOIndexing: user.allowSEOIndexing ?? true,
    username: user.username,
    organization: {
      id: user.organizationId,
      slug: user.organization?.slug ?? null,
      requestedSlug: user.organization?.metadata?.requestedSlug ?? null,
    },
  };

  const eventTypesWithHidden = await getEventTypesWithHiddenFromDB(user.id);
  const dataFetchEnd = Date.now();
  if (context.query.log === "1") {
    context.res.setHeader("X-Data-Fetch-Time", `${dataFetchEnd - dataFetchStart}ms`);
  }
  const eventTypesRaw = eventTypesWithHidden.filter((evt) => !evt.hidden);

  const eventTypes = eventTypesRaw.map((eventType) => ({
    ...eventType,
    metadata: EventTypeMetaDataSchema.parse(eventType.metadata || {}),
    descriptionAsSafeHTML: markdownToSafeHTML(eventType.description),
  }));

  // if profile only has one public event-type, redirect to it
  if (eventTypes.length === 1 && context.query.redirect !== "false") {
    return {
      redirect: {
        permanent: false,
        destination: `/${user.username}/${eventTypes[0].slug}`,
      },
    };
  }

  const safeBio = markdownToSafeHTML(user.bio) || "";

  const markdownStrippedBio = stripMarkdown(user?.bio || "");
  const org = usersWithoutAvatar[0].organization;

  return {
    props: {
      users: users.map((user) => ({
        name: user.name,
        username: user.username,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        away: user.away,
        verified: user.verified,
      })),
      entity: {
        isUnpublished: org?.slug === null,
        orgSlug: currentOrgDomain,
        name: org?.name ?? null,
      },
      eventTypes,
      safeBio,
      profile,
      // Dynamic group has no theme preference right now. It uses system theme.
      themeBasis: user.username,
      trpcState: ssr.dehydrate(),
      markdownStrippedBio,
    },
  };
};

export default UserPage;
