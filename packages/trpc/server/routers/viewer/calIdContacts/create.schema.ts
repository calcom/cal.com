import { z } from "zod";

export const ZCalIdContactsCreateInputSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z
    .string()
    .trim()
    .email()
    .max(320)
    .transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(50).optional().default(""),
  notes: z.string().max(5000).optional().default(""),
});

export type TCalIdContactsCreateInputSchema = z.infer<typeof ZCalIdContactsCreateInputSchema>;
