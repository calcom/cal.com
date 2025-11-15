import { z } from "zod";

import { WatchlistType } from "@calcom/prisma/enums";

export const ZAddToWatchlistInputSchema = z.object({
  reportIds: z.array(z.string().uuid()).min(1),
  type: z.nativeEnum(WatchlistType),
  description: z.string().optional(),
});

export type TAddToWatchlistInputSchema = z.infer<typeof ZAddToWatchlistInputSchema>;
