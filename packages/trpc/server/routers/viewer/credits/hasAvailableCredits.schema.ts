import { z } from "zod";

export const ZHasAvailableCreditsSchema = z.object({
  teamId: z.number().optional(),
});

export type THasAvailableCreditsSchema = z.infer<typeof ZHasAvailableCreditsSchema>;
