import type { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import { useEffect } from "react";
import type { UrlObject } from "url";

import prisma, { bookingMinimalSelect } from "@calcom/prisma";

import { asStringOrUndefined } from "@lib/asStringOrNull";

export default function Type(props: { destination: string | UrlObject }) {
  const router = useRouter();

  // Redirect here due to iframe issues
  useEffect(() => {
    if (router.isReady) {
      router.replace(props.destination);
    }
  }, []);

  // Just redirect to the schedule page to reschedule it.
  return null;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const booking = await prisma.booking.findUnique({
    where: {
      uid: asStringOrUndefined(context.query.uid),
    },
    select: {
      ...bookingMinimalSelect,
      eventType: {
        select: {
          users: {
            select: {
              username: true,
            },
          },
          slug: true,
          team: {
            select: {
              slug: true,
            },
          },
        },
      },
      dynamicEventSlugRef: true,
      dynamicGroupSlugRef: true,
      user: true,
    },
  });

  if (!booking) {
    return {
      notFound: true,
    } as {
      notFound: true;
    };
  }

  if (!booking?.eventType && !booking?.dynamicEventSlugRef) {
    // TODO: Show something in UI to let user know that this booking is not rescheduleable.
    return {
      notFound: true,
    } as {
      notFound: true;
    };
  }

  return {
    props: {
      destination: `/booking/${context.query.uid}?cancel=true&allRemainingBookings=true`,
    },
  };
}
