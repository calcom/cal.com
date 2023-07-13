import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { Booker } from "@calcom/atoms";
import { BookerSeo } from "@calcom/features/bookings/components/BookerSeo";
import { getBookingForReschedule } from "@calcom/features/bookings/lib/get-booking";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import { classNames } from "@calcom/lib";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

import PageWrapper from "@components/PageWrapper";

export type PageProps = inferSSRProps<typeof getServerSideProps>;

export default function Type({ slug, user, booking, away, isBrandingHidden }: PageProps) {
  const isEmbed = typeof window !== "undefined" && window?.isEmbed?.();
  return (
    <main className={classNames("flex h-full items-center justify-center", !isEmbed && "min-h-[100dvh]")}>
      <BookerSeo
        username={user}
        eventSlug={slug}
        rescheduleUid={booking?.uid}
        hideBranding={isBrandingHidden}
        isTeamEvent
      />
      <Booker
        username={user}
        eventSlug={slug}
        bookingData={booking}
        isAway={away}
        hideBranding={isBrandingHidden}
        isTeamEvent
      />
    </main>
  );
}

Type.PageWrapper = PageWrapper;

const paramsSchema = z.object({
  type: z.string().transform((s) => slugify(s)),
  slug: z.string().transform((s) => slugify(s)),
});

// Booker page fetches a tiny bit of data server side:
// 1. Check if team exists, to show 404
// 2. If rescheduling, get the booking details
export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { slug: teamSlug, type: meetingSlug } = paramsSchema.parse(context.params);
  const { rescheduleUid } = context.query;
  const { ssrInit } = await import("@server/lib/ssr");
  const ssr = await ssrInit(context);

  const team = await prisma.team.findFirst({
    where: {
      slug: teamSlug,
    },
    select: {
      id: true,
      hideBranding: true,
    },
  });

  if (!team) {
    return {
      notFound: true,
    };
  }

  let booking: GetBookingType | null = null;
  if (rescheduleUid) {
    booking = await getBookingForReschedule(`${rescheduleUid}`);
  }

  // We use this to both prefetch the query on the server,
  // as well as to check if the event exist, so we c an show a 404 otherwise.
  const eventData = await ssr.viewer.public.event.fetch({
    username: teamSlug,
    eventSlug: meetingSlug,
    isTeamEvent: true,
  });

  if (!eventData) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      booking,
      away: false,
      user: teamSlug,
      teamId: team.id,
      slug: meetingSlug,
      trpcState: ssr.dehydrate(),
      isBrandingHidden: team?.hideBranding,
      themeBasis: null,
    },
  };
};
