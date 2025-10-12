import { z } from "zod";

import { WatchlistAction, WatchlistSource, WatchlistType } from "@calcom/prisma/enums";

export const ZCreateWatchlistEntrySchema = z.object({
  type: z.nativeEnum(WatchlistType),
  value: z.string().min(1, "Value is required"),
  action: z.nativeEnum(WatchlistAction),
  source: z.nativeEnum(WatchlistSource).default(WatchlistSource.MANUAL),
  isGlobal: z.boolean(),
  organizationId: z.number().optional(),
  description: z.string().optional(),
});

export type TCreateWatchlistEntrySchema = z.infer<typeof ZCreateWatchlistEntrySchema>;
