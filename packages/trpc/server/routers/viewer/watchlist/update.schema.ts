import { z } from "zod";

import { WatchlistAction, WatchlistSource, WatchlistType } from "@calcom/prisma/enums";

export const ZUpdateWatchlistEntrySchema = z.object({
  id: z.string(),
  type: z.nativeEnum(WatchlistType), // Required for normalization
  value: z.string().optional(),
  action: z.nativeEnum(WatchlistAction).optional(),
  source: z.nativeEnum(WatchlistSource).optional(),
  description: z.string().optional(),
});

export type TUpdateWatchlistEntrySchema = z.infer<typeof ZUpdateWatchlistEntrySchema>;
