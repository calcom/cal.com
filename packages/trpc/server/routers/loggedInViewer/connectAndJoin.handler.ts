import { sendScheduledEmailsAndSMS } from "@calcom/emails/email-manager";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { scheduleNoShowTriggers } from "@calcom/features/bookings/lib/handleNewBooking/scheduleNoShowTriggers";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { bookingMetadataSchema, EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { TRPCError } from "@trpc/server";

import type { TConnectAndJoinInputSchema } from "./connectAndJoin.schema";

type Options = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TConnectAndJoinInputSchema;
};

export const Handler = async ({ ctx, input }: Options) => {
  const { token } = input;
  const { user } = ctx;
  const isLoggedInUserPartOfOrg = !!user.organization.id;

  if (!isLoggedInUserPartOfOrg) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Logged in user is not member of Organization" });
  }

  const tOrganizer = await getTranslation(user?.locale ?? "en", "common");

  const instantMeetingToken = await prisma.instantMeetingToken.findUnique({
    select: {
      expires: true,
      teamId: true,
      booking: {
        select: {
          id: true,
          status: true,
          user: {
            select: {
              id: true,
            },
          },
        },
      },
    },
    where: {
      token,
      team: {
        members: {
          some: {
            userId: user.id,
            accepted: true,
          },
        },
      },
    },
  });

  // Check if logged in user belong to current team
  if (!instantMeetingToken) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "token_not_found" });
  }

  if (!instantMeetingToken.booking?.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "token_invalid_expired" });
  }

  // Check if token has not expired
  if (instantMeetingToken.expires < new Date()) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "token_invalid_expired" });
  }

  // Check if Booking is already accepted by any other user
  let isBookingAlreadyAcceptedBySomeoneElse = false;
  if (
    instantMeetingToken.booking.status === BookingStatus.ACCEPTED &&
    instantMeetingToken.booking?.user?.id !== user.id
  ) {
    isBookingAlreadyAcceptedBySomeoneElse = true;
  }

  // Update User in Booking
  const updatedBooking = await prisma.booking.update({
    where: {
      id: instantMeetingToken.booking.id,
    },
    data: {
      ...(isBookingAlreadyAcceptedBySomeoneElse
        ? { status: BookingStatus.ACCEPTED }
        : {
            status: BookingStatus.ACCEPTED,
            user: {
              connect: {
                id: user.id,
              },
            },
          }),
    },
    select: {
      title: true,
      description: true,
      customInputs: true,
      startTime: true,
      references: true,
      endTime: true,
      attendees: true,
      eventTypeId: true,
      responses: true,
      metadata: true,
      eventType: {
        select: {
          id: true,
          owner: true,
          teamId: true,
          title: true,
          slug: true,
          requiresConfirmation: true,
          currency: true,
          length: true,
          description: true,
          price: true,
          bookingFields: true,
          disableGuests: true,
          metadata: true,
          hideOrganizerEmail: true,
          customInputs: true,
          parentId: true,
          customReplyToEmail: true,
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      location: true,
      userId: true,
      id: true,
      uid: true,
      status: true,
    },
  });

  const locationVideoCallUrl = bookingMetadataSchema.parse(updatedBooking.metadata || {})?.videoCallUrl;

  if (!locationVideoCallUrl) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "meeting_url_not_found" });
  }

  const videoCallReference = updatedBooking.references.find((reference) => reference.type.includes("_video"));
  const videoCallData = {
    type: videoCallReference?.type,
    id: videoCallReference?.meetingId,
    password: videoCallReference?.meetingPassword,
    url: videoCallReference?.meetingUrl,
  };

  const { eventType } = updatedBooking;

  // Send Scheduled Email to Organizer and Attendees

  const translations = new Map();
  const attendeesListPromises = updatedBooking.attendees.map(async (attendee) => {
    const locale = attendee.locale ?? "en";
    let translate = translations.get(locale);
    if (!translate) {
      translate = await getTranslation(locale, "common");
      translations.set(locale, translate);
    }
    return {
      name: attendee.name,
      email: attendee.email,
      timeZone: attendee.timeZone,
      language: {
        translate,
        locale,
      },
    };
  });

  const attendeesList = await Promise.all(attendeesListPromises);

  const evt: CalendarEvent = {
    type: updatedBooking?.eventType?.slug as string,
    title: updatedBooking.title,
    description: updatedBooking.description,
    ...getCalEventResponses({
      bookingFields: eventType?.bookingFields ?? null,
      booking: updatedBooking,
    }),
    customInputs: isPrismaObjOrUndefined(updatedBooking.customInputs),
    startTime: updatedBooking.startTime.toISOString(),
    endTime: updatedBooking.endTime.toISOString(),
    organizer: {
      email: user.email,
      name: user.name || "Unnamed",
      username: user.username || undefined,
      timeZone: user.timeZone,
      timeFormat: getTimeFormatStringFromUserTimeFormat(user.timeFormat),
      language: { translate: tOrganizer, locale: user.locale ?? "en" },
    },
    hideOrganizerEmail: updatedBooking.eventType?.hideOrganizerEmail,
    attendees: attendeesList,
    location: updatedBooking.location ?? "",
    uid: updatedBooking.uid,
    requiresConfirmation: false,
    eventTypeId: eventType?.id,
    videoCallData,
    customReplyToEmail: eventType?.customReplyToEmail,
    organizationId: user?.organizationId ?? null,
    team: updatedBooking.eventType?.team
      ? {
          name: updatedBooking.eventType.team.name,
          id: updatedBooking.eventType.team.id,
          members: [],
        }
      : undefined,
  };

  const eventTypeMetadata = EventTypeMetaDataSchema.parse(updatedBooking?.eventType?.metadata);

  await sendScheduledEmailsAndSMS(
    {
      ...evt,
    },
    undefined,
    false,
    false,
    eventTypeMetadata
  );

  await scheduleNoShowTriggers({
    booking: {
      startTime: updatedBooking.startTime,
      id: updatedBooking.id,
      location: updatedBooking.location,
      uid: updatedBooking.uid,
    },
    triggerForUser: !eventType?.teamId || (eventType?.teamId && eventType?.parentId),
    organizerUser: { id: user.id },
    eventTypeId: eventType?.id ?? null,
    teamId: eventType?.teamId,
    orgId: user.organizationId,
  });

  return { isBookingAlreadyAcceptedBySomeoneElse, meetingUrl: locationVideoCallUrl };
};
