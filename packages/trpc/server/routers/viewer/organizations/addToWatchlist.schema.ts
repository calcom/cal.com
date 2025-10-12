import { z } from "zod";

import { WatchlistType, WatchlistAction } from "@calcom/prisma/enums";

export const ZAddToWatchlistInputSchema = z.object({
  reportIds: z.array(z.string().uuid()).min(1),
  type: z.nativeEnum(WatchlistType),
  action: z.nativeEnum(WatchlistAction),
  description: z.string().optional(),
});

export type TAddToWatchlistInputSchema = z.infer<typeof ZAddToWatchlistInputSchema>;
