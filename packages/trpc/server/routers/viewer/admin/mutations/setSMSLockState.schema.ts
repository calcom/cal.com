import { z } from "zod";

export const ZSetSMSLockState = z.object({
  userId: z.number().optional(),
  username: z.string().optional(),
  teamId: z.number().optional(),
  teamSlug: z.string().optional(),
  lock: z.boolean().optional(),
});

export type TSetSMSLockState = z.infer<typeof ZSetSMSLockState>;
