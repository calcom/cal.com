import { z } from "zod";
import { RefundPolicy } from "@calcom/lib/payment/types";

import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";

const paymentOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const paymentOptionsSchema = z.array(paymentOptionSchema);

export const RazorpayPaymentOptions = [
  {
    label: "on_booking_option",
    value: "ON_BOOKING",
  },
];

type PaymentOption = (typeof RazorpayPaymentOptions)[number]["value"];
const VALUES: [PaymentOption, ...PaymentOption[]] = [
  RazorpayPaymentOptions[0].value,
  ...RazorpayPaymentOptions.slice(1).map((option) => option.value),
];
export const paymentOptionEnum = z.enum(VALUES);

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    price: z.number(),
    currency: z.string(),
    paymentOption: z.string().optional(),
    enabled: z.boolean().optional(),
    credentialId: z.number().optional(),
    refundPolicy: z.nativeEnum(RefundPolicy).optional(),
    refundDaysCount: z.number().optional(),
    refundCountCalendarDays: z.boolean().optional(),
  })
);
export const appKeysSchema = z.object({});
