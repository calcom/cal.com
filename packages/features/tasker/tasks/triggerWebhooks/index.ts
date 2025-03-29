import { handleWebhookTrigger } from "bookings/lib/handleWebhookTrigger";

import monitorCallbackAsync from "@calcom/core/sentryWrapper";
import dayjs from "@calcom/dayjs";
import { getOriginalRescheduledBooking } from "@calcom/features/bookings/lib/handleNewBooking/getOriginalRescheduledBooking";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import type { GetSubscriberOptions } from "@calcom/features/webhooks/lib/getWebhooks";
import { scheduleTrigger } from "@calcom/features/webhooks/lib/scheduleTrigger";
import type { EventPayloadType, EventTypeInfo } from "@calcom/features/webhooks/lib/sendPayload";
import { isPrismaObjOrUndefined } from "@calcom/lib";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";
import { WebhookTriggerEvents, BookingStatus } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { ZTriggerWebhooksPayloadSchema } from "./schema";

const log = logger.getSubLogger({ prefix: ["trigger-webhooks"] });

const getBooking = async (bookingId: number) => {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    select: { ...bookingMinimalSelect, status: true },
  });
  return booking;
};

const generateWebhookData = async (
  bookingId: number,
  isConfirmedByDefault: boolean
): Promise<EventPayloadType> => {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    select: {
      ...bookingMinimalSelect,
      eventType: {
        select: {
          seatsPerTimeSlot: true,
          seatsShowAttendees: true,
          seatsShowAvailabilityCount: true,
          schedulingType: true,
          currency: true,
          description: true,
          id: true,
          slug: true,
          length: true,
          price: true,
          requiresConfirmation: true,
          metadata: true,
          title: true,
          team: {
            select: {
              id: true,
              name: true,
              parentId: true,
            },
          },
          parentId: true,
          parent: {
            select: {
              teamId: true,
            },
          },
        },
      },
      responses: true,
      rescheduled: true,
      fromReschedule: true,
      metadata: true,
      smsReminderNumber: true,
      userId: true,
      location: true,
      payment: {
        select: {
          id: true,
          amount: true,
        },
      },
      user: {
        select: {
          username: true,
          email: true,
          name: true,
          timeZone: true,
          timeFormat: true,
          locale: true,
        },
      },
    },
  });

  const tOrganizer = await getTranslation(booking.user?.locale ?? "en", "common");

  const originalRescheduledBooking = booking.fromReschedule
    ? await getOriginalRescheduledBooking(booking.fromReschedule, !!booking.eventType?.seatsPerTimeSlot)
    : null;

  const evt: CalendarEvent = {
    type: booking?.eventType?.slug ?? "",
    title: booking.title,
    description: booking.description,
    customInputs: isPrismaObjOrUndefined(booking.customInputs),
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    organizer: {
      email: booking.userPrimaryEmail ?? booking.user?.email ?? "",
      name: booking.user?.name || "Unnamed",
      username: booking.user?.username || undefined,
      timeZone: booking.user?.timeZone ?? "Europe/London",
      timeFormat: getTimeFormatStringFromUserTimeFormat(booking.user?.timeFormat),
      language: { translate: tOrganizer, locale: booking.user?.locale ?? "en" },
    },
    eventTypeId: booking.eventType?.id,
    team: booking.eventType?.team
      ? {
          id: booking.eventType.team.id,
          name: booking.eventType.team.name,
          members: [],
        }
      : undefined,
    // responses: booking.responses || null,
    // attendees: attendeesList,
    // location: platformBookingLocation ?? bookingLocation, // Will be processed by the EventManager later.
    // conferenceCredentialId,
    // destinationCalendar,
    // hideCalendarNotes: booking.eventType.hideCalendarNotes,
    // hideCalendarEventDetails: booking.eventType.hideCalendarEventDetails,
    // requiresConfirmation: !isConfirmedByDefault,
    // eventTypeId: booking.eventType?.id,
    // // if seats are not enabled we should default true
    // seatsShowAttendees: booking.eventType?.seatsPerTimeSlot ? booking.eventType?.seatsShowAttendees : true,
    // seatsPerTimeSlot: booking.eventType?.seatsPerTimeSlot,
    // seatsShowAvailabilityCount: booking.eventType?.seatsPerTimeSlot
    //   ? booking.eventType?.seatsShowAvailabilityCount
    //   : true,
    // schedulingType: booking.eventType?.schedulingType,
    // iCalUID,
    // iCalSequence,
    // platformClientId,
    // platformRescheduleUrl,
    // platformCancelUrl,
    // platformBookingUrl,
    oneTimePassword: isConfirmedByDefault ? null : undefined,
  };

  const eventTypeInfo: EventTypeInfo = {
    eventTitle: booking.eventType?.title ?? "",
    eventDescription: booking.eventType?.description ?? "",
    // price: booking.payment?.price ?? 0,
    currency: booking.eventType?.currency ?? "USD",
    length: booking.eventType?.length ?? 0,
  };

  const webhookData: EventPayloadType = {
    ...evt,
    ...eventTypeInfo,
    bookingId: booking?.id,
    rescheduleId: originalRescheduledBooking?.id || undefined,
    rescheduleUid: booking.fromReschedule ?? undefined,
    rescheduleStartTime: originalRescheduledBooking?.startTime
      ? dayjs(originalRescheduledBooking?.startTime).utc().format()
      : undefined,
  };

  return webhookData;
};

