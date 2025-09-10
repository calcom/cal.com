import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod.extend({
  onBookingWriteToEventObject: z.boolean().optional(),
  onBookingWriteToEventObjectMap: z.record(z.any()).optional(),
});

export const appKeysSchema = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
});
