import { z } from "zod";

import { WatchlistType } from "@calcom/prisma/enums";

export const ZListWatchlistEntriesInputSchema = z.object({
  limit: z.number().min(1).max(100).default(25),
  offset: z.number().min(0).default(0),
  searchTerm: z.string().optional(),
  filters: z
    .object({
      type: z.nativeEnum(WatchlistType).optional(),
    })
    .optional(),
});

export type TListWatchlistEntriesInputSchema = z.infer<typeof ZListWatchlistEntriesInputSchema>;
