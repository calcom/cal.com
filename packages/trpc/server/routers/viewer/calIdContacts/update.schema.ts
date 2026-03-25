import { z } from "zod";

export const ZCalIdContactsUpdateInputSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().trim().min(1).max(255).optional(),
    email: z
      .string()
      .trim()
      .email()
      .max(320)
      .transform((value) => value.toLowerCase())
      .optional(),
    phone: z.string().trim().max(50).optional(),
    notes: z.string().max(5000).optional(),
  })
  .refine((value) => value.name || value.email || value.phone !== undefined || value.notes !== undefined, {
    message: "At least one field must be provided",
  });

export type TCalIdContactsUpdateInputSchema = z.infer<typeof ZCalIdContactsUpdateInputSchema>;
