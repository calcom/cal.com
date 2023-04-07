import { z } from "zod";

import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    receiverAddress: z.string(),
    price: z.number(),
    currency: z.string().default("usd"),
  })
);
export const appKeysSchema = z.object({});
