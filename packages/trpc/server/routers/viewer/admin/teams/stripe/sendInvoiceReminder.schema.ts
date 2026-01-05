import { z } from "zod";

export const ZSendInvoiceReminderSchema = z.object({
  teamId: z.number(),
  invoiceId: z.string(),
});

export type TSendInvoiceReminderSchema = z.infer<typeof ZSendInvoiceReminderSchema>;
