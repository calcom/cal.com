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
    event: string;
    teamId?: number | number[];
    orgId?: number;
  };
  prevAvailability?: ScheduleUpdatedTimeSlot[];
  newAvailability?: ScheduleUpdatedTimeSlot[];
};

export const handleScheduleUpdatedWebhook = async (data: AvailabilityChangeData) => {
  const { schedule, prevAvailability = [], newAvailability = [] } = data;
  const { userId, teamId, orgId, name, timeZone, event, id } = schedule;

  try {
    const webhookData = {
      event,
      userId,
      scheduleId: id,
      scheduleName: name,
      prevAvailability: prevAvailability,
      newAvailability: newAvailability,
      timeZone: timeZone,
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
