import { z } from "zod";

export const ZMigrateToWinnerSchema = z.object({
  experimentSlug: z.string(),
  winnerVariant: z.string(),
});

export type TMigrateToWinnerSchema = z.infer<typeof ZMigrateToWinnerSchema>;
