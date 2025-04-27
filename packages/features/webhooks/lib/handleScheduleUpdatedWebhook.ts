import { handleWebhookTrigger } from "@calcom/features/bookings/lib/handleWebhookTrigger";
import type { ScheduleUpdatedTimeSlot } from "@calcom/features/webhooks/lib/sendPayload";
import logger from "@calcom/lib/logger";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["handleScheduleUpdatedWebhook"] });

type AvailabilityChangeData = {
  schedule: {
    id: number;
    name: string;
    userId: number;
    timeZone: string | null;
    teamId?: number | number[];
    orgId?: number;
  };
  prevAvailability?: ScheduleUpdatedTimeSlot[];
  newAvailability?: ScheduleUpdatedTimeSlot[];
};

export const handleScheduleUpdatedWebhook = async (data: AvailabilityChangeData) => {
  const { schedule } = data;
  const userId = schedule.userId;
  const teamId = schedule.teamId;
  const orgId = schedule.orgId;

  try {
    let event = "Schedule Updated";
    if (
      !!data.prevAvailability &&
      data.prevAvailability.length > 0 &&
      !!data.newAvailability &&
      data.newAvailability.length > 0
    ) {
      event = "Schedule Updated";
    } else if (!!data.prevAvailability && data.prevAvailability.length > 0) {
      event = "Schedule Deleted";
    } else if (!!data.newAvailability && data.newAvailability.length > 0) {
      event = "Schedule Created";
    }

    const webhookData = {
      event,
      userId,
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      prevAvailability: data.prevAvailability || [],
      newAvailability: data.newAvailability || [],
      timeZone: schedule.timeZone,
    };

    await handleWebhookTrigger({
      subscriberOptions: {
        userId,
        teamId,
        orgId,
        triggerEvent: WebhookTriggerEvents.SCHEDULE_UPDATED,
      },
      eventTrigger: WebhookTriggerEvents.SCHEDULE_UPDATED,
      webhookData,
    });
  } catch (error) {
    log.error(`Error executing availability change webhook: ${error}`);
  }
};
