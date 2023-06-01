import { z } from "zod";

export const ZUpdateInputSchema = z.object({
  orgId: z
    .string()
    .regex(/^\d+$/)
    .transform((id) => parseInt(id)),
  bio: z.string().optional(),
  logo: z
    .string()
    .optional()
    .nullable()
    .transform((v) => v || null),
});

export type TUpdateInputSchema = z.infer<typeof ZUpdateInputSchema>;
