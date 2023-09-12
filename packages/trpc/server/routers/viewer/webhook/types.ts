import { z } from "zod";

// Common data for all endpoints under webhook
export const webhookIdAndEventTypeIdSchema = z.object({
  // Webhook ID
  id: z.string().optional(),
  eventTypeId: z.number().optional(),
  teamId: z.number().optional(),
});
