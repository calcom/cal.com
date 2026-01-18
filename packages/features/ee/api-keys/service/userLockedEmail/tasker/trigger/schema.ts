import { LockReason } from "@calcom/features/ee/api-keys/lib/autoLock";
import { z } from "zod";

export const userLockedEmailSchema = z.object({
  userId: z.number(),
  email: z.string().email(),
  name: z.string().nullable(),
  lockReason: z.nativeEnum(LockReason),
  locale: z.string(),
});
