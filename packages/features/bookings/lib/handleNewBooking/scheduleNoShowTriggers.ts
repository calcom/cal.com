import { DailyLocationType } from "@calcom/app-store/constants";
import dayjs from "@calcom/dayjs";
import type { CalVideoSettings } from "@calcom/features/eventtypes/lib/types";
import tasker from "@calcom/features/tasker";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { withReporting } from "@calcom/lib/sentryWrapper";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

type ScheduleNoShowTriggersArgs = {
  booking: {
    startTime: Date;
    id: number;
    location: string | null;
    uid: string;
  };
  triggerForUser?: number | true | null;
  organizerUser: { id: number | null };
  eventTypeId: number | null;
  teamId?: number | null;
  orgId?: number | null;
  oAuthClientId?: string | null;
  isDryRun?: boolean;
  calVideoSettings?: CalVideoSettings | null;
};

const _scheduleNoShowTriggers = async (args: ScheduleNoShowTriggersArgs) => {
  const {
    booking,
    triggerForUser,
    organizerUser,
    eventTypeId,
    teamId,
    orgId,
    oAuthClientId,
    isDryRun = false,
    calVideoSettings,
  } = args;

  const isCalVideoLocation = booking.location === DailyLocationType || booking.location?.trim() === "";

  if (isDryRun || !isCalVideoLocation) return;

  // Add task for automatic no show in cal video
  const noShowPromises: Promise<any>[] = [];

  const subscribersHostsNoShowStarted = await getWebhooks({
    userId: triggerForUser ? organizerUser.id : null,
    eventTypeId,
    triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
    teamId,
    orgId,
    oAuthClientId,
  });

  const shouldTrackHostNoShow =
    subscribersHostsNoShowStarted.length > 0 || calVideoSettings?.enableAutomaticNoShowTrackingForHosts;

  if (shouldTrackHostNoShow) {
    if (subscribersHostsNoShowStarted.length > 0) {
      noShowPromises.push(
        ...subscribersHostsNoShowStarted.map((webhook) => {
          if (booking?.startTime && webhook.time && webhook.timeUnit) {
            const scheduledAt = dayjs(booking.startTime)
              .add(webhook.time, webhook.timeUnit.toLowerCase() as dayjs.ManipulateType)
              .toDate();
            return tasker.create(
              "triggerHostNoShowWebhook",
              {
                triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
                bookingId: booking.id,
                webhook: { ...webhook, time: webhook.time, timeUnit: webhook.timeUnit },
              },
              { scheduledAt, referenceUid: booking.uid }
            );
          }
          return Promise.resolve();
        })
      );
    } else {
      // No webhooks exist, but automatic tracking is enabled - schedule default 15-minute trigger
      const scheduledAt = dayjs(booking.startTime).add(15, "minutes").toDate();
      noShowPromises.push(
        tasker.create(
          "triggerHostNoShowWebhook",
          {
            triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
            bookingId: booking.id,
            webhook: {
              id: "",
              subscriberUrl: "",
              payloadTemplate: null,
              eventTriggers: [],
              appId: null,
              secret: null,
              time: 15,
              timeUnit: "MINUTE",
            },
          },
          { scheduledAt, referenceUid: booking.uid }
        )
      );
    }
  }

  const subscribersGuestsNoShowStarted = await getWebhooks({
    userId: triggerForUser ? organizerUser.id : null,
    eventTypeId,
    triggerEvent: WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
    teamId,
    orgId,
    oAuthClientId,
  });

  const shouldTrackGuestNoShow =
    subscribersGuestsNoShowStarted.length > 0 || calVideoSettings?.enableAutomaticNoShowTrackingForGuests;

  if (shouldTrackGuestNoShow) {
    if (subscribersGuestsNoShowStarted.length > 0) {
      noShowPromises.push(
        ...subscribersGuestsNoShowStarted.map((webhook) => {
          if (booking?.startTime && webhook.time && webhook.timeUnit) {
            const scheduledAt = dayjs(booking.startTime)
              .add(webhook.time, webhook.timeUnit.toLowerCase() as dayjs.ManipulateType)
              .toDate();

            return tasker.create(
              "triggerGuestNoShowWebhook",
              {
                triggerEvent: WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
                bookingId: booking.id,
                webhook: { ...webhook, time: webhook.time, timeUnit: webhook.timeUnit },
              },
              { scheduledAt, referenceUid: booking.uid }
            );
          }

          return Promise.resolve();
        })
      );
    } else {
      // No webhooks exist, but automatic tracking is enabled - schedule default 15-minute trigger
      const scheduledAt = dayjs(booking.startTime).add(15, "minutes").toDate();
      noShowPromises.push(
        tasker.create(
          "triggerGuestNoShowWebhook",
          {
            triggerEvent: WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
            bookingId: booking.id,
            webhook: {
              id: "",
              subscriberUrl: "",
              payloadTemplate: null,
              eventTriggers: [],
              appId: null,
              secret: null,
              time: 15,
              timeUnit: "MINUTE",
            },
          },
          { scheduledAt, referenceUid: booking.uid }
        )
      );
    }
  }

  await Promise.all(noShowPromises);

  // TODO: Support no show workflows
  // const workflowHostsNoShow = workflows.filter(
  //   (workflow) => workflow.trigger === WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW
  // );
  // const workflowGuestsNoShow = workflows.filter(
  //   (workflow) => workflow.trigger === WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW
  // );
};

export const scheduleNoShowTriggers = withReporting(_scheduleNoShowTriggers, "scheduleNoShowTriggers");
