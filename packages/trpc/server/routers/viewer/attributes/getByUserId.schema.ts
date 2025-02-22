import { z } from "zod";

export const getByUserIdSchema = z.object({
  userId: z.number(),
});

export type ZGetByUserIdSchema = z.infer<typeof getByUserIdSchema>;
