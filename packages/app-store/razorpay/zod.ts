import { eventTypeAppCardZod } from "../eventTypeAppCardZod";
import { paymentOptions } from "./lib/constants";
import { z } from "zod";

export const appKeysSchema = z.object({
    key_id: z.string().min(1, "Key ID is required"),
    key_secret: z.string().min(1, "Key Secret is required"),
    default_currency: z.string().default("inr"),
    webhook_secret: z.string().optional(),
});


export type PaymentOption = (typeof paymentOptions)[number]["value"];
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
        enabled: z.boolean().optional(),
        refundPolicy: z.enum(["NEVER", "ALWAYS", "DAYS"]).optional(),
        refundDaysCount: z.number().optional(),
        refundCountCalendarDays: z.boolean().optional(),
    })
);
export const razorpayPaymentSchema = z.object({
    razorpay_payment_id: z.string().min(1, "Payment ID is required"),
    razorpay_order_id: z.string().min(1, "Order ID is required"),
    razorpay_signature: z.string().min(1, "Signature is required"),
});


export const razorpayRefundSchema = z.object({
    paymentId: z.string().min(1, "Payment ID is required"),
    amount: z.number().positive("Amount must be positive").optional(),
    reason: z.string().optional(),
});


export const webhookEventSchema = z.object({
    entity: z.literal("event"),
    account_id: z.string(),
    event: z.string(),
    contains: z.array(z.string()),
    payload: z.object({
        payment: z.object({
            entity: z.any(),
        }).optional(),
        refund: z.object({
            entity: z.any(),
        }).optional(),
        order: z.object({
            entity: z.any(),
        }).optional(),
    }),
    created_at: z.number(),
});

export const verifyRequestSchema = z.object({
    razorpay_payment_id: z.string(),
    razorpay_order_id: z.string(),
    razorpay_signature: z.string(),
    paymentUid: z.string(),
});


export type RazorpayData = z.infer<typeof appKeysSchema>;
export type AppKeys = z.infer<typeof appKeysSchema>;
export type RazorpayPayment = z.infer<typeof razorpayPaymentSchema>;
export type RazorpayRefund = z.infer<typeof razorpayRefundSchema>;
export type WebhookEvent = z.infer<typeof webhookEventSchema>;