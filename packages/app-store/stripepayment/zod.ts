import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    price: z.number(),
    currency: z.string(),
  })
);

export const appKeysSchema = z.object({
  client_id: z.string().startsWith("ca_").min(1),
  client_secret: z.string().startsWith("sk_").min(1),
  public_key: z.string().startsWith("pk_").min(1),
  webhook_secret: z.string().startsWith("whsec_").min(1),
  payment_fee_fixed: z.number().int().min(0),
  payment_fee_percentage: z.number().min(0),
});
