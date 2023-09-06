import { z } from "zod";

import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";

import { paymentOptions, currencyOptions } from "./lib/constants";

type PaymentOption = (typeof paymentOptions)[number]["value"];
// TODO: This could be declared as a helper with generic types (used in stripe/paypal/etc).
const paymentValues: [PaymentOption, ...PaymentOption[]] = [
  paymentOptions[0].value,
  ...paymentOptions.slice(1).map((option) => option.value),
];
export const paymentOptionEnum = z.enum(paymentValues);

type CurrencyOption = (typeof currencyOptions)[number]["value"];
// TODO: This could be declared as a helper with generic types (used in stripe/paypal/etc).
const currencyValues: [CurrencyOption, ...CurrencyOption[]] = [
  currencyOptions[0].value,
  ...currencyOptions.slice(1).map((option) => option.value),
];
export const currencyOptionEnum = z.enum(currencyValues);

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    price: z.number(),
    currency: currencyOptionEnum.optional(),
    paymentOption: paymentOptionEnum.optional(),
  })
);

export const appKeysSchema = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  public_key: z.string().min(1),
});
