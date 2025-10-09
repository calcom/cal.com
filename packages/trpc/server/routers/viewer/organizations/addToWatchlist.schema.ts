import { z } from "zod";

import { WatchlistType, WatchlistAction } from "@calcom/prisma/enums";

export const ZAddToWatchlistInputSchema = z.object({
  reportId: z.string().uuid(),
  type: z.nativeEnum(WatchlistType),
  value: z.string().min(1),
  action: z.nativeEnum(WatchlistAction),
  description: z.string().optional(),
});

export type TAddToWatchlistInputSchema = z.infer<typeof ZAddToWatchlistInputSchema>;
