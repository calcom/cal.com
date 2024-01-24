import { type GetServerSidePropsContext } from "next";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { handleTypeRedirection } from "@calcom/features/booking-redirect/handle-type";
import { getBookingForReschedule, getBookingForSeatedEvent } from "@calcom/features/bookings/lib/get-booking";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import { orgDomainConfig, userOrgQuery } from "@calcom/features/ee/organizations/lib/orgDomains";
import { getUsernameList } from "@calcom/lib/defaultEvents";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { RedirectType } from "@calcom/prisma/client";

import { getTemporaryOrgRedirect } from "@lib/getTemporaryOrgRedirect";

async function getDynamicGroupPageProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context);
  const { user: usernames, type: slug } = paramsSchema.parse(context.params);
  const { rescheduleUid, bookingUid } = context.query;

  const { ssrInit } = await import("@server/lib/ssr");
  const ssr = await ssrInit(context);
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(context.req, context.params?.orgSlug);
  const org = isValidOrgDomain ? currentOrgDomain : null;
  if (!org) {
    const redirect = await getTemporaryOrgRedirect({
      slugs: usernames,
      redirectType: RedirectType.User,
      eventTypeSlug: slug,
      currentQuery: context.query,
    });

    if (redirect) {
      return redirect;
    }
  }

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
  let outOfOffice = false;
  const isOrgContext = currentOrgDomain && isValidOrgDomain;
  if (!isOrgContext) {
    const redirect = await getTemporaryOrgRedirect({
      slugs: usernames,
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
      organization: userOrgQuery(context.req, context.params?.orgSlug),
    },
    select: {
      id: true,
      hideBranding: true,
      allowSEOIndexing: true,
    },
  });

  if (!user) {
    return {
      notFound: true,
    } as const;
  }
  // If user is found, quickly verify bookingRedirects
  const result = await handleTypeRedirection({
    userId: user.id,
    username,
    slug,
  });
  if (result && result.outOfOffice) {
    outOfOffice = true;
  }
  if (result && result.redirect?.destination) {
    return result;
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
      away: outOfOffice,
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
