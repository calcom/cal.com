import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";
import { paymentOptions } from "./lib/constants";

// Extract the payment options enum from paymentOptions
// https://stackoverflow.com/a/73825370
type PaymentOption = (typeof paymentOptions)[number]["value"];
const VALUES: [PaymentOption, ...PaymentOption[]] = [
  paymentOptions[0].value,
  ...paymentOptions.slice(1).map((option) => option.value),
];
export const paymentOptionEnum = z.enum(VALUES);

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    price: z.number(),
    currency: z.string(),
    paymentOption: paymentOptionEnum.optional(),
  })
);

export const appKeysSchema = z.object({
  client_id: z.string().startsWith("ca_").min(1),
  client_secret: z.string().startsWith("sk_").min(1),
  public_key: z.string().startsWith("pk_").min(1),
  webhook_secret: z.string().startsWith("whsec_").min(1),
  payment_fee_fixed: z.number().min(0),
  payment_fee_percentage: z.number().min(0),
});
