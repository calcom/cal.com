import { z } from "zod";

export const ZSetSMSLockState = z.object({
  userId: z.number().optional(),
  teamId: z.number().optional(),
  lock: z.boolean().optional(),
});

export type TSetSMSLockState = z.infer<typeof ZSetSMSLockState>;
