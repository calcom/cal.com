import { z } from "zod";

export const unlockUserAccountSchema = z.object({
  userId: z.number(),
  email: z.string().email().optional(),
});

export type TUnlockUserAccountSchema = z.infer<typeof unlockUserAccountSchema>; 