import { z } from "zod";

export const ZGetAllByUserIdInputSchema = z.object({
  userId: z.number(),
});

export type TGetAllByUserIdInputSchema = z.infer<typeof ZGetAllByUserIdInputSchema>;