export const triggerWebhooks = async (payload: string) => {
  const { userId, eventTypeId, triggerEvent, isConfirmedByDefault, teamId, orgId, oAuthClientId, bookingId } =
    ZTriggerWebhooksPayloadSchema.parse(payload);

  const booking = await getBooking(bookingId);

  const webhookData = generateWebhookData(bookingId, isConfirmedByDefault);

  if (isConfirmedByDefault) {
    if (booking && booking.status === BookingStatus.ACCEPTED) {
      const subscriberOptionsMeetingEnded: GetSubscriberOptions = {
        userId,
        eventTypeId,
        triggerEvent: WebhookTriggerEvents.MEETING_ENDED,
        teamId,
        orgId,
        oAuthClientId,
      };

      const subscriberOptionsMeetingStarted: GetSubscriberOptions = {
        userId,
        eventTypeId,
        triggerEvent: WebhookTriggerEvents.MEETING_STARTED,
        teamId,
        orgId,
        oAuthClientId,
      };

      const subscribersMeetingEnded = await monitorCallbackAsync(getWebhooks, subscriberOptionsMeetingEnded);
      const subscribersMeetingStarted = await monitorCallbackAsync(
        getWebhooks,
        subscriberOptionsMeetingStarted
      );

      const scheduleTriggerPromises = [];

      for (const subscriber of subscribersMeetingEnded) {
        scheduleTriggerPromises.push(
          scheduleTrigger({
            booking,
            subscriberUrl: subscriber.subscriberUrl,
            subscriber,
            triggerEvent: WebhookTriggerEvents.MEETING_ENDED,
          })
        );
      }

      for (const subscriber of subscribersMeetingStarted) {
        scheduleTriggerPromises.push(
          scheduleTrigger({
            booking,
            subscriberUrl: subscriber.subscriberUrl,
            subscriber,
            triggerEvent: WebhookTriggerEvents.MEETING_STARTED,
          })
        );
      }

      await Promise.all(scheduleTriggerPromises).catch((error) => {
        log.error("Error while scheduling webhook triggers", JSON.stringify({ error }));
      });
    }

    // Send Webhook call if hooked to BOOKING_CREATED & BOOKING_RESCHEDULED
    await monitorCallbackAsync(handleWebhookTrigger, {
      subscriberOptions: {
        userId,
        eventTypeId,
        triggerEvent,
        teamId,
        orgId,
        oAuthClientId,
      },
      eventTrigger: triggerEvent,
      webhookData,
    });
  } else {
    //

    webhookData.status = "PENDING";

    await monitorCallbackAsync(handleWebhookTrigger, {
      subscriberOptions: {
        userId,
        eventTypeId,
        triggerEvent,
        teamId,
        orgId,
        oAuthClientId,
      },
      eventTrigger: triggerEvent,
      webhookData,
    });
  }
};
