import { z } from "zod";

import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";

const paymentOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const paymentOptionsSchema = z.array(paymentOptionSchema);

export const KasperoPaymentOptions = [
  {
    label: "on_booking_option",
    value: "ON_BOOKING",
  },
];

type PaymentOption = (typeof KasperoPaymentOptions)[number]["value"];
const VALUES: [PaymentOption, ...PaymentOption[]] = [
  KasperoPaymentOptions[0].value,
  ...KasperoPaymentOptions.slice(1).map((option) => option.value),
];
export const paymentOptionEnum = z.enum(VALUES);

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    price: z.number().optional().default(0),
    currency: z.string().optional().default("USD"),
    paymentOption: z.string().optional(),
    enabled: z.boolean().optional(),
    credentialId: z.number().optional(),
  })
);

// KasperoPay uses merchant_id instead of client_id/client_secret
export const appKeysSchema = z.object({
  merchant_id: z.string(),
  webhook_secret: z.string().optional(),
});

// Currency options for KasperoPay
export const currencyOptions = [
  { value: "KAS", label: "KAS", unit: "KAS" },
  { value: "USD", label: "USD", unit: "$" },
  { value: "EUR", label: "EUR", unit: "€" },
  { value: "GBP", label: "GBP", unit: "£" },
];
