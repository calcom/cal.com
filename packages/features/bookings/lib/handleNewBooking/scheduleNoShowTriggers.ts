import type { DestinationCalendar } from "@prisma/client";

import { DailyLocationType } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
import tasker from "@calcom/features/tasker";
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
  destinationCalendars?: DestinationCalendar[] | null;
};

export const scheduleNoShowTriggers = async (args: ScheduleNoShowTriggersArgs) => {
  const { booking, triggerForUser, organizerUser, eventTypeId, teamId, orgId, destinationCalendars } = args;

  const isDailyVideoLocation = booking.location === DailyLocationType || booking.location?.trim() === "";
  const isGoogleMeetLocation = booking.location === "integrations:google:meet";

  if (!isGoogleMeetLocation && !isDailyVideoLocation) return;

  const noShowPromises: Promise<any>[] = [];

  const hostNoShowTriggerEvent = isDailyVideoLocation
    ? WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW
    : WebhookTriggerEvents.AFTER_HOSTS_GOOGLE_MEET_NO_SHOW;

  const guestNoShowTriggerEvent = isDailyVideoLocation
    ? WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW
    : WebhookTriggerEvents.AFTER_GUESTS_GOOGLE_MEET_NO_SHOW;

  const subscribersHostsNoShowStartedPromises = getWebhooks({
    userId: triggerForUser ? organizerUser.id : null,
    eventTypeId,
    triggerEvent: hostNoShowTriggerEvent,
    teamId,
    orgId,
  });
  const subscribersGuestsNoShowStartedPromises = getWebhooks({
    userId: triggerForUser ? organizerUser.id : null,
    eventTypeId,
    triggerEvent: guestNoShowTriggerEvent,
    teamId,
    orgId,
  });

  const [subscribersHostsNoShowStarted, subscribersGuestsNoShowStarted] = await Promise.all([
    subscribersHostsNoShowStartedPromises,
    subscribersGuestsNoShowStartedPromises,
  ]);

  // TODO: is this correct?
  const destinationCalendar = destinationCalendars?.find((cal) => cal.userId === organizerUser.id);

  noShowPromises.push(
    ...subscribersHostsNoShowStarted.map((webhook) => {
      if (booking?.startTime && webhook.time && webhook.timeUnit) {
        const scheduledAt = dayjs(booking.startTime)
          .add(webhook.time, webhook.timeUnit.toLowerCase() as dayjs.ManipulateType)
          .toDate();
        return tasker.create(
          "triggerHostNoShowWebhook",
          {
            triggerEvent: hostNoShowTriggerEvent,
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
            triggerEvent: guestNoShowTriggerEvent,
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

  await Promise.all(noShowPromises);

  // TODO: Support no show workflows
  // const workflowHostsNoShow = workflows.filter(
  //   (workflow) => workflow.trigger === WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW
  // );
  // const workflowGuestsNoShow = workflows.filter(
  //   (workflow) => workflow.trigger === WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW
  // );
};
