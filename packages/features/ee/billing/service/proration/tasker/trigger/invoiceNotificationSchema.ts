import { z } from "zod";

export const invoiceNotificationSchema = z.object({
  prorationId: z.string().min(1),
  invoiceId: z.string().min(1),
  teamId: z.number().int().positive(),
});

export const invoiceEmailSchema = z.object({
  prorationId: z.string().min(1),
  invoiceId: z.string().min(1),
  teamId: z.number().int().positive(),
  recipientEmail: z.string().email(),
  recipientLocale: z.string(),
  teamName: z.string(),
  seatCount: z.number().int(),
  amountFormatted: z.string(),
  invoiceUrl: z.string().url(),
  isReminder: z.boolean(),
});
