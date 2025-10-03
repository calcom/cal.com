import { z } from "zod";

export const ZCalIdGetAllByUserIdInputSchema = z.object({
  userId: z.number(),
});

export type TCalIdGetAllByUserIdInputSchema = z.infer<typeof ZCalIdGetAllByUserIdInputSchema>;
