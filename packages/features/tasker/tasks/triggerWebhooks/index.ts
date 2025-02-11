import { handleWebhookTrigger } from "bookings/lib/handleWebhookTrigger";

import monitorCallbackAsync from "@calcom/core/sentryWrapper";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import type { GetSubscriberOptions } from "@calcom/features/webhooks/lib/getWebhooks";
import { scheduleTrigger } from "@calcom/features/webhooks/lib/scheduleTrigger";
import logger from "@calcom/lib/logger";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";
import { WebhookTriggerEvents, BookingStatus } from "@calcom/prisma/enums";

import { ZTriggerWebhooksPayloadSchema } from "./schema";

const log = logger.getSubLogger({ prefix: ["trigger-webhooks"] });

const getBooking = async (bookingId: number) => {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    select: { ...bookingMinimalSelect, status: true },
  });
  return booking;
};

export const triggerWebhooks = async (payload: string) => {
  const { userId, eventTypeId, triggerEvent, isConfirmedByDefault, teamId, orgId, oAuthClientId, bookingId } =
    ZTriggerWebhooksPayloadSchema.parse(payload);

  const booking = await getBooking(bookingId);

  // TODO: tough to generate webhookData
  const webhookData = {};

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
