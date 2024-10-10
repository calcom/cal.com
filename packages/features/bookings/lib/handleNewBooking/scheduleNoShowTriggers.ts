import dayjs from "@calcom/dayjs";
import tasker from "@calcom/features/tasker";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import prisma from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

type ScheduleNoShowTriggersArgs = {
  booking: {
    startTime: Date;
    id: number;
  };
  triggerForUser: number | true | null;
  organizerUser: { id: number };
  eventTypeId: number;
  teamId?: number | null;
  orgId?: number | null;
};

/**
 * Explain this function:
 * 1. Get all webhooks that have AFTER_HOSTS_CAL_VIDEO_NO_SHOW or AFTER_GUESTS_CAL_VIDEO_NO_SHOW trigger
 * 2. For each webhook, create a webhookScheduledTriggers with the payload and startAfter
 */
export const scheduleNoShowTriggers = async (args: ScheduleNoShowTriggersArgs) => {
  const { booking, triggerForUser, organizerUser, eventTypeId, teamId, orgId } = args;
  // Add task for automatic no show in cal video
  const noShowPromises: Promise<any>[] = [];

  const subscribersHostsNoShowStarted = await getWebhooks({
    userId: triggerForUser ? organizerUser.id : null,
    eventTypeId,
    triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
    teamId,
    orgId,
  });

  noShowPromises.push(
    ...subscribersHostsNoShowStarted.map((webhook) => {
      if (booking?.startTime && webhook.time && webhook.timeUnit) {
        const startAfter = dayjs(booking.startTime)
          .add(webhook.time, webhook.timeUnit.toLowerCase() as dayjs.ManipulateType)
          .toDate();
        return tasker.create(
          "triggerHostNoShowWebhook",
          {
            triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
            bookingId: booking.id,
            // Prevents null values from being serialized
            webhook: { ...webhook, time: webhook.time, timeUnit: webhook.timeUnit },
          },
          { scheduledAt: startAfter }
        );
      }
      return Promise.resolve();
    })
  );

  const subscribersGuestsNoShowStarted = await getWebhooks({
    userId: triggerForUser ? organizerUser.id : null,
    eventTypeId,
    triggerEvent: WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
    teamId,
    orgId,
  });

  noShowPromises.push(
    ...subscribersGuestsNoShowStarted.map((webhook) => {
      if (booking?.startTime && webhook.time && webhook.timeUnit) {
        const startAfter = dayjs(booking.startTime)
          .add(webhook.time, webhook.timeUnit.toLowerCase() as dayjs.ManipulateType)
          .toDate();

        const payload = JSON.stringify({
          triggerEvent: WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
          bookingId: booking.id,
          webhook,
        });

        return tasker.create("triggerGuestNoShowWebhook", payload, { scheduledAt: startAfter });

        return tasker.create(
          "triggerGuestNoShowWebhook",
          {
            triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
            bookingId: booking.id,
            // Prevents null values from being serialized
            webhook: { ...webhook, time: webhook.time, timeUnit: webhook.timeUnit },
          },
          { scheduledAt: startAfter }
        );
        return createWebhookScheduleTrigger({ payload, startAfter, webhook, bookingId: booking.id });
      }

      return Promise.resolve();
    })
  );

  await Promise.all(noShowPromises);

  // TODO: Support no show workflows
  // const workflowHostsNoShow = workflows.filter(
  //   (workflow) => workflow.trigger === WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW
  // );
  // const workflowGuestsNoShow = workflows.filter(
  //   (workflow) => workflow.trigger === WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW
  // );
};

const createWebhookScheduleTrigger = async ({
  payload,
  startAfter,
  webhook,
  bookingId,
}: {
  payload: string;
  startAfter: Date;
  webhook: Awaited<ReturnType<typeof getWebhooks>>[number];
  bookingId: number;
}) => {
  return prisma.webhookScheduledTriggers.create({
    data: {
      payload,
      appId: webhook.appId,
      startAfter,
      subscriberUrl: webhook.subscriberUrl,
      webhook: {
        connect: {
          id: webhook.id,
        },
      },
      booking: {
        connect: {
          id: bookingId,
        },
      },
    },
  });
};
