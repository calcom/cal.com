import type { GetServerSidePropsContext } from "next";
import { useSearchParams } from "next/navigation";
import { z } from "zod";

import { Booker } from "@calcom/atoms";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getBookerWrapperClasses } from "@calcom/features/bookings/Booker/utils/getBookerWrapperClasses";
import { BookerSeo } from "@calcom/features/bookings/components/BookerSeo";
import { getBookingForReschedule, getBookingForSeatedEvent } from "@calcom/features/bookings/lib/get-booking";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import { orgDomainConfig, userOrgQuery } from "@calcom/features/ee/organizations/lib/orgDomains";
import { getUsernameList } from "@calcom/lib/defaultEvents";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { RedirectType } from "@calcom/prisma/client";

import type { inferSSRProps } from "@lib/types/inferSSRProps";
import type { EmbedProps } from "@lib/withEmbedSsr";

import PageWrapper from "@components/PageWrapper";

import { getTemporaryOrgRedirect } from "../../lib/getTemporaryOrgRedirect";

export type PageProps = inferSSRProps<typeof getServerSideProps> & EmbedProps;

export const getMultipleDurationValue = (
  multipleDurationConfig: number[] | undefined,
  queryDuration: string | string[] | null | undefined,
  defaultValue: number
) => {
  if (!multipleDurationConfig) return null;
  if (multipleDurationConfig.includes(Number(queryDuration))) return Number(queryDuration);
  return defaultValue;
};

export default function Type({
  slug,
  user,
  isEmbed,
  booking,
  away,
  isBrandingHidden,
  isSEOIndexable,
  rescheduleUid,
  eventData,
}: PageProps) {
  const searchParams = useSearchParams();

  return (
    <main className={getBookerWrapperClasses({ isEmbed: !!isEmbed })}>
      <BookerSeo
        username={user}
        eventSlug={slug}
        rescheduleUid={rescheduleUid ?? undefined}
        hideBranding={isBrandingHidden}
        isSEOIndexable={isSEOIndexable ?? true}
        entity={eventData.entity}
        bookingData={booking}
      />
      <Booker
        username={user}
        eventSlug={slug}
        bookingData={booking}
        isAway={away}
        hideBranding={isBrandingHidden}
        entity={eventData.entity}
        durationConfig={eventData.metadata?.multipleDuration}
        /* TODO: Currently unused, evaluate it is needed-
         *       Possible alternative approach is to have onDurationChange.
         */
        duration={getMultipleDurationValue(
          eventData.metadata?.multipleDuration,
          searchParams?.get("duration"),
          eventData.length
        )}
      />
    </main>
  );
}

Type.isBookingPage = true;
Type.PageWrapper = PageWrapper;

async function getDynamicGroupPageProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context);
  const { user: usernames, type: slug } = paramsSchema.parse(context.params);
  const { rescheduleUid, bookingUid } = context.query;

  const { ssrInit } = await import("@server/lib/ssr");
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
    return {
      notFound: true,
    } as const;
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
    return {
      notFound: true,
    } as const;
  }

  return {
    props: {
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
  const session = await getServerSession(context);
  const { user: usernames, type: slug } = paramsSchema.parse(context.params);
  const username = usernames[0];
  const { rescheduleUid, bookingUid } = context.query;
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(context.req, context.params?.orgSlug);

  const isOrgContext = currentOrgDomain && isValidOrgDomain;

  if (!isOrgContext) {
    const redirect = await getTemporaryOrgRedirect({
      slug: usernames[0],
      redirectType: RedirectType.User,
      eventTypeSlug: slug,
      currentQuery: context.query,
    });

    if (redirect) {
      return redirect;
    }
  }

  const { ssrInit } = await import("@server/lib/ssr");
  const ssr = await ssrInit(context);
  const user = await prisma.user.findFirst({
    where: {
      username,
      organization: userOrgQuery(context.req.headers.host ?? "", context.params?.orgSlug),
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
    } as const;
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
    return {
      notFound: true,
    } as const;
  }

  return {
    props: {
      booking,
      eventData: {
        entity: eventData.entity,
        length: eventData.length,
        metadata: eventData.metadata,
      },
      away: user?.away,
      user: username,
      slug,
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
