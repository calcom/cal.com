import { z } from "zod";

export const ZCalIdContactsGetByIdInputSchema = z.object({
  id: z.number().int().positive(),
});

export type TCalIdContactsGetByIdInputSchema = z.infer<typeof ZCalIdContactsGetByIdInputSchema>;
