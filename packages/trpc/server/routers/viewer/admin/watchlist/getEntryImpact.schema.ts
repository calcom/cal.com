import { WatchlistType } from "@calcom/prisma/enums";
import { z } from "zod";

export const ZGetEntryImpactInputSchema = z.object({
  type: z.nativeEnum(WatchlistType),
  value: z.string().min(1).max(255),
});

export type TGetEntryImpactInputSchema = z.infer<typeof ZGetEntryImpactInputSchema>;
