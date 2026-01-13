import { z } from "zod";

import { WatchlistType } from "@calcom/prisma/enums";

export const ZCreateWatchlistEntryInputSchema = z.object({
  type: z.nativeEnum(WatchlistType),
  value: z.string().min(1).max(255),
  description: z.string().optional(),
});

export type TCreateWatchlistEntryInputSchema = z.infer<typeof ZCreateWatchlistEntryInputSchema>;
