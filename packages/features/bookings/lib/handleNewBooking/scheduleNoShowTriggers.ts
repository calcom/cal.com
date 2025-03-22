import { DailyLocationType, MeetLocationType } from "@calcom/app-store/locations";
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
  oAuthClientId?: string | null;
  isDryRun?: boolean;
};

const getHostsTriggerEvent = (isCalVideoLocation: boolean, isGoogleMeetLocation: boolean) => {
  if (isCalVideoLocation) return WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW;
  else if (isGoogleMeetLocation) return WebhookTriggerEvents.AFTER_HOSTS_GOOGLE_MEET_NO_SHOW;
  else throw new Error("Invalid location");
};

const getGuestsTriggerEvent = (isCalVideoLocation: boolean, isGoogleMeetLocation: boolean) => {
  if (isCalVideoLocation) return WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW;
  else if (isGoogleMeetLocation) return WebhookTriggerEvents.AFTER_GUESTS_GOOGLE_MEET_NO_SHOW;
  else throw new Error("Invalid location");
};

export const scheduleNoShowTriggers = async (args: ScheduleNoShowTriggersArgs) => {
  const {
    booking,
    triggerForUser,
    organizerUser,
    eventTypeId,
    teamId,
    orgId,
    oAuthClientId,
    isDryRun = false,
  } = args;

  const isCalVideoLocation = booking.location === DailyLocationType || booking.location?.trim() === "";
  const isGoogleMeetLocation = booking.location === MeetLocationType;

  const isValidLocation = isCalVideoLocation || isGoogleMeetLocation;

  if (isDryRun || !isValidLocation) return;

  const hostsTriggerEvent = getHostsTriggerEvent(isCalVideoLocation, isGoogleMeetLocation);
  const guestsTriggerEvent = getGuestsTriggerEvent(isCalVideoLocation, isGoogleMeetLocation);

  // Add task for automatic no show in cal video
  const noShowPromises: Promise<any>[] = [];

  const subscribersHostsNoShowStarted = await getWebhooks({
    userId: triggerForUser ? organizerUser.id : null,
    eventTypeId,
    triggerEvent: hostsTriggerEvent,
    teamId,
    orgId,
    oAuthClientId,
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
            triggerEvent: hostsTriggerEvent,
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
    triggerEvent: guestsTriggerEvent,
    teamId,
    orgId,
    oAuthClientId,
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
            triggerEvent: guestsTriggerEvent,
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

  await Promise.all(noShowPromises);

  // TODO: Support no show workflows
  // const workflowHostsNoShow = workflows.filter(
  //   (workflow) => workflow.trigger === WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW
  // );
  // const workflowGuestsNoShow = workflows.filter(
  //   (workflow) => workflow.trigger === WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW
  // );
};
