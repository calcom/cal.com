import { z } from "zod";

export const ZGetAllCreditsSchema = z.object({
  teamId: z.number(),
});

export type TGetAllCreditsSchema = z.infer<typeof ZGetAllCreditsSchema>;
