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
