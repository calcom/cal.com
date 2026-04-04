import { z } from "zod";

import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";
import { RefundPolicy } from "@calcom/lib/payment/types";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    price: z.number(),
    currency: z.string(),
    paymentOption: z.literal("ON_BOOKING").optional(),
    refundPolicy: z.nativeEnum(RefundPolicy).optional(),
    refundDaysCount: z.number().optional(),
    refundCountCalendarDays: z.boolean().optional(),
  })
);

export const appKeysSchema = z.object({
  public_key: z.string().min(1),
  secret_key: z.string().min(1),
});
