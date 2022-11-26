import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    price: z.number(),
    currency: z.string(),
  })
);

export const appKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
  public_key: z.string(),
  webhook_secret: z.string(),
  payment_fee_fixed: z.number(),
  payment_fee_percentage: z.number(),
});
