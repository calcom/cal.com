import type { DestinationCalendar } from "@prisma/client";

import { DailyLocationType } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
import tasker from "@calcom/features/tasker";
import { triggerHostNoShow } from "@calcom/features/tasker/tasks/triggerNoShow/triggerHostNoShow";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

type ScheduleNoShowTriggersArgs = {
  booking: {
    startTime: Date;
    id: number;
    location: string | null;
  };
  triggerForUser?: number | true | null;
  organizerUser: { id: number | null };
  eventTypeId: number | null;
  teamId?: number | null;
  orgId?: number | null;
  destinationCalendars?: DestinationCalendar[];
};

export const scheduleNoShowTriggers = async (args: ScheduleNoShowTriggersArgs) => {
  const { booking, triggerForUser, organizerUser, eventTypeId, teamId, orgId, destinationCalendars } = args;

  const isDailyVideoLocation = booking.location === DailyLocationType || booking.location?.trim() === "";

  const isGoogleMeetLocation = booking.location === "integrations:google:meet";
  const noShowPromises: Promise<any>[] = [];

  console.log("destinationCalendar.scheduleNoShowTriggers", args, isGoogleMeetLocation, destinationCalendars);

  if (isDailyVideoLocation) {
    // Add task for automatic no show in cal video

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
          const scheduledAt = dayjs(booking.startTime)
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
            { scheduledAt }
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
          const scheduledAt = dayjs(booking.startTime)
            .add(webhook.time, webhook.timeUnit.toLowerCase() as dayjs.ManipulateType)
            .toDate();

          return tasker.create(
            "triggerGuestNoShowWebhook",
            {
              triggerEvent: WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
              bookingId: booking.id,
              // Prevents null values from being serialized
              webhook: { ...webhook, time: webhook.time, timeUnit: webhook.timeUnit },
            },
            { scheduledAt }
          );
        }

        return Promise.resolve();
      })
    );
  } else if (isGoogleMeetLocation) {
    // Add task for automatic no show in google meet

    const destinationCalendar = destinationCalendars?.find((cal) => cal.userId === organizerUser.id);

    const subscribersHostsNoShowStartedPromises = await getWebhooks({
      userId: triggerForUser ? organizerUser.id : null,
      eventTypeId,
      triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_GOOGLE_MEET_NO_SHOW,
      teamId,
      orgId,
    });

    const subscribersGuestsNoShowStartedPromises = await getWebhooks({
      userId: triggerForUser ? organizerUser.id : null,
      eventTypeId,
      triggerEvent: WebhookTriggerEvents.AFTER_GUESTS_GOOGLE_MEET_NO_SHOW,
      teamId,
      orgId,
    });

    const [subscribersHostsNoShowStarted, subscribersGuestsNoShowStarted] = await Promise.all([
      subscribersHostsNoShowStartedPromises,
      subscribersGuestsNoShowStartedPromises,
    ]);

    await triggerHostNoShow(
      JSON.stringify({
        triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_GOOGLE_MEET_NO_SHOW,
        bookingId: booking.id,
        webhook: {
          ...subscribersHostsNoShowStarted[0],
          time: subscribersHostsNoShowStarted[0].time,
          timeUnit: subscribersHostsNoShowStarted[0].timeUnit,
        },
        destinationCalendar,
      })
    );

    noShowPromises.push(
      ...subscribersHostsNoShowStarted.map((webhook) => {
        if (booking?.startTime && webhook.time && webhook.timeUnit) {
          const scheduledAt = dayjs(booking.startTime)
            .add(webhook.time, webhook.timeUnit.toLowerCase() as dayjs.ManipulateType)
            .toDate();
          return tasker.create(
            "triggerHostNoShowWebhook",
            {
              triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_GOOGLE_MEET_NO_SHOW,
              bookingId: booking.id,
              // Prevents null values from being serialized
              webhook: { ...webhook, time: webhook.time, timeUnit: webhook.timeUnit },
              destinationCalendar,
            },
            { scheduledAt }
          );
        }
        return Promise.resolve();
      })
    );

    noShowPromises.push(
      ...subscribersGuestsNoShowStarted.map((webhook) => {
        if (booking?.startTime && webhook.time && webhook.timeUnit) {
          const scheduledAt = dayjs(booking.startTime)
            .add(webhook.time, webhook.timeUnit.toLowerCase() as dayjs.ManipulateType)
            .toDate();

          return tasker.create(
            "triggerGuestNoShowWebhook",
            {
              triggerEvent: WebhookTriggerEvents.AFTER_GUESTS_GOOGLE_MEET_NO_SHOW,
              bookingId: booking.id,
              // Prevents null values from being serialized
              webhook: { ...webhook, time: webhook.time, timeUnit: webhook.timeUnit },
              destinationCalendar,
            },
            { scheduledAt }
          );
        }

        return Promise.resolve();
      })
    );
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
