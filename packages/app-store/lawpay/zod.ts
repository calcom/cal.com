import { z } from "zod";

import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";

const paymentOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const paymentOptionsSchema = z.array(paymentOptionSchema);

export const LawPayPaymentOptions = [
  {
    label: "on_booking_option",
    value: "ON_BOOKING",
  },
];

type PaymentOption = (typeof LawPayPaymentOptions)[number]["value"];
const VALUES: [PaymentOption, ...PaymentOption[]] = [
  LawPayPaymentOptions[0].value,
  ...LawPayPaymentOptions.slice(1).map((option) => option.value),
];
export const paymentOptionEnum = z.enum(VALUES);

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    price: z.number(),
    currency: z.string(),
    paymentOption: z.string().optional(),
    enabled: z.boolean().optional(),
    accountType: z.enum(["operating", "trust"]).optional().default("operating"),
  })
);

export const appKeysSchema = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  public_key: z.string().min(1),
});
