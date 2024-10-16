import dayjs from "@calcom/dayjs";
import tasker from "@calcom/features/tasker";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

export const scheduleCalVideoNoShowWebhookTasks = async ({
  bookingStartTime,
  bookingId,
  eventTypeId,
  userId,
  teamId,
  orgId,
}: {
  bookingStartTime: Date;
  bookingId: number;
  eventTypeId: number;
  userId: number | null;
  teamId?: number | null;
  orgId?: number | null;
}) => {
  const scheduleTriggerPromises: Promise<unknown>[] = [];

  const subscribersHostsNoShowStarted = await getWebhooks({
    userId,
    eventTypeId,
    triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
    teamId,
    orgId,
  });

  const subscribersGuestsNoShowStarted = await getWebhooks({
    userId,
    eventTypeId,
    triggerEvent: WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
    teamId,
    orgId,
  });

  scheduleTriggerPromises.push(
    ...subscribersHostsNoShowStarted.map((webhook) => {
      if (bookingStartTime && webhook.time && webhook.timeUnit) {
        const scheduledAt = dayjs(bookingStartTime)
          .add(webhook.time, webhook.timeUnit.toLowerCase() as dayjs.ManipulateType)
          .toDate();
        return tasker.create(
          "triggerHostNoShowWebhook",
          {
            triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
            bookingId,
            // Prevents null values from being serialized
            webhook: { ...webhook, time: webhook.time, timeUnit: webhook.timeUnit },
          },
          { scheduledAt }
        );
      }
      return Promise.resolve();
    })
  );

  scheduleTriggerPromises.push(
    ...subscribersGuestsNoShowStarted.map((webhook) => {
      if (bookingStartTime && webhook.time && webhook.timeUnit) {
        const scheduledAt = dayjs(bookingStartTime)
          .add(webhook.time, webhook.timeUnit.toLowerCase() as dayjs.ManipulateType)
          .toDate();

        return tasker.create(
          "triggerGuestNoShowWebhook",
          {
            triggerEvent: WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
            bookingId,
            // Prevents null values from being serialized
            webhook: { ...webhook, time: webhook.time, timeUnit: webhook.timeUnit },
          },
          { scheduledAt }
        );
      }

      return Promise.resolve();
    })
  );

  return scheduleTriggerPromises;
};
