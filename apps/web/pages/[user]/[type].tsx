import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { Booker } from "@calcom/atoms";
import { getBookerWrapperClasses } from "@calcom/features/bookings/Booker/utils/getBookerWrapperClasses";
import { BookerSeo } from "@calcom/features/bookings/components/BookerSeo";
import {
  getBookingForReschedule,
  getBookingForSeatedEvent,
  getMultipleDurationValue,
} from "@calcom/features/bookings/lib/get-booking";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import { getSlugOrRequestedSlug } from "@calcom/features/ee/organizations/lib/orgDomains";
import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { getUsernameList } from "@calcom/lib/defaultEvents";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";

import type { inferSSRProps } from "@lib/types/inferSSRProps";
import type { EmbedProps } from "@lib/withEmbedSsr";

import PageWrapper from "@components/PageWrapper";

export type PageProps = inferSSRProps<typeof getServerSideProps> & EmbedProps;

export default function Type({
  slug,
  user,
  isEmbed,
  booking,
  away,
  isBrandingHidden,
  isSEOIndexable,
  rescheduleUid,
  entity,
  duration,
}: PageProps) {
  return (
    <main className={getBookerWrapperClasses({ isEmbed: !!isEmbed })}>
      <BookerSeo
        username={user}
        eventSlug={slug}
        rescheduleUid={rescheduleUid ?? undefined}
        hideBranding={isBrandingHidden}
        isSEOIndexable={isSEOIndexable ?? true}
        entity={entity}
      />
      <Booker
        username={user}
        eventSlug={slug}
        bookingData={booking}
        isAway={away}
        hideBranding={isBrandingHidden}
        entity={entity}
        duration={duration}
      />
    </main>
  );
}

Type.isBookingPage = true;
Type.PageWrapper = PageWrapper;

async function getDynamicGroupPageProps(context: GetServerSidePropsContext) {
  const { user: usernames, type: slug } = paramsSchema.parse(context.params);
  const { rescheduleUid, bookingUid, duration: queryDuration } = context.query;

  const { ssrInit } = await import("@server/lib/ssr");
  const ssr = await ssrInit(context);
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(
    context.req.headers.host ?? "",
    context.params?.orgSlug
  );

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
    return {
      notFound: true,
    };
  }
  const org = isValidOrgDomain ? currentOrgDomain : null;

  let booking: GetBookingType | null = null;
  if (rescheduleUid) {
    booking = await getBookingForReschedule(`${rescheduleUid}`);
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
      user: usernames.join("+"),
      slug,
      away: false,
      trpcState: ssr.dehydrate(),
      isBrandingHidden: false,
      isSEOIndexable: true,
      themeBasis: null,
      bookingUid: bookingUid ? `${bookingUid}` : null,
      rescheduleUid: rescheduleUid ? `${rescheduleUid}` : null,
    },
  };
}

async function getUserPageProps(context: GetServerSidePropsContext) {
  const { user: usernames, type: slug } = paramsSchema.parse(context.params);
  const username = usernames[0];
  const { rescheduleUid, bookingUid, duration: queryDuration } = context.query;
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(
    context.req.headers.host ?? "",
    context.params?.orgSlug
  );

  const { ssrInit } = await import("@server/lib/ssr");
  const ssr = await ssrInit(context);
  const user = await prisma.user.findFirst({
    where: {
      username,
      organization: isValidOrgDomain && currentOrgDomain ? getSlugOrRequestedSlug(currentOrgDomain) : null,
    },
    select: {
      away: true,
      hideBranding: true,
      allowSEOIndexing: true,
    },
  });

  if (!user) {
    return {
      notFound: true,
    };
  }

  let booking: GetBookingType | null = null;
  if (rescheduleUid) {
    booking = await getBookingForReschedule(`${rescheduleUid}`);
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
    return {
      notFound: true,
    };
  }

  return {
    props: {
      booking,
      duration: getMultipleDurationValue(
        eventData.metadata?.multipleDuration,
        queryDuration,
        eventData.length
      ),
      away: user?.away,
      user: username,
      slug,
      entity: eventData.entity,
      trpcState: ssr.dehydrate(),
      isBrandingHidden: user?.hideBranding,
      isSEOIndexable: user?.allowSEOIndexing,
      themeBasis: username,
      bookingUid: bookingUid ? `${bookingUid}` : null,
      rescheduleUid: rescheduleUid ? `${rescheduleUid}` : null,
    },
  };
}

const paramsSchema = z.object({
  type: z.string().transform((s) => slugify(s)),
  user: z.string().transform((s) => getUsernameList(s)),
});

// Booker page fetches a tiny bit of data server side, to determine early
// whether the page should show an away state or dynamic booking not allowed.
export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { user } = paramsSchema.parse(context.params);
  const isDynamicGroup = user.length > 1;

  return isDynamicGroup ? await getDynamicGroupPageProps(context) : await getUserPageProps(context);
};
