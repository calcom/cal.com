import { z } from "zod";

export const ZGetByUserIdInputSchema = z.object({
  userId: z.optional(z.number()),
});

export type TGetByUserIdInputSchema = z.infer<typeof ZGetByUserIdInputSchema>;
