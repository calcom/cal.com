import type { Logger } from "tslog";

import { handleWebhookTrigger } from "@calcom/features/bookings/lib/handleWebhookTrigger";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import type { GetSubscriberOptions } from "@calcom/features/webhooks/lib/getWebhooks";
import {
  deleteWebhookScheduledTriggers,
  scheduleTrigger,
} from "@calcom/features/webhooks/lib/scheduleTrigger";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { EventPayloadType } from "../../../webhooks/lib/sendPayload";
import type { BookingTypeWithAppsStatus, OriginalRescheduledBooking } from "./types";

type args = {
  rescheduleUid?: string;
  booking: BookingTypeWithAppsStatus;
  originalRescheduledBooking: OriginalRescheduledBooking | null;
  webhookData: EventPayloadType;
  loggerWithEventDetails: Logger<unknown>;
  isConfirmedByDefault: boolean;
  subscriberOptions: GetSubscriberOptions;
};

export const scheduleWebhookTriggerEvents = async ({
  subscriberOptions,
  loggerWithEventDetails,
  rescheduleUid,
  booking,
  originalRescheduledBooking,
  webhookData,
  isConfirmedByDefault,
}: args) => {
  if (isConfirmedByDefault) {
    const subscriberOptionsMeetingEnded = {
      userId: subscriberOptions.userId,
      eventTypeId: subscriberOptions.eventTypeId,
      triggerEvent: WebhookTriggerEvents.MEETING_ENDED,
      teamId: subscriberOptions.teamId,
      orgId: subscriberOptions.orgId,
    };

    const subscriberOptionsMeetingStarted = {
      userId: subscriberOptions.userId,
      eventTypeId: subscriberOptions.eventTypeId,
      triggerEvent: WebhookTriggerEvents.MEETING_STARTED,
      teamId: subscriberOptions.teamId,
      orgId: subscriberOptions.orgId,
    };

    const subscribersMeetingEnded = await getWebhooks(subscriberOptionsMeetingEnded);
    const subscribersMeetingStarted = await getWebhooks(subscriberOptionsMeetingStarted);

    let deleteWebhookScheduledTriggerPromise: Promise<unknown> = Promise.resolve();
    const scheduleTriggerPromises = [];

    if (rescheduleUid && originalRescheduledBooking) {
      //delete all scheduled triggers for meeting ended and meeting started of booking
      deleteWebhookScheduledTriggerPromise = deleteWebhookScheduledTriggers({
        booking: originalRescheduledBooking,
      });
    }

    if (booking && booking.status === BookingStatus.ACCEPTED) {
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
    }

    await Promise.all([deleteWebhookScheduledTriggerPromise, ...scheduleTriggerPromises]).catch((error) => {
      loggerWithEventDetails.error(
        "Error while scheduling or canceling webhook triggers",
        JSON.stringify({ error })
      );
    });

    // Send Webhook call if hooked to BOOKING_CREATED & BOOKING_RESCHEDULED
    await handleWebhookTrigger({
      subscriberOptions,
      eventTrigger: subscriberOptions.triggerEvent,
      webhookData,
    });
  } else {
    // if eventType requires confirmation we will trigger the BOOKING REQUESTED Webhook
    const eventTrigger: WebhookTriggerEvents = WebhookTriggerEvents.BOOKING_REQUESTED;
    subscriberOptions.triggerEvent = eventTrigger;
    webhookData.status = "PENDING";
    await handleWebhookTrigger({ subscriberOptions, eventTrigger, webhookData });
  }
};
