import { z } from "zod";

export const ZGetAllCreditsSchema = z.object({
  teamId: z.number().optional(),
});

export type TGetAllCreditsSchema = z.infer<typeof ZGetAllCreditsSchema>;
