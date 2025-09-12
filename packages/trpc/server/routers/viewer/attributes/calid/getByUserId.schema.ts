import { z } from "zod";

export const calidGetByUserIdSchema = z.object({
  userId: z.number(),
});

export type ZCalIdGetByUserIdSchema = z.infer<typeof calidGetByUserIdSchema>;
