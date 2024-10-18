import z from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";
import { paymentOptions } from "./lib/constants";

type PaymentOption = (typeof paymentOptions)[number]["value"];
const VALUES: [PaymentOption, ...PaymentOption[]] = [
  paymentOptions[0].value,
  ...paymentOptions.slice(1).map((option) => option.value),
];

export const paymentOptionEnum = z.enum(VALUES);

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    price: z.number().optional(),
    currency: z.string().optional(),
    paymentOption: paymentOptionEnum.optional(),
    clientKey: z.string().optional(),
    enabled: z.boolean().optional(),
  })
);

export const adyenCredentialKeysSchema = z.object({
  api_key: z.string(),
  client_key: z.string(),
  merchant_id: z.string(),
  hmac_key: z.string(),
});

export type AdyenCredentialKeys = z.infer<typeof adyenCredentialKeysSchema>;

export const adyenSession = z.object({
  id: z.string(),
  amount: z.object({
    value: z.number(),
    currency: z.string(),
  }),
  sessionData: z.string(),
  expiresAt: z.string(),
});

export const adyenPaymentDataSchema = z.object({
  session: adyenSession,
  idempotencyKey: z.string(),
  bookerEmail: z.string(),
  clientKey: z.string(),
  pspReference: z.string().optional(),
});

export type AdyenPaymentData = z.infer<typeof adyenPaymentDataSchema>;
