import { WatchlistSource, WatchlistType } from "@calcom/prisma/enums";
import { z } from "zod";

export const ZListWatchlistEntriesInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0),
  searchTerm: z.string().optional(),
  filters: z
    .object({
      type: z.nativeEnum(WatchlistType).optional(),
      source: z.nativeEnum(WatchlistSource).optional(),
    })
    .optional(),
});

export type TListWatchlistEntriesInputSchema = z.infer<typeof ZListWatchlistEntriesInputSchema>;
