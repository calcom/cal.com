import LegacyPage, { type PageProps } from "@pages/d/[link]/[slug]";
import { withAppDir } from "app/AppDirSSRHOC";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import type { GetServerSidePropsContext } from "next";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getBookingForReschedule, getMultipleDurationValue } from "@calcom/features/bookings/lib/get-booking";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { ssrInit } from "@server/lib/ssr";

export const generateMetadata = async ({ params }: { params: Record<string, string | string[]> }) => {
  const pageProps = await getPageProps(
    buildLegacyCtx(headers(), cookies(), params) as unknown as GetServerSidePropsContext
  );

  const { entity, booking, user, slug, isTeamEvent } = pageProps;
  const rescheduleUid = booking?.uid;
  const { trpc } = await import("@calcom/trpc");
  const { data: event } = trpc.viewer.public.event.useQuery(
    { username: user ?? "", eventSlug: slug ?? "", isTeamEvent, org: entity.orgSlug ?? null },
    { refetchOnWindowFocus: false }
  );
  const profileName = event?.profile?.name ?? "";
  const title = event?.title ?? "";
  return await _generateMetadata(
    (t) => `${rescheduleUid && !!booking ? t("reschedule") : ""} ${title} | ${profileName}`,
    (t) => `${rescheduleUid ? t("reschedule") : ""} ${title}`
  );
};

async function getPageProps(context: GetServerSidePropsContext) {
  const session = await getServerSession({ req: context.req });
  const { link, slug } = paramsSchema.parse(context.params);
  const { rescheduleUid, duration: queryDuration } = context.query;
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(context.req);
  const org = isValidOrgDomain ? currentOrgDomain : null;

  const hashedLink = await prisma.hashedLink.findUnique({
    where: {
      link,
    },
    select: {
      eventTypeId: true,
      eventType: {
        select: {
          users: {
            select: {
              username: true,
            },
          },
          team: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  const username = hashedLink?.eventType.users[0]?.username;

  if (!hashedLink || !username) {
    return notFound();
  }

  const user = await prisma.user.findFirst({
    where: {
      username,
      organization: isValidOrgDomain
        ? {
            slug: currentOrgDomain,
          }
        : null,
    },
    select: {
      away: true,
      hideBranding: true,
    },
  });

  if (!user) {
    return notFound();
  }

  let booking: GetBookingType | null = null;
  if (rescheduleUid) {
    booking = await getBookingForReschedule(`${rescheduleUid}`, session?.user?.id);
  }

  const isTeamEvent = !!hashedLink.eventType?.team?.id;
  const ssr = await ssrInit(context);

  // We use this to both prefetch the query on the server,
  // as well as to check if the event exist, so we c an show a 404 otherwise.
  const eventData = await ssr.viewer.public.event.fetch({ username, eventSlug: slug, isTeamEvent, org });

  if (!eventData) {
    return notFound();
  }

  return {
    entity: eventData.entity,
    duration: getMultipleDurationValue(eventData.metadata?.multipleDuration, queryDuration, eventData.length),
    booking,
    away: user?.away,
    user: username,
    slug,
    dehydratedState: ssr.dehydrate(),
    isBrandingHidden: user?.hideBranding,
    // Sending the team event from the server, because this template file
    // is reused for both team and user events.
    isTeamEvent,
    hashedLink: link,
  };
}

const paramsSchema = z.object({ link: z.string(), slug: z.string().transform((s) => slugify(s)) });

// @ts-expect-error arg
const getData = withAppDir<PageProps>(getPageProps);
export default WithLayout({ getLayout: null, Page: LegacyPage, getData })<"P">;
