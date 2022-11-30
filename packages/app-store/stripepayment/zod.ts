import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    price: z.number(),
    currency: z.string(),
  })
);

export const appKeysSchema = z.object({
  client_id: z.string().startsWith("ca_"),
  client_secret: z.string().startsWith("sk_"),
  public_key: z.string().startsWith("pk_"),
  webhook_secret: z.string().startsWith("whsec_"),
  payment_fee_fixed: z.number().int(),
  payment_fee_percentage: z.number(),
});
