import LegacyPage, { type PageProps } from "@pages/[user]/[type]";
import { withAppDir } from "app/AppDirSSRHOC";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { type GetServerSidePropsContext } from "next";
import { headers, cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import { getBookingForReschedule, getBookingForSeatedEvent } from "@calcom/features/bookings/lib/get-booking";
import { orgDomainConfig, userOrgQuery } from "@calcom/features/ee/organizations/lib/orgDomains";
import { getUsernameList } from "@calcom/lib/defaultEvents";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { RedirectType } from "@calcom/prisma/client";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getTemporaryOrgRedirect } from "@lib/getTemporaryOrgRedirect";

import { ssrInit } from "@server/lib/ssr";

export const generateMetadata = async ({ params }: { params: Record<string, string | string[]> }) => {
  const pageProps = await getPageProps(
    buildLegacyCtx(headers(), cookies(), params) as unknown as GetServerSidePropsContext
  );
  const { eventData, booking, user, slug } = pageProps;
  const rescheduleUid = booking?.uid;
  const { trpc } = await import("@calcom/trpc/react");
  const { data: event } = trpc.viewer.public.event.useQuery(
    { username: user, eventSlug: slug, isTeamEvent: false, org: eventData.entity.orgSlug ?? null },
    { refetchOnWindowFocus: false }
  );

  const profileName = event?.profile?.name ?? "";
  const title = event?.title ?? "";

  return await _generateMetadata(
    (t) => `${rescheduleUid && !!booking ? t("reschedule") : ""} ${title} | ${profileName}`,
    (t) => `${rescheduleUid ? t("reschedule") : ""} ${title}`
  );
};

const paramsSchema = z.object({
  type: z.string().transform((s) => slugify(s)),
  user: z.string().transform((s) => getUsernameList(s)),
});

async function getDynamicGroupPageProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context);
  const { user: usernames, type: slug } = paramsSchema.parse(context.params);
  const { rescheduleUid, bookingUid } = context.query;

  const ssr = await ssrInit(context);
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(context.req, context.params?.orgSlug);

  const users = await prisma.user.findMany({
    where: {
      username: {
        in: usernames,
      },
      organization: isValidOrgDomain
        ? {
            slug: currentOrgDomain,
          }
        : null,
    },
    select: {
      allowDynamicBooking: true,
    },
  });

  if (!users.length) {
    return notFound();
  }
  const org = isValidOrgDomain ? currentOrgDomain : null;

  let booking: GetBookingType | null = null;
  if (rescheduleUid) {
    booking = await getBookingForReschedule(`${rescheduleUid}`, session?.user?.id);
  } else if (bookingUid) {
    booking = await getBookingForSeatedEvent(`${bookingUid}`);
  }

  // We use this to both prefetch the query on the server,
  // as well as to check if the event exist, so we c an show a 404 otherwise.
  const eventData = await ssr.viewer.public.event.fetch({
    username: usernames.join("+"),
    eventSlug: slug,
    org,
  });

  if (!eventData) {
    return notFound();
  }

  return {
    eventData: {
      entity: eventData.entity,
      length: eventData.length,
      metadata: {
        ...eventData.metadata,
        multipleDuration: [15, 30, 60],
      },
    },
    booking,
    user: usernames.join("+"),
    slug,
    away: false,
    dehydratedState: ssr.dehydrate(),
    isBrandingHidden: false,
    isSEOIndexable: true,
    themeBasis: null,
    bookingUid: bookingUid ? `${bookingUid}` : null,
    rescheduleUid: rescheduleUid ? `${rescheduleUid}` : null,
  };
}

async function getUserPageProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context);
  const { user: usernames, type: slug } = paramsSchema.parse(context.params);
  const username = usernames[0];
  const { rescheduleUid, bookingUid } = context.query;
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(context.req, context.params?.orgSlug);

  const isOrgContext = currentOrgDomain && isValidOrgDomain;

  if (!isOrgContext) {
    const redirectObj = await getTemporaryOrgRedirect({
      slug: usernames[0],
      redirectType: RedirectType.User,
      eventTypeSlug: slug,
      currentQuery: context.query,
    });

    if (redirectObj) {
      return redirect(redirectObj.redirect.destination);
    }
  }

  const ssr = await ssrInit(context);
  const user = await prisma.user.findFirst({
    where: {
      username,
      organization: userOrgQuery(context.req, context.params?.orgSlug),
    },
    select: {
      away: true,
      hideBranding: true,
      allowSEOIndexing: true,
    },
  });

  if (!user) {
    return notFound();
  }

  let booking: GetBookingType | null = null;
  if (rescheduleUid) {
    booking = await getBookingForReschedule(`${rescheduleUid}`, session?.user?.id);
  } else if (bookingUid) {
    booking = await getBookingForSeatedEvent(`${bookingUid}`);
  }

  const org = isValidOrgDomain ? currentOrgDomain : null;
  // We use this to both prefetch the query on the server,
  // as well as to check if the event exist, so we can show a 404 otherwise.
  const eventData = await ssr.viewer.public.event.fetch({
    username,
    eventSlug: slug,
    org,
  });

  if (!eventData) {
    return notFound();
  }

  return {
    booking,
    eventData: {
      entity: eventData.entity,
      length: eventData.length,
      metadata: eventData.metadata,
    },
    away: user?.away,
    user: username,
    slug,
    dehydratedState: ssr.dehydrate(),
    isBrandingHidden: user?.hideBranding,
    isSEOIndexable: user?.allowSEOIndexing,
    themeBasis: username,
    bookingUid: bookingUid ? `${bookingUid}` : null,
    rescheduleUid: rescheduleUid ? `${rescheduleUid}` : null,
  };
}

export const getPageProps = async (context: GetServerSidePropsContext) => {
  const { user } = paramsSchema.parse(context.params);
  const isDynamicGroup = user.length > 1;

  return isDynamicGroup ? await getDynamicGroupPageProps(context) : await getUserPageProps(context);
};

// @ts-expect-error arg
export const getData = withAppDir<PageProps>(getPageProps);

export default WithLayout({ getData, Page: LegacyPage, getLayout: null })<"P">;
