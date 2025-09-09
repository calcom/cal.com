import { z } from "zod";

export const calidWebhookIdAndEventTypeIdSchema = z.object({
  id: z.string().optional(),
  eventTypeId: z.number().optional(),
  calIdTeamId: z.number().optional(),
});
