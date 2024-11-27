import type { z } from "zod";

import { _BlacklistModel } from "@calcom/prisma/zod/blacklist";

export const BlacklistModelSchema = _BlacklistModel.pick({
  id: true,
  type: true,
  value: true,
  description: true,
  createdAt: true,
  createdById: true,
  updatedAt: true,
  updatedById: true,
});

export type Blacklist = z.infer<typeof BlacklistModelSchema>;

export const insertBlacklistSchema = BlacklistModelSchema.pick({
  type: true,
  value: true,
  description: true,
});
