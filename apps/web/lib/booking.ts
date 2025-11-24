import { workflowSelect } from "@calid/features/modules/workflows/utils/getWorkflows";

import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import { bookingResponsesDbSchema } from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

export const getEventTypesFromDB = async (id: number) => {
  const userSelect = {
    id: true,
    name: true,
    username: true,
    hideBranding: true,
    theme: true,
    brandColor: true,
    darkBrandColor: true,
    email: true,
    timeZone: true,
    bannerUrl: true,
    faviconUrl: true,
  };
  const eventType = await prisma.eventType.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      interfaceLanguage: true,
      length: true,
      eventName: true,
      recurringEvent: true,
      requiresConfirmation: true,
      canSendCalVideoTranscriptionEmails: true,
      userId: true,
      successRedirectUrl: true,
      customInputs: true,
      locations: true,
      price: true,
      currency: true,
      bookingFields: true,
      allowReschedulingPastBookings: true,
      hideOrganizerEmail: true,
      disableCancelling: true,
      disableRescheduling: true,
      disableGuests: true,
      timeZone: true,
      profile: {
        select: {
          organizationId: true,
        },
      },
      teamId: true,
      owner: {
        select: userSelect,
      },
      users: {
        select: userSelect,
      },
      hosts: {
        select: {
          user: {
            select: userSelect,
          },
        },
      },
      team: {
        select: {
          id: true,
          slug: true,
          name: true,
          hideBranding: true,
          parent: {
            select: {
              hideBranding: true,
            },
          },
        },
      },
      calIdTeamId: true,
      calIdTeam: {
        select: {
          id: true,
          slug: true,
          name: true,
          hideTeamBranding: true,
          bannerUrl: true,
        },
      },
      calIdWorkflows: {
        select: {
          workflow: {
            select: workflowSelect,
          },
        },
      },
      metadata: true,
      seatsPerTimeSlot: true,
      seatsShowAttendees: true,
      seatsShowAvailabilityCount: true,
      schedulingType: true,
      periodStartDate: true,
      periodEndDate: true,
      parent: {
        select: {
          teamId: true,
          calIdTeamId: true,
        },
      },
    },
  });

  if (!eventType) {
    return eventType;
  }

  const metadata = EventTypeMetaDataSchema.parse(eventType.metadata);
  const { profile, ...restEventType } = eventType;
  const isOrgTeamEvent = !!eventType?.team && !!profile?.organizationId;

  return {
    isDynamic: false,
    ...restEventType,
    bookingFields: getBookingFieldsWithSystemFields({
      ...eventType,
      workflows: eventType.calIdWorkflows,
      isOrgTeamEvent,
    }),
    metadata,
  };
};

export const handleSeatsEventTypeOnBooking = async (
  eventType: {
    seatsPerTimeSlot?: number | null;
    seatsShowAttendees: boolean | null;
    seatsShowAvailabilityCount: boolean | null;
    [x: string | number | symbol]: unknown;
  },
  bookingInfo: Partial<
    Prisma.BookingGetPayload<{
      include: {
        attendees: { select: { name: true; email: true; phoneNumber: true } };
        seatsReferences: { select: { referenceUid: true } };
        user: {
          select: {
            id: true;
            name: true;
            email: true;
            username: true;
            timeZone: true;
          };
        };
      };
    }>
  >,
  seatReferenceUid?: string,
  isHost?: boolean
) => {
  bookingInfo["responses"] = {};
  type seatAttendee = {
    attendee: {
      email: string;
      name: string;
      phoneNumber: string | null;
    };
    id: number;
    data: Prisma.JsonValue;
    bookingId: number;
    attendeeId: number;
    referenceUid: string;
  } | null;
  let seatAttendee: seatAttendee = null;
  if (seatReferenceUid) {
    seatAttendee = await prisma.bookingSeat.findUnique({
      where: {
        referenceUid: seatReferenceUid,
      },
      include: {
        attendee: {
          select: {
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });
  }
  if (seatAttendee) {
    const seatAttendeeData = seatAttendee.data as unknown as {
      description?: string;
      responses: Prisma.JsonValue;
    };
    bookingInfo["description"] = seatAttendeeData.description ?? null;
    bookingInfo["responses"] = bookingResponsesDbSchema.parse(seatAttendeeData.responses ?? {});
  }

  if (!eventType.seatsShowAttendees && !isHost) {
    if (seatAttendee) {
      const attendee = bookingInfo?.attendees?.find((a) => {
        return (
          a.email === seatAttendee?.attendee?.email ||
          (a.phoneNumber && a.phoneNumber === seatAttendee?.attendee?.phoneNumber)
        );
      });
      bookingInfo["attendees"] = attendee ? [attendee] : [];
    } else {
      bookingInfo["attendees"] = [];
    }
  }

  return bookingInfo;
};
