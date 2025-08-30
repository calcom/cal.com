import { z } from "zod";

export const ZAdminLockUserAccountSchema = z.object({
  userId: z.number(),
  locked: z.boolean(),
});

export type TAdminLockUserAccountSchema = z.infer<typeof ZAdminLockUserAccountSchema>;
