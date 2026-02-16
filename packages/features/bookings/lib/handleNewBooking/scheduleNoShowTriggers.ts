import { DailyLocationType } from "@calcom/app-store/constants";
import dayjs from "@calcom/dayjs";
import tasker from "@calcom/features/tasker";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { withReporting } from "@calcom/lib/sentryWrapper";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { Workflow } from "@calcom/types/Workflow";

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
  workflows: Workflow[];
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
    workflows,
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

  const subscribersGuestsNoShowStarted = await getWebhooks({
    userId: triggerForUser ? organizerUser.id : null,
    eventTypeId,
    triggerEvent: WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
    teamId,
    orgId,
    oAuthClientId,
  });

  const afterHostNoShowWorkflows = workflows.filter(
    (w) => w.trigger === WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW
  );

  const afterGuestNoShowWorkflows = workflows.filter(
    (w) => w.trigger === WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW
  );

  subscribersHostsNoShowStarted.forEach((subscriber) => {
    noShowPromises.push(
      tasker.create("sendWebhook", {
        subscriberUrl: subscriber.subscriberUrl,
        triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
        createdAt: dayjs().format(),
        data: booking,
        secretKey: subscriber.secret,
      })
    );
  });

  subscribersGuestsNoShowStarted.forEach((subscriber) => {
    noShowPromises.push(
      tasker.create("sendWebhook", {
        subscriberUrl: subscriber.subscriberUrl,
        triggerEvent: WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
        createdAt: dayjs().format(),
        data: booking,
        secretKey: subscriber.secret,
      })
    );
  });

  afterHostNoShowWorkflows.forEach((w) => {
    noShowPromises.push(
      tasker.create("triggerNoShow", {
        triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
        booking,
        workflow: w,
      })
    );
  });

  afterGuestNoShowWorkflows.forEach((w) => {
    noShowPromises.push(
      tasker.create("triggerNoShow", {
        triggerEvent: WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
        booking,
        workflow: w,
      })
    );
  });

  await Promise.all(noShowPromises);
};

export const scheduleNoShowTriggers = withReporting(_scheduleNoShowTriggers, "scheduleNoShowTriggers");
