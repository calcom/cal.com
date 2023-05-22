import { z } from "zod";

// Common data for all endpoints under webhook
export const webhookIdAndEventTypeIdSchema = z.object({
  // Webhook ID
  id: z.string().optional(),
  // Event type ID
  eventTypeId: z.number().optional(),
});
