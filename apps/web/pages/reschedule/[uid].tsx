// page can be a server component
import type { GetServerSidePropsContext } from "next";
import { URLSearchParams } from "url";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { getDefaultEvent } from "@calcom/lib/defaultEvents";
import { getBookerBaseUrl } from "@calcom/lib/getBookerUrl/server";
import getOrganizationIdOfBooking from "@calcom/lib/getOrganizationIdOfBooking";
import { maybeGetBookingUidFromSeat } from "@calcom/lib/server/maybeGetBookingUidFromSeat";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/client";

export default function Type() {
  // Just redirect to the schedule page to reschedule it.
  return null;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context);

  const { uid: bookingUid, seatReferenceUid } = z
    .object({ uid: z.string(), seatReferenceUid: z.string().optional() })
    .parse(context.query);

  const { uid, seatReferenceUid: maybeSeatReferenceUid } = await maybeGetBookingUidFromSeat(
    prisma,
    bookingUid
  );
  const booking = await prisma.booking.findUnique({
    where: {
      uid,
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
              parentId: true,
            },
          },
          seatsPerTimeSlot: true,
          userId: true,
          owner: {
            select: {
              id: true,
            },
          },
          hosts: {
            select: {
              user: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      },
      dynamicEventSlugRef: true,
      dynamicGroupSlugRef: true,
      user: {
        include: {
          movedToProfile: {
            select: {
              username: true,
              organizationId: true,
            },
          },
        },
      },
      status: true,
    },
  });
  const dynamicEventSlugRef = booking?.dynamicEventSlugRef || "";

  if (!booking) {
    return {
      notFound: true,
    } as const;
  }

  // If booking is already CANCELLED or REJECTED, we can't reschedule this booking. Take the user to the booking page which would show it's correct status and other details.
  // A booking that has been rescheduled to a new booking will also have a status of CANCELLED
  if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.REJECTED) {
    return {
      redirect: {
        destination: `/booking/${uid}`,
        permanent: false,
      },
    };
  }

  if (!booking?.eventType && !booking?.dynamicEventSlugRef) {
    // TODO: Show something in UI to let user know that this booking is not rescheduleable
    return {
      notFound: true,
    } as {
      notFound: true;
    };
  }

  // if booking event type is for a seated event and no seat reference uid is provided, throw not found
  if (booking?.eventType?.seatsPerTimeSlot && !maybeSeatReferenceUid) {
    const userId = session?.user?.id;

    if (!userId && !seatReferenceUid) {
      return {
        redirect: {
          destination: `/auth/login?callbackUrl=/reschedule/${bookingUid}`,
          permanent: false,
        },
      };
    }
    const userIsHost = booking?.eventType.hosts.find((host) => {
      if (host.user.id === userId) return true;
    });

    const userIsOwnerOfEventType = booking?.eventType.owner?.id === userId;

    if (!userIsHost && !userIsOwnerOfEventType) {
      return {
        notFound: true,
      } as {
        notFound: true;
      };
    }
  }

  const eventType = booking.eventType ? booking.eventType : getDefaultEvent(dynamicEventSlugRef);

  const eventPage = `${
    eventType.team
      ? `team/${eventType.team.slug}`
      : dynamicEventSlugRef
      ? booking.dynamicGroupSlugRef
      : booking.user?.movedToProfile?.username || booking.user?.username || "rick" /* This shouldn't happen */
  }/${eventType?.slug}`;
  const destinationUrl = new URLSearchParams();

  destinationUrl.set("rescheduleUid", seatReferenceUid || bookingUid);

  const { isValidOrgDomain, currentOrgDomain } = orgDomainConfig(context.req);
  const isOrgContext = isValidOrgDomain && currentOrgDomain;

  let redirectDestinationUrl = `/${eventPage}?${destinationUrl.toString()}${
    eventType.seatsPerTimeSlot ? "&bookingUid=null" : ""
  }`;

  // redirecting to org domain if  the req is of non org domain but the booking is associated with team or user profile that belongs to org
  if ((eventType.team?.parentId || booking.user?.movedToProfile?.organizationId) && !isOrgContext) {
    const redirectBaseUrl = await getBookerBaseUrl(getOrganizationIdOfBooking(booking));
    redirectDestinationUrl = `${redirectBaseUrl}/${eventPage}?${destinationUrl.toString()}${
      eventType.seatsPerTimeSlot ? "&bookingUid=null" : ""
    }`;
  }

  return {
    redirect: {
      destination: redirectDestinationUrl,
      permanent: false,
    },
  };
}
