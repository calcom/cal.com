import { scheduleCalVideoNoShowWebhookTasks } from "../scheduleCalVideoNoShowWebhookTasks";

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

  const calVideoNoShowPromises = scheduleCalVideoNoShowWebhookTasks({
    bookingStartTime: booking?.startTime,
    bookingId: booking.id,
    eventTypeId,
    userId: triggerForUser ? organizerUser.id : null,
    teamId,
    orgId,
  });

  await Promise.all(calVideoNoShowPromises);

  // TODO: Support no show workflows
  // const workflowHostsNoShow = workflows.filter(
  //   (workflow) => workflow.trigger === WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW
  // );
  // const workflowGuestsNoShow = workflows.filter(
  //   (workflow) => workflow.trigger === WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW
  // );
};
