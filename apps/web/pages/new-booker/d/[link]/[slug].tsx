import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { Booker } from "@calcom/atoms";
import { BookerSeo } from "@calcom/features/bookings/components/BookerSeo";
import { getBookingByUidOrRescheduleUid } from "@calcom/features/bookings/lib/get-booking";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import prisma from "@calcom/prisma";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

import PageWrapper from "@components/PageWrapper";

type PageProps = inferSSRProps<typeof getServerSideProps>;

export default function Type({ slug, user, booking, away, isBrandingHidden }: PageProps) {
  return (
    <main className="flex h-full min-h-[100dvh] items-center justify-center">
      <BookerSeo
        username={user}
        eventSlug={slug}
        rescheduleUid={booking?.uid}
        hideBranding={isBrandingHidden}
      />
      <Booker
        username={user}
        eventSlug={slug}
        rescheduleBooking={booking}
        isAway={away}
        hideBranding={isBrandingHidden}
      />
    </main>
  );
}

Type.PageWrapper = PageWrapper;

async function getUserPageProps(context: GetServerSidePropsContext) {
  const { link, slug } = paramsSchema.parse(context.params);
  const { rescheduleUid } = context.query;

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

  const user = await prisma.user.findUnique({
    where: {
      username,
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
    booking = await getBookingByUidOrRescheduleUid(`${rescheduleUid}`);
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
    },
  };
}

const paramsSchema = z.object({ link: z.string(), slug: z.string() });

// Booker page fetches a tiny bit of data server side, to determine early
// whether the page should show an away state or dynamic booking not allowed.
export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  return await getUserPageProps(context);
};
