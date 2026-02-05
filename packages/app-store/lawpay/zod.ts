import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";
import { z } from "zod";

// App-level keys schema. LawPay has no app-level keys (each user adds credentials via Credential.key).
// Empty object allows the app to be enabled in the DB so it appears on /apps; credentials use lawPayCredentialSchema in types.ts.
const appKeysSchema = z.object({});

const LawPayPaymentOptions = [
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
const paymentOptionEnum = z.enum(VALUES);

// App data schema for event type settings (price, currency, paymentOption only; credentials live in Credential.key)
const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    price: z.number(),
    currency: z.string(),
    paymentOption: z.string().optional(),
    enabled: z.boolean().optional(),
  })
);

export { appDataSchema, appKeysSchema, LawPayPaymentOptions, paymentOptionEnum };
export type AppKeysSchema = z.infer<typeof appKeysSchema>;
