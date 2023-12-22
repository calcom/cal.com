import LegacyPage, { type UserPageProps } from "@pages/[user]";
import { withAppDir } from "app/AppDirSSRHOC";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { type GetServerSidePropsContext } from "next";
import { notFound } from "next/navigation";
import { encode } from "querystring";

import { getLayout } from "@calcom/features/MainLayoutAppDir";
import { handleUserRedirection } from "@calcom/features/booking-redirect/handle-user";
import { getSlugOrRequestedSlug } from "@calcom/features/ee/organizations/lib/orgDomains";
import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { DEFAULT_DARK_BRAND_COLOR, DEFAULT_LIGHT_BRAND_COLOR } from "@calcom/lib/constants";
import { getUsernameList } from "@calcom/lib/defaultEvents";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { stripMarkdown } from "@calcom/lib/stripMarkdown";
import prisma from "@calcom/prisma";
import { RedirectType } from "@calcom/prisma/client";
import { EventTypeMetaDataSchema, teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { getEventTypesWithHiddenFromDB } from "@lib/[user]/getServerSideProps";
import { getTemporaryOrgRedirect } from "@lib/getTemporaryOrgRedirect";

import { ssrInit } from "@server/lib/ssr";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("workflows"),
    (t) => t("workflows_to_automate_notifications")
  );

export const getPageProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(context.req, context.params?.orgSlug);
  const usernameList = getUsernameList(context.query.user as string);
  const isOrgContext = isValidOrgDomain && currentOrgDomain;
  const dataFetchStart = Date.now();
  let outOfOffice = false;

  if (usernameList.length === 1) {
    const result = await handleUserRedirection({ username: usernameList[0] });
    if (result && result.outOfOffice) {
      outOfOffice = true;
    }
    if (result && result.redirect?.destination) {
      return result;
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
    return notFound();
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
    dehydratedState: ssr.dehydrate(),
    markdownStrippedBio,
  };
};

// @ts-expect-error arg
export const getData = withAppDir<UserPageProps>(getPageProps);

export default WithLayout({ getLayout, getData, Page: LegacyPage })<"P">;
