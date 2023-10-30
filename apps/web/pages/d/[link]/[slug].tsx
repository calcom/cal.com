import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { Booker } from "@calcom/atoms";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getBookerWrapperClasses } from "@calcom/features/bookings/Booker/utils/getBookerWrapperClasses";
import { BookerSeo } from "@calcom/features/bookings/components/BookerSeo";
import { getBookingForReschedule, getMultipleDurationValue } from "@calcom/features/bookings/lib/get-booking";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";

import type { inferSSRProps } from "@lib/types/inferSSRProps";
import type { EmbedProps } from "@lib/withEmbedSsr";

import PageWrapper from "@components/PageWrapper";

type PageProps = inferSSRProps<typeof getServerSideProps> & EmbedProps;

export default function Type({
  slug,
  isEmbed,
  user,
  booking,
  away,
  isBrandingHidden,
  isTeamEvent,
  entity,
  duration,
  hashedLink,
}: PageProps) {
  return (
    <main className={getBookerWrapperClasses({ isEmbed: !!isEmbed })}>
      <BookerSeo
        username={user}
        eventSlug={slug}
        rescheduleUid={booking?.uid}
        hideBranding={isBrandingHidden}
        entity={entity}
      />
      <Booker
        username={user}
        eventSlug={slug}
        bookingData={booking}
        isAway={away}
        hideBranding={isBrandingHidden}
        isTeamEvent={isTeamEvent}
        entity={entity}
        duration={duration}
        hashedLink={hashedLink}
      />
    </main>
  );
}

Type.PageWrapper = PageWrapper;
Type.isBookingPage = true;

async function getUserPageProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context);
  const { link, slug } = paramsSchema.parse(context.params);
  const { rescheduleUid, duration: queryDuration } = context.query;
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(context.req);
  const org = isValidOrgDomain ? currentOrgDomain : null;

  const { ssrInit } = await import("@server/lib/ssr");
  const ssr = await ssrInit(context);

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
    return {
      notFound: true,
    };
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
    return {
      notFound: true,
    };
  }

  let booking: GetBookingType | null = null;
  if (rescheduleUid) {
    booking = await getBookingForReschedule(`${rescheduleUid}`, session?.user?.id);
  }

  const isTeamEvent = !!hashedLink.eventType?.team?.id;

  // We use this to both prefetch the query on the server,
  // as well as to check if the event exist, so we c an show a 404 otherwise.
  const eventData = await ssr.viewer.public.event.fetch({ username, eventSlug: slug, isTeamEvent, org });

  if (!eventData) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      entity: eventData.entity,
      duration: getMultipleDurationValue(
        eventData.metadata?.multipleDuration,
        queryDuration,
        eventData.length
      ),
      booking,
      away: user?.away,
      user: username,
      slug,
      trpcState: ssr.dehydrate(),
      isBrandingHidden: user?.hideBranding,
      // Sending the team event from the server, because this template file
      // is reused for both team and user events.
      isTeamEvent,
      hashedLink: link,
    },
  };
}

const paramsSchema = z.object({ link: z.string(), slug: z.string().transform((s) => slugify(s)) });

// Booker page fetches a tiny bit of data server side, to determine early
// whether the page should show an away state or dynamic booking not allowed.
export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  return await getUserPageProps(context);
};
