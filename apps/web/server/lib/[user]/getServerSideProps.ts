import type { EmbedProps } from "app/WithEmbedSSR";
import type { GetServerSideProps } from "next";
import { encode } from "querystring";
import type { z } from "zod";

import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { getUsernameList } from "@calcom/features/eventtypes/lib/defaultEvents";
import { getEventTypesPublic } from "@calcom/features/eventtypes/lib/getEventTypesPublic";
import { getBrandingForUser } from "@calcom/features/profile/lib/getBranding";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { DEFAULT_DARK_BRAND_COLOR, DEFAULT_LIGHT_BRAND_COLOR } from "@calcom/lib/constants";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import logger from "@calcom/lib/logger";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { safeStringify } from "@calcom/lib/safeStringify";
import { stripMarkdown } from "@calcom/lib/stripMarkdown";
import { prisma } from "@calcom/prisma";
import type { EventType, User } from "@calcom/prisma/client";
import { RedirectType } from "@calcom/prisma/enums";
import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { UserProfile } from "@calcom/types/UserProfile";

import { handleOrgRedirect } from "@lib/handleOrgRedirect";

const log = logger.getSubLogger({ prefix: ["[[pages/[user]]]"] });
type UserPageProps = {
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
      brandColor: string | null;
      darkBrandColor: string | null;
      theme: string | null;
    } | null;
    allowSEOIndexing: boolean;
    username: string | null;
  };
  users: (Pick<User, "name" | "username" | "bio" | "verified" | "avatarUrl"> & {
    profile: UserProfile;
  })[];
  themeBasis: string | null;
  markdownStrippedBio: string;
  safeBio: string;
  entity: {
    logoUrl?: string | null;
    considerUnpublished: boolean;
    orgSlug?: string | null;
    name?: string | null;
    teamSlug?: string | null;
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
    | "lockedTimeZone"
    | "requiresConfirmation"
    | "canSendCalVideoTranscriptionEmails"
    | "requiresBookerEmailVerification"
    | "price"
    | "currency"
    | "recurringEvent"
    | "seatsPerTimeSlot"
    | "schedulingType"
  >)[];
  isOrgSEOIndexable: boolean | undefined;
} & EmbedProps;

export const getServerSideProps: GetServerSideProps<UserPageProps> = async (context) => {
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(context.req, context.params?.orgSlug);
  const usernameList = getUsernameList(context.query.user as string);
  const isARedirectFromNonOrgLink = context.query.orgRedirection === "true";
  const dataFetchStart = Date.now();

  const redirect = await handleOrgRedirect({
    slugs: usernameList,
    redirectType: RedirectType.User,
    eventTypeSlug: null,
    context,
    currentOrgDomain: isValidOrgDomain ? currentOrgDomain : null,
  });

  if (redirect) {
    return redirect;
  }

  const usersInOrgContext = await getUsersInOrgContext(
    usernameList,
    isValidOrgDomain ? currentOrgDomain : null
  );

  const isDynamicGroup = usersInOrgContext.length > 1;
  log.debug(safeStringify({ usersInOrgContext, isValidOrgDomain, currentOrgDomain, isDynamicGroup }));

  if (isDynamicGroup) {
    const destinationUrl = encodeURI(`/${usernameList.join("+")}/dynamic`);

    // EXAMPLE - context.params: { orgSlug: 'acme', user: 'member0+owner1' }
    // EXAMPLE - context.query: { redirect: 'undefined', orgRedirection: 'undefined', user: 'member0+owner1' }
    const originalQueryString = new URLSearchParams(context.query as Record<string, string>).toString();
    const destinationWithQuery = `${destinationUrl}?${originalQueryString}`;
    log.debug(`Dynamic group detected, redirecting to ${destinationUrl}`);
    return {
      redirect: {
        permanent: false,
        destination: destinationWithQuery,
      },
    } as const;
  }

  const isNonOrgUser = (user: { profile: UserProfile }) => {
    return !user.profile?.organization;
  };

  const isThereAnyNonOrgUser = usersInOrgContext.some(isNonOrgUser);

  if (!usersInOrgContext.length || (!isValidOrgDomain && !isThereAnyNonOrgUser)) {
    return {
      notFound: true,
    } as const;
  }

  const [user] = usersInOrgContext; //to be used when dealing with single user, not dynamic group

  const branding = getBrandingForUser({ user });

  const profile = {
    name: user.name || user.username || "",
    image: getUserAvatarUrl({
      avatarUrl: user.avatarUrl,
    }),
    theme: branding.theme,
    brandColor: branding.brandColor ?? DEFAULT_LIGHT_BRAND_COLOR,
    avatarUrl: user.avatarUrl,
    darkBrandColor:
      branding.darkBrandColor ?? DEFAULT_DARK_BRAND_COLOR,
    allowSEOIndexing: user.allowSEOIndexing ?? true,
    username: user.username,
    organization: user.profile.organization,
  };

  const dataFetchEnd = Date.now();
  if (context.query.log === "1") {
    context.res.setHeader("X-Data-Fetch-Time", `${dataFetchEnd - dataFetchStart}ms`);
  }

  const eventTypes = await getEventTypesPublic(user.id);

  // if profile only has one public event-type, redirect to it
  if (eventTypes.length === 1 && context.query.redirect !== "false") {
    // Redirect but don't change the URL
    const urlDestination = `/${user.profile.username}/${eventTypes[0].slug}`;
    const { query } = context;
    const urlQuery = new URLSearchParams(encode(query));

    return {
      redirect: {
        permanent: false,
        destination: `${encodeURI(urlDestination)}?${urlQuery}`,
      },
    };
  }

  const safeBio = markdownToSafeHTML(user.bio) || "";

  const markdownStrippedBio = stripMarkdown(user?.bio || "");
  const org = usersInOrgContext[0].profile.organization;

  return {
    props: {
      users: usersInOrgContext.map((user) => ({
        name: user.name,
        username: user.username,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        verified: user.verified,
        profile: user.profile,
      })),
      entity: {
        ...(org?.logoUrl ? { logoUrl: org?.logoUrl } : {}),
        considerUnpublished: !isARedirectFromNonOrgLink && org?.slug === null,
        orgSlug: currentOrgDomain,
        name: org?.name ?? null,
      },
      eventTypes,
      safeBio,
      profile,
      // Dynamic group has no theme preference right now. It uses system theme.
      themeBasis: user.username,
      markdownStrippedBio,
      isOrgSEOIndexable: org?.organizationSettings?.allowSEOIndexing ?? false,
    },
  };
};

export async function getUsersInOrgContext(usernameList: string[], orgSlug: string | null) {
  const userRepo = new UserRepository(prisma);

  const usersInOrgContext = await userRepo.findUsersByUsername({
    usernameList,
    orgSlug,
  });

  if (usersInOrgContext.length) {
    return usersInOrgContext;
  }

  // note(Lauris): platform members (people who run platform) are part of platform organization while
  // the platform organization does not have a domain. In this case there is no org domain but also platform member
  // "User.organization" is not null so "UserRepository.findUsersByUsername" returns empty array and we do this as a last resort
  // call to find platform member.
  return await userRepo.findPlatformMembersByUsernames({
    usernameList,
  });
}
