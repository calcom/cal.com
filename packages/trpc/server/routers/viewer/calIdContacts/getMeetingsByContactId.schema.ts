import { z } from "zod";

export const ZCalIdContactsGetMeetingsByContactIdInputSchema = z.object({
  contactId: z.number().int().positive(),
  limit: z.number().int().min(1).max(200).default(100),
});

export type TCalIdContactsGetMeetingsByContactIdInputSchema = z.infer<
  typeof ZCalIdContactsGetMeetingsByContactIdInputSchema
>;
