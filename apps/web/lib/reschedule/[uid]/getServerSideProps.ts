// page can be a server component
import type { GetServerSidePropsContext } from "next";
import { URLSearchParams } from "url";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getFullName } from "@calcom/features/form-builder/utils";
import { buildEventUrlFromBooking } from "@calcom/lib/bookings/buildEventUrlFromBooking";
import { ENV_PAST_BOOKING_RESCHEDULE_CHANGE } from "@calcom/lib/constants";
import { getDefaultEvent } from "@calcom/lib/defaultEvents";
import { getSafe } from "@calcom/lib/getSafe";
import { maybeGetBookingUidFromSeat } from "@calcom/lib/server/maybeGetBookingUidFromSeat";
import { UserRepository } from "@calcom/lib/server/repository/user";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import type { JsonValue } from "@calcom/types/Json";

export type RescheduleValidationInput = {
  booking: {
    uid: string;
    status: BookingStatus;
    endTime: Date | null;
    responses?: JsonValue;
    eventType: {
      disableRescheduling?: boolean | null;
      allowReschedulingPastBookings?: boolean | null;
      allowReschedulingCancelledBookings?: boolean | null;
      teamId?: number | null;
    } | null;
    dynamicEventSlugRef?: string | null;
  };
  eventUrl: string;
  allowRescheduleForCancelledBooking?: boolean;
  bookingSeat?: {
    data: JsonValue;
    booking: {
      uid: string;
      id: number;
    };
  };
};

type RescheduleValidationResult =
  | {
      redirect: {
        destination: string;
        permanent: boolean;
      };
    }
  | {
      notFound: true;
    }
  | null;

/**
 * Parses the PAST_BOOKING_RESCHEDULE_NO_BOOKING_BEHAVIOUR environment variable and checks if the given team ID
 * should apply the redirect behavior for past bookings
 */
function isNewBehaviorForPastBookingRescheduleEnabledForTeam(teamId: number | null | undefined): boolean {
  if (!teamId) {
    return false;
  }

  if (!ENV_PAST_BOOKING_RESCHEDULE_CHANGE) {
    return false;
  }

  const configuredTeamIds = ENV_PAST_BOOKING_RESCHEDULE_CHANGE.split(",")
    .map((id) => id.trim())
    .filter((id) => id !== "")
    .map((id) => parseInt(id, 10))
    .filter((id) => !isNaN(id));

  return configuredTeamIds.includes(teamId);
}

/**
 * Determines the appropriate redirect for a reschedule request based on booking status and event type settings
 * Returns null if reschedule should proceed normally
 */
export function determineReschedulePreventionRedirect(
  input: RescheduleValidationInput
): RescheduleValidationResult {
  const { booking, eventUrl, allowRescheduleForCancelledBooking, bookingSeat } = input;

  const isDisabledRescheduling = booking.eventType?.disableRescheduling;
  if (isDisabledRescheduling) {
    return {
      redirect: {
        destination: `/booking/${booking.uid}`,
        permanent: false,
      },
    };
  }

  const isNonRescheduleableBooking =
    booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.REJECTED;
  const isForcedRescheduleForCancelledBooking = allowRescheduleForCancelledBooking;

  if (isNonRescheduleableBooking && !isForcedRescheduleForCancelledBooking) {
    const canBookThroughCancelledBookingRescheduleLink =
      booking.eventType?.allowReschedulingCancelledBookings;
    const allowedToBeBookedThroughCancelledBookingRescheduleLink =
      booking.status === BookingStatus.CANCELLED && canBookThroughCancelledBookingRescheduleLink;
    return {
      redirect: {
        destination: allowedToBeBookedThroughCancelledBookingRescheduleLink
          ? eventUrl
          : `/booking/${booking.uid}`,
        permanent: false,
      },
    };
  }

  if (!booking?.eventType && !booking?.dynamicEventSlugRef) {
    // TODO: Show something in UI to let user know that this booking is not rescheduleable
    return {
      notFound: true,
    };
  }

  const isBookingInPast = booking.endTime && new Date(booking.endTime) < new Date();
  if (isBookingInPast && !booking.eventType?.allowReschedulingPastBookings) {
    // Check if this team should apply the redirect behavior for past bookings
    const isNewPastBookingRescheduleBehaviour = isNewBehaviorForPastBookingRescheduleEnabledForTeam(
      booking.eventType?.teamId
    );

    if (isNewPastBookingRescheduleBehaviour) {
      return {
        redirect: {
          destination: `/booking/${booking.uid}`,
          permanent: false,
        },
      };
    }

    const destinationUrlSearchParams = new URLSearchParams();
    const responses = bookingSeat ? getSafe<string>(bookingSeat.data, ["responses"]) : booking.responses;
    const name = getFullName(getSafe<string | { firstName: string; lastName?: string }>(responses, ["name"]));
    const email = getSafe<string>(responses, ["email"]);

    if (name) destinationUrlSearchParams.set("name", name);
    if (email) destinationUrlSearchParams.set("email", email);

    const searchParamsString = destinationUrlSearchParams.toString();
    return {
      redirect: {
        destination: searchParamsString ? `${eventUrl}?${searchParamsString}` : eventUrl,
        permanent: false,
      },
    };
  }

  // Allow reschedule to proceed - default behaviour
  return null;
}

