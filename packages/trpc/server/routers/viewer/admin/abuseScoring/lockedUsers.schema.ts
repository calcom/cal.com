import { z } from "zod";

export const ZListLockedUsersInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  searchTerm: z.string().optional(),
});

export type TListLockedUsersInputSchema = z.infer<typeof ZListLockedUsersInputSchema>;

export const ZUnlockUserInputSchema = z.object({
  userId: z.number().int(),
});

export type TUnlockUserInputSchema = z.infer<typeof ZUnlockUserInputSchema>;
