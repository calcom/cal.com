import { z } from "zod";

import { ApiKeySchema as ApiKey } from "@calcom/prisma/zod/modelSchema/ApiKeySchema";

export const apiKeyCreateBodySchema = ApiKey.pick({
  note: true,
  expiresAt: true,
  userId: true,
})
  .partial({ userId: true })
  .merge(z.object({ neverExpires: z.boolean().optional() }))
  .strict();

export const apiKeyEditBodySchema = ApiKey.pick({
  note: true,
})
  .partial()
  .strict();

export const apiKeyPublicSchema = ApiKey.pick({
  id: true,
  userId: true,
  note: true,
  createdAt: true,
  expiresAt: true,
  lastUsedAt: true,
  /** We might never want to expose these. Leaving this a as reminder. */
  // hashedKey: true,
});