const querySchema = z.object({
  uid: z.string(),
  seatReferenceUid: z.string().optional(),
  rescheduledBy: z.string().optional(),
  allowRescheduleForCancelledBooking: z
    .string()
    .transform((value) => value === "true")
    .optional(),
});

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getServerSession({ req: context.req });

  const {
    uid: bookingUid,
    seatReferenceUid,
    rescheduledBy,
    /**
     * This is for the case of request-reschedule where the booking is cancelled
     */
    allowRescheduleForCancelledBooking,
  } = querySchema.parse(context.query);

  const coepFlag = context.query["flag.coep"];
  const {
    uid,
    seatReferenceUid: maybeSeatReferenceUid,
    bookingSeat: _bookingSeat,
  } = await maybeGetBookingUidFromSeat(prisma, bookingUid);

  const booking = await prisma.booking.findUnique({
    where: {
      uid,
    },
    select: {
      ...bookingMinimalSelect,
      responses: true,
      eventType: {
        select: {
          users: {
            select: {
              username: true,
            },
          },
          slug: true,
          allowReschedulingPastBookings: true,
          disableRescheduling: true,
          allowReschedulingCancelledBookings: true,
          team: {
            select: {
              id: true,
              parentId: true,
              slug: true,
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
      user: true,
      status: true,
    },
  });
  const dynamicEventSlugRef = booking?.dynamicEventSlugRef || "";

  if (!booking) {
    return {
      notFound: true,
    } as const;
  }

  const eventType = booking.eventType ? booking.eventType : getDefaultEvent(dynamicEventSlugRef);

  const userRepo = new UserRepository(prisma);
  const enrichedBookingUser = booking.user
    ? await userRepo.enrichUserWithItsProfile({ user: booking.user })
    : null;

  const eventUrl = await buildEventUrlFromBooking({
    eventType,
    dynamicGroupSlugRef: booking.dynamicGroupSlugRef ?? null,
    profileEnrichedBookingUser: enrichedBookingUser,
  });

  // Check if reschedule should be redirected based on booking status and event type settings
  const rescheduleRedirect = determineReschedulePreventionRedirect({
    booking: {
      uid,
      status: booking.status,
      endTime: booking.endTime,
      responses: booking.responses,
      eventType: booking.eventType
        ? {
            ...booking.eventType,
            teamId: booking.eventType.team?.id || null,
          }
        : null,
      dynamicEventSlugRef: booking.dynamicEventSlugRef,
    },
    eventUrl,
    allowRescheduleForCancelledBooking,
    bookingSeat: _bookingSeat,
  });

  if (rescheduleRedirect) {
    return rescheduleRedirect;
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

  const destinationUrlSearchParams = new URLSearchParams();

  destinationUrlSearchParams.set("rescheduleUid", seatReferenceUid || bookingUid);

  if (allowRescheduleForCancelledBooking) {
    destinationUrlSearchParams.set("allowRescheduleForCancelledBooking", "true");
  }

  // TODO: I think we should just forward all the query params here including coep flag
  if (coepFlag) {
    destinationUrlSearchParams.set("flag.coep", coepFlag as string);
  }

  const currentUserEmail = rescheduledBy ?? session?.user?.email;

  if (currentUserEmail) {
    destinationUrlSearchParams.set("rescheduledBy", currentUserEmail);
  }

  return {
    redirect: {
      destination: `${eventUrl}?${destinationUrlSearchParams.toString()}${
        eventType.seatsPerTimeSlot ? "&bookingUid=null" : ""
      }`,
      permanent: false,
    },
  };
}
