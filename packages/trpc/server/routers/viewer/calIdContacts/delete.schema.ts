import { z } from "zod";

export const ZCalIdContactsDeleteInputSchema = z.object({
  id: z.number().int().positive(),
});

export type TCalIdContactsDeleteInputSchema = z.infer<typeof ZCalIdContactsDeleteInputSchema>;
