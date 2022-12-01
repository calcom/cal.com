import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    price: z.number(),
    currency: z.string(),
  })
);

export const appKeysSchema = z.object({
  client_id: z.string().startsWith("ca_").nonempty(),
  client_secret: z.string().startsWith("sk_").nonempty(),
  public_key: z.string().startsWith("pk_").nonempty(),
  webhook_secret: z.string().startsWith("whsec_").nonempty(),
  payment_fee_fixed: z.number().int().min(0),
  payment_fee_percentage: z.number().min(0),
});
