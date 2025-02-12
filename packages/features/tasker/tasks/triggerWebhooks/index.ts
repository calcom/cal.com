import { handleWebhookTrigger } from "bookings/lib/handleWebhookTrigger";

import monitorCallbackAsync from "@calcom/core/sentryWrapper";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import type { GetSubscriberOptions } from "@calcom/features/webhooks/lib/getWebhooks";
import { scheduleTrigger } from "@calcom/features/webhooks/lib/scheduleTrigger";
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

const generateWebhookData = async (bookingId: number) => {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    select: {
      ...bookingMinimalSelect,
      eventType: {
        select: {
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

  const evt: CalendarEvent = {
    type: booking?.eventType?.slug,
    title: booking.title,
    description: booking.description,
    customInputs: isPrismaObjOrUndefined(booking.customInputs),
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    organizer: {
      email: booking.userPrimaryEmail ?? booking.user?.email,
      name: booking.user?.name || "Unnamed",
      username: booking.user?.username || undefined,
      timeZone: booking.user?.timeZone,
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
  };

  return {
    booking,
  };
};

export const triggerWebhooks = async (payload: string) => {
  const { userId, eventTypeId, triggerEvent, isConfirmedByDefault, teamId, orgId, oAuthClientId, bookingId } =
    ZTriggerWebhooksPayloadSchema.parse(payload);

  const booking = await getBooking(bookingId);

  // TODO: tough to generate webhookData
  const webhookData = generateWebhookData(bookingId);

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
