import dayjs from "@calcom/dayjs";
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

export const scheduleNoShowTriggers = async (args: ScheduleNoShowTriggersArgs) => {
  const { booking, triggerForUser, organizerUser, eventTypeId, teamId, orgId } = args;
  // Add task for automatic no show in cal video
  const noShowPromises: Promise<any>[] = [];

  const subscriberHostsNoShowStarted = {
    userId: triggerForUser ? organizerUser.id : null,
    eventTypeId,
    triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
    teamId,
    orgId,
  };

  const subscribersHostsNoShowStarted = await getWebhooks(subscriberHostsNoShowStarted);

  noShowPromises.push(
    ...subscribersHostsNoShowStarted.map((webhook) => {
      if (booking?.startTime && webhook.time && webhook.timeUnit) {
        const startAfter = dayjs(booking.startTime)
          .add(webhook.time, webhook.timeUnit.toLowerCase() as dayjs.ManipulateType)
          .toDate();

        const payload = JSON.stringify({
          triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
          bookingId: booking.id,
          webhook,
        });

        return createWebhookScheduleTrigger({ payload, startAfter, webhook, bookingId: booking.id });
      }
      return Promise.resolve();
    })
  );

  const subscriberGuestsNoShowStarted = {
    userId: triggerForUser ? organizerUser.id : null,
    eventTypeId,
    triggerEvent: WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
    teamId,
    orgId,
  };

  const subscribersGuestsNoShowStarted = await getWebhooks(subscriberGuestsNoShowStarted);

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
