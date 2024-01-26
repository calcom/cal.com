import type { DehydratedState } from "@tanstack/react-query";
import type { GetServerSideProps } from "next";
import { encode } from "querystring";
import type { z } from "zod";

import { handleUserRedirection } from "@calcom/features/booking-redirect/handle-user";
import { getSlugOrRequestedSlug } from "@calcom/features/ee/organizations/lib/orgDomains";
import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { DEFAULT_DARK_BRAND_COLOR, DEFAULT_LIGHT_BRAND_COLOR } from "@calcom/lib/constants";
import { getUsernameList } from "@calcom/lib/defaultEvents";
import logger from "@calcom/lib/logger";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { stripMarkdown } from "@calcom/lib/stripMarkdown";
import prisma from "@calcom/prisma";
import { RedirectType, type EventType, type User } from "@calcom/prisma/client";
import { baseEventTypeSelect } from "@calcom/prisma/selects";
import { EventTypeMetaDataSchema, teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { getTemporaryOrgRedirect } from "@lib/getTemporaryOrgRedirect";
import type { EmbedProps } from "@lib/withEmbedSsr";

import { ssrInit } from "@server/lib/ssr";

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

export const getEventTypesWithHiddenFromDB = async (userId: number) => {
  const eventTypes = await prisma.eventType.findMany({
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
  });
  // map and filter metadata, exclude eventType entirely when faulty metadata is found.
  // report error to exception so we don't lose the error.
  return eventTypes.reduce<typeof eventTypes>((eventTypes, eventType) => {
    const parsedMetadata = EventTypeMetaDataSchema.safeParse(eventType.metadata);
    if (!parsedMetadata.success) {
      logger.error(parsedMetadata.error);
      return eventTypes;
    }
    eventTypes.push({
      ...eventType,
      metadata: parsedMetadata.data,
    });
    return eventTypes;
  }, []);
};

export const getServerSideProps: GetServerSideProps<UserPageProps> = async (context) => {
  const ssr = await ssrInit(context);
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(context.req, context.params?.orgSlug);
  const usernameList = getUsernameList(context.query.user as string);
  const isOrgContext = isValidOrgDomain && currentOrgDomain;
  const dataFetchStart = Date.now();
  let outOfOffice = false;
  const isDynamicGroup = usernameList.length > 1;
  if (usernameList.length === 1) {
    const result = await handleUserRedirection({ username: usernameList[0] });
    if (result && result.outOfOffice) {
      outOfOffice = true;
    }
    if (result && result.redirect?.destination) {
      return result;
    }
  }

  if (!isOrgContext) {
    const redirect = await getTemporaryOrgRedirect({
      slugs: usernameList,
      redirectType: RedirectType.User,
      eventTypeSlug: null,
      currentQuery: context.query,
    });

    if (redirect) {
      return redirect;
    }
  }

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

  const users = usersWithoutAvatar.map((user) => ({
    ...user,
    organization: {
      ...user.organization,
      metadata: user.organization?.metadata ? teamMetadataSchema.parse(user.organization.metadata) : null,
    },
    avatar: `/${user.username}/avatar.png`,
  }));

  if (isDynamicGroup) {
    const destinationUrl = `/${usernameList.join("+")}/dynamic`;
    logger.debug(`Dynamic group detected, redirecting to ${destinationUrl}`);
    return {
      redirect: {
        permanent: false,
        destination: destinationUrl,
      },
    } as {
      redirect: {
        permanent: false;
        destination: string;
      };
    };
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
    brandColor: user.brandColor ?? DEFAULT_LIGHT_BRAND_COLOR,
    avatarUrl: user.avatarUrl,
    darkBrandColor: user.darkBrandColor ?? DEFAULT_DARK_BRAND_COLOR,
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
  if (eventTypes.length === 1 && context.query.redirect !== "false" && !outOfOffice) {
    // Redirect but don't change the URL
    const urlDestination = `/${user.username}/${eventTypes[0].slug}`;
    const { query } = context;
    const urlQuery = new URLSearchParams(encode(query));

    return {
      redirect: {
        permanent: false,
        destination: `${urlDestination}?${urlQuery}`,
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
        away: usernameList.length === 1 ? outOfOffice : user.away,
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
