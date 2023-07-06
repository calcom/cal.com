import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { Booker } from "@calcom/atoms";
import { BookerSeo } from "@calcom/features/bookings/components/BookerSeo";
import { getBookingForReschedule, getBookingForSeatedEvent } from "@calcom/features/bookings/lib/get-booking";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { classNames } from "@calcom/lib";
import { getUsernameList } from "@calcom/lib/defaultEvents";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

import PageWrapper from "@components/PageWrapper";

export type PageProps = inferSSRProps<typeof getServerSideProps>;

export default function Type({ slug, user, booking, away, isBrandingHidden, rescheduleUid }: PageProps) {
  const isEmbed = typeof window !== "undefined" && window?.isEmbed?.();
  return (
    <main className={classNames("flex h-full items-center justify-center", !isEmbed && "min-h-[100dvh]")}>
      <BookerSeo
        username={user}
        eventSlug={slug}
        rescheduleUid={rescheduleUid ?? undefined}
        hideBranding={isBrandingHidden}
      />
      <Booker
        username={user}
        eventSlug={slug}
        bookingData={booking}
        isAway={away}
        hideBranding={isBrandingHidden}
      />
    </main>
  );
}

Type.PageWrapper = PageWrapper;

async function getDynamicGroupPageProps(context: GetServerSidePropsContext) {
  const { user: usernames, type: slug } = paramsSchema.parse(context.params);
  const { rescheduleUid, bookingUid } = context.query;

  const { ssrInit } = await import("@server/lib/ssr");
  const ssr = await ssrInit(context);

  const users = await prisma.user.findMany({
    where: {
      username: {
        in: usernames,
      },
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

  let booking: GetBookingType | null = null;
  if (rescheduleUid) {
    booking = await getBookingForReschedule(`${rescheduleUid}`);
  } else if (bookingUid) {
    booking = await getBookingForSeatedEvent(`${bookingUid}`);
  }

  // We use this to both prefetch the query on the server,
  // as well as to check if the event exist, so we c an show a 404 otherwise.
  const eventData = await ssr.viewer.public.event.fetch({ username: usernames.join("+"), eventSlug: slug });

  if (!eventData) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      booking,
      user: usernames.join("+"),
      slug,
      away: false,
      trpcState: ssr.dehydrate(),
      isBrandingHidden: false,
      themeBasis: null,
      bookingUid: bookingUid ? `${bookingUid}` : null,
      rescheduleUid: rescheduleUid ? `${rescheduleUid}` : null,
    },
  };
}

async function getUserPageProps(context: GetServerSidePropsContext) {
  const { user: usernames, type: slug } = paramsSchema.parse(context.params);
  const username = usernames[0];
  const { rescheduleUid, bookingUid } = context.query;
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(context.req.headers.host ?? "");

  const { ssrInit } = await import("@server/lib/ssr");
  const ssr = await ssrInit(context);
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
    booking = await getBookingForReschedule(`${rescheduleUid}`);
  } else if (bookingUid) {
    booking = await getBookingForSeatedEvent(`${bookingUid}`);
  }

  // We use this to both prefetch the query on the server,
  // as well as to check if the event exist, so we c an show a 404 otherwise.
  const eventData = await ssr.viewer.public.event.fetch({ username, eventSlug: slug });

  if (!eventData) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      booking,
      away: user?.away,
      user: username,
      slug,
      trpcState: ssr.dehydrate(),
      isBrandingHidden: user?.hideBranding,
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
