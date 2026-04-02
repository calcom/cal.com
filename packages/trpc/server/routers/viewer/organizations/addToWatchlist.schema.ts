import { WatchlistType } from "@calcom/prisma/enums";
import { z } from "zod";

export const ZAddToWatchlistInputSchema = z.object({
  email: z.string().email(),
  type: z.nativeEnum(WatchlistType),
  description: z.string().optional(),
});

export type TAddToWatchlistInputSchema = z.infer<typeof ZAddToWatchlistInputSchema>;
