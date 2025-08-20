import { DailyLocationType } from "@calcom/app-store/locations";
import { BookingWebhookService } from "@calcom/features/webhooks/lib/service/BookingWebhookService";
import { withReporting } from "@calcom/lib/sentryWrapper";

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
  } = args;

  const isCalVideoLocation = booking.location === DailyLocationType || booking.location?.trim() === "";

  if (isDryRun || !isCalVideoLocation) return;

  // Schedule no-show webhooks using new architecture
  await BookingWebhookService.scheduleNoShowWebhooks({
    booking: {
      id: booking.id,
      startTime: booking.startTime,
      eventTypeId,
      userId: organizerUser.id,
      uid: "", // Not needed for no-show scheduling
    },
    organizerUser: {
      id: organizerUser.id || 0,
      username: null, // Not needed for no-show scheduling
    },
    teamId,
    orgId,
    oAuthClientId: oAuthClientId || undefined,
    triggerForUser: !!triggerForUser,
  });

  // TODO: Support no show workflows
  // const workflowHostsNoShow = workflows.filter(
  //   (workflow) => workflow.trigger === WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW
  // );
  // const workflowGuestsNoShow = workflows.filter(
  //   (workflow) => workflow.trigger === WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW
  // );
};

export const scheduleNoShowTriggers = withReporting(_scheduleNoShowTriggers, "scheduleNoShowTriggers");
