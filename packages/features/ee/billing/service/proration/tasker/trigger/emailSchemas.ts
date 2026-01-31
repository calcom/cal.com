import { z } from "zod";

export const sendInvoiceEmailSchema = z.object({
  prorationId: z.string().uuid(),
  teamId: z.number().int().positive(),
  isAutoCharge: z.boolean(),
});

export const sendReminderEmailSchema = z.object({
  prorationId: z.string().uuid(),
  teamId: z.number().int().positive(),
});

export const cancelReminderSchema = z.object({
  prorationId: z.string().uuid(),
});

export type SendInvoiceEmailPayload = z.infer<typeof sendInvoiceEmailSchema>;
export type SendReminderEmailPayload = z.infer<typeof sendReminderEmailSchema>;
export type CancelReminderPayload = z.infer<typeof cancelReminderSchema>;
