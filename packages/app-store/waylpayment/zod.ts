import { z } from "zod";

import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    price: z.number().int().min(0).default(0),
    currency: z.literal("IQD").default("IQD"),
    paymentOption: z.string().optional().default("ON_BOOKING"),
    enabled: z.boolean().optional(),
  })
);

export const appKeysSchema = z.object({
  apiKey: z.string().min(1),
});
